import { describe, expect, it } from 'vitest';
import { rijgenOptellen, stepText, stepsAtLevel, workedSteps, type StepLine } from '../services/math/workedSteps';
import type { Equation } from '../services/math/types';
import { REGISTRY } from '../config/exerciseRegistry';

const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const text = (lines: StepLine[]) => lines.map(l => stepText(l.tokens));

// Evaluates a line's tokens: only + and brackets occur in the rijgen strategy.
function evalLine(l: StepLine): number {
    let sum = 0;
    for (const t of l.tokens) if (t.t === 'num') sum += t.v;
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

describe('shapes without a strategy return null', () => {
    it.each([
        ['aftrekken', eq(475, 368, { operator: '-', answer: 107 })],
        ['3 terms', { ...eq(100, 200), operands: [100, 200, 300], answer: 600 }],
        ['puntoefening', eq(475, 368, { missingTerm: 'operand2' })],
        ['puntoefening multi', eq(475, 368, { missingIndex: 1 })],
        ['met rest', eq(475, 368, { remainder: 1 })],
        ['decimal', eq(4.5, 36.8)],
        ['answer above 1000', eq(675, 438)],
        ['first operand below 10', eq(8, 55)],
        ['one non-zero digit', eq(47, 8)],
        ['round tens only', eq(47, 30)],
        ['gemengd compenseren variant', eq(475, 29, { variant: '+:compenseren' })],
    ])('%s', (_name, e) => {
        expect(workedSteps(e as Equation)).toBeNull();
    });

    it('a compenseren or puntoefening block', () => {
        expect(workedSteps(eq(475, 368), { preset: 'compenseren' })).toBeNull();
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
        expect(REGISTRY['hr-std-aftrekken'].steps!(eq(475, 368, { operator: '-' }), {})).toBeNull();
    });
});
