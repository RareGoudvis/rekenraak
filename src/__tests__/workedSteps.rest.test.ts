import { describe, expect, it } from 'vitest';
import { handigSteps, stepLineText, stepText, workedSteps, type StepLine, type StepToken } from '../services/math/workedSteps';
import { decodeTutor, encodeTutorPage } from '../services/oefenen/tutorPayload';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, MathBlock } from '../services/math/types';

// Delen met rest: the owner's tafel method (55 : 6) and Op.stap 2.2.GL5.19 (235 : 3), checked line by line
// and by evaluating every line against the sum.

const rest = (a: number, d: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'r', operands: [a, d], operator: ':', answer: Math.floor(a / d), remainder: a % d, isManuallyEdited: false, ...extra });
const lines = (eq: Equation) => workedSteps(eq)!.map(l => stepLineText(l));

// Brackets, × and : before + and −; no units or asides inside.
function evalTokens(tokens: StepToken[]): number {
    let i = 0;
    const factor = (): number => {
        const t = tokens[i++];
        if (t.t === 'open') { const v = sum(); i++; return v; }
        if (t.t !== 'num') throw new Error(`unexpected ${t.t}`);
        return t.v;
    };
    const product = (): number => {
        let v = factor();
        for (let t = tokens[i]; t?.t === 'op' && (t.op === 'x' || t.op === ':'); t = tokens[i]) { i++; const r = factor(); v = t.op === 'x' ? v * r : v / r; }
        return v;
    };
    const sum = (): number => {
        let v = product();
        for (let t = tokens[i]; t?.t === 'op' && (t.op === '+' || t.op === '-'); t = tokens[i]) { i++; const r = product(); v = t.op === '+' ? v + r : v - r; }
        return v;
    };
    const v = sum();
    if (i !== tokens.length) throw new Error('trailing tokens');
    return v;
}
const splitAt = (tokens: StepToken[], kind: StepToken['t']): StepToken[][] => {
    const out: StepToken[][] = [[]];
    for (const t of tokens) { if (t.t === kind) out.push([]); else out[out.length - 1].push(t); }
    return out;
};

// Every line must hold for the sum: an aside is a true equality, a "= …" line is worth a : d (its rest over d).
function checkLines(a: number, d: number, ls: StepLine[]) {
    for (const l of ls) {
        if (l.aside) {
            for (const eqn of splitAt(l.tokens, 'and')) {
                const [lhs, rhs] = splitAt(eqn, 'eq');
                expect(evalTokens(lhs), stepText(l.tokens)).toBe(evalTokens(rhs));
            }
        } else {
            const [q, r] = splitAt(l.tokens, 'rest');
            expect(evalTokens(q) + (r ? evalTokens(r) / d : 0), stepText(l.tokens)).toBeCloseTo(a / d, 9);
        }
    }
    const last = ls[ls.length - 1];
    expect(last.aside).toBeUndefined();
    expect(stepText(last.tokens)).toBe(`${Math.floor(a / d)} rest ${a % d}`);
}

describe('met rest, the owner\'s and Op.stap examples', () => {
    it('55 : 6 by the tafel: both multiples, the deeltal split, the answer', () => {
        expect(lines(rest(55, 6))).toEqual(['6 × 9 = 54 en 6 × 10 = 60', '55 = 54 + 1', '= 9 rest 1']);
        expect(workedSteps(rest(55, 6))!.slice(0, 2).every(l => l.aside)).toBe(true);
    });
    it('235 : 3 by splitsen en verdelen (Op.stap 2.2.GL5.19)', () => {
        expect(lines(rest(235, 3))).toEqual(['= (210 + 24 + 1) : 3', '= (210 : 3) + (24 : 3) rest 1', '= 70 + 8 rest 1', '= 78 rest 1']);
    });
    it('one part leaves out the values line', () => {
        expect(lines(rest(245, 6))).toEqual(['= (240 + 5) : 6', '= (240 : 6) rest 5', '= 40 rest 5']);
    });
    it('quotient 10 still uses the tafel, delers up to 12', () => {
        expect(lines(rest(65, 6))[0]).toBe('6 × 10 = 60 en 6 × 11 = 66');
        expect(lines(rest(100, 12))).toEqual(['12 × 8 = 96 en 12 × 9 = 108', '100 = 96 + 4', '= 8 rest 4']);
    });
});

describe('met rest, every generated shape evaluates', () => {
    it('all deeltallen to 999 over delers 2-12', () => {
        for (let d = 2; d <= 12; d++) {
            for (let a = d + 1; a <= 999; a++) {
                if (a % d === 0) continue;
                const ls = workedSteps(rest(a, d));
                expect(ls, `${a} : ${d}`).not.toBeNull();
                checkLines(a, d, ls!);
            }
        }
    });
});

describe('met rest, when there are no steps', () => {
    it('a key that disagrees with the numbers, a deler outside 2-12, a tienvoud preset', () => {
        expect(workedSteps(rest(55, 6, { remainder: 2 }))).toBeNull();
        expect(workedSteps(rest(55, 6, { answer: 8 }))).toBeNull();
        expect(workedSteps(rest(155, 13))).toBeNull();
        expect(workedSteps(rest(55, 6), { preset: 'tienvoud' })).toBeNull();
    });
    it('no handig rekenen for a rest', () => {
        expect(handigSteps(rest(57, 4))).toEqual([]);
    });
    it('an opgaande deling keeps its own steps', () => {
        expect(lines({ ...rest(2340, 3), remainder: undefined, answer: 780 })[0]).toBe('= (2100 + 240) : 3');
    });
});

describe('met rest through the stappenhulp QR', () => {
    it('decodes back to the same rest and the same steps', () => {
        const block = { ...makeBlock('hr-std-delen', { id: 'b' }), exercises: [rest(55, 6), rest(235, 3)] } as MathBlock;
        const hash = encodeTutorPage([{ block, n: 1, title: 'Delen' }], (_b, ex) => workedSteps(ex) !== null)!;
        const items = decodeTutor(`#t=${hash}`).groups[0].items;
        expect(items.map(e => [e!.answer, e!.remainder])).toEqual([[9, 1], [78, 1]]);
        expect(lines(items[0]!)).toEqual(lines(rest(55, 6)));
    });
});
