import { describe, test, expect, afterEach } from 'vitest';
import type { DeelbaarheidExercise } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { seedLeafConstraints } from '../config/baseSettings';

// Veelvouden aanvullen: each row is its own stretch of the reeks (it was six copies of
// "0, 9, 18, …"), always consecutive multiples of the chosen number.

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; });

function run(extra: Record<string, unknown> = {}, count?: number): DeelbaarheidExercise[][] {
    const seeded = seedLeafConstraints('deelbaarheid-veelvouden', null, extra)!;
    return Array.from({ length: 20 }, (_, i) => {
        Math.random = mulberry32(i + 1);
        const block = makeBlock(seeded.typeId, { leafId: 'deelbaarheid-veelvouden', constraints: seeded.constraints, block: count ? { numberOfExercises: count } : {} });
        return REGISTRY.deelbaarheid.generate(block) as DeelbaarheidExercise[];
    });
}

describe('deelbaarheid veelvouden', () => {
    test.each<[Record<string, unknown>, number | undefined]>([
        [{}, undefined],
        [{ base: 2, terms: 12 }, undefined],
        [{ base: 25, terms: 4, givenCount: 1 }, 10],
    ])('%j: every row a different reeks of consecutive multiples', (extra, count) => {
        for (const items of run(extra, count)) {
            expect(items.length).toBe(count ?? 6);
            const keys = new Set(items.map(ex => ex.sequence!.join(',')));
            expect(keys.size, [...keys].join(' | ')).toBe(items.length);
            for (const ex of items) {
                const seq = ex.sequence!;
                expect(seq).toHaveLength((extra.terms as number | undefined) ?? 6);
                expect(seq[0] % ex.base!).toBe(0);
                for (let i = 1; i < seq.length; i++) expect(seq[i] - seq[i - 1]).toBe(ex.base);
                expect(ex.givenCount).toBeGreaterThanOrEqual(1);
            }
        }
    });

    test('the classic reeks from 0 still comes up', () => {
        expect(run().flat().some(ex => ex.sequence![0] === 0)).toBe(true);
    });
});
