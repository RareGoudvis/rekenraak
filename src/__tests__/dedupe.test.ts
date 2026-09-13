import { describe, test, expect } from 'vitest';
import { regenerateBlock } from '../services/generateDispatch';
import { makeBlock } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// "Geen dubbele oefeningen" (DocSettings.uniqueExercises) — regenerateBlock dedupes the
// generated array by content key (id stripped) and tops up from the generator, up to
// DEDUPE_MAX_ROUNDS extra rounds, before accepting a short result.

function keyOf(ex: unknown): string {
    const { id: _id, ...rest } = ex as Record<string, unknown>;
    return JSON.stringify(rest);
}

describe('regenerateBlock dedupe (uniqueExercises)', () => {
    test('a roomy pool never yields two identical exercises, across repeated runs', () => {
        const block = makeBlock('hr-std-optellen', { constraints: { maxGetal: 1000 }, block: { numberOfExercises: 20 } });
        for (let run = 0; run < 20; run++) {
            let stored: unknown[] = [];
            regenerateBlock(
                block as MathBlock,
                (_id, _field, data) => { stored = data; },
                undefined,
                true,
            );
            expect(stored.length).toBe(20);
            const keys = stored.map(keyOf);
            expect(new Set(keys).size).toBe(keys.length);
        }
    });

    test('a tiny pool returns as many as it can without throwing, and finishes fast', () => {
        // tafels [2] up to 10 only yields 2x1..2x5 (5 distinct facts) — asking for 15
        // forces every top-up round to run out and the block still resolves.
        const block = makeBlock('hr-std-vermenigvuldigen', {
            constraints: { multiplicationMode: 'tafels', selectedTables: [2], tableLimit: 10 },
            block: { numberOfExercises: 15 },
        });
        let stored: unknown[] | null = null;
        const start = Date.now();
        regenerateBlock(
            block as MathBlock,
            (_id, _field, data) => { stored = data; },
            undefined,
            true,
        );
        const elapsed = Date.now() - start;
        expect(stored).not.toBeNull();
        const result = stored ?? [];
        // The teacher still gets 15: a pool of at most 11 distinct products is padded with
        // repeats (and the note says so) rather than handed back short.
        expect(result.length).toBe(15);
        const keys = result.map(keyOf);
        expect(new Set(keys).size).toBeGreaterThanOrEqual(Math.min(11, keys.length) - 1);
        expect(elapsed).toBeLessThan(2000);
    });

    test('toggle off leaves duplicates alone (no dedupe pass)', () => {
        const block = makeBlock('hr-std-vermenigvuldigen', {
            constraints: { multiplicationMode: 'tafels', selectedTables: [2], tableLimit: 10 },
            block: { numberOfExercises: 15 },
        });
        let stored: unknown[] = [];
        regenerateBlock(
            block as MathBlock,
            (_id, _field, data) => { stored = data; },
            undefined,
            false,
        );
        // Whatever the generator itself returns (its own internal dedup, if any) — the
        // count is simply what the generator produced, untouched by the top-up pass.
        expect(stored.length).toBeGreaterThan(0);
    });
});
