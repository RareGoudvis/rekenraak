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
| `pagePacker.test.ts` | Placement rules: join a row, start a row, exact fit, page flush, `pageBreakBefore`, spanning blocks, min-width promotion, `pageIndexByBlock`. Written against `COL_UNITS` / `ROW_BUDGET`, never literal 6/36, so it survives the grid change. |
| `persistence.test.ts` | File round-trip, version gate (a newer file throws in Dutch), malformed input, share-link encode/decode, template stripping, curriculum lock, size backstop. |
| `store.test.ts` | Block order: `swapBlocks` (trade places, no-ops, history, curriculum lock) and the insert-before compensation both drag surfaces apply to `reorderBlocks`. jsdom — the store touches `localStorage` on import. |
| `viewers.smoke.test.tsx` | Every `EXERCISE_UI` viewer renders with real generated data at three cell widths (681 / 338 / 163 px) with solutions on and off, and logs no `console.error`. |

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
