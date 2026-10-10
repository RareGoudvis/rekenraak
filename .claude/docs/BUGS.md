# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Ordenen pw017 {decimal, 3 dp, 100 000} is 8 px te breed (the space / ";" fix of 2026-10-09 kept
  every glyph count). 2026-09-27
- mab-tekenen at width ¼ (default leaf, the packer keeps w1): the D/H/T/E table is ~75 px wide, no
  room to draw. Fix: minWidth 2 for mab-tekenen (owner call: it reverses the C1 rule pinned by
  blockLayout.test "mab-tekenen can go to a quarter"). 2026-09-27
- Narrow-width wrapping: vergelijken representaties woorden vs plaatswaarde at ½ / ¼ (pw021): the
  "1H2T7E5t" code runs 5-14 px out of the cell. 2026-09-27
- Solution styling: klok lezen / omzetten answers are ~8 px under each clock; geld-teruggeven turns the GIVEN price and paid amount red
  too; geld-tekenen's key only repeats the prompt amount (~7 px); colouring keys (breuken hoeveelheid /
  veelhoek, deelbaarheid, even-oneven) use the light-blue fill, not red (owner call). 2026-09-27


- HerleidingenViewer: the right-aligned left side is sized from a char-count estimate (`leftW`, ~9.5 px/char)
  that undershoots a compound given side ("856 dm²  36 cm²" at 13pt), so it overflows the box to the LEFT;
  the Oefenmodus card (which crops at x = 0) then cuts its first digit ("56 dm² 36 cm² ="), seen at 1280 x 800
  (~/Downloads/clean-sweep/s3/after-number-unit/herleidingen-oppervlakte-writeunits.png). Fix: measure the
  side or nowrap + min-width: max-content on the left box. Found by S3. 2026-10-09

## Config

## Generators


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Kommagetallen drop their trailing zero in a fixed-decimals block: afronden-dec-rooster DEFAULT (2 dp)
  prints "4,1", "63,8" next to "70,34"; ordenen-dec DEFAULT prints "544,3" among "127,49" (the numbers
  are stored as floats and printed with `formatMathNumber`, no `toFixed(dp)`). Found by S1. 2026-10-10
- Hoofdrekenen breuken keys print big numerators without spaces ("36000004/5", VerticalFraction); an
  {M, E} operand mask at max 1 000 yields "9 000 001 × 8/10" (the mask overrides the max, pw021). 2026-09-27
- Empty keys: breuken-hoeveelheid DEFAULT leaves its ": / × / =" lines empty with solutions on. 2026-09-27
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

## Bordmodus

- getallenrijen (seen on getalbegrip-getallenrijen-dec in a 298 px board card at 200 %): the first and last
  numbers of each row sit across the oval's left / right outline ("8|35", "86|0"); the viewer, not the card. 2026-10-09
