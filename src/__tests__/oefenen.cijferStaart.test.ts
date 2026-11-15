import { describe, expect, test } from 'vitest';
import type { CijferExercise } from '../services/math/types';
import { cijferFocusOrder, cijferKioskGrid, divKioskLayout, divPlan, kioskMulRows, mulCarries } from '../services/cijferen/cijferCells';
import { divideToDecimals } from '../services/cijferen/cijferGenerator';
import { cijferKiosk } from '../services/oefenen/kioskDescriptors';
import { kioskInteractOf } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { EMPTY_INTERACTION } from '../components/viewer/ViewerInteractionContext';
import { INTERACT_SEP } from '../services/oefenen/types';
import { cijferFill } from './helpers/fillCells';

// Oefenmodus cijferen (2026-11-15): the card's staartdeling has the working rows of the method,
// and a multiplication gets a carry row per multiplier digit.

const d = cijferKiosk();
const div = (a: number, b: number, dp = 0): CijferExercise => {
    const { quotient, remainder } = dp ? divideToDecimals(a, b, dp) : { quotient: Math.floor(a / b), remainder: a % b };
    return { id: 't', operands: [a, b], operator: ':', answer: quotient, remainder, isManuallyEdited: false, decimalPlaces: dp };
};
const cOf = (ex: CijferExercise) => ({ operator: ex.operator, numberType: ex.decimalPlaces ? 'decimal' : 'natural', decimalPlaces: ex.decimalPlaces });
// What each staartdeling cell must hold (its parts are in key order).
const wantsOf = (ex: CijferExercise) => {
    const ia = kioskInteractOf(d, cOf(ex))!;
    const keys = ia.keys!(ex, cOf(ex));
    const wants = ia.answerOf(ex, cOf(ex)).split(INTERACT_SEP);
    return Object.fromEntries(keys.map((k, i) => [k, wants[i]]));
};
const ok = (ex: CijferExercise, cells: Record<string, string>) => {
    const c = cOf(ex);
    return checkAnswer(d, ex, c, kioskInteractOf(d, c)!.fromState({ ...EMPTY_INTERACTION, cells }, ex, c));
};

describe('staartdeling on the card', () => {
    test('748 : 4: each step writes its quotient digit, product, difference and the digit brought down', () => {
        const w = wantsOf(div(748, 4));
        expect(w).toEqual({
            q0: '1', m0_0: '4', v0_0: '3', n1: '4',
            q1: '8', m1_1: '2', m1_0: '3', v1_1: '2', v1_0: '|0', n2: '8',
            q2: '7', m2_2: '8', m2_1: '2', v2_2: '0', v2_1: '|0', r: '0',
        });
    });

    test('3 : 7 to two decimals starts with "0," and its first step on the tienden', () => {
        const ex = div(3, 7, 2);
        const w = wantsOf(ex);
        expect(Object.keys(w).filter(k => k.startsWith('q')).map(k => w[k])).toEqual(['0', '4', '2']);
        expect(divKioskLayout(ex, 2).qCommaAfter).toBe(0);
        expect(Object.keys(w)[0]).toBe('q0');
    });

    test('a trailing 0 decimal in the quotient may stay blank (106,5 = 106,50)', () => {
        const ex = div(213, 2, 2);
        const w = wantsOf(ex);
        const q = Object.keys(w).filter(k => k.startsWith('q'));
        expect(w[q[q.length - 1]]).toBe('0|');
        expect(w[q[q.length - 2]]).toBe('5');
    });

    test('a decimal divisor works on the shifted dividend and widens the card when it must (74,24 : 0,07)', () => {
        const ex = div(74.24, 0.07, 2);
        expect(divPlan(ex, 2).digits.join('')).toBe('742400');
        expect(divKioskLayout(ex, 2).leftCols).toBe(6);
        const { answer } = cijferFill(ex, kioskInteractOf(d, cOf(ex))!.keys!(ex, cOf(ex)));
        expect(ok(ex, answer)).toBe(true);
    });

    // Every right fill checks, and a wrong digit anywhere in the working is fout; no two cells share a ruitje.
    test.each(Array.from({ length: 60 }, (_, i) => i))('random deling %i', (i) => {
        let s = i * 7919 + 13;
        const rnd = (n: number) => { s = (s * 48271) % 2147483647; return s % n; };
        const dp = i % 3 === 0 ? 2 : 0;
        const b = 2 + rnd(i % 2 ? 9 : 120);
        const a = b * 2 + rnd(20000);
        const ex = div(a, b, dp);
        const c = cOf(ex);
        const keys = kioskInteractOf(d, c)!.keys!(ex, c);
        const { cells } = cijferKioskGrid(ex, dp);
        const spots = cells.filter(x => x.role !== 'rest').map(x => `${x.row}:${x.col}`);
        expect(new Set(spots).size, `${a} : ${b}`).toBe(spots.length);
        const { answer } = cijferFill(ex, keys);
        expect(ok(ex, answer), `${a} : ${b} ${JSON.stringify(answer)}`).toBe(true);
        const work = keys.filter(k => /^[mvn]/.test(k) && answer[k]);
        const k = work[rnd(work.length)];
        if (k) expect(ok(ex, { ...answer, [k]: String((Number(answer[k]) + 1) % 10) }), `${a} : ${b} ${k}`).toBe(false);
    });
});

describe('vermenigvuldigen on the card: the onthoudcijfers of a row stand right of that row, as the class writes them', () => {
    const mul = (a: number, b: number): CijferExercise => ({ id: 'm', operands: [a, b], operator: 'x', answer: a * b, remainder: 0, isManuallyEdited: false, decimalPlaces: 0 });

    // The keypad's path: per row right to left, a product digit then the carry its step makes; then the sum.
    test.each<[number, number, string[]]>([
        // 8 × 4 = 32 → 2, carry 3; 8 × 2 + 3 = 19 → 9, carry 1; 8 × 1 + 1 = 9. Then × 10 with its 0, then the sum.
        [124, 18, ['p0_3', 'c0_0', 'p0_2', 'c0_1', 'p0_1', 'p0_0', 'p1_3', 'p1_2', 'p1_1', 'p1_0', 'a3', 'a2', 'a1', 'a0']],
        // × 1 never carries; × 2: 3·2, 6·2 = 12 (carry 1), 3·2 + 1, 3·2.
        [3363, 21, ['p0_4', 'p0_3', 'p0_2', 'p0_1', 'p0_0', 'p1_4', 'p1_3', 'p1_2', 'c1_0', 'p1_1', 'p1_0', 'a4', 'a3', 'a2', 'a1', 'a0']],
        // × 3: 12 (1), 15 + 1 = 16 (1), 9 + 1 = 10 (1), 3 + 1; × 1 none.
        [1354, 13, ['p0_4', 'c0_0', 'p0_3', 'c0_1', 'p0_2', 'c0_2', 'p0_1', 'p0_0', 'p1_4', 'p1_3', 'p1_2', 'p1_1', 'p1_0', 'a4', 'a3', 'a2', 'a1', 'a0']],
        // × 1 none; × 9: 72 (7), 18 + 7 = 25 (2), 18 + 2; × 9 again the same.
        [228, 991, ['p0_5', 'p0_4', 'p0_3', 'p0_2', 'p0_1', 'p0_0', 'p1_5', 'p1_4', 'c1_0', 'p1_3', 'c1_1', 'p1_2', 'p1_1', 'p1_0', 'p2_5', 'p2_4', 'p2_3', 'c2_0', 'p2_2', 'c2_1', 'p2_1', 'p2_0', 'a5', 'a4', 'a3', 'a2', 'a1', 'a0']],
    ])('%i × %i: focus order', (a, b, order) => {
        const ex = mul(a, b);
        expect(cijferFocusOrder(ex, 0)).toEqual(order);
        // No carry before its row starts: each carry comes right after a digit of its own row.
        order.forEach((k, i) => { if (k.startsWith('c')) expect(order[i - 1].startsWith(`p${k.slice(1).split('_')[0]}_`)).toBe(true); });
        // The carries sit on their row's line, right of the E column, first carry first.
        const cells = cijferKioskGrid(ex, 0).cells;
        const at = (k: string) => cells.find(c => c.key === k)!;
        const e = Math.max(...cells.filter(c => c.role === 'digit').map(c => c.col));
        cells.filter(c => c.role === 'carry').forEach(c => {
            expect(c.row).toBe(at(`p${c.key.slice(1).split('_')[0]}_0`).row);
            expect(c.col).toBeGreaterThan(e);
        });
        // Right with the carries, fout without any one of them.
        const keys = kioskInteractOf(d, cOf(ex))!.keys!(ex, cOf(ex));
        const { answer, scratch } = cijferFill(ex, keys);
        expect(ok(ex, { ...answer, ...scratch })).toBe(true);
        for (const k of Object.keys(scratch)) expect(ok(ex, { ...answer, ...scratch, [k]: '' }), k).toBe(false);
    });

    test('124 × 18: the carries are 3 then 1, exactly as many cells as the row carries', () => {
        expect(mulCarries(mul(124, 18), 0, 0)).toEqual([{ from: 0, value: 3 }, { from: 1, value: 1 }]);
        expect(mulCarries(mul(124, 18), 0, 1)).toEqual([]);
        // The last step's carry is written into the product (9 × 124: 9 + 2 = 11), never a cell.
        expect(mulCarries(mul(124, 9), 0, 0)).toEqual([{ from: 0, value: 3 }, { from: 1, value: 2 }]);
        expect(kioskMulRows(mul(124, 18), 0)).toMatchObject({ multiplicand: 1, multiplier: 2, ppStart: 3 });
    });
});
