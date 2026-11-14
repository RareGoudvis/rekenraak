import { describe, test, expect } from 'vitest';
import { EXERCISE_UI } from '../config/exerciseUI';
import { makeBlock } from './helpers/makeBlock';

// EXERCISE_UI[typeId].summary: one short Dutch line of the block's key content settings.
const summary = (typeId: string, constraints: Record<string, unknown> = {}) =>
    EXERCISE_UI[typeId].summary!(makeBlock(typeId, { id: 'b', constraints }));

describe('block summary line', () => {
    test('hoofdrekenen optellen: max, termen, oefenvorm, brug', () => {
        expect(summary('hr-std-optellen', { maxGetal: 1000, termCount: 2, preset: 'vrij', bridges: { E: 'FREE', T: 'REQUIRED' } }))
            .toBe('Tot 1.000 · 2 termen · vrij · brug T moet');
    });

    test('vermenigvuldigen tafels names the tables', () => {
        expect(summary('hr-std-vermenigvuldigen', { multiplicationMode: 'tafels', selectedTables: [5, 2], tableLimit: 10 }))
            .toBe('tafels van 2, 5 · tot × 10');
    });

    test('klok: kind, system and time types', () => {
        expect(summary('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'lezen', is24hour: false, timeTypes: ['uren', 'halve_uren'] }))
            .toBe('analoog lezen · 12 uur · uren, halve uren');
    });

    test('geld teruggeven: price range and the bills', () => {
        expect(summary('geld-teruggeven', { maxPriceEuros: 9, payWithOptions: [2000, 1000] }))
            .toBe('prijs tot €10 · betalen met €10, €20');
    });

    test('getallenas: max, jump, direction', () => {
        expect(summary('getallenas', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false }))
            .toBe('Tot 100 · sprong 5 · stijgend');
    });

    test('every summarised family returns a non-empty line on its defaults', () => {
        const ids = Object.keys(EXERCISE_UI).filter(id => EXERCISE_UI[id].summary);
        expect(ids.length).toBeGreaterThanOrEqual(20);
        for (const id of ids) expect(summary(id), id).not.toBe('');
    });
});
