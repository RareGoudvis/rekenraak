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

Key files: [App.tsx](../../src/App.tsx) (viewer routing via registry),
[Inspector.tsx](../../src/components/configurator/Inspector.tsx) (Genereer + config mount
via registry), [sidebar.tsx](../../src/components/layout/sidebar.tsx) (leaf →
`addBlockFromType`), [generateDispatch.ts](../../src/services/generateDispatch.ts),
[exerciseRegistry.ts](../../src/config/exerciseRegistry.ts) +
[exerciseUI.tsx](../../src/config/exerciseUI.tsx) (the registry).

---

## 3. State — the Zustand store

Single store: [useWorksheetStore.tsx](../../src/store/useWorksheetStore.tsx). All state
lives in memory.

| Slice | Type | Purpose |
|---|---|---|
| `blocks` | `MathBlock[]` | Ordered exercise blocks on the sheet |
| `activeBlockId` | `string \| 'document' \| null` | Drives Inspector context. `setActiveSelection` with a real block id ALSO sets `inspectorTab: 'oefening'` (content first); `'document'`/`null` leave the tab alone, since the block tabs are disabled without a selection |
| `header` | `HeaderData` | naam/klas/nummer/datum toggles, title, **field order + widths** |
| `footer` | `FooterData` | three configurable slots (`slotLeft`/`slotCenter`/`slotRight` + their texts) and `brandSlot` — where the "Gemaakt met RekenRaak.be" credit sits; the credit always prints, only its position is a choice |
| `docSettings` | `DocSettings` | titlePosition, headerStyle, opdrachtTitelStyle, showScores, showDividers, showColumnDividers, numberBlocks, gaps, header/titel/footerCustom (`RegionStyle`), bodyFontScale (global exercise-body zoom; per-block override in `constraints.bodyFontScale`), fontSizeMath/fontSizeText (pt; feed `--sheet-size-math` / `--sheet-size-text` on `.print-area-shell`, theme.css; every viewer size is a factor of them — Blad › Opdrachten › Lettergrootte) |
| `showSolutions` | `boolean` | Global red-solution overlay (preview + print) |
| `baseSettings` | `BaseSettings` | Global default difficulty (max/getalsoort/masks/bridges/decimalen/breuk-opties) snapshotted into each new block — see §13 |
| `selectedGrade` | `Leerjaar \| null` | Soft leerjaar (1–6) starting point: seeds `baseSettings` + filters sidebar leaves (`gradePresets`); persisted in autosave. Not a lock |
| `curriculum` | `CurriculumLock \| null` | Non-null + `locked` = restricted parent mode (whitelisted sidebar + frozen difficulty) — see §13 |
| `draftBlocks` | `MathBlock[]` | Off-sheet scratch blocks the curriculum builder edits via the real config plugins; not rendered/autosaved/historied — see §13 |
| `sidebarTab` | `'oefeningen' \| 'overzicht'` | Which sidebar tab is open. The strip renders in the TopBar (above the sidebar column), the panel renders the content — see §9 "Shell" |
| `inspectorTab` | `'blad' \| 'weergave' \| 'oefening'` | Which inspector tab is open. Labels read Oefeningen / Opmaak / Blad (content first); default `oefening` |
| `bladSection` | `'koptekst' \| 'opdrachten' \| 'voettekst'` | Which Blad sub-tab shows. Set by its own tab strip AND by clicking the header/footer **on the sheet**, so both routes land in the same place |
| `_history` / `_historyIndex` | `MathBlock[][]` / `number` | Undo/redo, max `MAX_HISTORY = 50` |

**`undo`/`redo` return a value:** both hand back the id of the block that step actually
changed (or `null`), so the caller can scroll to it and flash it — an undo whose block is
off-screen otherwise looks like nothing happened. It is a return value, not a slice.

**History rule (important):** mutations that change `blocks` call `pushHistory`
(addBlock, remove, move, duplicate, updateBlockSettings, `setExercises`,
updateExercise, `patchExercise`). `setSidebarTab` / `setInspectorTab` (pure view state) /
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
`numberOfExercises` + `pageBreakBefore` + `widthUnits` + `showInstruction` + `skipNumbering` +
`constraints.fitToWidth` (difficulty/wording
frozen; layout and presentation are not difficulty). This single
choke point enforces the lock without touching the ~16 config plugins. Draft-block
edits bypass the gate (authoring runs unlocked).

**`MathBlock.constraints` is `BlockConstraints`** (since 2026-09-12; was `any`) —
`Record<string, unknown> & CrossCutting`, where `CrossCutting = { bodyFontScale?, subType?, fitToPage?, fitToWidth? }` —
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
| `vormleerExercises` | `VormleerExercise` | `vormleer-punt-lijn`, `vormleer-hoeken`, `vormleer-figuren` (kind-discriminated) |

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
  `{ exerciseField, generate, defaultConstraints, defaultCount }`. Imported by the
  store and `generateDispatch`.
- [exerciseUI.tsx](../../src/config/exerciseUI.tsx) — **React**: `{ Viewer, Config }`.
  Imported by `App.tsx` and `Inspector.tsx`.

The split exists to avoid a cycle: configs import the store, so if the store
imported a registry that pulled in configs it would loop. The store only needs the
pure-data file.

The four consumers are now **table lookups, not branches**:

| Consumer | File | Reads |
|---|---|---|
| Generate | [generateDispatch.ts](../../src/services/generateDispatch.ts) | `REGISTRY[typeId].generate` + `.exerciseField` |
| Config mount | [Inspector.tsx](../../src/components/configurator/Inspector.tsx) | `EXERCISE_UI[typeId].Config` (+ optional `StyleConfig` = the family's Differentiatie rows in the Opmaak tab, `AdvancedConfig` = the Geavanceerd accordion body whose presence shows the accordion, `advancedApplies` = breuken-only guard). Inspector mounts all by registry lookup; it has no typeId branches. A Config may mount OTHER families' plugins for a sub-bag through `ConstraintScope` (gemengd's per-variant tabs) — the plugin code stays unaware |
| Viewer routing | [App.tsx](../../src/App.tsx) | `EXERCISE_UI[typeId].Viewer` |
| Block defaults | [useWorksheetStore.tsx](../../src/store/useWorksheetStore.tsx) `addBlockFromType` | `REGISTRY[typeId].defaultConstraints()` + `.defaultCount` |

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
   **one row** to `EXERCISE_UI` (exerciseUI.tsx), under the same `typeId` key.
6. **Sidebar tree** — add the leaf (with `typeId` + optional `defaultConstraints`)
   to `APP_STRUCTURE` in [appstructure.ts](../../src/config/appstructure.ts). The leaf's
   `defaultConstraints` are merged on top of the registry defaults at add time.

Do **not** add `if (typeId === …)` branches in dispatch / Inspector / App — that
pattern is gone. A missing registry row makes the block render/generate nothing
(no silent wrong-branch); search either registry file to confirm the key exists.

`defaultConstraints` is a **factory** (`() => ({...})`), not a literal, so each new
block gets fresh mutable mask objects (`operand1Mask: {}` etc.) rather than
sharing one reference.

---

## 6. The generator contract (shared by every generator)

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
| `cijferen-optellen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | operator, numberType, maxRange, numberOfTerms, bridges, operand0-3Mask |
| `cijferen-aftrekken-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-vermenigvuldigen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-delen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above + withRemainder |
| `klok-kloklezen` | `clockExercises` | `generateClockExercises` | `ClockExerciseItem` | `ClockConfig` | clockType, is24hour, timeTypes, minuteDirection, handChoice |
| `breuken` | `fractionExercises` | `generateFractionExercises` | `FractionExerciseItem` | `FractionConfig` | subType, shape, min/maxDenominator, objectShape, maxTotal, level |
| `splitsen` | `splitsenExercises` | `generateSplitsenExercises` | `SplitsenViewer` | `SplitsenConfig` | maxGetal, operand1/2Mask, fixedTotal, layout (basic/**splitsboom**/verliefde-harten/positie-*), rowsPerBox; `splitsboom` = single split-tree, operand1Mask=top, operand2Mask=sides, `blankPositions[]` (top/left/right, random per item, maxGetal≤1000) |
| `geld-herkennen` | `geldExercises` | `generateGeldExercises` | `GeldViewer` | `GeldConfig` | maxGetal, format, allowedDenominations, geldLayout |
| `geld-tekenen` | `geldExercises` | `generateGeldExercises` | `GeldTekenenViewer` | `GeldConfig` | maxGetal, scaffolding, allowedDenominations |
| `geld-wissel` | `geldWisselExercises` | `generateGeldWisselExercises` | `GeldWisselViewer` | `GeldWisselConfig` | exerciseBills, exercisesPerRow |
| `geld-teruggeven` | `geldTeruggevenExercises` | `generateGeldTeruggevenExercises` | `GeldTeruggevenViewer` | `GeldTeruggevenConfig` | min/maxPriceEuros, payWithOptions, centenDeel, antwoordType |
| `mab-herkennen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=herkennen) | `MabConfig` | maxNumber, operand1Mask, mabStyle, scaffolding |
| `mab-tekenen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=tekenen) | `MabConfig` | maxNumber, operand1Mask, mabStyle, scaffolding |
| `ordenen` | `ordenenExercises` | `generateOrdenenExercises` | `OrdenenViewer` (click-to-edit) | `OrdenenConfig` | numberType, count(2–8), operatorMode, maxGetal, minGetal, decimalPlaces, numberMask, min/maxDenominator, unitFractionsOnly, allowMixed |
| `breuken-bewerken` | `breukBewerkExercises` | `generateBreukBewerkExercises` | `BreukBewerkViewer` (answer = writing line) | `BreukBewerkConfig` | subType (gemengd/gelijknamig/vereenvoudigen — sidebar leaf), direction (gemengd), gemengd+vereenvoudigen getalopbouw via `FractionMaxField` (`maxNumerator`/`maxDenominator`); vereenvoudigen presets (`tablesOnly`) + `allowIrreducible`; gelijknamig min/maxDenominator range + optional `targetDen` (fixed common noemer, else KGV). Reuses `gcd`/`simplifyFraction`/`toMixedNumber` (exported from mathEngine) |
| `breuken-rangschikken` | `ordenenExercises` | `generateBreukenRangschikkenExercises` | `OrdenenViewer` (reused) | `BreukenRangschikkenConfig` | fractionMode (stambreuken/gelijknamige/gelijknamig-te-maken/speciale), count(2–5), operatorMode, min/maxDenominator |
| `getallenrijen` | `getallenasExercises` | `generateGetallenrijExercises` | `GetallenrijenViewer` | `GetallenrijenConfig` | numberType (natural/decimal/rational/geheel — sidebar leaf), maxGetal, step (+custom jump all types), direction (stijgend/dalend/beide), numberMask (anchor; decimal mask dp = step decimals), rational getalopbouw via `FractionMaxField` (noemer=fractionStep, teller=maxTeller), ticks, `showFrame` (Differentiatie toggle, rounded pill on/off); getallenas without the axis line |
| `lengte-meten` | `meetExercises` | `generateLengteMetenExercises` | `MetenViewer` | `MetenConfig` | measureModel: **meten** (write the length) or **gegeven** = juist/fout (stated `claim` ±, pupil circles juist/fout); precision (cm/mm), min/maxLength, maxCorners (0–4 → polyline segments). Drawn to scale (1cm≈37.8px). Scaffold/answer keys (`perSideScaffold`, `answerMode` single/sum, `answerUnit` cm/plain) live in the Inspector **Differentiatie** card |
| `omtrek` | `meetExercises` | `generateOmtrekExercises` | `MetenViewer` | `MetenConfig` | measureModel (op-schaal/gegeven), precision, length-per-side, `shapes[]` (driehoek · vierkant/rechthoek/ruit/parallellogram/trapezium/vierhoek · vijf-/zes-/zeven-/achthoek · cirkel met middelpunt) + the Differentiatie scaffold/answer keys. Constructors return exact `sides[]` (hele cm never drifts); perimeter = Σ sides or π·d |
| `deelbaarheid` | `deelbaarheidExercises` | `generateDeelbaarheidExercises` | `DeelbaarheidViewer` | `DeelbaarheidConfig` | layout (tabel/veelvouden — sidebar leaf only), divisors[], maxGetal, base, terms, givenCount |
| `getalpatronen` | `patroonExercises` | `generatePatroonExercises` | `PatroonViewer` | `PatroonConfig` | numberType (nat/dec/geheel — leaf), maxGetal, minGetal, ticks, **steps** (1–4 repeating cycle), **ops** (`+ − × :`), **opSettings** per op `{max,mask}` (+/− mask spans the block place range incl. decimals), `maxDecimals` (decimal). Differentiatie (Inspector): `showArrows`, `showOperators`, `operatorsShown`, `operatorStyle` (symbol/full). No frame; `–`/arrow connectors |
| `deelbaarheid-kleuren` | `deelbaarheidKleurExercises` | `generateDeelbaarheidKleurExercises` | `DeelbaarheidKleurViewer` | `DeelbaarheidKleurConfig` | viewMode (strip/markeren/raster), `divisors[]` (2–12, rotated per row), maxGetal/perRow (strip·markeren) or rasterCount/rasterCols, `showRest` (rest: ___; hidden for raster) |
| `splitsen` (positie-*) | `splitsenExercises` | `generateSplitsenExercises` | `SplitsenViewer` | `SplitsenConfig` | layout positie-tabel/-benen/-math (sidebar leaf), maxGetal(≤1e9), decimalPlaces, operand1Mask, benenVariants[], mathForms[], mathDirection |
| `getallenas` | `getallenasExercises` | `generateGetallenasExercises` | `GetallenasViewer` | `GetallenasConfig` | numberType (natural/decimal/rational/geheel), maxGetal, minGetal, step, fractionStep, direction(+beide), allowMixed, gelijknamig, hardMode, ticks |
| `temperatuur` | `temperatuurExercises` | `generateTemperatuurExercises` | `TemperatuurViewer` | `TemperatuurConfig` | variant (kleuren/aflezen/verschil — sidebar leaf), mode1/mode2 (verschil), includeNegatives, perRow |
| `plaatswaarde` | `plaatswaardeExercises` | `generatePlaatswaardeExercises` | `PlaatswaardeViewer` | `PlaatswaardeConfig` | subType (waarde/plaats/tabel — sidebar leaf), maxGetal, numberMask, decimalPlaces (0–3, kommagetallen) |
| `even-oneven` | `evenOnevenExercises` | `generateEvenOnevenExercises` | `EvenOnevenViewer` | `EvenOnevenConfig` | subType (rooster/cirkels), maxGetal, target (even/oneven), perRow |
| `vergelijken` | `vergelijkenExercises` | `generateVergelijkenExercises` | `VergelijkenViewer` | `VergelijkenConfig` | subType (getallen/kiezen/**representaties**), maxGetal, numberMask, chooseTarget, setSize, decimalPlaces (0–3, kommagetallen); `representaties` = compare two values, `leftRep`/`rightRep` ∈ breuk/kommagetal/plaatswaarde/woorden + per-side getalopbouw (place mask `leftMask`/`rightMask`, OR teller/noemer `FractionMaxField` when that side = breuk → stored as `aFrac`/`bFrac`); config = 2 columns Linkerkant│Rechterkant; `RepValue` + `representations.ts` |
| `afronden` | `afrondenExercises` | `generateAfrondenExercises` | `AfrondenViewer` | `AfrondenConfig` | subType (rooster/simpel), numberType (natural/decimal — sidebar leaf), maxGetal, decimalPlaces, numberMask (natural), roundTargets[] (T/H/D/TD or E/t/h), roosterSize (rooster = one rooster per exercise, 2-up) |
| `romeinse-cijfers` | `romeinseExercises` | `generateRomeinseExercises` | `RomeinseViewer` | `RomeinseConfig` | subType (herkennen/schrijven), niveau (1–4); always-subtractive notation, numberMask |
| `herleidingen` | `herleidingExercises` | `generateHerleidingExercises` | `HerleidingenViewer` | `HerleidingenConfig` | measure (lengte/inhoud/massa/**oppervlakte** incl. ha·a·ca — sidebar leaf), units[] (ladder subset), **maxEnkel** (def 100, single formats) + **maxSamengesteld** (def 1000, compound formats) — power-of-10 breakpoint sliders, formats[] (4), **compoundMode** (2/volledig), writeUnits, scaffolding (geen/tabel-headers/tabel-blanco) + table options `tablePrompt`/`tableAnswer` (blank/filled/hidden)/`tableCellW`/`tableCellH` — all in the **Differentiatie** card. Integer-exact (safe-int guarded); `HerleidingenViewer` auto single-columns wide blocks, renders a centered enriched table, and allows inline edit of given numbers + a unit **dropdown** (`recomputeHerleiding` + `patchExercise`). |

| `schattend` | `schattendExercises` | `generateSchattendExercises` | `SchattendViewer` | `SchattendConfig` | operators[] (+−×:; ×/: keep one factor ≤9), numberType (leaf), maxGetal, roundTargets[] (afronden keys), scaffolding (tussenstappen/enkel-schatting); skips items where nothing rounds |
| `verbanden` | `verbandExercises` | `generateVerbandExercises` | `VerbandenViewer` | `VerbandenConfig` | subType (tabel/paren — leaf), reps[] (breuk/decimaal/procent, ≥2), denominators[] ⊂ {2,4,5,8,10,20,25,100} (terminating only), given (random/rep) |
| `procenten` | `procentExercises` | `generateProcentExercises` | `ProcentenViewer` | `ProcentenConfig` | subType (nemen/welk-percent — leaf), percents[], maxGetal, scaffold (10 %/1 % hulplijn, only when the tussenstap is whole); answer-first → natural results |
| `maateenheid` | `maateenheidExercises` | `generateMaateenheidExercises` | `MaateenheidViewer` | `MaateenheidConfig` | grootheden[] (lengte/massa/inhoud/tijd/temperatuur), answerMode (omcirkelen/schrijven; omcirkelen needs ≥3 units so temperatuur is schrijven-only), subType (eenheid/schatten = value+unit chips); curated item bank in maateenheidData.ts |
| `geld-rekenen` | `geldRekenenExercises` | `generateGeldRekenenExercises` | `GeldRekenenViewer` | `GeldRekenenConfig` | subType (korting/winst/intrest — leaf), percents[] (pool differs per variant), maxEuro, wholeEuros, halfYear (intrest pro rata); cents internal, whole-cent answers guaranteed, `formatEuro` |
| `rekenvolgorde` | `rekenvolgordeExercises` | `generateRekenvolgordeExercises` | `RekenvolgordeViewer` (reads `useBlockWidth()`; digits at the `*1` math factor, SYNC with MathBlockRenderer) | `RekenvolgordeConfig` + `RekenvolgordeStyleConfig` (Kort / Lang / Stappen → `layoutPreset` inline-short 2-up / inline-long 1-up full-width line / stepped N `steppedLines`, 2-up while two rows keep the writing room, like hoofdrekenen) | operators[] (≥1 ×/: enforced), opsCount (2/3), maxGetal, haakjes (only planted when they change the outcome); tokens rendered verbatim |
| `kettingsommen` | `patroonExercises` (reused) | `generateKettingExercises` | `PatroonViewer` (reused) | `KettingConfig` | ops[] (no two equal in a row), opSettings per op, chainLength (3–5; cycle length = ticks−1), maxGetal, blankMiddle; defaults force showArrows/showOperators + operatorStyle 'full' |
| `getalfunctie` | `getalFunctieExercises` | `generateGetalFunctieExercises` | `GetalFunctieViewer` | `GetalFunctieConfig` | functies[] (hoeveelheid/rang/maat/code, ≥2), answerMode (aankruisen = tick-table / schrijven), maxGetal (bounds substituted numbers) |
| `tijdsduur` | `tijdsduurExercises` | `generateTijdsduurExercises` | `TijdsduurViewer` | `TijdsduurConfig` | granularity[] (heel-uur/kwartier/vijf-min/een-min), blanks[] (duur/einde/begin, rotates), maxDuurMin (60/240/720), overMidnight (einde prints "(volgende dag)") |
| `kalender` | `kalenderExercises` | `generateKalenderExercises` | `KalenderViewer` | `KalenderConfig` | subType (maandrooster/datum-rekenen/notatie — leaf), questionTypes[] + questionCount (rooster), month (random/0–11), year (pinned 2026 for stable regeneration); ma-first CSS-grid month |
| `controleren` | `controleExercises` | `generateControleExercises` | `ControlerenViewer` | `ControlerenConfig` | subType (negenproef/omgekeerde — leaf), operators[] (omgekeerde: +/−), maxGetal, foutAandeel (geen/helft/alles; planted deltas never ≡ 0 mod 9), showKruis (inline SVG cross; rests red in solutions) |
| `oppervlakte` | `meetExercises` (reused, + `area`) | `generateOppervlakteExercises` | `OppervlakteViewer` | `OppervlakteConfig` | subType (rooster = 1 cm grid count, whole-cm rect/L-figuur / berekenen = l×b, ½·b·h for rechth. driehoek — leaf), shapes[], min/maxLength sliders, scaffoldFormule (`opp = ___ × ___ = ___`), askOmtrek; SYNC cm→px 37.8 with MetenViewer |
| `weegschaal` | `weegschaalExercises` | `generateWeegschaalExercises` | `WeegschaalViewer` | `WeegschaalConfig` | mode (aflezen = black needle / tekenen = red solution needle — leaf), bereikGram (1000/2000/5000) with dependent stepGram (BEREIK_STEPS), notatie (g/kg-komma/kg-g), exercisesPerRow, boxHeight; values snap to the schaalverdeling |
| `vormleer-punt-lijn` · `-hoeken` · `-figuren` | `vormleerExercises` (shared) | `generateVormleerExercises` | `VormleerViewer` (shared) | `VormleerConfig` (shared) | kind from typeId (registry default), mode (herkennen/tekenen; figuren: benoemen/eigenschappen), concepts[] per kind (leaf presets; figuren classify axis driehoeken-hoeken/-zijden/vierhoeken), answerMode (woordbank/schrijven), randomRotation, showBoog (hoeken; square marker at 90°), showMarks (equal-side ticks + right-angle squares), raster + boxHeight (tekenen), exercisesPerRow; `CONCEPT_NAMES` maps keys → leerplan names |

> Note: matching is now exact-key, so the old substring collision between
> `hr-std-optellen` and `cijferen-optellen-*` (which forced
> `!startsWith('cijferen-')` guards) no longer exists. Inspector still uses a small
> `isHrStd` substring helper for one mental-math-only differentiation control;
> that's a UI affordance, not type routing.

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
  standard equation renderer. `block.layoutPreset`:
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

Fill a row left to right; new row when the width runs out; new page when the page budget
does; `pageBreakBefore` forces a page; a block taller than page 0 (the shortest — it carries
the header) is marked `spans` and owns its page. It does **not** flow on paper: `.page-sheet`
is `height: 297mm; overflow: hidden` in print, so screen and PDF clip it the same way; the
banner says so and carries two buttons — "Verklein dit blok" (App's `fitBlockToPage`: sets
`constraints.fitToPage`, selects the block, then `setInspectorTab('weergave')` because
selecting resets the tab) and "Splitsen" (the same split popover as the Scissors control);
PageSheet tracks the oversize block's id (`oversizeBlockId`) for that, via `onFitBlock` /
`onSplitBlock`. `constraints.fitToPage` ("Verklein om op één pagina te passen") lets
[ScaledBlock](../../src/components/viewer/ScaledBlock.tsx) back its zoom off down to 0.7
(`FIT_FLOOR`, pure helper in `scaledBlockFit.ts`) until the cell fits `PAGE_BODY_PX`.
`PackedBlock.promoted` marks a block the clamp had to widen; the Inspector says so under the
width picker. `ignoreMinWidth` disables the clamp for the width-matrix harness.

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

Each page cell is placed **explicitly** (`gridRow` / `gridColumn` from the packer). With
auto-placement the browser backfills a gap in an earlier row and quietly moves a block off
the row its pagination was costed against.

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
through `onCellMeasure(blockId, width, heightPx, intrinsicWidthPx)`; `useMeasuredHeights`
keeps it per `blockId:width`, **drops every entry when the block's content changes** (a block is
measured before Genereer too — the 67px empty-state line once pinned a vergelijken block to ¼
forever) and `intrinsicOf()` returns the entry that demands the **widest** tier — monotone in
the safe direction, so it cannot oscillate; "most recent" would flip a reflowing type between
tiers. `packPages` takes
the clamp as an injected `minWidthOf` closure so it stays pure; App fills it with
`minWidthUnits(block, measured)`. Reflow rule: a block that fits where it is and lays out
more than 1-up may go **one** tier narrower than it was measured at; the next tier only opens
after a real measurement there, and a clamp-back writes a new key, so it cannot oscillate.
Editorial vetoes (`VETO_MIN` in blockLayout.ts) override a measurement — a number line fits a
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

- **[usePrint.ts](../../src/hooks/usePrint.ts)** — `handlePrint(withSolutions)`: deselects the
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
  - `.no-print` — hidden (sidebar, topbar, modals, block controls, overflow warnings).
  - `.print-root` / `.print-main` — collapse the 3-panel flex shell to block flow.
  - `.page-sheet` — `break-after: page`.
  - `.print-block` — block; `.page-break-before` forces a fresh page (per-block toggle).
  - `.print-opdracht` — `break-after/inside: avoid` (opdracht line never orphaned).
  - `.print-exercise` / `.print-row` — `break-inside: avoid` (never split an item/row).

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

- **Format gate:** `WORKSHEET_FORMAT_VERSION = 3`. `parseWorksheetFile` validates
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
  exercises; `template` = settings only (exercise arrays stripped by
  `stripBlock`), so the recipient configures-then-Genereer to populate.
- **`CurriculumLock`** (`{ locked, allowedTypes: [{typeId, label, lockedConstraints}] }`)
  rides in the payload for locked curriculum share links (§13).
- **Autosave** — single slot `rekenraak_autosave_v1`; `saveAutosave` /
  `loadAutosave` / `clearAutosave`. App.tsx offers to restore on boot if the
  current sheet is empty.
- **Presets** — named library `rekenraak_presets_v1`, `MAX_PRESETS = 20`. CRUD via
  `loadPresets` / `savePreset` / `deletePreset` / `renamePreset`. Managed in
  `PresetModal.tsx` (removed; replaced by [library/](../../src/components/library/)).
- **Share link** — `encodeShareLink` → JSON → **lz-string**
  `compressToEncodedURIComponent` → `#share=…` in the URL hash (never sent to a
  server). `MAX_SHARE_BYTES = 30000` (worksheet JSON compresses ~8×, so this covers
  ~100+ blocks); returns `null` if too big. `decodeShareHash` decompresses + parses;
  App.tsx consumes it on boot (a shared link wins over autosave) with a confirm whose
  wording differs for full / template / locked-curriculum links. `opts.curriculum`
  embeds a `CurriculumLock` (used by the curriculum builder, §13).
- **File export/import** — `exportWorksheet` (JSON blob,
  `werkbundel-<slug>-<YYYYMMDD>.json`) / `parseWorksheetFile`.
- **Release banner** — [version.ts](../../src/config/version.ts) `RELEASE_VERSION` +
  `RELEASE_SUMMARY`; shown until the user dismisses the current version
  (`rekenraak_release_seen_v1`). Details live in
  [HelpModal.tsx](../../src/components/layout/HelpModal.tsx).
- **First-run tutorial** — [TourOverlay.tsx](../../src/components/onboarding/TourOverlay.tsx),
  an interactive spotlight tour (add → settings → generate → print → WIP/feedback finale).
  One-time via `localStorage` `rekenraak_tour_seen_v1`; replayable from HelpModal's
  "Rondleiding" button. Targets elements by `data-tour="…"` anchors (sidebar-nav, inspector,
  generate-block, print, feedback); advances on real store changes (block added / exercises
  generated). Replaced the old AlphaPopup (its WIP warning is now the final step).

---

## 11. File map

Every non-generator file, plus the generator directories collapsed one line per family.
The per-typeId detail (generator → field → viewer → config) is the §7 table.

```
src/
├── App.tsx                      # 3-panel layout, page routing (packer → PageSheet), boot hooks
├── main.tsx                     # React entry
├── index.css                    # global + ALL print CSS (@page, @media print)
├── assets/{theme.css,fonts/}    # tokens + fonts used by the HTML preview only (favicons live in public/)
├── config/
│   ├── appstructure.ts          # APP_STRUCTURE tree (Domain→Subdomain→ExerciseType)
│   ├── exerciseRegistry.ts      # REGISTRY: typeId → {exerciseField, generate, defaultConstraints, defaultCount} (pure data)
│   ├── exerciseUI.tsx           # EXERCISE_UI: typeId → {Viewer, Config} (React)
│   ├── baseSettings.ts          # BaseSettings + baseApply (global snapshot-on-add, §13)
│   ├── exerciseCatalog.ts       # flat addable catalog for mass-add / curriculum (§13)
│   ├── instructionPresets.ts    # quick-pick opdracht-titel texts + defaultInstructionFor()
│   ├── gradePresets.ts          # Leerjaar 1–6: base-difficulty seed + leaf grade-gate (soft starting point)
│   ├── printPalette.ts          # curated print-safe swatches + STYLE_BOUNDS clamps (style builder)
│   ├── rekenmethodes.ts         # rekenmethode metadata (bibliotheek)
│   ├── worksheetTemplates.ts    # prebuilt worksheet templates (bibliotheek / presets)
│   └── version.ts               # RELEASE_VERSION / RELEASE_SUMMARY for the banner
├── store/
│   └── useWorksheetStore.tsx    # single Zustand store: state, actions, history, autosave subscription
├── hooks/
│   ├── usePrint.ts              # window.print() trigger + dynamic @page injection (waits 2 rAF for the repack)
│   ├── useMeasuredHeights.ts    # measured cell heights + page-body budget fed back into the packer (§9)
│   └── useSheetDnd.ts           # sheet drag-and-drop state: handle + whole-block drag (draggable toggled at mousedown), top/bottom drop zones (§9)
│  (repo root) scripts/width-matrix.mjs  # Playwright width/height harness behind the LAYOUT tiers (§9)
│  (repo root) scripts/font-baseline.mjs # walks every sidebar leaf (window.__rekenraak.leaves, seeded RNG) → cell shots + heights/intrinsic widths/text
│  (repo root) scripts/font-compare.mjs  # before/after diff (pixelmatch) → report.json/.md + contact-sheet.html; see TESTING.md
├── styles/
│   └── appStyles.ts             # CSS-in-JS inline layout styles
├── services/
│   ├── generateDispatch.ts      # regenerateBlock: registry lookup → generic setExercises
│   ├── persistence.ts           # autosave / presets / share-link / file import-export (§10)
│   ├── regionStyle.ts           # overlayRegionStyle(base, RegionStyle): custom-wins style overlay for header/footer/titel
│   ├── layout/pagePacker.ts     # PURE packer: blocks in, pages out — rows, page breaks, spans; no DOM (§9)
│   ├── layout/blockLayout.ts    # page grid (COL_UNITS × ROW_BUDGET) + per-type rowUnits/minWidth FALLBACK + VETO_MIN + cost fns (§9) — moved from config/ 2026-09-13
│   ├── layout/blockNumbering.ts # pure numberBlocks(): opdracht numbers, skipping furniture + skipNumbering — one source for sheet, Inspector chip, thumbnail (§3)
│   ├── layout/kaderMarkup.tsx   # pure renderKaderBody(): **vet** / *cursief* / __onderstreept__ / 1. and - lists for the onthoudkader (§9 furniture; tested)
│   ├── math/{types.ts,mathEngine.ts,formatters.ts,validators.ts}   # validators.ts is EMPTY
│   ├── math/relax.ts              # hoofdrekenen relaxation ladder (preset→masks→bridges→termCount); strict first, settings untouched
│   ├── math/constraintTypes.ts    # per-family XConstraints (43) + BlockConstraints/CrossCutting/ConstraintsByType
│   ├── clock/{clockTypes.ts,clockGenerator.ts}
│   ├── fractions/{fractionGenerator.ts,breukBewerkGenerator.ts}   # breukBewerk = gemengd/gelijknamig/vereenvoudigen
│   ├── splitsen/{splitsenGenerator.ts,dutchWords.ts}   # basic/splitsboom/verliefde-harten/positie-*
│   ├── cijferen/cijferGenerator.ts
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
│   └── vormleer/vormleerGenerator.ts           # punt-lijn/hoek/figuur constructors + CONCEPT_NAMES
└── components/
    ├── layout/
    │   ├── SheetDropZones.tsx  # the three labelled drop thirds over every candidate block during a drag + SheetDragHint strip (screen only)
    │   ├── PageSheet.tsx       # ONE printed page: own header + COL_UNITS-wide grid body + own footer + break-after: page (§9)
    │   ├── BlockControlsRail.tsx  # portalled per-block control rail (lock/duplicate/split/page-break/move/delete); fixed-positioned off the block rect so the page's overflow:hidden can't clip it; visibility = App's hoveredBlockId ?? activeBlockId, not CSS :hover
    │   ├── sidebar.tsx         # left panel: source-list nav, locked palette, wordmark foot
    │   ├── TopBar.tsx          # one row: add/menu/help | sheet name + autosave | undo-redo, genereer, oplossingen, afdrukken Label-shedding is driven by [useShedStages](../../src/hooks/useShedStages.ts) — a ResizeObserver measures the bar's real content width (sum of the children's `scrollWidth`; a squeezed grid column spills into its neighbour, so the row's own scrollWidth lies) and steps through four stages only when it actually overflows (8px slack down, 24px headroom up, reversal breaker): 0 full labels · 1 icon-only + tooltips · 2 sheet name + autosave dot on `.topbar-line2` under the bar · 3 Toevoegen/Uitleg fold into Meer. `data-stage` on `.topbar`. Stage 0 needs ≈1900px of viewport because the bar spans only the centre column.
    │   ├── OverzichtPanel.tsx  # Overzicht tab in the left panel (block list + drag reorder)
    │   ├── BaseSettingsModal.tsx  # global base-difficulty modal (§13)
    │   ├── HelpModal.tsx       # Ouders / Leerkrachten tabs + tour replay
    │   └── AboutModal.tsx      # "Over dit project" — manifesto + tech + AGPL
    ├── library/{BibliotheekView.tsx,MijnBladenView.tsx}   # saved sheets / templates (uses shared/SheetThumbnail.tsx)
    ├── onboarding/TourOverlay.tsx                         # first-run spotlight tutorial
    ├── massadd/MassAddModal.tsx                           # §13 "Toevoegen" modal
    ├── curriculum/CurriculumBuilderModal.tsx              # §13 curriculum builder (draftBlocks)
    ├── shared/{ExercisePreview.tsx,SheetThumbnail.tsx}    # §13 fit-to-card live example; mini sheet preview
    ├── ui/{IconButton,Wordmark,Switch,PopupSelect,InfoTip,Swatch,ModalPortal,ModalShell}.tsx
    ├── configurator/
    │   ├── Inspector.tsx       # mounts EXERCISE_UI[typeId].Config; locked-mode gating
    │   ├── StylePicker.tsx     # visual-variant modal card-gallery (ExercisePreview cards; e.g. MAB Stijl)
    │   ├── RegionStyleFields.tsx  # per-region look-and-feel (size/bold/colour/fill/padding) + ResetAllStylesButton
    │   ├── BridgeControl.tsx   # carry-arrow ('bruggetje') diagram: per-place geen/mag/moet via tappable gap arrows
    │   ├── sharedPluginStyles.ts  # radioBtn + pill + onOff + divider/sectionBox/select + hint/label text tiers
    │   ├── useConstraints.ts      # [c, patch] hook: typed read + merge-write of block.constraints for plugins; honours ConstraintScope
    │   ├── ConstraintScope.ts     # context: when set to ['perVariant', id] the hook reads {...root, ...root.perVariant[id]} and writes ONLY into perVariant[id] (sparse); fixedPreset/hidden let a tab pin its preset and hide shared controls
    │   ├── plugins/shared/fieldStyles.ts      # F: Inspector field chrome shared by Inspector + StyleConfigs
    │   ├── plugins/shared/HrStdStyleConfig.tsx # AddSub/MulDiv StyleConfig (niveau, compenseren-tussenstap, kort/lang/stappen)
    │   ├── plugins/RekenvolgordeStyleConfig.tsx # rekenvolgorde Kort/Lang/Stappen (own file: HrStdStyleConfig's rows are gated on hoofdrekenen-only settings)
    │   └── plugins/*Config.tsx # one per family (+ addition/ & multiplication/ sub-settings; FractionMaxField = shared getalopbouw widget)
    └── viewer/
        ├── *Viewer.tsx + *SVG.tsx      # one renderer per family; ClockViewer/FractionViewer wrap item components
        ├── BlockWidthContext.tsx       # printable width of the block's CELL — viewers MUST read this, never a constant
        ├── VerticalFraction.tsx        # shared stacked-fraction component
        ├── LayoutBlockViewer.tsx       # sheet furniture: sectie / schrijflijnen / raster / kader / lege pagina
        ├── BlockErrorBoundary.tsx      # shared crash guard around every Viewer (sheet, thumbnail, preview); resets on the exercise array (§8)
        ├── ScaledBlock.tsx             # per-block body-zoom wrapper (bodyFontScale); fits to page height when constraints.fitToPage, to column width ONLY when constraints.fitToWidth (badge "verkleind tot N %")
        ├── scaledBlockFit.ts           # pure nextZoom()/FIT_FLOOR helper for ScaledBlock (tested)
        ├── solutionStyle.ts            # SOL / solutionText / solutionStroke — the one solution-red token (--ink-solution), bold
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
`baseApply(base, registryDefaults)`. The teacher sets these once (sidebar →
Geavanceerd → Basisinstellingen, [BaseSettingsModal.tsx](../../src/components/layout/BaseSettingsModal.tsx)).
`addBlockFromType` snapshots them into each **new** block:
`constraints = { ...registryDefaults, ...baseApply(base, defaults), ...leafOverride }`
(leaf wins). `baseApply` writes a key **only if** that type's realized defaults declare
it (`'key' in defaults`), mapping the semantic max onto `maxGetal`/`maxRange`/`maxNumber`
and the masks/bridges/decimalen/breuk-toggles where present. Snapshot, not live — changing
the base never retro-affects existing blocks.

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
`draftBlocks` when the id isn't in `blocks`, so the plugins work unchanged. "Deel
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

## 14. Whiteboard mode (only on git branch `whiteboard`; not on dev/main)

A second, deliberately isolated app for digibord teaching. ALL code lives under
`src/board/`; touchpoints outside are exactly three: the `WorksheetView` union gains
`'whiteboard'`, App.tsx mounts `<WhiteboardView/>` as a full-screen overlay (like the
library views — the editor stays mounted underneath), and TopBar gets the Chalkboard
button. Merges into dev only when the layout-bugfix track and the whiteboard track are
both done (no mid-development syncs — owner decision).

**Store** — [useBoardStore.tsx](../../src/board/useBoardStore.tsx), separate Zustand store:
`pages: BoardPage[]` (each `{ widgets, strokes, background }`), `activePageIdx`,
`selectedWidgetId`, `tool` (`select | hand | pen | marker | eraser | line | shape |
instrument` — last three P3/P4), `inkSettings` per stroke-tool, grid snap state. The
`hand` tool drags widgets without selecting; `select` is the full-edit cursor.
Hydrates from autosave at module init; a debounced (1.5s) subscription writes
`rekenraak_board_autosave_v1`.

**Widgets** — `BoardWidget { id, kind, x, y, w, z, scale?, block?, showAnswer?, props? }`.
Sizing is CSS-`zoom`-based: frame zoom = `w / NATURAL_W[kind]`
([widgetSizing.ts](../../src/board/widgetSizing.ts)), so corner-drag = uniform zoom AND layout
height follows (transform:scale did not). Exercise `scale` = extra inner text zoom at
constant frame width. Kinds: `exercise`, `tekst`, `datum`, `klok` (drag hands: outer
face = minute, inner = hour; analog/digital/geschreven-tijd toggles), `afbeelding`
(dataURL), `namen` (random picker; class list app-wide in `rekenraak_board_names_v1`),
`weer` (open-meteo, geolocation w/ Brussels fallback, toggleable parts), `geluid`
(getUserMedia RMS → 5 levels).

**Exercise widgets = the registry payoff.** Widget holds a full `MathBlock`
([boardBlocks.ts](../../src/board/boardBlocks.ts): registry defaults, `instructionMode:'geen'`,
`totalPoints:0`, ≤6 exercises). Viewer = `EXERCISE_UI[typeId].Viewer` with per-widget
`showAnswer`; config = the REAL plugin via the **draftBlocks mirror** (§13 pattern):
[BoardInspector.tsx](../../src/board/components/BoardInspector.tsx) seeds
`worksheetStore.draftBlocks = [widget.block]` on select, a subscription copies plugin
edits back into the widget, teardown on deselect. Genereer calls
`REGISTRY[typeId].generate` directly and writes the exercise field itself (board blocks
never enter the worksheet store). Board policy: geen opdracht-titel, geen score; the
inspector's blok-section is aantal + witruimte + tekstgrootte only. Adding goes through
the bottom-bar **Toevoegen menu** (Wiskunde → single-add side panel
[BoardAddModal.tsx](../../src/board/components/BoardAddModal.tsx) with exerciseCatalog +
ExercisePreview cards; Klasmanagement; Organisatie; Tekst/Afbeelding direct).

**Ink** — [InkLayer.tsx](../../src/board/components/InkLayer.tsx): strokes are SVG paths with
quadratic-midpoint smoothing; `Stroke.pts` keeps flattened samples for the per-stroke
eraser hit-test. Marker = wide + 0.45 opacity + multiply blend. Pointer routing: ink tool
active → widget layer `pointer-events:none`, else reverse — one rule. Ink undo/redo =
stroke stack per page (redo clears on new stroke/erase/page switch). Colors: defaults +
teacher-saved (`rekenraak_board_colors_v1`). The `ToolEngine` contract in
[boardTypes.ts](../../src/board/boardTypes.ts) reserves the P4 instrument-snapping design:
tools receive instrument geometry in ctx, so meetlat/geodriehoek/passer emit exact
SVG geometry (owner requirement: real snapping, not display-only overlays).

**Persistence** — [boardPersistence.ts](../../src/board/boardPersistence.ts):
`BOARD_FORMAT_VERSION 1`, strict parser (wrong version/malformed → null). Autosave +
"mijn borden" presets (`rekenraak_board_presets_v1`, max 30) + file export/import.
No share-link (payloads exceed URL limits). Backgrounds
([backgrounds.ts](../../src/board/backgrounds.ts)): blanco/raster/lijnen/schrijflijnen(2- en
4-lijns met lichtblauwe x-hoogteband)/cornell × wit/zwart × grootte (0.75/1/1.5), pure
CSS gradients, per page.

**Not in the print flow** — WhiteboardView never mounts in the print tree; worksheet
printing is untouched.

**Roadmap** — P3: lijn/pijl-tool, vormen (vlakke figuren + ruimtefiguren-stempels),
meer dagritme-widgets. P4: snapping instruments (ToolEngine ctx), pdf.js-achtergronden,
meer klasmanagement.

### §14b — Iteratie 2 (owner-feedbackronde, zelfde dag)

**Widget-chroom** = window-card ([WidgetFrame.tsx](../../src/board/components/WidgetFrame.tsx)):
typbare titelbalk (klik op titel; `props.title`, defaults in widgetSizing) = drag handle,
acties 🔄/👁 (exercise), ⚙ (opent inspector — selectie alléén opent hem niet meer;
`inspectorOpen` in de store), ⧉ dupliceer (`duplicateWidget`, verse block-id), 🗑;
resize-grip rechtsonder. Body-zoom mikt op de binnenbreedte (w−2) zodat alle vier de
randen zichtbaar blijven. `showHeader:false` (toggle in elk settings-paneel) → kale
kaart die overal sleepbaar is. `BoardErrorBoundary` om elke widget + de inktlaag.

**Toevoegen-menu** = categorieën (RekenRaak blok · Wiskunde-gereedschap ·
Klasmanagement · Organisatie) met tegel-zijpanelen uit
[toolCatalog.ts](../../src/board/toolCatalog.ts); elke tegel heeft een ★ → favorieten
(max 6, `rekenraak_board_favorites_v1`) als icoonknoppen naast Toevoegen. ⚙-bord-
instellingen bundelt achtergrond/grootte/zwart-wit/raster. Tekst = T-tool op de balk
(tool `'text'`: tik op bord plaatst tekstwidget). Extra tool `'hand'` (slepen zonder
selecteren) bestond al; `BoardTool` is nu select/hand/text/pen/marker/eraser (+P3/P4).

**Widget-lijst** (kinds; allemaal in WidgetInspector tenzij vermeld): exercise, tekst,
datum (weekdag/datum/live-tijd/kleur), klok, afbeelding, namen, geluid (niveau-poster
0–4, tap-selector), werksymbolen (tegelkiezer, verticaal/icoon-only), timer (taart-
countdown), stopwatch (geen settings), dobbelsteen (6/N/eigen lijst ×1-3), adem
(fase-seconden + presets), groepjes (aantal↔grootte, moet-samen/mag-niet-samen via
union-find + shuffle-repair, klaslijst gedeeld met namen), checklist, stappenplan
(#/##-parsing), getallenlijn (leeg), positietabel (leeg, kommakolom), honderdveld
(tap-kleurcyclus), breukviz (cirkel/pizza/lijn, stambreuken), mabmat (los Dienes-
materiaal per plaats, MabPlaceColumn), geld-item (gedropte munt/biljet, titelloos).
**GeldPalet** ([GeldPalet.tsx](../../src/board/components/GeldPalet.tsx)): dock met de volledige
eurocatalogus, stijl tekening (GeldViewer-exports) of echt; drag-to-create met pointer
capture, geopend via Wiskunde-gereedschap (`geldPaletOpen`, UI-only).

**Weer** heeft nu plaats-zoeken (open-meteo geocoding) + 'huidige locatie'.
