# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Generators

## Layout / sheet

- **What still cannot go ¼ width** (was "more types should fit ¼", done 2026-09-12). The
  tight tier (< 200px) brought hr-std-*, getalpatronen, kettingsommen, plaatswaarde and
  deelbaarheid to a quarter; 32 of 59 types now measure overflow ≤ 1.005 at 163px. The 27
  that do not are drawing-shaped rather than spacing-shaped and would need a different
  rendering, not a tighter one: to-scale figures (lengte-meten 2.60, omtrek 2.83,
  oppervlakte 2.34, vormleer 2.25), grids and dials (kalender 1.72, weegschaal 2.23, mab
  1.93, even-oneven 2.82), and sentence rows whose text simply is wider than the cell
  (tijdsduur / verbanden / geld-rekenen 3.68, getalfunctie 3.52, herleidingen 3.39).
  Settings-shaped exceptions live in `minWidthUnits()`: decimal hoofdrekenen 1.39, the
  compenseren tussenstap 1.67, plaatswaarde 'tabel' 1.14. Numbers from
  `scripts/width-matrix.result.json` (2026-09-12).
- **`ScaledBlock` never shrinks below zoom 1** — `src/components/viewer/ScaledBlock.tsx`: a
  block that still overflows at zoom 1 just overflows. Height-fit pass never built (2026-09-12).
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
## Constraints

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
