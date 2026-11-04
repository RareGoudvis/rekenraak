import { describe, test, expect } from 'vitest';
import { flattenLeaves } from '../config/appstructure';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { usableTargets } from '../services/afronden/afrondenGenerator';

// A leerjaar seed lowers the max under what a leaf's defaults assume: rounding to H at max 100,
// a 5-step line of 6 ticks at max 20. The seed must fit them, so a fresh block never opens on a
// setting its generator has to replace (and announce in a note).

const GRADES: Array<Leerjaar | null> = [null, 1, 2, 3, 4, 5, 6];
const leaves = flattenLeaves();
const baseFor = (g: Leerjaar | null) => (g == null ? DEFAULT_BASE : { ...DEFAULT_BASE, ...GRADE_PRESETS[g] });
const seed = (typeId: string, g: Leerjaar | null, override?: Record<string, unknown>, leafId?: string) =>
    seedConstraints({ typeId, base: baseFor(g), override, grade: g, leafId });

const cells = (typeIds: string[]) => leaves
    .filter(l => typeIds.includes(l.typeId))
    .flatMap(l => GRADES.map(g => [l.id, g, l] as const));

describe('rounding targets fit the seeded max', () => {
    test.each(cells(['schattend', 'afronden']))('%s at leerjaar %s', (_id, g, leaf) => {
        const c = seed(leaf.typeId, g, leaf.defaultConstraints, leaf.id);
        const targets = c.roundTargets as string[];
        expect(targets.length).toBeGreaterThan(0);
        const usable = usableTargets((c.numberType as string) ?? 'natural', c.maxGetal as number, (c.decimalPlaces as number) ?? 2, targets);
        expect(usable.map(t => t.key)).toEqual(targets);
    });

    test('the default schattend leaf: H from leerjaar 3, T below', () => {
        expect(GRADES.map(g => seed('schattend', g, { numberType: 'natural' }, 'schattend-nat').roundTargets))
            .toEqual([['H'], ['T'], ['T'], ['H'], ['H'], ['H'], ['H']]);
    });

    test('only the invalid targets go; none valid → the nearest valid one', () => {
        expect(seed('afronden', 2, { numberType: 'natural', roundTargets: ['T', 'H'] }).roundTargets).toEqual(['T']);
        expect(seed('schattend', 2, { numberType: 'natural', roundTargets: ['D', 'H'] }).roundTargets).toEqual(['T']);
        expect(seed('afronden', 4, { numberType: 'natural', roundTargets: ['T', 'D'] }).roundTargets).toEqual(['T', 'D']);
    });
});

describe('getallenas / getallenrijen spans fit the seeded max', () => {
    test.each(cells(['getallenas', 'getallenrijen']))('%s at leerjaar %s', (_id, g, leaf) => {
        const c = seed(leaf.typeId, g, leaf.defaultConstraints, leaf.id);
        if (c.numberType === 'rational') return;
        const max = c.maxGetal as number;
        const lo = c.numberType === 'geheel' ? ((c.minGetal as number | undefined) ?? -max) : 0;
        expect((c.step as number) * ((c.ticks as number) - 1)).toBeLessThanOrEqual(max - lo + 1e-9);
        expect(c.ticks as number).toBeGreaterThanOrEqual(4);
    });

    test('fewer ticks first, then a smaller step', () => {
        const nat = (over: Record<string, unknown>) => seed('getallenas', 1, { numberType: 'natural', ...over });
        expect([nat({}).step, nat({}).ticks]).toEqual([5, 5]);
        expect([nat({ step: 10, ticks: 10 }).step, nat({ step: 10, ticks: 10 }).ticks]).toEqual([5, 4]);
        expect([nat({ step: 100, ticks: 4 }).step, nat({ step: 100, ticks: 4 }).ticks]).toEqual([5, 4]);
    });

    test('a span that fits is left alone', () => {
        expect(seed('getallenrijen', 3, { numberType: 'natural', step: 50, ticks: 10 })).toMatchObject({ step: 50, ticks: 10 });
        expect(seed('getallenas', 1, { numberType: 'geheel', maxGetal: 20, step: 5, ticks: 6 })).toMatchObject({ step: 5, ticks: 6 });
    });
});
