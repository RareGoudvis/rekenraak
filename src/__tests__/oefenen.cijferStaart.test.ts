import { describe, expect, test } from 'vitest';
import type { CijferExercise } from '../services/math/types';
import { cijferCheck, cijferKioskGrid, divKioskLayout, divPlan, kioskMulRows } from '../services/cijferen/cijferCells';
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

describe('vermenigvuldigen on the card: onthoudcijfers per multiplier digit', () => {
    const mul = (a: number, b: number): CijferExercise => ({ id: 'm', operands: [a, b], operator: 'x', answer: a * b, remainder: 0, isManuallyEdited: false, decimalPlaces: 0 });

    test('457 × 386: three carry rows, the units digit nearest the multiplicand', () => {
        const ex = mul(457, 386);
        const rows = kioskMulRows(ex, 0);
        expect([...rows.carryRowOf]).toEqual([[0, 3], [1, 2], [2, 1]]);
        expect(rows.multiplicand).toBe(4);
        const chk = cijferCheck(ex, 0, true);
        const w = Object.fromEntries(chk.parts.flatMap((p, i) => ('cell' in p ? [[p.cell, chk.wants[i]]] : [])));
        // × 6: 7·6 = 42 (carry 4), 5·6 + 4 = 34 (carry 3); × 8: 56 (5), 40 + 5 = 45 (4); × 3: 21 (2), 15 + 2 = 17 (1).
        const carries = Object.keys(w).filter(k => k.startsWith('c'));
        expect(carries.map(k => `${k}=${w[k]}`)).toEqual(['c0_4=4', 'c0_3=3', 'c1_4=5', 'c1_3=4', 'c2_4=2', 'c2_3=1']);
    });

    test('× 1 and × 0 get no carry row; the carry cells still check strictly', () => {
        const ex = mul(1354, 103);
        expect([...kioskMulRows(ex, 0).carryRowOf.keys()]).toEqual([0]);
        const keys = kioskInteractOf(d, cOf(ex))!.keys!(ex, cOf(ex));
        const { answer, scratch } = cijferFill(ex, keys);
        expect(ok(ex, { ...answer, ...scratch })).toBe(true);
        expect(ok(ex, answer)).toBe(false);
    });
});
