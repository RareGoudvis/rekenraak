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
- **A `spans` block flows on paper but clips on screen** — `pagePacker` marks a block taller
  than one page `spans` and FragmentableGrid splits it across printed pages, but on screen
  `.page-sheet-body` is `overflow: hidden`, so the same block is simply cut off and the page
  shows the red overflow banner. Reproduce: a half-width "Getallen herkennen" at the default
  count (measured 1012px against a 944px body). The preview therefore does not show what
  prints for exactly the case the banner is about (2026-09-12).
- **The browser's own Ctrl+P bypasses `usePrint`** — `src/hooks/usePrint.ts` deselects the
  active block and waits two animation frames for the remeasure-and-repack before opening the
  dialog; a native Ctrl+P does neither, so a sheet printed that way can still carry the
  selection halo and the pre-repack pagination. Fix direction: a `beforeprint` listener that
  does the same deselect (the repack cannot be awaited from there) (2026-09-12).
- **Operator hugs a three-digit second operand in the 2-op-1 layout** — `MathBlockRenderer`
  `COMPACT_OP_GAP`: "+315" vs "+ 51". Compact operand cell is right-aligned and the gap is too
  small (2026-09-10).
- **37 viewers set solution red inline** — only the four bewerkingen viewers use bold + the shared
  colour; the rest hardcode `color: red`-style inline. Wants one `--ink-solution` token + shared
  style (2026-09-10).

## Tooling

- **`npm test` cannot run from Git Bash** — vitest 5.0.0 fails to initialise its worker
  ("failed to find the runner" / "Cannot read properties of undefined (reading 'config')") for
  every suite when launched from the Git Bash shell on this machine; the identical command from
  PowerShell passes. Survives `npm ci`, so it is shell-related, not an install problem. Run the
  gate from PowerShell until it is diagnosed (2026-09-12).

- **Indivisible blocks leave big blank tails** — measure-then-pack (789b3a8) removed the
  estimate error, but a block that does not fit the remaining page still moves whole to the next
  page (layout-check run 2026-09-12: page 3 = one ½ block + 466px blank because the next block
  was 628px). Enhancement: let multi-row viewers (FragmentableGrid users) split across pages —
  packer emits `{ block, rowFrom, rowTo }` per page, viewers accept an item window; per-row
  heights are measurable from `.print-row` children. Big change (≈40 viewers); design first.
- **Ordenen at ½ width wraps its comma list mid-list** — `OrdenenViewer`: "560,16 , 56,7 / , 12,22"
  reads as separate numbers. Needs `white-space: nowrap` per number + wrap only between numbers,
  or a stacked layout below a width threshold (2026-09-12).

## Docs

- Historical links in `UpdateState.md` to `StyleBuilderModal.tsx` ×2, `BaseSettingsPanel.tsx`,
  and `PresetModal.tsx` (ARCHITECTURE history note) point at renamed/deleted files. Accurate
  when written; demote to plain text if they bother anyone (2026-09-12).
- ARCHITECTURE §14 links 13 `src/board/*` files that exist only on branch `whiteboard`
  (2026-09-12).
