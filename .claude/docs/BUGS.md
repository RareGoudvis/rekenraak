# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Layout / sheet


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)




## Config

## Generators


### Full-sweep findings (`npm run sweep` 2026-09-27, shots under ~/Downloads/full-sweep/2026-09-27-rc/)



## Limit audit 2026-10-07

All [L1]-[L21], [E1]-[E11], [N1]-[N2] and [T1] are fixed on rc (fix campaign 2026-10-07/08, see
UpdateState). Left over, found while fixing:

## Oefenmodus (first classroom test, 2026-10-09)

- lengte-meten: the builder no longer offers it, but an OLD link still opens the unsolvable card (k3b
  `shots/oldlink-lengte-meten.png`). Fix: a type whose descriptor `supported()` is false at load → ErrorScreen
  "Deze oefening kan niet op het toestel" / the slot is retired. 2026-10-11
- getallenrijen frame is clipped at the card edges on the kiosk (the sheet pill fix of 2026-10-11 did not reach
  the card). Fix: card extent / pill width from the card. 2026-10-11
- Kiosk cards render the thousands thin space wide ("7  400") in the card font. Cosmetic; use a narrower
  no-break space on the card. 2026-10-11
- Kiosk Lenen key has no explanation at all (k3 + k3b). Owner call: a static one-line label under the keypad
  ("Lenen: wissel een tiental") — same text always, leaks nothing per exercise — or leave. 2026-10-11




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


