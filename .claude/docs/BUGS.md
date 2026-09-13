# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- **Vormleer eigenschappen table is wider than its column** (2026-09-13): with all property columns
  on, the driehoeken/vierhoeken table needs more than the full 688px (≈212px over) and is clipped at
  ½; the horizontal-overflow banner now says so, but the table itself should drop to fewer columns
  or wrap the headers (`VormleerViewer` eigenschappen branch).

- **even-oneven measures two different intrinsic widths on identical code** (2026-09-13,
  branch G): two `font:baseline` runs of the SAME build put `even-oneven-rooster` and
  `even-oneven-cirkels` at width 2 in different tiers — intrinsic 425/562px in one run,
  297/308px in the next, so the packer promotes the block to full width or doesn't, and the
  cell height swings ~80-100px. Reproduced with no source change between the two runs, so it
  is the measurement, not the viewer: EvenOnevenViewer's rooster derives `perRow` from
  `useBlockWidth()`, and `probeIntrinsicWidth` reads min-content after a reflow that has
  sometimes not settled. Fix direction: probe after the reflow settles (a second frame), or let the viewer report its own single-item minimum.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
