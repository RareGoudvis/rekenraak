import { describe, it, expect } from 'vitest';
import type { MathBlock } from '../services/math/types';
import { generateVerbandExercisesNoted } from '../services/verbanden/verbandenGenerator';
import { generateSchattendNoted } from '../services/schattend/schattendGenerator';
import { targetsFor, roundTo } from '../services/afronden/afrondenGenerator';
import { RANGES } from '../config/numberRanges';
import { generateControleExercises } from '../services/controleren/controlerenGenerator';
import { generateProcentNoted } from '../services/procenten/procentenGenerator';
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
                            expect(t).toBeLessThanOrEqual(tableLimit);
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
    it('colon-only is never empty and reports a short block', () => {
        const { items, note } = generateRekenvolgordeNoted(mk({ operators: [':'], opsCount: 2, haakjesMode: 'GEEN', maxGetal: 100, tableLimit: 10 }, 8));
        expect(items.length).toBeGreaterThan(0);
        if (items.length < 8) expect(note).toMatch(/Slechts/);
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

describe('controleren limits', () => {
    for (const max of [...RANGES.controleren, 50, 100]) for (const subType of ['negenproef', 'omgekeerde']) for (const operators of [['+'], ['-'], ['+', '-']])
        for (const foutAandeel of ['geen', 'helft', 'alles'])
            it(`${subType} ${operators.join('')} max${max} ${foutAandeel}: result and shown answer <= max`, () => {
                for (let seed = 0; seed < 3; seed++) {
                    const items = generateControleExercises(mk({ subType, operators, maxGetal: max, foutAandeel }, 6));
                    expect(items.length).toBe(6);
                    for (const ex of items) {
                        expect(ex.correctAnswer).toBeLessThanOrEqual(max);
                        expect(ex.shownAnswer).toBeLessThanOrEqual(max);
                        expect(ex.a).toBeLessThanOrEqual(max);
                        if (ex.operator === 'x' && max >= 1000) { expect(ex.b).toBeGreaterThanOrEqual(12); expect(ex.a).toBeGreaterThanOrEqual(10); }
                    }
                }
            });
});

describe('procenten short blocks', () => {
    it('welk-percent [100] is filled, with a note', () => {
        const { items, note } = generateProcentNoted(mk({ subType: 'welk-percent', percents: [100], maxGetal: 100 }, 8));
        expect(items.length).toBe(8);
        expect(note).toBeTruthy();
    });
    it('1 % at max 100 has one possible sum and says so', () => {
        const { items, note } = generateProcentNoted(mk({ subType: 'nemen', percents: [1], maxGetal: 100 }, 8));
        expect(items.length).toBe(1);
        expect(note).toBe('Slechts 1 oefening mogelijk bij deze instellingen.');
    });
    it('5 % at max 100 reports its 5 sums', () => {
        const { items, note } = generateProcentNoted(mk({ subType: 'nemen', percents: [5], maxGetal: 100 }, 8));
        expect(items.length).toBe(5);
        expect(note).toMatch(/Slechts 5 oefeningen/);
    });
    it('valid settings carry no note', () => {
        expect(generateProcentNoted(mk({ subType: 'nemen', percents: [10, 25, 50], maxGetal: 1000 }, 8)).note).toBeNull();
    });
});

describe('controleren negenproef first factor', () => {
    for (const max of RANGES.controleren) it(`no multiple of 10 as first factor at max ${max}`, () => {
        for (let i = 0; i < 20; i++) {
            const items = generateControleExercises(mk({ subType: 'negenproef', maxGetal: max }, 8));
            expect(items.length).toBe(8);
            for (const ex of items) expect(ex.a % 10).not.toBe(0);
        }
    });
});

describe('verbanden: a value appears once per block', () => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const vkey = (e: { fraction: { n: number; d: number } }) => { const g = gcd(e.fraction.n, e.fraction.d); return `${e.fraction.n / g}/${e.fraction.d / g}`; };
    const all = ['breuk', 'decimaal', 'procent'];
    for (const subType of ['tabel', 'paren'])
        it(`default ${subType} over 300 seeds has no repeated value`, () => {
            for (let i = 0; i < 300; i++) {
                const { items, note } = generateVerbandExercisesNoted(mk({ subType, reps: all, denominators: [2, 4, 5, 10, 100], given: 'random' }, 8));
                expect(items).toHaveLength(8);
                expect(new Set(items.map(vkey)).size).toBe(8);
                expect(note).toBeNull();
            }
        });
    it('a pool too small for the count widens, still without repeats', () => {
        const { items } = generateVerbandExercisesNoted(mk({ subType: 'tabel', reps: all, denominators: [2], given: 'random' }, 8));
        expect(items).toHaveLength(8);
        expect(new Set(items.map(vkey)).size).toBe(8);
    });
    it('more exercises than distinct values pads with repeats and says so', () => {
        const { items, note } = generateVerbandExercisesNoted(mk({ subType: 'tabel', reps: all, denominators: [2], given: 'random' }, 400));
        expect(new Set(items.map(vkey)).size).toBeLessThan(items.length);
        expect(note).toMatch(/dubbel voor/);
    });
});
