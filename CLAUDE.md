# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.
This file is the **short rules file**. Everything deep lives in `.claude/docs/`.

## Docs

| Doc | What's in it |
|---|---|
| [.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | The deep map: data flow (§2), state table (§3), data model (§4), registry contract (§5), generator contract (§6), per-typeId registry table (§7), viewers (§8), print + page model (§9), persistence/sharing (§10), file map (§11), teacher-workflow layer (§13) |
| [.claude/docs/UI-GUIDE.md](.claude/docs/UI-GUIDE.md) | The eight design rules, the tokens (`theme.css`), canonical component styles |
| [.claude/docs/UpdateState.md](.claude/docs/UpdateState.md) | Session log, newest first |
| [.claude/docs/REVIEW-CHECKLIST.md](.claude/docs/REVIEW-CHECKLIST.md) | Per-leaf owner review checklist |
| [.claude/docs/TESTING.md](.claude/docs/TESTING.md) | How to run the vitest suites (generator matrix, answers, packer, viewer smoke) |
| [.claude/docs/BUGS.md](.claude/docs/BUGS.md) | Bugs found but not yet fixed — **append here instead of fixing silently**; clear the line when fixed |

---

## Commands

```bash
npm run dev       # start dev server (Vite)
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm test          # vitest (being added)
npm run preview   # preview production build
```

---

## What this is

Dutch (Flemish) primary-school **worksheet generator**. Teachers compose math exercise
blocks, preview them on virtual A4 pages, and export via the browser print dialog (Save as
PDF). UI text is Dutch; code and comments are English. Everything is client-side React 19 +
TypeScript + Vite + one Zustand store — no backend, no account, no tracking.

---

## Session tracking

At the end of every conversation where changes were made, prepend a new entry to
[.claude/docs/UpdateState.md](.claude/docs/UpdateState.md) using this format:

**YYYY-MM-DD** — [1-2 sentence summary of what changed and why]

Most recent entry goes at the top, below the `---` divider. Do this before the final response.

## Doc-sync rule

After any **structural** change, update **[.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md)
+ this file** in the *same* change, before the final response. Triggers:

- a new exercise type / generator / viewer / config plugin, or a new row in
  `exerciseRegistry.ts` / `exerciseUI.tsx`;
- a new store **slice or action**, or a changed history / lock / autosave rule
  ([useWorksheetStore.tsx](src/store/useWorksheetStore.tsx));
- changed **persistence/share** format or version ([persistence.ts](src/services/persistence.ts));
- a new file or directory under `src/` (add it to the ARCHITECTURE §11 file map);
- changed print / packer / registry wiring.

ARCHITECTURE.md is the deep map; CLAUDE.md is the short rules. A `Stop` hook
([.claude/hooks/doc-sync-check.ps1](.claude/hooks/doc-sync-check.ps1)) warns once if
structural source files changed without these docs.

---

## Adding a new exercise type

Types are declared in a **central registry** keyed by exact `typeId`:
[exerciseRegistry.ts](src/config/exerciseRegistry.ts) (pure data — generator, exercise
field, defaults) + [exerciseUI.tsx](src/config/exerciseUI.tsx) (Viewer + Config).
Dispatch / Inspector / App / `addBlockFromType` are **registry lookups, not if-else
branches** — never add a `typeId === …` branch. Full contract:
[ARCHITECTURE §5](.claude/docs/ARCHITECTURE.md); the per-typeId table is §7.

1. Add the exercise interface + its array field to `MathBlock` in [types.ts](src/services/math/types.ts),
   and an `XConstraints` type in [constraintTypes.ts](src/services/math/constraintTypes.ts)
2. Generator at `src/services/[type]/[type]Generator.ts` → `[Type]Exercise[]`
3. Viewer at `src/components/viewer/[Type]Viewer.tsx`, uniform `{ block, showSolutions }`
4. Config plugin at `src/components/configurator/plugins/[Type]Config.tsx`, `{ block }`
5. **One row** in `REGISTRY` via `row<XConstraints>({...})` + **one row** in `EXERCISE_UI` (same `typeId` key)
6. One leaf in `APP_STRUCTURE` ([appstructure.ts](src/config/appstructure.ts)) with `typeId`
   + optional `defaultConstraints` (merged on top of registry defaults)
7. A `rowUnits` / `minWidth` entry in [blockLayout.ts](src/config/blockLayout.ts) so the
   packer can budget it

Pointers in place of the old inline tables: **state slices** → ARCHITECTURE §3 ·
**exercise types / generators / viewers** → §7 · **key type definitions (`MathBlock`,
`Equation`, `Fraction`, …)** → §4 and [types.ts](src/services/math/types.ts) ·
**directory tree** → §11 · **whiteboard mode (`src/board/`, branch `whiteboard` only)** → §14.

---

## Print / PDF export

There is **no react-pdf** — export is the browser print dialog (Save as PDF), and the
on-screen preview *is* what prints. Pages are real: [pagePacker](src/services/layout/pagePacker.ts)
decides the breaks, [PageSheet](src/components/layout/PageSheet.tsx) renders one page with
its own header/footer and `break-after: page`, so the screen page count equals the PDF page
count. **SYNC rule:** any viewer change must still print — multi-item viewers go through
[FragmentableGrid](src/components/viewer/FragmentableGrid.tsx), and viewers read the cell
width from `useBlockWidth()`, never a constant. Detail: [ARCHITECTURE §9](.claude/docs/ARCHITECTURE.md).

---

## Code commenting guidelines

Comment the **WHY**, not the WHAT. Well-named identifiers already describe what the code does. These rules apply everywhere in this codebase:

1. **Non-obvious logic** — if a junior dev might ask "why does this work?", add a one-line comment above it.
   - Bad: `const scaled = val * 1_000_000;`
   - Good: `// Avoid JS float rounding — all math uses scaled integers, divide back at display time`

2. **Business rules** — Dutch education domain logic must be explained in English.
   - Example: `// 'bruggetje' = carry/borrow across a place-value boundary (Dutch primary school term)`
   - Example: `// 'splitsen' = decomposing a number into two parts, e.g. 7 → 3+4`

3. **Constraint meanings** — document what constraint values mean on the `XConstraints` field (the index signature still admits unknown keys).
   - Example: `// bridges.E = 'REQUIRED' means the units column must produce a carry/borrow`

4. **Magic numbers** — always explain the origin.
   - Example: `// 1044px = A4 height at 96dpi screen resolution`
   - Example: `// MAX_ATTEMPTS = 20000 prevents infinite loop when constraints are over-restrictive`

5. **Parallel logic** — mark code that must stay in sync with its twin elsewhere.
   - Example: `// SYNC: keep MabViewer.tsx and MabBlocksSVG.tsx block sizing aligned`
   - Applies to any logic duplicated across files (e.g. a viewer and its SVG helper).

6. **No comment needed for:** standard React hooks usage, obvious state setters, self-explanatory JSX structure, imported library calls where the function name is clear.

Functions get at most one short sentence — only when the function name + parameter names don't tell the full story. No multi-line docblocks.

---

## Style

Use the tokens in [theme.css](src/assets/theme.css) — **never hardcode bg/text/border/accent
hex** — and reuse the shared style helpers in
[sharedPluginStyles.ts](src/components/configurator/sharedPluginStyles.ts). See
[UI-GUIDE.md](.claude/docs/UI-GUIDE.md).
