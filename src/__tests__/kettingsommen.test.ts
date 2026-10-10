import { describe, test, expect, afterEach } from 'vitest';
import type { PatroonExercise } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';

// Kettingsommen: the pupil works the chain from the start number, so every value after it
// is blank unless the teacher shows the tussenresultaten; and the max picker reaches the
// chain (it used to start <= 20 with steps <= 10, so Tot 1 000 looked like Tot 100).

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; });

function run(constraints: Record<string, unknown> = {}, seeds = 20): PatroonExercise[] {
    const out: PatroonExercise[] = [];
    for (let seed = 1; seed <= seeds; seed++) {
        Math.random = mulberry32(seed);
        const block = makeBlock('kettingsommen', { leafId: 'patronen-kettingsommen', constraints });
        out.push(...(REGISTRY.kettingsommen.generate(block) as PatroonExercise[]));
    }
    return out;
}

describe('kettingsommen blanks', () => {
    test('default: the start is given, every later value is blank', () => {
        const items = run();
        expect(items.length).toBeGreaterThan(0);
        for (const ex of items) expect(ex.blankMask).toEqual(ex.values.map((_, i) => i > 0));
    });

    test('tussenresultaten tonen: only the end is blank', () => {
        for (const ex of run({ showIntermediates: true })) {
            expect(ex.blankMask).toEqual(ex.values.map((_, i) => i === ex.values.length - 1));
        }
    });

    test('tussenresultaten tonen + ook tussenstap blanco: the end and one middle value', () => {
        for (const ex of run({ showIntermediates: true, blankMiddle: true, chainLength: 4 })) {
            const blanks = ex.blankMask.map((b, i) => (b ? i : -1)).filter(i => i >= 0);
            expect(blanks).toHaveLength(2);
            expect(blanks.at(-1)).toBe(ex.values.length - 1);
            expect(blanks[0]).toBeGreaterThan(0);
        }
    });
});

describe('kettingsommen max', () => {
    test.each([100, 1_000, 10_000])('Tot %i: every value within the max', (max) => {
        for (const ex of run({ maxGetal: max })) for (const v of ex.values) expect(v).toBeLessThanOrEqual(max);
    });

    test('Tot 1 000 reaches past what Tot 100 can show', () => {
        const values = run({ maxGetal: 1_000 }).flatMap(ex => ex.values);
        expect(Math.max(...values)).toBeGreaterThan(100);
        expect(values.filter(v => v > 100).length / values.length).toBeGreaterThan(0.5);
    });
});
