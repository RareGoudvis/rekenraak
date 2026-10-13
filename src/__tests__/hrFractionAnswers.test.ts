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

// "Gemengd getal" operands are true mixed numbers: the report saw "2 38/27 − ? = 17/27".
describe('hoofdrekenen breuken: a mixed operand keeps a proper breukdeel', () => {
    const flagPairs: [boolean, boolean][] = [[true, false], [false, true], [true, true]];
    // termCount 3-4 is the breuk chain, which ignored the Gemengd flags before.
    const cases = ['hr-std-optellen', 'hr-std-aftrekken'].flatMap(typeId => [2, 3, 4].flatMap(termCount =>
        ['same', 'one_step', 'multi_step'].flatMap(fractionDifficulty =>
            flagPairs.map(([mixedNumber1, mixedNumber2]): [string, Record<string, unknown>] => [typeId, {
                numberType: 'rational', termCount, fractionDifficulty, mixedNumber1, mixedNumber2, linkFractions: false,
                maxNumerator1: 40, maxNumerator2: 40, maxDenominator1: 30, maxDenominator2: 30,
            }]))));
    test.each(cases)('%s %j', (typeId, constraints) => {
        const eqs = answers(typeId, constraints);
        expect(eqs.length).toBeGreaterThan(0);
        for (const eq of eqs) {
            eq.operands.forEach((o, i) => {
                if (typeof o === 'number') return;
                const flagged = i === 0 ? constraints.mixedNumber1 : i === 1 ? constraints.mixedNumber2 : false;
                if (flagged) expect(o.whole, `operand ${i + 1} is mixed`).toBeGreaterThan(0);
                if ((o.whole ?? 0) > 0) expect(o.n, `${JSON.stringify(o)} breukdeel`).toBeLessThan(o.d);
            });
            const vals = eq.operands.map(value);
            const want = vals.slice(1).reduce((acc, v) => (eq.operator === '+' ? acc + v : acc - v), vals[0]);
            expect(value(eq.answer)).toBeCloseTo(want, 9);
            // A flagged block answers as a mixed number, like the 2-term path.
            if (isFraction(eq.answer)) expect(eq.answer.n).toBeLessThan(eq.answer.d);
        }
    });

    // 'Eén stap' in a chain: two noemers at most, one a multiple of the other (one conversion).
    test.each([3, 4])('one_step chain of %i terms keeps a single conversion step', (termCount) => {
        for (const typeId of ['hr-std-optellen', 'hr-std-aftrekken']) {
            const eqs = answers(typeId, { numberType: 'rational', termCount, fractionDifficulty: 'one_step', linkFractions: false,
                maxNumerator1: 10, maxNumerator2: 10, maxDenominator1: 12, maxDenominator2: 12 });
            expect(eqs.length).toBeGreaterThan(0);
            for (const eq of eqs) {
                const ds = [...new Set(eq.operands.map(o => (typeof o === 'number' ? 1 : o.d)))].sort((a, b) => a - b);
                expect(ds.length, JSON.stringify(eq.operands)).toBe(2);
                expect(ds[1] % ds[0], JSON.stringify(eq.operands)).toBe(0);
            }
        }
    });
});
