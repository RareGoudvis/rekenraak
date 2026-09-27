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

    test('the reported case: 97,05 to tienden is 97,1', () => {
        expect(roundTo(97.05, 0.1)).toBe(97.1);
        expect(roundTo(0.15, 0.1)).toBe(0.2);
        expect(roundTo(1.45, 0.1)).toBe(1.5);
        expect(roundTo(97.04, 0.1)).toBe(97);
    });
});
