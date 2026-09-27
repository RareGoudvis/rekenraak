import { REGISTRY } from '../../config/exerciseRegistry';
import type { MathBlock } from '../math/types';

// ── "Blok splitsen" ───────────────────────────────────────────────────────────
// A block that does not fit the rest of a page moves whole to the next one and leaves a
// blank tail. The packer cannot break a block by itself, so the teacher does it: cut
// after exercise N and the first N stay where there is still room.

/** How many exercises this block holds, via the registry's own array field. */
export function splittableCount(block: MathBlock): number {
    if (REGISTRY[block.typeId]?.isFurniture) return 0;
    const field = REGISTRY[block.typeId]?.exerciseField;
    if (!field) return 0;
    const items = block[field] as unknown[] | undefined;
    return Array.isArray(items) ? items.length : 0;
}

// Largest N whose leading rows still fit `availablePx`, measured off the rendered cell.
// `.print-row` (FragmentableGrid) is the only place a block really breaks, so the count
// walks whole rows and adds up the exercises in them. Returns null when the DOM says
// nothing useful — one row, no measurement, or everything fits anyway.
//
// All heights come from getBoundingClientRect and are divided back by the sheet zoom:
// offsetHeight inside ScaledBlock's CSS `zoom` is unzoomed local px and would not
// compare with the page box around it.
export function fittingSplitIndex(cell: HTMLElement, availablePx: number, count: number, zoom: number): number | null {
    const rows = Array.from(cell.querySelectorAll<HTMLElement>('.print-row'));
    if (rows.length < 2 || !(availablePx > 0)) return null;
    const h = (el: HTMLElement) => el.getBoundingClientRect().height / zoom;
    const rowsTotal = rows.reduce((sum, r) => sum + h(r), 0);
    // Whatever is not an exercise row — the opdracht title, block padding — has to fit too.
    let used = h(cell) - rowsTotal;
    let n = 0;
    for (const row of rows) {
        used += h(row);
        if (used > availablePx) break;
        n += row.children.length || 1;
    }
    return n >= 1 && n < count ? n : null;
}
