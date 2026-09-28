import { describe, test, expect } from 'vitest';
import { roundTo, targetsFor } from '../services/afronden/afrondenGenerator';

// roundTo against a string/integer reference: the value is built from its digit string,
// the expected result is round-half-up on the integer count of the smallest place, and
// both sides are compared as fixed-decimal strings.

// Round half up of `units` (a whole count of 10^-dp) to a multiple of `stepUnits`.
function refRound(units: number, stepUnits: number): number {
    const q = Math.floor(units / stepUnits);
    const rest = units % stepUnits;
    return (rest * 2 >= stepUnits ? q + 1 : q) * stepUnits;
}

// 970 5 at dp 2 → "97.05"; string assembly, no float division.
function unitsToString(units: number, dp: number): string {
    if (dp === 0) return String(units);
    const s = String(units).padStart(dp + 1, '0');
    return `${s.slice(0, -dp)}.${s.slice(-dp)}`;
}

describe('afronden roundTo rounds half up in every place', () => {
    for (const dp of [2, 3]) {
        const scale = 10 ** dp;
        for (const t of targetsFor('decimal')) {
            const stepUnits = Math.round(t.weight * scale);
            if (stepUnits <= 1) continue;
            test(`every x,${'x'.repeat(dp)} value 0–1000 to ${t.key}`, () => {
                const bad: string[] = [];
                for (let units = 0; units <= 1000 * scale; units++) {
                    const value = Number(unitsToString(units, dp));
                    const want = unitsToString(refRound(units, stepUnits), dp);
                    const got = roundTo(value, t.weight).toFixed(dp);
                    if (got !== want && bad.length < 5) bad.push(`${unitsToString(units, dp)} → ${got}, want ${want}`);
                }
                expect(bad).toEqual([]);
            });
        }
    }

    test('every natural 0–100 000 to T / H / D / TD', () => {
        const bad: string[] = [];
        for (const t of targetsFor('natural')) {
            for (let n = 0; n <= 100_000; n++) {
                const want = String(refRound(n, t.weight));
                const got = String(roundTo(n, t.weight));
                if (got !== want && bad.length < 5) bad.push(`${n} → ${t.key} ${got}, want ${want}`);
            }
        }
        expect(bad).toEqual([]);
    });

    // rc's natural ceiling is 1e9 (afrondenNatural): sample it, plus the exact half-way value
    // and its neighbours for every target, since ROUND_SCALE × 1e9 = 1e15 sits near 2^53.
    test('naturals up to 1e9 to every natural target (sampled + half-way edges)', () => {
        let seed = 12345;
        const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
        const bad: string[] = [];
        for (const t of targetsFor('natural')) {
            const values: number[] = [];
            for (let i = 0; i < 20_000; i++) values.push((next() * 1_000) % 1_000_000_001);
            for (let k = 0; k * t.weight <= 1_000_000_000; k += Math.max(1, Math.floor(1_000_000_000 / t.weight / 500))) {
                const half = k * t.weight + t.weight / 2;
                values.push(half - 1, half, half + 1);
            }
            for (const n of values) {
                if (n < 0 || n > 1_000_000_000 || !Number.isInteger(n)) continue;
                const want = String(refRound(n, t.weight));
                const got = String(roundTo(n, t.weight));
                if (got !== want && bad.length < 5) bad.push(`${n} → ${t.key} ${got}, want ${want}`);
            }
        }
        expect(bad).toEqual([]);
    });

    test('the reported case: 97,05 to tienden is 97,1', () => {
        expect(roundTo(97.05, 0.1)).toBe(97.1);
        expect(roundTo(0.15, 0.1)).toBe(0.2);
        expect(roundTo(1.45, 0.1)).toBe(1.5);
        expect(roundTo(97.04, 0.1)).toBe(97);
    });
});
