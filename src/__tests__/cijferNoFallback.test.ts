import { describe, test, expect, afterEach } from 'vitest';
import { makeBlock } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { generateCijferExercisesNoted } from '../services/cijferen/cijferGenerator';
import type { CijferExercise } from '../services/math/types';

// Owner decision 2026-10-09: settings the max cannot meet give fewer or no exercises WITH a note,
// never a stand-in exercise that ignores the bruggetjes, the getalopbouw or the term count.

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

const OPS: Record<string, CijferExercise['operator']> = { optellen: '+', aftrekken: '-', vermenigvuldigen: 'x', delen: ':' };
function gen(typeId: string, constraints: Record<string, unknown>, count = 6, seed = 1234) {
    const [, op, nt] = typeId.split('-');
    Math.random = mulberry32(seed);
    return generateCijferExercisesNoted(makeBlock(typeId, {
        constraints: { ...constraints, operator: OPS[op], numberType: nt === 'dec' ? 'decimal' : 'natural' },
        block: { numberOfExercises: count },
    }));
}

// Which integer columns carry (+) or borrow (−), units first, in scaled integers.
function bridgesOf(ex: CijferExercise): boolean[] {
    const dp = ex.decimalPlaces ?? 0;
    const digits = (x: number) => String(Math.round(x * 10 ** dp)).split('').reverse().map(Number);
    const ops = ex.operands.map(digits);
    const len = Math.max(...ops.map(o => o.length)) + 1;
    const out: boolean[] = [];
    let carry = 0;
    for (let pos = 0; pos < len; pos++) {
        const d = (o: number[]) => o[pos] ?? 0;
        if (ex.operator === '+') {
            carry = Math.floor((ops.reduce((s, o) => s + d(o), 0) + carry) / 10);
        } else {
            carry = d(ops[0]) - carry - d(ops[1]) < 0 ? 1 : 0;
        }
        if (pos >= dp) out.push(carry > 0);
    }
    return out;
}

describe('cijferen: no silent fallback', () => {
    for (const id of ['cijferen-optellen-nat', 'cijferen-aftrekken-nat']) {
        test(`${id}: a REQUIRED bruggetje on the top place (HM at 1e9) gives no exercises and a note`, () => {
            const { items, note } = gen(id, { maxRange: 1_000_000_000, bridges: { HM: 'REQUIRED' } });
            expect(items).toEqual([]);
            expect(note).toMatch(/^Geen oefeningen mogelijk met deze instellingen tot .*: kies minder bruggen\.$/);
        });

        test(`${id}: H REQUIRED at 1 000 keeps only exercises that really bridge at H, short ones noted`, () => {
            for (const seed of [1, 2, 3]) {
                const { items, note } = gen(id, { maxRange: 1000, bridges: { H: 'REQUIRED' } }, 6, seed);
                for (const ex of items) {
                    expect(bridgesOf(ex)[2], `${ex.operands.join(ex.operator)}`).toBe(true);
                    expect(Math.max(...ex.operands, ex.answer)).toBeLessThanOrEqual(1000);
                }
                if (items.length < 6) expect(note).toMatch(/oefening(en)? mogelijk met deze instellingen/);
                else expect(note).toBeNull();
            }
        });

        test(`${id}: a REQUIRED bruggetje on E gives the full count, every exercise bridging at E`, () => {
            const { items, note } = gen(id, { maxRange: 1000, bridges: { E: 'REQUIRED' } }, 12);
            expect(items).toHaveLength(12);
            expect(note).toBeNull();
            for (const ex of items) expect(bridgesOf(ex)[0], `${ex.operands.join(ex.operator)}`).toBe(true);
        });
    }

    test('an impossible getalopbouw gives no exercises and names it', () => {
        const cases: [string, Record<string, unknown>][] = [
            ['cijferen-optellen-nat', { maxRange: 100, operand0Mask: { H: true } }],
            ['cijferen-aftrekken-nat', { maxRange: 100, operand1Mask: { H: true } }],
            ['cijferen-vermenigvuldigen-nat', { maxRange: 100, operand1Mask: { T: true } }],
            ['cijferen-delen-nat', { maxRange: 100, operand1Mask: { T: true } }],
            ['cijferen-vermenigvuldigen-dec', { maxRange: 20, decimalPlaces: 2, operand1Mask: { T: true } }],
        ];
        for (const [id, c] of cases) {
            const { items, note } = gen(id, c, 4);
            expect(items, id).toEqual([]);
            expect(note, id).toMatch(/^Geen oefeningen mogelijk .*: kies een andere getalopbouw\.$/);
        }
    });

    test('a getalopbouw or brug key the config no longer shows (left from a larger max) is ignored', () => {
        const masked = gen('cijferen-optellen-nat', { maxRange: 10, operand0Mask: { H: true } }, 4);
        expect(masked.items).toHaveLength(4);
        expect(masked.note).toBeNull();
        const bridged = gen('cijferen-aftrekken-nat', { maxRange: 1000, bridges: { TD: 'REQUIRED' } }, 4);
        expect(bridged.items).toHaveLength(4);
        expect(bridged.note).toBeNull();
    });

    test('aftrekken with a minuend of tienden only (0,5 − 0,2) fits instead of going empty', () => {
        const { items, note } = gen('cijferen-aftrekken-dec', { maxRange: 1000, decimalPlaces: 2, operand0Mask: { t: true } }, 6);
        expect(items).toHaveLength(6);
        expect(note).toBeNull();
        for (const ex of items) {
            expect(ex.operands[0]).toBeLessThan(1);
            expect(ex.answer).toBeGreaterThan(0);
            expect(Math.round((ex.operands[0] - ex.operands[1]) * 100)).toBe(Math.round(ex.answer * 100));
        }
    });

    test('three terms honour numberOfTerms; nothing is padded to two', () => {
        const { items } = gen('cijferen-optellen-nat', { maxRange: 1000, numberOfTerms: 3 }, 8);
        expect(items).toHaveLength(8);
        for (const ex of items) expect(ex.operands).toHaveLength(3);
    });
});
