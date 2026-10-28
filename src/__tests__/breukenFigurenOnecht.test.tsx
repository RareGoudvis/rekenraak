// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { EXERCISE_UI } from '../config/exerciseUI';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { kioskFor } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import type { FractionExercise, MathBlock } from '../services/math/types';

// "Ook onechte breuken" on breuken kleuren / herkennen: the teller may pass the noemer, drawn over two wholes.
const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; cleanup(); });
const seeded = <T,>(seed: number, fn: () => T): T => {
    Math.random = mulberry32(seed);
    try { return fn(); } finally { Math.random = realRandom; }
};
const SEEDS = [1, 7, 42, 1234, 99999];
const SUBTYPES = ['kleuren', 'herkennen'] as const;
const noId = (list: FractionExercise[]) => list.map(e => ({ ...e, id: '' }));

const draw = (constraints: Record<string, unknown>, seed: number): FractionExercise[] =>
    seeded(seed, () => generateFor(makeBlock('breuken', { constraints, block: { numberOfExercises: 40 } })) as FractionExercise[]);
const withFlag = (subType: string, on: boolean | undefined) => ({
    subType, shapes: ['rectangle', 'square', 'circle'], minDenominator: 2, maxDenominator: 10,
    ...(on === undefined ? {} : { allowImproper: on }),
});

describe.each(SUBTYPES)('%s generator', (subType) => {
    test('off draws exactly what an absent flag draws, all proper on one whole', () => {
        for (const s of SEEDS) {
            const off = draw(withFlag(subType, false), s);
            expect(noId(off)).toEqual(noId(draw(withFlag(subType, undefined), s)));
            for (const e of off) {
                expect(e.numerator).toBeGreaterThanOrEqual(1);
                expect(e.numerator).toBeLessThan(e.denominator);
                expect(e.wholes).toBeUndefined();
            }
        }
    });

    test('on mixes proper and improper, never d/d, indices valid and unique within the wholes', () => {
        for (const s of SEEDS) {
            const on = draw(withFlag(subType, true), s);
            const share = on.filter(e => e.numerator > e.denominator).length / on.length;
            expect(share).toBeGreaterThan(0.15);
            expect(share).toBeLessThan(0.85);
            for (const e of on) {
                const d = e.denominator, k = e.wholes ?? 1;
                expect(e.numerator).not.toBe(d);
                expect(e.numerator).toBeLessThan(2 * d);
                expect(k).toBe(Math.ceil(e.numerator / d));
                const idx = e.coloredIndices!;
                expect(idx).toHaveLength(e.numerator);
                expect(new Set(idx).size).toBe(idx.length);
                expect(idx.every(i => i >= 0 && i < k * d)).toBe(true);
                // The first whole of an improper breuk is coloured in full.
                if (k === 2) for (let i = 0; i < d; i++) expect(idx).toContain(i);
            }
        }
    });
});

test('the flag stays off hoeveelheid / lijnstuk / veelhoek', () => {
    for (const subType of ['hoeveelheid', 'lijnstuk', 'veelhoek']) {
        for (const s of SEEDS) {
            expect(noId(draw({ subType, allowImproper: true }, s))).toEqual(noId(draw({ subType }, s)));
        }
    }
});

type Shape = 'rectangle' | 'square' | 'circle';
const sevenFourths = (subType: 'kleuren' | 'herkennen', shape: Shape = 'rectangle'): MathBlock => {
    const block = makeBlock('breuken', { constraints: { subType, shapes: [shape], shape, allowImproper: true } });
    const grid = shape === 'rectangle' ? { gridRows: 2, gridCols: 2 } : { gridRows: 1, gridCols: 4 };
    block.fractionExercises = [{ id: 'x', subType, numerator: 7, denominator: 4, shape, coloredIndices: [0, 1, 2, 3, 4, 5, 7], ...grid, wholes: 2, isManuallyEdited: false }];
    return block;
};
const isFilled = (el: Element) => (el.getAttribute('fill') ?? 'white') !== 'white';
const sheet = (block: MathBlock, showSolutions = false) => {
    const { Viewer } = EXERCISE_UI.breuken;
    return render(<BlockWidthProvider value={700}><Viewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>).container;
};

describe('viewer: 7/4 is two figures with seven coloured parts', () => {
    test.each(['rectangle', 'square', 'circle'] as const)('herkennen %s', (shape) => {
        const container = sheet(sevenFourths('herkennen', shape));
        const svgs = [...container.querySelectorAll('svg[viewBox]')];
        expect(svgs).toHaveLength(2);
        const partsOf = (svg: Element) => [...svg.querySelectorAll('rect, path, circle')];
        expect(svgs.map(s => partsOf(s).length)).toEqual([4, 4]);
        expect(svgs.map(s => partsOf(s).filter(isFilled).length)).toEqual([4, 3]);
        expect(container.textContent).toMatch(/elke figuur/);
    });

    test('kleuren: blank figures on the sheet, seven parts coloured in the key', () => {
        const coloured = (showSolutions: boolean) => {
            const n = [...sheet(sevenFourths('kleuren'), showSolutions).querySelectorAll('svg[viewBox] rect')].filter(isFilled).length;
            cleanup();
            return n;
        };
        expect(coloured(false)).toBe(0);
        expect(coloured(true)).toBe(7);
    });

    test('each whole is drawn at the size of a proper 3/4', () => {
        const viewBoxOf = (block: MathBlock) => {
            const out = sheet(block).querySelector('svg[viewBox]')!.getAttribute('viewBox');
            cleanup();
            return out;
        };
        const proper = sevenFourths('herkennen');
        proper.fractionExercises = [{ ...proper.fractionExercises![0], numerator: 3, coloredIndices: [0, 1, 2], wholes: undefined }];
        expect(viewBoxOf(sevenFourths('herkennen'))).toBe(viewBoxOf(proper));
    });
});

describe('kiosk', () => {
    const d = kioskFor('breuken')!;
    test('herkennen answers the drawn 7/4; 14/8 only with the row by value', () => {
        const block = sevenFourths('herkennen');
        const ex = block.fractionExercises![0];
        expect(d.answerOf(ex, block.constraints)).toEqual(['7/4']);
        expect(checkAnswer(d, ex, block.constraints, ['4', '7'])).toBe(true);
        expect(checkAnswer(d, ex, block.constraints, ['8', '14'])).toBe(false);
        expect(checkAnswer(d, ex, block.constraints, ['8', '14'], false)).toBe(true);
    });
    test('kleuren keys span both wholes, the answer is the count', () => {
        const block = sevenFourths('kleuren');
        const ex = block.fractionExercises![0];
        expect(d.interact!.keys!(ex, block.constraints)).toHaveLength(8);
        expect(checkAnswer(d, ex, block.constraints, '7')).toBe(true);
        expect(checkAnswer(d, ex, block.constraints, '4')).toBe(false);
    });
});
