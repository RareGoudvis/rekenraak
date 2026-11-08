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
    let rows = Array.from(cell.querySelectorAll<HTMLElement>('.print-row'));
    // Cijfer and GeldTeruggeven have no FragmentableGrid: each exercise is its own unit.
    const perRow = rows.length > 0;
    if (!perRow) rows = Array.from(cell.querySelectorAll<HTMLElement>('.print-exercise'));
    if (rows.length < 2 || !(availablePx > 0)) return null;
    // Offsets from the cell's top: a row's bottom is everything above it (title, padding and
    // the rows' own marginBottom) plus itself, which `cell height - sum(rows)` would get wrong.
    const top = cell.getBoundingClientRect().top;
    let n = 0;
    for (const row of rows) {
        if ((row.getBoundingClientRect().bottom - top) / zoom > availablePx) break;
        n += perRow ? row.children.length || 1 : 1;
    }
    return n >= 1 && n < count ? n : null;
}
