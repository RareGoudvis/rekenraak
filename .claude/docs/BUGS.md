# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- **¼-width screenshot pass for the sentence types** (left over from 7a, 2026-09-12): the
  measured clamp uses `min-content`, which under-reports text that wraps word by word, so
  getalfunctie, tijdsduur, verbanden, geld-rekenen and herleidingen may now *offer* a quarter
  that reads badly. Nothing moves on its own (the teacher opts in), but each deserves one
  look at ¼ and, if illegible, a `VETO_MIN` entry. The drawing-shaped types already sit on
  the veto list.

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
