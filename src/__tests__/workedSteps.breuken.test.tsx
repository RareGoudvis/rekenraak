// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { handigSteps, stepText, stepsAtLevel, workedSteps, type StepLine, type StepToken } from '../services/math/workedSteps';
import { StepLineView } from '../components/viewer/StepTokens';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, MathBlock } from '../services/math/types';

// Via breuken (Op.stap 2.2.GL6.37): the standard for kommagetal × kommagetal and anything : a kommagetal,
// an extra handig view next to eenheden for kommagetal : natuurlijk getal.

afterEach(cleanup);

const e = (a: number, op: Equation['operator'], b: number): Equation =>
    ({ id: 'x', operands: [a, b], operator: op, answer: 0, isManuallyEdited: false });
const fmt = (n: number) => String(n).replace('.', ',');
const text = (lines: StepLine[] | null) => lines!.map(l => stepText(l.tokens, fmt));
const viaBreuken = (eq: Equation) => handigSteps(eq).find(h => h.name === 'Via breuken')?.lines ?? null;

const UNIT: Record<string, number> = { T: 10, H: 100, D: 1000, t: 0.1, h: 0.01, d: 0.001 };

// Brackets, × and : before + and −; a breuk is its value, a unit multiplies the number before it.
function evalLine(tokens: StepToken[]): number {
    const flat: (number | string)[] = [];
    for (const t of tokens) {
        if (t.t === 'num') flat.push(t.v);
        else if (t.t === 'frac') flat.push(t.n / t.d);
        else if (t.t === 'unit') flat.push((flat.pop() as number) * UNIT[t.u]);
        else if (t.t === 'op') flat.push(t.op);
        else flat.push(t.t === 'open' ? '(' : ')');
    }
    let i = 0;
    const factor = (): number => { const tok = flat[i++]; if (tok === '(') { const v = sum(); i++; return v; } return tok as number; };
    const product = (): number => { let v = factor(); while (flat[i] === 'x' || flat[i] === ':') { const o = flat[i++]; const r = factor(); v = o === 'x' ? v * r : v / r; } return v; };
    const sum = (): number => { let v = product(); while (flat[i] === '+' || flat[i] === '-') { const o = flat[i++]; const r = product(); v = o === '+' ? v + r : v - r; } return v; };
    return sum();
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('Op.stap 2.2.GL6.37, line for line', () => {
    it.each<[string, Equation, string[]]>([
        ['0,72 : 0,8', e(0.72, ':', 0.8), ['72/100 : 8/10', '72/100 × 10/8', '720/800', '9/10', '0,9']],
        ['70 : 3,5', e(70, ':', 3.5), ['70 : 35/10', '70 × 10/35', '700/35', '20']],
        ['5,4 : 1,2', e(5.4, ':', 1.2), ['54/10 : 12/10', '54/10 × 10/12', '540/120', '9/2', '4,5']],
        ['0,4 × 0,3', e(0.4, 'x', 0.3), ['4/10 × 3/10', '12/100', '0,12']],
    ])('%s is the standard method', (_name, eq, lines) => {
        expect(text(workedSteps(eq))).toEqual(lines);
        expect(text(stepsAtLevel(workedSteps(eq)!, 'basis'))).toEqual(lines);
        expect(viaBreuken(eq)).toBeNull();
    });

    it('5,4 : 9 keeps eenheden as the standard and offers Via breuken', () => {
        expect(text(workedSteps(e(5.4, ':', 9)))).toEqual(['54 t : 9', '6 t', '0,6']);
        expect(text(viaBreuken(e(5.4, ':', 9)))).toEqual(['54/10 : 9', '6/10', '0,6']);
    });

    it('0,6 × 3 keeps eenheden and offers Via breuken in the order written', () => {
        expect(text(workedSteps(e(0.6, 'x', 3)))).toEqual(['3 × 0,6', '3 × 6 t', '18 t', '1,8']);
        expect(text(viaBreuken(e(0.6, 'x', 3)))).toEqual(['6/10 × 3', '18/10', '1,8']);
    });

    it('a kommagetal : natuurlijk getal past eenheden goes via breuken', () => {
        expect(text(workedSteps(e(48.6, ':', 6)))).toEqual(['486/10 : 6', '81/10', '8,1']);
        expect(handigSteps(e(48.6, ':', 6))).toEqual([]);
    });

    it('a breuk reads as teller/noemer in plain text', () => {
        expect(stepText([{ t: 'frac', n: 54, d: 10 }, { t: 'op', op: ':' }, { t: 'num', v: 9 }])).toBe('54/10 : 9');
    });
});

describe('outside the range: no breuken steps', () => {
    it.each<[string, Equation]>([
        ['3 decimals', e(0.125, 'x', 0.4)],
        ['a teller above 1000', e(123.4, ':', 0.2)],
        ['a quotient that is no kommagetal', e(1, ':', 0.3)],
        ['a product above 10 000', e(99.9, 'x', 99.9)],
        ['a natural divisor that does not divide the teller', e(4.5, ':', 2)],
        ['a natural factor above 100', e(0.5, 'x', 300)],
        ['× 1', e(1, 'x', 0.4)],
    ])('%s', (_name, eq) => {
        expect(workedSteps(eq)).toBeNull();
        expect(viaBreuken(eq)).toBeNull();
    });
});

describe('every line equals the answer', () => {
    it('tenths and hundredths, × and :', () => {
        const values = [0.2, 0.4, 0.5, 0.6, 0.8, 1.2, 2.5, 3.5, 4.8, 7.2, 0.25, 0.72, 0.04, 0.06, 12.5, 48.6];
        const naturals = [2, 3, 4, 6, 9, 12, 20, 70, 100];
        let checked = 0;
        const eqs: Equation[] = [];
        for (const x of values) {
            for (const y of values) eqs.push(e(x, 'x', y), e(Number((x * y).toFixed(4)), ':', y));
            for (const n of naturals) eqs.push(e(x, 'x', n), e(n, 'x', x), e(n, ':', x), e(Number((x * n).toFixed(4)), ':', n));
        }
        for (const eq of eqs) {
            const [p, q] = eq.operands as number[];
            const want = eq.operator === 'x' ? p * q : p / q;
            for (const lines of [workedSteps(eq), viaBreuken(eq)]) {
                if (!lines) continue;
                for (const l of lines) expect(close(evalLine(l.tokens), want), `${p} ${eq.operator} ${q}: ${stepText(l.tokens, fmt)}`).toBe(true);
                // It ends on the kommagetal (or whole number), never on a breuk.
                const last = lines[lines.length - 1].tokens;
                expect(last.length === 1 && last[0].t === 'num', stepText(last, fmt)).toBe(true);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(300);
    });

    it('every breuk after × the omgekeerde is vereenvoudigd once, fully', () => {
        const lines = workedSteps(e(0.72, ':', 0.8))!;
        const simplified = lines.find(l => l.kind === 'simplify')!.tokens[0];
        expect(simplified).toEqual({ t: 'frac', n: 9, d: 10 });
        // 700/35 is 20 at once: no "20/1" in between.
        expect(workedSteps(e(70, ':', 3.5))!.some(l => l.kind === 'simplify')).toBe(false);
    });
});

describe('rendering', () => {
    it('a breuk is stacked; a line without one stays a plain string', () => {
        const [first] = workedSteps(e(5.4, ':', 1.2))!;
        const c = render(<StepLineView line={first} fmt={fmt} />).container;
        expect(c.querySelectorAll('[role="math"]')).toHaveLength(2);
        expect(c.textContent).toBe('= 5410 : 1210');
        cleanup();
        const plain = workedSteps(e(5.4, ':', 9))![0];
        expect(render(<StepLineView line={plain} fmt={fmt} />).container.innerHTML).toBe('= 54 t : 9');
    });

    it('the answer key stacks the breuken under the sum', () => {
        const block: MathBlock = {
            ...makeBlock('hr-std-delen', { id: 'del', constraints: { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, solutionSteps: 'basis' } }),
            exercises: [{ ...e(0.72, ':', 0.8), answer: 0.9 }],
        };
        const c = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><MathBlockRenderer block={block} showSolutions /></BlockWidthProvider>).container;
        expect(c.querySelectorAll('[role="math"]').length).toBe(2 + 2 + 1 + 1);
        expect((c.textContent ?? '').replace(/\s+/g, ' ')).toContain('=0,9');
    });
});
