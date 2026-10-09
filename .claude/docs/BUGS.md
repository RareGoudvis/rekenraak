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
- Cijferen optellen with solutions on: the red carries sit above the column that MADE them, one
  column right of where a pupil writes them (`computeAddCarries` keys by the source column; the
  AddSubGrid draws at that col). Repro: 525 + 445, Oplossingen aan, scaffolding 1 → the "1" is over
  the E, not the T. Fix: draw at `col - 1` (the kiosk's cijferCells already reads it so). 2026-10-08
  (Since the empty-grid key fix this shows at every scaffolding level, incl. the default.)
- Cijferen vermenigvuldigen key: the partial products stack with the units product LAST (1246 × 73
  → 87220 above 3738; MultiplicationGrid `ppStartRow + (n - 1 - ppIdx)`), while pupils write × 3
  first. Owner call whether to flip the order. 2026-10-09

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

## Oefenmodus (first classroom test, 2026-10-09)

- Kiosk MAB (mab-herkennen / mab-tekenen): the duizendtal block is hard to read at kiosk scale —
  pupils could not tell it from the honderdtal; and adding / taking away pieces in the tray needs
  more UI help (which piece, how many laid, a clear +/−). Owner note from the first test with
  real kids. 2026-10-09
- Kiosk analoge klok "lezen": the card keeps the paper instruction ("… in woorden") while the kiosk
  only takes a typed time (uu:mm), so pupils are told to answer in words and cannot. Fix: a
  `kioskInstruction` for the non-drag klok modes ("Lees de klok en typ de tijd (uu:mm).") and add
  "in woorden" to the banned verbs in oefenen.kioskInstruction.test.ts; sweep the other leaves for
  the same mismatch. Owner: log only, not fixing now. 2026-10-09

## Oefenmodus beta audit 2026-10-09

External beta audit against 5c93876, every line re-verified on 4c51ef2 (evidence under
~/Downloads/oefen-check/audit/{1,2,3}/). Plan: ~/.claude/plans/oefen-audit-fixes.md. Lines are
grouped per work package so parallel deletions merge cleanly.

### WP-A scheduler

### WP-B store / stats

- **O3** C2: Mijn bladen › Bewerken › Opslaan keeps the session id (OefenBuilderModal.tsx:56), so the
  new link reopens the old finished run (useOefenStore.ts:281); removing a type shifts every saved
  per-type result to the wrong type (index-keyed `perType[slot]`, stats.ts:80-81). Owner: a content
  edit gets a new id; Hernoemen keeps it. 2026-10-09
- **O4** D6: an answer submitted after the deadline but before the next 1 s tick is counted
  (`answer()` has no timeUp guard, useOefenStore.ts:360-389; only `next()`/`tick()` check). 2026-10-09
- **O5** D5: when localStorage throws, `persist` ignores `saveRun === false` (useOefenStore.ts:199-202):
  no warning, the run is gone after a reload. Fix: store flag → kiosk banner. 2026-10-09
- **O6** Stats headline: a right second try counts as juist (stats.ts:70) so "3 van 3 juist · 100 %"
  hides a first-try 2/3; a timed/limited run shows "7 van 8 juist" and never the planned total
  (StatsScreen.tsx:119). Owner wording: "7 van 8 juist (8 van 10 gemaakt)" + column "Juist in één
  keer". 2026-10-09
- **O7** C7 (log only, owner): a reload clears the typed draft, the cijferen cells and the geld tray
  (only `current` is persisted, useOefenStore.ts:276, 287). Not fixing. 2026-10-09

### WP-C answer check

### WP-D generation guard

- **O9** C4: a row whose settings generate 0 exercises (klok with every tijdstype unticked) ships
  without a builder warning (`kioskSupports` ignores `timeTypes`). Fix: pre-flight each row at Delen
  (0 → red row, Delen blocked); start screen counts viable types (`deadSlots`, scheduler.ts). 2026-10-09
- **O10** Builder-reachable zero-output settings: `timeTypes=[]` on klok-analoog-lezen / -tekenen /
  -omzetten and klok-digitaal-tekenen; `selectedTables=[]` on hr-std-vermenigvuldigen-nat and
  hr-std-delen-nat (NaturalSettings has no keep-one guard); `payWithOptions=[]` on geld-teruggeven.
  Pairwise, reachability unchecked: vergelijken-kiezen breuk both sides + HM mask; kettingsommen
  `[":"]` chain 6; hr-std-delen-dec / -vermenigvuldigen-dec combos; handig-rekenvolgorde `:`-only +
  haakjes MOET + 4 ops + max 100; schattend-nat max 10 with T/H rounding; hr-std-aftrekken-rat
  compenseren puntoefening. 2026-10-09
- **O11** Start screen pluralises "1 soort · 1 oefeningen". 2026-10-09

### WP-E keyboard / a11y

- **O12** C5: in a fill-cells card every Tab is swallowed (Kiosk.tsx `useKioskKeys`) and `moveCell`
  wraps `(at+step+n)%n`, so Tab/Shift+Tab cycle through answer + carry cells forever; no Escape
  handler; Resultaten and the keypad are unreachable by keyboard during a grid exercise. Fix: Tab
  leaves the grid at both ends, Escape → keypad. 2026-10-09
- **O13** Every kiosk cell input has `aria-label="Vul in"` (hardcoded in `cellProps()`,
  ViewerInteractionContext.tsx): answer, carry, borrow, partial-product, quotient and rest cells are
  indistinguishable to a screen reader. Fix: per-role labels with the column name. 2026-10-09

### WP-F session format

- **O14** D4: a shared link stores only the diff from the CURRENT defaults (`seedOf` / `rowOut` /
  `rowIn`, session.ts): changing a registry or leaf default, `DEFAULT_BASE`, `SEED_FIT`, a leaf
  label (`kioskLabelOf`) or a leaf instruction silently changes what an old link decodes to
  (verified: numberType, bridges, operand2Mask rewritten). Fix: a frozen `KIOSK_DEFAULTS_V1`
  snapshot per leaf + a fixture-link test. 2026-10-09
- **O15** D11: `decodeSessie` has no bound on payload length, inflated size, title length or type
  count (a 50 MB title loads in 4.7 s / 71 MB heap and renders as an off-screen h1). Fix: bounds →
  ErrorScreen. 2026-10-09
- **O16** D12 (note, no fix): every answer copies the history and stringifies the whole run,
  `saveRun` reloads all runs, `next` rebuilds the seen-keys set: 0.06 → 0.48 ms per answer at
  #1000, quadratic per run but 0.55 s for 1000 answers. Pin with a perf test. 2026-10-09

### WP-G teacher UX

- **O17** The Oefenmodus catalogue has no search field and no leerjaar filter (the editor sidebar has
  both). 2026-10-09
- **O18** "Aantal: ∞" is a small label above a slider with the thumb far right, no "onbeperkt"
  wording (OefenBuilderModal.tsx:242). 2026-10-09
- **O19** The share modal shows only "N soorten · M min" (OefenShareModal.tsx:75): no total number
  of exercises / onbeperkt, no toets / kansen / statistieken settings, and no note that every
  pupil's device generates its own exercises. 2026-10-09
- **O20** Mijn bladen › Oefensessies has no Dupliceren (MijnBladenView.tsx:197-200; worksheet presets
  have it at :163). 2026-10-09
- **O21** Builder description for analoge klok lezen reads "Klok zien → tijd in woorden schrijven"
  (ClockConfig.tsx:49) while the kiosk takes uu:mm (pairs with the classroom-test line above). 2026-10-09
- **O22** Breuken kleuren card says "Tik 3 van de 6 delen aan." (`kioskInstruction`, BREUKEN_KIOSK)
  which gives the count away. Owner: "Kleur 3/6 in." only. 2026-10-09

### WP-H test infra

- **O23** CI `check.yml` triggers only on dev / main pushes and PRs, so rc / rc-oefenen are never
  checked in CI. Owner: add both. 2026-10-09
- **O24** No test exercises the kiosk chain generate → descriptor answer → keys can type it →
  `checkAnswer` → stats over the constraintSpace options; no Playwright kiosk smoke per input kind. 2026-10-09

## Tooling

- A leaf's own `defaultCount` (oppervlakte-rooster = 2) is not seen by `scripts/height-audit.mjs:81`
  and `scripts/width-matrix.mjs:82` (they add blocks without `leafId`); worksheetTemplates.ts
  `buildBlock` and the curriculum draft use the row count on purpose. 2026-10-08

- full-sweep "max" rows use the registry defaults, and the 8 cijferen typeIds share `cijferRow()`
  defaults (operator '+'), so the cijferen aftrekken / vermenigvuldigen / delen "max" rows show
  additions. Per-leaf tops live in bignum:audit; take the max per leaf if it matters. 2026-09-27

- Kiosk breuken kleuren, square shape with a PRIME noemer ≥ 11 (11, 13): equal parts need one row, so the
  strips stay ~40 px wide on an 844 px card (< 44 px target). Composite noemers use a grid (`kioskSquareGrid`).
  2026-10-08

- Flaky under full-suite load: `oefenBuilder.test.tsx` › OefenShareModal › "Afdrukken (A5) prints only
  the A5 QR sheet" failed once in the pre-commit gate ("expected bound to be called 1 times, got 0")
  and passes alone. Likely a timer/print wait too short when 99 workers share the CPU. 2026-10-09

## Bordmodus

- No answer overlay on the board for geld-wissel and breuken-kleuren: 👁 toggles nothing visible.
  Same gap as the sheet (see Generators › "Empty keys"); fixing the viewers fixes both. 2026-10-08
- Outside the board, same class of bug as the one fixed for WhiteboardView: the Mijn bladen and
  Bibliotheek overlays are not `.no-print`, so Ctrl+P while one is open prints the overlay
  instead of the sheet (checked with a print-to-PDF). 2026-10-08
- TopBar: just above a shed threshold useShedStages keeps stage 0 while the centre track already
  overflows: stage 0 starts at ~1900 px and at 1920 px the "Automatisch bewaard" text runs under the
  undo button (wb-check/mode-buttons/topbar-1920.png). Fix: count the centre track in the overflow
  measurement. 2026-10-08
- Honderdveld ⚙ "Tikkleur": while "Afwisselend" (cyclus) is selected, the custom-colour picker
  next to the swatches shows black instead of a neutral / empty state (cosmetic; mathControls
  `PaletteRow` feeds the `<input type="color">` `#000000` for any non-hex value). 2026-10-09
- Settings kit a11y: every `ColorSwatches` custom-colour field has the same accessible name
  "Eigen kleur (hex)" (controls.tsx), so a panel with several colour rows (accent + a kind's own
  colours) has indistinguishable inputs for a screen reader. Fix: include the row's label. 2026-10-09
- BreukBewerkViewer gelijknamig ignores `useBlockWidth()`: its 2-up rows run past a 628 px board card
  (the last "en ____" is cut, wb-check/full-test/probe/cards-width-after.png). 2026-10-09
- Board cards at Tekstgrootte 200 % (viewer width 298 px) still overflow for afronden-dec-simpel,
  geld-rekenen-winst, lengte-meten, herleidingen-inhoud (81-360 px) and getallenrijen-dec (4 px). 2026-10-09
- The board's "Wiskunde toevoegen" panel (BoardAddModal) does not close on Escape or an outside
  press, unlike every bottom-bar popup; only its ✕ closes it. 2026-10-09
- Board ⚙ panels: after "Standaard herstellen" the Accentkleur hex field keeps the old custom hex
  (ColorSwatches holds it in local state) while the swatch row says Standaard. 2026-10-09
- Honderdveld at 20 columns + Tekstgrootte XL and positietabel with every place column at "Heel groot"
  clip on the right of the card instead of shrinking (wb-check/full-test/03-widgets/_walk-02.png, -03). 2026-10-09
- Instrument handles can leave the board: the passer hinge after a wide opening, and a lat rotated to
  45° at 1280 px puts its rotate handle off-board (wb-check/full-test/05-instruments). Fix: clamp the
  handle positions / keep a grab point on-board. 2026-10-09
- Default pen colour is black, barely visible on a dark board; pick the ink default from the
  background (licht → black, donker → white) when the pen has no custom colour. 2026-10-09
