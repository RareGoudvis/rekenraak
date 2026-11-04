import { describe, test, expect } from 'vitest';
import type { ClockExercise, GeldTeruggevenExercise, VormleerExercise } from '../services/math/types';
import { emptyStats, recordAnswer } from '../services/oefenen/stats';
import type { OefenSessie } from '../services/oefenen/types';

// The Resultaten error rows must say what was on the card and read the answers the way a
// teacher writes them (REVIEW §F known gaps): no "? : ??" for the clock that was shown, no bare
// "Welke soort? ?", no "2 ; 65" for an amount of change.

const sessie: OefenSessie = { v: 1, id: 'rows', createdAt: 0, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false, types: [] };

const rowOf = (typeId: string, ex: unknown, c: Record<string, unknown>, given: string | string[]) =>
    recordAnswer(emptyStats(sessie, 0), 0, typeId, ex, given, false, 100, c, 1).perType[0].errors[0];

describe('error rows read like the card', () => {
    test('analoge klok lezen names the time the clock showed', () => {
        const ex: ClockExercise = { id: 'k', hours: 4, minutes: 45, timeText: 'kwart voor 5', digitalText: '04:45', exerciseMode: 'lezen', clockType: 'analoog', isManuallyEdited: false };
        const row = rowOf('klok-kloklezen', ex, { clockType: 'analoog', exerciseMode: 'lezen' }, ['4', '15']);
        expect(row.exercise).toBe('analoge klok toont 4:45: hoe laat?');
        expect(row.given).toBe('4:15');
        expect(row.expected).toBe('4:45');
        // Twelve o'clock is 12 on the face, not 0.
        expect(rowOf('klok-kloklezen', { ...ex, hours: 0, minutes: 5 }, { clockType: 'analoog', exerciseMode: 'lezen' }, ['1', '5']).exercise).toBe('analoge klok toont 12:05: hoe laat?');
    });

    test('vormleer herkennen names the drawn figure, not "Welke soort? ?"', () => {
        const hoek: VormleerExercise = { id: 'h', kind: 'hoek', concept: 'stomp', angleDeg: 120, isManuallyEdited: false };
        const c = { kind: 'hoek', mode: 'herkennen', concepts: ['scherp', 'recht', 'stomp'] };
        const row = rowOf('vormleer-hoeken', hoek, c, 'scherpe hoek');
        expect(row.exercise).toBe('hoek van 120°: welke soort?');
        expect(row.expected).toBe('stompe hoek');
        const vier: VormleerExercise = { id: 'v', kind: 'figuur', concept: 'ruit', sides: [4, 4, 4, 4], points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 6, y: 3 }, { x: 2, y: 3 }], isManuallyEdited: false };
        const row2 = rowOf('vormleer-figuren', vier, { kind: 'figuur', mode: 'herkennen', concepts: ['vierkant', 'ruit'] }, 'vierkant');
        expect(row2.exercise).toBe('vierhoek, zijden 4 · 4 · 4 · 4 cm: welke soort?');
    });

    test('geld-teruggeven shows the change as an amount, euro and cent fields alike', () => {
        const ex: GeldTeruggevenExercise = { id: 'g', priceCents: 735, payWithCents: 1000, changeCents: 265 } as GeldTeruggevenExercise;
        const row = rowOf('geld-teruggeven', ex, {}, ['2', '5']);
        expect(row.given).toBe('€ 2,05');
        expect(row.expected).toBe('€ 2,65');
        const dec = rowOf('geld-teruggeven', ex, { antwoordFormat: 'decimaal' }, '2,6');
        expect(dec.given).toBe('€ 2,60');
        expect(dec.expected).toBe('€ 2,65');
    });
});
