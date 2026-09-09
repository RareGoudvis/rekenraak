import type { MathBlock } from '../math/types';
import {
    COL_UNITS, ROW_BUDGET, estimateHeightUnits, minWidthUnits, type WidthUnits,
} from '../../config/blockLayout';

// Deterministic pagination. Blocks in, pages out — no DOM measurement and no reflow loop,
// so the page count is knowable before anything renders and is unit-testable on its own.
//
// The rules, in the order they apply to each block:
//   1. `pageBreakBefore` forces a fresh page.
//   2. The block is clamped to at least its minWidthUnits — settings can outgrow the width
//      the teacher picked, and silently overflowing the cell is the one thing we must not do.
//   3. It goes in the current row if the width still fits, otherwise a new row starts.
//   4. If the row would push the page past its budget, the page ends first.
//   5. A block taller than a whole page is marked `spans` and keeps the old behaviour of
//      flowing across pages through FragmentableGrid; the next block starts fresh.

export interface PackedBlock {
    block: MathBlock;
    /** Width actually used, after clamping to minWidthUnits. */
    width: WidthUnits;
    /** Budgeted height in row units. */
    height: number;
    /** Taller than one page: it flows across pages instead of being placed in a row. */
    spans: boolean;
    /** The chosen width was too narrow for the settings and had to be widened. */
    promoted: boolean;
}

export interface PackedRow {
    items: PackedBlock[];
    /** Column units consumed. */
    width: number;
    /** Row units consumed — the tallest item, capped at one page. */
    height: number;
}

export interface PackedPage {
    rows: PackedRow[];
    /** Row units consumed by this page, gaps included. */
    used: number;
}

export interface PackOptions {
    colUnits?: number;
    rowBudget?: number;
    /** Gap between blocks, in px, from docSettings.blockSpacing. */
    blockSpacingPx?: number;
}

const ROW_UNIT_PX = 24;

export function packPages(blocks: MathBlock[], opts: PackOptions = {}): PackedPage[] {
    const colUnits = opts.colUnits ?? COL_UNITS;
    const rowBudget = opts.rowBudget ?? ROW_BUDGET;
    // The gap between rows is real height; leaving it out is how an estimate quietly
    // overruns the footer.
    const rowGap = (opts.blockSpacingPx ?? 12) / ROW_UNIT_PX;

    const pages: PackedPage[] = [];
    let rows: PackedRow[] = [];          // rows of the page being filled
    let closed = 0;                      // row units used by the finished rows of this page

    const flushPage = () => {
        pages.push({ rows, used: rows.reduce((a, r) => a + r.height, 0) + Math.max(0, rows.length - 1) * rowGap });
        rows = [];
        closed = 0;
    };

    for (const block of blocks) {
        const width = Math.max(block.widthUnits ?? 6, minWidthUnits(block)) as WidthUnits;
        const promoted = (block.widthUnits ?? 6) < width;
        const height = estimateHeightUnits(block, width);
        const spans = height > rowBudget;
        const capped = Math.min(height, rowBudget);

        // 1. forced break — never leaving a blank page in front of it
        if (block.pageBreakBefore && rows.length > 0) flushPage();

        const open = rows.length > 0 ? rows[rows.length - 1] : null;
        const joins = open !== null && open.width + width <= colUnits;

        // 4. Cost the placement BEFORE making it. Both cases have to be costed: only
        //    counting the rows already finished is how a page overflows on its last row.
        const prospective = joins
            ? closed + Math.max(open.height, capped)
            : closed + (open ? open.height + rowGap : 0) + capped;

        // A block taller than a page cannot share a row: it would add its own capped height
        // on top of whatever was already there and push the page over its budget.
        if (spans && rows.length > 0) flushPage();
        else if (!spans && prospective > rowBudget && rows.length > 0) flushPage();

        // 3. join the row that is still open, or start a new one
        const last = rows.length > 0 ? rows[rows.length - 1] : null;
        let target: PackedRow;
        if (last !== null && last.width + width <= colUnits) {
            target = last;
        } else {
            if (last !== null) closed += last.height + rowGap;
            target = { items: [], width: 0, height: 0 };
            rows.push(target);
        }

        target.items.push({ block, width, height, spans, promoted });
        target.width += width;
        target.height = Math.max(target.height, capped);

        // 5. an oversized block owns the rest of its page
        if (spans) flushPage();
    }
    if (rows.length > 0 || pages.length === 0) flushPage();

    // A forced break or a spanning block can leave an empty page behind it.
    const filled = pages.filter((p, i) => p.rows.length > 0 || i === 0);
    return filled.length > 0 ? filled : [{ rows: [], used: 0 }];
}

/** blockId → zero-based page index, for the Overzicht markers. */
export function pageIndexByBlock(pages: PackedPage[]): Record<string, number> {
    const out: Record<string, number> = {};
    pages.forEach((p, i) => p.rows.forEach(r => r.items.forEach(it => { out[it.block.id] = i; })));
    return out;
}
