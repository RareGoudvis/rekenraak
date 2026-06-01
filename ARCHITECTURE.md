# ARCHITECTURE.md

System map of the Enderklas worksheet generator, written for future Claude agents
(and humans). Read this once and you should know where everything lives and how a
new exercise type flows through the app.

> ⚠️ **KEEP THIS FILE CURRENT.** After any *structural* change — a new exercise
> type, a new store action, changed wiring, a renamed/moved file, a new service —
> update **both this file and [CLAUDE.md](CLAUDE.md)**. Exercise types now live in
> a **central registry** ([exerciseRegistry.ts](src/config/exerciseRegistry.ts) +
> [exerciseUI.tsx](src/config/exerciseUI.tsx)); adding one is a generator + viewer
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

[App.tsx](src/App.tsx) renders three columns:

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

Key files: [App.tsx](src/App.tsx) (viewer routing via registry),
[Inspector.tsx](src/components/configurator/Inspector.tsx) (Genereer + config mount
via registry), [sidebar.tsx](src/components/layout/sidebar.tsx) (leaf →
`addBlockFromType`), [generateDispatch.ts](src/services/generateDispatch.ts),
[exerciseRegistry.ts](src/config/exerciseRegistry.ts) +
[exerciseUI.tsx](src/config/exerciseUI.tsx) (the registry).

---

## 3. State — the Zustand store

Single store: [useWorksheetStore.tsx](src/store/useWorksheetStore.tsx). All state
lives in memory.

| Slice | Type | Purpose |
|---|---|---|
| `blocks` | `MathBlock[]` | Ordered exercise blocks on the sheet |
| `activeBlockId` | `string \| 'document' \| null` | Drives Inspector context |
| `header` | `HeaderData` | naam/klas/nummer/datum toggles, title, **field order + widths** |
| `footer` | `FooterData` | school/klas/leerkracht/pagina + centerText toggles |
| `docSettings` | `DocSettings` | titlePosition, headerStyle, opdrachtTitelStyle, showScores, showDividers, numberBlocks, gaps |
| `showSolutions` | `boolean` | Global red-solution overlay (preview + print) |
| `theme` | `'dark' \| 'light' \| 'colorblind'` | Persisted to localStorage, applied as `data-theme` on `<html>` |
| `baseSettings` | `BaseSettings` | Global default difficulty (max/getalsoort/masks/bridges/decimalen/breuk-opties) snapshotted into each new block — see §13 |
| `curriculum` | `CurriculumLock \| null` | Non-null + `locked` = restricted parent mode (whitelisted sidebar + frozen difficulty) — see §13 |
| `draftBlocks` | `MathBlock[]` | Off-sheet scratch blocks the curriculum builder edits via the real config plugins; not rendered/autosaved/historied — see §13 |
| `_history` / `_historyIndex` | `MathBlock[][]` / `number` | Undo/redo, max `MAX_HISTORY = 50` |

**History rule (important):** mutations that change `blocks` call `pushHistory`
(addBlock, remove, move, duplicate, updateBlockSettings, `setExercises`,
updateExercise, `patchExercise`). `updateHeader` / `updateFooter` /
`updateDocSettings` / `setShowSolutions` / `setTheme` / `toggleBlockLock` /
`updateBaseSettings` / `setDraftBlocks` do **NOT** push history.

Exercises are written by one **generic** action: `setExercises(id, field, data)`
where `field` is the registry-declared `exerciseField` (e.g. `'mabExercises'`).
There is no longer a setter per type. A second generic action
`patchExercise(id, field, exerciseId, patch)` updates **one** element in any array
field (used by ordenen click-to-edit and the splitsen "type a number" textboxes).

**Curriculum lock gate:** `updateBlockSettings` / `updateBlockLayout` /
`updateBlockInstruction` check `curriculum?.locked` and, when locked, allow only
`numberOfExercises` + `pageBreakBefore` (difficulty/wording frozen). This single
choke point enforces the lock without touching the ~16 config plugins. Draft-block
edits bypass the gate (authoring runs unlocked).

**`MathBlock.constraints` is typed `any`** — a loose per-type bag. Each generator
and config plugin reads the keys it expects. Defaults are set in `addBlockFromType`
(big per-type ternary, line ~146).

**Autosave:** a store subscription debounces 1.5 s after
`blocks`/`header`/`footer`/`docSettings`/`baseSettings` change and writes to
localStorage (payload also carries `curriculum`, so a locked sheet stays locked
across refresh). UI-only state (activeBlockId, showSolutions, theme, history,
draftBlocks) is excluded. Empty fresh-tab state never overwrites a populated autosave.

---

## 4. The data model — [types.ts](src/services/math/types.ts)

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
| `ordenenExercises` | `OrdenenExercise` | `ordenen` |
| `deelbaarheidExercises` | `DeelbaarheidExercise` | `deelbaarheid` |
| `getallenasExercises` | `GetallenasExercise` | `getallenas` |
| `temperatuurExercises` | `TemperatuurExercise` | `temperatuur` |
| `plaatswaardeExercises` | `PlaatswaardeExercise` | `plaatswaarde` |
| `evenOnevenExercises` | `EvenOnevenExercise` | `even-oneven` |
| `vergelijkenExercises` | `VergelijkenExercise` | `vergelijken` |
| `afrondenExercises` | `AfrondenExercise` | `afronden` |
| `romeinseExercises` | `RomeinseExercise` | `romeinse-cijfers` |
| `herleidingExercises` | `HerleidingExercise` | `herleidingen` |

Every exercise element has `id: string` and `isManuallyEdited: boolean` (set
`false` on generation; flipped `true` when a teacher hand-edits via
`updateExercise` / `updateCijferExercise` / the generic `patchExercise`).

---

## 5. Adding a new exercise type — the registry contract

Exercise types are declared in a **central registry**, split across two files
keyed by **exact** `typeId` (no substring matching):

- [exerciseRegistry.ts](src/config/exerciseRegistry.ts) — **pure data** (no React):
  `{ exerciseField, generate, defaultConstraints, defaultCount }`. Imported by the
  store and `generateDispatch`.
- [exerciseUI.tsx](src/config/exerciseUI.tsx) — **React**: `{ Viewer, Config }`.
  Imported by `App.tsx` and `Inspector.tsx`.

The split exists to avoid a cycle: configs import the store, so if the store
imported a registry that pulled in configs it would loop. The store only needs the
pure-data file.

The four consumers are now **table lookups, not branches**:

| Consumer | File | Reads |
|---|---|---|
| Generate | [generateDispatch.ts](src/services/generateDispatch.ts) | `REGISTRY[typeId].generate` + `.exerciseField` |
| Config mount | [Inspector.tsx](src/components/configurator/Inspector.tsx) | `EXERCISE_UI[typeId].Config` |
| Viewer routing | [App.tsx](src/App.tsx) | `EXERCISE_UI[typeId].Viewer` |
| Block defaults | [useWorksheetStore.tsx](src/store/useWorksheetStore.tsx) `addBlockFromType` | `REGISTRY[typeId].defaultConstraints()` + `.defaultCount` |

### Checklist to add a type

1. **Types** — add the exercise interface + its array field to `MathBlock` in
   [types.ts](src/services/math/types.ts), and (optionally) a `<X>Constraints`
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
   to `APP_STRUCTURE` in [appstructure.ts](src/config/appstructure.ts). The leaf's
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
  const c = block.constraints;                 // loose any-bag, read expected keys
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

`MAX_ATTEMPTS` varies by generator (20000 for math/geld-teruggeven, 5000 for MAB,
500 per-item for cijferen). Some simple generators (geld, fractions, clock) skip
the retry loop and build exactly `n` items directly.

### Shared cross-generator concepts

- **`INTERNAL_SCALE = 1_000_000`** ([mathEngine.ts](src/services/math/mathEngine.ts)) —
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

One row per live `typeId` — this table mirrors
[exerciseRegistry.ts](src/config/exerciseRegistry.ts) +
[exerciseUI.tsx](src/config/exerciseUI.tsx) (keep them in sync). Placeholder
leaves in [appstructure.ts](src/config/appstructure.ts) carry `placeholder: true`
/ `typeId: '__placeholder__'` and are **not implemented** — greyed tree entries
only.

| typeId | MathBlock field | Generator (export) | Viewer | Config plugin | Key constraint keys |
|---|---|---|---|---|---|
| `hr-std-optellen` | `exercises` | `generateAdditionExercises` (mathEngine) | `MathBlockRenderer` | `AdditionConfig` | numberType, maxGetal, bridges, operand1/2Mask, equationType |
| `hr-std-aftrekken` | `exercises` | `generateSubtractionExercises` | `MathBlockRenderer` | `SubtractionConfig` | same as optellen |
| `hr-std-vermenigvuldigen` | `exercises` | `generateMultiplicationExercises` | `MathBlockRenderer` | `MultiplicationConfig` | multiplicationMode, selectedTables, tableLimit, fractionMultMode |
| `hr-std-delen` | `exercises` | `generateDivisionExercises` | `MathBlockRenderer` | `DivisionConfig` | divisionLevel, metRestLevel, selectedTables, tableLimit |
| `cijferen-optellen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | operator, numberType, maxRange, numberOfTerms, bridges, operand0-3Mask |
| `cijferen-aftrekken-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-vermenigvuldigen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above |
| `cijferen-delen-{nat,dec}` | `cijferExercises` | `generateCijferExercises` | `CijferViewer` | `CijferConfig` | as above + withRemainder |
| `klok-kloklezen` | `clockExercises` | `generateClockExercises` | `ClockExerciseItem` | `ClockConfig` | clockType, is24hour, timeTypes, minuteDirection, handChoice |
| `breuken` | `fractionExercises` | `generateFractionExercises` | `FractionExerciseItem` | `FractionConfig` | subType, shape, min/maxDenominator, objectShape, maxTotal, level |
| `splitsen` | `splitsenExercises` | `generateSplitsenExercises` | `SplitsenViewer` | `SplitsenConfig` | maxGetal, operand1/2Mask, fixedTotal, layout, rowsPerBox |
| `geld-herkennen` | `geldExercises` | `generateGeldExercises` | `GeldViewer` | `GeldConfig` | maxGetal, format, allowedDenominations, geldLayout |
| `geld-tekenen` | `geldExercises` | `generateGeldExercises` | `GeldTekenenViewer` | `GeldConfig` | maxGetal, scaffolding, allowedDenominations |
| `geld-wissel` | `geldWisselExercises` | `generateGeldWisselExercises` | `GeldWisselViewer` | `GeldWisselConfig` | exerciseBills, exercisesPerRow |
| `geld-teruggeven` | `geldTeruggevenExercises` | `generateGeldTeruggevenExercises` | `GeldTeruggevenViewer` | `GeldTeruggevenConfig` | min/maxPriceEuros, payWithOptions, centenDeel, antwoordType |
| `mab-herkennen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=herkennen) | `MabConfig` | maxNumber, operand1Mask, mabStyle, scaffolding |
| `mab-tekenen` | `mabExercises` | `generateMabExercises` | `MabViewer` (mode=tekenen) | `MabConfig` | maxNumber, operand1Mask, mabStyle, scaffolding |
| `ordenen` | `ordenenExercises` | `generateOrdenenExercises` | `OrdenenViewer` (click-to-edit) | `OrdenenConfig` | numberType, count(2–8), operatorMode, maxGetal, minGetal, decimalPlaces, numberMask, min/maxDenominator, unitFractionsOnly, allowMixed |
| `deelbaarheid` | `deelbaarheidExercises` | `generateDeelbaarheidExercises` | `DeelbaarheidViewer` | `DeelbaarheidConfig` | layout (tabel/veelvouden — sidebar leaf only), divisors[], maxGetal, base, terms, givenCount |
| `splitsen` (positie-*) | `splitsenExercises` | `generateSplitsenExercises` | `SplitsenViewer` | `SplitsenConfig` | layout positie-tabel/-benen/-math (sidebar leaf), maxGetal(≤1e9), decimalPlaces, operand1Mask, benenVariants[], mathForms[], mathDirection |
| `getallenas` | `getallenasExercises` | `generateGetallenasExercises` | `GetallenasViewer` | `GetallenasConfig` | numberType (natural/decimal/rational/geheel), maxGetal, minGetal, step, fractionStep, direction(+beide), allowMixed, gelijknamig, hardMode, ticks |
| `temperatuur` | `temperatuurExercises` | `generateTemperatuurExercises` | `TemperatuurViewer` | `TemperatuurConfig` | variant (kleuren/aflezen/verschil — sidebar leaf), mode1/mode2 (verschil), includeNegatives, perRow |
| `plaatswaarde` | `plaatswaardeExercises` | `generatePlaatswaardeExercises` | `PlaatswaardeViewer` | `PlaatswaardeConfig` | subType (waarde/plaats/tabel — sidebar leaf), maxGetal, numberMask, decimalPlaces (0–3, kommagetallen) |
| `even-oneven` | `evenOnevenExercises` | `generateEvenOnevenExercises` | `EvenOnevenViewer` | `EvenOnevenConfig` | subType (rooster/cirkels), maxGetal, target (even/oneven), perRow |
| `vergelijken` | `vergelijkenExercises` | `generateVergelijkenExercises` | `VergelijkenViewer` | `VergelijkenConfig` | subType (getallen/kiezen), maxGetal, numberMask, chooseTarget, setSize, decimalPlaces (0–3, kommagetallen) |
| `afronden` | `afrondenExercises` | `generateAfrondenExercises` | `AfrondenViewer` | `AfrondenConfig` | subType (rooster/simpel), numberType (natural/decimal — sidebar leaf), maxGetal, decimalPlaces, numberMask (natural), roundTargets[] (T/H/D/TD or E/t/h), roosterSize (rooster = one rooster per exercise, 2-up) |
| `romeinse-cijfers` | `romeinseExercises` | `generateRomeinseExercises` | `RomeinseViewer` | `RomeinseConfig` | subType (herkennen/schrijven), niveau (1–4); always-subtractive notation, numberMask |
| `herleidingen` | `herleidingExercises` | `generateHerleidingExercises` | `HerleidingenViewer` | `HerleidingenConfig` | measure (lengte/inhoud/massa/**oppervlakte** incl. ha·a·ca — sidebar leaf), units[] (ladder subset), **maxEnkel** (def 100, single formats) + **maxSamengesteld** (def 1000, compound formats) — power-of-10 breakpoint sliders, formats[] (4), **compoundMode** (2/volledig), writeUnits, scaffolding (geen/tabel-headers/tabel-blanco) + table options `tablePrompt`/`tableAnswer` (blank/filled/hidden)/`tableCellW`/`tableCellH` — all in the **Differentiatie** card. Integer-exact (safe-int guarded); `HerleidingenViewer` auto single-columns wide blocks, renders a centered enriched table, and allows inline edit of given numbers + a unit **dropdown** (`recomputeHerleiding` + `patchExercise`). |

> Note: matching is now exact-key, so the old substring collision between
> `hr-std-optellen` and `cijferen-optellen-*` (which forced
> `!startsWith('cijferen-')` guards) no longer exists. Inspector still uses a small
> `isHrStd` substring helper for one mental-math-only differentiation control;
> that's a UI affordance, not type routing.

---

## 8. Viewers & the solutions overlay

Each viewer reads its `block.<field>` array and renders A4-styled HTML. Multi-item
viewers lay their items out through
[FragmentableGrid](src/components/viewer/FragmentableGrid.tsx) (block stack of
`break-inside:avoid` rows) so exercises flow across page breaks when printing — see §9.

- **Global `showSolutions`** (store boolean, not per-block) is passed to every
  viewer. When true, answers render in **`#e11d48` (red, bold)**; when false they
  render as blanks / dotted lines / empty boxes. This colour is the convention
  across all viewers (some declare it as a local `SOL`/`SOL_COLOR` const).
- **[MathBlockRenderer.tsx](src/components/viewer/MathBlockRenderer.tsx)** — the
  standard equation renderer. `block.layoutPreset`:
  - `inline-short` — 2-column grid, compact.
  - `inline-long` — 1-column, full width.
  - `stepped` — 1-column with `steppedLines` blank working lines under each.
- **[CijferViewer.tsx](src/components/viewer/CijferViewer.tsx)** — column
  arithmetic digit grid (carry row, estimation row, answer row).
- **[MabViewer.tsx](src/components/viewer/MabViewer.tsx)** +
  [MabBlocksSVG.tsx](src/components/viewer/MabBlocksSVG.tsx) — Dienes place-value
  blocks (units dots, tens bars, hundreds flats, thousands cubes). Styles:
  `symbolic` / `mab-bw` / `mab-color`. `herkennen` = read blocks → write number;
  `tekenen` = draw blocks for a given number (solution overlays blocks in red).
- **[ClockExerciseItem.tsx](src/components/viewer/ClockExerciseItem.tsx)** +
  [AnalogClockSVG.tsx](src/components/viewer/AnalogClockSVG.tsx) — analog/digital
  clock faces (hand-drawn SVG).
- **[FractionExerciseItem.tsx](src/components/viewer/FractionExerciseItem.tsx)** +
  [FractionShapeSVG.tsx](src/components/viewer/FractionShapeSVG.tsx) — shapes /
  amounts / line segments / polygons. App.tsx picks 1-col vs 2-col grid based on
  `subType` + `answerFormat`.
- **[SplitsenViewer.tsx](src/components/viewer/SplitsenViewer.tsx)** —
  decomposition pair boxes (layouts: basic / mathematic / verliefde-harten).
- **Geld viewers** — [GeldViewer](src/components/viewer/GeldViewer.tsx) (recognise
  coins/bills), [GeldTekenenViewer](src/components/viewer/GeldTekenenViewer.tsx)
  (draw an amount), [GeldWisselViewer](src/components/viewer/GeldWisselViewer.tsx)
  (exchange a bill), [GeldTeruggevenViewer](src/components/viewer/GeldTeruggevenViewer.tsx)
  (make change). Coins/bills are monochrome SVG (print-friendly).

---

## 9. Print / PDF export

**There is no react-pdf.** (Earlier versions had a `WorksheetPDF.tsx`; it was
removed.) Export = the browser print dialog → Save as PDF. The on-screen A4 preview
**is** what prints. Tuned for Chrome/Edge (Blink) — that's where the teachers print.

### The print card is a real `<table>`

[App.tsx](src/App.tsx) renders the A4 card as a **shell `<div class="print-area-shell">`**
(keeps the screen card look + `a4Ref` + is the positioned container for the on-screen
page-break indicators) wrapping a **real `<table class="print-area">`**:

```
div.print-area-shell (a4Sheet styling; display:block in print)
└─ table.print-area  (display:table in print; table-layout:fixed)
   ├─ thead.print-thead → tr>td: .print-thead-spacer (top margin) + .print-repeat-fields
   ├─ tbody.print-body  → tr>td.print-body-cell: header + blocks (16mm side padding)
   └─ tfoot.print-tfoot → tr>td: .print-tfoot-inner (school|klas|leerkracht left, vrije tekst right)
```

**Why a real table:** Chrome only repeats `<thead>`/`<tfoot>` across printed pages for
*true* table markup — div-based `display:table-header-group`/`-footer-group` works in
Firefox but **not** Chrome (it printed the footer only on the last page). Real `<thead>`
/`<tfoot>` repeat on every page *and* reserve their height, so content never overlaps.
On screen the table is flattened to block flow (`table/tbody/tr/td → display:block`,
`thead/tfoot → display:none`) so the preview is unchanged.

- **[usePrint.ts](src/hooks/usePrint.ts)** — `handlePrint(withSolutions)`: deselects
  the active block, optionally flips `showSolutions`, injects a dynamic `<style>` that
  only blanks the browser's `@page` header/footer margin boxes, then `window.print()`.
  Restores prior state on `afterprint`. (It no longer builds the footer — that's HTML now.)
- **`@page { margin: 0 }`** — on purpose. The print dialog's "Margins: None/Minimum"
  silently overrides `@page` margins, so we don't rely on them: all visible margins come
  from the table groups (thead spacer height = top, `.print-body-cell` 16mm padding =
  sides, tfoot height = bottom). Robust to any dialog setting.
- **Repeating header toggle** — `header.repeatHeader`: when on, the Naam/Klas/Nr/Datum
  strip renders in `.print-repeat-fields` (inside `<thead>`, repeats every page) and the
  page-1 body copy `.print-body-fields` is hidden (`.print-area.repeat-header` rules).
- **[FragmentableGrid](src/components/viewer/FragmentableGrid.tsx)** — a single CSS
  `grid`/`flex` container does **not** fragment across pages in Chrome (a too-tall block
  jumps whole). This shared component lays items out as a **block stack of per-row grids**,
  each row `break-inside:avoid` (`.print-row`), so exercises flow across page breaks.
- **Print CSS** lives in [index.css](src/index.css) (`@page` + `@media print`):
  - `.no-print` — hidden (sidebar, topbar, modals, block controls).
  - `.print-root` / `.print-main` — collapse the 3-panel flex shell to block flow.
  - `.print-block` — block; `.page-break-before` forces a fresh page (per-block toggle).
  - `.print-opdracht` — `break-after/inside: avoid` (opdracht line never orphaned).
  - `.print-exercise` / `.print-row` — `break-inside: avoid` (never split an item/row).
- **Page-break indicators** (screen only): App.tsx measures `a4Ref` `scrollHeight` and
  draws a dashed line every `PAGE_H = 1044px` (A4 @ 96 dpi). Visual guides only; real
  pagination is the browser's.

**Note:** live incrementing page numbers are not possible from HTML/CSS in Chrome
(would need a JS paginator like paged.js) — the footer shows school info + vrije tekst,
no page number.

**SYNC rule:** any visual change to a viewer must look right when printed — there's
no separate PDF file to mirror, but check the print CSS classes above still apply, and
that multi-item viewers go through `FragmentableGrid`.

---

## 10. Persistence & sharing — [persistence.ts](src/services/persistence.ts)

All localStorage; nothing leaves the browser except share links the user copies.

- **Format gate:** `WORKSHEET_FORMAT_VERSION = 2`. `parseWorksheetFile` validates
  version + required fields (blocks/header/footer/docSettings) + the optional
  `curriculum` shape, and rejects future/invalid files. v2 added optional
  `baseSettings` + `curriculum` (absent → defaults, so v1 files still load).
- **Full vs template mode** (`WorksheetFileMode`): `full` = complete snapshot with
  exercises; `template` = settings only (exercise arrays stripped by
  `stripBlock`), so the recipient configures-then-Genereer to populate.
- **`CurriculumLock`** (`{ locked, allowedTypes: [{typeId, label, lockedConstraints}] }`)
  rides in the payload for locked curriculum share links (§13).
- **Autosave** — single slot `enderklas_autosave_v1`; `saveAutosave` /
  `loadAutosave` / `clearAutosave`. App.tsx offers to restore on boot if the
  current sheet is empty.
- **Presets** — named library `enderklas_presets_v1`, `MAX_PRESETS = 20`. CRUD via
  `loadPresets` / `savePreset` / `deletePreset` / `renamePreset`. Managed in
  [PresetModal.tsx](src/components/layout/PresetModal.tsx).
- **Share link** — `encodeShareLink` → JSON → **lz-string**
  `compressToEncodedURIComponent` → `#share=…` in the URL hash (never sent to a
  server). `MAX_SHARE_BYTES = 30000` (worksheet JSON compresses ~8×, so this covers
  ~100+ blocks); returns `null` if too big. `decodeShareHash` decompresses + parses;
  App.tsx consumes it on boot (a shared link wins over autosave) with a confirm whose
  wording differs for full / template / locked-curriculum links. `opts.curriculum`
  embeds a `CurriculumLock` (used by the curriculum builder, §13).
- **File export/import** — `exportWorksheet` (JSON blob,
  `werkbundel-<slug>-<YYYYMMDD>.json`) / `parseWorksheetFile`.
- **Release banner** — [version.ts](src/config/version.ts) `RELEASE_VERSION` +
  `RELEASE_SUMMARY`; shown until the user dismisses the current version
  (`enderklas_release_seen_v1`). Details live in
  [HelpModal.tsx](src/components/layout/HelpModal.tsx).
- **First-run tutorial** — [TourOverlay.tsx](src/components/onboarding/TourOverlay.tsx),
  an interactive spotlight tour (add → settings → generate → print → WIP/feedback finale).
  One-time via `localStorage` `enderklas_tour_seen_v1`; replayable from HelpModal's
  "Rondleiding" button. Targets elements by `data-tour="…"` anchors (sidebar-nav, inspector,
  generate-block, print, feedback); advances on real store changes (block added / exercises
  generated). Replaced the old AlphaPopup (its WIP warning is now the final step).

---

## 11. File map

```
src/
├── App.tsx                      # 3-panel layout, header render, viewer routing, page-breaks, boot hooks
├── main.tsx                     # React entry
├── index.css                    # global + ALL print CSS (@page, @media print)
├── assets/{theme.css,fonts/,enderklas-logo.png}   # fonts used by HTML preview only
├── config/
│   ├── appstructure.ts          # APP_STRUCTURE tree (Domain→Subdomain→ExerciseType), placeholders
│   ├── exerciseRegistry.ts      # REGISTRY: typeId → {exerciseField, generate, defaultConstraints, defaultCount} (pure data)
│   ├── exerciseUI.tsx           # EXERCISE_UI: typeId → {Viewer, Config} (React)
│   ├── baseSettings.ts          # BaseSettings + baseApply (global snapshot-on-add, §13)
│   ├── exerciseCatalog.ts       # flat addable catalog for mass-add / curriculum (§13)
│   └── version.ts               # RELEASE_VERSION / RELEASE_SUMMARY for the banner
├── store/
│   └── useWorksheetStore.tsx    # single Zustand store: state, actions, history, autosave subscription
├── hooks/
│   └── usePrint.ts              # window.print() trigger + dynamic @page injection
├── styles/
│   └── appStyles.ts             # CSS-in-JS inline layout styles
├── services/
│   ├── generateDispatch.ts      # regenerateBlock: registry lookup → generic setExercises
│   ├── persistence.ts           # autosave / presets / share-link / file import-export
│   ├── math/{types.ts,mathEngine.ts,formatters.ts,validators.ts}   # validators.ts is EMPTY
│   ├── clock/{clockTypes.ts,clockGenerator.ts}
│   ├── fractions/fractionGenerator.ts
│   ├── splitsen/splitsenGenerator.ts
│   ├── cijferen/cijferGenerator.ts
│   ├── geld/geldGenerator.ts    # 3 exports: herkennen/tekenen, wissel, teruggeven
│   ├── mab/mabGenerator.ts
│   ├── ordenen/ordenenGenerator.ts          # + recompute for manual edits
│   ├── deelbaarheid/deelbaarheidGenerator.ts
│   ├── getallenas/getallenasGenerator.ts
│   ├── temperatuur/temperatuurGenerator.ts  # kleuren / aflezen / verschil
│   ├── plaatswaarde/plaatswaardeGenerator.ts # waarde / plaats / tabel
│   ├── evenoneven/evenOnevenGenerator.ts     # rooster / cirkels
│   ├── vergelijken/vergelijkenGenerator.ts   # getallen / kiezen
│   ├── afronden/afrondenGenerator.ts         # natural+decimal rooster / simpel (targetsFor, roundTo)
│   ├── romeinse/romeinseGenerator.ts         # herkennen / schrijven (toRoman, NIVEAU_MAX)
│   └── herleidingen/herleidingenGenerator.ts # metric unit conversions (ladderFor; integer-exact)
└── components/
    ├── layout/{sidebar.tsx,TopBar.tsx,HelpModal.tsx,PresetModal.tsx,
    │           BaseSettingsPanel.tsx,BaseSettingsModal.tsx}   # §13 sidebar gear menu + base modal
    ├── onboarding/TourOverlay.tsx                              # first-run spotlight tutorial
    ├── massadd/MassAddModal.tsx                                # §13 "Toevoegen" modal
    ├── curriculum/CurriculumBuilderModal.tsx                   # §13 curriculum builder
    ├── shared/ExercisePreview.tsx                              # §13 fit-to-card live example
    ├── ui/IconButton.tsx
    ├── ui/Switch.tsx           # iOS-style toggle (boolean controls)
    ├── configurator/
    │   ├── Inspector.tsx        # mounts EXERCISE_UI[typeId].Config; locked-mode gating; splitsen manual-number boxes
    │   ├── sharedPluginStyles.ts  # radioBtn + pill + onOff helpers
    │   └── plugins/*Config.tsx  # one per family (+ addition/ & multiplication/ sub-settings)
    └── viewer/
        ├── *Viewer.tsx + *SVG.tsx      # one renderer per family; ClockViewer/FractionViewer wrap item components
        ├── VerticalFraction.tsx        # shared stacked-fraction component
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
- **Per-family constraint interfaces** in [types.ts](src/services/math/types.ts)
  (`AddSubConstraints`, `MabConstraints`, …) document the default key sets.
  `MathBlock.constraints` stays `any` at the container level (blocks are
  heterogeneous); plugins/generators read the keys they expect.

What's still per-type by necessity: the generator, viewer, and config component
themselves (genuinely different code), plus their two registry rows. Viewers take
a uniform `{ block, showSolutions }`; any grid/mode hint is derived inside the
viewer from `block` (see `MabViewer`, `FractionViewer`, `ClockViewer`).

Adding a type = generator + viewer + config + one row in each registry file (§5).

The same ship rewrote the **print system** (§9): the A4 card became a real `<table>`
so Chrome repeats the header/footer on every page, `@page margin:0` makes margins
dialog-proof, and `FragmentableGrid` lets exercises flow across page breaks. The old
`position:fixed` footer + `@page` margins + single-grid viewers are gone.

---

## 13. Teacher-workflow layer (base settings · mass-add · curriculum)

Three features built on top of the registry. None add `typeId` branches — they all
drive the existing registry/config machinery.

### Global base settings (snapshot-on-add)

[baseSettings.ts](src/config/baseSettings.ts) — pure data: `BaseSettings`
(max/getalsoort/operand masks/bridges map/decimalen/breuk-opties) + `DEFAULT_BASE` +
`baseApply(base, registryDefaults)`. The teacher sets these once (sidebar →
Geavanceerd → Basisinstellingen, [BaseSettingsModal.tsx](src/components/layout/BaseSettingsModal.tsx)).
`addBlockFromType` snapshots them into each **new** block:
`constraints = { ...registryDefaults, ...baseApply(base, defaults), ...leafOverride }`
(leaf wins). `baseApply` writes a key **only if** that type's realized defaults declare
it (`'key' in defaults`), mapping the semantic max onto `maxGetal`/`maxRange`/`maxNumber`
and the masks/bridges/decimalen/breuk-toggles where present. Snapshot, not live — changing
the base never retro-affects existing blocks.

### Mass-add modal ("Toevoegen")

[exerciseCatalog.ts](src/config/exerciseCatalog.ts) walks `APP_STRUCTURE` → a flat
list of implemented leaves grouped by `typeId` into variant rows (+ `catalogDomains`
for the filter chips; multi-parent typeIds like klok get parent-prefixed variant
labels). [MassAddModal.tsx](src/components/massadd/MassAddModal.tsx) renders a card per
type with a **live example** via the shared
[ExercisePreview.tsx](src/components/shared/ExercisePreview.tsx) — it builds a throwaway
1-exercise block, calls `REGISTRY[typeId].generate` **directly** (no store writes), and
renders `EXERCISE_UI[typeId].Viewer` in an error boundary + IntersectionObserver, scaled
to fit the card width. "Alles toevoegen" calls `addBlockFromType` per selected type then
`generateAllBlocks`.

### Curriculum builder + locked parent mode

[CurriculumBuilderModal.tsx](src/components/curriculum/CurriculumBuilderModal.tsx)
(sidebar → Geavanceerd → Curriculum samenstellen) lets a teacher pick which types are
allowed and tune each type's difficulty using the **real config plugin**. To edit
off-sheet it seeds the store's `draftBlocks` slice (one per type) and mounts
`EXERCISE_UI[typeId].Config` against the draft; `updateBlockSettings` falls through to
`draftBlocks` when the id isn't in `blocks`, so the plugins work unchanged. "Deel
curriculum-link" derives `allowedTypes` (typeId + label + the draft's constraints) and
shares a **template + `CurriculumLock`** link.

Opening such a link sets `store.curriculum` (via `loadWorksheet`). In locked mode:
sidebar ([sidebar.tsx](src/components/layout/sidebar.tsx)) shows only the whitelist
(hides the tree + Geavanceerd), the Inspector shows a banner and hides difficulty/
differentiation (count + Genereer stay), and the store gate (§3) freezes everything but
count + page-break. The lock is enforced in the store, so it holds regardless of UI.

### Shared bits

- [VerticalFraction.tsx](src/components/viewer/VerticalFraction.tsx) — single stacked
  numerator/bar/denominator (+ optional whole) component; used by every fraction render
  (mental-math, fraction viewer, ordenen, getallenas rational lines).
- [TopBar.tsx](src/components/layout/TopBar.tsx) — "Toevoegen" (mass-add), "Genereer
  alles", a **Delen** dropdown (Blad / Sjabloon), and a **⋯ Meer** overflow
  (Exporteer / Importeer / Presets).
- `numberMatchesMask` / `digitAtPlace` in [mathEngine.ts](src/services/math/mathEngine.ts)
  — place-mask filtering reused by ordenen (and the splitsen decimal masks).
