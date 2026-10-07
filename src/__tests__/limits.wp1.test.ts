import { describe, test, expect, afterEach } from 'vitest';
import type { Equation, Fraction } from '../services/math/types';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { shortfallNote } from '../services/math/relax';

// Limit-audit 2026-10-07, package WP1 (hoofdrekenen engine): each block below is a repro
// setting from BUGS.md, generated under several seeds, and every exercise must respect the
// limit the teacher set (or the block comes back shorter, never over the limit).

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

const SEEDS = [11, 2222, 333333, 4, 55];

function runSeeded(typeId: string, constraints: Record<string, unknown>, count = 20): Equation[][] {
    return SEEDS.map(seed => {
        Math.random = mulberry32(seed);
        const block = makeBlock(typeId, { constraints, block: { numberOfExercises: count } });
        return generateFor(block) as Equation[];
    });
}

const frac = (o: unknown) => o as Fraction;

describe('shortfall note wording', () => {
    test('0 / 1 / many', () => {
        expect(shortfallNote(0)).toBe('Geen oefeningen mogelijk bij deze instellingen.');
        expect(shortfallNote(1)).toBe('Slechts 1 oefening mogelijk bij deze instellingen.');
        expect(shortfallNote(3)).toBe('Slechts 3 oefeningen mogelijk bij deze instellingen.');
    });
});

describe('[E1] rational +/− multi_step terminates', () => {
    test('max noemer 2 says why the block is empty', () => {
        const block = makeBlock('hr-std-optellen', { constraints: { numberType: 'rational', fractionDifficulty: 'multi_step', maxDenominator1: 2, maxDenominator2: 2 } });
        const result = REGISTRY['hr-std-optellen'].generateNoted!(block);
        expect(result.items).toHaveLength(0);
        expect(result.note).toBe('Geen oefeningen mogelijk bij deze instellingen.');
    });

    const cases: Record<string, unknown>[] = [
        { maxDenominator1: 2, maxDenominator2: 2 },
        { linkFractions: false, maxDenominator1: 10, maxDenominator2: 2 },
        { linkFractions: false, maxDenominator1: 10, maxDenominator2: 3 },
        { maxDenominator1: 2, maxDenominator2: 2, termCount: 3 },
    ];
    for (const typeId of ['hr-std-optellen', 'hr-std-aftrekken']) {
        for (const c of cases) {
            test(`${typeId} ${JSON.stringify(c)}`, () => {
                const constraints = { numberType: 'rational', fractionDifficulty: 'multi_step', ...c };
                for (const items of runSeeded(typeId, constraints)) {
                    for (const eq of items) {
                        const [a, b] = eq.operands.map(frac);
                        expect(a.d).toBeLessThanOrEqual(c.maxDenominator1 as number);
                        expect(b.d).toBeLessThanOrEqual(c.maxDenominator2 as number);
                        // multi_step: neither noemer equals or divides the other
                        if (eq.operands.length === 2) expect(a.d % b.d !== 0 && b.d % a.d !== 0).toBe(true);
                    }
                }
            });
        }
    }
});

describe('[L7] rational +/− one_step keeps both noemers within their max', () => {
    const cases: Record<string, unknown>[] = [
        { maxDenominator1: 2, maxDenominator2: 2 },
        { maxDenominator1: 3, maxDenominator2: 3 },
        { maxDenominator1: 4, maxDenominator2: 4 },
        { linkFractions: false, maxDenominator1: 100, maxDenominator2: 10 },
        { linkFractions: false, maxDenominator1: 10, maxDenominator2: 3 },
        { linkFractions: false, maxDenominator1: 3, maxDenominator2: 10 },
    ];
    for (const typeId of ['hr-std-optellen', 'hr-std-aftrekken']) {
        for (const c of cases) {
            test(`${typeId} ${JSON.stringify(c)}`, () => {
                const constraints = { numberType: 'rational', fractionDifficulty: 'one_step', ...c };
                for (const items of runSeeded(typeId, constraints)) {
                    for (const eq of items) {
                        const [a, b] = eq.operands.map(frac);
                        expect(a.d).toBeLessThanOrEqual(c.maxDenominator1 as number);
                        expect(b.d).toBeLessThanOrEqual(c.maxDenominator2 as number);
                        const [lo, hi] = a.d < b.d ? [a.d, b.d] : [b.d, a.d];
                        expect(hi % lo === 0 && hi > lo).toBe(true);
                    }
                }
            });
        }
    }

    test('both maxima below 4 says why the block is empty', () => {
        const block = makeBlock('hr-std-aftrekken', { constraints: { numberType: 'rational', fractionDifficulty: 'one_step', maxDenominator1: 3, maxDenominator2: 3 } });
        const result = REGISTRY['hr-std-aftrekken'].generateNoted!(block);
        expect(result.items).toHaveLength(0);
        expect(result.note).toBe('Geen oefeningen mogelijk bij deze instellingen.');
    });

    test('the unlinked 10 / 3 case still fills the block (only the first noemer is a multiple)', () => {
        for (const items of runSeeded('hr-std-optellen', { numberType: 'rational', fractionDifficulty: 'one_step', linkFractions: false, maxDenominator1: 10, maxDenominator2: 3 })) {
            expect(items).toHaveLength(20);
        }
    });
});

const decimals = (x: number) => (String(x).split('.')[1] ?? '').length;

describe('[L15] rational × / : decimal_fraction draws a real kommagetal', () => {
    for (const typeId of ['hr-std-vermenigvuldigen', 'hr-std-delen']) {
        for (const decimalPlaces of [1, 2, 3]) {
            for (const fractionOrderMode of ['AB', 'BA']) {
                test(`${typeId} dp ${decimalPlaces} ${fractionOrderMode}`, () => {
                    const constraints = { numberType: 'rational', fractionMultMode: 'decimal_fraction', decimalPlaces, maxGetal: 10, fractionOrderMode };
                    for (const items of runSeeded(typeId, constraints)) {
                        expect(items).toHaveLength(20);
                        let atLeastOne = 0;
                        for (const eq of items) {
                            const dec = eq.operands.find(o => typeof o === 'number') as number;
                            const f = frac(eq.operands.find(o => typeof o === 'object'));
                            expect(dec).toBeGreaterThan(0);
                            expect(dec).toBeLessThanOrEqual(10);
                            expect(decimals(dec)).toBeLessThanOrEqual(decimalPlaces);
                            if (dec >= 1) atLeastOne++;
                            const ans = frac(eq.answer);
                            expect(Number.isInteger(ans.n) && Number.isInteger(ans.d)).toBe(true);
                            const want = typeId === 'hr-std-vermenigvuldigen' ? dec * f.n / f.d
                                : fractionOrderMode === 'AB' ? dec * f.d / f.n : f.n / f.d / dec;
                            expect(ans.n / ans.d).toBeCloseTo(want, 9);
                        }
                        // Values spread over (0, 10], not squashed to 0,0x.
                        expect(atLeastOne).toBeGreaterThan(items.length / 2);
                    }
                });
            }
        }
    }
});

describe('[L14] "Maximum per getal" (operandMax) is honoured', () => {
    const cases: [string, Record<string, unknown>][] = [
        ['hr-std-aftrekken', { numberType: 'natural', maxGetal: 1000, operandMax: [null, 30], preset: 'compenseren' }],
        ['hr-std-aftrekken', { numberType: 'natural', maxGetal: 1000, operandMax: [null, 30], operand2Mask: { T: true, E: true } }],
        ['hr-std-aftrekken', { numberType: 'decimal', maxGetal: 1000, operandMax: [null, 30], preset: 'compenseren' }],
        ['hr-std-gemengd', { numberType: 'natural', maxGetal: 1000, variants: ['-:compenseren'], operandMax: [null, 30] }],
        ['hr-std-vermenigvuldigen', { numberType: 'natural', maxGetal: 1000, termCount: 3, operandMax: [5, 5, 5] }],
        ['hr-std-vermenigvuldigen', { numberType: 'natural', maxGetal: 1000000, termCount: 3, selectedTables: [6, 8, 9, 12, 15], operandMax: [10, 1000000000] }],
    ];
    for (const [typeId, c] of cases) {
        test(`${typeId} ${JSON.stringify(c)}`, () => {
            const max = c.operandMax as (number | null)[];
            for (const items of runSeeded(typeId, c)) {
                expect(items).toHaveLength(20);
                for (const eq of items) {
                    eq.operands.forEach((o, i) => {
                        if (typeof max[i] === 'number') expect(o as number).toBeLessThanOrEqual(max[i] as number);
                    });
                }
            }
        });
    }

    test('a compenseren term that cannot fit says the strategie was dropped', () => {
        const block = makeBlock('hr-std-aftrekken', { constraints: { maxGetal: 1000, operandMax: [null, 30], preset: 'compenseren' } });
        expect(REGISTRY['hr-std-aftrekken'].generateNoted!(block).note).toBe('Instellingen versoepeld om genoeg oefeningen te maken: strategie.');
    });

    test('3 factors: the first stays a picked table under its own max', () => {
        for (const items of runSeeded('hr-std-vermenigvuldigen', { maxGetal: 1000, termCount: 3, operandMax: [5, 5, 5] })) {
            for (const eq of items) {
                expect(eq.operands).toHaveLength(3);
                expect([2, 3, 4, 5]).toContain(eq.operands[0]);
            }
        }
    });
});

describe('[L19] delen met rest keeps the dividend within the max', () => {
    const levelOf = (eq: Equation) => {
        const [dividend] = eq.operands as number[];
        const q = eq.answer as number;
        return dividend >= 100 ? 3 : q >= 10 ? 2 : dividend >= 10 ? 1 : 0;
    };
    // [max, picked level] → the level every exercise must come from
    const cases: [number, number, number][] = [
        [1000, 1, 1], [1000, 2, 2], [1000, 3, 3],
        [100, 1, 1], [100, 2, 2], [100, 3, 2],
        [20, 1, 1], [20, 2, 1], [20, 3, 1],
        [10, 1, 0], [10, 3, 0],
    ];
    for (const [maxGetal, metRestLevel, want] of cases) {
        test(`max ${maxGetal}, N${metRestLevel} → ${want ? `N${want}` : 'deeltallen tot de max'}`, () => {
            const c = { numberType: 'natural', multiplicationMode: 'met_rest', metRestLevel, maxGetal };
            for (const items of runSeeded('hr-std-delen', c)) {
                expect(items.length).toBeGreaterThan(0);
                for (const eq of items) {
                    const [dividend, divisor] = eq.operands as number[];
                    expect(dividend).toBeLessThanOrEqual(maxGetal);
                    expect((eq.answer as number) * divisor + (eq.remainder ?? 0)).toBe(dividend);
                    expect(eq.remainder).toBeGreaterThanOrEqual(1);
                    // level 0 = no two-digit floor; its dividends may still reach 10
                    if (want === 0) expect(levelOf(eq)).toBeLessThanOrEqual(1);
                    else expect(levelOf(eq)).toBe(want);
                }
            }
        });
    }

    test('a lowered level says so', () => {
        const block = makeBlock('hr-std-delen', { constraints: { multiplicationMode: 'met_rest', metRestLevel: 3, maxGetal: 100 } });
        expect(REGISTRY['hr-std-delen'].generateNoted!(block).note).toBe('Niveau N3 past niet onder het maximum 100: oefeningen op niveau N2.');
        const tiny = makeBlock('hr-std-delen', { constraints: { multiplicationMode: 'met_rest', metRestLevel: 1, maxGetal: 10 } });
        expect(REGISTRY['hr-std-delen'].generateNoted!(tiny).note).toMatch(/^Niveau N1 past niet onder het maximum 10: deeltallen tot 10\./);
    });

    test('gemengd: a met-rest tab obeys the shared max and says so', () => {
        const c = { numberType: 'natural', maxGetal: 100, variants: [':'], perVariant: { ':': { multiplicationMode: 'met_rest', selectedTables: [7], metRestLevel: 3 } } };
        for (const items of runSeeded('hr-std-gemengd', c)) {
            for (const eq of items) expect(eq.operands[0] as number).toBeLessThanOrEqual(100);
        }
        const block = makeBlock('hr-std-gemengd', { constraints: c });
        expect(REGISTRY['hr-std-gemengd'].generateNoted!(block).note).toBe('Niveau N3 past niet onder het maximum 100: oefeningen op niveau N2.');
    });
});

describe('[L2] gemengd: the shared max holds for × and : too', () => {
    const all = ['+', '+:compenseren', '-', '-:compenseren', 'x', 'x:tienvoud', ':', ':tienvoud'];
    const cases: Record<string, unknown>[] = [
        { numberType: 'natural', maxGetal: 20 },
        { numberType: 'natural', maxGetal: 20, variants: ['x'] },
        { numberType: 'natural', maxGetal: 10, variants: ['x', 'x:tienvoud'] },
        { numberType: 'decimal', maxGetal: 10, variants: ['x', 'x:tienvoud'] },
        { numberType: 'natural', maxGetal: 10, variants: [':', ':tienvoud'] },
        { numberType: 'decimal', maxGetal: 100, variants: [':', ':tienvoud'] },
        { numberType: 'natural', maxGetal: 100, variants: all },
        { numberType: 'natural', maxGetal: 1000, variants: all },
        { numberType: 'natural', maxGetal: 100, variants: ['x', ':'], perVariant: { ':': { tableLimit: 100, selectedTables: [25, 50, 75] } } },
        { numberType: 'natural', maxGetal: 50, variants: [':'], perVariant: { ':': { multiplicationMode: 'andere', divisionLevels: [2] } } },
        { numberType: 'natural', maxGetal: 20, variants: ['x'], perVariant: { x: { selectedTables: [7], tableLimit: 10 } } },
    ];
    for (const c of cases) {
        test(JSON.stringify(c), () => {
            const max = c.maxGetal as number;
            for (const items of runSeeded('hr-std-gemengd', c)) {
                expect(items.length).toBeGreaterThan(0);
                for (const eq of items) {
                    const [first] = eq.operands as number[];
                    if (eq.operator === 'x' || eq.operator === '+') expect(eq.answer as number).toBeLessThanOrEqual(max);
                    if (eq.operator === ':' || eq.operator === '-') expect(first).toBeLessThanOrEqual(max);
                    if (eq.operator === ':') expect(eq.answer as number).toBeLessThanOrEqual(max);
                }
            }
        });
    }

    test('a tienvoud variant with no room under the max drops the strategie and says so', () => {
        const block = makeBlock('hr-std-gemengd', { constraints: { maxGetal: 10, variants: ['x:tienvoud'] } });
        const result = REGISTRY['hr-std-gemengd'].generateNoted!(block);
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.note).toBe('Instellingen versoepeld om genoeg oefeningen te maken: strategie.');
    });

    test('tables that cannot fit leave the block short, with a note', () => {
        const block = makeBlock('hr-std-gemengd', { constraints: { maxGetal: 20, variants: ['x'], perVariant: { x: { selectedTables: [25, 50] } } } });
        const result = REGISTRY['hr-std-gemengd'].generateNoted!(block);
        expect(result.items).toHaveLength(0);
        expect(result.note).toBe('Geen oefeningen mogelijk bij deze instellingen.');
    });

    test('standalone tafels and tienvoud keep their own ceilings (by design)', () => {
        Math.random = mulberry32(7);
        const tafels = generateFor(makeBlock('hr-std-vermenigvuldigen', { constraints: { maxGetal: 20 }, block: { numberOfExercises: 40 } })) as Equation[];
        expect(tafels.some(eq => (eq.answer as number) > 20)).toBe(true);
        const tienvoud = generateFor(makeBlock('hr-std-vermenigvuldigen', { constraints: { maxGetal: 20, preset: 'tienvoud' } })) as Equation[];
        expect(tienvoud.some(eq => (eq.answer as number) > 20)).toBe(true);
    });
});

describe('[L8] decimal : keeps the quotient within "Maximum uitkomst"', () => {
    const cases: [string, Record<string, unknown>][] = [
        ['hr-std-delen', { numberType: 'decimal', maxGetal: 10 }],
        ['hr-std-delen', { numberType: 'decimal', maxGetal: 10, decimalPlaces: 1 }],
        ['hr-std-delen', { numberType: 'decimal', maxGetal: 100 }],
        ['hr-std-delen', { numberType: 'decimal', maxGetal: 10, operand1Mask: { E: true, t: true } }],
        ['hr-std-gemengd', { numberType: 'decimal', maxGetal: 10, variants: [':'] }],
    ];
    for (const [typeId, c] of cases) {
        test(`${typeId} ${JSON.stringify(c)}`, () => {
            for (const items of runSeeded(typeId, c, 40)) {
                expect(items).toHaveLength(40);
                for (const eq of items) {
                    expect(eq.answer as number).toBeLessThanOrEqual(c.maxGetal as number);
                    expect(eq.operands[0] as number).toBeLessThanOrEqual(c.maxGetal as number);
                }
            }
        });
    }
});
