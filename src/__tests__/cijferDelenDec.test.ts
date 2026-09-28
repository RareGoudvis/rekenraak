import { describe, test, expect, afterEach } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { divideToDecimals } from '../services/cijferen/cijferGenerator';
import type { CijferExercise } from '../services/math/types';

// cijferen-delen-dec against a schoolbook long-division reference on digit strings (BigInt):
// the key is the quotient cut off after `dp` decimals, and the rest satisfies
// dividend = q·divisor + r with 0 ≤ r < divisor·10^-dp.

function mulberry32(a: number) {
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// "12.3" at dp 2 → 1230n (string work only).
function toUnits(x: number, dp: number): bigint {
    const [int, frac = ''] = String(x).split('.');
    if (frac.length > dp) throw new Error(`${x} has more than ${dp} decimals`);
    return BigInt(int + frac.padEnd(dp, '0'));
}

// 12345n at dp 2 → "123.45".
function unitsToString(u: bigint, dp: number): string {
    if (dp === 0) return u.toString();
    const s = u.toString().padStart(dp + 1, '0');
    return `${s.slice(0, -dp)}.${s.slice(-dp)}`;
}

// Staartdeling digit by digit: quotient to `dp` decimals and the rest, both as strings.
function longDivision(dividend: number, divisor: number, dp: number): { q: string; r: string; rUnits: bigint; vUnits: bigint } {
    const a = toUnits(dividend, dp);
    const v = toUnits(divisor, dp);
    // Bring down `dp` extra zeros: the quotient then counts 10^-dp and the rest 10^-2dp.
    const digits = (a.toString() + '0'.repeat(dp)).split('').map(BigInt);
    let rest = 0n;
    let q = '';
    for (const digit of digits) {
        rest = rest * 10n + digit;
        const qd = rest / v;
        q += qd.toString();
        rest -= qd * v;
    }
    return { q: unitsToString(BigInt(q), dp), r: unitsToString(rest, 2 * dp), rUnits: rest, vUnits: v };
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

const LEAF = { operator: ':', numberType: 'decimal' };
const CASES: [string, Record<string, unknown>][] = [
    ['leaf defaults', {}],
    ['1 decimal', { decimalPlaces: 1 }],
    ['3 decimals', { decimalPlaces: 3 }],
    ['max 100', { maxRange: 100 }],
    ['max 100 000', { maxRange: 100000 }],
    ['max 1e6', { maxRange: 1000000 }],
    ['max 1e9, 3 decimals', { maxRange: 1000000000, decimalPlaces: 3 }],
    ['max 1e9, 1 decimal', { maxRange: 1000000000, decimalPlaces: 1 }],
    ['decimal dividend (E,t,h mask)', { operand0Mask: { T: true, E: true, t: true, h: true } }],
    ['decimal divisor (E,t mask)', { operand1Mask: { E: true, t: true } }],
];

describe('cijferen-delen-dec key = long division to dp decimals', () => {
    for (const [name, extra] of CASES) {
        test(name, () => {
            let checked = 0;
            for (let seed = 1; seed <= 40; seed++) {
                Math.random = mulberry32(seed);
                const block = makeBlock('cijferen-delen-dec', { constraints: { ...LEAF, ...extra } });
                for (const ex of generateFor(block) as CijferExercise[]) {
                    const dp = ex.decimalPlaces ?? 2;
                    const [dividend, divisor] = ex.operands;
                    const ref = longDivision(dividend, divisor, dp);
                    const tag = `${dividend} : ${divisor} (dp ${dp})`;
                    expect(ex.answer.toFixed(dp), `${tag} q`).toBe(ref.q);
                    expect(ex.answer, `${tag} q exact`).toBe(Number(ref.q));
                    expect(ex.remainder, `${tag} r`).toBe(Number(ref.r));
                    expect(ref.rUnits < ref.vUnits, `${tag} r < divisor·10^-dp`).toBe(true);
                    checked++;
                }
            }
            expect(checked).toBeGreaterThan(0);
        });
    }

    test('the reported case: 495 : 80 → q 6,18 r 0,6 (not 6,19 r 0,2)', () => {
        expect(divideToDecimals(495, 80, 2)).toEqual({ quotient: 6.18, remainder: 0.6 });
        expect(longDivision(495, 80, 2)).toMatchObject({ q: '6.18', r: '0.6000' });
        expect(divideToDecimals(709, 9, 2)).toEqual({ quotient: 78.77, remainder: 0.07 });
        expect(divideToDecimals(10, 4, 1)).toEqual({ quotient: 2.5, remainder: 0 });
    });
});
