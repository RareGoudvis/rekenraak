# Testing

Vitest. No browser, no dev server — the suites import the app's own modules directly.

```bash
npm test          # vitest run (whole suite, ~7 s warm)
npm run test:watch
npx vitest run src/__tests__/pagePacker.test.ts        # one file
npx vitest run -t "bridges are honoured"               # one test by name
```

Config: [vitest.config.ts](../../vitest.config.ts) — `environment: 'node'` by default,
`css: false`, `setupFiles: src/__tests__/setup.ts` (ResizeObserver + matchMedia shims).
The viewer suite opts into a DOM with `// @vitest-environment jsdom` at the top of its file.

## The suites

| File | What it guards |
|---|---|
| `generators.matrix.test.ts` | Every generator runs, across every constraint option. See below. |
| `generators.answers.test.ts` | The answer follows from the question: mathEngine ops (incl. fractions, decimals, multi-term chains, division remainder), bruggetjes, cijferen, splitsen sums, breuken-bewerken equivalence, ordenen ordering, deelbaarheid, procenten, verbanden, tijdsduur, kalender, negenproef, herleidingen unit factors. |
| `pagePacker.test.ts` | Placement rules, twice. Every pre-skyline test (join a row, start a row, exact fit, page flush, `pageBreakBefore`, spanning blocks, min-width promotion, `pageIndexByBlock`) now runs against `mode: 'rijen'` and is the regression guard; the `aansluitend` suite pins the skyline itself — a block filling the space under a shorter neighbour, ties to the leftmost, a full-width block waiting for the deepest column, per-column page overflow, no overlap, `skylineSlot`. Written against `COL_UNITS` / `ROW_BUDGET`, never literal 6/36, so it survives the grid change. |
| `persistence.test.ts` | File round-trip, version gate (a newer file throws in Dutch), malformed input, share-link encode/decode, template stripping, curriculum lock, size backstop. |
| `store.test.ts` | Block order: `swapBlocks` (trade places, no-ops, history, curriculum lock) and the insert-before compensation both drag surfaces apply to `reorderBlocks`. jsdom — the store touches `localStorage` on import. |
| `blockErrorBoundary.test.tsx` | The shared boundary: a throwing child renders the on-sheet message and logs, `fallback={null}` renders nothing, a `resetKey` change recovers; every `EXERCISE_UI` viewer is mounted with wrong-shaped exercise data and must never throw past the boundary (jsdom, `console.error` spy scoped). |
| `instructions.test.ts` | Every sidebar leaf resolves to a non-empty default instruction that does not end in `:`; function-valued instructions are exercised per option; worksheet templates never fall back to `"<label>:"`. |
| `viewers.smoke.test.tsx` | Every `EXERCISE_UI` viewer renders with real generated data at three cell widths (681 / 338 / 163 px) with solutions on and off, and logs no `console.error`. |
| `viewers.stale.test.tsx` | Every viewer renders exercises that were generated under DIFFERENT settings — the window between a setting change and the next Genereer. See below. |

## The generator matrix

Four passes over every `typeId` in `REGISTRY`:

- **(a) defaults** — registry defaults at `defaultCount`, 5 runs (generators are random).
- **(b) sidebar leaves** — every `APP_STRUCTURE` leaf's `defaultConstraints`, 3 runs each.
- **(c) constraint matrix** — pairwise combinations from `CONSTRAINT_SPACE`, capped at
  `PAIRWISE_CAP` (200) per type.
- **(d) leerjaar seeds** — every Leerjaar 1-6 base seed through `baseApply` × every type.

Each run asserts: no throw · the exercise array has `numberOfExercises` items · ids unique ·
no `NaN`/`Infinity` anywhere in the returned data · no holes in arrays ·
`isManuallyEdited === false`.

Passes (a), (b) and (d) are settings a teacher reaches in one click, so an empty block there
is a failure. Pass (c) mixes keys the UI would never show together, so an empty result is
recorded instead of failed — the run ends with a `[matrix]` table listing every constraint
set that under-produced. Read that table; a new line in it usually means a real narrowing.

`KNOWN_THROWS` at the top of the file lists generators that crash on a reachable setting.
Each entry names the file and line. Remove the entry when the generator is fixed.

## The stale-settings sweep (`viewers.stale.test.tsx`)

An exercise renders from its own data; `block.constraints` may only steer layout. A teacher
who changes a structural setting leaves the sheet holding OLD exercises under NEW settings
until they press Genereer (the store flags the block stale, but it keeps rendering), and a
viewer that derives structure from the live constraints instead of from the exercise takes
the whole sheet down there — as plaatswaarde did (`Cannot read properties of undefined
(reading 'digit')`, ffcccdc).

So for every sidebar leaf the suite generates three exercises once, then re-renders those
same exercises under drifted settings at 338 px (one width: the crash is data-shaped; the smoke suite covers widths), solutions off and on, asserting no
throw and no `console.error`: every value of every key in `constraintSpaceFor(typeId)` one at
a time (exhaustive — a crashing value must never be sampled away), plus the viewer-only keys
that space leaves out (`VIEWER_ONLY_DRIFT` in the suite: `equationType`, `prefill`,
`groupingMode`, `tableAnswer`, `units`, …), plus a "everything moved at once" bundle. Then
the reverse direction: generate under that bundle and drift back to the leaf defaults, so an
exercise generated large must survive a small setting as well as the other way round.

`Math.random` is stubbed with a seeded stream, so a failure reproduces instead of flaking;
`STALE_SEED=<n> npx vitest run src/__tests__/viewers.stale.test.tsx` re-runs the whole sweep
over different generated data. It is the slowest suite (~2 min); a leaf gets 120 s.

Failures print as `<origin>: <key>=<value> @<width>px sol=<bool>: THREW …` — fix them in the
viewer by reading the structure off the exercise (adding an optional field to the exercise
type, `ex.field ?? c.field` for old saved sheets), never by guarding the symptom. A drift
that draws the wrong picture without crashing is NOT a bug this suite can see, and is left to
the Inspector's stale flag.

## Adding a constraint option

`src/config/constraintSpace.ts` mirrors the option lists in the config plugins. **A picker
option added in a plugin must be added there**, or the matrix silently stops covering it —
the SYNC note at the top of the file says the same. Numeric free fields (sliders, counts)
get three values: minimum, default, maximum. Purely cosmetic keys no generator reads
(`boxHeight`, `exercisesPerRow`, …) are left out on purpose.

A new exercise type needs a `CONSTRAINT_SPACE` entry; the matrix fails without one.

## Reading a matrix failure

Failures name the type and the constraints:

```
FAIL constraint matrix: splitsen > covers 63 pairwise combinations
AssertionError: splitsen[3].total is NaN
```

Reproduce it in isolation with the constraints from the message:

```ts
import { makeBlock, generateFor } from './helpers/makeBlock';
console.log(generateFor(makeBlock('splitsen', { constraints: { layout: 'positie-math', maxGetal: 1000000 } })));
```

`src/__tests__/helpers/makeBlock.ts` builds a block exactly the way the store's
`addBlockFromType` does (registry defaults → base snapshot → leaf override) without
importing the store, so the node suites stay free of React. **SYNC: if that block literal
changes in the store, change it here too.**

## Not covered

Print output, the page-break CSS, layout measurement and anything that needs a real
browser. Those stay manual (Ctrl+P, margins None, 100%) — see the review checklist.

## The width matrix (`scripts/width-matrix.mjs`)

Not a vitest suite — it drives a real browser, because the question it answers ("can this
type render at half or quarter width?") only has a DOM answer. It is how the `minWidth`,
`rowUnits` and `perRowFull` numbers in
[blockLayout.ts](../../src/services/layout/blockLayout.ts) were obtained; re-run it after a viewer
change that moves a block's width or height.

```bash
npm run dev                                     # in another terminal; it drives the dev server
node scripts/width-matrix.mjs                   # 1600px viewport (sheetZoom = 1)
node scripts/width-matrix.mjs --width 1000      # sheetZoom < 1, to re-prove height invariance
node scripts/width-matrix.mjs --shots C:/tmp/wm --url http://localhost:5174/
node scripts/width-matrix.mjs --seed 1234                # default; seeds before every add
```

`--seed n` calls `window.__rekenraak.seed(n)` before each block is added, so a generator
that rolls wide numbers on one run and narrow ones on the next cannot move its own tier
between runs — two matrices only diff at all because of this. It defaults to 1234; the
committed result JSONs record the seed they were taken at.

Every registry type × width {4, 2, 1} × count {default, 1} = 354 cells, about 4 minutes.
Each row also carries `rowCount` (the number of `.print-row` elements, i.e. the rendered
grid rows), which is where `perRowFull` and `rowUnits` come from — counted, not inferred
from the height ratio.
Output: `scripts/width-matrix.result.json` (committed — the tiers are derived from it),
a `.csv` of the same rows (gitignored) and one PNG per cell in `~/Downloads/width-matrix/`.
Read the numbers with the rule **overflow ≤ 1.005 and zoom === 1**, then look at the
screenshots before widening a tier: several types pass numerically and are unreadable (see
the veto list in the `LAYOUT` header comment). The rule accepted a zoom down to 0.85 until
2026-09-13, from when ScaledBlock auto-fitted every block to its column. It no longer does:
a block that does not fit is widened by the packer, and shrinking is the per-block opt-in
`constraints.fitToWidth` ("Verklein om in de kolom te passen"), which the harness leaves
off — so a tier now has to hold at the size the teacher asked for.

It needs the DEV-only `window.__rekenraak` hook from `src/main.tsx`, so it cannot run
against a production build.

## The height audit (`scripts/height-audit.mjs`)

The vertical twin of the width matrix, and the answer to "the tail hint says the next block
does not fit, but it visibly does". It places ten mixed blocks at mixed widths, lets the
measure→pack→remeasure chain settle, waits out any breaker cooldown, forces one more
measure pass, and then prints per cell:

| column | what it is |
|---|---|
| `measured` | the px the PACKER used (`window.__rekenraak.measured()`, the live map) |
| `own` | the BLOCK's own height: `.print-block` offsetHeight + its margins |
| `row` | the CELL's rect. Since skyline packing a cell is positioned, not stretched into a grid row, so this must equal `own` |
| `print` | `.print-opdracht` top to the last `.print-row` bottom |
| `chrome` | `own − print`: the block padding/border/margin that also prints |
| `Δ pack` | `measured − own`: the packer disagreeing with the paper. Must be 0. |

plus, per page, the measured body box against the same box derived from the print CSS mm
values, and any `[layout]` repack-loop warning (a warning is itself a finding: it means the
hook froze whatever height it was holding).

```bash
npm run dev
node scripts/height-audit.mjs --url http://localhost:5174/ --seed 1234
```

Verdicts to read: **(a)** must be `0/10`, **(a2)** must be `none` — a stretched
cell would mean something other than the packer is still laying the page out, **(b)** the packer's row gap must
equal the CSS `rowGap`, **(c)** the screen body must equal the print body on every page,
**(d)** no unmeasured cells, **(e)** no repack-loop warnings.

`--answer-space <px>` runs the same audit at a non-default Blad › Opdrachten ›
Schrijfruimte (`docSettings.answerSpace`, the `--sheet-answer-h` token). Every answer line
in the sheet grows, so it is the cheap check that the packer still agrees with the paper
when the blocks are taller than the calibrated `rowUnits`. Run it at the default AND at 28
after anything that touches a writing line:

```bash
node scripts/height-audit.mjs --url http://localhost:5174/                    # default (18)
node scripts/height-audit.mjs --url http://localhost:5174/ --answer-space 28
```

### Guarding a writing-space change with font:compare

The recipe branch G used, and the one to reuse for any change to `--sheet-answer-h` or to a
viewer's answer lines. The baseline has to be captured BEFORE the first commit:

```bash
npx vite --port 5174                                                  # keep it running
node scripts/font-baseline.mjs --url http://localhost:5174 --out ~/Downloads/g-baseline --seed 1234
# … one commit …
node scripts/font-baseline.mjs --url http://localhost:5174 --out ~/Downloads/g-after --seed 1234
node scripts/font-compare.mjs --before ~/Downloads/g-baseline --after ~/Downloads/g-after --out ~/Downloads/g-cmp
```

A commit that only wires an EXISTING px value onto the token must report **0 flagged rows**;
anything else is a bug, not a normalisation. A commit that deliberately moves pixels reports
its flagged rows in the commit body. Known false positive: `even-oneven-rooster` and
`even-oneven-cirkels` at width 2 flip tier between two runs of identical code (BUGS.md) —
re-run before believing them.

## Font baseline / compare (`scripts/font-baseline.mjs`, `scripts/font-compare.mjs`)

Guards the 7d font-token sweep (`--sheet-size-math`/`--sheet-size-text`, theme.css):
screenshot + measure every sidebar leaf before the sweep, run it again after, and diff.
Like the width matrix, it drives a real browser and needs the DEV-only
`window.__rekenraak` hook (`leaves`, `seed`) — cannot run against a production build.

```bash
npm run dev                                                          # in another terminal
node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/before
# … apply the font sweep …
node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/after --seed 1234
node scripts/font-compare.mjs --before C:/Users/ruben/Downloads/font-check/before \
                               --after  C:/Users/ruben/Downloads/font-check/after \
                               --out    C:/Users/ruben/Downloads/font-check/compare
```

`font-baseline.mjs` walks `window.__rekenraak.leaves` (every `APP_STRUCTURE` leaf,
placeholders excluded — `flattenLeaves()` in appstructure.ts) × width `{4, 2}` (`--widths`)
× solutions `{off, on}`. For each cell it seeds `Math.random` via `window.__rekenraak.seed(n)`
(mulberry32, DEV-only — `--seed`, default 1234; **use the same seed for `before` and
`after`** or the generators will legitimately produce different numbers), adds the block
exactly the way a sidebar click does (`addBlockFromType(typeId, label,
leaf.defaultConstraints)`), sets `widthUnits`, and records the cell's `offsetHeight`, its
intrinsic (min-content) width — the same probe PageSheet runs internally — its `innerText`,
and a screenshot, into `<out>/index.json` + `<out>/<leafId>-w<width>-s<0|1>.png`. A leaf
that throws is recorded with its error and the run continues.

`font-compare.mjs` matches rows by leaf+width+solutions and flags one when: the text
differs (only geometry may change), `|Δheight| > 8px`, the intrinsic width crosses a
measured-tier boundary (151/338/688px — the same tiers `blockLayout.ts`/`pagePacker.ts`
promote at), or a pixel diff (`pixelmatch` + `pngjs`, top 28px masked so the title row's
expected +4px never trips it) exceeds 0.5%. Writes `report.json` (every row),
`report.md` (pixel-diff descending), and `contact-sheet.html` (before/after side by side,
flagged rows only — a clean sweep should produce an almost-empty sheet).

## The exercise catalogue (`scripts/catalogue.mjs`)

Not a test — builds the public, indexable `public/oefeningen.html` page (every sidebar
exercise, one card with its default opdracht-titel, a plain-language settings summary and
a screenshot) plus one PNG per leaf in `public/oefeningen/`. Like the width matrix and font
baseline it drives a real browser and needs the DEV-only `window.__rekenraak` hook, so it
cannot run against a production build.

```bash
npm run dev                                          # in another terminal
npm run catalogue -- --url http://localhost:5173/ --seed 1234
```

Walks `window.__rekenraak.leaves` (same set as `font-baseline.mjs`), and for each leaf:
clears the sheet, adds the block at full width exactly the way a sidebar click does
(`addBlockFromType(typeId, label, leaf.defaultConstraints)`), screenshots the
`[data-block-id]` cell to `<leafId>.png`, and resolves the leaf's `instruction` **inside
the page** — a function-valued instruction is lost the instant Playwright serialises the
leaf object back to Node, so the resolution (`instruction(defaultConstraints)`) runs while
`window.__rekenraak.leaves` still holds the live function. Re-run it whenever a leaf's
label, `defaultConstraints`, `instruction` or a viewer's default rendering changes; nothing
enforces that it stays in sync automatically. A screenshot over ~60 KB is logged, not
failed — check it by hand.

## Driving drag-and-drop from Playwright

Both drag surfaces (sheet blocks and the Overzicht outline) run on **pointer events**, so
a real mouse drives them — headless included:

```js
await page.mouse.move(x0, y0); await page.mouse.down();
await page.mouse.move(x0 + 20, y0 + 20, { steps: 5 });   // past the 6px threshold
await page.mouse.move(tx, ty, { steps: 10 });            // ty inside the half you mean
await page.mouse.up();
```

The grab point can be the `.sheet-drag-handle` (drags immediately) or anywhere on the
block that is not an input/button (drags past 6px of movement — under that it is a plain
click that selects the block). The target is a `[data-block-id]` cell, split into
**thirds** by `clientY`: the top third inserts the dragged block before it, the middle
third swaps the two, the bottom third inserts it right after. `Escape` during the drag
cancels. Assert the result with `window.__rekenraak.getState().blocks.map(b => b.id)`
and check no zones are left behind with `page.locator('.sheet-dropzones').count()`; a
no-op zone (e.g. "before" on the block right after the one you're dragging) never gets
`.sheet-dropzone.is-on` — check `page.locator('.sheet-dropzone.is-on').count()` is 0.

A block near the bottom of a tall sheet can sit outside the viewport, and `.print-scroll`
(the sheet's own scroll container) is NOT reset by re-seeding blocks between scenarios —
it keeps whatever `scrollTop` the last drop's `scrollIntoView` left it at. Read target
boxes with `boundingBox()` fresh right before the final `mouse.move` (after the drag has
already started, not before), and reset `document.querySelector('.print-scroll')
?.scrollTo(0, 0)` between independent scenarios sharing one page — otherwise a `toBox`
computed against a stale scroll position points off-screen and the drop silently no-ops.

There is no native drag-and-drop left in the app (`dist/assets/*.js` contains no
`setDragImage`/`dataTransfer` of ours) — an extension that hooks `dragstart` used to hang
the tab for a whole drag.
