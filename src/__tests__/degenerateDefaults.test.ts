import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { LEAF_BY_ID, flattenLeaves } from '../config/appstructure';
import type { DeelbaarheidKleurExercise, FractionExercise } from '../services/math/types';

// Degenerate defaults (sweep 2026-09-27): a default block must not repeat what its range still has
// fresh, and a title that names every chosen divisor must be true of the rows drawn.
const leafBlock = (leafId: string, count?: number) => {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    return makeBlock(LEAF_BY_ID[leafId].typeId, { constraints: leaf.defaultConstraints, leafId, ...(count && { block: { numberOfExercises: count } }) });
};

describe.each(['breuken-herkennen', 'breuken-kleuren'])('%s default', (leafId) => {
    test('every breuk in a block is a different one', () => {
        for (let s = 0; s < 200; s++) {
            const keys = (generateFor(leafBlock(leafId)) as FractionExercise[]).map(e => `${e.numerator}/${e.denominator}`);
            expect(new Set(keys).size, keys.join(' ')).toBe(keys.length);
        }
    });
});

describe('deelbaarheid-rooster default ("Kleur de veelvouden van 2, 5 en 10")', () => {
    test('its three rows use 2, 5 and 10, each once', () => {
        for (let s = 0; s < 200; s++) {
            const ds = (generateFor(leafBlock('deelbaarheid-rooster')) as DeelbaarheidKleurExercise[]).map(e => e.divisor);
            expect([...ds].sort((a, b) => a - b)).toEqual([2, 5, 10]);
        }
    });
    test('a one-row block (the kiosk) still varies its divisor', () => {
        const seen = new Set<number>();
        for (let s = 0; s < 200; s++) seen.add((generateFor(leafBlock('deelbaarheid-rooster', 1)) as DeelbaarheidKleurExercise[])[0].divisor);
        expect([...seen].sort((a, b) => a - b)).toEqual([2, 5, 10]);
    });
});
