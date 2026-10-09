import { describe, test, expect, afterEach } from 'vitest';
import type { Equation } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';

// Hoofdrekenen delen 'andere' at every max: a divisor drawn uniformly up to the max made most
// quotients 1, and a masked dividend over such a divisor was rarely exact, so the block relaxed.
// The quotient now carries the size (the > 1e6 approach) at every max.

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

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

function run(constraints: Record<string, unknown>): { items: Equation[]; note: string | null }[] {
    return SEEDS.map(seed => {
        Math.random = mulberry32(seed);
        const block = makeBlock('hr-std-delen', { constraints: { multiplicationMode: 'andere', ...constraints }, block: { numberOfExercises: 10 } });
        const res = REGISTRY['hr-std-delen'].generateNoted!(block);
        return { items: res.items as Equation[], note: res.note };
    });
}

// Exact in scaled integers: dividend = divisor × quotient, the quotient within the shown decimals.
function expectExact(eq: Equation, max: number, dp: number) {
    const [dividend, divisor] = eq.operands as number[];
    const quotient = eq.answer as number;
    const s = Math.pow(10, dp);
    expect(Number.isInteger(Math.round(quotient * s * 1e6) / 1e6), `${dividend} : ${divisor} = ${quotient}`).toBe(true);
    expect(Math.abs(divisor * quotient - dividend), `${dividend} : ${divisor} = ${quotient}`).toBeLessThan(1e-9 * Math.max(1, dividend));
    expect(dividend).toBeLessThanOrEqual(max);
    expect(quotient).toBeLessThanOrEqual(max);
    expect(divisor).toBeGreaterThan(0);
}

function check(constraints: Record<string, unknown>, max: number, dp: number, maxOnes: number) {
    const quotients: number[] = [];
    for (const { items, note } of run({ ...constraints, maxGetal: max })) {
        expect(note).toBeNull();
        expect(items).toHaveLength(10);
        for (const eq of items) {
            expectExact(eq, max, dp);
            quotients.push(eq.answer as number);
        }
    }
    const ones = quotients.filter(q => q === 1).length / quotients.length;
    expect(ones, `share of quotient 1: ${ones}`).toBeLessThanOrEqual(maxOnes);
}

describe("hr delen 'andere', natural", () => {
    test.each([100, 1_000, 1_000_000])('no mask at %i: exact, full, quotients not dominated by 1', (max) => {
        check({ numberType: 'natural' }, max, 0, 0.15);
    });

    test.each<[number, Record<string, boolean>]>([
        [100, { T: true, E: true }],
        [1_000, { H: true, T: true, E: true }],
        [1_000_000, { HD: true, D: true }],
    ])('dividend mask at %i %j: exact and full without relaxing', (max, mask) => {
        check({ numberType: 'natural', operand1Mask: mask }, max, 0, 0.15);
    });
});

describe("hr delen 'andere', decimal", () => {
    test.each([10, 100, 1_000])('no mask at %i: exact, full, quotients not dominated by 1', (max) => {
        check({ numberType: 'decimal', decimalPlaces: 2 }, max, 2, 0.15);
    });
});
