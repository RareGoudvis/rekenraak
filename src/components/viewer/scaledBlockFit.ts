// The pure half of ScaledBlock's auto-fit: everything that can be reasoned about (and
// tested) without a layout engine. It lives apart from the component so it can be
// unit-tested and so ScaledBlock.tsx keeps exporting only its component (fast refresh).

// Sub-pixel margin so a block measured as "just fits" can't clip a hair off the right
// edge when Chrome rasterizes the PDF (offsetWidth/scrollWidth are integer-rounded).
export const SAFETY = 0.97;
// Ratio dead-band — stops micro-thrash around the fixed point.
export const EPS = 0.005;
// How far the opt-in height back-off may shrink a block. Below ~0.7 the exercises stop
// being writable-on by a child, so an even longer block is the teacher's to split.
export const FIT_FLOOR = 0.7;

/**
 * The next zoom to apply when content overflows by `ratio` (> 1 = it does not fit).
 * Monotone: never more than `applied`, never less than `floor`, and `applied` unchanged
 * inside the dead-band — which is what makes the measure loop converge, not oscillate.
 */
export function nextZoom(applied: number, ratio: number, floor: number, safety = SAFETY): number {
    if (!(ratio > 1 + EPS)) return applied;
    return Math.max(floor, Math.min(applied, (applied / ratio) * safety));
}
