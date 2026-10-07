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

Six-agent number-limit audit on rc (~35M generated exercises; harnesses and repro seeds under the
session scratchpad `limit-audit/A1..A6`). Ids `[Lx]` (limit) / `[Ex]` (other) key the entries of
`limits.knownBugs.ts` once that exists. Owner triage of the ambiguous findings is folded in; the
"fine as is" ones are not listed. Grouped per fix package so parallel deletions merge cleanly.

### WP1 Hoofdrekenen engine (mathEngine.ts, mixedGenerator.ts)

- [L2] hr-std-gemengd: × and : ignore the shared "Maximum uitkomst". MULDIV_BASE
  (mixedGenerator.ts:35) injects tafels [2,3,4,5,10]×10, and the tafels / met_rest / tienvoud
  branches never read maxGetal. Repro: gemengd-nat at Leerjaar 1 (max 20) → "4 × 10 = 40",
  "50 : 5 = 10" (12 %, 76 % with only ×); variants ['x','x:tienvoud'] at max 10 → "9 × 1000".
  Fix: cap table products / dividends / tienvoud answers by maxGetal inside gemengd. 2026-10-07
- [L7] Rational +/− 'one_step' ("Ongelijknamig (eenvoudig)"): the second noemer exceeds "Max.
  noemer" because the multiplier floors at 2 (`Math.max(2, floor(maxD2/d1))`, mathEngine.ts:331-333,
  458-460). Repro: linked max noemer 2 or 3 → "6/2 + 9/4" (100 %); maxD1 100 / maxD2 10 →
  "6/27 + 9/54". 2026-10-07
- [L8] Decimal ':' quotient exceeds "Maximum uitkomst" ("Het grootste antwoord"): the no-mask branch
  (~1120-1128) draws the divisor from 0,01 and caps only the dividend. Repro: delen-dec max 10 →
  "7,5 : 0,5 = 15" (5-9 %); gemengd-dec ':' 3-6 %. 2026-10-07
- [L14] "Maximum per getal" (operandMax) silently ignored: aftrekken with operand2Mask or preset
  compenseren skips the ceiling check (~516-535: "770 − 399" with [null,30], 80-100 %, also gemengd
  '-:compenseren'); × tafels with 3-4 factors takes the first factor from the tables (~713-716:
  "12 × 4 × 2" with [5,5,5]). 2026-10-07
- [L15] Rational × / : 'decimal_fraction' ("Kommagetal × Breuk") without a mask: the decimal operand
  is randInt(1, maxGetal·scale) divided by INTERNAL_SCALE it was never multiplied by (~597-606,
  ~818-823) → "0,06 × 6/6", "0 × 6/6 = 0/1" (dp 1: 100 % zero). 2026-10-07
- [L19] Met rest ignores the Leerjaar/base max: mulDivMax returns null for met_rest, N3 always draws
  dividends 100-999 (~1005-1053), so Leerjaar 2 ("tot 100") gets "890 : 7". Owner rule: the dividend
  follows the grade max (100 at L2, 1000 at L3); tafels and andere stay as they are. Generator side
  here, list/picker side in WP7. 2026-10-07
- [E1] PAGE FREEZE: rational +/− 2 terms 'multi_step' (also reached when a 3-4 term chain relaxes to 2):
  the do/while at ~351 / ~474 never ends when some d1 has every d2 in [2..maxD2] equal to, dividing or
  divisible by it. Repro: linked max noemer 2; unlinked maxD1 10 + maxD2 2 or 3 (d1 = 6). 2026-10-07

### WP2 Rows and patterns (getallenas/, getallenrij/, patroon/)

- [L1] getallenas / getallenrijen run past the max whenever step × (ticks−1) > range: the ascending
  branch anchors at lo and overruns hi (`upper = floor((hi−span)/stepN)`; descending clamps to `need`
  and goes below lo). Repro: default leaf at Leerjaar 1 (max 20, step 5, 6 ticks) → 0…25; step 50 at
  max 20 → 0…150. 819/6384 as-combos, 1881/16008 rij-combos, 100 % per combo. Fix: shrink the step or
  the tick count (with a note) when the span cannot fit. 2026-10-07
- [L9] getalpatronen: a per-op mask on + / − replaces "Stap (max)" (`buildOperand` mask branch ignores
  `s.max`). Repro: opSettings['+'].max 50 + mask {H,T} → step 110. 2385 combos. 2026-10-07
- [L10] getallenrijen rational: `maxTeller ≤ fractionStep` is silently replaced by 5·d (maxTeller 1, d 4
  → rows up to 5 wholes); `ticks−1 > maxTeller` climbs past it (d 2, maxTeller 3, 6 ticks → 2 1/2);
  descending with span > maxWholeUnits prints a NEGATIVE noemer ({n:1, d:−4}: maxTeller 5, d 4, ticks
  9-10, direction links). 2026-10-07
- [E5a] getalpatronen / kettingsommen fall back to a "+1" ladder (1, 2, 3, …) that ignores the chosen
  operations: patronen with a lone ×, '−' + an H mask, tiny op max + mask (16 842/77 700 combos);
  kettingsommen with only × or only : at max 20 (100 %). Fix: a fallback that keeps the ops, or a
  generation note. 2026-10-07

### WP3 Cijferen (cijferGenerator.ts)

- [L3] cijferen-vermenigvuldigen-nat / -dec: when a "Specifieke getalopbouw" mask can't fit under the
  max, the 500-attempt fallback (cijferGenerator.ts:155) returns [max/2, 3] → answer 1,5 × max and the
  masks ignored. Repro: operand1Mask {T}, max 100 → "50 × 3 = 150"; 982/1328 nat and 2004/3057 dec
  masked combos, 100 % each. All 8 cijferen leaves share the silent fallback (masks and numberOfTerms
  dropped). Fix: a fallback within max + a generation note. 2026-10-07
- [L4] cijferen-vermenigvuldigen-dec with a decimal-place mask on Getal 2 (fractional multiplier): the
  multiplicand bound `maxVal·s/multiplier` lets operand 1 exceed the max ("21,7 × 0,5" at max 20, 13 %)
  and `toFixed(dp)` rounds the key wrong ("= 10,8", true 10,85; "0,5 × 0,5 = 0,3"; 16 %). 2026-10-07
- [E3] cijferen-delen-nat with an E mask on the divisor gives divisor 1; with remainder on the key reads
  "6 : 1 = 6 r 1". 2026-10-07
- [E7] cijferen-delen-dec with a decimal-place divisor mask: quotient 0 ("0,5 : 6", 1,4 %) and a
  dividend a hair over max ("1000,18 : 0,09", 0,04 %). Low priority. 2026-10-07

### WP4 Geometry, fractions, vergelijken (meten/, fractions/, vergelijken/)

- [L5] vergelijken-representaties: a Getalopbouw mask (leftMask/rightMask) offers the top place whose
  weight equals the max (T at 10, H at 100, D at 1000); the masked digit is 1-9 with no max check
  (`buildRepMasked`, vergelijkenGenerator.ts ~50-60). Repro: max 10 + rightMask {T} → value 20 (88 %;
  {T,E} 100 %); up to 9 × max. 2026-10-07
- [L11] breuken-bewerken gelijknamig with noemer "van X tot X": `hi = Math.max(lo + 1, maxD)`
  (breukBewerkGenerator.ts:57) gives noemers X and X+1 ("tot 20" shows 21), 100 %. 2026-10-07
- [L12] omtrek / oppervlakte-berekenen rechthoek: `if (w === h) h = h + 1` (metenGenerator.ts ~95)
  overshoots when w = h = max → sides 10 × 11 at max 10 (1 % default, 2-4 % at narrow ranges). 2026-10-07
- [L13] oppervlakte rooster ignores minLength: `h = randInt(2, min(6, maxL))`, vierkant takes min(w,h)
  → "3 × 2" at "Zijden van 3 tot 4 cm" (32 %). Same branch: shapes ['l-figuur'] at maxLength 3 falls
  back to a rechthoek (32 %). 2026-10-07
- [L16] Edge settings (hand-typed values):
  - breuken-bewerken gemengd at teller max 1-2 still gives 3/2 (`hi = max(lo, maxNum)`, :19-22);
  - vereenvoudigen at max noemer 2-3 / teller max 1 falls back to 2/4 ignoring both caps (:100);
  - gelijknamig "Vaste gemeenschappelijke noemer" with < 2 divisors in range is silently swapped for the
    KGV (:53-65, e.g. 7 at 2-10 → 14);
  - breuken hoeveelheid with maxTotal < minDenominator: total > maxTotal (fractionGenerator.ts:62-63);
  - omtrek at max 1-3: trapezium `cTop + 2` and the circle radius floor 2 exceed the max. 2026-10-07

### WP5 Result caps (rekenvolgorde/, schattend/, controleren/, procenten/)

- [L6] rekenvolgorde: with 3-4 bewerkingen the cap is max × 10, but the label says "Maximum uitkomst:
  Antwoorden blijven onder dit getal" → "19 + 22 + 6 × 10 = 101" at max 100 (20-90 %; worst 5088 at
  1000). 1,7 % have a factor above tableLimit ("5 × 5 × 8 × 20"; hidden key). 2026-10-07
- [L17] schattend: only the operands are capped; owner rule: the RESULT stays ≤ max. Today + reaches
  2 × max (~50 %), × 9 × max (~75-80 %): "449 + 687" at max 1000. 2026-10-07
- [L18] controleren: owner rule as schattend, the result stays ≤ max. Today negenproef × is a in
  [max/10, max] × b in [12, 99] → up to 91 × max ("577 × 65 = 37505" at 1000, 100 %); omgekeerde +
  up to 1,9 × max (37 %). 2026-10-07
- [E4a] Short / empty blocks: procenten 1 % at max 100 → 1 of 8, 5 % → 5 of 8, welk-percent [100] → 0;
  rekenvolgorde ×-only + haakjes MOET → 0, ':'-only → 0-13. 2026-10-07
- [E5b] schattend silently swaps a selected rounding target ≥ max for the first target (default leaf H
  at max 100 → T at L1/L2); decimal target 'h' at 2 dp gives 0 exercises. 2026-10-07

### WP6 Misc generators (herleidingen/, ordenen/, verbanden/, kalender/, geld/, breukenRangschikken)

- [E2] CRASH: herleidingen with units m² + ca, hm² + ha or dam² + a throws "Cannot read properties of
  undefined (reading 'factor')": equal factors leave `gridUnits` with length 1 and `pickPair` reads
  index 1. The UI lets you tick exactly those pairs. 2026-10-07
- [E4b] Short / empty blocks: ordenen decimal + mask D at max ≤ 100 → `values: []`;
  breuken-rangschikken "Gelijknamig te maken" with a noemer range outside {2,3,4,5,6,8,10,12} (min = max
  = 7, 9, 11) → empty exercises (468/2280 combos); herleidingen hm + dam at maxEnkel 20 with only
  'enkel-getal' → 20 of 40; maateenheid temperatuur-only → 8 of 40; kalender maandrooster ['tellen'] →
  1 question of 5; geld-teruggeven payWith [500] + centen vijfentwintig → 12 of 40. 2026-10-07
- [E6] verbanden: "Gegeven voorstelling" isn't filtered against "Voorstellingen" — pick given = Procent,
  then untoggle Procent → exercises still give a percentage (verbandenGenerator.ts:36, 51). 2026-10-07
- [E8] geld-herkennen / -tekenen with degenerate denominations (none ticked, or only bills > max): amount
  0 with no money / an unpayable amount (6,95 with only €500); euros format with a small-coin-only set
  ([5 c]) shows "60", "50055" (12-item cap fallback `finalAmount = drawnCents`). Low priority. 2026-10-07

### WP8 Config hint (GetallenasConfig, GetallenrijenConfig, OrdenenConfig, PatroonConfig)

- [L21] Stale Ondergrens: set it to −1000 at max 1000, lower the max to 100 → values reach −1000 at
  "Tot 100" and the slider is pinned. Owner rule: no auto-clamp, show a `sharedPluginStyles.hint` under
  the slider when minGetal < −maxGetal ("valt buiten het bereik — pas aan of genereer opnieuw"). 2026-10-07

## Tooling

- [T1] The generator matrix (generators.matrix.test.ts) never checks a number against its limit (only
  no-throw / count / NaN), and constraintSpace.ts misses the UI options that trigger most limit bugs:
  cijferen operand0..3Mask, vergelijken left/rightMask, hr maxNumerator2 / maxDenominator2 / operandMax
  / operandMasks / metRestLevel / divisionLevels, breuken-bewerken targetDen (and min = max), patronen
  opSettings + masks + 'geheel', getallenas minGetal, kettingsommen opSettings. Fix: limits harness
  (plan Phase A). 2026-10-07
- full-sweep "max" rows use the registry defaults, and the 8 cijferen typeIds share `cijferRow()`
  defaults (operator '+'), so the cijferen aftrekken / vermenigvuldigen / delen "max" rows show
  additions. Per-leaf tops live in bignum:audit; take the max per leaf if it matters. 2026-09-27

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
