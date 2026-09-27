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
- `ordenenMaxChars` (blockLayout.ts) ignores the thousands spaces of the inclusive max ("1 000,0"
  counted as 6 chars). Fixing it moves the default getalbegrip-ordenen-dec block from width tier 1
  to 2 (owner call). 2026-09-27
- AfrondenViewer simpel hardcodes `cols={2}` (viewer rule 1), which pins the default block to full
  width. Switching to `fitCols` changes the default w2/w1 cells (owner call). 2026-09-27

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

## Tooling

## Docs

- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12). Known; the heading says so.
