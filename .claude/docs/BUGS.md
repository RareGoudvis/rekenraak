# Bugs & known gaps — backlog for a later pass

Found but deliberately **not fixed** in the pass that found them. One line each: where, what,
how to reproduce, and (if known) the fix direction. Remove the line when fixed and log the fix
in [UpdateState.md](UpdateState.md). Agents: append here, never fix silently.

---

## Generators

- **hr-std-* over-restrictive combos return 0 exercises** — `src/services/math/mathEngine.ts`.
  Pairwise matrix (`npm test`, `[matrix]` table) shows e.g. optellen `maxGetal 100000 + bridges
  {E,T: FORBIDDEN} + operand2Mask {E} + termCount 4 + preset compenseren` → 0/10; aftrekken
  `maxGetal 20 + masks {E} + termCount 3 + compenseren + presetDistance 2` → 0/10;
  vermenigvuldigen `decimal + maxGetal 20 + masks {T,E} + termCount 4 + selectedTables [7]`;
  delen `geheel + maxGetal 10 + bridges {E: FORBIDDEN} + met_rest + selectedTables [7]`.
  The UI can produce these. Fix direction: either the config plugin greys out contradictory
  options, or the generator relaxes the weakest constraint and tells the teacher (found 2026-09-12).
- **verbanden `paren` with denominators [2] + reps [breuk, procent] gives 1/8** — only ½ exists.
  Generator should either widen denominators automatically or the plugin should require ≥ 3
  denominators for count > 2 (2026-09-12).
- **`addBlockFromType` swallows generator exceptions** — `src/store/useWorksheetStore.tsx`
  try/catch → silently empty block. Should surface a toast/inline "kon geen oefeningen maken"
  (2026-09-12, surfaced by the MAB crash).

## Layout / sheet

- **`widthUnits` edits silently dropped under curriculum lock** — `useWorksheetStore.tsx`
  `updateBlockSettings` keeps only `numberOfExercises` + `pageBreakBefore` when locked, but the
  Inspector width picker is not disabled. Decide: allow width under lock (it's layout, not
  difficulty) or disable the picker (2026-09-12).
- **`ScaledBlock` never shrinks below zoom 1** — `src/components/viewer/ScaledBlock.tsx`: a
  block that still overflows at zoom 1 just overflows. Height-fit pass never built (2026-09-12).
- **Cell width 688 vs `FULL_BLOCK_WIDTH_PX` 681** — `App.tsx cellWidthPx` uses 688 (794 − 2×53),
  `BlockWidthContext.tsx` default is 681 (15 mm). Viewers get slightly different widths depending
  on whether they're inside a provider. Unify (2026-09-12).
- **Operator hugs a three-digit second operand in the 2-op-1 layout** — `MathBlockRenderer`
  `COMPACT_OP_GAP`: "+315" vs "+ 51". Compact operand cell is right-aligned and the gap is too
  small (2026-09-10).
- **37 viewers set solution red inline** — only the four bewerkingen viewers use bold + the shared
  colour; the rest hardcode `color: red`-style inline. Wants one `--ink-solution` token + shared
  style (2026-09-10).

## Docs

- Historical links in `UpdateState.md` to `StyleBuilderModal.tsx` ×2, `BaseSettingsPanel.tsx`,
  and `PresetModal.tsx` (ARCHITECTURE history note) point at renamed/deleted files. Accurate
  when written; demote to plain text if they bother anyone (2026-09-12).
- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12).
