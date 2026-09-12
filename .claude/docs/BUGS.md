# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Generators

## Layout / sheet

- **More types should fit ¼ width** (owner ask 2026-09-12). Today only klok, geld-herkennen,
  temperatuur, maateenheid (+ cijferen since this note, + 3 furniture) go to ¼; ordenen,
  splitsen, procenten, breuken-rangschikken only with a single exercise. Width-matrix
  overflow at 163px says the near-misses are hr-std-* 1.36, kettingsommen 1.34, plaatswaarde
  1.33, ordenen / breuken-rangschikken 1.21, deelbaarheid 1.07. hr-std is the big one: the
  screenshot at ½ shows huge slack (fixed operand cells + 94px answer line). A `compact`
  render mode in `MathBlockRenderer` (narrow answer line ≈ 50px, no fixed operand cell,
  1-up) for cells < 200px would bring hr-std, ketting and plaatswaarde to ¼. Re-run
  `scripts/width-matrix.mjs` after.
- **`ScaledBlock` never shrinks below zoom 1** — `src/components/viewer/ScaledBlock.tsx`: a
  block that still overflows at zoom 1 just overflows. Height-fit pass never built (2026-09-12).
- **Cell width 688 vs `FULL_BLOCK_WIDTH_PX` 681** — `App.tsx cellWidthPx` uses 688 (794 − 2×53),
  `BlockWidthContext.tsx` default is 681 (15 mm). Viewers get slightly different widths depending
  on whether they're inside a provider. Unify (2026-09-12).
- **A `spans` block flows on paper but clips on screen** — `pagePacker` marks a block taller
  than one page `spans` and FragmentableGrid splits it across printed pages, but on screen
  `.page-sheet-body` is `overflow: hidden`, so the same block is simply cut off and the page
  shows the red overflow banner. Reproduce: a half-width "Getallen herkennen" at the default
  count (measured 1012px against a 944px body). The preview therefore does not show what
  prints for exactly the case the banner is about (2026-09-12).
- **The browser's own Ctrl+P bypasses `usePrint`** — `src/hooks/usePrint.ts` deselects the
  active block and waits two animation frames for the remeasure-and-repack before opening the
  dialog; a native Ctrl+P does neither, so a sheet printed that way can still carry the
  selection halo and the pre-repack pagination. Fix direction: a `beforeprint` listener that
  does the same deselect (the repack cannot be awaited from there) (2026-09-12).
- **37 viewers set solution red inline** — only the four bewerkingen viewers use bold + the shared
  colour; the rest hardcode `color: red`-style inline. Wants one `--ink-solution` token + shared
  style (2026-09-10).
## Constraints

- **Plugins that destructure never moved to `useConstraints`** — about 25 of the ~45 config
  plugins read `const { a = 1, b } = block.constraints as XConstraints` and keep a hand-rolled
  `set`. They are typed, but the hook (`src/components/configurator/useConstraints.ts`) is only
  used by the ~15 that kept a `c`. Harmless duplication; convert opportunistically (2026-09-12).
## Tooling

- **Indivisible blocks leave big blank tails** — measure-then-pack (789b3a8) removed the
  estimate error, but a block that does not fit the remaining page still moves whole to the next
  page (layout-check run 2026-09-12: page 3 = one ½ block + 466px blank because the next block
  was 628px). Enhancement: let multi-row viewers (FragmentableGrid users) split across pages —
  packer emits `{ block, rowFrom, rowTo }` per page, viewers accept an item window; per-row
  heights are measurable from `.print-row` children. Big change (≈40 viewers); design first.

## Docs

- Historical links in `UpdateState.md` to `StyleBuilderModal.tsx` ×2, `BaseSettingsPanel.tsx`,
  and `PresetModal.tsx` (ARCHITECTURE history note) point at renamed/deleted files. Accurate
  when written; demote to plain text if they bother anyone (2026-09-12).
- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12).
