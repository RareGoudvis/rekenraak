import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { generateBreukBewerkExercisesNoted } from '../services/fractions/breukBewerkGenerator';
import { generateFractionExercisesNoted } from '../services/fractions/fractionGenerator';
import type { BreukBewerkExercise, FractionExercise } from '../services/math/types';

const bew = (constraints: Record<string, unknown>) => makeBlock('breuken-bewerken', { constraints, block: { numberOfExercises: 40 } });
const reps = <T,>(fn: () => T[]) => Array.from({ length: 10 }, fn).flat();

describe('breuken-bewerken limits', () => {
    // L11
    test.each([[20, 20], [5, 5], [3, 3], [10, 10]])('gelijknamig noemer %i tot %i stays within the max', (minDenominator, maxDenominator) => {
        for (const ex of reps(() => generateFor(bew({ subType: 'gelijknamig', minDenominator, maxDenominator })) as BreukBewerkExercise[])) {
            for (const f of ex.inputs) expect(f.d).toBeLessThanOrEqual(maxDenominator);
            expect(ex.inputs[0].d).not.toBe(ex.inputs[1].d);
        }
    });
    test('gelijknamig with maxD 2 reaches 3 and says so', () => {
        const block = bew({ subType: 'gelijknamig', minDenominator: 2, maxDenominator: 2 });
        const { items, note } = generateBreukBewerkExercisesNoted(block);
        expect(items.every(e => e.inputs[0].d !== e.inputs[1].d)).toBe(true);
        expect(note).toMatch(/noemer 3/);
    });
    test('gelijknamig min = max notes the noemer picked below the minimum; a real range does not', () => {
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'gelijknamig', minDenominator: 20, maxDenominator: 20 })).note).toMatch(/maar één noemer/);
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'gelijknamig', minDenominator: 2, maxDenominator: 10 })).note).toBeNull();
    });
    // L16
    test('fixed common denominator without 2 divisors in range gets a note', () => {
        const { note } = generateBreukBewerkExercisesNoted(bew({ subType: 'gelijknamig', minDenominator: 2, maxDenominator: 10, targetDen: 7 }));
        expect(note).toMatch(/kleinste gemeenschappelijke veelvoud/);
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'gelijknamig', minDenominator: 2, maxDenominator: 10, targetDen: 12 })).note).toBeNull();
    });
    test('vereenvoudigen under tight caps stays within them and notes it', () => {
        for (const [maxNumerator, maxDenominator] of [[10, 2], [10, 3], [1, 10], [1, 2]]) {
            const block = bew({ subType: 'vereenvoudigen', maxNumerator, maxDenominator });
            for (const ex of reps(() => generateFor(block) as BreukBewerkExercise[])) {
                expect(ex.inputs[0].n).toBeLessThanOrEqual(maxNumerator);
                expect(ex.inputs[0].d).toBeLessThanOrEqual(maxDenominator);
            }
            expect(generateBreukBewerkExercisesNoted(block).note).toMatch(/vereenvoudigd/);
        }
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'vereenvoudigen', maxNumerator: 10, maxDenominator: 10 })).note).toBeNull();
    });
    test('gemengd at teller max 1-2 notes the unavoidable 3/2', () => {
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'gemengd', maxNumerator: 2 })).note).toMatch(/teller 3/);
        expect(generateBreukBewerkExercisesNoted(bew({ subType: 'gemengd', maxNumerator: 10 })).note).toBeNull();
    });
});

describe('breuken hoeveelheid maxTotal below the minimum denominator', () => {
    test.each([[5, 8], [3, 6], [2, 5]])('maxTotal %i, minDenominator %i', (maxTotal, minDenominator) => {
        const block = makeBlock('breuken', { constraints: { subType: 'hoeveelheid', maxTotal, minDenominator, maxDenominator: 10 }, block: { numberOfExercises: 30 } });
        for (const ex of reps(() => generateFor(block) as FractionExercise[])) expect(ex.total).toBeLessThanOrEqual(maxTotal);
        expect(generateFractionExercisesNoted(block).note).toMatch(/kleinere noemer/);
    });
});
