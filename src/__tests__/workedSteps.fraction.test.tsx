import { describe, expect, it } from 'vitest';
import { breukHoeveelheidSteps, stepText } from '../services/math/workedSteps';
import { blockHasSteps, blockHasTutorSteps, stepsFor } from '../services/stepsAvailability';
import { makeBlock } from './helpers/makeBlock';
import type { FractionExercise, MathBlock } from '../services/math/types';

// Breuk van een hoeveelheid (Op.stap 2.1.GL3.23): four questions with hints, then the breuk written out.

const ex = (numerator: number, denominator: number, total: number, over: Partial<FractionExercise> = {}): FractionExercise =>
    ({ id: 'x', subType: 'hoeveelheid', numerator, denominator, total, isManuallyEdited: false, ...over });
const answers = (e: FractionExercise) => breukHoeveelheidSteps(e)!.map(l => stepText(l.tokens));

describe('breukHoeveelheidSteps', () => {
    it('1/3 van 12 asks four questions and closes with the breuk', () => {
        const lines = breukHoeveelheidSteps(ex(1, 3, 12))!;
        expect(lines.map(l => l.question)).toEqual([
            'Wat is het geheel?', 'In hoeveel gelijke delen verdeel je het geheel?', 'Hoeveel is één deel?', 'Hoeveel delen neem je?', undefined,
        ]);
        expect(lines.map(l => l.hint)).toEqual(["Welk getal staat na 'van'?", 'Kijk naar de noemer.', 'Deel het geheel door de noemer.', 'Kijk naar de teller.', undefined]);
        expect(answers(ex(1, 3, 12))).toEqual(['12', '3', '12 : 3 = 4', '1 keer', '1/3 van 12 = 4']);
    });

    it('2/3 van 12 multiplies the part', () => {
        expect(answers(ex(2, 3, 12))).toEqual(['12', '3', '12 : 3 = 4', '2 keer, 2 × 4 = 8', '2/3 van 12 = 8']);
    });

    it('3/4 van 20 and the compact key lines', () => {
        const lines = breukHoeveelheidSteps(ex(3, 4, 20))!;
        expect(answers(ex(3, 4, 20))[4]).toBe('3/4 van 20 = 15');
        expect(lines.flatMap(l => (l.compact ? [stepText(l.compact)] : []))).toEqual(['20 : 4 = 5', '3 × 5 = 15']);
    });

    it('is null for a part that does not divide evenly, other subTypes and missing data', () => {
        expect(breukHoeveelheidSteps(ex(1, 3, 10))).toBeNull();
        expect(breukHoeveelheidSteps(ex(1, 3, 12, { subType: 'hoeveelheid-abstract' }))).toBeNull();
        expect(breukHoeveelheidSteps(ex(1, 3, 12, { subType: 'kleuren' }))).toBeNull();
        expect(breukHoeveelheidSteps(ex(1, 3, 0, { total: undefined }))).toBeNull();
        expect(breukHoeveelheidSteps(undefined)).toBeNull();
    });
});

describe('availability', () => {
    const block = (e: FractionExercise): MathBlock => ({ ...makeBlock('breuken'), fractionExercises: [e] } as MathBlock);

    it('the registry row offers the steps, the tutor page does not', () => {
        expect(stepsFor('breuken', ex(2, 3, 12), {})).not.toBeNull();
        expect(blockHasSteps(block(ex(2, 3, 12)))).toBe(true);
        expect(blockHasSteps(block(ex(1, 3, 10)))).toBe(false);
        expect(blockHasTutorSteps(block(ex(2, 3, 12)))).toBe(false);
    });
});
