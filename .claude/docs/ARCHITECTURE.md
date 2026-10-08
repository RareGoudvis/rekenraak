# ARCHITECTURE.md

System map of the Rekenraak worksheet generator, written for future Claude agents
(and humans). Read this once and you should know where everything lives and how a
new exercise type flows through the app.

> ⚠️ **KEEP THIS FILE CURRENT.** After any *structural* change — a new exercise
> type, a new store action, changed wiring, a renamed/moved file, a new service —
> update **both this file and [CLAUDE.md](../../CLAUDE.md)**. Exercise types now live in
> a **central registry** ([exerciseRegistry.ts](../../src/config/exerciseRegistry.ts) +
> [exerciseUI.tsx](../../src/config/exerciseUI.tsx)); adding one is a generator + viewer
> + config + **one row in each registry file** (§5). The drift-prone spot is the
> registry table (§7). `CLAUDE.md` is the short rules/commands file; this is the
> deep map. Don't let them diverge.

---

## 1. What this is

Dutch primary-school **worksheet generator**. Teachers compose math exercise
blocks, preview them on a virtual A4 sheet, toggle solutions, and export via the
**browser print dialog** (Save as PDF). Everything is in-memory React + a single
Zustand store — **no backend, no database**. Persistence is localStorage
(autosave + presets) and shareable URL hashes. UI text is Dutch; code/comments
are English.

---

## 2. 3-panel layout & data flow

[App.tsx](../../src/App.tsx) renders three columns:

```
┌──────────────┬───────────────────────────┬──────────────────┐
│   Sidebar    │      A4 Preview           │    Inspector     │
│ APP_STRUCTURE│  header                   │  doc settings    │
│ tree nav     │  [block 1]                │   (no block)     │
│ leaf click → │  [block 2] …              │   — or —         │
│ addBlockFrom │  footer                   │  block config +  │
│ Type()       │  page-break lines @1044px │  "Genereer" btn  │
└──────────────┴───────────────────────────┴──────────────────┘
```

End-to-end flow for one block:

```
Sidebar leaf click
  → addBlockFromType(typeId, label, defaultConstraints)      [store]
  → new MathBlock pushed to blocks[], becomes activeBlockId
Inspector mounts EXERCISE_UI[typeId].Config for that typeId
  → plugin calls updateBlockSettings(id, { constraints: {...} })
User clicks "Genereer" (Inspector) or "Genereer alles" (TopBar)
  → regenerateBlock(block, setExercises)                     [generateDispatch.ts]
  → REGISTRY[typeId].generate(block) → exercise array
  → setExercises(id, REGISTRY[typeId].exerciseField, array)  [store, generic]
  → EXERCISE_UI[typeId].Viewer re-renders from block.<field>
```

Key files: [SheetBlock.tsx](../../src/components/sheet/SheetBlock.tsx) (viewer routing via registry),
[Inspector.tsx](../../src/components/configurator/Inspector.tsx) (Genereer + config mount
via registry), [sidebar.tsx](../../src/components/layout/sidebar.tsx) (leaf →
`addBlockFromType`), [generateDispatch.ts](../../src/services/generateDispatch.ts),
[exerciseRegistry.ts](../../src/config/exerciseRegistry.ts) +
[exerciseUI.tsx](../../src/config/exerciseUI.tsx) (the registry).

---

## 3. State — the Zustand store

One worksheet store: [useWorksheetStore.tsx](../../src/store/useWorksheetStore.tsx) — still the only
import path for sheet state (Bordmodus has its own second store, see "The board store" below). All state lives in memory. Its body is split into four slices composed into ONE
`create()` (one store on purpose: `addBlockFromType` sets blocks + activeBlockId + inspectorTab in a
single `set`): [blocksSlice](../../src/store/slices/blocksSlice.ts) (block CRUD, reorder/swap/split,
exercises, generate), [documentSlice](../../src/store/slices/documentSlice.ts) (header/footer/
docSettings/baseSettings/grade/curriculum/draft blocks, `loadWorksheet`),
[uiSlice](../../src/store/slices/uiSlice.ts) (selection, tabs, view, preview, save state, debug),
[historySlice](../../src/store/slices/historySlice.ts) (undo/redo; every block write goes through
`commitBlocks(state, blocks)`). Types live in [types.ts](../../src/store/types.ts); the autosave
subscription is [autosave.ts](../../src/store/autosave.ts) (installed once). `updateBlockSettings`
delegates the curriculum-lock filter and the stale ("verouderd") classification to the pure
[blockRules.ts](../../src/store/blockRules.ts).

| Slice | Type | Purpose |
|---|---|---|
| `blocks` | `MathBlock[]` | Ordered exercise blocks on the sheet |
| `activeBlockId` | `string \| 'document' \| null` | Drives Inspector context. `setActiveSelection` with a real block id ALSO sets `inspectorTab: 'oefening'` (content first), and so does `addBlockFromType` for the block it creates; `'document'`/`null` leave the tab alone, since the block tabs are disabled without a selection |
| `header` | `HeaderData` | naam/klas/nummer/datum toggles, title, **field order + widths** |
| `footer` | `FooterData` | three configurable slots (`slotLeft`/`slotCenter`/`slotRight` + their texts) and `brandSlot` — where the "Gemaakt met RekenRaak.be" credit sits; the credit always prints, only its position is a choice |
| `docSettings` | `DocSettings` | titlePosition, headerStyle, opdrachtTitelStyle, showScores, showDividers, showColumnDividers, numberBlocks, gaps, header/titel/footerCustom (`RegionStyle`), bodyFontScale (global exercise-body zoom; per-block override in `constraints.bodyFontScale`), fontSizeMath/fontSizeText (pt; feed `--sheet-size-math` / `--sheet-size-text` on `.print-area-shell`, theme.css; every viewer size is a factor of them — Blad › Opdrachten › Lettergrootte), answerSpace (px at 13pt, 14–32, default 18, absent = 18 — Blad › Opdrachten › Schrijfruimte; feeds `--sheet-answer-h`, per-block override `constraints.answerSpace`), packMode (`aansluitend` = skyline packing, default and absent on old sheets / `rijen` = the old row layout — Blad › Opdrachten › "Blokken aansluiten"), uniqueExercises (default and absent = true — Blad › Opdrachten › "Geen dubbele oefeningen"; read by `generateForBlock` in generateDispatch.ts, see §6) |
| `showSolutions` | `boolean` | Global red-solution overlay (preview + print) |
| `baseSettings` | `BaseSettings` | Global default difficulty (max/getalsoort/masks/bridges/decimalen/breuk-opties) snapshotted into each new block — see §13 |
| `selectedGrade` | `Leerjaar \| null` | Soft leerjaar (1–6) starting point (base max L1 20 · L2 100 · L3 1 000 · L4 10 000 · L5 1 000 000 · L6 1 000 000 000, floored per type — §13): seeds `baseSettings` + filters sidebar leaves (`gradePresets`); persisted in autosave. Not a lock |
| `curriculum` | `CurriculumLock \| null` | Non-null + `locked` = restricted parent mode (whitelisted sidebar + frozen difficulty) — see §13 |
| `draftBlocks` | `MathBlock[]` | Off-sheet scratch blocks edited via the real config plugins: by the curriculum builder (§13) and by the Bordmodus inspector, which mirrors the selected board card here (§14); not rendered/autosaved/historied |
| `view` | `WorksheetView` = `'editor' \| 'mijn-bladen' \| 'bibliotheek' \| 'whiteboard'` | Which full-screen view is active. UI-only. Starts at `initialView()` ([bootEntry.ts](../../src/bootEntry.ts): `'whiteboard'` on bord.html); `setView` to a non-board view on bord.html navigates to `/` instead (§14) |
| `sidebarTab` | `'oefeningen' \| 'overzicht'` | Which sidebar tab is open. The strip renders in the TopBar (above the sidebar column), the panel renders the content — see §9 "Shell" |
| `inspectorTab` | `'blad' \| 'weergave' \| 'oefening'` | Which inspector tab is open. Labels read Oefeningen / Opmaak / Blad (content first); default `oefening` |
| `bladSection` | `'koptekst' \| 'opdrachten' \| 'voettekst'` | Which Blad sub-tab shows. Set by its own tab strip AND by clicking the header/footer **on the sheet**, so both routes land in the same place |
| `_history` / `_historyIndex` | `MathBlock[][]` / `number` | Undo/redo, max `MAX_HISTORY = 50` |
| `saveState` / `lastSavedAt` | `'idle' \| 'saving' \| 'saved' \| 'error'` / `number \| null` | Autosave status for the TopBar dot. `'error'` = the last write was refused (`saveAutosave` returned false, storage full); `lastSavedAt` stays at the last successful write. TopBar shows a `--danger` dot + "Kon niet bewaren (opslag vol?) — bewaar als bestand." |

**`undo`/`redo` return a value:** both hand back the id of the block that step actually
changed (or `null`), so the caller can scroll to it and flash it — an undo whose block is
off-screen otherwise looks like nothing happened. It is a return value, not a slice.

**History rule (important):** mutations that change `blocks` call `pushHistory`
(addBlock, remove, move, duplicate, updateBlockSettings, `setExercises`,
updateExercise, `patchExercise`). `generateAllBlocks` is ONE step: it maps every unlocked block through `generateForBlock` and pushes history once, so one undo restores the whole sheet. `setSidebarTab` / `setInspectorTab` (pure view state) /
`updateHeader` / `updateFooter` /
`updateDocSettings` / `setShowSolutions` / `setBladSection` / `toggleBlockLock` /
`updateBaseSettings` / `setDraftBlocks` do **NOT** push history.

**Order actions:** `moveBlockUp` / `moveBlockDown` (neighbour shuffle), `reorderBlocks(from,
to)` (splice out, insert at `to`) and `swapBlocks(idA, idB)` (two blocks trade places, used
by the sheet's "Wisselen" drop zone — see §9). All three push history and all three survive
the curriculum lock: order is presentation, not difficulty. Callers that mean "insert BEFORE
the target" must compensate for the splice: `to > from ? to - 1 : to` (both the sheet drag
and the Overzicht outline do).

**Splitting a block:** `splitBlock(id, atIndex)` cuts one block in two after the `atIndex`-th
exercise — the first block keeps its id and the first N items, a new block behind it takes
the rest. The array is `REGISTRY[typeId].exerciseField`, never a hardcoded `exercises`; both
halves get their own `numberOfExercises`, and the tail drops `pageBreakBefore`. Refused for
fewer than two exercises, an `atIndex` outside `1..count-1`, and `layout-*` furniture. Pushes
history and survives the curriculum lock (layout, not difficulty). It exists because the
packer moves an over-long block whole to the next page and leaves a blank tail; the teacher
decides where it breaks — never automatic, a split renumbers their opdracht. UI in §9.

**Generation feedback:** `MathBlock.generationNote?: string | null` is UI-only (never
serialized — `persistence.ts` strips it; never in history). `setGenerationNote(id, note)` is
written by `regenerateBlock` ([generateDispatch.ts](../../src/services/generateDispatch.ts))
and `addBlockFromType`: a thrown generator becomes "Kon geen oefeningen maken: …" (danger
colour), a relaxed hoofdrekenen run becomes "Instellingen versoepeld …" and a genuine
shortfall "Slechts N oefeningen mogelijk …". Shown under Genereer in the Inspector as a
callout (icon + `--accent-soft`, or `--danger-soft` for a failure), lead sentence bold — a muted
hint line was too easy to miss.

Exercises are written by one **generic** action: `setExercises(id, field, data)`
where `field` is the registry-declared `exerciseField` (e.g. `'mabExercises'`).
There is no longer a setter per type. A second generic action
`patchExercise(id, field, exerciseId, patch)` updates **one** element in any array
field (used by ordenen click-to-edit and the splitsen "type a number" textboxes).

**Curriculum lock gate:** `updateBlockSettings` / `updateBlockLayout` /
`updateBlockInstruction` check `curriculum?.locked` and, when locked, allow only
`numberOfExercises` + `pageBreakBefore` + `widthUnits` + `showInstruction` + `skipNumbering` + `itemNumbering` +
`constraints.fitToWidth` (difficulty/wording
frozen; layout and presentation are not difficulty). This single
choke point enforces the lock without touching the ~16 config plugins. Draft-block
edits bypass the gate (authoring runs unlocked).

**`MathBlock.constraints` is `BlockConstraints`** (since 2026-09-12; was `any`) —
`Record<string, unknown> & CrossCutting`, where `CrossCutting = { bodyFontScale?, subType?, fitToPage?, fitToWidth?, answerSpace? }` —
an unnamed key read is a compile error; `scaffolding` is declared per family (7 literal types),
never cross-cutting.
The per-family shapes (43 `XConstraints` types + `ConstraintsByType`) live in
[constraintTypes.ts](../../src/services/math/constraintTypes.ts) and are re-exported from
`types.ts`. Generators, viewers and plugins narrow once at their entry line
(`const c = block.constraints as XConstraints`); plugins use the
[useConstraints](../../src/components/configurator/useConstraints.ts) `[c, patch]` hook.
`MathBlock<C extends BlockConstraints = BlockConstraints>` is generic; the registry stores
rows heterogeneously so `generate` keeps the plain `MathBlock` signature. Defaults come from
the registry's typed factories (`row<C>()`), which is what catches factory drift.

**`MathBlock.leafId?: string` + per-leaf instruction** (since 2026-09-13). A sidebar leaf may carry
`instruction: string | ((c) => string)` in `APP_STRUCTURE`; `addBlockFromType(typeId, label,
overrideConstraints?, opts?: { leafId?, instruction? })` resolves it against the merged constraints
through one pure `resolveInstruction()` in `instructionPresets.ts` (also used by the worksheet
templates and the curriculum builder, which freezes a function to text in the share link —
`CurriculumLock.allowedTypes[].leafId/instruction`, additive, no format bump). Fallback stays the
typeId-prefix table. The Inspector's "Standaardtekst…" list floats the leaf's own line first
(`suggestionsFor(typeId, leafId?, constraints?)`, `LEAF_BY_ID`). Every leaf is covered by
`instructions.test.ts`.

**`MathBlock.showInstruction?: boolean`** — `false` hides the block's opdracht title row on the
sheet (same code path as `layout-*` furniture). The block is still counted by the numbering
by default, so hiding a title never renumbers the rest of the sheet — unless
**`MathBlock.skipNumbering?: boolean`** is set (Opmaak → "Meetellen in de nummering", offered
only while the title is hidden): then the next opdracht takes this block's number. Both are
optional fields serialised through the normal block spread — no format bump. The numbering
itself is one pure function, `numberBlocks(blocks)` in
[blockNumbering.ts](../../src/services/layout/blockNumbering.ts) (furniture and skipped
blocks → `null`), shared by the sheet (`blockOrder`), the Inspector chip and `SheetThumbnail`
(which used to number by array index).

**`MathBlock.itemNumbering?: 'geen' | 'cijfer' | 'letter'`** (since 2026-09-14) — numbers the exercises *inside* a hoofdrekenen / rekenvolgorde block (`1)` … or `a)` … `z)`, `aa)`; Opmaak → "Nummering", shared `ItemNumberingRow`). Top-level, not in `constraints`, on purpose: it is presentation, so it passes the curriculum lock, never enters hr-std-gemengd's per-variant tabs, and does not raise the stale flag — `updateBlockSettings` treats a patch whose keys are all in `PRESENTATION_SAFE` (today: `itemNumbering`, `widthUnits` since 2026-09-15 — the width picker used to raise the flag for nothing) like `countOnly` / `fitToWidthOnly`: exercises kept, one history step, no "verouderd". Absent = geen; serialised through the block spread, no format bump. Labels are a fixed-width column per block (`itemLabelChars` × the mono advance) so the `=` stays on one x; `MathBlockRenderer` charges it to the stepped row estimate but not to the Kort one (whose 85px cell floor already overstates a row), so a default block stays 2-up.

**Measured layout is NOT store state.** Rendered cell heights and the page-body budget
live in [useMeasuredHeights](../../src/hooks/useMeasuredHeights.ts), React state inside
App: they describe how the sheet rendered, not what the sheet is, so they must never be
undoable, autosaved or shared. `loadWorksheet` normalises `widthUnits` from the old 6-unit
grid for callers that never passed a versioned payload (§10).

**Autosave:** a store subscription debounces 1.5 s after
`blocks`/`header`/`footer`/`docSettings`/`baseSettings` change and writes to
localStorage (payload also carries `curriculum`, so a locked sheet stays locked
across refresh). UI-only state (activeBlockId, showSolutions, bladSection, history,
draftBlocks) is excluded. Empty fresh-tab state never overwrites a populated autosave.

**The board store** — Bordmodus runs on a second, separate Zustand store,
[useBoardStore.tsx](../../src/board/useBoardStore.tsx) (pages, widgets, strokes, tool, ink
settings; own debounced autosave to `rekenraak_board_autosave_v1`; ink-only undo). Separate on
purpose: neither app can corrupt the other's state, and board edits never enter the sheet's
history. The one bridge is the **draftBlocks mirror**: while an exercise card's inspector is
open, `BoardInspector` seeds `draftBlocks = [widget.block]`, the real config plugins edit it
through `updateBlockSettings` (draft ids route to `draftBlocks`: no history, no lock), a
subscription copies each edit back into the board widget, and closing clears the drafts.
Sheet `blocks` and `_history` stay untouched (`boardStore.test.tsx`). Detail in §14.

---

## 4. The data model — [types.ts](../../src/services/math/types.ts)

`MathBlock` is the parent container; one block = one exercise section. It carries
one exercise array **per family** (only one is populated per block, keyed by
`typeId`):

| Field | Element type | Used by typeIds |
|---|---|---|
| `exercises` | `Equation` | optellen / aftrekken / vermenigvuldigen / delen (mental math) |
| `clockExercises` | `ClockExercise` | `klok-*` |
| `fractionExercises` | `FractionExercise` | `breuken` |
| `splitsenExercises` | `SplitsenExercise` | `splitsen` |
| `cijferExercises` | `CijferExercise` | `cijferen-*` |
| `geldExercises` | `GeldExercise` | `geld-herkennen`, `geld-tekenen` |
| `geldWisselExercises` | `GeldWisselExercise` | `geld-wissel` |
| `geldTeruggevenExercises` | `GeldTeruggevenExercise` | `geld-teruggeven` |
| `mabExercises` | `MabExercise` | `mab-herkennen`, `mab-tekenen` |
| `ordenenExercises` | `OrdenenExercise` | `ordenen`, `breuken-rangschikken` (reuses field + OrdenenViewer) |
| `breukBewerkExercises` | `BreukBewerkExercise` | `breuken-bewerken` |
| `deelbaarheidExercises` | `DeelbaarheidExercise` | `deelbaarheid` |
| `getallenasExercises` | `GetallenasExercise` | `getallenas`, `getallenrijen` (reuses field, own generator/viewer) |
| `meetExercises` | `MeetExercise` | `lengte-meten`, `omtrek` (cm-scale geometry) |
| `patroonExercises` | `PatroonExercise` | `getalpatronen` |
| `deelbaarheidKleurExercises` | `DeelbaarheidKleurExercise` | `deelbaarheid-kleuren` |
| `temperatuurExercises` | `TemperatuurExercise` | `temperatuur` |
| `plaatswaardeExercises` | `PlaatswaardeExercise` | `plaatswaarde` |
| `evenOnevenExercises` | `EvenOnevenExercise` | `even-oneven` |
| `vergelijkenExercises` | `VergelijkenExercise` | `vergelijken` |
| `afrondenExercises` | `AfrondenExercise` | `afronden` |
| `romeinseExercises` | `RomeinseExercise` | `romeinse-cijfers` |
| `herleidingExercises` | `HerleidingExercise` | `herleidingen` |
| `schattendExercises` | `SchattendExercise` | `schattend` |
| `verbandExercises` | `VerbandExercise` | `verbanden` |
| `procentExercises` | `ProcentExercise` | `procenten` |
| `maateenheidExercises` | `MaateenheidExercise` | `maateenheid` |
| `geldRekenenExercises` | `GeldRekenenExercise` | `geld-rekenen` (korting/winst/intrest; cents) |
| `rekenvolgordeExercises` | `RekenvolgordeExercise` | `rekenvolgorde` (token list incl. haakjes) |
| `getalFunctieExercises` | `GetalFunctieExercise` | `getalfunctie` |
| `tijdsduurExercises` | `TijdsduurExercise` | `tijdsduur` (minutes since 00:00; >1440 = next day) |
| `kalenderExercises` | `KalenderExercise` | `kalender` |
| `controleExercises` | `ControleExercise` | `controleren` (negenproef/omgekeerde) |
| `weegschaalExercises` | `WeegschaalExercise` | `weegschaal` |
| `vormleerExercises` | `VormleerExercise` | `vormleer-punt-lijn`, `vormleer-hoeken`, `vormleer-figuren` (kind-discriminated); since round 4 the punt-lijn scenario model: `elements: VormleerElement[]` (type, name, label, optional orient, normalised 0..1 pts) + `steps: VormleerStep[]` (tekenen `text`, herkennen `before`/`after`/`answer`/`rel` cloze), built once per niveau and rendered by mode; `subExercises` legacy-read-only. Also `niveau`, `relations[]` (`{kind: loodrecht/evenwijdig/snijdt/ligt-op, a, b, at?, before, after, answer}` — the sentence around the blank), `subExercises?` (niveau 3 = two relations), `pointT/pointOffset` (ligt-op placement) |

`kettingsommen` reuses `patroonExercises`;
`oppervlakte` reuses `meetExercises` (adds `area?: number`).

Every exercise element has `id: string` and `isManuallyEdited: boolean` (set
`false` on generation; flipped `true` when a teacher hand-edits via
`updateExercise` / `updateCijferExercise` / the generic `patchExercise`).

---

## 5. Adding a new exercise type — the registry contract

Exercise types are declared in a **central registry**, split across two files
keyed by **exact** `typeId` (no substring matching):

- [exerciseRegistry.ts](../../src/config/exerciseRegistry.ts) — **pure data** (no React):
  `{ exerciseField, generate, defaultConstraints, defaultCount, maxPresets? }`. Imported by the
  store and `generateDispatch`. `maxPresets(c) → { key, presets } | null` names the
  max-number list the type's config shows for constraints `c` (branching on numberType /
  layout / mode exactly like the config); its top is the type's **didactic ceiling**. The lists
  themselves live once in [numberRanges.ts](../../src/config/numberRanges.ts) — configs render
  them, `baseApply` floors the grade/base seed into them (§13), `constraintSpace.ts` sweeps the
  same lists. `null` = no picker. Configs never pick a list themselves: they render
  `useMaxPresets(block)?.presets` ([useMaxPresets.ts](../../src/components/configurator/useMaxPresets.ts);
  inside a gemengd variant tab it resolves the variant operator's row), guarded by the
  `maxPicker.render` and `maxPresets.sources` tests (allowlist: herleidingen slider stops,
  geld-rekenen `maxEuro`, the base seed buttons). `floorMaxIntoList(typeId, c)` lowers a stored
  max onto its list (used by `loadWorksheet`). `isFurniture: true` marks the `layout-*` rows
  (no title, no number, nothing to split) — read it instead of the typeId prefix.
  `kiosk?: KioskDescriptor` (Oefenmodus, §15) says how a pupil answers ONE exercise of the type
  on screen: input kind, accepted spellings, plain-text rendering, which settings it can check.
  The descriptors live in [kioskDescriptors.ts](../../src/services/oefenen/kioskDescriptors.ts)
  (pure, imported by the registry); absent = the type cannot be practised in the kiosk.
- [exerciseUI.tsx](../../src/config/exerciseUI.tsx) — **React**: `{ Viewer, Config }`.
  Imported by `components/sheet/SheetBlock.tsx` and `Inspector.tsx`.

The split exists to avoid a cycle: configs import the store, so if the store
imported a registry that pulled in configs it would loop. The store only needs the
pure-data file.

The four consumers are now **table lookups, not branches**:

| Consumer | File | Reads |
|---|---|---|
| Generate | [generateDispatch.ts](../../src/services/generateDispatch.ts) | `REGISTRY[typeId].generate` + `.exerciseField` |
| Config mount | [Inspector.tsx](../../src/components/configurator/Inspector.tsx) | `EXERCISE_UI[typeId].Config` (+ optional `StyleConfig` = the family's Differentiatie rows in the Opmaak tab, `AdvancedConfig` = the Geavanceerd accordion body whose presence shows the accordion, `advancedApplies` = breuken-only guard). Inspector mounts all by registry lookup; it has no typeId branches. A Config may mount OTHER families' plugins for a sub-bag through `ConstraintScope` (gemengd's per-variant tabs) — the plugin code stays unaware |
| Viewer routing | [SheetBlock.tsx](../../src/components/sheet/SheetBlock.tsx) | `EXERCISE_UI[typeId].Viewer` |
| Block defaults | [blocksSlice.ts](../../src/store/slices/blocksSlice.ts) `addBlockFromType` | `REGISTRY[typeId].defaultConstraints()` + `LEAF_BY_ID[leafId]?.defaultCount ?? .defaultCount` (a leaf may carry its own count; only oppervlakte-rooster does, = 2) |
| Seed fit | [baseSettings.ts](../../src/config/baseSettings.ts) `seedConstraints` | `SEED_FIT[typeId]` (exerciseRegistry.ts) — runs last, only when the max came from the seed (not pinned by the override): schattend/afronden drop rounding targets that can't round at the seeded max; getallenas/-rijen lower ticks (min 4), then the step, so a default never needs a note |
| Generation note | [generateDispatch.ts](../../src/services/generateDispatch.ts) | `REGISTRY[typeId].generateNoted?` → `{ items, note }`; the note lands on the block (`generationNote`, Inspector box, §6) |
| Oefenmodus | [kiosk.ts](../../src/services/oefenen/kiosk.ts) `kioskFor` / `kioskSupports` / `kioskCapableLeaves` | `REGISTRY[typeId].kiosk` (+ `.supported(c)` over the registry defaults): which leaves the builder lists, how the kiosk asks and checks (§15) |

### Checklist to add a type

1. **Types** — add the exercise interface + its array field to `MathBlock` in
   [types.ts](../../src/services/math/types.ts), and (optionally) a `<X>Constraints`
   interface alongside the others.
2. **Generator** — create `src/services/<domain>/<x>Generator.ts` exporting
   `generate<X>Exercises(block): <X>Exercise[]` (see §6 for the contract).
3. **Viewer** — create `src/components/viewer/<X>Viewer.tsx` taking the uniform
   `{ block, showSolutions }`. If a type needs a mode/grid hint, derive it from
   `block.typeId` / `block.constraints` inside the viewer (as `MabViewer` does).
4. **Config plugin** — create `src/components/configurator/plugins/<X>Config.tsx`
   taking `{ block }`.
5. **Registry rows** — add **one row** to `REGISTRY` (exerciseRegistry.ts) and
   **one row** to `EXERCISE_UI` (exerciseUI.tsx), under the same `typeId` key. A type with a
   max-number picker declares `maxPresets` on its REGISTRY row and takes its list from
   `numberRanges.ts` (a new capped list is added there, never as a literal in the config).
6. **Sidebar tree** — add the leaf (with `typeId`, optional `defaultConstraints` and an
   `instruction` — the pupil-facing opdracht-titel, a string or a function of the constraints)
   to `APP_STRUCTURE` in [appstructure.ts](../../src/config/appstructure.ts). The leaf's
   `defaultConstraints` are merged on top of the registry defaults at add time; an optional leaf
   `defaultCount` overrides the row's count.
7. **Limit rules** — a `LIMIT_SPECS[typeId]` entry in
   [limitRules.ts](../../src/__tests__/helpers/limitRules.ts) saying what the config promises (which
   numbers stay ≤ max, noemer caps, sides, …), and the type's options in `constraintSpace.ts`;
   `limits.matrix.test.ts` fails the gate without the entry (TESTING.md "The limit harness").
8. **Oefenmodus (optional)** — a `kiosk` descriptor in
   [kioskDescriptors.ts](../../src/services/oefenen/kioskDescriptors.ts) on the REGISTRY row;
   **append** every leaf it makes capable to `KIOSK_LEAF_TABLE_V1` (and a new constraint key the
   links should carry compactly to `KIOSK_KEY_TABLE_V1`) in [kiosk.ts](../../src/services/oefenen/kiosk.ts),
   never reorder; add the leaves to `EXPECTED_LEAVES` and the typeId's generator truth to `TRUTH`
   in `oefenen.descriptors.test.ts`, and the new table entries to the pinned copies in
   `oefenen.session.test.ts` (§15). To answer ON the exercise: `input: 'interactive'` + `interact` and
   `interactionProps` / `<KioskCell>` in the viewer (§8 interaction context, §15 Phase C); a `build` kind adds `interact.pieces` + `EXERCISE_UI[typeId].TrayPiece`, a `drag` kind `kioskDrag.ts` helpers and a `tolerance`; `prepare(c, rng)` and `extraKeys` are optional descriptor fields.

Do **not** add `if (typeId === …)` branches in dispatch / Inspector / App — that
pattern is gone. A missing registry row makes the block render/generate nothing
(no silent wrong-branch); search either registry file to confirm the key exists.

`defaultConstraints` is a **factory** (`() => ({...})`), not a literal, so each new
block gets fresh mutable mask objects (`operand1Mask: {}` etc.) rather than
sharing one reference.

---

## 6. The generator contract (shared by every generator)

**Sheet-wide dedupe sits above the generators** (since 2026-09-14): every path that fills a
block — `regenerateBlock` (Genereer / Genereer alles), the first generate in `addBlockFromType`,
the mode-switch regenerates in the breuken/MAB configs — goes through `generateForBlock(block, uniqueExercises)` in
[generateDispatch.ts](../../src/services/generateDispatch.ts); the count top-up in `updateBlockSettings`
goes through its sibling `generateExtra(block, existing, want, unique)`, which reuses the same
`dedupeWithTopUp` (dedupes against the keys already on the sheet, pads from existing, may set the
same "Kleine reeks" note), so raising a count and generating fresh follow one policy. With the toggle on it keys
each exercise (`def.exerciseKey?.(ex)`, else the exercise with every `id` field stripped,
stringified), drops repeats and re-rolls the generator up to 8 rounds to refill; a pool too
small to fill the count (12 hours-only clock times for 15 questions) is padded with repeats and
the generation note says "Kleine reeks: N oefeningen komen dubbel voor." Generators keep their
own within-block `used` set — the wrapper is for what the generator's key cannot see.

Every `generate<X>Exercises` follows the same shape — document/learn it once:

```ts
export function generateXExercises(block: MathBlock): XExercise[] {
  const c = block.constraints as XConstraints; // narrow once; shape in constraintTypes.ts
  const n = block.numberOfExercises;
  const used = new Set<string | number>();     // dedup within the block
  const results: XExercise[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 20000;                   // guard vs over-restrictive constraints
  while (results.length < n && attempts < MAX_ATTEMPTS) {
    attempts++;
    const candidate = /* derive from c */;
    const key = /* stable string/number for dedup */;
    if (used.has(key)) continue;
    used.add(key);
    results.push({ id: rndId(), ...candidate, isManuallyEdited: false });
  }
  return results;                              // may be short if budget exhausted
}
```

Hoofdrekenen (`hr-std-*`) wraps this loop in `generateWithRelaxation` ([relax.ts](../../src/services/math/relax.ts)):
strict settings first; if short, a throwaway clone drops one rung at a time (preset →
operand2Mask → operand1Mask → bridges → termCount) and the block gets a `generationNote`
(§3). Stored constraints are never mutated.

**Limits are hard; notes instead of silent changes** (limit-fix campaign 2026-10-08). Every number
a config promises to bound (max, noemer caps, sides, "Maximum per getal", …) stays inside it — the
gate test `limits.matrix.test.ts` enforces it per type. When a generator cannot honour what the
teacher picked (an impossible mask, a range too small, a span that cannot fit), it fills what it can
WITHIN the limits and says so: the row exposes `generateNoted(block) → { items, note }` and the
Dutch note lands in the Inspector box. Shared wording (singular/plural) lives in
[generationNotes.ts](../../src/services/generationNotes.ts) (`countOefeningen`, `repeatNote` —
also used by the dedupe's "Kleine reeks" note — plus `repeatsIn` / `joinNotes` /
`withoutRepeatNote`) and hr's `relax.shortfallNote`. A block forced to repeat exercises says so
("Kleine reeks: N … dubbel"); with "Geen dubbele oefeningen" on, the dedupe pass owns that count
(it strips the generator's and adds its own, so the sentence appears once). Never exceed a
limit to fill a block; fewer exercises + a note is the fallback. A block left EMPTY by a legitimate
note is drawn by SheetBlock itself: the note on screen (`no-print`), only the title on paper.

`MAX_ATTEMPTS` varies by generator (20000 for math/geld-teruggeven, 5000 for MAB,
500 per-item for cijferen). Some simple generators (geld, fractions, clock) skip
the retry loop and build exactly `n` items directly.

### Shared cross-generator concepts

- **`INTERNAL_SCALE = 1_000_000`** ([mathEngine.ts](../../src/services/math/mathEngine.ts)) —
  all arithmetic is done as scaled integers to avoid JS float rounding, divided
  back at display time.
- **`operandNMask`** (`operand1Mask`, `operand2Mask`, …) — `Record<placeKey,
  boolean>` forcing which place-values must be non-zero. Place keys:
  `E`=eenheden (units), `T`=tientallen, `H`=honderdtallen, `D`=duizendtallen,
  `TD`/`HD` higher, and lowercase `t`/`h`/`d` for decimals.
- **`bridges`** — `Record<placeKey, 'FREE' | 'REQUIRED' | 'FORBIDDEN'>`. A
  *bruggetje* is a carry/borrow across a place-value boundary (Dutch primary-school
  term). `REQUIRED` = that column must carry/borrow; `FORBIDDEN` = must not;
  `FREE` = either. Used by mental-math (`mathEngine.ts`) and `cijferen`.
- **`numberType`** — `'natural' | 'decimal' | 'rational'` selects the value domain
  (rational = fractions, via the `Fraction` type).
- Other family-specific keys live in the registry table (§7) and the per-generator
  source.

---

## 7. Exercise-type registry table

> Max-number lists (2026-09-27): each row's `maxPresets` picks its list from
> [numberRanges.ts](../../src/config/numberRanges.ts). Lists capped by the old global 1 000 000
> (hr natural + / − / gemengd, ×/: 'andere', cijferen natural, afronden natural, plaatswaarde,
> splitsen positie-*, vergelijken getallen/kiezen, base) grow to 1 000 000 000; every other list
> keeps its own didactic ceiling (MAB 1 000, geld 1 000, deelbaarheid / getallenas / ordenen /
> patronen / schattend 100 000, …). `PLACE_VALUES` (mathEngine.ts) runs Mrd · HM · TM · M … td, so
> masks / bridges / plaatswaarde reach the miljarden; `getMaskPlaces(max)` only exposes places ≤ max.
> Above 1e6 (only): compenseren rounds to 10^(digits−2) (… 299 999 999); tienvoud's base is capped at
> 10 000; delen 'andere' keeps the divisor ≤ half the dividend's digits (mask-only paths divide exactly);
> cijferen bridges cover every place to Mrd, multiplier/divisor tiers go to 9 999. MathBlockRenderer fits a
> 3–4-term chain of 10+-char operands that its estimate says overflows `useBlockWidth()`: font steps 0.95 →
> 0.85 (= WIDTH_FIT_FLOOR), then the chain wraps before its last term; otherwise styles are untouched.
> Width estimates: every mono text width goes through `monoTextPx` / `MONO_ADVANCE_EM` (0.65 em, measured)
> in blockLayout.ts — no per-viewer glyph constants or size-threshold formulas. Hoofdrekenen's row geometry
> and its fit ladder (font 1 → 0.95 → 0.9 → 0.85, then wrap before the last term) live in the pure
> [hrRowLayout.ts](../../src/services/layout/hrRowLayout.ts); the viewer draws from the same `geometry()`.
> Afronden natural targets: T H D TD HD, then 1M 10M 100M (and 1MLD at max 1e9). Splitsen positietabel
> spells to een miljard (dutchWords). Everything ≤ 1e6 keeps its old random stream.

> Limit-fix campaign (2026-10-08, BUGS ids L/E/N in git history):
> - **Met rest** has a max list `hrMetRest` [100, 1000] ("Maximum deeltal") through `divMax` on the
>   hr-std-delen row, seeded from the leerjaar (L1-2 → 100, L3+ → 1000). `MET_REST_LEVEL_MIN_MAX`
>   / `clipMetRestLevel` (numberRanges.ts) is the one source for which niveau fits (N2 needs 100, N3
>   1000); NaturalSettings greys out levels that don't fit, mathEngine lowers the level with a note.
>   Old saves: `floorMaxIntoList` floors a carried-over 1e6 to 1000.
> - **Leerjaar 1 = 20** only on `plaatswaarde`, `vergelijken` (getallen/kiezen) and
>   `deelbaarheidKleurRaster`. Gap by owner decision: afronden ×4, controleren, deelbaarheid-tabel,
>   rekenvolgorde, patronen-dec/-geh, procenten, schattend, splitsen-boom still floor 20 up to 100/1000.
> - **Gemengd** applies its shared max to every variant: `effectiveBlockFor` sets the unstored
>   `MulDivConstraints.capToMax`, under which tafels / deeltafels / tienvoud / andere respect maxGetal
>   (standalone tafels and tienvoud are unchanged).
> - **Result caps**: schattend (exact result and estimate), controleren (result and planted wrong
>   answer) and rekenvolgorde (answer and every intermediate, 2-4 bewerkingen) stay ≤ max.
> - **getallenas / -rijen** shrink to fit (`fitLine`, exported from getallenasGenerator): fewer ticks
>   (min 4), then a smaller 1-2-5 step, with a note; rational rows cap at maxTeller.
> - `generateNoted` rows: cijferen ×8, getallenas, getallenrijen, getalpatronen, kettingsommen,
>   schattend, procenten, rekenvolgorde, breuken, breuken-bewerken, omtrek, oppervlakte, ordenen,
>   breuken-rangschikken, herleidingen, maateenheid, kalender, geld-herkennen/-tekenen/-teruggeven,
>   plaatswaarde, vergelijken, afronden (`notingShortfall`), hr-std-delen, verbanden.

> Multi-term (2026-07-06): hr-std equations support 2-4 termen/factoren (`termCount`,
> `operandMasks[]`, `operandMax[]`, `Equation.operators[]` + `missingIndex`) and presets
> `constraints.preset = 'compenseren' | 'tienvoud'` (UI: `plugins/HrPresetRow.tsx`;
> tussenstap via `compenserenScaffold`, Differentiatie card).

One row per live `typeId` — this table mirrors
[exerciseRegistry.ts](../../src/config/exerciseRegistry.ts) +
[exerciseUI.tsx](../../src/config/exerciseUI.tsx) (keep them in sync). Placeholder
leaves in [appstructure.ts](../../src/config/appstructure.ts) carry `placeholder: true`
/ `typeId: '__placeholder__'` and are **not implemented** — greyed tree entries
only.

| typeId | MathBlock field | Generator (export) | Viewer | Config plugin | Key constraint keys |
|---|---|---|---|---|---|
| `hr-std-optellen` | `exercises` | `generateAdditionExercises` (mathEngine) | `MathBlockRenderer` | `AdditionConfig` | `AddSubConstraints` via `addSubDefaults`: numberType, maxGetal, bridges, operand1/2Mask, equationType |
| `hr-std-aftrekken` | `exercises` | `generateSubtractionExercises` | `MathBlockRenderer` | `SubtractionConfig` | same as optellen (`addSubDefaults`) |
| `hr-std-vermenigvuldigen` | `exercises` | `generateMultiplicationExercises` | `MathBlockRenderer` | `MultiplicationConfig` | `MulDivConstraints` via `mulDivDefaults`: multiplicationMode, selectedTables, tableLimit, fractionMultMode |
| `hr-std-delen` | `exercises` | `generateDivisionExercises` | `MathBlockRenderer` | `DivisionConfig` | `mulDivDefaults`: divisionLevel, metRestLevel, selectedTables, tableLimit |
| `hr-std-gemengd` | `exercises` | `math/mixedGenerator.ts` (per exercise: pick a VARIANT, build the effective hr-std block, run `mathEngine` + `relax`) | `MathBlockRenderer` | `GemengdConfig` (per-variant tabs mount the four hr-std plugins under a `ConstraintScope`) | `MixedConstraints`: shared AddSub bag + `variants` (8 ids in `MIXED_VARIANTS` = operator × optional preset compenseren/tienvoud), `mix` random/cycle, `perVariant[id]` sparse tab overrides merged by `effectiveBlockFor` (shared → preset defaults → tab). Two leaves (natural / decimal), last under Hoofdrekenen. Per-exercise switch: `regenerateExercise` (§3) |
| `cijferen-optellen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` (default 4 exercises, 4 per row at full / 2 at ½ / 1 at ¼ — decimal × 3, decimal : 2; ruitje size = `cijferGrid.ts`, a factor of `--sheet-size-math` × the `gridCellSize` multiplier; grid lines on the half-stroke; ≤3 per row measured from the exercises themselves) | `CijferConfig` | operator, numberType, maxRange, numberOfTerms, bridges, operand0-3Mask; each exercise carries `decimalPlaces` (own-data rule) |
| `cijferen-aftrekken-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-vermenigvuldigen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-delen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above + withRemainder |
| `klok-kloklezen` | `clockExercises` | `generateClockExercises` | `ClockExerciseItem` | `ClockConfig` | clockType, is24hour, timeTypes, minuteDirection, handChoice — each exercise carries its own `clockType/exerciseMode/is24hour/handChoice` (own-data rule, 2026-09-13) |
| `breuken` | `BREUKEN_KIOSK` | only kleuren / herkennen / hoeveelheid(-abstract): kleuren **tap** n of the d parts (a square of d ≥ 5 is a wider rows × cols grid in the kiosk so every part is ≥ 44 px, `kioskSquareGrid`); else a breuk, a count, or the two counting questions |
| `splitsen` | `SPLITSEN_KIOSK` | only basic / splitsboom / harten / positie-tabel: **fill** the partners, the tree's blank or the positietabel on the card |
| `geld-herkennen` | `geldExercises` | `generateGeldExercises` | `GeldViewer` | `GeldConfig` | maxGetal, format, allowedDenominations, geldLayout |
| `geld-tekenen` | `geldExercises` | `generateGeldExercises` | `GeldTekenenViewer` | `GeldConfig` | maxGetal, scaffolding, allowedDenominations |
| `geld-wissel` | `geldWisselExercises` | `generateGeldWisselExercises` | `GeldWisselViewer` | `GeldWisselConfig` | exerciseBills, exercisesPerRow |
| `geld-teruggeven` | `geldTeruggevenExercises` | `generateGeldTeruggevenExercises` | `GeldTeruggevenViewer` | `GeldTeruggevenConfig` | min/maxPriceEuros, payWithOptions, centenDeel, antwoordType |
| `mab-herkennen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=herkennen) | `MabConfig` (stijl = inline 3-card row of `ExercisePreview`s, hidden for tekenen) | maxNumber, operand1Mask, mabStyle, scaffolding |
| `mab-tekenen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=tekenen) | `MabConfig` | maxNumber, operand1Mask, mabStyle, scaffolding |
| `ordenen` | `ordenenExercises` | `generateOrdenenExercises` | `OrdenenViewer` (click-to-edit; one CSS grid per exercise so blanks sit under their numbers, never wraps) | `OrdenenConfig` + StyleConfig `answerStyle` (lijn/vak) | numberType, count(2–8), operatorMode, maxGetal, minGetal, decimalPlaces, numberMask, min/maxDenominator, unitFractionsOnly, allowMixed |
| `breuken-bewerken` | `breukBewerkExercises` | `generateBreukBewerkExercises` | `BreukBewerkViewer` (answer = writing line) | `BreukBewerkConfig` | subType (gemengd/gelijknamig/vereenvoudigen — sidebar leaf), direction (gemengd), gemengd+vereenvoudigen getalopbouw via `FractionMaxField` (`maxNumerator`/`maxDenominator`); vereenvoudigen presets (`tablesOnly`) + `allowIrreducible`; gelijknamig min/maxDenominator range + optional `targetDen` (fixed common noemer, else KGV). Reuses `gcd`/`simplifyFraction`/`toMixedNumber` (exported from mathEngine) |
| `breuken-rangschikken` | `ordenenExercises` | `generateBreukenRangschikkenExercises` | `OrdenenViewer` (reused) | `BreukenRangschikkenConfig` | fractionMode (stambreuken/gelijknamige/gelijknamig-te-maken/speciale), count(2–5), operatorMode, min/maxDenominator |
| `getallenrijen` | `getallenasExercises` | `generateGetallenrijExercises` | `GetallenrijenViewer` | `GetallenrijenConfig` | numberType (natural/decimal/rational/geheel — sidebar leaf), maxGetal, step (+custom jump all types), direction (stijgend/dalend/beide), numberMask (anchor; decimal mask dp = step decimals), rational getalopbouw via `FractionMaxField` (noemer=fractionStep, teller=maxTeller), ticks, `showFrame` (Differentiatie toggle, rounded pill on/off); getallenas without the axis line |
| `lengte-meten` | `meetExercises` | `generateLengteMetenExercises` | `MetenViewer` | `MetenConfig` | measureModel: **meten** (write the length) or **gegeven** = juist/fout (stated `claim` ±, pupil circles juist/fout); precision (cm/mm), min/maxLength, maxCorners (0–4 → polyline segments). Drawn to scale (1cm≈37.8px). Scaffold/answer keys (`perSideScaffold`, `answerMode` single/sum, `answerUnit` cm/plain) live in the Inspector **Differentiatie** card |
| `omtrek` | `meetExercises` | `generateOmtrekExercises` | `MetenViewer` | `MetenConfig` | measureModel (op-schaal/gegeven), precision, length-per-side, `shapes[]` (driehoek · vierkant/rechthoek/ruit/parallellogram/trapezium/vierhoek · vijf-/zes-/zeven-/achthoek · cirkel met middelpunt) + the Differentiatie scaffold/answer keys. Constructors return exact `sides[]` (hele cm never drifts); perimeter = Σ sides or π·d |
| `deelbaarheid` | `VEELVOUDEN_KIOSK` | veelvouden: the multiples after the given ones (typed); tabel: **tap** every number it is divisible by |
| `deelbaarheid-kleuren` | `DEELBAARHEID_KLEUR_KIOSK` | rooster / omcirkelen / kleurraster: **tap** every number divisible by the divisor (card shows ≤ 20 numbers) |
| `getalpatronen` | `patroonExercises` | `generatePatroonExercises` | `PatroonViewer` | `PatroonConfig` | numberType (nat/dec/geheel — leaf), maxGetal, minGetal, ticks, **steps** (1–4 repeating cycle), **ops** (`+ − × :`), **opSettings** per op `{max,mask}` (+/− mask spans the block place range incl. decimals), `maxDecimals` (decimal). Differentiatie (Inspector): `showArrows`, `showOperators`, `operatorsShown`, `operatorStyle` (symbol/full). No frame; `–`/arrow connectors |
| `deelbaarheid-kleuren` | `deelbaarheidKleurExercises` | `generateDeelbaarheidKleurExercises` | `DeelbaarheidKleurViewer` | `DeelbaarheidKleurConfig` | viewMode (strip/markeren; legacy `raster` still loads and renders as strip+rechthoek), `rasterVorm` (lijn/rechthoek — the old kleurraster is the rechthoek form of the strip, cells in `em` so they follow the font sliders, last row padded to a full rectangle), `divisors[]` (2–12, rotated per row), maxGetal/perRow or rasterCount/rasterCols, `showRest` |
| `splitsen` (positie-*) | `splitsenExercises` | `generateSplitsenExercises` | `SplitsenViewer` | `SplitsenConfig` | layout positie-tabel/-benen/-math (sidebar leaf), maxGetal(≤1e9), decimalPlaces, operand1Mask, benenVariants[], mathForms[], mathDirection, `mathOrder` (volgorde/gehusseld — the generator shuffles once per exercise into `ex.placeOrder`); columns follow width + maxGetal (benen), positie-math is always 1-up |
| `getallenas` | `getallenasExercises` | `generateGetallenasExercises` | `GetallenasViewer` | `GetallenasConfig` | numberType (natural/decimal/rational/geheel), maxGetal, minGetal, step, fractionStep, direction(+beide), allowMixed, gelijknamig, hardMode, ticks |
| `temperatuur` | `temperatuurExercises` | `generateTemperatuurExercises` | `TemperatuurViewer` | `TemperatuurConfig` | variant (kleuren/aflezen/verschil — sidebar leaf), mode1/mode2 (verschil), includeNegatives, perRow |
| `plaatswaarde` | `PLAATSWAARDE_KIOSK` | waarde: a number; plaats: pick the place; omcirkelen: **tap** the place chip; tabel: **fill** the plaatswaardetabel |
| `even-oneven` | `EVEN_ONEVEN_KIOSK` | cirkels: even / oneven; rooster: **tap** every even (or oneven) number |
| `vergelijken` | `VERGELIJKEN_KIOSK` | getallen / representaties: `<` `=` `>` buttons; kiezen: **tap** the grootste / kleinste number on the card |
| `afronden` | `AFRONDEN_KIOSK` | simpel and rooster: **fill** the rounded number into the card's cells |
| `romeinse-cijfers` | `romeinseExercises` | `generateRomeinseExercises` | `RomeinseViewer` | `RomeinseConfig` | subType (herkennen/schrijven), niveau (1–4); always-subtractive notation, numberMask |
| `herleidingen` | `herleidingExercises` | `generateHerleidingExercises` | `HerleidingenViewer` | `HerleidingenConfig` | measure (lengte/inhoud/massa/**oppervlakte** incl. ha·a·ca — sidebar leaf), units[] (ladder subset), **maxEnkel** (def 100, single formats) + **maxSamengesteld** (def 1000, compound formats) — power-of-10 breakpoint sliders, formats[] (4), **compoundMode** (2/volledig), writeUnits, scaffolding (geen/tabel-headers/tabel-blanco) + table options `tablePrompt`/`tableAnswer` (blank/filled/hidden)/`tableCellW`/`tableCellH` — all in the **Differentiatie** card. Integer-exact (safe-int guarded); `HerleidingenViewer` auto single-columns wide blocks, renders a centered enriched table, and allows inline edit of given numbers + a unit **dropdown** (`recomputeHerleiding` + `patchExercise`). |

| `schattend` | `schattendExercises` | `generateSchattendExercises` | `SchattendViewer` | `SchattendConfig` | operators[] (+−×:; ×/: keep one factor ≤9), numberType (leaf), maxGetal, roundTargets[] (afronden keys), scaffolding (tussenstappen/enkel-schatting), `answerLine` (kort/lang); every exercise is one CSS grid with block-wide `ch` tracks so ≈, blanks and operands align; skips items where nothing rounds |
| `verbanden` | `VERBANDEN_KIOSK` | **fill** the asked representation cells (breuk / kommagetal / procent without `%`) |
| `procenten` | `procentExercises` | `generateProcentExercises` | `ProcentenViewer` | `ProcentenConfig` | subType (nemen/welk-percent — leaf), percents[], maxGetal, scaffold (10 %/1 % hulplijn, only when the tussenstap is whole); answer-first → natural results |
| `maateenheid` | `MAATEENHEID_KIOSK` | omcirkelen: **tap** a chip; schrijven: type the unit (not schatten + schrijven) |
| `geld-rekenen` | `geldRekenenExercises` | `generateGeldRekenenExercises` | `GeldRekenenViewer` | `GeldRekenenConfig` | subType (korting/winst/intrest — leaf), percents[] (pool differs per variant), maxEuro, wholeEuros, halfYear (intrest pro rata); cents internal, whole-cent answers guaranteed, `formatEuro` |
| `rekenvolgorde` | `rekenvolgordeExercises` | `generateRekenvolgordeExercises` | `RekenvolgordeViewer` (reads `useBlockWidth()`; digits at the `*1` math factor, SYNC with MathBlockRenderer) | `RekenvolgordeConfig` + `RekenvolgordeStyleConfig` (Kort / Lang / Stappen → `layoutPreset` inline-short 2-up / inline-long 1-up full-width line / stepped N `steppedLines`, 2-up while two rows keep the writing room, like hoofdrekenen) | operators[] (≥1 ×/: enforced), opsCount (2/3), maxGetal, haakjes (only planted when they change the outcome); tokens rendered verbatim |
| `kettingsommen` | `patroonExercises` (reused) | `generateKettingExercises` | `PatroonViewer` (reused) | `KettingConfig` | ops[] (no two equal in a row), opSettings per op, chainLength (3–5; cycle length = ticks−1), maxGetal, blankMiddle; defaults force showArrows/showOperators + operatorStyle 'full' |
| `getalfunctie` | `GETALFUNCTIE_KIOSK` | aankruisen: **tap** the functie; schrijven: text |
| `tijdsduur` | `tijdsduurExercises` | `generateTijdsduurExercises` | `TijdsduurViewer` | `TijdsduurConfig` | granularity[] (heel-uur/kwartier/vijf-min/een-min), blanks[] (duur/einde/begin, rotates), maxDuurMin (60/240/720), overMidnight (einde prints "(volgende dag)") |
| `kalender` | `kalenderExercises` | `generateKalenderExercises` | `KalenderViewer` | `KalenderConfig` | subType (maandrooster/datum-rekenen/notatie — leaf), questionTypes[] + questionCount (rooster), month (random/0–11), year (pinned 2026 for stable regeneration); ma-first CSS-grid month |
| `controleren` | `CONTROLEREN_KIOSK` | **tap** juist or fout on the card |
| `oppervlakte` | `meetExercises` (reused, + `area`) | `generateOppervlakteExercises` | `OppervlakteViewer` | `OppervlakteConfig` | subType (rooster = 1 cm grid count, whole-cm rect/L-figuur / berekenen = l×b, ½·b·h for rechth. driehoek — leaf), shapes[], min/maxLength sliders, scaffoldFormule (`opp = ___ × ___ = ___`), askOmtrek; SYNC cm→px 37.8 with MetenViewer |
| `weegschaal` | `weegschaalExercises` | `generateWeegschaalExercises` | `WeegschaalViewer` | `WeegschaalConfig` | mode (aflezen = black needle / kleuren = no needle, the pupil shades the dial from 0 to the value, solution paints that wedge in `SOL` — leaf; a legacy `tekenen` loads as kleuren), bereikGram (1000/2000/5000) with dependent stepGram (BEREIK_STEPS), notatie (g/kg-komma/kg-g), exercisesPerRow, boxHeight; values snap to the schaalverdeling; each exercise carries its own `bereikGram/stepGram/notatie/mode` (own-data rule) |
| `vormleer-punt-lijn` · `-hoeken` · `-figuren` | `vormleerExercises` (shared) | `generateVormleerExercises` | `VormleerViewer` (shared) | `VormleerConfig` (shared) | kind from typeId (registry default), mode (herkennen/tekenen; hoeken also **meten** = one to-scale angle in 5° steps 20–160° on a grid, pupil writes the degrees, `showHulplijn` faint 0–180 line, no frame around the angle — leaf "Meten", floor ½; figuren eigenschappen table sizes its columns from `useBlockWidth()` and splits into stacked mini-tables when they would overflow; figuren: benoemen/eigenschappen), **niveau** 1/2/3 for punt-lijn, ONE scenario builder (`buildScenario`) shared by herkennen and tekenen so both modes read identically (1 = one named element; 2 = two elements in one named relation, "Rechte a snijdt horizontale halfrechte [AB in punt C"; 3 = a three-step chain in one figure) — tekenen = numbered instruction + one empty box, herkennen = the same scenario drawn + blanks; every element always labelled (points uppercase, rechten lowercase, `[AB` / `[AB]`); `allowHorizontaal` / `allowVerticaal` pills (default off) add orientation words and draw those elements unrotated; niveau ≥ 2 floors at ½; hoeken tekenen `nameAngles` (default on) names the requested angle "hoek ABC", vertex in the middle, concepts[] per kind (leaf presets; figuren classify axis driehoeken-hoeken/-zijden/vierhoeken), answerMode (woordbank/schrijven), randomRotation, showBoog (hoeken; square marker at 90°), showMarks (equal-side ticks + right-angle squares), raster + boxHeight (tekenen), exercisesPerRow; `CONCEPT_NAMES` maps keys → leerplan names |

> Note: matching is now exact-key, so the old substring collision between
> `hr-std-optellen` and `cijferen-optellen-*` (which forced
> `!startsWith('cijferen-')` guards) no longer exists. Inspector still uses a small
> `isHrStd` substring helper for one mental-math-only differentiation control;
> that's a UI affordance, not type routing.

### Oefenmodus: the rows that carry `kiosk` (§15)

One phrase per descriptor ([kioskDescriptors.ts](../../src/services/oefenen/kioskDescriptors.ts));
"only X" is its `supported(c)`. 108 sidebar leaves are capable at their defaults
(`kioskCapableLeaves()`, pinned in `oefenen.descriptors.test.ts`; `KIOSK_LEAF_TABLE_V1` has 110 entries); **tap / fill / order /
build / drag** = the pupil answers ON the exercise through `interact` (§15 Phase C).

| Row(s) | Descriptor | What the pupil gives |
|---|---|---|
| `hr-std-optellen` · `-aftrekken` · `-vermenigvuldigen` · `-delen` · `-gemengd` | `HR_KIOSK` | the answer; a puntoefening asks the blank (`missing-operand`), met rest asks quotiënt + rest (`number+rest`); keys follow numberType (`,` / `/` + space / `−`) |
| `cijferen-*` (8) | `CIJFER_KIOSK` | **fill** the grid's own ruitjes on the card: answer digits, partial products, quotient digits, rest; a NEEDED carry / exchanged digit left blank is fout (owner rule 2026-10-08; columns that need nothing take blank or 0; `strictCarries: false` is for tests only); decimal leaves get `,`; aftrekken also gets the **Lenen** key (`extraKeys`: always present, always exchanges, no hint) |
| `procenten` | `PROCENTEN_KIOSK` | only nemen / welk-percent: one number |
| `verbanden` | `VERBANDEN_KIOSK` | one captioned field per asked representation (breuk / kommagetal / procent without `%`) |
| `afronden` | `AFRONDEN_KIOSK` | only simpel: the rounded number (a rooster is a table, not one answer) |
| `vergelijken` | `VERGELIJKEN_KIOSK` | getallen / representaties: `<` `=` `>` buttons; kiezen: the row's own numbers as buttons |
| `plaatswaarde` | `PLAATSWAARDE_KIOSK` | waarde: a number; plaats / omcirkelen: tap the place; tabel not served |
| `even-oneven` | `EVEN_ONEVEN_KIOSK` | only cirkels: even / oneven |
| `romeinse-cijfers` | `ROMEINSE_KIOSK` | herkennen: a number; schrijven: text (device keyboard, case-free) |
| `getalfunctie` | `GETALFUNCTIE_KIOSK` | aankruisen: tap the functie; schrijven: text |
| `mab-herkennen` · `mab-tekenen` | `MAB_KIOSK` · `MAB_TEKENEN_KIOSK` | the number · **build**: lay it from a D / H / T / E tray (at most 9 per place) |
| `schattend` | `SCHATTEND_KIOSK` | the estimate only (the rounded operands are scrap work) |
| `rekenvolgorde` | `REKENVOLGORDE_KIOSK` | the answer |
| `controleren` | `CONTROLEREN_KIOSK` | juist / fout |
| `vormleer-hoeken` · `-figuren` | `VORMLEER_KIOSK` | herkennen: tap the name (one triangle naming system at a time); hoek tekenen: **drag** the free been to the asked class (5° snap, right within the class range) |
| `temperatuur` | `TEMPERATUUR_KIOSK` | aflezen / verschil: a number (`−` key with negatives); kleuren: **drag** the kwik to the asked degree (1° a step) |
| `weegschaal` | `WEEGSCHAAL_KIOSK` | aflezen: grams, kg with a comma, or kg + g fields; kleuren: **drag** the needle to the asked weight (within half a dial step) |
| `lengte-meten` · `omtrek` | `LENGTE_KIOSK` · `OMTREK_KIOSK` | only 'gegeven' (labelled sides): juist / fout · the perimeter; not capable at the sidebar defaults |
| `oppervlakte` | `OPPERVLAKTE_KIOSK` | rooster count or berekende area (+ an omtrek field when asked) |
| `maateenheid` | `MAATEENHEID_KIOSK` | omcirkelen: tap a chip; schrijven: type the unit (not schatten + schrijven) |
| `herleidingen` | `HERLEIDINGEN_KIOSK` | only without writeUnits: one field per part (labelled by unit), or tap the unit when the unit is the blank |
| `geld-herkennen` · `geld-teruggeven` · `geld-rekenen` | `GELD_KIOSK` · `GELD_TERUGGEVEN_LAY_KIOSK` (wraps `GELD_TERUGGEVEN_KIOSK`) · `GELD_REKENEN_KIOSK` | the amount · euro + cent fields (or € x,xx in decimaal), or with a draw box (tekenen-schrijven) **build** the change from a tray · korting € + nieuwe prijs, or the intrest (only korting / intrest) |
| `geld-tekenen` · `geld-wissel` | `GELD_TEKENEN_KIOSK` · `GELD_WISSEL_KIOSK` | **build**: lay the amount from the ticked coins and bills (none above the top amount) · lay the same value in smaller money (the note itself is not in the tray; `prepare` draws one of the teacher's bills per exercise) |
| `getalpatronen` · `kettingsommen` | `PATROON_KIOSK` | **fill** the blanks on the card, only when every operator is printed |
| `getallenas` · `getallenrijen` | `GETALLENAS_KIOSK` | **fill** the blanks on the card (as / rij) |
| `deelbaarheid` | `VEELVOUDEN_KIOSK` | only the veelvouden layout: the multiples after the given ones |
| `ordenen` · `breuken-rangschikken` | `ORDENEN_KIOSK` | **tap** the numbers / breuken in order (groot→klein or klein→groot; 1, 2, 3 appear beside them) |
| `splitsen` | `SPLITSEN_KIOSK` | only basic / splitsboom / harten / positie-tabel: the partners, the tree's blank, or a digit per place |
| `breuken-bewerken` | `BREUK_BEWERK_KIOSK` | the asked FORM (gemengd / improper / reduced); gelijknamig = two fields |
| `breuken` | `BREUKEN_KIOSK` | only herkennen / hoeveelheid(-abstract): a breuk, a count, or the two counting questions |
| `klok-kloklezen` | `KLOK_KIOSK` | uur + min (analoog lezen / omzetten, digitaal tekenen); 3:15 and 15:15 both count; analoog tekenen: **drag** the wijzer(s) the pupil would draw (`handChoice`), 5-minute steps unless nauwkeurig |
| `tijdsduur` | `TIJDSDUUR_KIOSK` | begin / einde as a time, duur as uur + min |

No descriptor (cannot be practised yet): `kalender`, `vormleer-punt-lijn`, the `layout-*` furniture.

---

## 8. Viewers & the solutions overlay

Each viewer reads its `block.<field>` array and renders A4-styled HTML. Multi-item
viewers lay their items out through
[FragmentableGrid](../../src/components/viewer/FragmentableGrid.tsx) (block stack of
`break-inside:avoid` rows) so exercises flow across page breaks when printing — see §9.

- **Global `showSolutions`** (store boolean, not per-block) is passed to every
  viewer. When true, answers render in **`#e11d48` (red, bold)**; when false they
  render as blanks / dotted lines / empty boxes. This colour is the convention
  across all viewers (some declare it as a local `SOL`/`SOL_COLOR` const).
- **[MathBlockRenderer.tsx](../../src/components/viewer/MathBlockRenderer.tsx)** — the
  standard equation renderer. `block.itemNumbering` prepends a fixed-width `1)` / `a)` label column
  (shared [itemNumbering.ts](../../src/components/viewer/itemNumbering.ts), also used by
  RekenvolgordeViewer). `block.layoutPreset`:
  - `inline-short` — 2-column grid, compact.
  - `inline-long` — 1-column, full width.
  - `stepped` — 1-column with `steppedLines` blank working lines under each.
- **[CijferViewer.tsx](../../src/components/viewer/CijferViewer.tsx)** — column
  arithmetic digit grid (carry row, estimation row, answer row).
- **[MabViewer.tsx](../../src/components/viewer/MabViewer.tsx)** +
  [MabBlocksSVG.tsx](../../src/components/viewer/MabBlocksSVG.tsx) — Dienes place-value
  blocks (units dots, tens bars, hundreds flats, thousands cubes). Styles:
  `symbolic` / `mab-bw` / `mab-color`. `herkennen` = read blocks → write number;
  `tekenen` = draw blocks for a given number (solution overlays blocks in red).
- **[ClockExerciseItem.tsx](../../src/components/viewer/ClockExerciseItem.tsx)** +
  [AnalogClockSVG.tsx](../../src/components/viewer/AnalogClockSVG.tsx) — analog/digital
  clock faces (hand-drawn SVG).
- **[FractionExerciseItem.tsx](../../src/components/viewer/FractionExerciseItem.tsx)** +
  [FractionShapeSVG.tsx](../../src/components/viewer/FractionShapeSVG.tsx) — shapes /
  amounts / line segments / polygons. App.tsx picks 1-col vs 2-col grid based on
  `subType` + `answerFormat`.
- **[SplitsenViewer.tsx](../../src/components/viewer/SplitsenViewer.tsx)** —
  decomposition pair boxes (layouts: basic / mathematic / verliefde-harten).
- **Geld viewers** — [GeldViewer](../../src/components/viewer/GeldViewer.tsx) (recognise
  coins/bills), [GeldTekenenViewer](../../src/components/viewer/GeldTekenenViewer.tsx)
  (draw an amount), [GeldWisselViewer](../../src/components/viewer/GeldWisselViewer.tsx)
  (exchange a bill), [GeldTeruggevenViewer](../../src/components/viewer/GeldTeruggevenViewer.tsx)
  (make change). Coins/bills are monochrome SVG (print-friendly).

**An exercise renders from its own data; settings only steer layout** (rule since 2026-09-13).
A viewer may read `block.constraints` for columns, spacing, scaffolds and answer style, but every
per-exercise structure (places, denominators, ticks, columns, units, mode) comes from the exercise
the generator wrote — `ex.field ?? c.field` where an old sheet predates the field. Between a settings
change and Genereer the sheet shows old exercises under new settings, and that must never throw
(`viewers.stale.test.tsx` sweeps every leaf × every option). Three families still draw the wrong
picture in that window (weegschaal range, cijferen decimals, klok mode — BUGS.md); a mode switch in
`FractionConfig` / `MabConfig` regenerates the block instead of clearing it.

**Writing space is one token** (since 2026-09-13, branch G). `--sheet-answer-h` in `theme.css` =
`calc(var(--sheet-size-math) * 1.0385)` = 18px at 13pt, overridden by `docSettings.answerSpace` on
`.print-area-shell` and by `constraints.answerSpace` on the block's `ScaledBlock` inner. Every
writing line is `calc(var(--sheet-answer-h) * f)` with `ANSWER_LINE_H` (1×, a blank) or
`ANSWER_ROW_H` (32/18, a stepped row / table row) from `BlockWidthContext` (`useSheetAnswerPx` for JS
maths); the 15–16px and 20–22px outliers were normalised to 1× in one reviewed commit (`font:compare`
report in the commit body). Boxes that own a slider (MAB, splitsen rowHeight, geld, weegschaal,
herleidingen tableCellH, cijferen gridCellSize, cm boxes) stay on their slider. `verticalSpacing`
is still the gap BETWEEN exercises. The estimate charges `(answerSpace − 18)` per row and a stepped
row as `answerSpace × 32/18` (`PackOptions.answerSpacePx`).

**Every viewer renders inside [BlockErrorBoundary](../../src/components/viewer/BlockErrorBoundary.tsx)**
(since 2026-09-13): the sheet's block dispatch in App, `SheetThumbnail` and `ExercisePreview` wrap only
the `Viewer`, so a crashing viewer keeps its title row, badge and number and shows a `.no-print` line
"Kon dit blok niet tekenen — klik Genereer" (thumbnail: a gap; preview: "Voorbeeld niet beschikbaar")
instead of blanking the whole sheet. `componentDidCatch` logs `[rekenraak] viewer crashed: <typeId>`.
`resetKey` is the block's exercise-array reference, so Genereer (which swaps that array) clears a
tripped boundary. The fallback is `minWidth: 0` + wrapping text so it never pins the intrinsic-width
probe (§9). `viewers.smoke.test.tsx` deliberately renders without it, so real errors still fail tests.

**SVG figures follow the Lettergrootte sliders** (since 2026-09-13; clock faces, weegschaal
dial, thermometer, vormleer drawings, MAB glyphs, fraction shapes, coins and bills). The
mechanism is the same everywhere: the px geometry stays as the `viewBox`, the element is
sized in `em` inside a box whose `font-size` is `--sheet-size-math`, with
`PX_PER_EM_AT_DEFAULT = 17.33` (13pt at 96dpi, declared per viewer) as the divisor so the
default slider reproduces the old pixels exactly. `<text>` inside such an SVG uses plain
viewBox-unit `fontSize`, never the token (it would scale twice). Column counts derive their
`itemMinPx` from `useSheetSizePx('math')` (BlockWidthContext.tsx: the token in px, read from
`docSettings`, reactive), and MAB / breuken cap a figure's font-size at what its column can
hold instead of clipping. Only real-world-scale drawings keep px: the meten rulers and the
vormleer 1 cm tekenen raster (a breuken figure asked for in cm keeps px via `physicalSize`).
Per-block adjustment stays Opmaak › Tekstgrootte (`bodyFontScale`, CSS zoom, SVG included).
Consequence: measured heights and the intrinsic-width clamp now move with `fontSizeMath`; at
16pt a default-count MAB / breuken / teruggeven block can outgrow a page and the banner fires.

---

**Centring in a single column.** A getallenkennis block whose exercises sit alone in a ½ (or ¼)
column centres them in it — `centerWhenSingle(cols)` in
[solutionStyle.ts](../../src/components/viewer/solutionStyle.ts) returns `'center'` for
`cols === 1` and feeds `FragmentableGrid`'s `justifyItems` (ordenen, breuken-rangschikken,
procenten, romeinse, deelbaarheid tabel/kleurraster; kalender, maateenheid, vergelijken and
getalfunctie still carry the older inline form). Bewerkingen stay left-aligned: the writing
space after `=` is the point. Rows whose items must line up across exercises (vergelijken
kiezen, splitsen plaatswaarden, plaats omcirkelen) use one block-wide column width derived
from the widest printed value, so place values sit under place values.

**Scaffold context — `useShowScaffold()`** ([BlockWidthContext.tsx](../../src/components/viewer/BlockWidthContext.tsx),
since the Oefenmodus, §15). A boolean context, default `true` (the sheet, thumbnails, previews:
unchanged DOM); the kiosk card wraps its viewer in `<ScaffoldProvider value={false}>` because it
asks only the final answer and nobody can write in the card. Readers today: MathBlockRenderer
(the met-rest "( ___ )" estimate, the compenseren tussenstap), CijferViewer (no grid / schatting /
q-r box / omgekeerde controle: the sum alone), DeelbaarheidViewer (veelvouden: every term, no
"(enz.)"), GetalFunctieViewer (the schrijven sentence instead of the tick table), VormleerViewer
(no woordbank; the kiosk's buttons replace it). **Rule:** a viewer changes what it draws for the
kiosk ONLY through such a context, never by sniffing a route, a store flag or the typeId; with
the default value the sheet must stay byte-identical, which the visual gate proves.

**Interaction context: `useViewerInteraction()`** ([ViewerInteractionContext.tsx](../../src/components/viewer/ViewerInteractionContext.tsx),
Oefenmodus Phase C, §15). Default `null` (sheet, thumbnails, previews); only the kiosk card provides it:
`{ kind, state: { selected, cells, order, build, marks?, drag? }, set, activeCell?, focusCell?, typeCell? }` with `kind` one of
`tap` (pick one) · `tap-multi` (toggle any number) · `fill-cells` (type into the viewer's own blanks) ·
`order` (tap in sequence; tapping an ordered part removes it and every later one) · `build` (pieces laid from the
kiosk tray; `state.build` = `{ key, count }[]`, helpers `built` / `builtCount`) · `drag` (move a handle on an SVG
figure; `state.drag` = handle key → value). `state.marks` is a fill-cells side channel (part key → mark) that a
descriptor action key writes (cijferen Lenen) and the answer never reads. A viewer marks its parts
through the helpers and adds **nothing** else:

- `interactionProps(ctx, key, part = 'tap' | 'order')` spreads `role="button"`, `tabIndex`, `aria-pressed`,
  `data-kiosk-key` / `-selected` / `-order` and the click / Enter / Space handlers; a part asked for in a
  context of another kind stays plain (`'tap'` parts serve tap and tap-multi, `'order'` parts serve order).
- `cellProps(ctx, key)` and `<KioskCell cellKey variant?>` ([KioskCell.tsx](../../src/components/viewer/KioskCell.tsx))
  draw an `<input data-kiosk-cell>` bound to `cells[key]` (`inputMode="none"`: the kiosk keypad is the touch input);
  without a fill-cells context `KioskCell` renders its `children` (the sheet's own blank) untouched.
- `borrowedProps(ctx, key)` spreads `data-kiosk-borrowed` on a printed digit whose column the Lenen key exchanged
  (`marks[key]` set); kiosk.css strikes it. CijferViewer reads it in its kiosk branch only.
- **drag** ([kioskDrag.ts](../../src/components/viewer/kioskDrag.ts)): `dragSurfaceProps(ctx, surface)` spreads the
  pointer handlers and `data-kiosk-drag` on the SVG (`surface` = viewBox size + `pick(point, drag)` + `move(key, point, drag)`;
  pointer capture, and one gesture per surface so a fast move continues from what the gesture wrote, not stale state);
  `dragHandleProps(ctx, key, spec)` makes each handle a focusable `role="slider"` (`data-kiosk-handle`, aria value text,
  arrow keys step ±1) as the keyboard alternative. `clockAngle` / `snap` / `clamp` are the shared maths. `touch-action: none`
  lives in kiosk.css on `[data-kiosk-drag]`, i.e. under the context only. [AnalogClockSVG](../../src/components/viewer/AnalogClockSVG.tsx)
  takes optional kiosk props (`hourAngleDeg`, `surfaceProps`, `children` = the handles); the sheet never passes them.
- **build** has no per-part helper: the kiosk's `Tray` lays pieces into `state.build` and the viewer only **draws the
  built state** (coins, MAB blocks) under the context; without it the viewer draws its sheet picture (blank draw box).
  The same holds for drag: the viewer draws the dragged state (hands, kwik, needle, been) only under the context.

**Rule:** no attribute, handler or element without the context. With `ctx === null` every helper returns `{}`
and the viewer's DOM is byte-identical to before; `viewers.interaction.test.tsx` /
`viewers.interaction.grids.test.tsx` assert exactly that (markup with no provider equals markup before the
change, a null context equals none) and the visual gate proves the sheet unchanged. Twin viewers (a sheet and
a kiosk layout) are marked `SYNC` where they must agree (cijfer grid keys, `KIOSK_MAX_NUMBERS`).

## 9. Print / PDF export — the page model

**There is no react-pdf.** (Earlier versions had a `WorksheetPDF.tsx`; it was removed.)
Export = the browser print dialog → Save as PDF. The on-screen A4 preview **is** what
prints. Tuned for Chrome/Edge (Blink) — that's where the teachers print.

**Pages are real** (since 2026-09-09). The app used to render one continuous sheet, let
the browser decide where it broke, and fake the boundaries on screen with dashed lines
every 1044px — so the page count was never knowable in advance and the Overzicht markers
only approximated it. Now a pure packer decides the breaks up front, each page renders its
own header and footer, and each ends with `break-after: page`. **Screen page count ===
PDF page count.**

### Budget first, then measure

[blockLayout.ts](../../src/services/layout/blockLayout.ts) — the page grid and the per-type cost data.

- A page is `COL_UNITS` (**4**: vol / ½ / ¼) wide by `ROW_BUDGET` tall. The grid was 6 units
  (vol / ½ / ⅓) until 2026-09-12; a third of an A4 was too narrow to read and 31 of 59 types
  were pinned to full width anyway. Tiers mapped **6→4, 3→2, 2→2** — never narrower.
- `ROW_BUDGET` and `estimateHeightUnits` are the **first-paint fallback**: once the sheet has
  rendered, [useMeasuredHeights](../../src/hooks/useMeasuredHeights.ts) feeds the packer the
  real cell heights and the real page-body budget, and those win. Estimating alone ended
  pages early (blank tails) or overran them; measuring alone cannot run before first paint.
- `ROW_BUDGET` is deliberately **2 units under** what the body holds: under-estimating puts
  content across the footer, over-estimating only wastes space. The body is
  `1123 − 96 (8mm head + 54px header + 12px content gap) − 71 (footer)` = **956px** →
  `ROW_BUDGET = floor(956/24) − 2 = 37`, `PAGE_BODY_PX = 916`. `.page-sheet-body` has no
  vertical padding, so nothing else is subtracted.
- `rowUnits` per type is **measured**, not guessed: every sidebar leaf rendered at two
  exercise counts; rows are **counted** off the rendered grid (one `.print-row` per
  FragmentableGrid row) and `rowUnits = (h_default − h_single)/(rows − 1)/24` follows. (The
  older height-ratio derivation was ambiguous near a block's fixed chrome and had three
  `cols={1}` viewers down as 2-up.)
- **The measurement contract:** a block's packed height is the height of the **block**,
  never of its grid cell. A grid item stretches to the tallest item in its row, so a cell's
  `offsetHeight` is its *row's* height — placement-dependent, which is exactly what the
  convergence argument forbids (a short block beside a tall one was charged the tall one's
  height and "did not fit"). `PageSheet.ownHeight()` measures `.print-block` + its margins;
  the 16px padding / 1px border / 4px margin inside all print, so measure = paper.
- The repack **breaker counts passes, not cells** — bumps from one measure pass are
  coalesced with a microtask. Counting cells made it a block-count limit: a ten-block sheet
  tripped it on first paint and every block measured after the trip kept its estimate.
  The packer's fit test carries `FIT_EPSILON` (half a printed pixel), so an exactly-full page
  is not decided by binary rounding.
- `minWidth` per type is **measured with every clamp disabled** — measuring with tiers
  active is circular, since the tier decides the width that gets measured. The shipped tier
  is `max(measured, editorial)`: measurement rules out the impossible, judgement rules out
  the illegible (viewers read an injected width, so they *shrink* rather than overflow — a
  number line at a third fits and is unreadable).
- `minWidthUnits(block)` is a **function of the block's settings**, not a constant:
  hoofdrekenen fits a narrow cell at "tot 100" and needs full width at a million.
- `estimateHeightUnits(block, width)` charges the whitespace settings too, so more air per
  exercise really does mean fewer per page.

### The packer

[pagePacker.ts](../../src/services/layout/pagePacker.ts) — pure: blocks in, pages out. It
never touches the DOM itself; App injects measurements as callbacks (`heightPxOf`,
`pageBudgetPx`), so it stays unit-testable.

**Skyline packing** (since 2026-09-13, branch I): each page keeps `fill[0..3]`, the bottom px of
every column unit; `skylineSlot(fill, w, gap)` returns the lowest y over x ∈ 0..4−w (tie → leftmost),
so a ½ block slides under a shorter ½ neighbour instead of opening a new row (the owner's case: ten
met-rest rows beside two cijferen grids left a hole nothing filled). A block fits when `y + h ≤
budget`, else the page flushes. Everything is costed in px (0.5px epsilon); output is `PackedPage
{ blocks: PlacedBlock[], used, fill, budgetPx }` with `PlacedBlock { x, y, w, h }` (x/w column
units, y/h px). `mode: 'rijen'` runs the old algorithm verbatim (`packRows`) — the regression guard in
`pagePacker.test.ts`. Reading order stays array order and y is monotone per column, so numbering
never reads upward — but a short block can land bottom-left while its predecessor sits top-right.
Placement is a pure function of the measured heights, so the convergence argument below is unchanged.
The old row rule, kept for `rijen`: fill a row left to right; new row when the width runs out; new page when the page budget
does; `pageBreakBefore` forces a page; a block taller than page 0 (the shortest — it carries
the header) is marked `spans` and owns its page. It does **not** flow on paper: `.page-sheet`
is `height: 297mm; overflow: hidden` in print, so screen and PDF clip it the same way; the
banner says so and carries two buttons — "Verklein dit blok" (SheetPages's `fitBlockToPage`: sets
`constraints.fitToPage`, selects the block, then `setInspectorTab('weergave')` because
selecting resets the tab) and "Splitsen" (the same split popover as the Scissors control);
PageSheet tracks the oversize block's id (`oversizeBlockId`) for that, via `onFitBlock` /
`onSplitBlock`. `constraints.fitToPage` ("Verklein om op één pagina te passen") lets
[ScaledBlock](../../src/components/viewer/ScaledBlock.tsx) back its zoom off down to 0.7
(`FIT_FLOOR`, pure helper in `scaledBlockFit.ts`) until the cell fits `PAGE_BODY_PX`.
`PackedBlock.promoted` marks a block the clamp had to widen; the Inspector says so under the
width picker. `ignoreMinWidth` disables the clamp for the width-matrix harness.

**Horizontal overflow has a banner too** (since 2026-09-13). A cell whose measured intrinsic width
(judged through `WIDTH_FIT_FLOOR` when `fitToWidth` is on, like `minWidthUnits`) exceeds its
`cellWidthPx` by more than 2px — and that the packer could not promote further (`widthUnits === 4`
or `promoted`) — gets a `.no-print .cell-hoverflow-warn` strip on the cell: "Dit blok is N px te
breed voor zijn kolom" with "Verklein om te passen" (SheetPages's `fitBlockToWidth`: sets
`constraints.fitToWidth`, selects, opens Opmaak) and, below the widest tier, "Verbreed" (`widenBlock`,
one tier up). It sits outside `[data-scaled-inner]`, so it plays no part in the width probe.

**Measure → pack convergence**: a cell's height depends only on (block, width, spacing,
docSettings) and never on where it was placed, and widths are settings-derived rather than
measurement-derived — so one remeasure reaches a fixed point. Writes under 2px are dropped;
a dev-only counter warns at more than 5 repacks in a second.

**A block never shrinks on its own** (since 2026-09-13). ScaledBlock renders at the requested
zoom; content that does not fit its column is *promoted* to a wider tier by the measured clamp
(the Inspector says "Verbreed naar ½ …"), never zoomed down — two blocks with the same
settings must print at the same size. The teacher can opt in per block: Opmaak › "Verklein om
in de kolom te passen" (`constraints.fitToWidth`) lets ScaledBlock back the zoom off to
`WIDTH_FIT_FLOOR` 0.85 and shows a `.no-print` badge "verkleind tot N %"; `minWidthUnits`
then judges the tier against `px × 0.85`, so it buys one 15% step and still promotes what
would clip beyond it. `fitToPage` (height) stays the other explicit back-off.

Each page cell is placed **absolutely** (`left/top/width` from the packer) inside
`.page-sheet-canvas` (`position:relative; height:100%` inside `.page-sheet-body`, because an absolute
child resolves against the padding box). The body is no longer a CSS grid; the column divider keys on
`x > 0` per block for its own height; the tail hint takes `tailPx = budget − skylineSlot(...)` from
the packer; the page-overflow banner compares the deepest cell bottom with the body rect.

### Rendering one page

[PageSheet.tsx](../../src/components/layout/PageSheet.tsx) — one page: its own header, a
`COL_UNITS`-column grid body, its own footer, `break-after: page`. Each block sits in a cell
spanning its `widthUnits`.

- [BlockWidthContext](../../src/components/viewer/BlockWidthContext.tsx) carries the
  **printable width of the cell**; `ScaledBlock` provides it and App computes it from the
  span. **SYNC:** any viewer that picks a column count must read `useBlockWidth()`, never a
  constant — the nine that hardcoded `A4_CONTENT_PX = 625` were the blocker for columns.
- The page body clips, and a page that overflows its budget outlines itself and says by how
  much. Print hides overflow, so a silent clip would otherwise only surface on paper. The
  same pass reports `onBodyMeasure` / `onCellMeasure` back to `useMeasuredHeights`, so after
  the repack the banner only fires for a single block taller than one page.
- **SYNC:** the screen paddings in `index.css` are the print paddings at 96dpi (**8mm** head
  since 2026-09-13 — 16 → 12 → 8, after trimming the header region's hidden-field slack —
  4mm+8mm foot, 14mm sides) and `.page-sheet` has a fixed `height`, not a `min-height`. When
  they differed, content that fitted on screen ran under the footer on paper.
- Real **page numbers** are possible for the first time (the browser cannot count pages from
  HTML/CSS; the packer knows index and total).

### Measuring the width tiers

`minWidth` / `rowUnits` / `perRowFull` in [blockLayout.ts](../../src/services/layout/blockLayout.ts)
are not guesses: [scripts/width-matrix.mjs](../../scripts/width-matrix.mjs) drives the
running dev server through `window.__rekenraak` (a DEV-only hook in
[main.tsx](../../src/main.tsx): `typeIds`, `leaves`, `seed`, `measured`, `addBlockFromType`,
`updateBlockSettings`, `clearBlocks`, `setIgnoreMinWidth`, `getState`) and renders **every registry type at widths
4 / 2 / 1, at its default count and at a single exercise** — 354 cells. For each it reads
the content's overflow ratio (`scrollWidth / clientWidth` of the ScaledBlock inner div),
the applied zoom and the cell's `offsetHeight`, writes `scripts/width-matrix.result.json`
and screenshots every cell. A width is allowed when **overflow ≤ 1.005 at zoom 1** (until 2026-09-13 the rule accepted
zoom ≥ 0.85, i.e. promised a silent 15% shrink that the owner ruled out);
the screenshots then veto what passes numerically but is illegible (the veto list, with a
reason each, lives in the `LAYOUT` header comment). The harness needs the store's UI-only
`debugIgnoreMinWidth` flag — measuring a tier with the tier clamp on would only measure the
clamp — which it sets through `setIgnoreMinWidth` and the packer reads as
`PackOptions.ignoreMinWidth`. Cell heights are `sheetZoom`-invariant to ~1px (verified by
re-running at a 1000px viewport). The matrix is **seeded** (`--seed`, default 1234, recorded
in the result JSON) so runs are comparable, labels its probe block "Oefening" rather than the
typeId (a long unbreakable title once read as ¼-overflow), and records `rowCount`.

### Measuring the height chain

[scripts/height-audit.mjs](../../scripts/height-audit.mjs) is the vertical twin: ten mixed
blocks, seed 1234, and per cell the height the packer used (`window.__rekenraak.measured()`),
the block's own height, its grid cell's rect and the printable content's rect, plus the page
budget against the print body. It settles the measure→pack chain, waits out any breaker
cooldown and forces one more measure pass — the stretched-cell bug hid behind the frozen
state without it. TESTING.md lists the verdict codes (a/a2/b/c/d/e).

### Reordering on the sheet

[useSheetDnd.ts](../../src/hooks/useSheetDnd.ts) — **pointer events only; no native
[useShedStages.ts         # top-bar label shedding off real measured overflow (4 stages, hysteresis), not viewport width (§2)
HTML5 drag-and-drop anywhere in the app.** A browser extension that hooks `dragstart` (the
"Claude in Chrome" extension did) froze the tab for the whole drag, and teachers' browsers
are not ours to audit. The visible affordance is a **handle** (`.sheet-drag-handle`, the
`DotsSixVertical` chip, first in `.block-controls`), but the whole block drags — teachers
grab a block by its exercises. `blockProps` starts on `pointerdown` (left button, not on
`input, textarea, button, [contenteditable], a, select, [role="button"]`) plus **6px of
movement** (0 from the handle), so a press that does not travel stays a click and the inline
instruction editor and click-to-edit fields keep working. Then: `setPointerCapture` on the
block, `touch-action: none` for the drag's duration (always on the handle, so touch works),
an own `.sheet-drag-ghost` (chip + cloned title) that follows the pointer, and the target
found with `document.elementFromPoint(...).closest('[data-block-id]')` — the drop cell needs
**no listeners**, only its `data-block-id`. Which **third** was hit decides what happens —
top = insert the dragged block before this one ("Hierboven invoegen"), middle = swap the two
("Wisselen"), bottom = insert it right after ("Hieronder invoegen"). Thirds rather than
sides, because a full-width block has no meaningful left/right, and all three are labelled
on screen ([SheetDropZones](../../src/components/layout/SheetDropZones.tsx), `.no-print`,
`pointer-events: none`; a container query hides the label text but keeps the icon when the
block is shorter than ~66px). For the whole drag **every** candidate block is framed (accent
dashed outline — an outline, not a border, so the thirds the hook measures stay the thirds)
and its thirds banded in `--accent-soft`; the block under the pointer lights its live third
and dims the other two (`.sheet-dropzones.has-on`), and a `.sheet-drag-hint` strip (portalled
to `<body>`, fixed above `.print-scroll`) says what the three thirds do. Teachers could not
tell where a drop was allowed from a 1px separator line. The sheet auto-scrolls while the pointer sits within 40px of
`.print-scroll`'s top or bottom edge; Escape and `pointercancel` cancel; `pointerup` drops
through `reorderBlocks(from, to > from ? to - 1 : to)` (before), `reorderBlocks(from,
from < to ? to : to + 1)` (after) or `swapBlocks`, reading the store via
`getState()` at drop time so a long drag cannot go stale, then selects and scrolls to the
moved block. The Overzicht outline ([OverzichtPanel](../../src/components/layout/OverzichtPanel.tsx))
uses the same pointer approach and the same three zones (thirds of the row) with a 5px
threshold and `[data-ov-index]` rows; the old "drop on the last row appends" special case
falls out of the after-zone formula. A row's drop-zone signal is outline/box-shadow only,
never `border*`, so the 3px domain rail on its left edge stays visible; rows are
`user-select: none` because the first pointer move of a drag is the one that starts a text
selection. Playwright
drives all of it with plain `mouse.move/down/up` (see TESTING.md).

**The width clamp is measured too.** PageSheet probes each cell's `min-content` width
(ScaledBlock's inner carries `data-scaled-inner` / `data-scale`; the inner is `width: 100%`,
so a plain `scrollWidth` only echoes the cell — the probe swaps the inline width to
`min-content`, reads, restores, all inside the layout effect so nothing paints) and reports it
through `onCellMeasure(blockId, width, heightPx, intrinsicWidthPx, reflows)`; `useMeasuredHeights`
keeps it per `blockId:width` and **drops every entry when the block's content changes** (a block is
measured before Genereer too — the 67px empty-state line once pinned a vergelijken block to ¼
forever). `packPages` takes the clamp as an injected `minWidthOf` closure so it stays pure; App
fills it with `minWidthUnits(block, intrinsicEntries(id))` — **every** entry of the block, not
the widest (since 2026-09-13 round 3: reading only the widest entry kept the full-width 2-up
measurement in charge after the teacher picked ½, so the ¼ never opened). Each entry is one of
two facts: content that **overflowed** its cell is a *demand* (the tier holding that px);
content that **fit** while `reflows` — the probe saw a FragmentableGrid with `data-cols > 1`
or a viewer's `data-shrinks` (MAB tekenen's 0.75 figure step, hoofdrekenen's tight tier
below 200px), falling back to the `perRow` table — *allows* **one** tier below the width it was
taken at; content that fit 1-up allows its own tier. The verdict has **two readers** (since
2026-09-13 round 4, owner decision "optimistic picker"): `minWidthUnits` = max(demand, allowance,
editorial floor) for the packer's `promoted` clamp — the next tier only opens after a real
measurement there, so it cannot oscillate; `pickerMinWidthUnits` = max(demand, editorial floor)
for the Inspector's Breedte control, so a tier is only greyed out by a measured overflow or an
editorial floor and ¼ is reachable straight from 1/1 (the packer re-measures there and clamps
back with the hint if it truly does not fit). `intrinsicOf()` (the widest entry) is what the
overflow banner and the Inspector tooltip quote in px. A viewer whose column count comes from
`useBlockWidth()` MUST pass `shrinks` to `FragmentableGrid` (even-oneven rooster, 2026-09-13):
otherwise its full-width probe reads as a hard 1-up demand and the packer promotes the block.
Editorial vetoes override a measurement: `VETO_MIN` (typeId → floor; geld-tekenen and geld-wissel ½ since round 4) for type-shaped cases and
`SETTINGS_FLOOR` (typeId → `(block) => WidthUnits`, since 2026-09-13) for settings-shaped ones —
splitsen positietabel ½ only up to 100, splitsbenen ¼ up to 100, deelbaarheidstabel ½ up to three
divisors, breuken hoeveelheid ≥ ½, getallenas/-rijen/getalfunctie full only, patronen ≥ ½, ordenen and
breuken-rangschikken ½ only when the whole row fits one line (`ordenenRowPx`), else full — the viewer's
`ordCols` reads the same helper so floor and render agree.
`editorialFloor(block)` consults the rule table first. A number line fits a
quarter and is unreadable there. Without a measurement (first paint, tests) the per-type
table runs as `fallbackMinWidth`. The Inspector width picker subscribes to the intrinsic map
(`useIntrinsicWidth`) and states the reason in px: "Te smal: de inhoud is 397px breed, deze
kolom biedt 151px."

**Block controls rail.** The per-block buttons (`BlockControlsRail`) are portalled to `<body>`
like InfoTip and the split popover, `position: fixed` from the block's rect (re-placed on
scroll of `.print-scroll`, window resize and a ResizeObserver on the block). Inside
`.print-block` they were clipped by the page body's `overflow: hidden` near the page bottom;
outside it they also play no part in measurement or packing. Compact: 26px buttons, 14px
icons, groups [handle, lock, duplicate, split] · [page-break, up, down] · [delete]. The rail
carries its own surface (`--bg-surface`, separator border, `--shadow-2`, `appStyles.blockControls`)
because at ½/¼ it lands on top of the neighbouring block's ink.

**Splitting instead of reordering.** A block that does not fit the rest of a page still moves
whole, so `PageSheet` measures the blank tail it leaves and, past three row units (72px),
offers "Het volgende blok past hier niet meer — splitsen" on an explicit grid row under the
last cell. That, and the `Scissors` control on any block with two or more exercises, open one
popover ("Splitsen na oefening N") which calls `splitBlock` (§3). N defaults to the largest cut
whose leading `.print-row` heights still fit the available space, measured off the rendered
cell with `getBoundingClientRect` divided by the sheet zoom — the packer is not involved and
nothing is split automatically. The hint carries no `data-block-id`, so it is invisible to
both `onCellMeasure` and the tail measurement it depends on.

### Print mechanics

- **[usePrint.ts](../../src/hooks/usePrint.ts)** — `usePrint(beforeFirstPrint?)`: the first
  print per browser (`rekenraak_print_hint_seen_v1` absent) hands a continuation to App, which
  shows [PrintHintModal.tsx](../../src/components/layout/PrintHintModal.tsx) ("Zet Marges op
  Geen") and prints on "Begrepen"; the button and the intercepted Ctrl+P both pass that gate.
  `handlePrint(withSolutions)`: deselects the
  active block, optionally flips `showSolutions`, injects a dynamic `<style>` that blanks the
  browser's `@page` header/footer margin boxes, then `window.print()` after **two** animation
  frames — deselecting changes a block's height, so the dialog must not open before the
  remeasure-and-repack has landed. Restores prior state on `afterprint`. A mount-once
  effect intercepts Ctrl/Cmd+P and routes it through `handlePrint`, and `beforeprint` /
  `afterprint` listeners are the net for menu or extension prints: they can only clean the DOM
  (deselect via `flushSync` — React batching would land after Chrome's snapshot), an
  `appInitiated` ref keeps the two paths from fighting.
- **`@page { margin: 0 }`** — on purpose. The dialog's "Margins: None/Minimum" silently
  overrides `@page` margins, so we don't rely on them: every visible margin comes from the
  page's own padding instead. Robust to any dialog setting.
- **Safari and `vw`** — `theme.css` pins `html/body/#root` to `width: 100vw` for the
  on-screen shell. WebKit resolves `vw` in print against the browser *window*, not the paper
  (Chrome/Firefox use the page box), so the printed document was ~2× wider than the 794px
  sheet and Safari shrank the whole page to fit. The print block resets those widths to
  `auto` (v1.0.2, 2026-09-15); never reintroduce viewport units on anything that prints.
  Safari also ignores `@page { size }` (paper comes from the printer preset) and the
  `break-*` rules carry their legacy `page-break-*` aliases for older WebKit.
- **Header layout** — `docSettings.titlePosition` left/right put the title beside the field
  row; **center always stacks**: the wrapping field row (score box at its end) on top, the
  title on its own line beneath, the way a real worksheet reads. The former inline-flank
  layout (half the fields on each side of the title, chosen by a width estimate) is gone.
- **Repeating header toggle** — `header.repeatHeader`: when off, only page 1 draws the
  Naam/Klas/Nr/Datum strip; when on, every page does (each page owns its header, so this is
  now a plain conditional, not a `<thead>` trick).
- **[FragmentableGrid](../../src/components/viewer/FragmentableGrid.tsx)** — a single CSS
  `grid`/`flex` container does **not** fragment across pages in Chrome (a too-tall block
  jumps whole). This shared component lays items out as a **block stack of per-row grids**,
  each row `break-inside: avoid` (`.print-row`), so exercises flow across page breaks.
- **Print CSS** lives in [index.css](../../src/index.css) (`@page` + `@media print`):
  - `.no-print` — hidden (sidebar, topbar, modals, block controls, overflow warnings, and the
    Bordmodus overlay: `WhiteboardView` is `.no-print`, so a print with the board open prints
    the sheet underneath; the board has no print path, §14).
  - `.print-root` / `.print-main` — collapse the 3-panel flex shell to block flow.
  - `.page-sheet` — `break-after: page`.
  - `.print-block` — block; `.page-break-before` forces a fresh page (per-block toggle).
  - `.print-opdracht` — `break-after/inside: avoid` (opdracht line never orphaned).
  - `.print-exercise` / `.print-row` — `break-inside: avoid` (never split an item/row).
  - `.page-sheet-foot .print-tfoot-inner` — the footer's print padding (2mm top) is the one print
    declaration WITHOUT `!important` (since 2026-09-14): the kader box (`8px 12px`, SheetFooter.tsx) and a
    teacher's `footerCustom.padX/padY` are inline styles and must reach paper; the `!important` that
    was there put the footer text hard against the kader border in the PDF.

### Sheet furniture — `layout-*`

Five non-exercise blocks (sectie, schrijflijnen, raster, kader, lege pagina) with no
generator: everything comes from constraints. They take a normal registry row so the packer,
the width grid and printing need no special case. They are **not opdrachten** — no title row,
and the opdracht numbering skips them.

Schrijflijnen, raster and kader are ¼-capable **by content**: they render `width: 100%`
furniture, so the min-content probe reports nothing and the LAYOUT fallback (`minWidth: 1`)
rules. A furniture viewer must never set a bare computed px width — the raster did
(`cols * cell`) until 2026-09-13 and pinned its own tier to full width; it is `width: 100%`
+ `maxWidth` now, squares still whole. Sectie and lege pagina stay full width by veto.

The **onthoudkader body** is a plain string with light markup, rendered by the pure
[kaderMarkup.tsx](../../src/services/layout/kaderMarkup.tsx): `**vet**`, `*cursief*`,
`__onderstreept__` (nestable, an unmatched marker stays literal) and runs of lines starting
`1. ` / `- ` / `•  ` become `<ol>` / `<ul>`; other lines keep their line breaks. `LayoutConfig`
offers a B / I / U / 1. / • toolbar that wraps the textarea selection. No format bump: an
old body without markers renders exactly as before.

### Shell

Panels no longer collapse to a hover flyout (teachers on 14" laptops got stuck in it, pin and
all). Both are always visible and the **sheet zooms to fit** instead, floored at 55%. The
TopBar is three zones matching the columns beneath it, and the two panel tab strips render
there rather than inside their panels.

**SYNC rule:** any visual change to a viewer must look right when printed — there's no
separate PDF file to mirror, but check the print CSS classes above still apply, and that
multi-item viewers go through `FragmentableGrid`.

---

## 10. Persistence & sharing — [persistence.ts](../../src/services/persistence.ts)

All localStorage; nothing leaves the browser except share links the user copies.

- **v3 → v4 migration (2026-10-08, base decimals):** `DEFAULT_BASE.baseDecimalPlaces` went 2 → 0,
  so below v4 a base holding exactly 2 with a non-decimal numberType and no Leerjaar 4-6 is reset to
  0 (that 2 can only be the old default or the never-undone grade). A decimal base, a Leerjaar 4-6
  sheet, any 1 or 3, and every block are kept. A v4 file opened by a v3 app (today's main) is refused
  ("nieuwere versie") — release-note item when rc ships.
- **Format gate:** `WORKSHEET_FORMAT_VERSION = 4`. `parseWorksheetFile` validates
  version + required fields (blocks/header/footer/docSettings) + the optional
  `curriculum` shape, and rejects future/invalid files. v2 added optional
  `baseSettings` + `curriculum` (absent → defaults, so v1 files still load).
- **v2 → v3 migration:** the page grid went 6 units → 4, and the same NUMBER means a
  different width on each scale, so `migrateWorksheetFile(file)` is **version-gated, never
  value-based**: below v3 it maps `widthUnits` 6→4, 3→2, 2→2 (never narrower — overflow is
  the dangerous direction) and stamps version 3. Pure and idempotent; called from
  `parseWorksheetFile` (file + share), `loadAutosave` and `loadPresets`. `loadWorksheet` in
  the store keeps a defensive normaliser for library callers that hand over a payload which
  never passed through a versioned parse.
- **Full vs template mode** (`WorksheetFileMode`): `full` = complete snapshot with
  exercises; `template` = settings only (every `REGISTRY[*].exerciseField` blanked by
  `stripBlock`, derived from the registry so a new type is covered automatically), so the
  recipient configures-then-Genereer to populate.
- **`CurriculumLock`** (`{ locked, allowedTypes: [{typeId, label, lockedConstraints}] }`)
  rides in the payload for locked curriculum share links (§13).
- **Autosave** — single slot `rekenraak_autosave_v1`; `saveAutosave` (returns `false` on a refused write → `saveState: 'error'`) /
  `loadAutosave` / `clearAutosave`. `hooks/useBootLoad.ts` offers to restore on boot if the
  current sheet is empty.
- **Presets** — named library `rekenraak_presets_v1`, `MAX_PRESETS = 20`. CRUD via
  `loadPresets` / `savePreset` / `deletePreset` / `renamePreset`. Managed in
  `PresetModal.tsx` (removed; replaced by [library/](../../src/components/library/)).
- **Share link** — `encodeShareLink` → JSON → **lz-string**
  `compressToEncodedURIComponent` → `#share=…` in the URL hash (never sent to a
  server). `MAX_SHARE_BYTES = 30000` (worksheet JSON compresses ~8×, so this covers
  ~100+ blocks); returns `null` if too big. `decodeShareHash` decompresses + parses;
  `hooks/useBootLoad.ts` consumes it on boot (a shared link wins over autosave) with a confirm whose
  wording differs for full / template / locked-curriculum links. `opts.curriculum`
  embeds a `CurriculumLock` (used by the curriculum builder, §13).
- **File export/import** — `exportWorksheet` (JSON blob,
  `werkbundel-<slug>-<YYYYMMDD>.json`) / `parseWorksheetFile`.
- **Oefensessies library** (teacher device) — `rekenraak_oefen_sessies_v1`: an array of
  `{ id, name, savedAt, sessie: OefenSessie }`, `MAX_OEFEN_SESSIES = 50` (oldest dropped);
  `loadOefenSessies` / `saveOefenSessie` (same `sessie.id` replaces: that is Bewerken → Opslaan;
  returns `null` on a refused write) / `renameOefenSessie` / `deleteOefenSessie`. Listed under
  Mijn bladen › Oefensessies.
- **The oefenlink is NOT a worksheet share.** `#oefen=…` on `/oefenen.html` (not `#share=` on
  the app) carries only settings, never exercises, in its own codec (positional wire + DEFLATE +
  base32, [session.ts](../../src/services/oefenen/session.ts), §15); `useBootLoad` never reads
  it and opening one never touches the autosave or the presets. The pupil's results live on the
  pupil's device under `rekenraak_oefen_<sessionId>` (§15), outside this file's keys.
- **Release banner + "Wat is er nieuw"** — [releaseNotes.ts](../../src/config/releaseNotes.ts) is the
  per-version list, newest first (`{ version, date, summary, items: [{ kind: nieuw | gewijzigd |
  opgelost, text, example?: { leafId, constraints, grade, before, after } }] }`); `version.ts`
  derives `RELEASE_VERSION` / `RELEASE_SUMMARY` from entry 0. The banner ("Nieuw: … Meer info",
  SheetBanners) shows until the user dismisses that version (`rekenraak_release_seen_v1`); clicking
  it opens [ReleaseNotesModal.tsx](../../src/components/layout/ReleaseNotesModal.tsx) (items grouped,
  an exercise item renders a live `ExercisePreview` of its leaf via `seedLeafConstraints` plus an
  "Eerst → Nu" line). HelpModal links to it; `useOnboarding` holds the open state. **Every release
  prepends an entry** (short, teacher language, an example per exercise change).
- **First-run tutorial** — [TourOverlay.tsx](../../src/components/onboarding/TourOverlay.tsx),
  an interactive spotlight tour (add → settings → generate → print → WIP/feedback finale).
  On a first visit [WelcomeModal.tsx](../../src/components/onboarding/WelcomeModal.tsx) comes
  first (since round 4): tour / 1-min demo video (`public/rekenraak-demo.mp4`) / skip; any of the
  three sets `localStorage` `rekenraak_tour_seen_v1`, so returning users never see it. Replayable
  from HelpModal's "Rondleiding" button; HelpModal's "Bekijk de video" reuses WelcomeModal in `mode="video"`. Targets elements by `data-tour="…"` anchors (sidebar-nav, inspector,
  generate-block, print, feedback); advances on real store changes (block added / exercises
  generated). Replaced the old AlphaPopup (its WIP warning is now the final step).

---

## 11. File map

Every non-generator file, plus the generator directories collapsed one line per family.
The per-typeId detail (generator → field → viewer → config) is the §7 table.

```
src/
├── App.tsx                      # shell: 3-panel layout, packing (packPages + measured), composition of components/sheet/
├── main.tsx                     # React entry (index.html and bord.html both load it)
├── bootEntry.ts                 # isBordPage() (<html data-boot="bord">), initialView(), leaveBordPage() → '/' (§14)
├── oefenen/                     # Oefenmodus pupil kiosk: its own React root behind oefenen.html, never imports App or the worksheet store (§15)
│   ├── main.tsx                 # entry: decodes location.hash into the store BEFORE the first paint, imports index.css + kiosk/kiosk.css
│   ├── OefenApp.tsx             # routes on the store: error / StartScreen / Kiosk / locked StatsScreen; follows hashchange
│   ├── useOefenStore.ts         # the kiosk's own Zustand store: phase, run, shown exercise, input fields, timer tick; currentInput(), sanitizeAnswer()
│   └── kiosk/
│       ├── Kiosk.tsx            # running layout (card left, answer panel right; portrait stacks) + physical-keyboard routing + 1 s clock
│       ├── TopBar.tsx           # title, progress n / total, countdown (red < 1 min), Resultaten (hidden while statsLocked)
│       ├── ExerciseCard.tsx     # ONE exercise through the registry Viewer at 340 px, scaled to the card; inert; ScaffoldProvider false
│       ├── AnswerInput.tsx      # fields (number / two / time / multi-number / text) + Keypad, or the choice buttons
│       ├── Keypad.tsx           # 7-8-9 keypad, ⌫, up to two extra keys from descriptor.keys(c), the descriptor's action keys (Lenen) and Controleer
│       ├── Tray.tsx             # build kind: one tile per KioskPiece (picture from EXERCISE_UI[typeId].TrayPiece), tap lays one, the count badge takes one back; never shows the running total
│       ├── FeedbackOverlay.tsx  # Juist! / Fout / retry flash (tap or Enter skips), never the right answer; no Volgende button
│       ├── StatsScreen.tsx      # per type gemaakt/juist/fout/%, Foutjes (exercise, given, expected), Opnieuw, two-tap Wissen
│       ├── StartScreen.tsx      # confirm screen (title, n soorten · n oefeningen · min, type chips), Start (+ fullscreen try)
│       ├── ErrorScreen.tsx      # bad / truncated / newer link, or no link
│       └── kiosk.css            # kiosk layer on top of the app tokens (--kiosk-* sizes, 44 px taps, landscape-first grid)
├── index.css                    # global + ALL print CSS (@page, @media print)
├── assets/theme.css             # tokens (fonts come from @fontsource via index.css; favicons live in public/)
├── config/
│   ├── appstructure.ts          # APP_STRUCTURE tree (Domain→Subdomain→ExerciseType)
│   ├── exerciseRegistry.ts      # REGISTRY: typeId → {exerciseField, generate, defaultConstraints, defaultCount} (pure data)
│   ├── exerciseUI.tsx           # EXERCISE_UI: typeId → {Viewer, Config} (React)
│   ├── baseSettings.ts          # BaseSettings + baseApply/baseRangeFor (snapshot-on-add, floored into the type's list, §13)
│   ├── exerciseCatalog.ts       # flat addable catalog for mass-add / curriculum (§13)
│   ├── instructionPresets.ts    # quick-pick opdracht-titel texts + defaultInstructionFor()
│   ├── gradePresets.ts          # Leerjaar 1–6: base-difficulty seed (L6 = 1 000 000 000) + leaf grade-gate (soft starting point)
│   ├── numberRanges.ts          # every max-number option list once: NAT_CEILING, NAT_STEPS, RANGES, floorToPreset, presetLabel (§5, §13)
│   ├── printPalette.ts          # curated print-safe swatches + STYLE_BOUNDS clamps (style builder)
│   ├── rekenmethodes.ts         # rekenmethode metadata (bibliotheek)
│   ├── worksheetTemplates.ts    # prebuilt worksheet templates (bibliotheek / presets)
│   ├── releaseNotes.ts          # per-version "Wat is er nieuw" list (newest first) behind the banner (§10)
│   └── version.ts               # RELEASE_VERSION / RELEASE_SUMMARY for the banner, derived from releaseNotes[0]
├── store/
│   ├── useWorksheetStore.tsx    # public entry: composes the slices into ONE Zustand store + installs autosave
│   ├── types.ts                 # state/action interfaces + exported sheet types (HeaderData, DocSettings, …)
│   ├── blockRules.ts            # pure: curriculum-lock filter + stale classification for updateBlockSettings
│   ├── autosave.ts              # debounced autosave subscription (installed once)
│   └── slices/
│       ├── blocksSlice.ts       # blocks + staleBlocks: add/remove/reorder/split/duplicate, exercises, generate
│       ├── documentSlice.ts     # header/footer/docSettings/baseSettings/grade/curriculum/draft blocks, loadWorksheet
│       ├── uiSlice.ts           # selection, tabs, view, sidebar preview, save state, block pages, debug flag
│       └── historySlice.ts      # undo/redo, pushHistory, commitBlocks
├── hooks/
│   ├── usePrint.ts              # window.print() trigger + dynamic @page injection (waits 2 rAF for the repack)
│   ├── useMeasuredHeights.ts    # measured cell heights + page-body budget fed back into the packer (§9)
│   ├── useSheetZoom.ts          # sheet zoom-to-fit (ResizeObserver, floor 55%)
│   ├── useBootLoad.ts           # boot order: share link → autosave restore → release-banner check
│   ├── useOnboarding.ts         # welcome / tour / help / video modal state + localStorage keys
│   └── useSheetDnd.ts           # sheet drag-and-drop state: handle + whole-block drag (draggable toggled at mousedown), top/bottom drop zones (§9)
│  (repo root) scripts/bignum-audit.mjs  # Playwright: every leaf at its max-list top × widths × solutions; fails on overflow (incl. rects outside the cell), NaN/undefined, console errors (TESTING.md)
│  (repo root) scripts/width-matrix.mjs  # Playwright width/height harness behind the LAYOUT tiers (§9)
│  (repo root) scripts/font-baseline.mjs # walks every sidebar leaf (window.__rekenraak.leaves, seeded RNG) → cell shots + heights/intrinsic widths/text
│  (repo root) scripts/font-compare.mjs  # before/after diff (pixelmatch) → report.json/.md + contact-sheet.html; see TESTING.md
│  (repo root) scripts/catalogue.mjs     # walks every leaf → splices the exercise cards (data-leaf), the domain › leaf sidebar and an ItemList into oefeningen.html between marker comments; white pngs in public/oefeningen/ (npm run catalogue; catalogue.test.ts fails the gate when the page and APP_STRUCTURE differ)
│  (repo root) scripts/visual-gate.mjs   # commit gate, browser half: staged files → typeIds (viewer/generator imports, shared surface → all) → seeded leaf walk vs scripts/visual-baseline.json; --accept rewrites the baseline (TESTING.md)
│  (repo root) scripts/lib/leafWalk.mjs, scripts/lib/visualCompare.mjs  # the walk + thresholds shared by visual-gate / font-baseline / font-compare / trigger-shots (opt-ins keyFor, prepare, onBrowser, solutionsList)
│  (repo root) scripts/trigger-shots.mjs # renders the limit-bug repro cases (scripts/limit-trigger-cases.json) in font-baseline shape, so font:compare diffs before/after
│  (repo root) scripts/limits-diff.mjs   # diffs two limits:audit output dirs (summary, violations, seeded dumps) → report.md/.html; --touched flags collateral changes
│  (repo root) scripts/limit-trigger-cases.json  # one or more repro cases per open limit-bug id (read by limits.matrix.test.ts and trigger-shots)
│  (repo root) scripts/fixtures/         # trigger-case sample + a synthetic limits-diff before/after fixture
│  (repo root) vitest.audit.config.ts    # vitest config for src/__tests__/audit/ only (npm run limits:audit); vitest.config.ts excludes that folder
│  (repo root) src/__tests__/viewers.interaction.test.tsx, viewers.interaction.grids.test.tsx  # Phase C: no provider = no kiosk attributes, every interactive leaf taps / fills / orders to a right answer (TESTING.md)
│  (repo root) src/__tests__/viewers.interaction.build.test.tsx, viewers.interaction.drag.test.tsx  # Phase C3/C4: build + drag leaves reach a right answer through the tray / pointer + arrow keys; no provider = no kiosk attributes (TESTING.md)
│  (repo root) src/__tests__/helpers/fillCells.ts, oefenKiosk.ts, dragCheck.ts  # fill-cells answers written from the exercise itself; starter session + tap helpers for the kiosk suites; dragCheck = right / wrong drag values per family from the generator's truth
│  (repo root) src/__tests__/oefenen.kioskInstruction.test.ts  # every kioskInstruction names a tap / fill, never a pen verb
│  (repo root) src/__tests__/helpers/limitRules.ts, limitHarness.ts, answerKeys.ts  # the limit rule book (LIMIT_SPECS per typeId), case runner, shared answer-key arithmetic
│  (repo root) src/__tests__/limits.matrix.test.ts + limits.knownBugs.ts  # gate: every leaf × leerjaar, pairwise, trigger cases vs the rule book; open bugs listed by BUGS id, stale entries fail
│  (repo root) src/__tests__/audit/limits.audit.test.ts  # the full limit diagnosis behind npm run limits:audit (cartesian / pairwise / random, seeds, dumps)
│  (repo root) scripts/visual-baseline.json  # committed: per leaf × width × solutions {height, intrinsic px, text hash} at seed 1234 — the gate's reference
│  (repo root) .githooks/pre-commit      # git hook (core.hooksPath via npm prepare): npm run check + visual-gate --staged; SKIP_GATE / SKIP_VISUAL / --no-verify need a human
│  (repo root) .claude/hooks/commit-bypass-guard.ps1  # Claude Code PreToolUse: any gate bypass in a shell command → permissionDecision 'ask'
│  (repo root) oefenen.html              # the pupil kiosk page: an extra Vite entry (vite.config.ts rollupOptions.input `oefenen`), mounts src/oefenen/main.tsx; noindex
│  (repo root) bord.html                 # the app booted straight into Bordmodus: <html data-boot="bord">, own title/meta/canonical, Vite input `bord` (§14)
│  (repo root) src/__tests__/board*.test.ts(x), bordEntry, clockMath, klokWidget, wbCosmetics  # the Bordmodus suites (TESTING.md "Bordmodus suites")
│  (repo root) about.html, faq.html, oefeningen.html + src/site.ts, src/site.css  # static SEO pages built by Vite (vite.config.ts rollupOptions.input) so they reuse the app's real CSS/classes (mac-vibrant, panel-head, seg-group, sidebar-row, Wordmark markup): sidebar = page tabs + anchors / questions / exercise filter, top bar = "Open RekenRaak", no inspector; sitemap/robots stay in public/
├── styles/
│   └── appStyles.ts             # CSS-in-JS inline layout styles
├── services/
│   ├── generationNotes.ts       # shared Dutch note wording (countOefeningen, repeatNote) for generateNoted rows + the dedupe's "Kleine reeks"
│   ├── generateDispatch.ts      # generateForBlock / generateExtra / regenerateBlock: registry lookup, sheet-wide dedupe (§6) → generic setExercises
│   ├── persistence.ts           # autosave / presets / share-link / file import-export / oefensessies library (§10)
│   ├── qr.ts                    # QR matrix via npm qrcode-generator (level M, base32 tail as an alphanumeric segment) + canvas painter; teacher bundle only (§15)
│   ├── oefenen/                 # Oefenmodus services, pure (§15)
│   │   ├── types.ts             # OefenSessie / OefenType / KioskDescriptor / KioskInput / OefenStats / OefenRun
│   │   ├── kiosk.ts             # kioskFor / kioskSupports / kioskCapableLeaves / kioskLabel + the frozen KIOSK_LEAF_TABLE_V1 / KIOSK_KEY_TABLE_V1
│   │   ├── kioskDescriptors.ts  # one KioskDescriptor per family (answerOf, inputOf, choicesOf, labels, separator, keys, display, supported)
│   │   ├── check.ts             # checkAnswer + normaliseNumber / normaliseFraction / normaliseText; drag compares within `tolerance` (12-hour face minutes), build compares the laid value
│   │   ├── session.ts           # OefenSessie ↔ wire v1 ↔ DEFLATE (fflate) + base32 ↔ #oefen= link; strict parse with Dutch errors
│   │   ├── scheduler.ts         # nextType (afwisselen / willekeurig), nextExercise (throwaway block, no exact repeats), isDone, plannedTotal
│   │   └── stats.ts             # recordAnswer / summary / answerText / expectedText + runs in localStorage (last 5)
│   ├── regionStyle.ts           # overlayRegionStyle(base, RegionStyle): custom-wins style overlay for header/footer/titel
│   ├── layout/pagePacker.ts     # PURE packer: blocks in, pages out — rows, page breaks, spans; no DOM (§9)
│   ├── layout/blockLayout.ts    # page grid (COL_UNITS × ROW_BUDGET) + per-type rowUnits/minWidth FALLBACK + VETO_MIN + cost fns (§9) — moved from config/ 2026-09-13
│   ├── layout/blockNumbering.ts # pure numberBlocks(): opdracht numbers, skipping furniture + skipNumbering — one source for sheet, Inspector chip, thumbnail (§3)
│   ├── layout/splitBlock.ts     # pure "Blok splitsen" heuristics: splittableCount + fittingSplitIndex (§9; tested)
│   ├── layout/hrRowLayout.ts    # pure hoofdrekenen row geometry + 1e9 fit ladder (font steps, then wrap), shared by MathBlockRenderer (§7; tested)
│   ├── layout/kaderMarkup.tsx   # pure renderKaderBody(): **vet** / *cursief* / __onderstreept__ / 1. and - lists for the onthoudkader (§9 furniture; tested)
│   ├── math/{types.ts,mathEngine.ts,formatters.ts}
│   ├── math/answerKeys.ts         # from-scratch answer arithmetic (scaled, evaluateChain, evaluateTokens, gcd); the kiosk descriptors and the test harnesses share it (src/__tests__/helpers/answerKeys.ts re-exports)
│   ├── math/relax.ts              # hoofdrekenen relaxation ladder (preset→masks→bridges→termCount); strict first, settings untouched
│   ├── math/constraintTypes.ts    # per-family XConstraints (43) + BlockConstraints/CrossCutting/ConstraintsByType
│   ├── clock/{clockTypes.ts,clockGenerator.ts}
│   ├── clock/clockDrag.ts         # Oefenmodus: which hands the pupil moves (handChoice), minute step, face maths (klokMinuteTo / klokHourTo / klokStep), klokGiven; shared by ClockDragFace and KLOK_KIOSK
│   ├── clock/clockMath.ts       # pure analogue-clock maths (angle → minute/hour, carry across 12, 12/24 h cycle, arrow steps) for draggable faces (board KlokWidget)
│   ├── fractions/{fractionGenerator.ts,breukBewerkGenerator.ts}   # breukBewerk = gemengd/gelijknamig/vereenvoudigen
│   ├── splitsen/{splitsenGenerator.ts,dutchWords.ts}   # basic/splitsboom/verliefde-harten/positie-*
│   ├── cijferen/cijferGenerator.ts
│   ├── cijferen/cijferLayout.ts   # pure column geometry shared by CijferViewer and the kiosk descriptor (cijferDp, getDigitCols, mulLayout, add/sub carries)
│   ├── cijferen/cijferCells.ts    # the kiosk grid's ruitjes (key a/p/q/c/b/r, roles) + cijferCheck: which cell holds which digit, needed carries must be written (strictCarries default true, §15)
│   ├── geld/{geldGenerator.ts,geldRekenenGenerator.ts}   # herkennen/tekenen, wissel, teruggeven; korting/winst/intrest (formatEuro)
│   ├── mab/mabGenerator.ts
│   ├── ordenen/{ordenenGenerator.ts,breukenRangschikkenGenerator.ts}   # rangschikken → OrdenenExercise[] (fractions)
│   ├── deelbaarheid/{deelbaarheidGenerator.ts,deelbaarheidKleurGenerator.ts}   # kleur = strip/markeren/raster veelvouden
│   ├── getallenas/getallenasGenerator.ts
│   ├── getallenrij/getallenrijGenerator.ts     # sequences (getallenas without the axis line)
│   ├── patroon/{patroonGenerator.ts,kettingGenerator.ts}   # getalpatronen 1–4-step op-cycle; kettingsommen reuse PatroonExercise[]
│   ├── meten/metenGenerator.ts                 # lengte-meten (polyline) + omtrek (shapes) + generateOppervlakteExercises (MeetExercise.area)
│   ├── temperatuur/temperatuurGenerator.ts     # kleuren / aflezen / verschil
│   ├── plaatswaarde/plaatswaardeGenerator.ts   # waarde / plaats / tabel
│   ├── evenoneven/evenOnevenGenerator.ts       # rooster / cirkels
│   ├── vergelijken/{vergelijkenGenerator.ts,representations.ts}   # getallen/kiezen/representaties; representations.ts = text helpers
│   │                                           # (the RepValue component lives in components/viewer/RepValue.tsx)
│   ├── afronden/afrondenGenerator.ts           # natural+decimal rooster / simpel (targetsFor, roundTo)
│   ├── romeinse/romeinseGenerator.ts           # herkennen / schrijven (toRoman, NIVEAU_MAX)
│   ├── herleidingen/herleidingenGenerator.ts   # metric unit conversions (ladderFor; integer-exact)
│   ├── schattend/schattendGenerator.ts         # round-first estimation (reuses afronden helpers)
│   ├── verbanden/verbandenGenerator.ts         # breuk·decimaal·procent benchmarks (terminating denominators)
│   ├── procenten/procentenGenerator.ts         # percent nemen / welk-percent (answer-first)
│   ├── maateenheid/{maateenheidGenerator.ts,maateenheidData.ts}   # passende eenheid; curated item bank
│   ├── rekenvolgorde/rekenvolgordeGenerator.ts # order of operations; brackets only when they matter
│   ├── getalfunctie/getalfunctieGenerator.ts   # hoeveelheid/rang/maat/code sentence bank
│   ├── tijdsduur/tijdsduurGenerator.ts         # begin|einde|duur (formatDuur)
│   ├── kalender/kalenderGenerator.ts           # month grid / date arithmetic / notatie (nl-BE names)
│   ├── controleren/controlerenGenerator.ts     # negenproef + omgekeerde bewerking (negenrest)
│   ├── weegschaal/weegschaalGenerator.ts       # dial values on the schaalverdeling (BEREIK_STEPS, formatGewicht)
│   ├── vormleer/hoekDrag.ts                    # Oefenmodus: hoek class as centre ± tolerance over 5° snaps (hoekTarget), hoekFromPoint, hoekStep; shared by HoekDragSVG and VORMLEER_KIOSK
│   ├── vormleer/vormleerGenerator.ts           # punt-lijn/hoek/figuur constructors + CONCEPT_NAMES + buildScenario (one niveau scenario for both modes)
│   └── vormleer/scenarioLayout.ts              # layoutScenario(): viewBox geometry + collision-free label placement for punt-lijn figures (asserted by vormleer.test.ts)
├── board/                       # Bordmodus, the whiteboard app (§14); outside it only the four §14 touchpoints
│   ├── boardTypes.ts            # BoardWidget / WidgetKind (22) / Stroke / BoardTool / BoardPage / BoardBackground, ToolEngine contract (P4), rndId, emptyPage
│   ├── useBoardStore.tsx        # the second Zustand store: pages, widgets, ink, tools, selection/inspector; module-init hydration + 1.5 s autosave (§3, §14)
│   ├── boardBlocks.ts           # exercise cards: makeBoardBlock (seedConstraints) + sheetSeedContext, regenerateBoardBlock (generateForBlock), resizeBoardBlock (generateExtra), withFreshIds
│   ├── boardPersistence.ts      # BOARD_FORMAT_VERSION 1, strict parseBoardFile, autosave, "Mijn borden" presets (cap 30, false on quota), file export
│   ├── widgetSizing.ts          # NATURAL_W / titles / KINDS_WITH_SETTINGS per kind + every prop normaliser (klok, weer, datum, groepjes + makeGroups, …), class-list key
│   ├── addWidgets.ts            # staggerSlot / staggerPos (first free slot) + addBasicWidget
│   ├── toolCatalog.ts           # TOOL_CATALOG (Wiskunde-gereedschap / Klasmanagement / Organisatie tiles), runTool, ★ favorites (max 6)
│   ├── backgrounds.ts           # page backgrounds: pattern × white/black × size, pure CSS gradients
│   └── components/
│       ├── WhiteboardView.tsx   # the full-screen .no-print overlay App mounts for view 'whiteboard'
│       ├── BoardPageCanvas.tsx  # one page: background, isolated widget layer, ink layer, geld dock; text-tool placement, 🔄 / 👁 wiring
│       ├── WidgetFrame.tsx      # window-card chrome: title bar drag, actions, resize grip, zoom = w / NATURAL_W, height cap
│       ├── BoardBottomBar.tsx   # Toevoegen + favorites, board settings, tools, ink undo/redo, pages, save/presets/import, Bordmodus verlaten; popups close on Escape/outside
│       ├── BoardAddModal.tsx    # "RekenRaak blok…" single-add picker: exerciseCatalog + ExercisePreview, search over variants/typeIds/tools
│       ├── BoardInspector.tsx   # exercise card flyout: draftBlocks mirror, Config + StyleConfig + AdvancedConfig, Aantal/Witruimte/Tekstgrootte, GenerationNote
│       ├── WidgetInspector.tsx  # ⚙ panels for every non-exercise kind
│       ├── InkLayer.tsx         # SVG strokes (pen/marker), per-stroke eraser hit-test
│       ├── InkSettingsBar.tsx   # pen/marker colours (defaults + saved in rekenraak_board_colors_v1) and widths
│       ├── GeldPalet.tsx        # euro dock (Tekening / Echt), drag-to-create geld-item widgets
│       ├── BoardErrorBoundary.tsx # per-widget + ink-layer crash guard with a local reset
│       └── widgets/             # one component per WidgetKind (ExerciseWidget mounts EXERCISE_UI Viewer; KlokWidget on clockMath; …)
└── components/
    ├── sheet/                  # the A4 sheet surface, split out of App.tsx (R1)
    │   ├── SheetPages.tsx      # PageSheet loop: cell width/left, tail + split wiring, fit/widen handlers
    │   ├── SheetBlock.tsx      # React.memo cell: positioned wrapper, opdracht-titel row, registry Viewer, "te breed" banner
    │   ├── SheetHeader.tsx     # page-1 header region + repeating name-field strip
    │   ├── SheetFooter.tsx     # three footer slots + credit
    │   ├── SheetBanners.tsx    # release + tryout banners
    │   ├── SheetControlsRail.tsx # picks hovered ?? selected block, wires BlockControlsRail
    │   ├── hoveredBlock.ts     # tiny external store for the hovered block id (keeps hover from re-rendering every viewer)
    │   ├── EmptySheetHero.tsx  # empty-sheet how-to
    │   └── SplitPopover.tsx    # "Splitsen na oefening" popover
    ├── layout/
    │   ├── SheetDropZones.tsx  # the three labelled drop thirds over every candidate block during a drag + SheetDragHint strip (screen only)
    │   ├── PageSheet.tsx       # ONE printed page: own header + COL_UNITS-wide grid body + own footer + break-after: page (§9)
    │   ├── BlockControlsRail.tsx  # portalled per-block control rail (lock/duplicate/split/page-break/move/delete); fixed-positioned off the block rect so the page's overflow:hidden can't clip it; visibility = hovered id (`components/sheet/hoveredBlock.ts` external store) ?? activeBlockId, resolved in SheetControlsRail, not CSS :hover
    │   ├── sidebar.tsx         # left panel: source-list nav, locked palette, mode row (Oefenmodus / Bordmodus), wordmark foot
    │   ├── TopBar.tsx          # one row: add/menu/help | sheet name + autosave | undo-redo, genereer, oplossingen, afdrukken Label-shedding is driven by [useShedStages](../../src/hooks/useShedStages.ts) — a ResizeObserver measures the bar's real content width (sum of the children's `scrollWidth`; a squeezed grid column spills into its neighbour, so the row's own scrollWidth lies) and steps through four stages only when it actually overflows (8px slack down, 24px headroom up, reversal breaker): 0 full labels · 1 icon-only + tooltips · 2 sheet name + autosave dot on `.topbar-line2` under the bar · 3 Toevoegen/Uitleg/Bordmodus fold into Meer. `data-stage` on `.topbar`. Stage 0 needs ≈2040px of viewport (≈1900 before the Bordmodus button) because the bar spans only the centre column.
    │   ├── OverzichtPanel.tsx  # Overzicht tab in the left panel (block list + drag reorder)
    │   ├── BaseSettingsModal.tsx  # global base-difficulty modal (§13)
    │   ├── HelpModal.tsx       # Ouders / Leerkrachten tabs + tour replay + "Wat is er nieuw" link
    │   ├── ReleaseNotesModal.tsx  # "Wat is er nieuw": releaseNotes items grouped, live example per exercise item (§10)
    ├── library/{BibliotheekView.tsx,MijnBladenView.tsx}   # saved sheets / templates (uses shared/SheetThumbnail.tsx); Mijn bladen also lists the Oefensessies (Delen / Bewerken / hernoemen / verwijderen)
    ├── onboarding/TourOverlay.tsx                         # first-run spotlight tutorial
    ├── onboarding/WelcomeModal.tsx                        # first-visit chooser: tour / demo video / skip (also Help's video)
    ├── massadd/MassAddModal.tsx                           # §13 "Toevoegen" modal
    ├── curriculum/CurriculumBuilderModal.tsx              # §13 curriculum builder (draftBlocks)
    ├── curriculum/draftBlock.ts                           # makeDraftBlock(typeId, constraints, id?): the off-sheet block both builders mount Configs on (§13)
    ├── oefenen/OefenBuilderModal.tsx                      # §15 teacher builder: kiosk-capable leaves, a draft block per row, limit / kans / timer / flags, Opslaan / Delen
    ├── oefenen/oefenBuild.ts                              # pure: listOefenLeaves, buildSessie (unsupported rows excluded, weights → whole %), rowsFromSessie, LIMIT_STEPS / TIMER_STEPS
    ├── oefenen/OefenShareModal.tsx                        # §15 link + copy, QR (copy PNG / download), Groot tonen (beamer), Afdrukken (A5)
    ├── shared/{ExercisePreview.tsx,SheetThumbnail.tsx}    # §13 fit-to-card live example; mini sheet preview
    ├── ui/{IconButton,Wordmark,Switch,PopupSelect,InfoTip,Swatch,ModalPortal,ModalShell}.tsx
    ├── configurator/
    │   ├── Inspector.tsx       # mounts EXERCISE_UI[typeId].Config; locked-mode gating
    │   ├── GenerationNote.tsx  # the "versoepeld / slechts N / kon geen oefeningen maken" callout under Genereer, shared by the sheet Inspector and BoardInspector
    │   ├── RegionStyleFields.tsx  # per-region look-and-feel (size/bold/colour/fill/padding) + ResetAllStylesButton
    │   ├── BridgeControl.tsx   # carry-arrow ('bruggetje') diagram: per-place geen/mag/moet via tappable gap arrows
    │   ├── useMaxPresets.ts  # the block's max list = REGISTRY.maxPresets over the constraints the plugin sees (gemengd tabs → variant row) (§5)
    │   ├── sharedPluginStyles.ts  # radioBtn + pill + onOff + divider/sectionBox/select + hint/label text tiers
    │   ├── useConstraints.ts      # [c, patch] hook: typed read + merge-write of block.constraints for plugins; honours ConstraintScope
    │   ├── ConstraintScope.ts     # context: when set to ['perVariant', id] the hook reads {...root, ...root.perVariant[id]} and writes ONLY into perVariant[id] (sparse); fixedPreset/hidden let a tab pin its preset and hide shared controls
    │   ├── plugins/shared/fieldStyles.ts      # F: Inspector field chrome shared by Inspector + StyleConfigs
    │   ├── plugins/shared/HrStdStyleConfig.tsx # AddSub/MulDiv StyleConfig (niveau, compenseren-tussenstap, nummering, kort/lang/stappen)
    │   ├── plugins/shared/ItemNumberingRow.tsx # Opmaak → Nummering (Geen / 1) / a)) → block.itemNumbering; mounted by HrStd + Rekenvolgorde StyleConfigs
    │   ├── plugins/RekenvolgordeStyleConfig.tsx # rekenvolgorde Kort/Lang/Stappen (own file: HrStdStyleConfig's rows are gated on hoofdrekenen-only settings)
    │   └── plugins/*Config.tsx # one per family (+ addition/ & multiplication/ sub-settings; FractionMaxField = shared getalopbouw widget)
    └── viewer/
        ├── *Viewer.tsx + *SVG.tsx      # one renderer per family; ClockViewer/FractionViewer wrap item components
        ├── ViewerInteractionContext.tsx # Phase C: null on the sheet; tap / tap-multi / fill-cells / order / build / drag state + interactionProps / cellProps / borrowedProps / toggled / built (§8, §15)
        ├── kioskDrag.ts                # Phase C4: dragSurfaceProps / dragHandleProps (pointer + slider keys), clockAngle / snap / clamp; {} without a drag context
        ├── ClockDragFace.tsx           # analoge klok with draggable wijzers (AnalogClockSVG + handles); ClockExerciseItem renders it only under the drag context
        ├── HoekDragSVG.tsx             # angle with a draggable free been (vormleer hoek tekenen); VormleerViewer renders it only under the drag context
        ├── KioskCell.tsx               # a fill-cells blank: an <input> in the kiosk, its children (the sheet's blank) elsewhere
        ├── BlockWidthContext.tsx       # printable width of the block's CELL — viewers MUST read this, never a constant; also ScaffoldProvider / useShowScaffold (§8)
        ├── VerticalFraction.tsx        # shared stacked-fraction component
        ├── LayoutBlockViewer.tsx       # sheet furniture: sectie / schrijflijnen / raster / kader / lege pagina
        ├── cijferGrid.ts               # the one ruitje-size formula (token × slider multiplier), shared by CijferViewer and the Geavanceerd slider label
        ├── BlockErrorBoundary.tsx      # shared crash guard around every Viewer (sheet, thumbnail, preview); resets on the exercise array (§8)
        ├── ScaledBlock.tsx             # per-block body-zoom wrapper (bodyFontScale); fits to page height when constraints.fitToPage, to column width ONLY when constraints.fitToWidth (badge "verkleind tot N %")
        ├── scaledBlockFit.ts           # pure nextZoom()/FIT_FLOOR helper for ScaledBlock (tested)
        ├── solutionStyle.ts            # SOL / solutionText / solutionStroke — the one solution-red token (--ink-solution), bold
        ├── itemNumbering.ts            # itemLabel() / itemLabelChars(): the 1) / a) … aa) per-exercise labels for hoofdrekenen + rekenvolgorde (§3)
        └── FragmentableGrid.tsx        # block-stack-of-rows layout so items flow across print page breaks
```

---

## 12. Scaling notes (registry refactor + print rewrite — done 2026-05-30, shipped v0.4)

The app used to route `typeId` through 4 hand-maintained branch lists with
substring matching (`includes('delen')`, guarded by `!startsWith('cijferen-')`).
That was replaced by the registry (§5) to scale toward the planned ~200 types:

- **Exact-key lookups** — no more order-sensitivity or substring collisions.
- **One generic `setExercises(id, field, data)`** store action instead of one
  setter per type. `MathBlock` still carries one optional array field per family
  (that's the data shape); the registry's `exerciseField` says which to write.
- **Per-family constraint types** in [constraintTypes.ts](../../src/services/math/constraintTypes.ts)
  (`AddSubConstraints`, `MabConstraints`, … 43 in total). Since 2026-09-12
  `MathBlock.constraints` is `BlockConstraints` (index signature + `CrossCutting`), not
  `any`; every generator/viewer/plugin narrows to its family type once at the entry line
  and the registry's `row<C>()` type-checks each default factory against it (§3, §6).

What's still per-type by necessity: the generator, viewer, and config component
themselves (genuinely different code), plus their two registry rows. Viewers take
a uniform `{ block, showSolutions }`; any grid/mode hint is derived inside the
viewer from `block` (see `MabViewer`, `FractionViewer`, `ClockViewer`).

Adding a type = generator + viewer + config + one row in each registry file (§5).

The same ship rewrote the **print system**: `@page margin:0` made margins dialog-proof
and `FragmentableGrid` let exercises flow across page breaks. Its repeating-`<thead>`
A4 `<table>` has since been replaced in turn by the real-pages model (§9).

---

## 13. Teacher-workflow layer (base settings · mass-add · curriculum)

> Scoped constraint writes (gemengd's per-variant tabs, `ConstraintScope`) need nothing here:
> they still go through `updateBlockSettings(block.id, …)`, which already routes `draft-*` ids
> to `draftBlocks`, so the curriculum builder edits its draft and never the sheet (verified
> 2026-09-13).

Three features built on top of the registry. None add `typeId` branches — they all
drive the existing registry/config machinery.

### Global base settings (snapshot-on-add)

[baseSettings.ts](../../src/config/baseSettings.ts) — pure data: `BaseSettings`
(max/getalsoort/operand masks/bridges map/decimalen/breuk-opties) + `DEFAULT_BASE` +
`baseApply(base, registryDefaults, range)`. The teacher sets these once (sidebar →
Geavanceerd → Basisinstellingen, [BaseSettingsModal.tsx](../../src/components/layout/BaseSettingsModal.tsx)).
`addBlockFromType` snapshots them into each **new** block:
`constraints = { ...registryDefaults, ...baseApply(base, defaults), ...leafOverride }`
(leaf wins). `baseApply` writes a key **only if** that type's realized defaults declare
it (`'key' in defaults`), mapping the semantic max onto `maxGetal`/`maxRange`/`maxNumber`
and the masks/bridges/decimalen/breuk-toggles where present. Snapshot, not live — changing
the base never retro-affects existing blocks.

**One pipeline.** `seedConstraints({ typeId, base, override, grade, leafId })` (baseSettings.ts)
is the only place that builds a new block's constraints — store, sidebar hover card, MassAdd preview
and the test helpers all call it. After merging, base masks/bridges are trimmed to the block's final
max (masks ≤ max, bridges < max; a leaf-pinned mask/bridge is left alone). A leaf flagged
`gradeSetsMax: true` (afronden rooster/simpel, splitsen positietabel/benen/plaatswaarden) yields its
pinned max to the grade when a leerjaar is picked (not under a locked curriculum); other pinned keys
still win. A hidden picker (`maxPresets` → `null`: tafels, cirkels, veelvouden, rational) keeps its
registry default max. `loadWorksheet` floors every block's and every locked-curriculum max onto its
list once, inside the load's single history entry, with no stale flag.

**Per-type ceiling.** The max is **floored into the type's own list**: `range` =
`REGISTRY[typeId].maxPresets(ctx)` where `baseRangeFor` builds `ctx` from registry defaults →
the base's numberType → the leaf override (so a decimal base or leaf picks the decimal list), and
`floorToPreset` takes the largest preset ≤ base (below the lowest → lowest). No list →
`min(base, NAT_CEILING)`. So leerjaar 5/6 seeds land on each type's own top (MAB 1 000,
deelbaarheid 100 000, …) instead of an unlisted value. Safety nets for old saves / share links:
`loadWorksheet` clamps `baseMaxGetal` > `NAT_CEILING` (1e9); `generateForBlock` generates from a
clamped copy (`withinCeiling`, 1e10 × INTERNAL_SCALE would pass 2^53); `PopupSelect`'s
`clampToLowest` floors an unmatched value to the nearest lower option.

**Decimals (2026-10-08).** `DEFAULT_BASE.baseDecimalPlaces` is 0; Leerjaar 1-3 seed 0, Leerjaar 4-6
seed 2, and "Alle leerjaren" (`setSelectedGrade(null)`) applies `NO_GRADE_PRESET` (back to 0).
`baseApply` writes `decimalPlaces` only where it means something: types with a `numberType` get it only
when the base has decimals (else they keep their own precision default, ordenen 2); plaatswaarde and
vergelijken (no numberType — `decimalPlaces` IS their decimals switch) always get the base value.
After the merge, `SEED_FIT` (§5) fits rounding targets and axis spans to the seeded max.

### Mass-add modal ("Toevoegen")

[exerciseCatalog.ts](../../src/config/exerciseCatalog.ts) walks `APP_STRUCTURE` → a flat
list of implemented leaves grouped by `typeId` into variant rows (+ `catalogDomains`
for the filter chips; multi-parent typeIds like klok get parent-prefixed variant
labels). [MassAddModal.tsx](../../src/components/massadd/MassAddModal.tsx) renders a card per
type with a **live example** via the shared
[ExercisePreview.tsx](../../src/components/shared/ExercisePreview.tsx) — it builds a throwaway
1-exercise block, calls `REGISTRY[typeId].generate` **directly** (no store writes), and
renders `EXERCISE_UI[typeId].Viewer` in an error boundary + IntersectionObserver, scaled
to fit the card width. "Alles toevoegen" calls `addBlockFromType` per selected type then
`generateAllBlocks`.

### Curriculum builder + locked parent mode

[CurriculumBuilderModal.tsx](../../src/components/curriculum/CurriculumBuilderModal.tsx)
(sidebar → Geavanceerd → Curriculum samenstellen) lets a teacher pick which types are
allowed and tune each type's difficulty using the **real config plugin**. To edit
off-sheet it seeds the store's `draftBlocks` slice (one per type) and mounts
`EXERCISE_UI[typeId].Config` against the draft; `updateBlockSettings` falls through to
`draftBlocks` when the id isn't in `blocks`, so the plugins work unchanged. The draft itself
comes from [draftBlock.ts](../../src/components/curriculum/draftBlock.ts)
`makeDraftBlock(typeId, constraints, id = 'draft-<typeId>')` (registry defaults + the leaf's
constraints), extracted 2026-10-08 so the Oefenmodus builder (§15) shares it. Draft ids are
arbitrary: the curriculum builder keeps one per typeId, the oefen builder uses
`draft-oefen-<rowKey>` so the same type can sit in a session twice. "Deel
curriculum-link" derives `allowedTypes` (typeId + label + the draft's constraints) and
shares a **template + `CurriculumLock`** link.

Opening such a link sets `store.curriculum` (via `loadWorksheet`). In locked mode:
sidebar ([sidebar.tsx](../../src/components/layout/sidebar.tsx)) shows only the whitelist
(hides the tree + Geavanceerd), the Inspector shows a banner and hides difficulty/
differentiation (count + Genereer stay), and the store gate (§3) freezes everything but
count + page-break + width. The lock is enforced in the store, so it holds regardless of UI.

### Shared bits

- [VerticalFraction.tsx](../../src/components/viewer/VerticalFraction.tsx) — single stacked
  numerator/bar/denominator (+ optional whole) component; used by every fraction render
  (mental-math, fraction viewer, ordenen, getallenas rational lines).
- [TopBar.tsx](../../src/components/layout/TopBar.tsx) — one row, `--bar-h` tall so it shares
  a baseline with both panel headers. Left: "Oefeningen toevoegen", one labelled **Meer**
  menu (werkbladen · bestand · delen · basisinstellingen · weergave · destructief · over)
  and "Uitleg". Centre: the beta note, the **editable sheet name** (`header.titel`, the
  same field the Blad panel used to duplicate) and the autosave state, as one identity
  cluster. Right: undo/redo, "Genereer alles", the oplossingen toggle, and **Afdrukken**
  — the only filled accent button in the app. Destructive actions (Nieuw blad, Alle
  oefeningen wissen) live in the Meer menu, never beside Afdrukken.
- Narrow screens: both panels stay visible and the **sheet zooms to fit** (floored at
  55%) — the old `PanelShell` hover-flyout collapse was removed, see §9 "Shell".
- `numberMatchesMask` / `digitAtPlace` in [mathEngine.ts](../../src/services/math/mathEngine.ts)
  — place-mask filtering reused by ordenen (and the splitsen decimal masks).

---

## 14. Bordmodus — the whiteboard app (`src/board/`, on `rc` since 2026-10-08)

A second, deliberately isolated app for digibord teaching, folded into `rc` on 2026-10-08
(revert points: tags `pre-whiteboard-rc`, `pre-whiteboard-rc-oefenen`). ALL board code lives
under `src/board/`. Touchpoints with the main app are exactly four:

1. **View union** — `WorksheetView` ([store/types.ts](../../src/store/types.ts)) gains
   `'whiteboard'`; `uiSlice` starts at `initialView()` and routes `setView` (below).
2. **App mount** — [App.tsx](../../src/App.tsx) renders `<WhiteboardView/>` as a full-screen
   overlay when `view === 'whiteboard'` (like the library views: the editor stays mounted
   underneath, so switching back loses nothing).
3. **Sidebar-foot button** — "Bordmodus" (Chalkboard icon) in the mode row directly above the
   wordmark ([sidebar.tsx](../../src/components/layout/sidebar.tsx)), beside Oefenmodus; nothing in
   the TopBar, so its fold stages are the pre-whiteboard ones.
4. **GeldViewer exports** — `EuroCoin` / `CentCoin` are exported (`Bill` already was) so the
   board's geld palette and geld-item widgets draw the same money as the sheet.

Shared code the board reuses (not touchpoints, plain imports): the registry
(`REGISTRY`, `EXERCISE_UI`), `seedConstraints`, `generateForBlock` / `generateExtra`,
[GenerationNote.tsx](../../src/components/configurator/GenerationNote.tsx), the worksheet
store's `draftBlocks`, `exerciseCatalog` + `ExercisePreview`, `AnalogClockSVG` and
[clockMath.ts](../../src/services/clock/clockMath.ts).

### Entry and exit

- **`/bord.html`** — [bord.html](../../bord.html) is the same app (`src/main.tsx`) with
  `<html data-boot="bord">`, its own title/meta/canonical, and a Vite `rollupOptions.input`
  entry. [bootEntry.ts](../../src/bootEntry.ts): `isBordPage()` reads the attribute (it exists
  before any module runs, so the store can read it at creation); `initialView()` →
  `'whiteboard'` there, `'editor'` elsewhere; `leaveBordPage()` → `location.assign('/')`.
  On bord.html App keeps the page's own tab title and `useOnboarding` skips the welcome modal
  (it tours the editor). about/faq/oefeningen link to it (`.site-btn-secondary` in site.css);
  sitemap.xml lists it.
- **From the editor** — the sidebar-foot "Bordmodus" button calls `setView('whiteboard')`.
- **Leaving** — the bottom bar's "Bordmodus verlaten" calls `setView('editor')`. `setView`
  with any non-board view on bord.html navigates to `/` instead (there is no editor
  underneath to fall back to); on index.html it just switches the view.

### Store — [useBoardStore.tsx](../../src/board/useBoardStore.tsx)

A second Zustand store, separate from `useWorksheetStore` so neither can corrupt the other
(§3). `pages: BoardPage[]` (each `{ id, widgets, strokes, background }`), `activePageIdx`,
`selectedWidgetId`, `inspectorOpen` (the ⚙ opens it, selection alone does not),
`geldPaletOpen` (UI-only), `tool`, `gridSnap` / `gridSize`, `inkSettings` per stroke tool,
`_redoStrokes`. `BoardTool` = `select | hand | text | pen | marker | eraser` (+ reserved
`line | shape | instrument` for P3/P4); `hand` drags widgets without selecting, `text` places a
tekst widget at the tap point and hops back to `select`. Hydrates from autosave at module
init; a debounced (1.5 s) subscription on `pages` / `activePageIdx` writes
`rekenraak_board_autosave_v1` (tool state is not persisted).

**Undo is ink-only.** The bottom bar's undo/redo walk the active page's stroke stack (redo
clears on a new stroke, an erase or a page switch). Widget actions (add, move, delete,
settings) have no undo.

**Fresh ids on copy.** `duplicateWidget` and `duplicatePage` deep-copy and give every widget,
page and stroke a new id, and run exercise blocks through `withFreshIds` (new block id + new
exercise ids): the inspector's draftBlocks mirror and `patchExercise` key on them, so a shared
id would edit both copies.

### Widgets

`BoardWidget { id, kind, x, y, w, z, scale?, rotation?, block?, showAnswer?, props? }`
([boardTypes.ts](../../src/board/boardTypes.ts)). 22 kinds: `exercise`, `tekst`, `datum`,
`klok`, `afbeelding` (dataURL), `namen`, `weer`, `geluid`, `werksymbolen`, `timer`,
`stopwatch`, `dobbelsteen`, `adem`, `groepjes`, `checklist`, `stappenplan`, `getallenlijn`,
`positietabel`, `honderdveld`, `breukviz`, `mabmat`, `geld-item`. Per-kind natural widths,
default titles, which kinds have a ⚙ panel and every prop normaliser (`klokProps`,
`groepjesProps` + `makeGroups`, …) live in [widgetSizing.ts](../../src/board/widgetSizing.ts);
the ⚙ panels for every non-exercise kind are [WidgetInspector.tsx](../../src/board/components/WidgetInspector.tsx).

- **Sizing** is CSS-`zoom`-based: frame zoom = `w / NATURAL_W[kind]`, so a corner drag is a
  uniform zoom and the layout height follows. Exercise `scale` = extra inner text zoom at
  constant frame width.
- **Chrome** ([WidgetFrame.tsx](../../src/board/components/WidgetFrame.tsx)) = a window card:
  editable title bar (`props.title`) as drag handle, actions 🔄 / 👁 (exercise), ⚙, ⧉ duplicate,
  🗑, resize grip bottom-right. `showHeader: false` → a bare card draggable from anywhere.
  `BoardErrorBoundary` wraps every widget and the ink layer.
- **Height cap** — a card is never taller than the board below its top edge:
  `maxHeight: max(140px, 100% − y − 8px)`; the body scrolls inside (tall omtrek / cijferen
  delen cards keep their resize grip on the board).
- **Stacking** — the canvas and the widget layer are each their own stacking context
  (`isolation: isolate`): a card's `z` grows with every bring-to-front, but stays inside the
  widget layer, so ink (z 10) always draws above the cards and the geld dock (45), inspectors
  and bottom-bar popups stay above the whole board.
- **Placement** — `staggerSlot(k)` ([addWidgets.ts](../../src/board/addWidgets.ts)) is a
  diagonal run of 5 slots 40 px apart, runs 240 px apart, a 20 px lap shift after 4 runs;
  `staggerPos()` takes the first slot no widget still sits on (the old `count % 5` put the 6th
  card on the 1st).
- **Klok** ([KlokWidget.tsx](../../src/board/components/widgets/KlokWidget.tsx)) — drag hands
  (outer ring = minute, inner = hour) on the shared pure `clockMath.ts` helpers, on a **24-hour
  cycle**: the minute hand carries the hour across 12 both ways, the hour hand snaps to whole
  hours and passing 12 flips voormiddag/namiddag, so the geschreven tijd stays right.
- Others in one line: namen (random picker; class list app-wide in `rekenraak_board_names_v1`,
  shared with groepjes), weer (open-meteo + geocoding search, geolocation with Brussels
  fallback), geluid (getUserMedia RMS → 5 levels), groepjes (size ↔ count, must / cannot be
  together via union-find + shuffle repair), honderdveld (tap colour cycle), mabmat
  (`MabPlaceColumn`), geld-item (a dropped coin/bill, titleless). **GeldPalet**
  ([GeldPalet.tsx](../../src/board/components/GeldPalet.tsx)) is a dock with the full euro
  catalogue, Tekening (GeldViewer exports) or Echt style, drag-to-create with pointer capture.

### Exercise widgets = the registry payoff

An exercise widget holds a full `MathBlock`, built exactly like a sidebar block
([boardBlocks.ts](../../src/board/boardBlocks.ts)):

- **Seed** — `makeBoardBlock(typeId, { override, leafId, base, grade })` runs
  `seedConstraints` with the catalog variant's leaf constraints and leaf id;
  `sheetSeedContext()` supplies the worksheet's `baseSettings` and leerjaar (none under a
  locked curriculum), so a board card starts from the same numbers as the sheet block the
  teacher knows. Board policy on top: `instructionMode: 'geen'`, `totalPoints: 0`,
  `numberOfExercises ≤ 6`.
- **Generate** — `regenerateBoardBlock` calls the sheet's `generateForBlock(block, true)`
  (ceiling clamp, always deduped, failure note) and writes the exercise field and
  `generationNote` itself: board blocks never enter the worksheet store. The note shows in the
  board inspector through the shared `GenerationNote` component (same box as the sheet).
- **Aantal** — `resizeBoardBlock(block, n)` applies at once like the sheet's count top-up:
  fewer cuts the tail, more keeps what is there and `generateExtra` tops up (deduped); an
  empty block regenerates.
- **Viewer** = `EXERCISE_UI[typeId].Viewer` ([ExerciseWidget.tsx](../../src/board/components/widgets/ExerciseWidget.tsx))
  on a white paper card, with per-widget `showAnswer` (👁).
- **Inspector** ([BoardInspector.tsx](../../src/board/components/BoardInspector.tsx)) — the
  **draftBlocks mirror** (§13 pattern): on open it seeds `worksheetStore.draftBlocks =
  [widget.block]`, a subscription copies every draft edit back into the widget (reference
  check, no write loops), teardown clears the drafts. It mounts the type's real `Config`,
  `StyleConfig` (as "Differentiatie") and `AdvancedConfig` (behind "Geavanceerd", when
  `advancedApplies`), plus a slim board section: Aantal (1–12), Witruimte, Tekstgrootte,
  Titelbalk tonen. No opdracht-titel, no score.
- **Adding** — bottom bar **Toevoegen** → "RekenRaak blok…" opens
  [BoardAddModal.tsx](../../src/board/components/BoardAddModal.tsx) (exerciseCatalog +
  ExercisePreview cards, domain chips, one tap = one card). Its **search** matches the row,
  subdomain, every variant label (sheet and board wording), variant keys and the typeId, and
  also offers matching board tools by label or id ("klok" finds the kloklezen variants and the
  Klok tool).

### Bottom bar — [BoardBottomBar.tsx](../../src/board/components/BoardBottomBar.tsx)

`[+ Toevoegen][★ favorites ≤ 6][⚙ board settings] | [select][hand][T][pen][marker][eraser]
[ink undo][ink redo][page clear] | [◀][page options][▶][+ page] | [save] | [Bordmodus verlaten]`. Toevoegen = RekenRaak blok · Wiskunde-
gereedschap · Klasmanagement · Organisatie, the last three as tile panels from
[toolCatalog.ts](../../src/board/toolCatalog.ts) with a ★ per tile (favorites in
`rekenraak_board_favorites_v1`). Board settings = background pattern / size / white-black + "Uitlijnen" grid snap and size. Every popup (add, settings, page, save) closes on **Escape** and on a press outside it
(capture-phase `pointerdown`, since widgets stop propagation). Pen/marker show
[InkSettingsBar.tsx](../../src/board/components/InkSettingsBar.tsx) (default + saved colours,
three widths).

### Ink — [InkLayer.tsx](../../src/board/components/InkLayer.tsx)

Strokes are SVG paths with quadratic-midpoint smoothing; `Stroke.pts` keeps flattened samples
for the per-stroke eraser hit-test. Marker = wide + 0.45 opacity + multiply blend. Pointer
routing: ink tool active → widget layer `pointer-events: none`, else reverse — one rule.
The `ToolEngine` contract in boardTypes.ts reserves the P4 instrument design: tools receive
instrument geometry in ctx, so meetlat / geodriehoek / passer emit exact SVG geometry (owner
requirement: real snapping, not display-only overlays).

### Persistence — [boardPersistence.ts](../../src/board/boardPersistence.ts)

`BOARD_FORMAT_VERSION 1`. **`parseBoardFile` is strict at the top and forgiving inside**:
wrong/missing version, no pages or a malformed page → `null`; inside a sound page a widget
with an unknown kind, non-finite x/y/w/z or an exercise without a block is dropped, a stroke
without id/path is dropped (strokes from early builds get `pts: []`), and `activePageIdx` is
clamped. Autosave skips silently on quota. "Mijn borden" presets (`rekenraak_board_presets_v1`,
max 30, newest first): `saveBoardPreset` returns `false` when the write is refused and the
bottom bar shows a Dutch alert ("Kon het bord niet bewaren (opslag vol?) — bewaar het als
bestand via Exporteren."). File export/import (`rekenraak-bord.json`). No share link (stroke
and image payloads exceed URL limits). Backgrounds ([backgrounds.ts](../../src/board/backgrounds.ts)):
blanco / raster / lijnen / schrijflijnen (2- and 4-line with a light-blue x-height band) /
cornell × white/black × size (0.75 / 1 / 1.5), pure CSS gradients, per page.

**localStorage keys** — all `rekenraak_board_*`: `autosave_v1`, `presets_v1`,
`favorites_v1`, `names_v1`, `colors_v1` (teacher-saved ink colours).

### Not in the print flow

[WhiteboardView.tsx](../../src/board/components/WhiteboardView.tsx) is `.no-print` (fixed
overlay, z 200): Ctrl+P or Afdrukken with the board open prints the worksheet underneath,
never the board (§9). The board itself has no print path.

### Roadmap

P3: line/arrow tool, shapes (plane figures + solid-figure stamps), more dagritme widgets.
P4: snapping instruments (ToolEngine ctx), pdf.js backgrounds, more klasmanagement.

---

## 15. Oefenmodus (practice kiosk) — branch `rc-oefenen`

"RekenRaak – Oefenmodus": the teacher picks a few exercise types and their settings, shares a
link or QR, and a pupil practises on a phone, tablet or Chromebook, one exercise per screen,
answering on screen. The pupil's device generates the exercises with the same generators and
draws them with the same viewers; results stay on that device. No backend, no account.
Plan and owner decisions: `~/.claude/plans/oefen-app-kiosk.md` (K1–K5, Phase C).

### Entry points

- **Teacher:** sidebar-foot **Oefenmodus** button (the row above the wordmark; hidden in a locked
  curriculum) → `OefenBuilderModal`; and **Mijn bladen › Oefensessies** (Nieuwe oefensessie,
  Delen, Bewerken, hernoemen, verwijderen).
- **Pupil:** `oefenen.html#oefen=<payload>` — a separate Vite entry with its own React root
  ([src/oefenen/main.tsx](../../src/oefenen/main.tsx)). It never imports `App`, the worksheet
  store or autosave, so a kiosk can never overwrite a teacher's sheet; it loads `index.css` (tokens,
  sheet fonts) plus `kiosk/kiosk.css`. `main.tsx` decodes the hash before the first paint (a valid
  link never flashes the error screen); `OefenApp` follows `hashchange`.

### Data flow

```
OefenBuilderModal ── rows: leaf + draft block (store.draftBlocks, real Config) + limit + kans
   │ buildSessie (oefenBuild.ts): drop rows whose descriptor.supported(c) is false, weights → whole %
   │ that sum to 100, instruction frozen to text, createdAt floored to the minute
   ▼
OefenSessie ── toWire (positional) → JSON → DEFLATE → base32 ── sessieLink → origin/oefenen.html#oefen=…
   │                                      (Opslaan → rekenraak_oefen_sessies_v1, §10)
   ▼
OefenShareModal: link + Kopieer, QR (canvas, Kopieer QR → PNG or download), Groot tonen, Afdrukken (A5)
   ▼  pupil scans / opens
decodeSessie → fromWire → parseSessie (strict, Dutch errors, version gate)
   ▼
useOefenStore.load → latest stored run? (done → locked stats · timer passed → finish · current → same exercise)
   ▼ Start
next(): nextType (scheduler) → nextExercise (generator on a throwaway block) → ExerciseCard + AnswerInput
   ▼ Controleer
answer(): checkAnswer(descriptor) → recordAnswer → saveRun → Juist!/Fout flash that moves on by itself (none in testMode);
   a wrong 1st try with 2 kansen → 'retry' flash → the same exercise again (Kans 2 van 2)
   ▼ all limits / total reached, or timer 0
finish(): locked StatsScreen (De tijd is om! / Klaar!) — reload stays there; Opnieuw / Wissen
```

### The kiosk descriptor (`REGISTRY[typeId].kiosk`, [types.ts](../../src/services/oefenen/types.ts))

| Field | Contract |
|---|---|
| `input` | the typical input: `number` · `number+rest` (quotiënt + rest, both must match) · `choice` · `missing-operand` (the blank of a puntoefening) · `text` (a word on the device keyboard: Romeins, a unit) · `time` (uur + min) · `multi-number` (one field per blank) · `interactive` (Phase C: the pupil answers ON the exercise, see `interact`) |
| `inputOf(ex, c)?` | per-exercise refinement (a puntoefening or met-rest row in an hr block, a unit-blank herleiding) |
| `choices?` / `choicesOf(ex, c)?` | the buttons, in order; `choicesOf` for per-exercise buttons (the row's numbers in vergelijken kiezen) |
| `labels(ex, c)?` | multi-number field names (kg / g, euro / cent); named fields get a caption, numeric ones read left to right |
| `separator(ex, c)?` | the sign between multi-number fields (ordenen `<` / `>`) |
| `keys(c)?` | extra keypad keys `,` `/` `-` `' '` — from the SETTINGS only, never the exercise, so the keypad never hints at the answer |
| `answerOf(ex, c)` | every accepted spelling (`'2,5'`, `'2.5'`); number+rest = exactly `[q, r]`; time = every accepted `h:mm` (8:05 and 20:05); multi-number = one entry per field, alternatives joined by `\|` |
| `display(ex, c)` | plain text for the stats' error rows ("47 + ? = 85") |
| `interact.kind` | `tap` (one part) · `tap-multi` (any number of parts; an empty set can be right) · `fill-cells` (type into the viewer's own blanks) · `order` (tap in sequence) · `build` (lay pieces from the tray; the laid VALUE counts, not the make-up) · `drag` (move a handle; compared part by part within `tolerance`) |
| `interact.answerOf` / `fromState` | the canonical answer and the pupil's answer from the viewer state, same shape: parts joined by `INTERACT_SEP` (`' · '`). tap-multi compares order-free; fill-cells part by part as numbers, `\|` = alternatives, an empty alternative = the cell may stay blank (`'\|1'` = a carry the pupil may skip). `fromState` = `''` means nothing given yet (Controleer stays off, except tap-multi) |
| `interact.keys?` | every key the viewer marks (tests tap through them); fill-cells: also the cell order Tab walks and the keypad's first cell |
| `interact.cellOf?(key)` | fill-cells: `{ length?, scratch? }` per cell: characters it holds (a full cell hands the keypad on) and whether it is scratch (a carry: off the Enter / auto-advance path, tapped). From the cell's role only, never its value |
| `interact.pieces?(ex, c)` / `KioskPiece` | build: the tray in display order, `{ key, label, value, max? }` (value = what one piece adds: cents or units; `max` = most the pupil can lay, MAB 9 per place). From the SETTINGS (or the shown note), never the answer. The picture comes from `EXERCISE_UI[typeId].TrayPiece` (the registry stays free of React); absent = the label |
| `interact.tolerance?(ex, c)` | drag: how far a part may lie from `answerOf` and still be right, in the part's own unit (minutes for an `h:mm` part on a 12-hour face, degrees, grams); absent = 0. check.ts `nearPart` |
| `interact.show?(answer)` | stats text of an answer string (the tapped number, not its index); absent = the parts |
| `prepare?(c, rng)` | the kiosk-adjusted constraints for ONE exercise, drawn with the scheduler's RNG; `nextExercise` calls it per draw and generates from the result, which is also what `answerOf` / `display` / check receive and what `current` stores. geld-wissel uses it to pick one of the teacher's `exerciseBills` (the sheet gives exercise i the i-th bill) |
| `extraKeys?(ex, c)` / `KioskExtraKey` | fill-cells action keys beside the character keys: `{ id, label, hotkeys?, hint?, apply(state, activeCell, ex, c) }`; `apply` returns the new card state or `null` (no change). The Keypad draws each, `Kiosk` maps the hotkeys while a card cell is active, `pressExtra(id)` runs it. From the operator / settings, never the answer. Cijferen aftrekken: Lenen |
| `kioskInstruction?` | the card header when the paper instruction names a pen verb (omcirkel, kleur, vul in) but the kiosk asks a tap or a typed cell; string or `(ex, c) => string \| undefined`. A teacher's own wording wins; the leaf's default gives way to this (`kioskInstructionOf`) |
| `interact?` / `interactOf(c)?` | required whenever `input` / `inputOf` can be `interactive`: `{ kind, answerOf, fromState, keys?, cellOf?, show? }` (rows below). `interactOf` picks per SETTINGS (plaatswaarde: tap a letter or fill the tabel; undefined falls back to `interact`); read both through `kioskInteractOf(d, c)` |
| `supported(c)?` | settings this descriptor can check (splitsen: four layouts; breuken: kleuren / herkennen / hoeveelheid); `kioskSupports` evaluates it over the registry defaults + the leaf's; the builder excludes an unsupported row with a hint |

[check.ts](../../src/services/oefenen/check.ts) normalises before comparing: numbers drop
spaces of any kind, accept `,`/`.`, leading/trailing zeros and the `−`/`–` glyphs; fractions
normalise `1  3 / 4`; text is case- and space-free; times compare hours and minutes as numbers.
The store's `currentInput()` turns the descriptor into fields (`FIXED_LABELS` for quotiënt/rest,
uur/min; for multi-number only the COUNT of `answerOf` is read) and `sanitizeAnswer` keeps what
a field may hold (12 chars, 24 for words; `.` types as `,`; time fields 2 digits and the keypad
moves uur → min). Physical keyboard (`useKioskKeys`): digits and the extra keys type, Backspace,
Enter = Controleer then Volgende (Enter in a multi-field moves to the next empty field), a key
equal to a choice (`<` `=` `>`) picks it. Number fields use `inputMode="none"` (the keypad is the
touch input), text fields the device keyboard.

### Slot-keyed state

A session may hold the same typeId, even the same leaf, twice with other settings. Everything per
type — limits, weights, `perType` stats, history entries — is keyed by **slot** = the index in
`OefenSessie.types`, stable because a shared session never changes.

### Scheduler ([scheduler.ts](../../src/services/oefenen/scheduler.ts), pure, injected RNG)

- **Pool** = slots under their limit. `plannedTotal` = the sum of the limits when every type has
  one (capped by `total`), else `total`, else `null` = endless (the timer or the pupil ends it).
- **afwisselen**: round-robin in session order from the previous slot (never the same type twice
  while ≥ 2 remain). **willekeurig**: weighted draw (all weights 0 = equal); without
  `allowRepeatType` a draw equal to the previous slot is re-drawn once while the pool has ≥ 2.
- **nextExercise** runs `REGISTRY[typeId].generate` on a throwaway block (`blockFor`, SYNC with
  `addBlockFromType`; constraints through `seedConstraints`), re-drawing up to `MAX_REDRAWS` (20)
  times to avoid an `exerciseKeyOf` already seen in this run, else accepts the repeat (flagged).
  Generators call `Math.random` directly, so a seeded RNG is swapped in and restored.
- **isDone**: `finishedAt` set, the timer passed (`startedAt + timerMin`), or `nextType` = null.

### Stats storage ([stats.ts](../../src/services/oefenen/stats.ts), pupil device)

`rekenraak_oefen_<sessionId>` → `{ v: 1, runs: OefenRun[] }`, the **last 5 runs** by index.
A run = `{ index, stats: { startedAt, finishedAt?, perType[slot]: { made, correct, wrong,
secondTry?, errors[{ exercise, given, expected, at, secondTry?, second? }] }, history[{ slot, typeId, exerciseKey, correct, ms, secondTry? }] },
timerEndsAt?, current?, done }`. `current` (exercise + the constraints it was generated with)
makes a reload show the same exercise; it is cleared once answered so nothing counts twice.
`saveRun` replaces by index and, on a full quota, drops the oldest runs first. Opnieuw = a new run
index (older runs stay stored; the UI shows the newest only); Wissen = `clearRuns` (two taps).
Never the worksheet autosave.

### Wire format v1 ([session.ts](../../src/services/oefenen/session.ts))

Positional arrays, trailing defaults trimmed, `null` = default in a middle slot:
`session = [v, id, created, flags, rows, title?, timerMin?, total?, attempts?]` (`attempts` = 2 or omitted, appended last so older links still decode),
`row = [leaf, diff?, weight?, limit?, label?, instruction?, removed?, typeId?]`.
`created` in whole minutes when it falls on one; `flags` bits 0 willekeurig · 1 allowRepeatType ·
2 testMode · 3 statsLocked. `leaf` = index into **`KIOSK_LEAF_TABLE_V1`**, else the leafId string.
`diff` = flat `[key, value, …]` of the constraints that differ from the leaf's **seed**
(`seedConstraints` at `DEFAULT_BASE`, no grade, the leaf's defaults), keys by index into
**`KIOSK_KEY_TABLE_V1`** else the string; `removed` = seed keys the session lacks. `weight` is left
out when it equals the equal split, `label` when it equals `kioskLabelOf(leaf)`, `instruction`
when it equals the leaf's default (`0` = none), `typeId` when it is the leaf's. Both tables
are **frozen, append-only** (an index in a shared link must keep meaning the same leaf/key);
`oefenen.session.test.ts` pins full copies. Transport: `JSON` → raw DEFLATE (`fflate`, level 9)
→ RFC 4648 base32 (A–Z 2–7, no padding, decoded case-insensitively) → `#oefen=`; at most
`MAX_SESSIE_BYTES` (30 000) or no link. Base32 is upper-case so [qr.ts](../../src/services/qr.ts)
(`qrcode-generator`, level M) codes the payload as an **alphanumeric segment** (5.5 bits/char)
after a byte-mode URL head. A 6-type session is a ~260-char link, QR version 10 (57×57).
Decode errors are Dutch and land on the ErrorScreen: a newer `v` / a type without a descriptor →
"Werk de app bij", anything else → "Deze oefenlink is ongeldig (…)". Dependencies added:
`fflate` (kiosk + teacher) and `qrcode-generator` (teacher bundle only).

### The card and the scaffold rule

`ExerciseCard` builds a one-exercise block and renders `EXERCISE_UI[typeId].Viewer` at a virtual
340 px (a half-width cell) inside `BlockWidthProvider`, then scales the drawn extent to the card
(`transform: scale`, ≤ 3.2×); the card is `inert` (the sheet's editable operands take no focus)
and wrapped in `BlockErrorBoundary` keyed per exercise (`inert` unless the exercise has an `interact`: then it is live, see Phase C below). It sets `<ScaffoldProvider value={false}>`:
help the sheet draws beside the exercise (met-rest estimate, tussenstap, cijfer grid, woordbank,
tick table) disappears (§8). **Viewer rule:** no interaction or scaffold change without such a
context; the sheet path is untouched, which `npm run visual:gate -- --all` proves (768 cells,
0 flagged on 2026-10-08, again after Phase C). Known gaps (scaffold still shown, physical keyboard not auto-advancing
in time fields, …) are in REVIEW.local.md §F.

### Layout and flow details

Landscape-first: card left, answer panel right; portrait stacks (fallback). Top bar: title,
`n / total` (or `n`), countdown (red under 1 min), **Resultaten** (hidden while `statsLocked`
and the run is not done). Start tries `requestFullscreen`. Feedback is juist / fout only, never
the right answer; `testMode` skips it and goes straight on (one try). Mid-run Resultaten is a peek
(Verder oefenen); the end screen is locked and survives a reload.

### Phase C: answering on the exercise (`interact`)

An `interactive` descriptor lets the pupil tap / fill / order the viewer's own parts instead of
typing into the answer panel.

- **Context** ([ViewerInteractionContext.tsx](../../src/components/viewer/ViewerInteractionContext.tsx), §8):
  `ExerciseCard` provides `{ kind, state, set, activeCell, focusCell, typeCell }` from the store
  (`interaction: { selected, cells, order, build, marks?, drag? }`, `activeCell`) when `kioskInteractOf` answers and
  `kioskInputOf` is `interactive`; otherwise no provider.
- **Viewer marks** its parts once with `interactionProps(ctx, key, 'tap' | 'order')` and its blanks with
  `<KioskCell cellKey>`. Keys are positions (`'0'`, `'2'`), never values, so the DOM does not hint at the answer.
- **Check**: Controleer compares `fromState(state)` with `answerOf` through the same `checkAnswer`;
  `interactionAnswer()` returns `{ given, ready }` (ready = non-empty, or any tap-multi).
- **Cell navigation (fill-cells)**: `cellPlanOf()` builds `{ keys, flow, length }` from the descriptor's `keys` +
  `cellOf` (`flow` = keys minus scratch cells). The keypad types into `activeCell` through `typeCell` /
  `writeCell`; a full cell (`length`) hands on to the next flow cell. **Enter** (`enterCell`) moves to the next
  flow cell and after the last checks (nothing to check yet: back to the first cell); **Tab / Shift+Tab**
  (`moveCell`) walks every key including carries; Enter / Space on a tap part toggles it with
  `preventDefault`, which keeps Kiosk's window handler from reading it as Controleer. `KioskCell` takes the
  focus when it becomes active and scrolls into view.
- **Size**: `ExerciseCard` raises the scale until the smallest `input[data-kiosk-cell]` is **40 px**
  (`MIN_CELL_PX`; WCAG 2.5.8 + room for the digit); a grid taller than the card then scrolls inside it
  (`.kiosk-card-body.is-scrolling`, from its top-left) instead of shrinking. A tappable part counts whole in
  the extent measure (its padding carries the selection ring).
- **Kiosk-only geometry**: [cijferLayout.ts](../../src/services/cijferen/cijferLayout.ts) holds the column
  geometry CijferViewer and the descriptor share; [cijferCells.ts](../../src/services/cijferen/cijferCells.ts) the
  ruitjes (roles digit / carry / borrow / pp / quotient / rest; keys `a` answer digit · `p` partial product ·
  `q` quotient digit · `c` carry · `b` exchanged top digit · `r` rest; SYNC with CijferViewer's kiosk branch).
  `cijferKiosk({ strictCarries })`: by default only a WRONG carry / borrow fails (a blank one is fine);
  `true` fails a blank one too. Deelbaarheid-kleuren shows at most `KIOSK_MAX_NUMBERS` (20) numbers, never
  fewer than two multiples (`kioskNumbers`).

- **Build (C3)**: the answer panel shows [Tray.tsx](../../src/oefenen/kiosk/Tray.tsx) instead of the keypad
  (`currentInput().pieces`); store actions `lay(key, ±1)` (capped by the piece's `max`, only in phase `exercise`),
  `clearBuild()` (the panel's Wissen) and Backspace = take back the newest kind laid. `fromState` sums
  `count × value` (total cents, the number): `'` until something is laid; the tray never shows the running total,
  because adding up IS the exercise. Geld-tekenen offers the ticked coins up to the top amount, geld-wissel
  everything below the shown note down to a hundredth of it (the note itself is not in it), geld-teruggeven
  (tekenen-schrijven) everything below the note paid with, mab-tekenen D / H / T / E up to `maxNumber`.
- **Drag (C4)**: handles on the viewer's own SVG via `kioskDrag.ts` (§8); values are snapped in the viewer's pure
  helpers ([clockDrag.ts](../../src/services/clock/clockDrag.ts), [hoekDrag.ts](../../src/services/vormleer/hoekDrag.ts)),
  the descriptor's `fromState` turns them into the answer string and `tolerance` decides what counts. A hand
  the pupil does not set stays printed and fixed (`handChoice`); `fromState` is `'` until every hand they set
  is placed. Klok: grote wijzer in 5-minute steps (1 with nauwkeurig) and the kleine wijzer travels with it;
  3:15 and 15:15 are one face position. Thermometer: 1 °C steps, exact. Weegschaal: snapped to the dial step,
  within half a step. Hoek: 5° steps, right anywhere inside the class (scherp 5–85°, recht 90°, stomp 95–175°,
  gestrekt 180°). Keyboard alternative: each handle is a slider, arrows step it.
- **Lenen (cijferen aftrekken)**: the key is always present for a subtraction, **always exchanges when pressed (needed
  or not) and never hints** (`cijferLenen`, [cijferCells.ts](../../src/services/cijferen/cijferCells.ts)): on the
  active column the column to its left gives one (a 0 on the way becomes 9) and this column gets ten more, written in
  the exchange cells `b<i>`; `marks` (`got` / `lent`) make the card strike the old printed digits
  (`borrowedProps` → `data-kiosk-borrowed`). `null` (no change) for another operator, no column cell, a column that
  already got ten, or nothing left of it to lend. Hotkeys `l`, `L`, `-`; the active cell stays so the pupil types the
  column's digit next. The answer check never reads `marks`.

**Who answers how.** 108 sidebar leaves are capable at their defaults (`kioskCapableLeaves().length`);
`KIOSK_LEAF_TABLE_V1` has 110 entries (`lengte-meten` and `omtrek` are in it but only capable with labelled sides).

| Way | Leaves |
|---|---|
| **tap** | plaatswaarde plaats-omcirkelen (2) · vergelijken kiezen · getalfunctie aankruisen · controleren (2: juist / fout) · maateenheid kiezen |
| **tap-multi** | even-oneven rooster · deelbaarheid tabel / rooster / omcirkelen / kleurraster · breuken kleuren |
| **order** | ordenen nat / dec / rat / geh (4) · breuken-rangschikken |
| **build** | geld-tekenen · geld-wissel · geld-teruggeven when antwoordType = tekenen-schrijven · mab-tekenen |
| **drag** | klok-analoog-tekenen (wijzers) · vormleer-hoeken-tekenen (the been) · temperatuur-kleuren (kwik) · massa-weegschaal-tekenen (wijzer) |
| **fill-cells** | cijferen × 8 · splitsen × 4 · afronden rooster × 2 · plaatswaarde tabel · patronen × 3 + kettingsommen · getallenassen × 4 · getallenrijen × 4 · verbanden tabel / paren / procenten-verbanden |
| **typed / choice** (answer panel) | the rest: hoofdrekenen, procenten, schattend, rekenvolgorde, mab, romeinse, breuken-bewerken, breuken herkennen / hoeveelheid, geld, temperatuur, weegschaal, oppervlakte, herleidingen, klok, tijdsduur, deelbaarheid veelvouden (typed) · vergelijken getallen / representaties, vormleer, even-oneven cirkels (choice) |

### Attempts ("kansen") and the juist/fout flash

`OefenSessie.attempts` is 1 | 2 (`attemptsOf(s)`; `testMode` forces 1: without feedback the pupil never
learns the first try was wrong). Store phases: `start | exercise | feedback | retry | stats | locked`.
`answer()`: right → `feedback` (Juist!); wrong with a 2nd kans left → `retry` (flash "Fout — probeer nog eens",
the same exercise with empty input; `shown.wrongFirst` survives a reload; the card says "Kans 2 van 2");
wrong on the last try → `feedback` (Fout). **There is no Volgende button:** the flash moves on by itself after
`FLASH_MS = { juist: 700, fout: 1200, retry: 1000 }` (a CSS bar runs out); a tap on it or Enter calls
`skipFlash()` (feedback → `next()`, retry → the second try; Enter skips even with a button focused).
Opening Resultaten mid-flash remembers the phase (`statsFrom`); Verder oefenen resumes as if the flash had ended.
Stats: an exercise counts once; right on the 2nd try is `correct` AND `secondTry` (`OefenTypeStats.secondTry`,
history `secondTry`); wrong twice is an `OefenError` with the first answer in `given` and the second in
`second`. StatsScreen adds a "Juist na 2e kans" column when the session has 2 kansen and lists **Vorige keren**
(earlier runs on this device; tap one for its numbers, read-only). Teacher side: the builder's "Kansen per
oefening" 1 / 2 control; the per-type limit is a slider **1–50 with ∞ at the right end** (`LIMIT_MAX`); Opnieuw /
Wissen only on the end screen; rows are named by `kioskLabel` (domain · type · detail) and the library name
becomes the session title.
