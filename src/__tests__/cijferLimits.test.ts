import { describe, test, expect } from 'vitest';
import { makeBlock } from './helpers/makeBlock';
import { generateCijferExercisesNoted } from '../services/cijferen/cijferGenerator';

// Owner rule: operands AND answer stay ≤ the max; answers are exact in the exercise's decimals.
const SEEDS = 20;
// operator + numberType come from the leaf id (cijferen-<op>-<nat|dec>)
const OPS: Record<string, string> = { optellen: '+', aftrekken: '-', vermenigvuldigen: 'x', delen: ':' };
const run = (typeId: string, constraints: Record<string, unknown>, count = 8) => {
    const [, op, nt] = typeId.split('-');
    const full = { ...constraints, operator: OPS[op], numberType: nt === 'dec' ? 'decimal' : 'natural' };
    return Array.from({ length: SEEDS }, () =>
        generateCijferExercisesNoted(makeBlock(typeId, { constraints: full, block: { numberOfExercises: count } })));
};

describe('cijferen limits', () => {
    test('L3: an unsatisfiable mask falls back inside the max and says so', () => {
        for (const r of run('cijferen-vermenigvuldigen-nat', { maxRange: 100, operand0Mask: { H: true } })) {
            expect(r.note).toBeTruthy();
            for (const ex of r.items) {
                expect(Math.max(...ex.operands, ex.answer)).toBeLessThanOrEqual(100);
                expect(ex.answer).toBe(ex.operands[0] * ex.operands[1]);
            }
        }
    });

    test('L3: other operators stay inside the max in the fallback', () => {
        const cases: [string, Record<string, unknown>][] = [
            ['cijferen-optellen-nat', { maxRange: 10, operand0Mask: { H: true } }],
            ['cijferen-aftrekken-nat', { maxRange: 10, operand0Mask: { H: true } }],
            ['cijferen-delen-nat', { maxRange: 10, operand0Mask: { H: true } }],
            ['cijferen-vermenigvuldigen-dec', { maxRange: 20, operand0Mask: { H: true } }],
        ];
        for (const [id, c] of cases) for (const r of run(id, c)) {
            expect(r.note).toBeTruthy();
            for (const ex of r.items) expect(Math.max(...ex.operands, ex.answer)).toBeLessThanOrEqual(c.maxRange as number);
        }
    });

    test('note grammar: singular and plural forms', () => {
        const mk = (n: number) => generateCijferExercisesNoted(makeBlock('cijferen-optellen-nat', {
            constraints: { operator: '+', numberType: 'natural', maxRange: 10, operand0Mask: { H: true } }, block: { numberOfExercises: n } }));
        expect(mk(1).note).toMatch(/^1 oefening past niet .* daarvoor staat er een eenvoudige oefening/);
        expect(mk(3).note).toMatch(/^Alle oefeningen passen niet .* daarvoor staan er eenvoudige oefeningen/);
    });

    test('no note when the settings are satisfiable', () => {
        for (const r of run('cijferen-optellen-nat', { maxRange: 1000 })) expect(r.note).toBeNull();
    });

    test('L4: fractional multiplier keeps operand 1 and the exact answer within max', () => {
        for (const dp of [1, 2]) for (const r of run('cijferen-vermenigvuldigen-dec', { maxRange: 20, decimalPlaces: dp, operand1Mask: { t: true } }, 12)) {
            for (const ex of r.items) {
                const s = 10 ** dp;
                const [a, b] = ex.operands;
                expect(a).toBeLessThanOrEqual(20);
                expect(ex.answer).toBeLessThanOrEqual(20);
                // exact in integer arithmetic: a·b is a whole number of 10^-dp units
                const prod = Math.round(a * s) * Math.round(b * s);
                expect(prod % s).toBe(0);
                expect(Math.round(ex.answer * s)).toBe(prod / s);
            }
        }
    });

    test('E3: no divisor 1 with a remainder', () => {
        for (const r of run('cijferen-delen-nat', { maxRange: 100, withRemainder: true, operand1Mask: { E: true } }, 12))
            for (const ex of r.items) {
                expect(ex.operands[1]).toBeGreaterThan(1);
                expect(ex.operands[0]).toBe(ex.answer * ex.operands[1] + ex.remainder);
            }
    });

    test('E7: decimal divisor mask gives a positive quotient and dividend within max', () => {
        for (const r of run('cijferen-delen-dec', { maxRange: 1000, decimalPlaces: 2, operand1Mask: { t: true } }, 12))
            for (const ex of r.items) {
                expect(ex.answer).toBeGreaterThan(0);
                expect(ex.operands[0]).toBeLessThanOrEqual(1000);
            }
    });
});
