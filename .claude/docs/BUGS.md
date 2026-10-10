# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- TopBar below a ~915 px window: stage 3 is the last stage, so the Meer button and the right group
  overlap (2 px at 915, ~90 px at 840; Chromium, 2026-10-09). Fix: a stage 4 (Genereer alles into
  Meer) or a min-width on the app shell. 2026-10-09

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Herleidingen: compound answers print zero parts ("71 dl 0 cl 0 ml"; owner call whether a zero
  part is a blank to fill or should be dropped). 2026-09-27
- lengte-meten / omtrek with Lengte max 10-18 (pairwise rows): a figure wider than its column is now
  drawn scaled down with "niet op ware grootte" (2026-10-10), so in the 'meten' model the child
  measures a smaller figure than the key's length. Owner call: cap the generated span to the column's
  cm width instead (generator). 2026-10-10



## Config

## Generators


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Kommagetallen drop their trailing zero in a fixed-decimals block: afronden-dec-rooster DEFAULT (2 dp)
  prints "4,1", "63,8" next to "70,34"; ordenen-dec DEFAULT prints "544,3" among "127,49" (the numbers
  are stored as floats and printed with `formatMathNumber`, no `toFixed(dp)`). Found by S1. 2026-10-10
- hr-std-gemengd-dec DEFAULT: its '×' rows multiply two 2-decimal numbers ("4,89 × 100,12 = 489,5868")
  in a mental-arithmetic block (owner call). 2026-09-27
- Hoofdrekenen breuken keys print big numerators without spaces ("36000004/5", VerticalFraction); an
  {M, E} operand mask at max 1 000 yields "9 000 001 × 8/10" (the mask overrides the max, pw021). 2026-09-27
- Degenerate defaults: geld-wissel's default already notes 2 doubles; breuken-kleuren /
  -herkennen defaults repeat 7/8 and 2/5; deelbaarheid-rooster's title says "2, 5 en 10" over rows 10,
  10, 2. 2026-09-27


## Limit audit 2026-10-07

- hr-std-gemengd never draws the compenseren tussenstap: the mixed block has no top-level `preset`, so
  MathBlockRenderer's shape test never sees a compenseren row there (S2 2026-10-10). 2026-10-10
All [L1]-[L21], [E1]-[E11], [N1]-[N2] and [T1] are fixed on rc (fix campaign 2026-10-07/08, see
UpdateState). Left over, found while fixing:

## Oefenmodus (first classroom test, 2026-10-09)

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

- `constraintSpace` lists kalender `questionCount` [1, 5, 10] while KalenderConfig's slider offers 3-8
  (split off the kalender defaultCount line, fixed by S1 2026-10-09). 2026-09-27

- Flaky: `oefenen.zeroOutput.test.ts` failed once in the gate on `hr-std-delen-dec {"maxGetal":1e9,
  "operandMax":[20,20,20,20]}: pre-flight must flag it` (the unseeded `rowYields` found an exercise that
  run); passes alone. The dead/alive verdict depends on Math.random. 2026-10-09

## Bordmodus

