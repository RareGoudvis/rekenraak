# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Generators

## Layout / sheet

- **No sheet font-size scale** (owner question 2026-09-12): viewers use 12 different px sizes
  (14px ×66, 13 ×27, 12 ×22, 16 ×19, 18 ×13, 15 ×13, 17 ×10 …); hoofdrekenen digits 17px,
  labels 14px, grids 12–13px. Nothing is 14pt. Proposal: tokens `--sheet-size-text`,
  `--sheet-size-math`, `--sheet-size-small` in theme.css + a B4c-style sweep; owner picks
  the values. Changes every measured tier/rowUnit → rerun width matrix after.
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
## Constraints

## Tooling

## Docs

- Historical links in `UpdateState.md` to `StyleBuilderModal.tsx` ×2, `BaseSettingsPanel.tsx`,
  and `PresetModal.tsx` (ARCHITECTURE history note) point at renamed/deleted files. Accurate
  when written; demote to plain text if they bother anyone (2026-09-12).
- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12).
