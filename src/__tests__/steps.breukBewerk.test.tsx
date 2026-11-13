// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { REGISTRY } from '../config/exerciseRegistry';
import { codecForType } from '../services/steps/tutorCodecs';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { stepsFor } from '../services/stepsAvailability';
import { stepText, stepsAtLevel, type StepLine, type StepToken } from '../services/math/workedSteps';
import { breukBewerkSteps, breukSomSteps } from '../services/steps/breukBewerkSteps';
import { makeBlock } from './helpers/makeBlock';
import type { BreukBewerkExercise, Equation, Fraction } from '../services/math/types';

// Worked steps for breuken vereenvoudigen and gelijknamig maken (lists of delers / veelvouden, the shared
// one marked) and for breuken optellen en aftrekken: the lines, their arithmetic, the tutor codec and the visual.

afterEach(cleanup);

const fmt = (n: number) => String(n).replace('.', ',');
const text = (lines: StepLine[] | null) => lines!.map(l => (l.question ? `${l.question} → ${stepText(l.tokens, fmt)}` : stepText(l.tokens, fmt)));
const bb = (subType: BreukBewerkExercise['subType'], inputs: Fraction[], answers: Fraction[]): BreukBewerkExercise => ({ id: 'x', subType, inputs, answers, isManuallyEdited: false });
const som = (a: Fraction, op: '+' | '-', b: Fraction): Equation => ({ id: 'x', operands: [a, b], operator: op, answer: 0, isManuallyEdited: false });
// "a : b = c" and "a × b = c" sides inside a token run, each checked.
function checkCalcs(tokens: StepToken[]) {
    for (let i = 0; i + 4 < tokens.length; i++) {
        const [a, o, b, e, c] = tokens.slice(i, i + 5);
        if (a.t === 'num' && o.t === 'op' && b.t === 'num' && e.t === 'eq' && c.t === 'num') {
            expect(o.op === ':' ? a.v / b.v : o.op === 'x' ? a.v * b.v : NaN, stepText(tokens)).toBe(c.v);
        }
    }
}
const fracVal = (t: StepToken) => (t.t === 'frac' ? t.n / t.d : t.t === 'num' ? t.v : NaN);
// "x/y = p/q" anywhere in a line: equal values.
function checkFracEq(tokens: StepToken[]) {
    tokens.forEach((t, i) => {
        if (t.t === 'eq' && tokens[i - 1]?.t === 'frac') expect(fracVal(tokens[i + 1])).toBeCloseTo(fracVal(tokens[i - 1]), 12);
    });
}

describe('breuken vereenvoudigen', () => {
    it('lists the delers, takes the grootste gemeenschappelijke, divides both', () => {
        expect(text(breukBewerkSteps(bb('vereenvoudigen', [{ n: 12, d: 18 }], [{ n: 2, d: 3 }])))).toEqual([
            'Wat zijn de delers van 12? → 1, 2, 3, 4, 6, 12',
            'Wat zijn de delers van 18? → 1, 2, 3, 6, 9, 18',
            'Wat is de grootste deler die in beide rijen staat? → 6',
            'Deel de teller en de noemer door 6. → 12 : 6 = 2 en 18 : 6 = 3',
            '12/18 = 2/3',
        ]);
    });

    it('an onvereenvoudigbare breuk stops at 1, a whole result reads as the number', () => {
        expect(text(breukBewerkSteps(bb('vereenvoudigen', [{ n: 5, d: 7 }], [{ n: 5, d: 7 }])))).toEqual([
            'Wat zijn de delers van 5? → 1, 5',
            'Wat zijn de delers van 7? → 1, 7',
            'Welke delers staan in beide rijen? → 1',
            '5/7 kan je niet vereenvoudigen',
        ]);
        expect(text(breukBewerkSteps(bb('vereenvoudigen', [{ n: 6, d: 3 }], [{ n: 2, d: 1 }]))).at(-1)).toBe('6/3 = 2');
    });

    it('gemengd has no steps; the key prints each question\'s compact statement', () => {
        expect(breukBewerkSteps(bb('gemengd', [{ n: 7, d: 3 }], [{ whole: 2, n: 1, d: 3 }]))).toBeNull();
        const lines = breukBewerkSteps(bb('vereenvoudigen', [{ n: 12, d: 18 }], [{ n: 2, d: 3 }]))!;
        expect(lines.filter(l => l.compact).map(l => stepText(l.compact!, fmt))).toEqual([
            'Delers van 12: 1, 2, 3, 4, 6, 12', 'Delers van 18: 1, 2, 3, 6, 9, 18', 'De grootste deler in beide rijen is 6', '12 : 6 = 2 en 18 : 6 = 3',
        ]);
    });
});

describe('breuken gelijknamig maken', () => {
    it('veelvouden of both noemers up to the first common one, then both breuken rewritten', () => {
        expect(text(breukBewerkSteps(bb('gelijknamig', [{ n: 3, d: 4 }, { n: 5, d: 6 }], [{ n: 9, d: 12 }, { n: 10, d: 12 }])))).toEqual([
            'Wat zijn de veelvouden van 4? → 4, 8, 12',
            'Wat zijn de veelvouden van 6? → 6, 12',
            'Wat is het kleinste gemene veelvoud van 4 en 6? → 12',
            'Hoe schrijf je de eerste breuk met noemer 12? → 3/4 = 9/12',
            'Hoe schrijf je de tweede breuk met noemer 12? → 5/6 = 10/12',
            '9/12 en 10/12',
        ]);
    });

    it('follows the teacher\'s own noemer, and a noemer that already fits', () => {
        const lines = breukBewerkSteps(bb('gelijknamig', [{ n: 1, d: 4 }, { n: 1, d: 6 }], [{ n: 6, d: 24 }, { n: 4, d: 24 }]))!;
        expect(lines[0].tokens.filter(t => t.t === 'num').map(t => (t as { v: number }).v)).toEqual([4, 8, 12, 16, 20, 24]);
        expect(lines[2].hint).toMatch(/noemer 24/);
        const fits = breukBewerkSteps(bb('gelijknamig', [{ n: 1, d: 3 }, { n: 5, d: 6 }], [{ n: 2, d: 6 }, { n: 5, d: 6 }]))!;
        expect(fits[4].hint).toBe('Die breuk heeft al noemer 6.');
    });
});

describe('breuken optellen en aftrekken', () => {
    it('makes the noemers gelijk via the kgv, adds the tellers, simplifies', () => {
        expect(text(breukSomSteps(som({ n: 3, d: 4 }, '+', { n: 5, d: 6 })))).toEqual([
            'Veelvouden van 4: 4, 8, 12', 'Veelvouden van 6: 6, 12', 'kgv = 12', '3/4 = 9/12', '5/6 = 10/12', '9/12 + 10/12', '19/12',
        ]);
        expect(text(breukSomSteps(som({ n: 1, d: 2 }, '-', { n: 1, d: 6 }))).slice(-3)).toEqual(['3/6 − 1/6', '2/6', '1/3']);
        expect(text(breukSomSteps(som({ n: 1, d: 4 }, '+', { n: 1, d: 4 })))).toEqual(['2/4', '1/2']);
        // Basisstappen (the key's narrow column) leave the lists to Alle, but keep the kgv (owner: gelijknamig = kgv zoeken).
        expect(text(stepsAtLevel(breukSomSteps(som({ n: 3, d: 4 }, '+', { n: 5, d: 6 }))!, 'basis'))).toEqual(['kgv = 12', '3/4 = 9/12', '5/6 = 10/12', '9/12 + 10/12', '19/12']);
    });

    it('no steps for a sum that is only its answer, a gemengd operand or a puntoefening', () => {
        expect(breukSomSteps(som({ n: 3, d: 7 }, '+', { n: 2, d: 7 }))).toBeNull();
        expect(breukSomSteps(som({ whole: 1, n: 1, d: 2 }, '+', { n: 1, d: 3 }))).toBeNull();
        expect(breukSomSteps({ ...som({ n: 1, d: 2 }, '+', { n: 1, d: 3 }), missingTerm: 'operand2' })).toBeNull();
        expect(breukSomSteps({ id: 'x', operands: [12, 7], operator: '+', answer: 19, isManuallyEdited: false })).toBeNull();
    });

    it('the hoofdrekenen rows give breuken their steps and keep their own for whole numbers', () => {
        expect(stepsFor('hr-std-optellen', som({ n: 3, d: 4 }, '+', { n: 5, d: 6 }), {})).toEqual(breukSomSteps(som({ n: 3, d: 4 }, '+', { n: 5, d: 6 })));
        expect(stepsFor('hr-std-aftrekken', som({ n: 1, d: 2 }, '-', { n: 1, d: 6 }), {})).not.toBeNull();
        expect(text(stepsFor('hr-std-optellen', { id: 'x', operands: [47, 25], operator: '+', answer: 72, isManuallyEdited: false }, {}))[0]).toBe('(47 + 20) + 5');
    });
});

describe('every generated breuken exercise', () => {
    const cases: Record<string, unknown>[] = [
        { subType: 'vereenvoudigen' }, { subType: 'vereenvoudigen', allowImproper: true, allowIrreducible: true, tablesOnly: false, maxNumerator: 100, maxDenominator: 100 },
        { subType: 'gelijknamig' }, { subType: 'gelijknamig', maxDenominator: 20, allowImproper: true }, { subType: 'gelijknamig', denominatorRelation: 'multiple' }, { subType: 'gelijknamig', targetDen: 24 },
    ];
    it.each(cases)('%o has steps whose sums hold and whose answer is the sheet\'s', (constraints) => {
        const block = makeBlock('breuken-bewerken', { constraints, block: { numberOfExercises: 60 } });
        const items = REGISTRY['breuken-bewerken'].generate(block) as BreukBewerkExercise[];
        let withSteps = 0;
        for (const ex of items) {
            const lines = stepsFor('breuken-bewerken', ex, block.constraints);
            if (!lines) continue;
            withSteps++;
            lines.forEach(l => { checkCalcs(l.tokens); checkFracEq(l.tokens); });
            const last = lines.at(-1)!.tokens;
            if (ex.subType === 'gelijknamig') expect(last.filter(t => t.t === 'frac')).toEqual(ex.answers.map(a => ({ t: 'frac', n: a.n, d: a.d })));
            else if (ex.answers[0].n !== ex.inputs[0].n) expect(fracVal(last.at(-1)!)).toBeCloseTo(ex.answers[0].n / ex.answers[0].d, 12);
        }
        expect(withSteps).toBe(items.length);
    });

    it('every generated breuken sum (+ and −, one and more steps) has steps ending on its answer', () => {
        for (const typeId of ['hr-std-optellen', 'hr-std-aftrekken']) {
            for (const fractionDifficulty of ['same', 'one_step', 'multi_step']) {
                const block = makeBlock(typeId, { constraints: { numberType: 'rational', fractionDifficulty }, block: { numberOfExercises: 40 } });
                for (const ex of REGISTRY[typeId].generate(block) as Equation[]) {
                    const lines = stepsFor(typeId, ex, block.constraints);
                    if (!lines) continue;
                    const a = ex.answer as Fraction | number;
                    expect(fracVal(lines.at(-1)!.tokens[0])).toBeCloseTo(typeof a === 'number' ? a : a.n / a.d, 12);
                }
            }
        }
    });
});

describe('tutor codecs', () => {
    const roundTrip = (typeId: string, ex: unknown) => {
        const codec = codecForType(typeId)!;
        const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, {}))));
        expect(data).not.toBeNull();
        expect(codec.steps(data!)).toEqual(stepsFor(typeId, ex, {}));
        return { codec, data: data! };
    };

    it('breuken bewerken travels as numbers and rebuilds the same steps', () => {
        const { codec, data } = roundTrip('breuken-bewerken', bb('vereenvoudigen', [{ n: 12, d: 18 }], [{ n: 2, d: 3 }]));
        expect(codec.id).toBe('bb');
        expect(stepText(codec.sum(data), fmt)).toBe('12/18');
        const g = roundTrip('breuken-bewerken', bb('gelijknamig', [{ n: 1, d: 4 }, { n: 1, d: 6 }], [{ n: 6, d: 24 }, { n: 4, d: 24 }]));
        expect(stepText(g.codec.sum(g.data), fmt)).toBe('1/4 en 1/6');
        expect(codec.out(bb('gemengd', [{ n: 7, d: 3 }], [{ whole: 2, n: 1, d: 3 }]), {})).toBeNull();
        expect(codec.in(['v', 0, 3])).toBeNull();
        expect(codec.in(['g', 1, 4, 1, 6, 10])).toBeNull();
        expect(codec.in(['x', 1, 2])).toBeNull();
    });

});

describe('steps visuals', () => {
    it('the breuken lists fill in per answer and mark what both rows share', () => {
        const ex = bb('vereenvoudigen', [{ n: 12, d: 18 }], [{ n: 2, d: 3 }]);
        const lines = breukBewerkSteps(ex)!;
        const draw = stepsVisualFor('breuken-bewerken', ex, lines, 'kiosk')!;
        const at = (revealed: number) => { cleanup(); return render(<>{draw(revealed)}</>).container; };
        expect(at(0).querySelectorAll('.steps-lijst-chip.is-empty')).toHaveLength(2);
        expect(at(1).querySelectorAll('.steps-lijst-chip:not(.is-empty)')).toHaveLength(6);
        const marked = at(3);
        expect([...marked.querySelectorAll('.is-common')].map(e => e.textContent)).toEqual(['1', '2', '3', '1', '2', '3']);
        expect([...marked.querySelectorAll('.is-pick')].map(e => e.textContent)).toEqual(['6', '6']);
        cleanup();
        const gemengd = render(<>{stepsVisualFor('breuken-bewerken', bb('gemengd', [{ n: 7, d: 3 }], [{ whole: 2, n: 1, d: 3 }]), [], 'kiosk')!(0)}</>).container;
        expect(gemengd.querySelector('.steps-lijsten')).toBeNull();
    });

});
