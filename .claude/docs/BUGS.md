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

- **Stale settings draw the wrong picture (no crash)** (2026-09-13, viewers.stale sweep):
  the viewers survive every setting drift without throwing, but one still draws nonsense
  until Genereer is pressed. `CijferViewer` builds its column grid from
  `numberType`/`decimalPlaces` while the operands carry their own decimals, so switching to
  `natural` drops the comma column under decimal operands. Fix direction: the generator
  stores its own `decimalPlaces` on the exercise and the viewer reads `ex.field ?? c.field`.
  The Inspector's stale flag covers it for now. (`WeegschaalViewer` and `ClockExerciseItem`
  fixed on branch fix/own-data-weegschaal-klok.)

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
