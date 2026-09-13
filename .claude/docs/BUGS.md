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

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
