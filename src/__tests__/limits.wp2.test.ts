import { describe, test, expect, afterEach } from 'vitest';
import type { GetallenasExercise, Fraction } from '../services/math/types';
import { generateGetallenasExercisesNoted } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercisesNoted } from '../services/getallenrij/getallenrijGenerator';
import { makeBlock } from './helpers/makeBlock';

// Limit-audit WP2: every value a row/pattern generator prints stays within the block's
// bounds, also on the settings that used to overrun them. Seeded so a failure reproduces.

const SEEDS = [11, 22, 33, 44, 55];

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });
const seeded = (seed: number) => { Math.random = mulberry32(seed); };

const num = (v: number | Fraction) => (typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d);

type Noted = (b: ReturnType<typeof makeBlock>) => { items: GetallenasExercise[]; note: string | null };
const LINES: [string, Noted][] = [['getallenas', generateGetallenasExercisesNoted], ['getallenrijen', generateGetallenrijExercisesNoted]];

describe('[L1] getallenas / getallenrijen stay within [lo, max]', () => {
    const cases: Record<string, unknown>[] = [
        { numberType: 'natural', maxGetal: 20, step: 5, ticks: 6, direction: 'right' },
        { numberType: 'natural', maxGetal: 20, step: 5, ticks: 6, direction: 'left' },
        { numberType: 'natural', maxGetal: 20, step: 50, ticks: 6, direction: 'beide' },
        { numberType: 'natural', maxGetal: 100, step: 100, ticks: 10, direction: 'beide' },
        { numberType: 'decimal', maxGetal: 20, step: 5, ticks: 10, direction: 'left' },
        { numberType: 'geheel', maxGetal: 20, minGetal: 0, step: 25, ticks: 8, direction: 'beide' },
        { numberType: 'geheel', maxGetal: 20, minGetal: -10, step: 10, ticks: 6, direction: 'right' },
    ];
    for (const [typeId, gen] of LINES) for (const c of cases) {
        test(`${typeId} ${JSON.stringify(c)}`, () => {
            const lo = c.numberType === 'geheel' ? (c.minGetal as number) : 0;
            for (const seed of SEEDS) {
                seeded(seed);
                const { items, note } = gen(makeBlock(typeId, { constraints: c, block: { numberOfExercises: 20 } }));
                expect(items).toHaveLength(20);
                expect(note).toMatch(/past niet/);
                for (const ex of items) {
                    expect(ex.values).toHaveLength(ex.tickCount);
                    expect(ex.tickCount).toBeGreaterThanOrEqual(4);
                    for (const v of ex.values ?? []) {
                        expect(num(v)).toBeGreaterThanOrEqual(lo);
                        expect(num(v)).toBeLessThanOrEqual(c.maxGetal as number);
                    }
                }
            }
        });
    }

    test('keeps the step and drops a tick when that is enough (Leerjaar 1 default)', () => {
        seeded(11);
        const { items, note } = generateGetallenasExercisesNoted(makeBlock('getallenas', { constraints: { maxGetal: 20, step: 5, ticks: 6 } }));
        expect(items.every(ex => ex.step === 5 && ex.tickCount === 5)).toBe(true);
        expect(note).toBe('Sprong +5 met 6 streepjes past niet tot 20: 5 streepjes gebruikt.');
    });

    test('shrinks the step when even four ticks overrun', () => {
        seeded(11);
        const { items, note } = generateGetallenrijExercisesNoted(makeBlock('getallenrijen', { constraints: { maxGetal: 20, step: 50, ticks: 6 } }));
        expect(items.every(ex => ex.step === 2 && ex.tickCount === 6)).toBe(true);
        expect(note).toBe('Sprong +50 past niet tot 20: sprong +2 gebruikt.');
    });

    test('a line that fits gets no note', () => {
        seeded(11);
        expect(generateGetallenasExercisesNoted(makeBlock('getallenas', { constraints: { maxGetal: 100, step: 5, ticks: 6 } })).note).toBeNull();
    });
});
