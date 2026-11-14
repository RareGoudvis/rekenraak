import { describe, expect, it } from 'vitest';
import { rijgenAftrekken, rijgenOptellen, stepText, stepsAtLevel, workedSteps, type StepLine } from '../services/math/workedSteps';
import type { Equation } from '../services/math/types';
import { REGISTRY } from '../config/exerciseRegistry';

const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const text = (lines: StepLine[]) => lines.map(l => stepText(l.tokens));

// Evaluates a line's tokens left to right: rijgen only chains + or −, so brackets never change the value.
function evalLine(l: StepLine): number {
    let sum = 0, sign = 1;
    for (const t of l.tokens) {
        if (t.t === 'op') sign = t.op === '-' ? -1 : 1;
        else if (t.t === 'num') { sum += sign * t.v; sign = 1; }
    }
    return sum;
}

describe('rijgen optellen: the owner\'s whiteboard (2026-11-12)', () => {
    it('reproduces 475 + 368 line for line, with the crossed lines as the optional ones', () => {
        const lines = workedSteps(eq(475, 368))!;
        expect(text(lines)).toEqual([
            '(475 + 300) + 60 + 8',
            '(775 + 60) + 8',
            '(775 + 30) + 30 + 8',
            '805 + 30 + 8',
            '835 + 8',
            '(835 + 5) + 3',
            '840 + 3',
            '843',
        ]);
        expect(lines.map(l => l.basis)).toEqual([true, false, true, false, false, true, false, true]);
    });
});

describe('golden cases (Basis)', () => {
    const cases: [number, number, string[]][] = [
        [238, 145, ['(238 + 100) + 40 + 5', '(338 + 40) + 5', '(378 + 2) + 3', '383']],
        [423, 256, ['(423 + 200) + 50 + 6', '(623 + 50) + 6', '673 + 6', '679']],
        [586, 347, ['(586 + 300) + 40 + 7', '(886 + 20) + 20 + 7', '(926 + 4) + 3', '933']],
        [475, 308, ['(475 + 300) + 8', '(775 + 5) + 3', '783']],
        [435, 165, ['(435 + 100) + 60 + 5', '(535 + 60) + 5', '595 + 5', '600']],
    ];
    it.each(cases)('%i + %i', (a, b, basis) => {
        expect(text(stepsAtLevel(workedSteps(eq(a, b))!, 'basis'))).toEqual(basis);
    });
});

describe('sweep: every a + b with a >= 10 and a + b <= 1000', () => {
    it('keeps every invariant', () => {
        let max = 0;
        for (let a = 10; a <= 999; a++) {
            for (let b = 1; a + b <= 1000; b++) {
                const lines = rijgenOptellen(a, b);
                max = Math.max(max, lines.length);
                for (const l of lines) {
                    if (evalLine(l) !== a + b) throw new Error(`${a} + ${b}: "${stepText(l.tokens)}" is not ${a + b}`);
                    const first = l.tokens[0], last = l.tokens[l.tokens.length - 1];
                    if (first.t === 'open' && last.t === 'close') throw new Error(`${a} + ${b}: a bracket spans the whole line`);
                }
                const lastLine = lines[lines.length - 1];
                if (lastLine.kind !== 'answer' || lastLine.tokens.length !== 1) throw new Error(`${a} + ${b}: no answer line`);
                if (!lines[0].basis || !lastLine.basis) throw new Error(`${a} + ${b}: Basis lost the first line or the answer`);
                for (let i = 0; i < lines.length; i++) {
                    const l = lines[i];
                    if (l.kind !== 'split') continue;
                    // The fill carries over at its own place: that digit becomes 0 (775 + 30 = 805).
                    const filled = lines[i + 1].tokens[0];
                    const fillPart = l.tokens[3];
                    if (filled.t !== 'num' || fillPart.t !== 'num') throw new Error('bad split shape');
                    const place = 10 ** (String(fillPart.v).length - 1);
                    if (Math.floor(filled.v / place) % 10 !== 0) throw new Error(`${a} + ${b}: fill ${fillPart.v} lands on ${filled.v}`);
                }
            }
        }
        // 3 moves, each a brug, is the longest: 8 lines (e.g. 22 + 199).
        expect(max).toBe(8);
    });
});

describe('aftrekken: a brug on a 0 digit, from the round number in one step (owner, 2026-11-13)', () => {
    const sub = (a: number, b: number) => eq(a, b, { operator: '-', answer: a - b });
    it.each<[number, number, string[]]>([
        [350, 152, ['(350 − 100) − 50 − 2', '(250 − 50) − 2', '200 − 2', '198']],
        [900, 415, ['(900 − 400) − 10 − 5', '500 − 10 − 5', '490 − 5', '485']],
        [708, 699, ['(708 − 600) − 90 − 9', '108 − 90 − 9', '(18 − 8) − 1', '9']],
        [503, 128, ['(503 − 100) − 20 − 8', '403 − 20 − 8', '(383 − 3) − 5', '375']],
    ])('%i − %i', (a, b, basis) => {
        expect(text(stepsAtLevel(workedSteps(sub(a, b))!, 'basis'))).toEqual(basis);
    });
});

describe('shapes without a strategy return null', () => {
    it.each([
        ['times one', eq(1, 7, { operator: 'x', answer: 7 })],
        ['aftrekken onder nul', eq(188, 247, { operator: '-', answer: -59 })],
        ['gemengd tienvoud variant', eq(46, 10, { operator: 'x', answer: 460, variant: 'x:tienvoud' })],
        ['3 terms', { ...eq(100, 200), operands: [100, 200, 300], answer: 600 }],
        ['puntoefening', eq(475, 368, { missingTerm: 'operand2' })],
        ['puntoefening multi', eq(475, 368, { missingIndex: 1 })],
        ['met rest', eq(475, 368, { remainder: 1 })],
        ['three decimals', eq(0.125, 0.4)],
        ['answer above 10 000', eq(9675, 4438)],
        ['decimal too big for eenheden', eq(36.8, 4.5)],
        ['first operand below 10', eq(8, 55)],
        ['a fact: E + E without a brug', eq(3, 4)],
        ['a fact: E − E', eq(9, 4, { operator: '-', answer: 5 })],
        ['5 + 5 lands on a tiental', eq(5, 5)],
        ['10 − 4: a tiental on a 0 digit', eq(10, 4, { operator: '-', answer: 6 })],
        ['tiental + E', eq(40, 5)],
        ['T + T', eq(40, 30)],
        ['a variant of another operator', eq(475, 29, { variant: '-:compenseren' })],
    ])('%s', (_name, e) => {
        expect(workedSteps(e as Equation)).toBeNull();
    });

    it('a tienvoud or puntoefening block; compenseren has its own strategy (workedSteps.muldiv.test.ts)', () => {
        expect(workedSteps(eq(475, 368), { preset: 'tienvoud' })).toBeNull();
        expect(workedSteps(eq(475, 364), { preset: 'compenseren' })).toBeNull();
        expect(workedSteps(eq(475, 368), { equationType: 'puntoefening' })).toBeNull();
        expect(workedSteps(eq(475, 368), { preset: 'vrij' })).not.toBeNull();
    });

    it('a fraction operand', () => {
        expect(workedSteps({ ...eq(1, 2), operands: [{ numerator: 1, denominator: 2 }, 300] } as unknown as Equation)).toBeNull();
    });
});

describe('registry wiring', () => {
    it('every hoofdrekenen row offers steps, through the same function', () => {
        for (const id of ['hr-std-optellen', 'hr-std-aftrekken', 'hr-std-vermenigvuldigen', 'hr-std-delen', 'hr-std-gemengd']) {
            expect(REGISTRY[id].steps, id).toBeTypeOf('function');
        }
        expect(REGISTRY['hr-std-optellen'].steps!(eq(475, 368), {})).not.toBeNull();
        expect(REGISTRY['hr-std-aftrekken'].steps!(eq(475, 368, { operator: '-' }), {})).not.toBeNull();
        expect(REGISTRY['hr-std-vermenigvuldigen'].steps!(eq(1, 7, { operator: 'x' }), {})).toBeNull();
        expect(REGISTRY['hr-std-vermenigvuldigen'].steps!(eq(5, 65, { operator: 'x' }), {})).not.toBeNull();
        expect(REGISTRY['hr-std-delen'].handig!(eq(57, 3, { operator: ':' }), {}).map(h => h.name)).toEqual(['Compenseren']);
    });
});

const sub = (a: number, b: number) => eq(a, b, { operator: '-', answer: a - b });

describe('rijgen aftrekken: the owner\'s whiteboard (2026-11-12)', () => {
    it('reproduces 247 − 188 line for line, with the crossed lines as the optional ones', () => {
        const lines = workedSteps(sub(247, 188))!;
        expect(text(lines)).toEqual([
            '(247 − 100) − 80 − 8',
            '147 − 80 − 8',
            '(147 − 40) − 40 − 8',
            '107 − 40 − 8',
            '67 − 8',
            '(67 − 7) − 1',
            '60 − 1',
            '59',
        ]);
        expect(lines.map(l => l.basis)).toEqual([true, false, true, false, false, true, false, true]);
    });

    it.each([
        [589, 234, ['(589 − 200) − 30 − 4', '(389 − 30) − 4', '359 − 4', '355']],
        [642, 317, ['(642 − 300) − 10 − 7', '(342 − 10) − 7', '(332 − 2) − 5', '325']],
        [731, 459, ['(731 − 400) − 50 − 9', '(331 − 30) − 20 − 9', '(281 − 1) − 8', '272']],
    ])('%i − %i (Basis, derived)', (a, b, basis) => {
        expect(text(stepsAtLevel(workedSteps(sub(a as number, b as number))!, 'basis'))).toEqual(basis);
    });

    it('sweep: every a − b with 10 <= a <= 1000 keeps the invariants (a 0-digit brug included since 2026-11-13)', () => {
        let max = 0, nulls = 0;
        for (let a = 10; a <= 1000; a++) {
            for (let b = 1; b <= a; b++) {
                const lines = rijgenAftrekken(a, b);
                if (!lines) { nulls++; continue; }
                max = Math.max(max, lines.length);
                for (const l of lines) if (evalLine(l) !== a - b) throw new Error(`${a} − ${b}: "${stepText(l.tokens)}" is not ${a - b}`);
                const last = lines[lines.length - 1];
                if (last.kind !== 'answer' || last.tokens.length !== 1 || !lines[0].basis) throw new Error(`${a} − ${b}: bad shape`);
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].kind !== 'split') continue;
                    // The fill lands on the round number at its own place: that digit becomes 0 (147 − 40 = 107).
                    const filled = lines[i + 1].tokens[0], fillPart = lines[i].tokens[3];
                    if (filled.t !== 'num' || fillPart.t !== 'num') throw new Error('bad split shape');
                    const place = 10 ** (String(fillPart.v).length - 1);
                    if (Math.floor(filled.v / place) % 10 !== 0) throw new Error(`${a} − ${b}: fill ${fillPart.v} lands on ${filled.v}`);
                }
            }
        }
        expect(max).toBe(8);
        expect(nulls).toBe(0);
    });
});

describe('rijgen above 1000 (owner, 2026-11-13)', () => {
    it('line for line, brug through the thousands', () => {
        expect(text(workedSteps(eq(4750, 3680))!)).toEqual([
            '(4750 + 3000) + 600 + 80', '(7750 + 600) + 80', '(7750 + 300) + 300 + 80', '8050 + 300 + 80', '8350 + 80', '(8350 + 50) + 30', '8400 + 30', '8430',
        ]);
        expect(text(stepsAtLevel(workedSteps(eq(1475, 368))!, 'basis'))).toEqual(['(1475 + 300) + 60 + 8', '(1775 + 30) + 30 + 8', '(1835 + 5) + 3', '1843']);
    });
    it('aftrekken, incl. the one-step brug on a 0 digit', () => {
        expect(text(workedSteps(sub(8203, 1456))!)[0]).toBe('(8203 − 1000) − 400 − 50 − 6');
        expect(text(workedSteps(sub(9800, 405))!)).toEqual(['(9800 − 400) − 5', '9400 − 5', '9395']);
    });
    it('sweeps keep the invariants up to 10 000', () => {
        for (let a = 1001; a <= 10000; a += 37) {
            for (let b = 11; b <= 9999; b += 211) {
                if (a + b <= 10000) for (const l of rijgenOptellen(a, b)) if (evalLine(l) !== a + b) throw new Error(`${a} + ${b}: ${stepText(l.tokens)}`);
                if (b <= a) for (const l of rijgenAftrekken(a, b)!) if (evalLine(l) !== a - b) throw new Error(`${a} − ${b}: ${stepText(l.tokens)}`);
            }
        }
    });
});

describe('kommagetallen + and − via eenheden (owner, 2026-11-13)', () => {
    const fmt = (n: number) => String(n).replace('.', ',');
    const it2 = (a: number, o: '+' | '-', b: number) => workedSteps(eq(a, b, { operator: o }))?.map(l => stepText(l.tokens, fmt));
    it('line for line', () => {
        expect(it2(0.6, '+', 0.8)).toEqual(['6 t + 8 t', '14 t', '1,4']);
        expect(it2(0.25, '+', 0.5)).toEqual(['25 h + 50 h', '75 h', '0,75']);
        expect(it2(1.2, '-', 0.5)).toEqual(['12 t − 5 t', '7 t', '0,7']);
        expect(it2(2, '+', 0.5)).toEqual(['20 t + 5 t', '25 t', '2,5']);
    });
    it('null outside the mental range', () => {
        expect(it2(0.5, '-', 0.8)).toBeUndefined();
        expect(it2(0.125, '+', 0.5)).toBeUndefined();
        expect(it2(36.8, '+', 4.5)).toBeUndefined();
    });
    it('every line evaluates to the answer', () => {
        const val = (l: StepLine) => {
            const nums = l.tokens.filter(t => t.t === 'num').map(t => (t as { v: number }).v);
            const sc = l.tokens.some(t => t.t === 'unit') ? 1 : 0;
            return { nums, sc };
        };
        for (const dp of [1, 2]) for (let x = 1; x <= 150; x += 7) for (let y = 1; y <= 150; y += 11) for (const o of ['+', '-'] as const) {
            const a = x / 10 ** dp, b = y / 10 ** dp;
            // Two whole numbers (12 + 10) go by the whole-number strategies.
            if (Number.isInteger(a) && Number.isInteger(b)) continue;
            const ls = workedSteps(eq(Number(a.toFixed(dp)), Number(b.toFixed(dp)), { operator: o }));
            if (!ls) { expect(o === '-' && y > x).toBe(true); continue; }
            // A line's unit scale follows the finer operand, so check against the values, not x and y.
            const want = o === '+' ? a + b : a - b;
            expect(ls[2].tokens[0]).toMatchObject({ t: 'num' });
            expect(val(ls[2]).nums[0]).toBeCloseTo(want, 9);
            const u = (ls[1].tokens[1] as { u: 't' | 'h' }).u === 't' ? 10 : 100;
            expect(val(ls[1]).nums[0] / u).toBeCloseTo(want, 9);
        }
    });
});

// Small sums (owner, 2026-11-14): one place-value part, so the first rijgen line would only repeat the sum.
describe('one place-value part: brug to the tiental, else work at that place', () => {
    const steps = (a: number, o: '+' | '-', b: number) => workedSteps(eq(a, b, { operator: o, answer: o === '+' ? a + b : a - b }));
    it.each<[number, '+' | '-', number, string[], boolean[]]>([
        [8, '+', 5, ['(8 + 2) + 3', '10 + 3', '13'], [true, false, true]],
        [49, '+', 5, ['(49 + 1) + 4', '50 + 4', '54'], [true, false, true]],
        [67, '+', 8, ['(67 + 3) + 5', '70 + 5', '75'], [true, false, true]],
        [13, '-', 5, ['(13 − 3) − 2', '10 − 2', '8'], [true, false, true]],
        [53, '-', 7, ['(53 − 3) − 4', '50 − 4', '46'], [true, false, true]],
        [14, '+', 3, ['10 + (4 + 3)', '10 + 7', '17'], [true, false, true]],
        [17, '-', 5, ['10 + (7 − 5)', '10 + 2', '12'], [true, false, true]],
        [64, '+', 5, ['60 + (4 + 5)', '60 + 9', '69'], [true, false, true]],
        [264, '+', 5, ['260 + (4 + 5)', '260 + 9', '269'], [true, false, true]],
        [47, '+', 3, ['40 + (7 + 3)', '40 + 10', '50'], [true, false, true]],
        [47, '+', 30, ['(40 + 30) + 7', '70 + 7', '77'], [true, false, true]],
        [85, '-', 40, ['(80 − 40) + 5', '40 + 5', '45'], [true, false, true]],
        [247, '+', 30, ['(240 + 30) + 7', '270 + 7', '277'], [true, false, true]],
        [87, '+', 30, ['(87 + 20) + 10', '107 + 10', '117'], [true, false, true]],
        [125, '-', 40, ['(125 − 20) − 20', '105 − 20', '85'], [true, false, true]],
        [280, '+', 30, ['(280 + 20) + 10', '300 + 10', '310'], [true, false, true]],
    ])('%i %s %i', (a, o, b, want, basis) => {
        const lines = steps(a, o, b)!;
        expect(text(lines)).toEqual(want);
        expect(lines.map(l => l.basis)).toEqual(basis);
    });

    it('no steps where they would only repeat the sum or a fact', () => {
        for (const [a, o, b] of [[3, '+', 4], [5, '+', 5], [7, '+', 3], [9, '-', 4], [10, '-', 4], [50, '-', 7], [100, '-', 5], [40, '+', 5], [47, '-', 7], [45, '-', 40], [80, '-', 40], [12, '+', 300], [7, '+', 30]] as const) {
            expect(steps(a, o, b), `${a} ${o} ${b}`).toBeNull();
        }
    });

    it('sweep: every + and − up to 1000 with one part keeps the invariants', () => {
        let count = 0;
        for (let a = 1; a <= 1000; a++) {
            for (const b of [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(d => [d, d * 10, d * 100])) {
                for (const o of ['+', '-'] as const) {
                    if (o === '+' ? a + b > 1000 : b > a) continue;
                    const lines = steps(a, o, b);
                    if (!lines) continue;
                    count++;
                    const want = o === '+' ? a + b : a - b;
                    for (const l of lines) {
                        if (evalLine(l) !== want) throw new Error(`${a} ${o} ${b}: "${stepText(l.tokens)}" is not ${want}`);
                        const first = l.tokens[0], last = l.tokens[l.tokens.length - 1];
                        if (first.t === 'open' && last.t === 'close') throw new Error(`${a} ${o} ${b}: a bracket spans the whole line`);
                    }
                    const end = lines[lines.length - 1];
                    if (lines.length !== 3 || end.kind !== 'answer' || end.tokens.length !== 1 || !lines[0].basis || !end.basis || lines[1].basis) throw new Error(`${a} ${o} ${b}: bad shape`);
                    // The brug lands on a round number at the part's place (49 + 1 = 50).
                    if (lines[0].kind === 'split') {
                        const place = 10 ** (String(b).length - 1), v = lines[1].tokens[0];
                        if (v.t !== 'num' || Math.floor(v.v / place) % 10 !== 0) throw new Error(`${a} ${o} ${b}: fill misses the round number`);
                    }
                }
            }
        }
        expect(count).toBeGreaterThan(8000);
    });

    it('sweep: every small sum up to 100 either has no steps or lines that all equal the answer', () => {
        for (let a = 0; a <= 100; a++) for (let b = 0; b <= 100; b++) for (const o of ['+', '-'] as const) {
            if (o === '+' ? a + b > 100 : b > a) continue;
            const lines = steps(a, o, b);
            const want = o === '+' ? a + b : a - b;
            if (lines) for (const l of lines) if (evalLine(l) !== want) throw new Error(`${a} ${o} ${b}: "${stepText(l.tokens)}"`);
            // E + E and E − E without a brug never get steps.
            if (a < 10 && b < 10 && (o === '-' || a + b <= 10)) expect(lines, `${a} ${o} ${b}`).toBeNull();
        }
    });

    it('a sum that already had steps keeps them: two parts still go by rijgen', () => {
        expect(text(steps(47, '+', 38)!)[0]).toBe('(47 + 30) + 8');
        expect(text(steps(53, '-', 27)!)[0]).toBe('(53 − 20) − 7');
    });
});
