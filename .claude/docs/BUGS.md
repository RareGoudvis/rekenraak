# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- **Kalender › Maandrooster at ½ width overflows** (2026-09-13, matrix): `w2 overflow 1.18`
  since 48f4e27 (answer lines on one column, 2026-09-12 23:27 — after the previous matrix
  run); the measured clamp now refuses ½ and the LAYOUT fallback says 4. Likely the question
  text + `minWidth` answer line in one non-wrapping row. Fix, re-run `npm run matrix`, and
  set the fallback back to 2 (`VETO_MIN` already holds it at 2).

- **¼-width screenshot pass for the sentence types** (left over from 7a, 2026-09-12): the
  measured clamp uses `min-content`, which under-reports text that wraps word by word, so
  getalfunctie, tijdsduur, verbanden, geld-rekenen and herleidingen may now *offer* a quarter
  that reads badly. Nothing moves on its own (the teacher opts in), but each deserves one
  look at ¼ and, if illegible, a `VETO_MIN` entry. The drawing-shaped types already sit on
  the veto list.

- **Vormleer eigenschappen: the figure spills out of its table cell** (2026-09-13): the mini
  is drawn at `size=76` with `overflow: visible`, but a rotated vierhoek's polygon is wider
  than 76 units, so it paints over the neighbouring property columns. Pre-existing, visible
  at every font size; it needs the mini to fit its box (scale the polygon to `size`) rather
  than a bigger cell.

- **Breuken lijnstuk calc row clips at a quarter width** (2026-09-13, C1 step 8 review):
  `___ cm : ___ = ___ cm` and the `___ × ___ cm = ___ cm` line below it run past the right
  edge at width 1 (163px) even with the drawn segment itself capped to half the column
  (C1 step 11) — overflow 1.086 with a 15cm segment. The blanks (`blank(28)`/`blank(24)`
  etc.) are fixed px and never shrink or wrap; not floored by SETTINGS_FLOOR since
  `lijnstuk` isn't `hoeveelheid`. Fix direction: either float the calc row's blanks in `em`
  with a narrower floor at small widths, or wrap the row like the getalfunctie schrijven
  answer line does.

- **A block wider than the full column clips in silence** (2026-09-13): a page that
  overflows VERTICALLY outlines itself and says by how much; horizontal overflow says
  nothing. At bodyFontScale 1.8 a vergelijken block needs 740px of a 688px full-width cell
  (overflow 1.10) and simply loses its right edge on paper. The teacher's way out exists
  ("Verklein om in de kolom te passen"), but nothing on the sheet points at it.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
