import { describe, test, expect } from 'vitest';
import { filterLockedUpdates, classifyUpdate } from '../store/blockRules';
import type { MathBlock } from '../services/math/types';
import type { BlockConstraints } from '../services/math/constraintTypes';

const PREV: BlockConstraints = { maxGetal: 20, fitToWidth: false };

describe('filterLockedUpdates (curriculum lock)', () => {
    test.each<[string, Partial<MathBlock>]>([
        ['numberOfExercises', { numberOfExercises: 8 }],
        ['pageBreakBefore', { pageBreakBefore: true }],
        ['widthUnits', { widthUnits: 2 }],
        ['showInstruction', { showInstruction: false }],
        ['skipNumbering', { skipNumbering: true }],
        ['itemNumbering', { itemNumbering: 'letter' }],
    ])('%s survives the lock', (_key, updates) => {
        expect(filterLockedUpdates(updates, PREV)).toEqual(updates);
    });

    test('only the fitToWidth key is taken out of a constraints patch', () => {
        const allowed = filterLockedUpdates({ constraints: { maxGetal: 100, fitToWidth: true } }, PREV);
        expect(allowed).toEqual({ constraints: { maxGetal: 20, fitToWidth: true } });
    });

    test('a constraints patch that leaves fitToWidth alone is dropped', () => {
        expect(filterLockedUpdates({ constraints: { maxGetal: 100, fitToWidth: false } }, PREV)).toBeNull();
    });

    test('a missing target block starts from empty constraints', () => {
        expect(filterLockedUpdates({ constraints: { fitToWidth: true } }, undefined))
            .toEqual({ constraints: { fitToWidth: true } });
    });

    test('difficulty, wording and points edits are dropped entirely', () => {
        expect(filterLockedUpdates({ totalPoints: 10 }, PREV)).toBeNull();
        expect(filterLockedUpdates({ instructionText: 'x' }, PREV)).toBeNull();
        expect(filterLockedUpdates({ verticalSpacing: 30 }, PREV)).toBeNull();
    });

    test('allowed keys pass while the rest of the patch is stripped', () => {
        expect(filterLockedUpdates({ numberOfExercises: 4, totalPoints: 4, instructionText: 'x' }, PREV))
            .toEqual({ numberOfExercises: 4 });
    });
});

describe('classifyUpdate (stale flag + count top-up)', () => {
    test('count only: tops up, never stale', () => {
        expect(classifyUpdate({ numberOfExercises: 12 }, PREV)).toEqual({ countOnly: true, marksStale: false });
    });

    test('count + the score clamp it sends along is still count only', () => {
        expect(classifyUpdate({ numberOfExercises: 3, totalPoints: 3 }, PREV)).toEqual({ countOnly: true, marksStale: false });
    });

    test('totalPoints alone is not count only and marks stale', () => {
        expect(classifyUpdate({ totalPoints: 3 }, PREV)).toEqual({ countOnly: false, marksStale: true });
    });

    test('a constraints patch that only flips fitToWidth is not stale', () => {
        expect(classifyUpdate({ constraints: { maxGetal: 20, fitToWidth: true } }, PREV))
            .toEqual({ countOnly: false, marksStale: false });
    });

    test('fitToWidth together with another key is stale', () => {
        expect(classifyUpdate({ constraints: { maxGetal: 20, fitToWidth: true }, verticalSpacing: 20 }, PREV).marksStale).toBe(true);
    });

    test.each<[string, Partial<MathBlock>]>([
        ['itemNumbering', { itemNumbering: 'cijfer' }],
        ['widthUnits', { widthUnits: 4 }],
        ['both', { itemNumbering: 'cijfer', widthUnits: 1 }],
    ])('presentation only (%s) is not stale', (_key, updates) => {
        expect(classifyUpdate(updates, PREV)).toEqual({ countOnly: false, marksStale: false });
    });

    test('a difficulty change marks stale', () => {
        expect(classifyUpdate({ constraints: { maxGetal: 100, fitToWidth: false } }, PREV))
            .toEqual({ countOnly: false, marksStale: true });
    });

    test('an empty patch marks stale (same as before the extraction)', () => {
        expect(classifyUpdate({}, PREV).marksStale).toBe(true);
    });
});
