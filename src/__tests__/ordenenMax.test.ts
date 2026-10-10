import { describe, test, expect, afterEach } from 'vitest';
import type { OrdenenExercise, Fraction } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { ordenenMaxChars } from '../services/layout/blockLayout';
import { formatMathNumber } from '../services/math/formatters';

// Call 1 (2026-10-09): ordenen draws under the max, so "1 000,00" (1 in ~100 000 draws) can no
// longer push the decimal default to one per row; the width estimate follows the same bound.

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

const num = (v: number | Fraction) => (typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d);

function values(c: Record<string, unknown>): number[] {
    const out: number[] = [];
    for (let seed = 1; seed <= 30; seed++) {
        Math.random = mulberry32(seed);
        const block = makeBlock('ordenen', { constraints: c, block: { numberOfExercises: 10 } });
        for (const ex of REGISTRY.ordenen.generate(block) as OrdenenExercise[]) out.push(...ex.values.map(num));
    }
    return out;
}

describe('ordenen draws under the max', () => {
    test.each<Record<string, unknown>>([
        { numberType: 'natural', maxGetal: 10, count: 5 },
        { numberType: 'decimal', maxGetal: 1, decimalPlaces: 1, count: 5 },
        { numberType: 'decimal', maxGetal: 1000, decimalPlaces: 2, count: 3 },
        { numberType: 'geheel', maxGetal: 10, count: 5 },
    ])('%j: every value < max (and > -max for gehele getallen)', (c) => {
        const max = c.maxGetal as number;
        const vs = values(c);
        expect(vs.length).toBeGreaterThan(0);
        for (const v of vs) {
            expect(v).toBeLessThan(max);
            if (c.numberType === 'geheel') expect(v).toBeGreaterThan(-max);
        }
        // Small ranges still reach their top step.
        if (max <= 10) expect(Math.max(...vs)).toBeCloseTo(max - (c.numberType === 'decimal' ? 0.1 : 1), 9);
    });

    test('a teacher-set lower bound stays inclusive', () => {
        const vs = values({ numberType: 'geheel', maxGetal: 10, minGetal: -12, count: 5 });
        expect(Math.min(...vs)).toBe(-12);
    });

    test.each<Record<string, unknown>>([
        { numberType: 'natural', maxGetal: 100000, count: 3 },
        { numberType: 'decimal', maxGetal: 1000, decimalPlaces: 2, count: 3 },
        { numberType: 'decimal', maxGetal: 100, decimalPlaces: 3, count: 3 },
        { numberType: 'geheel', maxGetal: 1000, count: 3 },
        { numberType: 'geheel', maxGetal: 1000, minGetal: -5000, count: 3 },
    ])('%j: no printed value is wider than ordenenMaxChars', (c) => {
        const dp = (c.decimalPlaces as number | undefined) ?? 0;
        const chars = ordenenMaxChars('ordenen', c);
        for (const v of values(c)) expect(formatMathNumber(c.numberType === 'decimal' ? v.toFixed(dp) : v).length, `${v}`).toBeLessThanOrEqual(chars);
    });
});
