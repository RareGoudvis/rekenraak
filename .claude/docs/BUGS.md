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

- Builder row label still says "plaats omcirkelen" when the row's `plaatsAnswer` is `'waarde'` (K1 2026-10-11). 2026-10-11
- `oefen-smoke` reads the store through in-page imports and fails with "phase start" after an HMR reload: use a fresh
  dev server per run (K1). 2026-10-11
- Kiosk mab-herkennen: the tens bars are hard to count at card scale (K3 pupil-play misread 2 of 3); pairs with the
  classroom MAB note above. 2026-10-11
- Several leaves listed from leerjaar 1–2 default to leerjaar-3+ numbers in the builder (K3); the builder row could
  seed from the sidebar's leerjaar instead of the registry default — owner call. 2026-10-11


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

- **O16** D12 (note, no fix, pinned by `oefenen.perf.test.ts`): every answer copies the history and
  stringifies the whole run, `saveRun` reloads all runs, `next` rebuilds the seen-keys set:
  quadratic per run, ~0.5 ms per answer and ~170 kB stored at #1000 (test: < 5 ms, < 300 kB). Only
  an endless run far past 1000 answers would feel it. 2026-10-09

### WP-H test infra



## Tooling


## Bordmodus


