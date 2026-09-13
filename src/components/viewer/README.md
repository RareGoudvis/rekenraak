# Viewers — the six rules

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
   differences. **SVG figures follow the token too:** keep the px geometry as the `viewBox`
   and size the element in `em` inside a box with `fontSize: var(--sheet-size-math)`
   (`px / PX_PER_EM_AT_DEFAULT`, 17.33 = 13pt at 96dpi, so the default slider reproduces the
   old pixels exactly). A `<text>` inside such an SVG takes a plain viewBox-unit
   `fontSize={n}`, never `calc(var(--sheet-size-*))` — that would scale twice. Only drawings
   at real-world scale (the meten rulers, the vormleer 1 cm raster) keep px — say so in a
   comment. A viewer whose items hold a scaled figure derives its `itemMinPx` from
   `useSheetSizePx('math')`.
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
6. **Render from the exercise, not the settings.** `block.constraints` steers columns, spacing
   and answer style only; places, denominators, ticks, units and modes come from the exercise
   the generator wrote (`ex.field ?? c.field` for sheets saved before the field existed).
   Between a settings change and Genereer the old exercises are drawn under new settings —
   that must never throw or draw a wrong picture (`viewers.stale.test.tsx` sweeps it).

Checks: `npm run check` (viewer smoke renders every type at 688/338/163px with solutions on
and off), `npm run matrix` for tiers, `npm run font:baseline` + `font:compare` when sizes
change. Add new option values to `src/config/constraintSpace.ts` so the generator matrix
covers them.
