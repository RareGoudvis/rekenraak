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

## Config

- Leaf `getalbegrip-getallenrijen-dec` (appstructure.ts:156) pins `maxGetal: 10`, which is not in
  the Getallenrijen max list (20 … 100 000): opening its config snaps the block to 20 and it
  regenerates. Fix direction: pin 20, or give decimal getallenrijen its own list (owner call). 2026-09-27

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
