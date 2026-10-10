import { describe, test, expect } from 'vitest';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { flattenLeaves } from '../config/appstructure';
import { REGISTRY } from '../config/exerciseRegistry';
import { nextExercise, type OefenExercise } from '../services/oefenen/scheduler';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import type { Leerjaar } from '../config/gradePresets';
import { mulberry32 } from './helpers/limitHarness';

// Kiosk triage K2: the draws of a leaf must vary and stay within what the leaf promises.
const LEAVES = new Map(flattenLeaves().map(l => [l.id, l]));

function draws(leafId: string, n: number, seed: number, extra: Record<string, unknown> = {}, grade: Leerjaar | null = null): OefenExercise[] {
    const leaf = LEAVES.get(leafId)!;
    const constraints = seedConstraints({ typeId: leaf.typeId, base: DEFAULT_BASE, override: { ...leaf.defaultConstraints, ...extra }, grade, leafId });
    const type: OefenType = { typeId: leaf.typeId, leafId, label: leaf.label, constraints, weight: 1 };
    const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
    const rng = mulberry32(seed * 7919);
    return Array.from({ length: n }, () => nextExercise(sessie, type, new Set(), rng)!);
}
const answers = (leafId: string, list: OefenExercise[]) => {
    const d = REGISTRY[LEAVES.get(leafId)!.typeId].kiosk!;
    return list.map(o => d.answerOf(o.exercise as never, o.constraints).join('/'));
};

describe('K2 task 1: deelbaarheid-veelvouden kiosk varies', () => {
    test('6 draws give at least 4 distinct rows, over 30 seeds', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const got = answers('deelbaarheid-veelvouden', draws('deelbaarheid-veelvouden', 6, seed));
            expect(new Set(got).size, `seed ${seed}: ${got.join(' | ')}`).toBeGreaterThanOrEqual(4);
        }
    });
    test('the deler comes from the teacher set (base or the divisors)', () => {
        for (let seed = 1; seed <= 30; seed++) {
            for (const o of draws('deelbaarheid-veelvouden', 6, seed, { base: 7, divisors: [3, 4] })) {
                const base = (o.exercise as { base: number }).base;
                expect([7, 3, 4]).toContain(base);
            }
        }
    });
});

describe('K2 task 2: omtrek (gegeven) varies, geld-wissel offers four bills', () => {
    test('6 omtrek draws give at least 4 distinct perimeters, over 30 seeds', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const got = draws('omtrek', 6, seed, { measureModel: 'gegeven' }).map(o => (o.exercise as { perimeter: number }).perimeter);
            expect(new Set(got).size, `seed ${seed}: ${got.join(' ')}`).toBeGreaterThanOrEqual(4);
        }
    });
    test('geld-wissel defaults to the bills 5, 10, 20 and 50 (sheet and kiosk)', () => {
        const leaf = LEAVES.get('geld-wissel')!;
        const c = seedConstraints({ typeId: leaf.typeId, base: DEFAULT_BASE, override: leaf.defaultConstraints, grade: null, leafId: leaf.id });
        expect(c.exerciseBills).toEqual([500, 1000, 2000, 5000]);
    });
    test('geld-wissel draws reach every default bill', () => {
        const got = new Set(draws('geld-wissel', 40, 3).map(o => (o.exercise as { billValueCents: number }).billValueCents));
        expect([...got].sort((a, b) => a - b)).toEqual([500, 1000, 2000, 5000]);
    });
});

describe('K2 task 4: herleidingen magnitudes', () => {
    const LEAVES4 = ['herleidingen-lengte', 'herleidingen-inhoud', 'herleidingen-massa', 'herleidingen-oppervlakte'];
    const biggest = (o: OefenExercise) => {
        const ex = o.exercise as { fromParts: Array<{ value: number }>; toParts: Array<{ value: number }> };
        return Math.max(...ex.fromParts.concat(ex.toParts).map(p => p.value));
    };
    test.each(LEAVES4)('%s at leerjaar 3 stays within 10 000 (200 seeds)', (leafId) => {
        for (let seed = 1; seed <= 200; seed++) {
            const o = draws(leafId, 1, seed, {}, 3)[0];
            expect(biggest(o), `seed ${seed}: ${JSON.stringify(o.exercise)}`).toBeLessThanOrEqual(10_000);
        }
    });
    test.each([3, 4] as Leerjaar[])('oppervlakte at leerjaar %i has no compound exercise (200 seeds)', (grade) => {
        for (let seed = 1; seed <= 200; seed++) {
            const ex = draws('herleidingen-oppervlakte', 1, seed, {}, grade)[0].exercise as { fromParts: unknown[]; toParts: unknown[] };
            expect(Math.max(ex.fromParts.length, ex.toParts.length), `seed ${seed}`).toBe(1);
        }
    });
    test('oppervlakte at the defaults never shows more than 6 digits (200 seeds)', () => {
        for (let seed = 1; seed <= 200; seed++) {
            const o = draws('herleidingen-oppervlakte', 1, seed)[0];
            expect(biggest(o), `seed ${seed}: ${JSON.stringify(o.exercise)}`).toBeLessThanOrEqual(999_999);
        }
    });
    test('a teacher-pinned maxWaarde wins over the leerjaar seed', () => {
        const o = draws('herleidingen-lengte', 1, 1, { maxWaarde: 99 }, 3)[0];
        expect(biggest(o)).toBeLessThanOrEqual(99);
    });
});
