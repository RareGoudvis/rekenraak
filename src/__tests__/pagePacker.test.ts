import { describe, test, expect } from 'vitest';
import { packPages, pageIndexByBlock } from '../services/layout/pagePacker';
import { COL_UNITS, ROW_BUDGET, type WidthUnits } from '../config/blockLayout';
import { makeBlock } from './helpers/makeBlock';

// The packer is pure — blocks in, pages out, no DOM. These tests pin the placement rules
// rather than the numbers: they are written against COL_UNITS / ROW_BUDGET so they keep
// meaning when the grid changes width (6 → 4 columns is planned).

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

    test('every packed row fits the column grid', () => {
        const blocks = Array.from({ length: 9 }, (_, i) => narrow(i % 3 === 0 ? (COL_UNITS as WidthUnits) : HALF, 3, { id: `b${i}` }));
        for (const page of packPages(blocks)) {
            for (const row of page.rows) expect(row.width).toBeLessThanOrEqual(COL_UNITS);
        }
    });
});
