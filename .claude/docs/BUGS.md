# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- Switching Blad › koptekst/voettekst style at runtime logs React's "Updating/Removing a style
  property during rerender … when a conflicting property is set" (dev only): SheetHeader mixes
  `borderWidth`/`borderColor`/`borderStyle` shorthands with `borderBottom*` longhands despite its
  "all-longhand" comment, and SheetFooter's `kader` spreads `borderStyle` over `borderTopStyle`.
  Repro: set headerStyle kader → onderstreept, footerStyle kader → lijn. Fix: write all four sides
  as longhands (changes no pixels). 2026-09-27

- Getallenas at its 1e5 top (all numberTypes, every width): the first tick label hangs 5–15 px
  outside the cell's left edge (`npm run bignum:audit -- --only getalbegrip-getallenassen-nat`).
  Fix: inset the axis by half the widest label. 2026-09-27
- Even-oneven rooster at its 1e4 top, width ½ / ¼: four-digit numbers wrap inside the 46 px cells
  and the lines overlap. Fix: size cells from the character count (46 px floor). 2026-09-27
  (Full sweep: they wrap ("9 / 029") at full width too; only ½ / ¼ trip the overlap check.)
- TopBar below a ~915 px window: stage 3 is the last stage, so the Meer button and the right group
  overlap (2 px at 915, ~90 px at 840; Chromium, 2026-10-09). Fix: a stage 4 (Genereer alles into
  Meer) or a min-width on the app shell. 2026-10-09

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- Blocks taller than one A4 page at their sidebar DEFAULTS, full width (clipped on paper): omtrek,
  oppervlakte-rooster, oppervlakte-berekenen (real-size figures, one or two per row), breuken-lijnstuk,
  breuken-veelhoek, cijferen-delen-dec (1 028 px: four 14-row grids). The teacher gets the red banner on
  the first click. Fix: fewer default exercises or smaller default figures. 2026-09-27
- lengte-meten / omtrek: real-size polylines and circles run off the cell when Lengte max 10-18 meets
  2-4 hoeken or "cirkel" (pairwise pw003/005/013/014/016/017: 35-912 px te breed, every width).
  "Verklein" is no fix for a ruler task. Fix: the generator caps the drawn span to the column's cm
  width. 2026-09-27
- breuken-lijnstuk DEFAULT, w4: 10-12 cm segments are drawn clamped to ~8,9 cm (335 px) while the key
  says "12 cm : 6 = 2 cm": the child measures a different length than the key. Fix: cap
  maxLineLength to the column's cm width instead of scaling one segment. 2026-09-27
- Ordenen pw017 {decimal, 3 dp, 100 000} is 8 px te breed (the space / ";" fix of 2026-10-09 kept
  every glyph count). 2026-09-27
- Getalpatronen at its max (100 000): every five-digit term breaks at its thousands space ("97 /
  055") at every width, w4 included. Fix: nowrap per number, column width from monoTextPx. 2026-09-27
- patronen-geh DEFAULT: the en-dash separator next to negative terms reads "-53 – -43 – -33".
  Fix: another separator (or a wider gap) when a term is negative. 2026-09-27
- Herleidingen: the red answer wraps inside its slot, splitting a number ("977 a 445 cm² = 977 000 /
  445 cm²" at the herleidingen-oppervlakte DEFAULT, every width; "92 189 / 777 dg" pw008). Compound
  answers print zero parts ("71 dl 0 cl 0 ml"). Fix: size the slot from the answer (nowrap). 2026-09-27
- geld-rekenen tables: narrow fixed columns split amounts at the thousands space ("€ 9 / 028,60",
  intrest pw007 maxEuro 10 000) and "verlies € / 404"; the table uses under half of a w4 block. 2026-09-27
- Weegschaal (massa-weegschaal-aflezen DEFAULT): the needle is drawn over the scale label it points
  at ("700", "800" crossed out). Fix: stop the needle short of the label ring. 2026-09-27
- MAB herkennen DEFAULT: pieces are tiny in big cells (hundreds ~8 px squares, units 4 px dots, tens
  ~2 px apart: nine tens read as one solid block). mab-tekenen at width ¼ (default leaf, the packer keeps
  w1): the D/H/T/E table is ~75 px wide, no room to draw. Fix: bigger pieces; minWidth 2 for
  mab-tekenen. 2026-09-27
- Narrow-width wrapping: procenten-nemen / -welk DEFAULT at ¼ split "452 van / de 904 / ="; cijferen
  headers with 3-4 terms at ¼ wrap inside a number ("… + 1 / 445 + 28 ="); vergelijken representaties
  woorden vs plaatswaarde at ½ / ¼ (pw021): the "1H2T7E5t" code runs 5-14 px out of the cell. 2026-09-27
- Hoofdrekenen natural at 1e6 with an operand mask (pw059-061 optellen/aftrekken, gemengd pw052-058):
  the two-per-row layout ends 11 px past the full-width cell (te breed at every width); hrRowLayout
  picks 2 columns the row does not fit. 2026-09-27
- Solution styling: klok lezen / omzetten answers are ~8 px under each clock; geld-teruggeven turns the GIVEN price and paid amount red
  too; geld-tekenen's key only repeats the prompt amount (~7 px); colouring keys (breuken hoeveelheid /
  veelhoek, deelbaarheid, even-oneven) use the light-blue fill, not red (owner call). 2026-09-27
- deelbaarheid at its max (100 000) prints "70344" without the thousands space. 2026-09-27

- RekenvolgordeViewer (`CHAR_PX = 11.1`, ~:39) and RomeinseViewer (12.7 px per char, ~:36/38) still size
  text with fixed px that don't follow the Lettergrootte slider; move to `monoTextPx`. 2026-09-27
- HerleidingenViewer: a long given number on the answer side of a unit-blank row breaks at its
  thousands spaces ("24 ha = 2 / 400 / 000 / 000 ___", "93 dl = 9 / 300 ___"): `formatMathNumber`
  joins groups with a plain space and `EditableNumber`'s span has no `white-space: nowrap`. Seen in
  the Oefenmodus card (340 px = a half-width cell, 390×844 and 844×390); a narrow sheet column can
  hit it too. Fix: nowrap on the number span (or U+202F). 2026-10-08
- EvenOnevenViewer rooster: the cells do not share borders as the "marginLeft/-Top:-1 collapse
  shared borders" comment intends; there is a ~5 px gap between columns. The grid's
  `gridTemplateColumns` uses `em(cellW)` against the container's inherited 16 px, the cells
  `em(cellW)` against their own `--sheet-size-math * 0.81` (42.5 px tracks, 37.3 px cells at the
  defaults). Rows do touch. Fix: size the track with the cell's font factor (sheet change: visual
  baseline). 2026-10-08

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
- hr-std-gemengd-dec DEFAULT: its '×' rows multiply two 2-decimal numbers ("4,89 × 100,12 = 489,5868")
  in a mental-arithmetic block (owner call). 2026-09-27
- Hoofdrekenen breuken keys print big numerators without spaces ("36000004/5", VerticalFraction); an
  {M, E} operand mask at max 1 000 yields "9 000 001 × 8/10" (the mask overrides the max, pw021). 2026-09-27
- Empty keys: breuken-hoeveelheid DEFAULT leaves its ": / × / =" lines empty with solutions on. 2026-09-27
- Degenerate defaults: geld-wissel's default already notes 2 doubles; breuken-kleuren /
  -herkennen defaults repeat 7/8 and 2/5; deelbaarheid-rooster's title says "2, 5 en 10" over rows 10,
  10, 2. 2026-09-27


## Limit audit 2026-10-07

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

- No answer overlay on the board for breuken-kleuren: 👁 toggles nothing visible.
  Same gap as the sheet (see Generators › "Empty keys"); fixing the viewers fixes both. 2026-10-08
- getallenrijen (seen on getalbegrip-getallenrijen-dec in a 298 px board card at 200 %): the first and last
  numbers of each row sit across the oval's left / right outline ("8|35", "86|0"); the viewer, not the card. 2026-10-09
