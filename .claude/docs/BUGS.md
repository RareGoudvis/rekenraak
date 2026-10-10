# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- Herleidingen writeUnits with "Zet om naar cm": the kiosk check is value-equal, so "30 dm" counts as juist when the
  header asked for cm; owner call whether the target unit should be enforced when shown (F4 2026-10-10). 2026-10-10
- Kiosk Resultaten row for a writeUnits herleiding reads "= ? (getal en eenheid)" without the target unit. 2026-10-10
- `blockLayout.minWidthUnits` reads only the top-level `preset`, so a gemengd compenseren block's first-paint
  width misses the tussenstap (the measured clamp corrects it on screen). 2026-10-10

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)




## Config

## Generators


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Degenerate defaults: geld-wissel's default already notes 2 doubles. 2026-09-27


## Limit audit 2026-10-07

All [L1]-[L21], [E1]-[E11], [N1]-[N2] and [T1] are fixed on rc (fix campaign 2026-10-07/08, see
UpdateState). Left over, found while fixing:

## Oefenmodus (first classroom test, 2026-10-09)

- Kiosk triage 2026-10-10 (gallery under ~/Downloads/kiosk-gallery/, REVIEW.local §J): controleren kiosk never
  shows a wrong sum (12/12 juist) and draws the unusable negenproef cross; vergelijken-representaties always "<"
  (breuk < 1 vs decimal 2–9); deelbaarheid-veelvouden draws "van 9" every time; omtrek-gegeven 5/6 identical;
  geld-wissel default bills [5,10] repeat; lengte-meten-gegeven unmeasurable on a screen; herleidingen L3 seed
  gives 7–10-digit answers ("68 ha = ? cm²"); hoofdrekenen -dec defaults aren't mental maths ("432,36 : 0,6");
  afronden draws 2 → 0; typed cards keep the paper "____" line. 2026-10-10

- Kiosk verbanden-paren ("Getallenkennis › Omzettingen"): the session shows no exercise at all (owner, 2026-10-10
  preview). Suspect: the row dies in the pre-flight / `nextExercise` returns null at the builder defaults.
  Reproduce via a single-row session; see the kiosk-gallery `gen-fail` flag. 2026-10-10
- Kiosk plaatswaarde "plaats omcirkelen" (128, the 2 underlined, tap H / T / E): pointless as built — the H T E
  buttons sit in the same order as the digits, so the pupil just counts. Owner: make it a setting — e.g. shuffle
  the choice order, or ask the VALUE of the digit ("20", typed) instead of its place. 2026-10-10
- Kiosk breuken herkennen: asks "gelijke delen / aantal delen" instead of the fraction — pedagogically wrong.
  Owner: either the breukvragen path (teacher toggle) filling the fraction step by step, or better a `fraction`
  input kind where the pupil types noemer first, then teller, drawn as a real stacked fraction. 2026-10-10

## Oefenmodus beta audit 2026-10-09

External beta audit against 5c93876, every line re-verified on 4c51ef2 (evidence under
~/Downloads/oefen-check/audit/{1,2,3}/). Plan: ~/.claude/plans/oefen-audit-fixes.md. Lines are
grouped per work package so parallel deletions merge cleanly; fixed lines are deleted, O16 stays by owner decision (O7 closed as log-only, REVIEW §D).

### WP-F session format

- **O16** D12 (note, no fix, pinned by `oefenen.perf.test.ts`): every answer copies the history and
  stringifies the whole run, `saveRun` reloads all runs, `next` rebuilds the seen-keys set:
  quadratic per run, ~0.5 ms per answer and ~170 kB stored at #1000 (test: < 5 ms, < 300 kB). Only
  an endless run far past 1000 answers would feel it. 2026-10-09

### WP-H test infra



## Tooling


## Bordmodus

- Bordmodus: ink cannot be selected and moved. Owner (2026-10-10): wanted, probably as its own tool / setting —
  a lasso or tap-select on strokes (hit-test exists: `strokeHit`), then drag / delete the selection; keep the
  pen's draw-only behaviour by default. 2026-10-10

