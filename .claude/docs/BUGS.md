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
- Hoofdrekenen puntoefening with solutions on: the red answer in a missing operand is bold at 1.04×
  plus 8px padding, but its box (`termBoxPx`, MathBlockRenderer) is sized for 1× digits, so any
  answer with a thousands space wraps onto two lines ("26 / 778"). Repro: optellen, Tot 100 000,
  puntoefening, Oplossingen aan. Fix: size the box for the solution width when `anyMissingTerm`
  (widens every puntoefening block a few px; `nowrap` alone overflows the cell's left edge). 2026-09-27

- Getallenas at its 1e5 top (all numberTypes, every width): the first tick label hangs 5–15 px
  outside the cell's left edge (`npm run bignum:audit -- --only getalbegrip-getallenassen-nat`).
  Fix: inset the axis by half the widest label. 2026-09-27
- Even-oneven rooster at its 1e4 top, width ½ / ¼: four-digit numbers wrap inside the 46 px cells
  and the lines overlap. Fix: size cells from the character count (46 px floor). 2026-09-27
  (Full sweep: they wrap ("9 / 029") at full width too; only ½ / ¼ trip the overlap check.)
- `ordenenMaxChars` (blockLayout.ts) ignores the thousands spaces of the inclusive max ("1 000,0"
  counted as 6 chars). Fixing it moves the default getalbegrip-ordenen-dec block from width tier 1
  to 2 (owner call). 2026-09-27
- AfrondenViewer simpel hardcodes `cols={2}` (viewer rule 1), which pins the default block to full
  width. Switching to `fitCols` changes the default w2/w1 cells (owner call). 2026-09-27

- CijferViewer's empty-state "(Nog geen oefeningen — klik Genereer)" (CijferViewer.tsx ~678) lacks
  `no-print`, so an ungenerated cijferen block prints that line; it also uses `#999` instead of
  `var(--text-muted)` (as do the Geld*/Herleidingen placeholders). Found by WP2. 2026-10-07

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
- Ordenen prints thousands with a DOT (`toLocaleString('nl-BE')`, OrdenenViewer.tsx ~43/~78):
  "97.055", "9.705,494" at its max (100 000) and any max >= 1 000; every other viewer uses the space.
  The default decimal leaf also separates items with ", " between decimal-comma numbers
  ("970,55,  902,86"). pw017 {decimal, 3 dp, 100 000} is 8 px te breed. Fix: the shared space
  formatter and a non-comma list separator. 2026-09-27
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
- Solution styling: klok-analoog-tekenen solved hands are black, not the solution red; klok lezen /
  omzetten answers are ~8 px under each clock; geld-teruggeven turns the GIVEN price and paid amount red
  too; geld-tekenen's key only repeats the prompt amount (~7 px); colouring keys (breuken hoeveelheid /
  veelhoek, deelbaarheid, even-oneven) use the light-blue fill, not red (owner call). 2026-09-27
- deelbaarheid at its max (100 000) prints "70344" without the thousands space. 2026-09-27

- RekenvolgordeViewer (`CHAR_PX = 11.1`, ~:39) and RomeinseViewer (12.7 px per char, ~:36/38) still size
  text with fixed px that don't follow the Lettergrootte slider; move to `monoTextPx`. 2026-09-27

## Config

- Leaf `getalbegrip-getallenrijen-dec` (appstructure.ts:156) pins `maxGetal: 10`, which is not in
  the Getallenrijen max list (20 … 100 000): opening its config snaps the block to 20 and it
  regenerates. Fix direction: pin 20, or give decimal getallenrijen its own list (owner call). 2026-09-27

## Generators

- Hoofdrekenen delen 'andere' at max ≤ 1e6 (natural, no mask): the divisor is uniform up to the
  max, so most quotients are 1; with only the dividend masked an exact division is rare and the
  block relaxes. Fixed above 1e6 only (RNG-stream rule). Fix direction: the >1e6 branches. 2026-09-27
- REQUIRED bridge on the TOP place (e.g. H at max 1 000, HM at 1e9) is unreachable by construction
  (needs a sum/minuend of exactly the max); cijferen then silently falls back to its [max/2, max/4]
  exercise, ignoring the bridges. Fix: hide the top place in BridgeControl or note it. 2026-09-27

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)

- afronden-dec-rooster: a whole rounded result prints "56" in a t column instead of "56,0" (left over
  from the 97,05 wrong-key fix, which only fixed `roundTo`). 2026-09-27
- Dutch clock text (clockTypes.ts ~45-50 `formatTimeText`): no "voor half / over half": 01:25 → "25 over
  1" (should be "5 voor half 2"), 20:31 → "29 voor 21", 00:05 → "5 over 0". Reachable with the 5-minute /
  1-minute timeTypes (pw004, pw007), not at the leaf defaults. 2026-09-27
- hr-std-delen-dec DEFAULT: 5-8 of 10 exercises are "702,71 : 702,71 = 1" (both seeds), with no note;
  hr-std-gemengd-dec / -nat defaults also carry "x : x = 1" rows. gemengd-dec '×' rows multiply two
  2-decimal numbers ("28,05 × 34,91 = 979,2255") in a mental-arithmetic block (owner call). 2026-09-27
- Hoofdrekenen breuken keys print whole numbers as n/1 ("4/3 : 2/9 = 6/1" at the hr-std-delen-rat
  DEFAULT; "288/1") and big numerators without spaces ("36000004/5"); an {M, E} operand mask at max
  1 000 yields "9 000 001 × 8/10" (the mask overrides the max, pw021). 2026-09-27
- Empty keys: breuken-kleuren ignores Oplossingen (FractionExerciseItem.tsx ~65: showColored only for
  herkennen); breuken-hoeveelheid DEFAULT leaves its ": / × / =" lines empty with solutions on;
  geld-wissel draws no model exchange. 2026-09-27
- Degenerate defaults: deelbaarheid-veelvouden is six copies of "veelvouden van 9" ("Kleine reeks: 5
  oefeningen komen dubbel voor"); geld-wissel's default already notes 2 doubles; breuken-kleuren /
  -herkennen defaults repeat 7/8 and 2/5; deelbaarheid-rooster's title says "2, 5 en 10" over rows 10,
  10, 2. 2026-09-27
- kettingsommen DEFAULT prints every intermediate result (only the last step is asked), and its max
  picker is dead: kettingGenerator.ts ~41 starts <= 20 with operands <= 10, so Tot 1 000 looks like
  Tot 100. Owner call on blanks; scale start/operands with maxGetal. 2026-09-27
- kalender-datum-rekenen / -notatie DEFAULT: one exercise per block (REGISTRY 'kalender' defaultCount 1,
  sized for a maandrooster). Fix: a per-subType count. (constraintSpace questionCount [1,5,10] vs the
  3-8 slider.) 2026-09-27
- schattend-nat mixes "=" and "≈" for the final result within one block. 2026-09-27
  (The getallenas step-over-max half of this line moved to [L1] below.)

- `loadWorksheet` doesn't reset `staleBlocks`: the previous sheet's "verouderd" flags linger in the
  map (harmless ids, but it grows). Fix: `staleBlocks: {}` in documentSlice.loadWorksheet. 2026-09-27
- `typeId.startsWith('layout-')` is still used in Inspector.tsx (~443, ~649), blockLayout.ts (~562) and
  blockNumbering.ts (~21); switch to `REGISTRY[t]?.isFurniture`. 2026-09-27

## Limit audit 2026-10-07

All [L1]-[L21], [E1]-[E11], [N1]-[N2] and [T1] are fixed on rc (fix campaign 2026-10-07/08, see
UpdateState). Left over, found while fixing:

- MathBlockRenderer draws the compenseren tussenstap from the block's stored `preset`, so when the
  relax ladder dropped the preset (note "versoepeld: strategie") plain exercises get a nonsense
  scaffold: "385 − 30 = 385 − 30 + 0", "230 − 14 = 230 − 20 + 6". Repro: aftrekken compenseren +
  Maximum per getal [—, 15], or compenseren + masks + verboden brug. Found by WP1. 2026-10-07
- [P2] breuken-rangschikken shortfall note: "passen maar 1 breuken per oefening" → singular "past maar 1
  breuk". Repro: trigger E4b-38. 2026-10-08
- [P3] Identical fills without a note: kettingsommen only × at max 20 → six identical chains; cijferen ×
  impossible-mask fallback → four identical "33 × 3"; getallenrij teller max 1 → identical rows. The
  block carries its own note but not the "Kleine reeks … dubbel" one. 2026-10-08
- [P4] Met rest N2 with "Maximum per getal" 20 gives an empty block although N1 would fit (the level
  clip ignores operandMax). 2026-10-08
- [P5] Hoofdrekenen breuken "Kommagetal × Breuk": some "kommagetallen" are whole ("319", "641"), and
  the key prints as an improper fraction ("19412/25"); rational mixed numbers can show "3 10/2" or
  "1 2/2" (not simplified). 2026-10-08
- [P6] verbanden-tabel default repeats values (9/10 and 1/2 twice). 2026-10-08

## Tooling

- full-sweep "max" rows use the registry defaults, and the 8 cijferen typeIds share `cijferRow()`
  defaults (operator '+'), so the cijferen aftrekken / vermenigvuldigen / delen "max" rows show
  additions. Per-leaf tops live in bignum:audit; take the max per leaf if it matters. 2026-09-27

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
