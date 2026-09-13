import { describe, test, expect } from 'vitest';
import { packPages, pageIndexByBlock } from '../services/layout/pagePacker';
import { COL_UNITS, ROW_BUDGET, type WidthUnits } from '../services/layout/blockLayout';
import { makeBlock } from './helpers/makeBlock';
import { cellWidthPx, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';

// The packer is pure — blocks in, pages out, no DOM. These tests pin the placement rules
// rather than the numbers: they are written against COL_UNITS / ROW_BUDGET so they keep
// meaning when the grid changes width.

const HALF = (COL_UNITS / 2) as WidthUnits;

// hoofdrekenen at a small max is the least clamped type in LAYOUT (minWidth = half), so
// widths land where the test puts them instead of being promoted by minWidthUnits().
function narrow(widthUnits: WidthUnits, count = 2, extra: Partial<Parameters<typeof makeBlock>[1]> = {}) {
    return makeBlock('hr-std-optellen', {
        constraints: { numberType: 'natural', maxGetal: 100 },
        block: { widthUnits, numberOfExercises: count },
        ...extra,
    });
}

const flat = (pages: ReturnType<typeof packPages>) => pages.map(p => p.rows.map(r => r.items.map(i => i.block.id)));

describe('packPages', () => {
    test('empty input still yields one (empty) page', () => {
        const pages = packPages([]);
        expect(pages).toHaveLength(1);
        expect(pages[0].rows).toHaveLength(0);
    });

    test('two half-width blocks share one row', () => {
        const a = narrow(HALF, 2, { id: 'a' });
        const b = narrow(HALF, 2, { id: 'b' });
        const pages = packPages([a, b]);
        expect(flat(pages)).toEqual([[['a', 'b']]]);
    });

    test('a third half-width block starts a new row', () => {
        const blocks = ['a', 'b', 'c'].map(id => narrow(HALF, 2, { id }));
        const pages = packPages(blocks);
        expect(flat(pages)).toEqual([[['a', 'b'], ['c']]]);
    });

    test('exact fit: widths summing to COL_UNITS stay in one row, one more spills', () => {
        const perRow = COL_UNITS / HALF;
        const exact = Array.from({ length: perRow }, (_, i) => narrow(HALF, 2, { id: `e${i}` }));
        expect(packPages(exact)[0].rows).toHaveLength(1);

        const oneMore = [...exact, narrow(HALF, 2, { id: 'spill' })];
        const rows = packPages(oneMore)[0].rows;
        expect(rows).toHaveLength(2);
        expect(rows[1].items.map(i => i.block.id)).toEqual(['spill']);
    });

    test('a full-width block never shares a row', () => {
        const pages = packPages([
            narrow(HALF, 2, { id: 'half' }),
            narrow(COL_UNITS as WidthUnits, 2, { id: 'full' }),
        ]);
        expect(flat(pages)).toEqual([[['half'], ['full']]]);
    });

    test('pageBreakBefore starts a fresh page, and leaves no blank one in front', () => {
        const a = narrow(HALF, 2, { id: 'a' });
        const b = makeBlock('hr-std-optellen', {
            constraints: { numberType: 'natural', maxGetal: 100 },
            block: { widthUnits: HALF, numberOfExercises: 2, pageBreakBefore: true },
            id: 'b',
        });
        expect(flat(packPages([a, b]))).toEqual([[['a']], [['b']]]);

        // A break on the very first block must not produce an empty leading page.
        expect(flat(packPages([b]))).toEqual([[['b']]]);
    });

    test('the page ends before its budget is exceeded', () => {
        // Many tall blocks: no page may be packed past ROW_BUDGET.
        const blocks = Array.from({ length: 12 }, (_, i) => narrow(COL_UNITS as WidthUnits, 12, { id: `b${i}` }));
        const pages = packPages(blocks);
        expect(pages.length).toBeGreaterThan(1);
        for (const page of pages) {
            // A block taller than one page is capped and owns its page, so only pages with
            // more than one row are held to the budget.
            if (page.rows.length > 1) expect(page.used).toBeLessThanOrEqual(ROW_BUDGET);
        }
        // Nothing may be lost or duplicated.
        const placed = pages.flatMap(p => p.rows.flatMap(r => r.items.map(i => i.block.id)));
        expect(placed).toEqual(blocks.map(b => b.id));
    });

    test('a block taller than a page is marked spans and owns the rest of it', () => {
        // 200 exercises cannot fit one page, so the block flows across pages instead.
        const tall = narrow(COL_UNITS as WidthUnits, 200, { id: 'tall' });
        const after = narrow(HALF, 2, { id: 'after' });
        const pages = packPages([tall, after]);
        const first = pages[0].rows[0].items[0];
        expect(first.block.id).toBe('tall');
        expect(first.spans).toBe(true);
        expect(flat(pages)).toEqual([[['tall']], [['after']]]);
    });

    test('a blank page block takes exactly one page', () => {
        const blank = makeBlock('layout-lege-pagina', { block: { widthUnits: COL_UNITS as WidthUnits }, id: 'blank' });
        const after = narrow(HALF, 2, { id: 'after' });
        expect(flat(packPages([blank, after]))).toEqual([[['blank']], [['after']]]);
    });

    test('a width narrower than the type allows is promoted, not overflowed', () => {
        // maxGetal 1.000.000 forces the full width (minWidthUnits: wide numbers need wide
        // columns) even though the teacher asked for a half.
        const wide = makeBlock('hr-std-optellen', {
            constraints: { numberType: 'natural', maxGetal: 1000000 },
            block: { widthUnits: HALF, numberOfExercises: 2 },
            id: 'wide',
        });
        const item = packPages([wide])[0].rows[0].items[0];
        expect(item.width).toBe(COL_UNITS);
        expect(item.promoted).toBe(true);
    });

    test('blockSpacingPx is charged as real height between rows', () => {
        const blocks = ['a', 'b'].map(id => narrow(COL_UNITS as WidthUnits, 2, { id }));
        const tight = packPages(blocks, { blockSpacingPx: 0 });
        const airy = packPages(blocks, { blockSpacingPx: 48 });
        expect(airy[0].used).toBeGreaterThan(tight[0].used);
    });

    test('pageIndexByBlock maps every block to the page it landed on', () => {
        const a = narrow(HALF, 2, { id: 'a' });
        const b = makeBlock('hr-std-optellen', {
            constraints: { numberType: 'natural', maxGetal: 100 },
            block: { widthUnits: HALF, numberOfExercises: 2, pageBreakBefore: true },
            id: 'b',
        });
        expect(pageIndexByBlock(packPages([a, b]))).toEqual({ a: 0, b: 1 });
    });

    test('a measured height wins over the estimate', () => {
        const a = narrow(COL_UNITS as WidthUnits, 2, { id: 'a' });
        const b = narrow(COL_UNITS as WidthUnits, 2, { id: 'b' });
        // Both blocks measure as most of a page, so they cannot share one however small
        // their estimate says they are.
        const tall = packPages([a, b], { heightPxOf: () => (ROW_BUDGET * 24) * 0.7 });
        expect(flat(tall)).toEqual([[['a']], [['b']]]);

        // The same blocks on their estimate fit together.
        expect(packPages([a, b])).toHaveLength(1);
    });

    test('a measured page budget replaces ROW_BUDGET', () => {
        const blocks = Array.from({ length: 4 }, (_, i) => narrow(COL_UNITS as WidthUnits, 2, { id: `b${i}` }));
        // A body of two row units holds one block per page whatever the default budget is.
        const pages = packPages(blocks, { pageBudgetPx: () => 2 * 24, heightPxOf: () => 2 * 24 });
        expect(pages).toHaveLength(4);
    });

    test('a blank page keeps its estimate even when a measurement exists', () => {
        const blank = makeBlock('layout-lege-pagina', { block: { widthUnits: COL_UNITS as WidthUnits }, id: 'blank' });
        const after = narrow(COL_UNITS as WidthUnits, 2, { id: 'after' });
        // A measured blank page would only report back the height the last pagination gave
        // it, so it must stay a whole page by definition.
        expect(flat(packPages([blank, after], { heightPxOf: () => 24 }))).toEqual([[['blank']], [['after']]]);
    });

    test('ignoreMinWidth places a block at the width it was given', () => {
        const wide = makeBlock('hr-std-optellen', {
            constraints: { numberType: 'natural', maxGetal: 1000000 },
            block: { widthUnits: 1 },
            id: 'wide',
        });
        expect(packPages([wide])[0].rows[0].items[0].width).toBe(COL_UNITS);
        expect(packPages([wide], { ignoreMinWidth: true })[0].rows[0].items[0].width).toBe(1);
    });

    test('every packed row fits the column grid', () => {
        const blocks = Array.from({ length: 9 }, (_, i) => narrow(i % 3 === 0 ? (COL_UNITS as WidthUnits) : HALF, 3, { id: `b${i}` }));
        for (const page of packPages(blocks)) {
            for (const row of page.rows) expect(row.width).toBeLessThanOrEqual(COL_UNITS);
        }
    });
});

// The sheet and the viewers must agree on how wide a cell is: while App computed 688 and
// BlockWidthContext defaulted to 681, a viewer laid out a different grid depending on
// whether it was inside a provider.
describe('packPages with a measured minWidthOf', () => {
    // App injects the width clamp as a closure over the MEASURED content width. The packer
    // must use it instead of the per-type table — that is the whole point of 7a — and the
    // clamp must stay one-directional so measure→pack→measure cannot oscillate.
    test('a measured closure can place a type the table would have widened', () => {
        // even-oneven's table entry is full width; three short numbers are not. (It was
        // rekenvolgorde until the 2026-09-13 matrix rerun measured that type at a half.)
        const a = makeBlock('even-oneven', { id: 'a', block: { widthUnits: 1, numberOfExercises: 3 } });
        const b = makeBlock('even-oneven', { id: 'b', block: { widthUnits: 1, numberOfExercises: 3 } });
        expect(packPages([a, b])[0].rows[0].items.map(i => i.width)).toEqual([COL_UNITS]);
        const pages = packPages([a, b], { minWidthOf: () => 1 });
        expect(flat(pages)).toEqual([[['a', 'b']]]);
        expect(pages[0].rows[0].items.every(i => i.width === 1 && !i.promoted)).toBe(true);
    });

    test('the clamp only ever widens, and says so via `promoted`', () => {
        const a = makeBlock('rekenvolgorde', { id: 'a', block: { widthUnits: 1, numberOfExercises: 3 } });
        // Feeding the chosen width back in changes nothing: max(asked, min) is idempotent,
        // so a repack on a fresh measurement cannot ping-pong between two widths.
        const once = packPages([a], { minWidthOf: () => HALF })[0].rows[0].items[0];
        expect(once.width).toBe(HALF);
        expect(once.promoted).toBe(true);
        const twice = packPages([{ ...a, widthUnits: once.width }], { minWidthOf: () => HALF })[0].rows[0].items[0];
        expect(twice.width).toBe(HALF);
        expect(twice.promoted).toBe(false);
    });

    test('ignoreMinWidth still beats the closure, for the width-matrix harness', () => {
        const a = makeBlock('rekenvolgorde', { id: 'a', block: { widthUnits: 1, numberOfExercises: 3 } });
        const item = packPages([a], { minWidthOf: () => COL_UNITS as WidthUnits, ignoreMinWidth: true })[0].rows[0].items[0];
        expect(item.width).toBe(1);
    });
});

describe('a page that is exactly full', () => {
    // The bug this pins: the packer must decide "does the next block fit?" with the same
    // numbers the paper uses. Four blocks whose MEASURED heights plus the row gaps come to
    // exactly the body budget belong on ONE page — one px of double-counted chrome, or a
    // row gap charged where there is none, and the last one is pushed to a second page
    // with a page-high blank tail behind it (the 2026-09-12 tail-hint report).
    const BODY_PX = 1000;
    const GAP_PX = 12;

    test('measured heights that sum exactly to the budget fill one page', () => {
        // 4 rows, 3 gaps: 4h + 3*12 = 1000 -> h = 241
        const H = (BODY_PX - 3 * GAP_PX) / 4;
        const blocks = ['a', 'b', 'c', 'd'].map(id => narrow(COL_UNITS as WidthUnits, 2, { id }));
        const pages = packPages(blocks, {
            blockSpacingPx: GAP_PX,
            pageBudgetPx: () => BODY_PX,
            heightPxOf: () => H,
        });
        expect(flat(pages)).toEqual([[['a'], ['b'], ['c'], ['d']]]);
        expect(pages[0].used).toBeCloseTo(BODY_PX / 24, 6);
    });

    test('one px more than the budget moves the last block on', () => {
        const H = (BODY_PX - 3 * GAP_PX) / 4 + 0.25;   // 4 x 0.25 = 1px over
        const blocks = ['a', 'b', 'c', 'd'].map(id => narrow(COL_UNITS as WidthUnits, 2, { id }));
        const pages = packPages(blocks, {
            blockSpacingPx: GAP_PX,
            pageBudgetPx: () => BODY_PX,
            heightPxOf: () => H,
        });
        expect(flat(pages)).toEqual([[['a'], ['b'], ['c']], [['d']]]);
    });

    test('two blocks sharing a row cost the taller one, not their sum', () => {
        // The grid stretches the short cell to the row height, but the ROW still costs
        // what the tall block costs — measuring the stretched cell would charge the tall
        // height twice and end the page a block early.
        const a = narrow(HALF, 2, { id: 'a' });
        const b = narrow(HALF, 2, { id: 'b' });
        const c = narrow(COL_UNITS as WidthUnits, 2, { id: 'c' });
        const pages = packPages([a, b, c], {
            blockSpacingPx: GAP_PX,
            pageBudgetPx: () => BODY_PX,
            heightPxOf: (block) => (block.id === 'b' ? 788 : 200),   // row 788 + gap 12 + 200 = 1000
        });
        expect(flat(pages)).toEqual([[['a', 'b'], ['c']]]);
    });
});

describe('cellWidthPx', () => {
    test('a full-width cell is the whole printable width, whatever the gap', () => {
        for (const gap of [0, 12, 28]) expect(cellWidthPx(COL_UNITS, gap)).toBe(FULL_BLOCK_WIDTH_PX);
    });

    test('the units of a row plus its gaps add back up to the full width', () => {
        for (const gap of [12, 28]) {
            expect(cellWidthPx(2, gap) * 2 + gap).toBeCloseTo(FULL_BLOCK_WIDTH_PX, -1);
            expect(cellWidthPx(1, gap) * 4 + gap * 3).toBeCloseTo(FULL_BLOCK_WIDTH_PX, -1);
        }
    });

    test('a wider gap makes every cell narrower', () => {
        expect(cellWidthPx(2, 28)).toBeLessThan(cellWidthPx(2, 12));
    });
});
