# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- vormleer-hoeken-meten at its defaults can exceed one page (3 of 8 seeds: 1 115 / 1 068 / 1 061 px vs 998) → "groter dan één pagina" banner. Repro: `seed(3*7919)`. Fix direction: lower `defaultCount` or the figure budget. 2026-10-13.
- mab-herkennen at half width (`widthUnits: 2`), `mabStyle: 'mab-bw'`, `maxNumber: 999`, 6 exercises: the half cell fits one positietabel per row, so six stack to 1 019 px vs a 997 px body (22 px past it alone on a page, 4 px with blocks above; Geert's fork saw ~59 px). The packer never splits (by design) and the "groter dan één pagina" banner + Splitsen show, but the default-ish setup overflows. Fix direction: cap the half-width count or the box height for this style. Repro `seed(3)` (`Downloads/geert-port/a2/bugB-page.png`). From Geert's BUGS.md, confirmed 2026-10-28.

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)




## Config

- Geld configs: the denomination / betalen-met / bill pills in `GeldConfig`, `GeldTeruggevenConfig`, `GeldWisselConfig` are `<span onClick>`, not buttons — no keyboard, no `aria-pressed` (exempt from `configPills.ariaPressed.test.tsx`). Convert to buttons without shifting the layout. 2026-10-13.

## Generators

- MAB herkennen at 9 999 (mab-bw / mab-color): the table scales to ~0.89 at full width, unit cubes ~5 px and the 12 px hundreds plate reads as a small empty square in black-and-white (`~/Downloads/geert-port/b2/after/her-mab-bw-9999-*`). Owner call: larger glyphs with one exercise per row, or accept. 2026-10-28 WP B2.
- Rational × / : (`mathEngine.ts` natural_fraction / decimal_fraction, ~705 and ~1013): the breuk operand `n2/d2` is drawn unreduced and can be a whole number ("6/6 : 80,183", "9/3 : 72,859" seen on the kiosk card 2026-10-13, WP-B).
- Rational × / 'Natuurlijk getal × breuk' / 'Kommagetal × breuk' (`mathEngine.ts` natural_fraction / decimal_fraction): the factor is drawn up to `maxGetal`, which the rational config never shows (it only feeds the mask places), so a 1e9 max set under natural rides along hidden: "173 942 149 × 7/20". Integer-safe (safeIntegers.test.ts), not didactic. Fix direction: a max picker for those modes or a fixed cap. 2026-10-28 WP B2b.


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)



## Limit audit 2026-10-07

All [L1]-[L21], [E1]-[E11], [N1]-[N2] and [T1] are fixed on rc (fix campaign 2026-10-07/08, see
UpdateState). Left over, found while fixing:

## Oefenmodus (first classroom test, 2026-10-09)





- Kiosk verbanden-paren ("Getallenkennis › Omzettingen"): the owner's preview (2026-10-10) showed no exercise; NOT
  reproduced on 3851873 (gallery, the full builder path, 160 setting combos, 5 viewports all render; paren became
  interactive in f2a4782, so an older preview build is the suspect). Needs the owner's device + link. 2026-10-11
  preview). Suspect: the row dies in the pre-flight / `nextExercise` returns null at the builder defaults.
  Reproduce via a single-row session; see the kiosk-gallery `gen-fail` flag. 2026-10-10

## Oefenmodus beta audit 2026-10-09

External beta audit against 5c93876, every line re-verified on 4c51ef2 (evidence under
~/Downloads/oefen-check/audit/{1,2,3}/). Plan: ~/.claude/plans/oefen-audit-fixes.md. Lines are
grouped per work package so parallel deletions merge cleanly; fixed lines are deleted, O16 stays by owner decision (O7 closed as log-only, REVIEW §D).

### WP-F session format


### WP-H test infra




## Tooling


- **Limits audit, geld-teruggeven (2026-11-08, also on 64c49a2):** with `maxPriceEuros: 0` a price under the minimum appears (90c against a 100c floor, rule `value<min`). Only that edge value of the constraint space.
- **Limits audit, ordenen (2026-11-08, also on 64c49a2):** rational with `unitFractionsOnly` and min = max noemer has one possible value, so the set comes up short with no note (rule `count-short`).

- **Audit 2026-11-13, kiosk on phones:** in 27 Zelf oefenen choices the kiosk card is wider than a 390 px screen. Getallenas labels overlap at 1e8–1e9, and the positietabel in "Getallen lezen en schrijven" is cut off.
- **Audit 2026-11-13, quick block:** Cijferen Aftrekken card `C:c231-l3` with "Tot welk getal? 100" generates 0 exercises with no note. A quick pill should never offer a value the card's other settings rule out.
- **Audit 2026-11-13, temperatuur:** `B:temp-3-aflezen` with Verschil and "Onder nul: Zonder" logs `<rect> attribute height: negative value -48` repeatedly. After Verschil the instruction still reads "Lees de temperatuur af."
- **Audit 2026-11-13, short pools without a note:** count 20 gives klok "Hele uren" 12 and weegschaal 19 exercises, with no "Kleine reeks" note.
- **Audit 2026-11-13, options that don't do what they say:** Oppervlakte "Rechthoekige driehoek" draws rectangles; Schatten "Eenheden" rounds to tientallen; Romeinse "tot 2 500 … ook jaartallen" generates up to 3804 (MMMDCCCIV).
- **Audit 2026-11-13, card data:** 39 of the 56 "Geen brug nodig" card variants generate brug sums (`C:c010-l1` "T − TE": every sum crosses the ten). The label or the card's bridge settings are wrong (owner call). Zelf oefenen no longer files them under "Zonder brug".

## Bordmodus



- Flaky test steps.herleiding "every generated oppervlakte exercise has steps": a random samengesteld-enkel km² + mm² → mm² exercise (toParts value 1000000000000749) gets null steps, about 1 run in many. Seen by the gate 2026-11-14.
- Sidebar mode row at a 1024 px window: the two mode buttons are narrower than icon + label, so the Oefenmodus icon is squeezed to nothing and the Whiteboard icon to a dot (flex minWidth 0 on the svg). Seen 2026-11-14, not caused by the rename.
