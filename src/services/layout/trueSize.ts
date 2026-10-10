import type { MathBlock } from '../math/types';

// Pure numbers on purpose: generators import this, and blockLayout / BlockWidthContext pull the
// store (and through it the registry) into a generator's import cycle.

// 1 cm at 96 dpi: the to-scale drawings a child measures with a ruler.
// SYNC: MetenViewer CM (37.8), FractionExerciseItem CM_PX (96 / 2.54).
export const CM_PX = 96 / 2.54;

// SYNC: BlockWidthContext FULL_BLOCK_WIDTH_PX / cellWidthPx and blockLayout tierWidthPx
// (COL_GAP_PX: the widest column gap, blockSpacing 12 + the 16 px column rule); trueSize.test pins them.
const FULL_BLOCK_PX = 688, WIDEST_COL_GAP_PX = 12 + 16;
export const trueTierPx = (units: 1 | 2 | 4): number =>
    Math.floor(((FULL_BLOCK_PX - 3 * WIDEST_COL_GAP_PX) / 4) * units + WIDEST_COL_GAP_PX * (units - 1));

// SYNC: blockLayout MONO_ADVANCE_EM / monoTextPx (Azeret Mono advances every glyph 0.65 em).
export const monoPx = (chars: number, fontFactor: number, mathPx: number): number => chars * 0.65 * fontFactor * mathPx;
// The largest Cijfers font (16pt, the Inspector slider's top) in px: a label sized at it never
// pushes a true-size figure out of its column. 1pt = 96/72 px.
export const MAX_MATH_PX = 16 * (96 / 72);

// A figure that exactly fills its column is one stroke from overflowing it.
const STROKE_SLACK_PX = 4;

/** How many cm of figure fit across the block's column at true size, after `reservePx` of padding and labels (0,1 cm steps, down); `minTier` = the narrowest column the block's other content lets it print in. */
export function trueSizeBudgetCm(block: MathBlock, reservePx: number, minTier: 1 | 2 | 4 = 1): number {
    const px = trueTierPx(Math.max(block.widthUnits ?? 4, minTier) as 1 | 2 | 4) - reservePx - STROKE_SLACK_PX;
    return Math.max(0, Math.floor((px / CM_PX) * 10) / 10);
}
