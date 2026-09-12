# Viewers — the five rules

A viewer renders one block's exercises on the sheet: `({ block, showSolutions }) => JSX`.
It is registered in `src/config/exerciseUI.tsx` and never branches on `typeId` beyond its
own family. What it draws is what prints, so every rule below exists because a viewer that
broke it clipped, overflowed or measured wrong on paper.

1. **Read the width you have.** `useBlockWidth()` gives the printable width of the cell
   (¼ / ½ / full); decide column counts with `fitCols(availableWidth, itemMinPx, preferred)`.
   Never a constant, never `window.innerWidth`. A ¼ block must stack 1-up.
2. **Sizes are factors of the sheet tokens.** Digits and math:
   `calc(var(--sheet-size-math) * f)`; words: `calc(var(--sheet-size-text) * f)`. The base
   moves with the teacher's Lettergrootte sliders; the factor keeps your deliberate size
   differences. Box geometry that must stay proportional to its own shape (an SVG coin, a
   grid cell in mm) may keep px — say so in a comment.
3. **Solutions use `solutionText` / `SOL`** from `solutionStyle.ts` — red **and bold**
   (a b/w printer only sees the bold). No other red on the sheet unless it is a domain colour.
4. **Items flow through `FragmentableGrid`.** One `.print-row` per row lets the block split
   between pages on paper and lets the height audit count rows. A single CSS grid does not
   fragment in Chrome. Screen-only helpers (empty-state placeholder, edit affordances) are
   `.no-print`.
5. **No measuring yourself.** Heights and content widths are measured once by `PageSheet`
   and fed to the packer; a viewer that reads its own DOM to decide layout creates a feedback
   loop. If the content genuinely can't fit, let it overflow and the measured clamp will
   refuse the width in the Inspector.

Checks: `npm run check` (viewer smoke renders every type at 688/338/163px with solutions on
and off), `npm run matrix` for tiers, `npm run font:baseline` + `font:compare` when sizes
change. Add new option values to `src/config/constraintSpace.ts` so the generator matrix
covers them.
