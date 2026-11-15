// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { packPages, type PackOptions, type QrPart, type RowCut } from '../services/layout/pagePacker';
import type { Equation, MathBlock } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { mergeTutorMarks, tutorQrSegment } from '../components/sheet/tutorQrSplit';
import { decodeTutor, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';

// The stappenhulp split line: a page whose sums overflow one QR gets a second code on a line.
// The packer decides where (pure, with a fake "fits" that counts sums), the segment helper
// turns each side into a normal tutor payload that keeps the printed labels.

const BUDGET = 1000;
const GAP = 12;
const LINE = 87;
const CAP = 50;

const eq = (a: number, b: number): Equation => ({ id: `${a}+${b}`, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false });
const sums = (n: number, seed = 0) => Array.from({ length: n }, (_, i) => eq(100 + seed + i, 237 + i));
const hr = (id: string, n: number, extra: Partial<MathBlock> = {}): MathBlock =>
    ({ ...makeBlock('hr-std-optellen', { id, block: { widthUnits: 4 } }), exercises: sums(n, id.charCodeAt(0)), instructionText: 'Reken uit.', ...extra });

const countOf = (p: QrPart) => (p.to ?? p.block.exercises.length) - (p.from ?? 0);
const fitsCap = (parts: QrPart[]) => parts.reduce((n, p) => n + countOf(p), 0) <= CAP;

// Rows of 4 sums, 30px each: a row starts at title 40 + 30 r.
const cutsOf = (b: MathBlock): RowCut[] =>
    Array.from({ length: Math.ceil(b.exercises.length / 4) - 1 }, (_, r) => ({ px: 40 + 30 * (r + 1), count: 4 * (r + 1) }));

function pack(blocks: MathBlock[], heights: Record<string, number>, opts: Partial<PackOptions> = {}, rows = true) {
    return packPages(blocks, {
        blockSpacingPx: GAP,
        pageBudgetPx: () => BUDGET,
        heightPxOf: b => heights[b.id],
        minWidthOf: () => 4,
        qrSplit: { dividerPx: LINE, fits: fitsCap, rowCutsOf: rows ? b => cutsOf(b) : undefined },
        ...opts,
    });
}
const ids = (parts: QrPart[]) => parts.map(p => `${p.block.id}${p.from ? `[${p.from}:` : ''}${p.to ? `[:${p.to}` : ''}`);

describe('QR split line: the packer', () => {
    test('a page that fits one QR gets no line, and the pages equal a pack without the option', () => {
        const blocks = [hr('a', 20), hr('b', 20)];
        const heights = { a: 300, b: 300 };
        const withQr = pack(blocks, heights);
        const without = pack(blocks, heights, { qrSplit: undefined });
        expect(withQr[0].qrSplit).toBeUndefined();
        expect(withQr).toEqual(without);
    });

    test('the line goes in front of the first block that overflows the QR, and is costed', () => {
        const blocks = [hr('a', 30), hr('b', 25), hr('c', 8)];
        const pages = pack(blocks, { a: 400, b: 200, c: 100 });
        const split = pages[0].qrSplit!;
        expect(ids(split.above)).toEqual(['a']);
        expect(ids(split.below)).toEqual(['b', 'c']);
        expect(split.y).toBe(400 + GAP);
        expect(split.h).toBe(LINE);
        const b = pages[0].blocks.find(x => x.block.id === 'b')!;
        expect(b.y).toBe(400 + GAP + LINE + GAP);
    });

    test('the latest block boundary wins: the line sits low on the page', () => {
        const blocks = [hr('a', 20), hr('b', 20), hr('c', 20)];
        const split = pack(blocks, { a: 250, b: 250, c: 250 })[0].qrSplit!;
        expect(ids(split.above)).toEqual(['a', 'b']);
        expect(split.y).toBe(250 + GAP + 250 + GAP);
    });

    test('the line pushes a block that no longer fits to the next page', () => {
        const blocks = [hr('a', 30), hr('b', 25), hr('c', 8)];
        const pages = pack(blocks, { a: 400, b: 300, c: 180 });
        expect(pages[0].blocks.map(x => x.block.id)).toEqual(['a', 'b']);
        expect(pages[1].blocks.map(x => x.block.id)).toEqual(['c']);
        expect(pages[0].qrSplit!.y).toBe(412);
    });

    test('no room for the line: the page ends in front of the overflowing block instead', () => {
        const blocks = [hr('a', 40), hr('b', 20)];
        const pages = pack(blocks, { a: 700, b: 200 });
        expect(pages[0].qrSplit).toBeUndefined();
        expect(pages[0].blocks.map(x => x.block.id)).toEqual(['a']);
        expect(pages[1].blocks.map(x => x.block.id)).toEqual(['b']);
    });

    test('one block too big for one QR: the line goes between two of its rows, at the latest row that fits', () => {
        const blocks = [hr('a', 72)];
        const page = pack(blocks, { a: 40 + 18 * 30 + 16 })[0];
        const split = page.qrSplit!;
        expect(ids(split.above)).toEqual(['a[:48']);
        expect(ids(split.below)).toEqual(['a[48:']);
        const a = page.blocks[0];
        expect(a.h).toBe(40 + 12 * 30);
        expect(a.rest).toEqual({ y: a.h + GAP + LINE + GAP, h: 40 + 18 * 30 + 16 - a.h, top: a.h });
        expect(split.y).toBe(a.h + GAP);
    });

    test('a block boundary is preferred; a row cut only when the sums under the line still overflow', () => {
        const blocks = [hr('a', 30), hr('b', 30), hr('c', 30)];
        const page = pack(blocks, { a: 280, b: 280, c: 280 })[0];
        // Boundary in front of b leaves 60 sums below: b is cut at its latest row with 30 + n ≤ 50.
        expect(ids(page.qrSplit!.above)).toEqual(['a', 'b[:20']);
        expect(ids(page.qrSplit!.below)).toEqual(['b[20:', 'c']);
        // Without measured rows the boundary stays (the footer falls back to its lean code).
        const noRows = pack(blocks, { a: 280, b: 280, c: 280 }, {}, false)[0];
        expect(ids(noRows.qrSplit!.above)).toEqual(['a']);
    });

    test('a block that fills its page cannot take the line: nothing changes', () => {
        const blocks = [hr('a', 72)];
        const page = pack(blocks, { a: 960 })[0];
        expect(page.qrSplit).toBeUndefined();
        expect(page.blocks[0].rest).toBeUndefined();
    });

    test('rows mode places the line as its own row', () => {
        const blocks = [hr('a', 30), hr('b', 25)];
        const page = pack(blocks, { a: 400, b: 200 }, { mode: 'rijen' })[0];
        expect(page.qrSplit!.y).toBe(412);
        expect(page.blocks[1].y).toBe(412 + LINE + GAP);
    });

    test('a half-width block is never cut between rows (the line is full width)', () => {
        const blocks = [hr('a', 72, { widthUnits: 2 })];
        const page = pack(blocks, { a: 600 }, { minWidthOf: () => 2 })[0];
        expect(page.qrSplit).toBeUndefined();
    });

    test('pages are a pure function of the measurements: packing twice gives the same split', () => {
        const blocks = [hr('a', 30), hr('b', 30), hr('c', 30)];
        const h = { a: 280, b: 280, c: 280 };
        expect(pack(blocks, h)).toEqual(pack(blocks, h));
    });
});

describe('QR split line: the two codes', () => {
    test('each side is a normal payload; the lower one keeps the printed labels of a cut block', () => {
        const a = hr('a', 8);
        const above = tutorQrSegment([{ block: a, to: 5 }], { a: 1 }, null);
        const below = tutorQrSegment([{ block: a, from: 5 }], { a: 1 }, null);
        const up = decodeTutor(TUTOR_HASH_PREFIX + above.payload!).groups[0];
        const down = decodeTutor(TUTOR_HASH_PREFIX + below.payload!).groups[0];
        expect(up.n).toBe(1);
        expect(up.items).toHaveLength(5);
        // Index 5 is the printed label f): the first five are placeholders.
        expect(down.items.slice(0, 5)).toEqual([null, null, null, null, null]);
        expect(down.items[5]).toMatchObject({ kind: 'sum', eq: { operands: a.exercises[5].operands } });
        expect(down.items).toHaveLength(8);
    });

    test('the marks of a cut block come from both codes', () => {
        const a = hr('a', 8);
        const above = tutorQrSegment([{ block: a, to: 5 }], { a: 1 }, null);
        const below = tutorQrSegment([{ block: a, from: 5 }], { a: 1 }, null);
        expect(mergeTutorMarks([a], [above]).get('a')).toBe('11111000');
        expect(mergeTutorMarks([a], [above, below]).get('a')).toBe('all');
    });
});
