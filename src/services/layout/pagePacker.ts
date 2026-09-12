import type { MathBlock } from '../math/types';
import {
    COL_UNITS, ROW_BUDGET, estimateHeightUnits, minWidthUnits, type WidthUnits,
} from '../../config/blockLayout';

// Deterministic pagination. Blocks in, pages out — the packer itself never touches the
// DOM, so it stays pure and unit-testable; App injects measured heights through callbacks.
//
// Heights are the MEASURED height of the BLOCK when App has one and the settings-derived
// estimate otherwise. Of the BLOCK, not of its grid cell: a grid item stretches to its
// row's height, so a cell's own box is placement-dependent and would feed the tall block's
// height back as the short one's (see PageSheet's ownHeight).
// That combination converges: a cell's height depends on (block, width,
// spacing, docSettings) and never on which row or page it landed in, and the width clamp
// only ever WIDENS a block, which re-measures under a new key instead of overwriting the
// measurement it came from. One remeasure reaches the fixed point.
//
// The rules, in the order they apply to each block:
//   1. `pageBreakBefore` forces a fresh page.
//   2. The block is clamped to at least its minWidthUnits (or `minWidthOf`, which App fills
//      with the measured content width) — content can outgrow the width the teacher picked,
//      and silently overflowing the cell is the one thing we must not do. The clamp only
//      ever widens, so it cannot fight a measurement taken at a narrower width.
//   3. It goes in the current row if the width still fits, otherwise a new row starts.
//   4. If the row would push the page past its budget, the page ends first.
//   5. A block taller than a whole page is marked `spans`: it gets a page to itself and
//      the next block starts fresh. `spans` does NOT mean it flows — `.page-sheet` is a
//      fixed 297mm box with overflow:hidden in print too, so the tail is cut off on paper
//      exactly as it is on screen (verified with a print-media PDF, 2026-09-12). The page
//      says so in its banner; the cure is splitting the block or `constraints.fitToPage`.

export interface PackedBlock {
    block: MathBlock;
    /** Width actually used, after clamping to minWidthUnits. */
    width: WidthUnits;
    /** Budgeted height in row units. */
    height: number;
    /** Taller than one page: it gets a page of its own (and is clipped at the bottom). */
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
    /** Measured px height of a block's rendered cell, when one exists (see useMeasuredHeights). */
    heightPxOf?: (block: MathBlock, width: WidthUnits) => number | undefined;
    /** Measured px height of a page's body box, when one exists. */
    pageBudgetPx?: (pageIndex: number) => number | undefined;
    /** Width-matrix harness only: place blocks at the width asked for, clamp or not. */
    ignoreMinWidth?: boolean;
    /** Narrowest width a block may be clamped to. App passes a closure that feeds the
        MEASURED intrinsic content width in; the default is the settings-derived table. */
    minWidthOf?: (block: MathBlock) => WidthUnits;
}

const ROW_UNIT_PX = 24;
// Pagination must not turn on float noise. Heights arrive in px and are costed in row
// units, and 788/24 + 12/24 + 200/24 is not exactly 1000/24 in binary — an exactly-full
// page then spilled its last block onto a page of its own and left a page-high blank tail
// behind it. Half a printed pixel of tolerance is far below anything a teacher can see and
// far above the rounding.
const FIT_EPSILON = 0.5 / ROW_UNIT_PX;

export function packPages(blocks: MathBlock[], opts: PackOptions = {}): PackedPage[] {
    const colUnits = opts.colUnits ?? COL_UNITS;
    const rowBudget = opts.rowBudget ?? ROW_BUDGET;
    // The gap between rows is real height; leaving it out is how an estimate quietly
    // overruns the footer.
    const rowGap = (opts.blockSpacingPx ?? 12) / ROW_UNIT_PX;
    // Page 0 is shorter than the rest (it carries the header), so each page is costed
    // against its own measured body rather than one global budget.
    const budgetFor = (pageIndex: number) => {
        const px = opts.pageBudgetPx?.(pageIndex);
        return px !== undefined && px > 0 ? px / ROW_UNIT_PX : rowBudget;
    };

    const pages: PackedPage[] = [];
    let rows: PackedRow[] = [];          // rows of the page being filled
    let closed = 0;                      // row units used by the finished rows of this page

    const flushPage = () => {
        pages.push({ rows, used: rows.reduce((a, r) => a + r.height, 0) + Math.max(0, rows.length - 1) * rowGap });
        rows = [];
        closed = 0;
    };

    for (const block of blocks) {
        const asked = (block.widthUnits ?? COL_UNITS) as WidthUnits;
        const minWidth = opts.minWidthOf?.(block) ?? minWidthUnits(block);
        const width = opts.ignoreMinWidth ? asked : Math.max(asked, minWidth) as WidthUnits;
        const promoted = asked < width;
        // A blank page is a whole page BY DEFINITION, so measuring it would only report
        // back whatever the last pagination gave it.
        const measuredPx = block.typeId === 'layout-lege-pagina' ? undefined : opts.heightPxOf?.(block, width);
        const height = measuredPx !== undefined && measuredPx > 0 ? measuredPx / ROW_UNIT_PX : estimateHeightUnits(block, width);
        // Judged against the FIRST page: it is the shortest, and a block that cannot fit
        // there must flow rather than be placed in a row anywhere.
        const spans = height > budgetFor(0) + FIT_EPSILON;

        // 1. forced break — never leaving a blank page in front of it
        if (block.pageBreakBefore && rows.length > 0) flushPage();

        const budget = budgetFor(pages.length);
        const capped = Math.min(height, budget);
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
        else if (!spans && prospective > budget + FIT_EPSILON && rows.length > 0) flushPage();

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
