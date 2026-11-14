import { describe, test, expect, afterEach } from 'vitest';
import { seedLeafConstraints, DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { LEERJAREN } from '../config/gradePresets';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import cards from '../config/eenvoudig/cards.json';
import type { CardVariant } from '../config/eenvoudig/cards';
import { listOefenLeaves, seedRowConstraints } from '../components/oefenen/oefenBuild';
import { REGISTRY } from '../config/exerciseRegistry';
import { makeBlock } from './helpers/makeBlock';
import type { FractionExercise } from '../services/math/types';

// Breuk van een hoeveelheid follows the tafels per leerjaar (owner 2026-11-14): leerjaar 3 noemers up to 10.
const ID = 'breuken-hoeveelheid';
const EXPECTED = { 1: [4, 20], 2: [4, 20], 3: [10, 100], 4: [10, 100], 5: [10, 100], 6: [10, 100] } as const;

const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; });

describe('breuk van een hoeveelheid: the leerjaar seeds noemer and total', () => {
    test.each(LEERJAREN)('sidebar add at leerjaar %i', (g) => {
        const c = seedLeafConstraints(ID, g)!.constraints;
        expect([c.maxDenominator, c.maxTotal]).toEqual(EXPECTED[g]);
    });

    test('no leerjaar keeps the leaf default (old links, kiosk tables)', () => {
        const c = seedLeafConstraints(ID, null)!.constraints;
        expect([c.maxDenominator, c.maxTotal]).toEqual([5, 20]);
    });

    test('a value the author changed wins over the leerjaar', () => {
        const c = seedLeafConstraints(ID, 3, { maxTotal: 40 })!.constraints;
        expect([c.maxDenominator, c.maxTotal]).toEqual([10, 40]);
        const abstract = seedLeafConstraints(ID, 3, { subType: 'hoeveelheid-abstract' })!.constraints;
        expect(abstract.maxDenominator).toBe(5);
    });

    test('a curriculum lock (no grade) is left alone', () => {
        const c = seedConstraints({ typeId: 'breuken', base: DEFAULT_BASE, override: { subType: 'hoeveelheid', maxDenominator: 5, maxTotal: 20 }, grade: null, leafId: ID });
        expect([c.maxDenominator, c.maxTotal]).toEqual([5, 20]);
    });

    test('the Oefenmodus builder row at leerjaar 3', () => {
        const leaf = listOefenLeaves().find(l => l.id === ID)!;
        const c = seedRowConstraints(leaf, 3);
        expect([c.maxDenominator, c.maxTotal]).toEqual([10, 100]);
    });

    test('the Eenvoudig leerjaar 3 drawing card (and Zelf oefenen, which lists the cards)', () => {
        const vars = (cards as unknown as { types: { vars: CardVariant[] }[] }).types.flatMap(t => t.vars)
            .filter(v => v.leafId === ID && v.lj === 3 && !('subType' in v.ov));
        expect(vars.length).toBeGreaterThan(0);
        for (const v of vars) {
            const c = resolveCard(v).constraints;
            expect([c.maxDenominator, c.maxTotal]).toEqual([10, 100]);
        }
    });

    test('the generator stays inside noemer 10 and total 100, total a multiple of the noemer', () => {
        const c = seedLeafConstraints(ID, 3)!.constraints;
        const seen = new Set<number>();
        for (let s = 0; s < 60; s++) {
            const block = makeBlock('breuken', { leafId: ID, constraints: c, block: { numberOfExercises: 8 } });
            for (const ex of REGISTRY.breuken.generate(block) as FractionExercise[]) {
                seen.add(ex.denominator);
                expect(ex.denominator).toBeLessThanOrEqual(10);
                expect(ex.total!).toBeLessThanOrEqual(100);
                expect(ex.total! % ex.denominator).toBe(0);
                expect(ex.numerator).toBeLessThan(ex.denominator);
            }
        }
        expect(seen.has(10)).toBe(true);
    });
});
