import { describe, expect, it } from 'vitest';
import { handigSteps, stepText, stepsAtLevel, workedSteps, type StepLine, type StepToken } from '../services/math/workedSteps';
import type { Equation } from '../services/math/types';

// × and : worked steps in the owner's notation (5 × 65, 2340 : 3) and the Op.stap examples (2.2.GL3–GL6),
// plus handig rekenen, the optional view for pupils.

const e = (a: number, op: Equation['operator'], b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: op, answer: 0, isManuallyEdited: false, ...extra });
const fmt = (n: number) => String(n).replace('.', ',');
const text = (lines: StepLine[]) => lines.map(l => stepText(l.tokens, fmt));
const basis = (lines: StepLine[] | null) => text(stepsAtLevel(lines!, 'basis'));

const UNIT: Record<string, number> = { T: 10, H: 100, D: 1000, t: 0.1, h: 0.01, d: 0.001 };

// A real evaluator: brackets, × and : before + and −, a unit multiplies the number before it.
function evalLine(tokens: StepToken[]): number {
    const flat: (number | string)[] = [];
    for (const t of tokens) {
        if (t.t === 'num') flat.push(t.v);
        else if (t.t === 'unit') flat.push((flat.pop() as number) * UNIT[t.u]);
        else if (t.t === 'op') flat.push(t.op);
        else flat.push(t.t === 'open' ? '(' : ')');
    }
    let i = 0;
    const factor = (): number => {
        const tok = flat[i++];
        if (tok === '(') { const v = sum(); i++; return v; }
        return tok as number;
    };
    const product = (): number => {
        let v = factor();
        while (flat[i] === 'x' || flat[i] === ':') { const o = flat[i++]; const r = factor(); v = o === 'x' ? v * r : v / r; }
        return v;
    };
    const sum = (): number => {
        let v = product();
        while (flat[i] === '+' || flat[i] === '-') { const o = flat[i++]; const r = product(); v = o === '+' ? v + r : v - r; }
        return v;
    };
    return sum();
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('the owner\'s examples (2026-11-12)', () => {
    it('5 × 65 by splitsen en verdelen', () => {
        expect(basis(workedSteps(e(5, 'x', 65)))).toEqual(['5 × (60 + 5)', '(5 × 60) + (5 × 5)', '300 + 25', '325']);
    });
    it('2340 : 3, opgaand', () => {
        expect(basis(workedSteps(e(2340, ':', 3)))).toEqual(['(2100 + 240) : 3', '(2100 : 3) + (240 : 3)', '700 + 80', '780']);
    });
    it('Alle stappen only works out the final sum when it needs a carry', () => {
        expect(text(workedSteps(e(5, 'x', 65))!)).toEqual(['5 × (60 + 5)', '(5 × 60) + (5 × 5)', '300 + 25', '325']);
        const all = text(workedSteps(e(7, 'x', 389))!);
        expect(all).toContain('2660 + 63');
        expect(stepsAtLevel(workedSteps(e(7, 'x', 389))!, 'basis').map(l => stepText(l.tokens))).not.toContain('2660 + 63');
    });
});

describe('Op.stap examples, line for line', () => {
    it.each<[string, Equation, string[]]>([
        ['3 × 24 (GL3.34)', e(3, 'x', 24), ['3 × (20 + 4)', '(3 × 20) + (3 × 4)', '60 + 12', '72']],
        ['13 × 24 (GL4.33)', e(13, 'x', 24), ['(10 + 3) × 24', '(10 × 24) + (3 × 24)', '240 + (3 × 20) + (3 × 4)', '240 + 60 + 12', '312']],
        ['65 × 5 keeps the order', e(65, 'x', 5), ['(60 + 5) × 5', '(60 × 5) + (5 × 5)', '300 + 25', '325']],
        ['45 : 3 (GL3.20)', e(45, ':', 3), ['(30 + 15) : 3', '(30 : 3) + (15 : 3)', '10 + 5', '15']],
        ['8 × 60 (GL3.42)', e(8, 'x', 60), ['8 × 6 T', '48 T', '480']],
        ['80 × 60 (GL4.46)', e(80, 'x', 60), ['8 × 10 × 6 × 10', '8 × 6 × 100', '4800']],
        ['480 : 6 by analogy', e(480, ':', 6), ['48 T : 6', '8 T', '80']],
        ['0,6 × 3 (GL5.21)', e(0.6, 'x', 3), ['3 × 0,6', '3 × 6 t', '18 t', '1,8']],
        ['0,08 : 2 (GL5.22)', e(0.08, ':', 2), ['8 h : 2', '4 h', '0,04']],
    ])('%s', (_name, eq, lines) => {
        expect(basis(workedSteps(eq))).toEqual(lines);
    });
});

describe('handig rekenen: an optional view, never the standard method', () => {
    it.each<[string, Equation, string, string[]]>([
        ['9 × 13 (GL4.23)', e(9, 'x', 13), 'Compenseren', ['(10 − 1) × 13', '(10 × 13) − (1 × 13)', '130 − 13', '117']],
        ['98 × 12 (GL6.34)', e(98, 'x', 12), 'Compenseren', ['(100 − 2) × 12', '(100 × 12) − (2 × 12)', '1200 − 24', '1176']],
        ['57 : 3 (GL4.12)', e(57, ':', 3), 'Compenseren', ['(60 − 3) : 3', '(60 : 3) − (3 : 3)', '20 − 1', '19']],
        ['62 300 : 7 (GL6.13)', e(62300, ':', 7), 'Compenseren', ['(63000 − 700) : 7', '(63000 : 7) − (700 : 7)', '9000 − 100', '8900']],
        ['25 × 32 (GL6.35)', e(25, 'x', 32), 'Ontbinden', ['25 × 4 × 8', '100 × 8', '800']],
        ['3000 : 12 (GL6.36)', e(3000, ':', 12), 'Ontbinden', ['3000 : 3 : 4', '1000 : 4', '250']],
        ['140 + 99 (GL3.40)', e(140, '+', 99), 'Compenseren', ['140 + 100 − 1', '240 − 1', '239']],
    ])('%s', (_name, eq, name, lines) => {
        const found = handigSteps(eq).find(h => h.name === name);
        expect(found, name).toBeTruthy();
        expect(text(found!.lines)).toEqual(lines);
    });

    it('a compenseren block makes compenseren its standard method, so it is not offered twice', () => {
        expect(basis(workedSteps(e(475, '+', 368), { preset: 'compenseren' }))).toEqual(['475 + 370 − 2', '845 − 2', '843']);
        expect(handigSteps(e(475, '+', 368), { preset: 'compenseren' })).toEqual([]);
        expect(basis(workedSteps(e(475, '-', 29, { variant: '-:compenseren' })))).toEqual(['475 − 30 + 1', '445 + 1', '446']);
    });
});

describe('tafels: herhaalde optelling and jumps (Op.stap 2.2.GL2.33 / GL2.34)', () => {
    it('3 × 2 = 2 + 2 + 2 = 6, with the counting row under Alle', () => {
        expect(basis(workedSteps(e(3, 'x', 2)))).toEqual(['2 + 2 + 2', '6']);
        expect(text(workedSteps(e(3, 'x', 2))!)).toEqual(['2 + 2 + 2', '2, 4, 6', '6']);
    });
    it('20 : 4 counted in jumps from 0', () => {
        expect(basis(workedSteps(e(20, ':', 4)))).toEqual(['0, 4, 8, 12, 16, 20', '5']);
    });
});

describe('shapes without × / : steps', () => {
    it.each<[string, Equation]>([
        ['times one', e(1, 'x', 7)],
        ['ten groups (10 × 7 is read as 7 T)', e(10, 'x', 7)],
        ['a deeltafel with quotient 1', e(7, ':', 7)],
        ['met rest', e(55, ':', 6, { remainder: 1 })],
        ['a divisor of 10 or more', e(240, ':', 12)],
        ['niet opgaand without a rest field', e(55, ':', 6)],
        ['above 10 000', e(99, 'x', 999)],
        ['a puntoefening', e(5, 'x', 65, { missingTerm: 'operand2' })],
        ['a tienvoud variant', e(46, 'x', 10, { variant: 'x:tienvoud' })],
        ['kommagetal × kommagetal', e(0.6, 'x', 0.3)],
    ])('%s', (_name, eq) => {
        expect(workedSteps(eq)).toBeNull();
    });
    it('a tienvoud block', () => {
        expect(workedSteps(e(5, 'x', 65), { preset: 'tienvoud' })).toBeNull();
    });
});

describe('every line equals the answer', () => {
    it('× up to 10 000 and every : with a one-digit divisor', () => {
        let checked = 0;
        for (let a = 2; a <= 120; a++) {
            for (let b = 2; b <= 400; b += a < 20 ? 1 : 7) {
                for (const [x, op, y] of [[a, 'x', b], [a * b, ':', b <= 9 ? b : 0]] as [number, Equation['operator'], number][]) {
                    if (!y) continue;
                    const eq = e(x, op, y);
                    const want = op === 'x' ? x * y : x / y;
                    for (const lines of [workedSteps(eq), ...handigSteps(eq).map(h => h.lines)]) {
                        if (!lines) continue;
                        for (const l of lines) {
                            // A counting row lists jumps or running totals, not an equality: it must end on the answer's value.
                            if (l.kind === 'multiples') { const last = l.tokens[l.tokens.length - 1]; expect(last.t === 'num' && (op === 'x' ? last.v === want : last.v === x), stepText(l.tokens)).toBe(true); continue; }
                            expect(close(evalLine(l.tokens), want), `${x} ${op} ${y}: ${stepText(l.tokens)}`).toBe(true);
                        }
                        checked++;
                    }
                }
            }
        }
        expect(checked).toBeGreaterThan(1000);
    });

    it('kommagetallen via eenheden', () => {
        for (const x of [0.2, 0.6, 0.9, 1.2, 0.04, 0.08, 0.15, 0.006]) {
            for (const n of [2, 3, 4, 5, 9]) {
                for (const eq of [e(x, 'x', n), e(n, 'x', x), e(x * n, ':', n)]) {
                    const lines = workedSteps({ ...eq, operands: eq.operands.map(v => Number((v as number).toFixed(6))) });
                    if (!lines) continue;
                    const [p, q] = eq.operands as number[];
                    const want = eq.operator === 'x' ? p * q : p / q;
                    for (const l of lines) expect(close(evalLine(l.tokens), want), stepText(l.tokens)).toBe(true);
                }
            }
        }
    });
});
