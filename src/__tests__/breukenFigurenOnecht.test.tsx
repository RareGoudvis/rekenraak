// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { EXERCISE_UI } from '../config/exerciseUI';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { kioskFor } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { answerText, expectedText } from '../services/oefenen/stats';
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

describe('herkennen key: an onechte breuk also as gemengd getal', () => {
    const withFormat = (answerFormat: string, numerator = 7) => {
        const block = sevenFourths('herkennen');
        block.constraints = { ...block.constraints, answerFormat };
        block.fractionExercises = [{ ...block.fractionExercises![0], numerator, coloredIndices: Array.from({ length: numerator }, (_, i) => i) }];
        return block;
    };
    // VerticalFraction reads as whole + teller + noemer in textContent: "1 3/4" → "134".
    test.each(['phrase', 'blank-fraction', 'blank-line'])('%s: 7/4 and 1 3/4 in the key, neither without it', (fmt) => {
        const on = sheet(withFormat(fmt), true).textContent!.replace(/\s+/g, '');
        expect(on).toMatch(/7\/?4\(?=134/);
        cleanup();
        const off = sheet(withFormat(fmt), false).textContent!.replace(/\s+/g, '');
        expect(off).not.toMatch(/134/);
    });
    test('a proper breuk keeps its key as it was', () => {
        for (const fmt of ['phrase', 'blank-fraction', 'blank-line']) {
            const block = withFormat(fmt, 3);
            block.fractionExercises = [{ ...block.fractionExercises![0], wholes: undefined }];
            expect(sheet(block, true).textContent).not.toMatch(/=/);
            cleanup();
        }
    });
    test('the breukvragen ask counts: unchanged', () => {
        expect(sheet(withFormat('fraction-questions'), true).textContent).not.toMatch(/=/);
    });
});

describe('vereenvoudigen key', () => {
    const keyOf = (input: { n: number; d: number }, answer: { n: number; d: number }, showSolutions = true) => {
        const block = makeBlock('breuken-bewerken', { constraints: { subType: 'vereenvoudigen', allowImproper: true } });
        block.breukBewerkExercises = [{ id: 'v', subType: 'vereenvoudigen', inputs: [input], answers: [answer], isManuallyEdited: false }];
        const { Viewer } = EXERCISE_UI['breuken-bewerken'];
        const text = render(<BlockWidthProvider value={700}><Viewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>).container.textContent!.replace(/\s+/g, '');
        cleanup();
        return text;
    };
    test('an onechte answer: 5/2 = 2 1/2', () => {
        expect(keyOf({ n: 10, d: 4 }, { n: 5, d: 2 })).toBe('104=52=212');
        expect(keyOf({ n: 10, d: 4 }, { n: 5, d: 2 }, false)).toBe('104=');
    });
    test('a whole answer is the integer, not 2/1', () => {
        expect(keyOf({ n: 6, d: 3 }, { n: 2, d: 1 })).toBe('63=2');
    });
    test('a proper answer is unchanged', () => {
        expect(keyOf({ n: 6, d: 8 }, { n: 3, d: 4 })).toBe('68=34');
    });
});

describe('kiosk', () => {
    const d = kioskFor('breuken')!;
    test('herkennen answers the drawn 7/4; 14/8 only with the row by value', () => {
        const block = sevenFourths('herkennen');
        const ex = block.fractionExercises![0];
        expect(d.answerOf(ex, block.constraints)).toEqual(['7/4', '1 3/4']);
        expect(checkAnswer(d, ex, block.constraints, ['4', '7'])).toBe(true);
        expect(checkAnswer(d, ex, block.constraints, ['8', '14'])).toBe(false);
        expect(checkAnswer(d, ex, block.constraints, ['8', '14'], false)).toBe(true);
    });
    test('herkennen with the flag: a geheel field first; 7/4 and 1 3/4 are right, a wrong gemengd getal is wrong', () => {
        const block = sevenFourths('herkennen');
        const ex = block.fractionExercises![0];
        const c = block.constraints as Record<string, unknown>;
        expect(d.labels!(ex, c)).toEqual(['geheel', 'noemer', 'teller']);
        expect(d.labels!(ex, { ...c, allowImproper: false })).toEqual(['noemer', 'teller']);
        const ok = (given: string[], exact?: boolean) => checkAnswer(d, ex, c, given, exact);
        expect(ok(['', '4', '7'])).toBe(true);
        expect(ok(['1', '4', '3'])).toBe(true);
        expect(ok([' 01 ', '4', '3'])).toBe(true);
        expect(ok(['2', '4', '3'])).toBe(false);
        expect(ok(['1', '4', '7'])).toBe(false);
        // The exact form keeps the drawn noemer for the breuk part; by value any equal form counts.
        expect(ok(['1', '8', '6'])).toBe(false);
        expect(ok(['1', '8', '6'], false)).toBe(true);
        expect(ok(['', '8', '14'], false)).toBe(true);
        expect(ok(['1', '8', '7'], false)).toBe(false);
        expect(ok(['1', '', '3'])).toBe(false);
        expect(ok(['x', '4', '3'])).toBe(false);
    });
    test("stats show the pupil's own form", () => {
        const block = sevenFourths('herkennen');
        const ex = block.fractionExercises![0];
        const c = block.constraints as Record<string, unknown>;
        expect(answerText(d, ex, c, ['1', '4', '3'])).toBe('1 3/4');
        expect(answerText(d, ex, c, ['', '4', '7'])).toBe('7/4');
        expect(answerText(d, ex, c, ['4', '7'])).toBe('7/4');
        expect(expectedText(d, ex, c)).toBe('7/4');
    });
    test('kleuren keys span both wholes, the answer is the count', () => {
        const block = sevenFourths('kleuren');
        const ex = block.fractionExercises![0];
        expect(d.interact!.keys!(ex, block.constraints)).toHaveLength(8);
        expect(checkAnswer(d, ex, block.constraints, '7')).toBe(true);
        expect(checkAnswer(d, ex, block.constraints, '4')).toBe(false);
    });
});
