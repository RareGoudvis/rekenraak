import { describe, test, expect } from 'vitest';
import type { Equation, CijferExercise, MathBlock } from '../services/math/types';
import {
    generateAdditionExercises, generateSubtractionExercises,
    generateMultiplicationExercises, generateDivisionExercises,
} from '../services/math/mathEngine';
import { generateMixedExercises } from '../services/math/mixedGenerator';
import { generateCijferExercises } from '../services/cijferen/cijferGenerator';
import { makeBlock } from './helpers/makeBlock';

// Arithmetic at the leerjaar-6 ceiling (1 000 000 000), judged against a reference written
// here from scratch: decimal strings and column-by-column carries, no engine helper reused.
// The generators are called directly, not through the registry, so hoofdrekenen's
// relaxation ladder cannot quietly drop the very bridge or mask under test.

const BIG = 1_000_000_000;
const RUNS = 6;

// Column index of each place key, counted from the units column.
const COL: Record<string, number> = { E: 0, T: 1, H: 2, D: 3, TD: 4, HD: 5, M: 6, TM: 7, HM: 8, Mrd: 9 };

// Digits of a non-negative integer (or a fixed-point decimal), units first.
const digitsOf = (n: number, dp = 0): number[] => {
    expect(Number.isFinite(n), `not finite: ${n}`).toBe(true);
    const s = dp > 0 ? n.toFixed(dp).replace('.', '') : String(n);
    expect(s, `not a plain integer string: ${s}`).toMatch(/^\d+$/);
    return s.split('').reverse().map(Number);
};
const at = (d: number[], i: number) => d[i] ?? 0;

// Columns whose carry-out is non-zero when every term is added in one column sum.
function carryColumns(terms: number[], dp = 0): Set<number> {
    const ds = terms.map(t => digitsOf(t, dp));
    const width = Math.max(...ds.map(d => d.length)) + 1;
    const out = new Set<number>();
    let carry = 0;
    for (let i = 0; i < width; i++) {
        carry = Math.floor((ds.reduce((s, d) => s + at(d, i), 0) + carry) / 10);
        if (carry > 0) out.add(i - dp);
    }
    return out;
}

// Columns that borrow in a − b (a ≥ b), column by column with the running borrow.
function borrowColumns(a: number, b: number, dp = 0): Set<number> {
    const da = digitsOf(a, dp), db = digitsOf(b, dp);
    const out = new Set<number>();
    let borrow = 0;
    for (let i = 0; i < da.length; i++) {
        borrow = at(da, i) - borrow - at(db, i) < 0 ? 1 : 0;
        if (borrow) out.add(i - dp);
    }
    return out;
}

// A chain a − b − c … borrows at a column when ANY of its steps does.
function chainBorrowColumns(ops: number[]): Set<number> {
    const out = new Set<number>();
    let running = ops[0];
    for (const b of ops.slice(1)) {
        borrowColumns(running, b).forEach(c => out.add(c));
        running -= b;
    }
    return out;
}

// Place keys whose digit is non-zero.
const nonZeroPlaces = (n: number): string[] => {
    const d = digitsOf(n);
    return Object.keys(COL).filter(k => at(d, COL[k]) !== 0);
};

const block = (typeId: string, constraints: Record<string, unknown>, count = 10): MathBlock =>
    makeBlock(typeId, { constraints: { numberType: 'natural', maxGetal: BIG, ...constraints }, block: { numberOfExercises: count } });

const nums = (eq: Equation): number[] => eq.operands.map(o => {
    expect(typeof o).toBe('number');
    return o as number;
});

function expectExactChain(eq: Equation, max: number) {
    const ops = nums(eq);
    for (const o of ops) {
        expect(Number.isInteger(o), `${o} is not whole`).toBe(true);
        expect(o).toBeGreaterThan(0);
    }
    const answer = eq.answer as number;
    expect(Number.isInteger(answer), `${ops.join(eq.operator)} = ${answer}`).toBe(true);
    const expected = ops.slice(1).reduce((acc, o) => {
        if (eq.operator === '+') return acc + o;
        if (eq.operator === '-') return acc - o;
        if (eq.operator === 'x') return acc * o;
        expect(acc % o, `${acc} : ${o} is not exact`).toBe(0);
        return acc / o;
    }, ops[0]);
    expect(answer, `${ops.join(` ${eq.operator} `)}`).toBe(expected);
    // The block's max caps the largest number the child reads: the sum, the minuend, the product, the dividend.
    const largest = eq.operator === '+' || eq.operator === 'x' ? answer : ops[0];
    expect(largest).toBeLessThanOrEqual(max);
}

describe('hoofdrekenen + / − at 1e9: bridges above the thousands', () => {
    // REQUIRED at HM would need a sum (or minuend) of exactly 1e9 — the top place of any max is
    // near-impossible by construction, as H is at 1000 — so HM REQUIRED is tested via a mask below.
    const cases: Array<['+' | '-', string, 'REQUIRED' | 'FORBIDDEN']> = [];
    for (const op of ['+', '-'] as const) {
        for (const place of ['M', 'TM']) cases.push([op, place, 'REQUIRED']);
        for (const place of ['M', 'TM', 'HM']) cases.push([op, place, 'FORBIDDEN']);
    }

    test.each(cases.flatMap(([op, place, rule]) => [2, 3, 4].map(n => [op, place, rule, n] as const)))(
        '%s %s %s with %i terms', (op, place, rule, termCount) => {
            const gen = op === '+' ? generateAdditionExercises : generateSubtractionExercises;
            for (let run = 0; run < RUNS; run++) {
                const eqs = gen(block(op === '+' ? 'hr-std-optellen' : 'hr-std-aftrekken', { termCount, bridges: { [place]: rule } }));
                expect(eqs.length).toBe(10);
                for (const eq of eqs) {
                    expectExactChain(eq, BIG);
                    expect(eq.operands.length).toBe(termCount);
                    const hits = op === '+' ? carryColumns(nums(eq)) : chainBorrowColumns(nums(eq));
                    expect(hits.has(COL[place]), `${nums(eq).join(` ${op} `)} ${rule} at ${place}`).toBe(rule === 'REQUIRED');
                }
            }
        });

    test('− HM REQUIRED holds when the minuend is 1 000 000 000', () => {
        const eqs = generateSubtractionExercises(block('hr-std-aftrekken', { operandMasks: [{ Mrd: true }], bridges: { HM: 'REQUIRED' } }));
        expect(eqs.length).toBe(10);
        for (const eq of eqs) {
            expect(nums(eq)[0]).toBe(BIG);
            expect(chainBorrowColumns(nums(eq)).has(COL.HM)).toBe(true);
        }
    });
});

describe('hoofdrekenen masks on Mrd / HM / TM', () => {
    test.each([
        ['+', [{ HM: true, E: true }, { TM: true }]],
        ['+', [{ TM: true, M: true, D: true }, { HM: true }, { TM: true, T: true }]],
        ['-', [{ Mrd: true }, { HM: true, TM: true }]],
        ['-', [{ HM: true, TM: true, M: true, E: true }, { TM: true }, { H: true }]],
    ] as const)('%s %j', (op, masks) => {
        const gen = op === '+' ? generateAdditionExercises : generateSubtractionExercises;
        const eqs = gen(block('hr-std-optellen', { termCount: masks.length, operandMasks: masks }));
        expect(eqs.length).toBe(10);
        for (const eq of eqs) {
            expectExactChain(eq, BIG);
            nums(eq).forEach((o, i) => {
                const want = Object.keys(masks[i]).sort();
                expect(nonZeroPlaces(o).sort(), `${o} vs mask ${want}`).toEqual(want);
            });
        }
    });
});

describe('compenseren', () => {
    // 'compenseren' = add/subtract a number just under a round one (29 = 30 − 1), then correct.
    test.each([
        [1_000_000_000, 100_000_000],
        [100_000_000, 10_000_000],
        [10_000_000, 1_000_000],
        [1_000_000, 100],
        [1000, 100],
        [100, 10],
    ])('max %i: the second term is k × %i minus 1 or 2', (maxGetal, unit) => {
        for (const gen of [generateAdditionExercises, generateSubtractionExercises]) {
            const eqs = gen(block('hr-std-optellen', { maxGetal, preset: 'compenseren', presetDistance: 2 }));
            expect(eqs.length).toBe(10);
            for (const eq of eqs) {
                expectExactChain(eq, maxGetal);
                const b = nums(eq)[1];
                const round = b + (unit - (b % unit));
                expect(round - b, `${b} is not just under a multiple of ${unit}`).toBeLessThanOrEqual(2);
                expect(round / unit).toBeGreaterThanOrEqual(2);
                // A round first term would make the strategy pointless.
                expect(nums(eq)[0] % unit).not.toBe(0);
            }
        }
    });

    test('gemengd at 1e9 draws compenseren and tienvoud at their own scale', () => {
        const b = block('hr-std-gemengd', { variants: ['+:compenseren', '-:compenseren', 'x:tienvoud', ':tienvoud'], mix: 'cycle' }, 12);
        const eqs = generateMixedExercises(b);
        expect(eqs.length).toBe(12);
        for (const eq of eqs) {
            expectExactChain(eq, eq.operator === ':' || eq.operator === 'x' ? Infinity : BIG);
            if (eq.operator === '+' || eq.operator === '-') {
                const s = nums(eq)[1];
                expect(1e8 - (s % 1e8), `${s}`).toBeLessThanOrEqual(2);
            } else {
                // The tienvoud preset keeps its own 10 000 ceiling: base × 10/100/1000, never 1e9 × 1000.
                const base = eq.operator === 'x' ? nums(eq)[0] : (eq.answer as number);
                expect(base).toBeLessThanOrEqual(10_000);
                expect([10, 100, 1000]).toContain(nums(eq)[1]);
            }
        }
    });
});

describe('× / : andere at 1e9', () => {
    const andere = (extra: Record<string, unknown> = {}) =>
        block('hr-std-vermenigvuldigen', { multiplicationMode: 'andere', ...extra });

    test('× answers are exact products within the max', () => {
        for (let run = 0; run < RUNS; run++) {
            const eqs = generateMultiplicationExercises(andere());
            expect(eqs.length).toBe(10);
            eqs.forEach(eq => expectExactChain(eq, BIG));
        }
    });

    test('× with masks on HM / TM', () => {
        const eqs = generateMultiplicationExercises(andere({ operand1Mask: { TM: true }, operand2Mask: { E: true } }));
        expect(eqs.length).toBe(10);
        for (const eq of eqs) {
            expectExactChain(eq, BIG);
            expect(nonZeroPlaces(nums(eq)[0])).toEqual(['TM']);
        }
    });

    test(': vrij is exact and its quotients are not a flood of 1 and 2', () => {
        const quotients: number[] = [];
        for (let run = 0; run < 20; run++) {
            const eqs = generateDivisionExercises(andere());
            expect(eqs.length).toBe(10);
            for (const eq of eqs) {
                expectExactChain(eq, BIG);
                quotients.push(eq.answer as number);
                // The divisor keeps to at most half the dividend's digits.
                expect(String(nums(eq)[1]).length * 2).toBeLessThanOrEqual(String(nums(eq)[0]).length);
            }
        }
        const small = quotients.filter(q => q <= 2).length / quotients.length;
        expect(small, `share of quotients ≤ 2: ${small}`).toBeLessThan(0.05);
    });

    test.each([
        [{ HM: true, E: true }, {}],
        [{ Mrd: true }, {}],
        [{ TM: true, M: true }, {}],
        [{}, { H: true }],
        [{}, { D: true, E: true }],
    ])(': with dividend mask %j and divisor mask %j fills the block exactly', (m1, m2) => {
        const eqs = generateDivisionExercises(andere({ operand1Mask: m1, operand2Mask: m2 }));
        expect(eqs.length).toBe(10);
        for (const eq of eqs) {
            expectExactChain(eq, BIG);
            const [a, b] = nums(eq);
            if (Object.keys(m1).length) expect(nonZeroPlaces(a).sort()).toEqual(Object.keys(m1).sort());
            if (Object.keys(m2).length) expect(nonZeroPlaces(b).sort()).toEqual(Object.keys(m2).sort());
        }
    });
});

describe('cijferen at 1e7 / 1e8 / 1e9', () => {
    const cijfer = (constraints: Record<string, unknown>, count = 8) => generateCijferExercises(
        makeBlock('cijferen-optellen-nat', { constraints: { numberType: 'natural', ...constraints }, block: { numberOfExercises: count } }));

    function expectExact(ex: CijferExercise, max: number, dp = 0) {
        const s = Math.pow(10, dp);
        const i = (n: number) => { expect(Number.isFinite(n)).toBe(true); return Math.round(n * s); };
        const ops = ex.operands.map(i);
        if (ex.operator === ':') {
            // Whole-number staartdeling: dividend = quotient × divisor + rest, rest < divisor.
            expect(ops[0]).toBe(i(ex.answer) * ex.operands[1] + i(ex.remainder));
            expect(ex.remainder).toBeLessThan(ex.operands[1]);
            expect(ex.operands[0]).toBeLessThanOrEqual(max);
            return;
        }
        if (ex.operator === 'x') {
            expect(Math.round(ex.operands[0] * ex.operands[1] * s)).toBe(i(ex.answer));
            expect(ex.answer).toBeLessThanOrEqual(max);
            return;
        }
        const expected = ex.operator === '+' ? ops.reduce((a, b) => a + b, 0) : ops[0] - ops[1];
        expect(i(ex.answer)).toBe(expected);
        expect(ex.operator === '+' ? ex.answer : ex.operands[0]).toBeLessThanOrEqual(max);
    }

    test.each([10_000_000, 100_000_000, 1_000_000_000])('all four operators at %i', (maxRange) => {
        for (const operator of ['+', '-', 'x', ':']) {
            for (const withRemainder of operator === ':' ? [false, true] : [false]) {
                for (const ex of cijfer({ operator, maxRange, withRemainder, numberOfTerms: 3 })) {
                    expectExact(ex, maxRange);
                    if (operator === 'x') expect(ex.operands[1]).toBeLessThanOrEqual(maxRange <= 10_000_000 ? 999 : 9999);
                    if (operator === ':') expect(ex.operands[1]).toBeLessThanOrEqual(maxRange <= 10_000_000 ? 999 : 9999);
                }
            }
        }
    });

    test.each([
        ['+', 'M', 'REQUIRED'], ['+', 'TM', 'REQUIRED'],
        ['+', 'M', 'FORBIDDEN'], ['+', 'TM', 'FORBIDDEN'], ['+', 'HM', 'FORBIDDEN'],
        ['-', 'M', 'REQUIRED'], ['-', 'TM', 'REQUIRED'],
        ['-', 'M', 'FORBIDDEN'], ['-', 'TM', 'FORBIDDEN'], ['-', 'HM', 'FORBIDDEN'],
    ] as const)('%s bridge at %s %s at 1e9', (operator, place, rule) => {
        for (let run = 0; run < RUNS; run++) {
            for (const numberOfTerms of operator === '+' ? [2, 3, 4] : [2]) {
                for (const ex of cijfer({ operator, maxRange: BIG, numberOfTerms, bridges: { [place]: rule } })) {
                    expectExact(ex, BIG);
                    const hits = operator === '+' ? carryColumns(ex.operands) : borrowColumns(ex.operands[0], ex.operands[1]);
                    expect(hits.has(COL[place]), `${ex.operands.join(` ${operator} `)} ${rule} at ${place}`).toBe(rule === 'REQUIRED');
                }
            }
        }
    });

    test.each([['+', 'REQUIRED'], ['+', 'FORBIDDEN'], ['-', 'REQUIRED'], ['-', 'FORBIDDEN']] as const)(
        'three decimals still check the HD bridge (%s %s)', (operator, rule) => {
            for (let run = 0; run < RUNS; run++) {
                const exs = cijfer({ operator, numberType: 'decimal', decimalPlaces: 3, maxRange: BIG, bridges: { HD: rule } });
                for (const ex of exs) {
                    expectExact(ex, BIG, 3);
                    const hits = operator === '+' ? carryColumns(ex.operands, 3) : borrowColumns(ex.operands[0], ex.operands[1], 3);
                    expect(hits.has(COL.HD), `${ex.operands.join(` ${operator} `)} ${rule} at HD`).toBe(rule === 'REQUIRED');
                }
            }
        });

    test('masks on TM / HM are honoured', () => {
        for (const ex of cijfer({ operator: '+', maxRange: BIG, operand0Mask: { HM: true, TM: true, E: true }, operand1Mask: { TM: true, H: true } })) {
            expectExact(ex, BIG);
            expect(nonZeroPlaces(ex.operands[0]).sort()).toEqual(['E', 'HM', 'TM']);
            expect(nonZeroPlaces(ex.operands[1]).sort()).toEqual(['H', 'TM']);
        }
    });
});
