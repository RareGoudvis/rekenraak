import { describe, test, expect } from 'vitest';
import type { SplitsenExercise } from '../services/math/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInteractOf } from '../services/oefenen/kiosk';
import { expectedText } from '../services/oefenen/stats';
import { EMPTY_INTERACTION } from '../components/viewer/ViewerInteractionContext';

// Splitsen positietabel (pupil-play pass 2026-10-10): after 6 6 6 in H T E, Controleer stayed grey
// until the pupil typed 0 in the empty D (and H for 24) with no hint. A column above the number's
// first digit may stay blank (a 0 there is right too); a zero INSIDE the number must be typed.

const d = kioskFor('splitsen')!;
const C = { layout: 'positie-tabel', maxGetal: 1000 };
const ia = kioskInteractOf(d, C)!;
const W: Record<string, number> = { D: 1000, H: 100, T: 10, E: 1 };
const ex = (total: number): SplitsenExercise => ({
    total, pairs: [], isManuallyEdited: false,
    placeBreakdown: ['D', 'H', 'T', 'E'].map(key => ({ key, label: key, weight: W[key], digit: Math.floor(total / W[key]) % 10 })),
} as unknown as SplitsenExercise);
const given = (e: SplitsenExercise, cells: Record<string, string>) => ia.fromState({ ...EMPTY_INTERACTION, cells }, e, C);
const ok = (e: SplitsenExercise, cells: Record<string, string>) => {
    const g = given(e, cells);
    return g !== '' && checkAnswer(d, e, C, g);
};

describe('positietabel: the empty columns above the number may stay blank', () => {
    test('24: T and E are enough; 0 in D and H is right too', () => {
        expect(given(ex(24), { T: '2', E: '4' })).not.toBe('');
        expect(ok(ex(24), { T: '2', E: '4' })).toBe(true);
        expect(ok(ex(24), { D: '0', H: '0', T: '2', E: '4' })).toBe(true);
        expect(ok(ex(24), { H: '0', T: '2', E: '4' })).toBe(true);
        expect(ok(ex(24), { T: '2', E: '5' })).toBe(false);
        expect(ok(ex(24), { H: '1', T: '2', E: '4' })).toBe(false);
    });
    test('899: D may stay blank, H T E must be filled', () => {
        expect(ok(ex(899), { H: '8', T: '9', E: '9' })).toBe(true);
        expect(ok(ex(899), { D: '0', H: '8', T: '9', E: '9' })).toBe(true);
        expect(given(ex(899), { T: '9', E: '9' })).toBe('');
    });
    test('405: the zero inside the number is not optional', () => {
        expect(given(ex(405), { H: '4', E: '5' })).toBe('');
        expect(ok(ex(405), { H: '4', T: '0', E: '5' })).toBe(true);
    });
    test('nothing typed is not an answer', () => {
        expect(given(ex(24), {})).toBe('');
    });
    test('the Resultaten row shows the zeros', () => {
        expect(expectedText(d, ex(24), C)).toBe('0 · 0 · 2 · 4');
    });
});
