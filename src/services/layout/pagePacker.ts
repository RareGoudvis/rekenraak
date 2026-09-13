import type { MathBlock } from '../math/types';
import {
    COL_UNITS, ROW_BUDGET, estimateHeightUnits, minWidthUnits, type WidthUnits,
} from './blockLayout';

// Deterministic pagination. Blocks in, pages out — the packer itself never touches the
// DOM, so it stays pure and unit-testable; App injects measured heights through callbacks.
// It decides WHERE every block sits: `x` in column units, `y` and `h` in px, and PageSheet
// positions the cell absolutely at exactly those numbers. Nothing flows.
//
// Heights are the MEASURED height of the BLOCK when App has one and the settings-derived
// estimate otherwise. Of the BLOCK, not of its grid cell: a grid item stretches to its
// row's height, so a cell's own box is placement-dependent and would feed the tall block's
// height back as the short one's (see PageSheet's ownHeight).
// That combination converges: a cell's height depends on (block, width,
// spacing, docSettings) and never on which row or page it landed in, and the width clamp
// only ever WIDENS a block, which re-measures under a new key instead of overwriting the
// measurement it came from. One remeasure reaches the fixed point. Skyline placement is a
// pure function of those heights, so making the layout positional changes nothing about it.
//
// Two modes:
//   'aansluitend' (default) — a SKYLINE: each column unit remembers how far down it is
//      filled, and a block drops into the lowest gap wide enough for it. A short half-width
//      block beside a tall one no longer wastes the paper under it.
//   'rijen' — the row layout that came before: a row is as tall as its tallest block and
//      the next block starts below all of them. Kept because some teachers want their
//      blocks to line up across the page, and as the regression guard for the skyline.
//
// The rules, in the order they apply to each block:
//   1. `pageBreakBefore` forces a fresh page.
//   2. The block is clamped to at least its minWidthUnits (or `minWidthOf`, which App fills
//      with the measured content width) — content can outgrow the width the teacher picked,
//      and silently overflowing the cell is the one thing we must not do. The clamp only
//      ever widens, so it cannot fight a measurement taken at a narrower width.
//   3. It goes at the lowest position its width fits in (leftmost of equals), or — in
//      'rijen' — in the current row if the width still fits, otherwise a new row.
//   4. If that position would push the block past the page budget, the page ends first.
//   5. A block taller than a whole page is marked `spans`: it gets a page to itself and
//      the next block starts fresh. `spans` does NOT mean it flows — `.page-sheet` is a
//      fixed 297mm box with overflow:hidden in print too, so the tail is cut off on paper
//      exactly as it is on screen (verified with a print-media PDF, 2026-09-12). The page
//      says so in its banner; the cure is splitting the block or `constraints.fitToPage`.

export type PackMode = 'aansluitend' | 'rijen';

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

export interface PlacedBlock extends PackedBlock {
    /** Left edge, in column units (0 … COL_UNITS−1). */
    x: number;
    /** Top edge in px, measured from the top of the page body. */
    y: number;
    /** Width in column units — `width` under the name the geometry uses. */
    w: WidthUnits;
    /** Height in px as placed: measured when there is one, estimate otherwise, capped at
        the page budget (a taller block is clipped, and its page says so). */
    h: number;
}

export interface PackedPage {
    blocks: PlacedBlock[];
    /** Row units consumed by this page, gaps included — the deepest point of the skyline. */
    used: number;
    /** Bottom px of each column unit when the page closed. The blank tail a teacher is
        offered a split for is measured against this, per width. */
    fill: number[];
    /** The page budget this page was packed against, in px. */
    budgetPx: number;
}

export interface PackOptions {
    colUnits?: number;
    rowBudget?: number;
    /** docSettings.packMode — 'aansluitend' (skyline) or 'rijen' (aligned rows). */
    mode?: PackMode;
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
    /** docSettings.answerSpace — only reaches the first-paint ESTIMATE; measured wins after. */
    answerSpacePx?: number;
}

const ROW_UNIT_PX = 24;
// Pagination must not turn on float noise. Heights arrive in px and are costed in px, and
// 788 + 12 + 200 is not exactly 1000 once a measured body has been divided and multiplied
// back — an exactly-full page then spilled its last block onto a page of its own and left
// a page-high blank tail behind it. Half a printed pixel of tolerance is far below
// anything a teacher can see and far above the rounding.
const FIT_EPSILON_PX = 0.5;

interface Prepared extends PackedBlock {
    /** Uncapped height in px — what the block will actually render at. */
    px: number;
}

/** Where a block of `w` column units drops into a skyline: the lowest free y, leftmost of
    equals. Exported because the tail hint asks the same question about the NEXT block. */
export function skylineSlot(fill: number[], w: number, gapPx: number): { x: number; y: number } {
    let best = { x: 0, y: Infinity };
    for (let x = 0; x + w <= fill.length; x++) {
        let y = 0;
        // A column that has never been written to starts at the top of the body, with no
        // gap in front of it; every other one owes its predecessor the block spacing.
        for (let c = x; c < x + w; c++) if (fill[c] > 0) y = Math.max(y, fill[c] + gapPx);
        if (y < best.y - FIT_EPSILON_PX) best = { x, y };
    }
    return best.y === Infinity ? { x: 0, y: 0 } : best;
}

export function packPages(blocks: MathBlock[], opts: PackOptions = {}): PackedPage[] {
    const colUnits = opts.colUnits ?? COL_UNITS;
    const rowBudget = opts.rowBudget ?? ROW_BUDGET;
    // The gap between blocks is real height; leaving it out is how an estimate quietly
    // overruns the footer.
    const gapPx = opts.blockSpacingPx ?? 12;
    // Page 0 is shorter than the rest (it carries the header), so each page is costed
    // against its own measured body rather than one global budget.
    const budgetFor = (pageIndex: number) => {
        const px = opts.pageBudgetPx?.(pageIndex);
        return px !== undefined && px > 0 ? px : rowBudget * ROW_UNIT_PX;
    };

    const prepare = (block: MathBlock): Prepared => {
        const asked = (block.widthUnits ?? COL_UNITS) as WidthUnits;
        const minWidth = opts.minWidthOf?.(block) ?? minWidthUnits(block);
        const width = opts.ignoreMinWidth ? asked : Math.max(asked, minWidth) as WidthUnits;
        // A blank page is a whole page BY DEFINITION, so measuring it would only report
        // back whatever the last pagination gave it.
        const measuredPx = block.typeId === 'layout-lege-pagina' ? undefined : opts.heightPxOf?.(block, width);
        const px = measuredPx !== undefined && measuredPx > 0
            ? measuredPx
            : estimateHeightUnits(block, width, opts.answerSpacePx) * ROW_UNIT_PX;
        return {
            block, width, height: px / ROW_UNIT_PX, promoted: asked < width, px,
            // Judged against the FIRST page: it is the shortest, and a block that cannot
            // fit there must own a page rather than be placed beside anything.
            spans: px > budgetFor(0) + FIT_EPSILON_PX,
        };
    };

    const pages = opts.mode === 'rijen'
        ? packRows(blocks, prepare, colUnits, gapPx, budgetFor)
        : packSkyline(blocks, prepare, colUnits, gapPx, budgetFor);

    // A forced break or a spanning block can leave an empty page behind it.
    const filled = pages.filter((p, i) => p.blocks.length > 0 || i === 0);
    return filled.length > 0 ? filled : [{ blocks: [], used: 0, fill: new Array(colUnits).fill(0), budgetPx: budgetFor(0) }];
}

function packSkyline(
    blocks: MathBlock[],
    prepare: (b: MathBlock) => Prepared,
    colUnits: number,
    gapPx: number,
    budgetFor: (i: number) => number,
): PackedPage[] {
    const pages: PackedPage[] = [];
    let placed: PlacedBlock[] = [];
    let fill = new Array<number>(colUnits).fill(0);

    const flush = () => {
        pages.push({
            blocks: placed, fill, budgetPx: budgetFor(pages.length),
            used: Math.max(0, ...fill) / ROW_UNIT_PX,
        });
        placed = [];
        fill = new Array<number>(colUnits).fill(0);
    };

    for (const block of blocks) {
        const p = prepare(block);
        // 1. forced break — never leaving a blank page in front of it
        if (block.pageBreakBefore && placed.length > 0) flush();
        // 5a. a block taller than a page cannot share one: whatever sits beside it would
        //     be pushed off the paper by the part of it that is already clipped.
        if (p.spans && placed.length > 0) flush();

        let budget = budgetFor(pages.length);
        let h = Math.min(p.px, budget);
        // 3. lowest gap wide enough for it, leftmost of equals
        let slot = skylineSlot(fill, p.width, gapPx);
        // 4. cost the placement BEFORE making it
        if (!p.spans && slot.y + h > budget + FIT_EPSILON_PX && placed.length > 0) {
            flush();
            budget = budgetFor(pages.length);
            h = Math.min(p.px, budget);
            slot = skylineSlot(fill, p.width, gapPx);
        }

        placed.push({ ...p, x: slot.x, y: slot.y, w: p.width, h });
        for (let c = slot.x; c < slot.x + p.width; c++) fill[c] = slot.y + h;

        // 5b. an oversized block owns the rest of its page
        if (p.spans) flush();
    }
    if (placed.length > 0 || pages.length === 0) flush();
    return pages;
}

// The pre-skyline layout, kept as a setting: a row is as tall as its tallest block and the
// next row starts under all of them, so blocks line up across the page (and leave holes).
function packRows(
    blocks: MathBlock[],
    prepare: (b: MathBlock) => Prepared,
    colUnits: number,
    gapPx: number,
    budgetFor: (i: number) => number,
): PackedPage[] {
    interface Row { items: PlacedBlock[]; width: number; height: number; y: number }

    const pages: PackedPage[] = [];
    let rows: Row[] = [];
    let closed = 0;   // px used by the finished rows of this page, their gaps included

    const flush = () => {
        const last = rows.length > 0 ? rows[rows.length - 1] : null;
        const bottom = last ? last.y + last.height : 0;
        pages.push({
            blocks: rows.flatMap(r => r.items),
            fill: new Array<number>(colUnits).fill(bottom),
            budgetPx: budgetFor(pages.length),
            used: bottom / ROW_UNIT_PX,
        });
        rows = [];
        closed = 0;
    };

    for (const block of blocks) {
        const p = prepare(block);
        if (block.pageBreakBefore && rows.length > 0) flush();

        const budget = budgetFor(pages.length);
        const capped = Math.min(p.px, budget);
        const open = rows.length > 0 ? rows[rows.length - 1] : null;
        const joins = open !== null && open.width + p.width <= colUnits;
        // Both cases have to be costed: only counting the rows already finished is how a
        // page overflows on its last row.
        const prospective = joins
            ? closed + Math.max(open.height, capped)
            : closed + (open ? open.height + gapPx : 0) + capped;

        if (p.spans && rows.length > 0) flush();
        else if (!p.spans && prospective > budget + FIT_EPSILON_PX && rows.length > 0) flush();

        const last = rows.length > 0 ? rows[rows.length - 1] : null;
        let target: Row;
        if (last !== null && last.width + p.width <= colUnits) {
            target = last;
        } else {
            if (last !== null) closed += last.height + gapPx;
            target = { items: [], width: 0, height: 0, y: closed };
            rows.push(target);
        }

        target.items.push({ ...p, x: target.width, y: target.y, w: p.width, h: Math.min(p.px, budget) });
        target.width += p.width;
        target.height = Math.max(target.height, capped);

        if (p.spans) flush();
    }
    if (rows.length > 0 || pages.length === 0) flush();
    return pages;
}

/** blockId → zero-based page index, for the Overzicht markers. */
export function pageIndexByBlock(pages: PackedPage[]): Record<string, number> {
    const out: Record<string, number> = {};
    pages.forEach((p, i) => p.blocks.forEach(it => { out[it.block.id] = i; }));
    return out;
}
