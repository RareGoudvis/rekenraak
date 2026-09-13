# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. This file is the
**short rules file**; everything deep lives in `.claude/docs/`. The product is **RekenRaak**
(the folder is still called `enderklas-v2`).

## Docs

| Doc | What's in it |
|---|---|
| [.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | The deep map: data flow (§2), state table (§3), data model (§4), registry contract (§5), generator contract (§6), per-typeId registry table (§7), viewers (§8), print + page model incl. measurement contract (§9), persistence/sharing (§10), file map (§11), teacher-workflow layer (§13) |
| [.claude/docs/UI-GUIDE.md](.claude/docs/UI-GUIDE.md) | The eight design rules, the tokens (`theme.css`), canonical component styles, the one solution-red |
| [.claude/docs/TESTING.md](.claude/docs/TESTING.md) | vitest suites (generator matrix, answers, packer, persistence, store, viewer smoke) + the Playwright harnesses (width matrix, height audit, font baseline/compare, drag recipe) |
| [.claude/docs/BUGS.md](.claude/docs/BUGS.md) | Bugs found but not yet fixed — **append here instead of fixing silently**; delete the line in the commit that fixes it |
| [.claude/docs/UpdateState.md](.claude/docs/UpdateState.md) | Session log, newest first |
| [.claude/docs/REVIEW-CHECKLIST.md](.claude/docs/REVIEW-CHECKLIST.md) | Pointer only — the owner review lives in the local, gitignored `REVIEW.local.md` |
| [.claude/docs/klascement.md](.claude/docs/klascement.md) | Teacher-facing intro (Dutch): what it does, what's in it, why, free-forever ethos |
| [src/components/viewer/README.md](src/components/viewer/README.md) | The six rules every viewer must follow |

---

## Commands

```bash
npm run dev            # Vite dev server (5173)
npm run check          # tsc -b && eslint && vite build && vitest run — the gate before every commit
npm test               # vitest run (npm run test:watch for watch mode)
npm run build          # tsc -b && vite build
npm run lint
npm run matrix         # Playwright width matrix → scripts/width-matrix.result*.json (needs a dev server; --url --seed)
npm run height:audit   # Playwright vertical measurement audit (needs a dev server)
npm run font:baseline  # screenshot every sidebar leaf (--out dir --seed); font:compare diffs two runs
```

The dev build exposes `window.__rekenraak` (typeIds, leaves, seed, measured, addBlockFromType,
updateBlockSettings, clearBlocks, setIgnoreMinWidth, getState) for the harnesses.

---

## What this is

Dutch (Flemish) primary-school **worksheet generator**. Teachers compose math exercise
blocks, preview them on virtual A4 pages, and export via the browser print dialog (Save as
PDF). UI text is Dutch; code and comments are English. Everything is client-side React 19 +
TypeScript + Vite + one Zustand store — no backend, no account, no tracking.

---

## Working rules (humans and agents)

- **Gate before every commit:** `npm run check`. Commit per logical step, Conventional
  Commits, English. Never `git add -A`; stage explicit paths. Do not push unless asked.
- **Found a bug outside your task?** One line in [BUGS.md](.claude/docs/BUGS.md), never a
  silent fix. Fixing one? Delete its line in the same commit.
- **Docs are the supervisor's:** agents do not edit ARCHITECTURE / CLAUDE / UpdateState;
  they report doc deltas. Exceptions: BUGS.md lines, TESTING.md for a harness you wrote.
- **Shared files:** if a file you need is dirty from someone else's in-progress work, wait
  for their commit (re-check every 60 s) instead of editing a dirty file; commit your own
  hunk in that file as soon as it's green.
- **Scratch stays out of the repo:** temp scripts and screenshots go to the session
  scratchpad or `~/Downloads/<task>-check/`. Kill any dev server you started.
- **Visual work is verified visually:** Playwright against a dev server, real
  `mouse.move/down/up` for drag, screenshots reviewed before the commit. Recipes in TESTING.md.
- **No `typeId ===` branches** outside the registry tables; **no hardcoded sheet widths
  or font sizes** in viewers (read `useBlockWidth()`, use the `--sheet-size-*` tokens).
- Comments explain **why**, one line, in English (rules below).

## Session tracking

At the end of every conversation where changes were made, prepend a new entry to
[.claude/docs/UpdateState.md](.claude/docs/UpdateState.md):

**YYYY-MM-DD** — [1-2 sentence summary of what changed and why]

Most recent entry goes at the top, below the `---` divider.

## Doc-sync rule

After any **structural** change, update **[.claude/docs/ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md)
+ this file** in the *same* change. Triggers: a new exercise type / generator / viewer / config
plugin or registry row; a new store slice or action, or a changed history / lock / autosave
rule; a changed persistence/share format or version; a new file or directory under `src/`
(→ §11 file map); changed print / packer / measurement / registry wiring. A `Stop` hook
([.claude/hooks/doc-sync-check.ps1](.claude/hooks/doc-sync-check.ps1)) warns once if
structural source files changed without these docs.

---

## Adding a new exercise type

Types are declared in a **central registry** keyed by exact `typeId`:
[exerciseRegistry.ts](src/config/exerciseRegistry.ts) (pure data — generator, exercise
field, typed defaults) + [exerciseUI.tsx](src/config/exerciseUI.tsx) (Viewer, Config,
optional StyleConfig / AdvancedConfig). Dispatch / Inspector / App / `addBlockFromType` are
**registry lookups, not if-else branches**. Full contract: [ARCHITECTURE §5](.claude/docs/ARCHITECTURE.md);
the per-typeId table is §7.

1. Exercise interface + array field on `MathBlock` in [types.ts](src/services/math/types.ts);
   an `XConstraints` type in [constraintTypes.ts](src/services/math/constraintTypes.ts)
2. Generator at `src/services/[type]/[type]Generator.ts` → `[Type]Exercise[]`
3. Viewer at `src/components/viewer/[Type]Viewer.tsx`, `{ block, showSolutions }`, following
   [viewer/README.md](src/components/viewer/README.md)
4. Config plugin at `src/components/configurator/plugins/[Type]Config.tsx`, `{ block }`,
   reading/writing through `useConstraints<XConstraints>`
5. One `row<XConstraints>({...})` in `REGISTRY` + one row in `EXERCISE_UI` (same key)
6. One leaf in `APP_STRUCTURE` ([appstructure.ts](src/config/appstructure.ts)) with `typeId`
   + optional `defaultConstraints`; its options in [constraintSpace.ts](src/config/constraintSpace.ts)
   so the generator matrix tests them
7. A `rowUnits` / `minWidth` entry in [blockLayout.ts](src/services/layout/blockLayout.ts)
   (first-paint fallback; the real clamp and heights are measured) — run `npm run matrix`

Pointers: **state slices** → ARCHITECTURE §3 · **types / generators / viewers** → §7 ·
**`MathBlock`, `Equation`, `Fraction`** → §4 · **directory tree** → §11 · **whiteboard mode
(`src/board/`, branch `whiteboard` only)** → §14.

---

## Print / PDF export

There is **no react-pdf** — export is the browser print dialog, and the on-screen page *is*
what prints. [pagePacker](src/services/layout/pagePacker.ts) decides the breaks from
**measured** block heights and content widths ([useMeasuredHeights](src/hooks/useMeasuredHeights.ts),
with the estimate table as first-paint fallback); [PageSheet](src/components/layout/PageSheet.tsx)
renders one page with its own header/footer and `break-after: page`. Screen geometry equals
print geometry (8 mm head, 14 mm sides) — keep them in sync. Detail and the measurement
contract: [ARCHITECTURE §9](.claude/docs/ARCHITECTURE.md).

---

## Code commenting guidelines

Comment the **WHY**, not the WHAT. Well-named identifiers already describe what the code does.

1. **Non-obvious logic** — one line above it. Bad: `const scaled = val * 1_000_000;`
   Good: `// Avoid JS float rounding — all math uses scaled integers, divide back at display time`
2. **Business rules** — Dutch education domain logic explained in English.
   `// 'bruggetje' = carry/borrow across a place-value boundary (Dutch primary school term)`
3. **Constraint meanings** — on the `XConstraints` field (the index signature still admits unknown keys).
   `// bridges.E = 'REQUIRED' means the units column must produce a carry/borrow`
4. **Magic numbers** — always the origin. `// 1123px = A4 height at 96dpi`
5. **Parallel logic** — mark twins. `// SYNC: keep MabViewer.tsx and MabBlocksSVG.tsx block sizing aligned`
6. **No comment needed for** standard hooks usage, obvious setters, self-explanatory JSX, clear library calls.

Functions get at most one short sentence, only when name + parameters don't tell the story.
No multi-line docblocks.

---

## Style

Use the tokens in [theme.css](src/assets/theme.css) — **never hardcode bg/text/border/accent
hex or sheet font sizes** — and reuse the shared style helpers in
[sharedPluginStyles.ts](src/components/configurator/sharedPluginStyles.ts) and
[solutionStyle.ts](src/components/viewer/solutionStyle.ts). See [UI-GUIDE.md](.claude/docs/UI-GUIDE.md).
