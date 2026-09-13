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

- **Breuken lijnstuk calc row clips at a quarter width** (2026-09-13, C1 step 8 review):
  `___ cm : ___ = ___ cm` and the `___ × ___ cm = ___ cm` line below it run past the right
  edge at width 1 (163px) even with the drawn segment itself capped to half the column
  (C1 step 11) — overflow 1.086 with a 15cm segment. The blanks (`blank(28)`/`blank(24)`
  etc.) are fixed px and never shrink or wrap; not floored by SETTINGS_FLOOR since
  `lijnstuk` isn't `hoeveelheid`. Fix direction: either float the calc row's blanks in `em`
  with a narrower floor at small widths, or wrap the row like the getalfunctie schrijven
  answer line does.

- **A fitCols viewer can never reach the tier its content allows** (2026-09-13, C2 step 8):
  `PageSheet.probeIntrinsicWidth` measures min-content at the column count the viewer picked
  for the width it currently has, so a block rendering 2-up at a half probes ~2 items wide and
  `minWidthUnits()` refuses the quarter — even when the viewer would drop to 1-up there and the
  width matrix measures overflow 1.000 (breuken-bewerken gemengd/vereenvoudigen). Fix direction:
  probe at the narrowest tier (render the cell once at 163px off-screen), or let a viewer report
  its own single-item minimum alongside the probe.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
