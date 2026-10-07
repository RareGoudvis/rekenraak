import { describe, it, expect } from 'vitest';
import type { MathBlock } from '../services/math/types';
import { generateSchattendNoted } from '../services/schattend/schattendGenerator';
import { targetsFor, roundTo } from '../services/afronden/afrondenGenerator';
import { RANGES } from '../config/numberRanges';
import { generateRekenvolgordeNoted } from '../services/rekenvolgorde/rekenvolgordeGenerator';

const mk = (constraints: object, n: number): MathBlock => ({ constraints, numberOfExercises: n } as unknown as MathBlock);
const isMD = (t: unknown) => t === 'x' || t === ':';

describe('rekenvolgorde limits', () => {
    const OPSETS = [['+', '-'], ['+', '-', 'x'], ['+', '-', 'x', ':'], ['x'], [':'], ['x', ':'], ['+', 'x'], ['-', ':']];
    for (const maxGetal of [100, 1000]) for (const tableLimit of [10, 20])
        for (const operators of OPSETS) for (const opsCount of [2, 3, 4]) for (const haakjesMode of ['GEEN', 'MAG', 'MOET'])
            it(`${operators.join('')} ops${opsCount} ${haakjesMode} max${maxGetal} tl${tableLimit}`, () => {
                for (let seed = 0; seed < 3; seed++) {
                    const { items } = generateRekenvolgordeNoted(mk({ operators, opsCount, haakjesMode, maxGetal, tableLimit }, 10));
                    for (const ex of items) {
                        expect(ex.answer).toBeLessThanOrEqual(maxGetal);
                        expect(ex.answer).toBeGreaterThanOrEqual(0);
                        const tk = ex.tokens;
                        tk.forEach((t, i) => {
                            if (typeof t !== 'number') return;
                            let l = i - 1; while (l >= 0 && tk[l] === '(') l--;
                            let r = i + 1; while (r < tk.length && tk[r] === ')') r++;
                            const left = tk[l], right = tk[r];
                            if (!isMD(left) && !isMD(right)) return;
                            // A dividend opening a chain may be any exact multiple up to max; everything else is a table factor.
                            const dividend = right === ':' && !isMD(left);
                            expect(t).toBeLessThanOrEqual(dividend ? maxGetal : tableLimit);
                        });
                    }
                }
            });

    it('x-only + MOET fills the block without brackets and says so', () => {
        const { items, note } = generateRekenvolgordeNoted(mk({ operators: ['x'], opsCount: 2, haakjesMode: 'MOET', maxGetal: 100, tableLimit: 10 }, 8));
        expect(items.length).toBeGreaterThan(0);
        expect(items.every(e => !e.tokens.includes('('))).toBe(true);
        expect(note).toMatch(/Haakjes weggelaten/);
    });
    it('colon-only fills the block', () => {
        const { items } = generateRekenvolgordeNoted(mk({ operators: [':'], opsCount: 2, haakjesMode: 'GEEN', maxGetal: 100, tableLimit: 10 }, 8));
        expect(items.length).toBe(8);
    });
});

describe('schattend limits', () => {
    const OPS = [['+'], ['-'], ['x'], [':'], ['+', '-'], ['+', '-', 'x', ':']];
    const cases: { numberType: string; max: number; dp: number; target: string }[] = [];
    for (const max of RANGES.schattendNatural) for (const target of ['T', 'H', 'D', 'TD']) cases.push({ numberType: 'natural', max, dp: 2, target });
    for (const max of RANGES.decimal) for (const dp of [1, 2]) for (const target of ['E', 't', 'h']) cases.push({ numberType: 'decimal', max, dp, target });
    for (const { numberType, max, dp, target } of cases) for (const operators of OPS)
        it(`${numberType} max${max} dp${dp} ${target} ${operators.join('')}: result and estimate <= max`, () => {
            for (let seed = 0; seed < 2; seed++) {
                const { items, note } = generateSchattendNoted(mk({ numberType, maxGetal: max, decimalPlaces: dp, roundTargets: [target], operators }, 8));
                expect(items.length, note ?? '').toBe(8);
                for (const ex of items) {
                    const t = targetsFor(numberType).find(x => x.key === ex.targetKey)!;
                    const ra = roundTo(ex.a, t.weight);
                    const rb = ex.operator === '+' || ex.operator === '-' ? roundTo(ex.b, t.weight) : ex.b;
                    const f = (x: number, y: number) => ex.operator === '+' ? x + y : ex.operator === '-' ? x - y : ex.operator === 'x' ? x * y : x / y;
                    expect(f(ex.a, ex.b)).toBeLessThanOrEqual(max + 1e-9);
                    expect(f(ra, rb)).toBeLessThanOrEqual(max + 1e-9);
                    expect(ex.a).toBeLessThanOrEqual(max);
                    expect(ex.b).toBeLessThanOrEqual(max);
                }
            }
        });
    it('a target that cannot round at this max is replaced by the nearest one, with a note', () => {
        const { items, note } = generateSchattendNoted(mk({ numberType: 'natural', maxGetal: 100, roundTargets: ['H'], operators: ['+'] }, 8));
        expect(items.length).toBe(8);
        expect(items.every(e => e.targetKey === 'T')).toBe(true);
        expect(note).toMatch(/tiental/);
    });
    it("decimal target 'h' at 2 dp falls back to 'tiende' instead of an empty block", () => {
        const { items, note } = generateSchattendNoted(mk({ numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['h'], operators: ['+', '-'] }, 8));
        expect(items.length).toBe(8);
        expect(items.every(e => e.targetKey === 't')).toBe(true);
        expect(note).toBeTruthy();
    });
});
