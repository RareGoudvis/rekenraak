import { describe, expect, it } from 'vitest';
import { decodeTutor, encodeTutorPage, tutorCarries } from '../services/oefenen/tutorPayload';
import { codecById } from '../services/steps/tutorCodecs';
import { blockHasTutorSteps, stepsFor } from '../services/stepsAvailability';
import { generateFor, makeBlock } from './helpers/makeBlock';
import type { Equation, Fraction, MathBlock } from '../services/math/types';

// Breuken optellen / aftrekken travel in the stappenhulp QR through codec 'bs' on the hoofdrekenen typeIds,
// while whole-number sums on those typeIds keep their own compact forms.

const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;
const f = (n: number, d: number, whole?: number): Fraction => ({ n, d, ...(whole && { whole }) });
const sum = (a: number | Fraction, b: number | Fraction, operator: '+' | '-' = '+'): Equation =>
    ({ id: 'x', operands: [a, b], operator, answer: 0, isManuallyEdited: false });
const block = (typeId: string, exercises: Equation[]): MathBlock => ({ ...makeBlock(typeId, { id: typeId }), exercises, itemNumbering: 'letter' } as MathBlock);
const roundTrip = (b: MathBlock) => decodeTutor(encodeTutorPage([{ block: b, n: 1, title: '' }], hasSteps)!).groups[0].items;

describe('breuken sums in the stappenhulp QR', () => {
    it('a breuken sum travels as codec bs and opens the same steps as the sheet', () => {
        const exs = [sum(f(1, 4), f(1, 6)), sum(f(5, 6), f(1, 3), '-'), sum(f(1, 6), f(3, 6))];
        const items = roundTrip(block('hr-std-optellen', exs));
        items.forEach((it, i) => {
            expect(it?.kind).toBe('codec');
            if (it?.kind !== 'codec') return;
            expect(it.codec).toBe('bs');
            expect(codecById('bs')!.steps(it.data)).toEqual(stepsFor('hr-std-optellen', exs[i], {}));
        });
        expect(items.every(it => it?.steps)).toBe(true);
    });

    it('a whole-number sum on the same typeId keeps the hoofdrekenen form', () => {
        const items = roundTrip(block('hr-std-optellen', [sum(475, 368), sum(f(1, 4), f(1, 2))]));
        expect(items[0]?.kind).toBe('sum');
        expect(items[1]?.kind).toBe('codec');
    });

    it('a breuken sum without steps (a gemengd getal) is listed greyed, not left out', () => {
        const items = roundTrip(block('hr-std-optellen', [sum(f(1, 4), f(1, 6)), sum(f(1, 2, 2), f(1, 3))]));
        expect(items[1]).toMatchObject({ kind: 'codec', codec: 'bs', steps: false });
        expect(codecById('bs')!.sum(items[1]!.kind === 'codec' ? items[1]!.data : null)).toEqual([
            { t: 'num', v: 2 }, { t: 'frac', n: 1, d: 2 }, { t: 'op', op: '+' }, { t: 'frac', n: 1, d: 3 },
        ]);
    });

    it('a breuken block now offers the QR', () => {
        const b = block('hr-std-aftrekken', [sum(f(3, 4), f(1, 2), '-')]);
        expect(tutorCarries('hr-std-aftrekken', b.exercises[0], {})).toBe(true);
        expect(blockHasTutorSteps(b)).toBe(true);
    });

    it('generated breuken sums all survive the round trip', () => {
        let checked = 0;
        for (const fractionDifficulty of ['same', 'one_step', 'multi_step']) {
            const exs = generateFor(makeBlock('hr-std-optellen', { constraints: { numberType: 'rational', fractionDifficulty }, block: { numberOfExercises: 12 } })) as Equation[];
            const items = roundTrip(block('hr-std-optellen', exs));
            exs.forEach((ex, i) => {
                const it = items[i];
                if (it?.kind !== 'codec') return;
                expect(codecById('bs')!.steps(it.data)).toEqual(stepsFor('hr-std-optellen', ex, {}));
                checked++;
            });
        }
        expect(checked).toBeGreaterThan(10);
    });

    it('in refuses broken data', () => {
        const c = codecById('bs')!;
        for (const w of [['x', [1, 2], [1, 3]], ['+', 4, 5], ['+', [1, 0], [1, 2]], ['+', [1, 2]], ['+', [1, 'a'], [1, 2]]]) expect(c.in(w)).toBeNull();
    });
});
