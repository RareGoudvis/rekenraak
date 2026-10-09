import { describe, test, expect, afterEach } from 'vitest';
import { isFraction, type Equation } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { seedLeafConstraints } from '../config/baseSettings';

// Hoofdrekenen breuken: a result that reduces to a whole number is that number, never "6/1"
// (or a mixed "6 0/1"); the sweep saw "4/3 : 2/9 = 6/1" at the hr-std-delen-rat default.

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

const value = (v: number | { whole?: number; n: number; d: number }) => (typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d);

function answers(typeId: string, constraints: Record<string, unknown>, leafId?: string): Equation[] {
    const out: Equation[] = [];
    for (let seed = 1; seed <= 40; seed++) {
        Math.random = mulberry32(seed);
        const block = makeBlock(typeId, { leafId, constraints, block: { numberOfExercises: 10 } });
        out.push(...(REGISTRY[typeId].generate(block) as Equation[]));
    }
    return out;
}

function expectNoWholeFractions(eqs: Equation[]) {
    let wholes = 0;
    for (const eq of eqs) {
        const a = eq.answer;
        if (isFraction(a)) {
            const total = (a.whole ?? 0) * a.d + a.n;
            expect(total % a.d, `${JSON.stringify(eq.operands)} ${eq.operator} = ${JSON.stringify(a)}`).not.toBe(0);
        } else {
            expect(Number.isInteger(a), `a whole answer is an integer: ${a}`).toBe(true);
            wholes++;
        }
    }
    return wholes;
}

describe('hoofdrekenen breuken: whole results print as whole numbers', () => {
    test.each(['hr-std-delen-rat', 'hr-std-vermenigvuldigen-rat', 'hr-std-optellen-rat', 'hr-std-aftrekken-rat'])('%s default', (leafId) => {
        const seeded = seedLeafConstraints(leafId, null);
        if (!seeded) throw new Error(`no leaf ${leafId}`);
        const eqs = answers(seeded.typeId, seeded.constraints, leafId);
        expect(eqs.length).toBeGreaterThan(0);
        expectNoWholeFractions(eqs);
    });

    test('the delen default does produce whole results, and they keep their value', () => {
        const seeded = seedLeafConstraints('hr-std-delen-rat', null)!;
        const eqs = answers(seeded.typeId, seeded.constraints, 'hr-std-delen-rat');
        expect(expectNoWholeFractions(eqs)).toBeGreaterThan(0);
        for (const eq of eqs) {
            const [a, b] = eq.operands.map(value);
            expect(value(eq.answer)).toBeCloseTo(a / b, 9);
        }
    });

    test.each<[string, Record<string, unknown>]>([
        ['hr-std-optellen', { numberType: 'rational', mixedNumber1: true, mixedNumber2: true, fractionDifficulty: 'same' }],
        ['hr-std-aftrekken', { numberType: 'rational', mixedNumber1: true, mixedNumber2: true, fractionDifficulty: 'same' }],
        ['hr-std-optellen', { numberType: 'rational', termCount: 3 }],
        ['hr-std-vermenigvuldigen', { numberType: 'rational', fractionMultMode: 'natural_fraction' }],
        ['hr-std-vermenigvuldigen', { numberType: 'rational', termCount: 3 }],
        ['hr-std-delen', { numberType: 'rational', fractionMultMode: 'natural_fraction', fractionOrderMode: 'beide' }],
        ['hr-std-delen', { numberType: 'rational', fractionMultMode: 'decimal_fraction' }],
    ])('%s %j', (typeId, constraints) => {
        expectNoWholeFractions(answers(typeId, constraints));
    });
});
