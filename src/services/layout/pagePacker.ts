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
        the page budget (a taller block is clipped, and its page says so). With `rest` set it
        is the height of the top window only. */
    h: number;
    /** Cut by the QR split line between two of its rows: the cell shows its first `h` px,
        and the rest of the same render (from `top` down) sits under the line at `y`. */
    rest?: { y: number; h: number; top: number };
}

/** A run of one block's exercises, `from` (default 0) up to `to` (default: the end). */
export interface QrPart { block: MathBlock; from?: number; to?: number }

/** A row boundary inside a block, measured: the row starts `px` below the cell's top and
    `count` exercises come before it. */
export interface RowCut { px: number; count: number }

/** The stappenhulp split line: a full-width row with its own QR for the sums above it;
    the footer QR keeps the sums below it. */
export interface QrSplit { y: number; h: number; above: QrPart[]; below: QrPart[] }

export interface PackedPage {
    blocks: PlacedBlock[];
    /** Row units consumed by this page, gaps included — the deepest point of the skyline. */
    used: number;
    /** Bottom px of each column unit when the page closed. The blank tail a teacher is
        offered a split for is measured against this, per width. */
    fill: number[];
    /** The page budget this page was packed against, in px. */
    budgetPx: number;
    /** Set when the page's sums do not fit one stappenhulp QR (PackOptions.qrSplit). */
    qrSplit?: QrSplit;
}

export interface QrSplitOptions {
    /** Height of the split line's row (a fixed-height box around the bare QR). */
    dividerPx: number;
    /** Whether these exercises fit one QR in full; true when none of them has steps. */
    fits: (parts: QrPart[]) => boolean;
    /** Measured row boundaries of a block at a width, for a line inside one block. */
    rowCutsOf?: (block: MathBlock, width: WidthUnits) => RowCut[] | undefined;
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
    /** Stappenhulp QR on: a page whose sums overflow one QR gets a split line (splitPage). */
    qrSplit?: QrSplitOptions;
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

// One page's placement state: `probe` says where a box would go and how deep the page then
// is, `place` commits it. Skyline and rows differ only here, so the page loop is shared.
interface Cursor {
    probe(w: number, h: number): { x: number; y: number; bottom: number };
    place(x: number, y: number, w: number, h: number): void;
    fill(): number[];
}

function skylineCursor(colUnits: number, gapPx: number): Cursor {
    const fill = new Array<number>(colUnits).fill(0);
    return {
        probe(w, h) { const s = skylineSlot(fill, w, gapPx); return { ...s, bottom: s.y + h }; },
        place(x, y, w, h) { for (let c = x; c < x + w; c++) fill[c] = y + h; },
        fill: () => [...fill],
    };
}

// The pre-skyline layout, kept as a setting: a row is as tall as its tallest block and the
// next row starts under all of them, so blocks line up across the page (and leave holes).
function rowsCursor(colUnits: number, gapPx: number): Cursor {
    // The open row; width 0 = no row yet.
    let row = { y: 0, width: 0, height: 0 };
    const below = () => (row.width > 0 ? row.y + row.height + gapPx : 0);
    return {
        // Both cases have to be costed: only counting the rows already finished is how a
        // page overflows on its last row.
        probe(w, h) {
            if (row.width > 0 && row.width + w <= colUnits) return { x: row.width, y: row.y, bottom: row.y + Math.max(row.height, h) };
            return { x: 0, y: below(), bottom: below() + h };
        },
        place(x, y, w, h) {
            row = row.width > 0 && x > 0 && y === row.y
                ? { y, width: row.width + w, height: Math.max(row.height, h) }
                : { y, width: w, height: h };
        },
        fill: () => new Array<number>(colUnits).fill(row.width > 0 ? row.y + row.height : 0),
    };
}

// Where the QR split line goes on a page: in front of block `at`, or inside it before a measured row.
type SplitPlan = { at: number; cut?: RowCut };

interface PageRun { placed: PlacedBlock[]; fill: number[]; budgetPx: number; next: number; split?: QrSplit }

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
    const lineH = opts.qrSplit?.dividerPx ?? 0;

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
    const prepared = blocks.map(prepare);

    // One page from block `start` on; `stopAt` ends it in front of that block. A plan puts the
    // split line in; null = the line would have nothing under it on this page.
    const packPage = (start: number, pageIndex: number, plan?: SplitPlan, stopAt?: number): PageRun | null => {
        const budget = budgetFor(pageIndex);
        const cur = opts.mode === 'rijen' ? rowsCursor(colUnits, gapPx) : skylineCursor(colUnits, gapPx);
        const placed: PlacedBlock[] = [];
        let line: { y: number; first: number } | undefined;
        let i = start;
        for (; i < prepared.length && i !== stopAt; i++) {
            const p = prepared[i];
            // 1. forced break — never leaving a blank page in front of it
            // 5a. a block taller than a page cannot share one: whatever sits beside it would
            //     be pushed off the paper by the part of it that is already clipped.
            if (placed.length > 0 && (p.block.pageBreakBefore || p.spans)) break;
            const h = Math.min(p.px, budget);

            if (plan?.cut && i === plan.at) {
                // Top window, line, rest window: all full width, all on this page.
                const top = cur.probe(colUnits, plan.cut.px);
                const lineY = top.bottom + gapPx;
                const restY = lineY + lineH + gapPx;
                const restH = p.px - plan.cut.px;
                if (restY + restH > budget + FIT_EPSILON_PX) return null;
                placed.push({ ...p, x: top.x, y: top.y, w: p.width, h: plan.cut.px, rest: { y: restY, h: restH, top: plan.cut.px } });
                cur.place(top.x, top.y, colUnits, restY + restH - top.y);
                line = { y: lineY, first: placed.length - 1 };
                continue;
            }
            if (plan && i === plan.at) {
                const slot = cur.probe(colUnits, lineH);
                // No room for the line: the page ends in front of it, and what is above fits one QR.
                if (slot.bottom > budget + FIT_EPSILON_PX) break;
                cur.place(slot.x, slot.y, colUnits, lineH);
                line = { y: slot.y, first: placed.length };
            }

            // 3. lowest gap wide enough for it, leftmost of equals (or the open row)
            const slot = cur.probe(p.width, h);
            // 4. cost the placement BEFORE making it
            if (!p.spans && slot.bottom > budget + FIT_EPSILON_PX && placed.length > 0) break;
            placed.push({ ...p, x: slot.x, y: slot.y, w: p.width, h });
            cur.place(slot.x, slot.y, p.width, h);
            // 5b. an oversized block owns the rest of its page
            if (p.spans) { i++; break; }
        }
        if (line && placed.length <= line.first) return null;
        const run: PageRun = { placed, fill: cur.fill(), budgetPx: budget, next: i };
        if (line) {
            const above: QrPart[] = placed.slice(0, line.first).map(b => ({ block: b.block }));
            const below: QrPart[] = placed.slice(line.first).map(b => ({ block: b.block }));
            if (plan?.cut) {
                above.push({ block: below[0].block, to: plan.cut.count });
                below[0] = { block: below[0].block, from: plan.cut.count };
            }
            run.split = { y: line.y, h: lineH, above, below };
        }
        return run;
    };

    const pages: PackedPage[] = [];
    for (let i = 0; i < prepared.length;) {
        let run = packPage(i, pages.length)!;
        if (opts.qrSplit) run = splitPage(run, i, pages.length, opts.qrSplit, prepared, packPage, colUnits);
        pages.push({
            blocks: run.placed, fill: run.fill, budgetPx: run.budgetPx,
            used: Math.max(0, ...run.fill) / ROW_UNIT_PX,
            ...(run.split && { qrSplit: run.split }),
        });
        i = run.next;
    }
    return pages.length > 0 ? pages : [{ blocks: [], used: 0, fill: new Array(colUnits).fill(0), budgetPx: budgetFor(0) }];
}

// The stappenhulp split for one packed page, only when its sums do not fit one QR in full.
// The line goes in front of the first block that overflows the QR (the latest block boundary
// whose sums above still fit, so it lands low on the page). When the sums under it still
// overflow, or the first block alone does, the line goes between two rows of that block
// (full width only), at the latest row whose sums above fit. Every candidate is placed for
// real, so the line's height is costed and the blocks it pushes off move to the next page.
function splitPage(
    run: PageRun, start: number, pageIndex: number, qr: QrSplitOptions, prepared: Prepared[],
    packPage: (start: number, pageIndex: number, plan?: SplitPlan, stopAt?: number) => PageRun | null,
    colUnits: number,
): PageRun {
    const parts = (from: number, to: number): QrPart[] => run.placed.slice(from, to).map(b => ({ block: b.block }));
    const n = run.placed.length;
    if (n === 0 || run.placed[0].spans || qr.fits(parts(0, n))) return run;
    // First block that overflows the QR together with everything above it; a binary search,
    // since adding exercises never makes the payload shorter.
    let lo = 0, hi = n - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (qr.fits(parts(0, mid + 1))) lo = mid + 1; else hi = mid;
    }
    const j = lo;
    let fallback: PageRun | null = null;
    if (j > 0) {
        // Nothing fits under the line: the page ends in front of block j instead.
        const byBlock = packPage(start, pageIndex, { at: start + j }) ?? packPage(start, pageIndex, undefined, start + j)!;
        if (!byBlock.split || qr.fits(byBlock.split.below)) return byBlock;
        fallback = byBlock;
    }
    const p = prepared[start + j];
    const cuts = p.width === colUnits && !p.spans ? qr.rowCutsOf?.(p.block, p.width) : undefined;
    if (cuts?.length) {
        const head = parts(0, j);
        const latestFirst = cuts.filter(c => c.count > 0 && c.px > 0 && c.px < p.px).sort((a, b) => b.count - a.count);
        const cut = latestFirst.find(c => qr.fits([...head, { block: p.block, to: c.count }]));
        const byRow = cut ? packPage(start, pageIndex, { at: start + j, cut }) : null;
        if (byRow?.split) return byRow;
    }
    return fallback ?? run;
}

/** blockId → zero-based page index, for the Overzicht markers. */
export function pageIndexByBlock(pages: PackedPage[]): Record<string, number> {
    const out: Record<string, number> = {};
    pages.forEach((p, i) => p.blocks.forEach(it => { out[it.block.id] = i; }));
    return out;
}
