# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet

- Inspector at 900 / 820 px wide: the block's floating button rail sits on top of the Inspector controls and the sheet column shrinks to ~250 / 170 px (the TopBar itself folds fine). Repro: resize to 900 px with a block selected (`Downloads/review-triage/sheet/I-06-topbar-900.png`). 2026-10-13 review agent.
- vormleer-hoeken-meten at its defaults can exceed one page (3 of 8 seeds: 1 115 / 1 068 / 1 061 px vs 998) → "groter dan één pagina" banner. Repro: `seed(3*7919)`. Fix direction: lower `defaultCount` or the figure budget. 2026-10-13.

### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)




## Config

- Geld configs: the denomination / betalen-met / bill pills in `GeldConfig`, `GeldTeruggevenConfig`, `GeldWisselConfig` are `<span onClick>`, not buttons — no keyboard, no `aria-pressed` (exempt from `configPills.ariaPressed.test.tsx`). Convert to buttons without shifting the layout. 2026-10-13.

## Generators

- Rational × / : (`mathEngine.ts` natural_fraction / decimal_fraction, ~705 and ~1013): the breuk operand `n2/d2` is drawn unreduced and can be a whole number ("6/6 : 80,183", "9/3 : 72,859" seen on the kiosk card 2026-10-13, WP-B).


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


## Bordmodus



