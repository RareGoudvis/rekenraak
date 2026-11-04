import { describe, test, expect, afterEach } from 'vitest';
import { mulberry32 } from './helpers/limitHarness';
import { makeBlock } from './helpers/makeBlock';
import { generatePlaatswaardeExercises, tabelPlaces } from '../services/plaatswaarde/plaatswaardeGenerator';
import { generateVergelijkenExercises } from '../services/vergelijken/vergelijkenGenerator';

// "Tot 20" means 20 can be drawn: the free number path is inclusive of the max, like every
// other max picker, and never exceeds it.
const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

function drawn(gen: () => number[], seed: number, rounds: number): number[] {
    Math.random = mulberry32(seed);
    const out: number[] = [];
    for (let i = 0; i < rounds; i++) out.push(...gen());
    return out;
}

describe('the max itself can be drawn', () => {
    test.each([20, 100])('plaatswaarde tot %i', (max) => {
        const block = makeBlock('plaatswaarde', { constraints: { subType: 'waarde', maxGetal: max, numberMask: {}, decimalPlaces: 0 }, block: { numberOfExercises: 10 } });
        const nums = drawn(() => generatePlaatswaardeExercises(block).map(e => e.number), 7, 60);
        expect(Math.max(...nums)).toBe(max);
        expect(nums.every(n => n >= 1 && n <= max)).toBe(true);
    });

    test('plaatswaarde with a decimal reaches the max and stays under it', () => {
        const block = makeBlock('plaatswaarde', { constraints: { subType: 'tabel', maxGetal: 10, numberMask: {}, decimalPlaces: 1 }, block: { numberOfExercises: 10 } });
        const nums = drawn(() => generatePlaatswaardeExercises(block).map(e => e.number), 11, 200);
        expect(nums).toContain(10);
        expect(Math.max(...nums)).toBeLessThanOrEqual(10);
    });

    test.each([20, 100])('vergelijken tot %i', (max) => {
        const block = makeBlock('vergelijken', { constraints: { subType: 'getallen', maxGetal: max, numberMask: {}, decimalPlaces: 0 }, block: { numberOfExercises: 10 } });
        const nums = drawn(() => generateVergelijkenExercises(block).flatMap(e => [e.a, e.b]).filter((n): n is number => typeof n === 'number'), 3, 60);
        expect(Math.max(...nums)).toBe(max);
        expect(nums.every(n => n >= 1 && n <= max)).toBe(true);
    });
});

describe('plaatswaarde tabel columns', () => {
    test('absent: the number\'s own places from its first non-zero digit', () => {
        expect(tabelPlaces({ number: 47 }, { maxGetal: 1000 }).map(p => p.key)).toEqual(['T', 'E']);
    });
    test('tablePlaces: exactly those columns, high to low, digits included', () => {
        const ps = tabelPlaces({ number: 47 }, { maxGetal: 100, tablePlaces: ['E', 'D', 'H', 'T'] });
        expect(ps.map(p => `${p.key}${p.digit}`)).toEqual(['D0', 'H0', 'T4', 'E7']);
    });
    test('decimal columns follow the number\'s own decimals', () => {
        expect(tabelPlaces({ number: 3.25 }, { decimalPlaces: 1, tablePlaces: ['E', 't', 'h'] }).map(p => p.digit)).toEqual([3, 2, 5]);
    });
    test('a set that no longer exists (decimals dropped) falls back to the own places', () => {
        expect(tabelPlaces({ number: 5 }, { maxGetal: 10, decimalPlaces: 0, tablePlaces: ['t'] }).map(p => p.key)).toEqual(['E']);
    });
});
