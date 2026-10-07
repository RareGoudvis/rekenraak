// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { EXERCISE_UI } from '../config/exerciseUI';
import type { OrdenenExercise, GeldExercise, VerbandExercise } from '../services/math/types';

// Limit-audit WP6: generators must never throw or come back empty on reachable settings.
const gen = (typeId: string, constraints: Record<string, unknown>, count?: number) =>
    generateFor(makeBlock(typeId, { constraints, block: count ? { numberOfExercises: count } : undefined })) as unknown[];

afterEach(cleanup);

describe('E2 herleidingen alias-only units', () => {
    test.each([['m²', 'ca'], ['hm²', 'ha'], ['dam²', 'a']])('%s + %s does not throw and fills the block', (a, b) => {
        const items = gen('herleidingen', { measure: 'oppervlakte', units: [a, b] }, 8);
        expect(items.length).toBe(8);
    });
});

describe('E4b no empty or short blocks', () => {
    test('ordenen decimal + mask D at max 100 is not empty', () => {
        const items = gen('ordenen', { numberType: 'decimal', maxGetal: 100, decimalPlaces: 1, numberMask: { D: true }, count: 3 }, 5) as OrdenenExercise[];
        expect(items.length).toBe(5);
        for (const ex of items) expect(ex.values.length).toBeGreaterThan(0);
    });
    test.each([7, 9, 11])('breuken-rangschikken gelijknamig-te-maken at noemer %i is not empty', (d) => {
        const items = gen('breuken-rangschikken', { fractionMode: 'gelijknamig-te-maken', minDenominator: d, maxDenominator: d }, 5) as OrdenenExercise[];
        expect(items.length).toBe(5);
        for (const ex of items) expect(ex.values.length).toBeGreaterThan(0);
    });
    test('herleidingen hm + dam enkel-getal at max 20 fills 40', () => {
        expect(gen('herleidingen', { measure: 'lengte', units: ['hm', 'dam'], maxEnkel: 20, formats: ['enkel-getal'] }, 40).length).toBe(40);
    });
    test('maateenheid temperatuur only fills 40', () => {
        expect(gen('maateenheid', { grootheden: ['temperatuur'] }, 40).length).toBe(40);
    });
    test('geld-teruggeven EUR 5 only + 25ct fills 40', () => {
        expect(gen('geld-teruggeven', { payWithOptions: [500], centenDeel: 'vijfentwintig' }, 40).length).toBe(40);
    });
});

describe('E6 verbanden given vs reps', () => {
    test('an untoggled given representation is never used', () => {
        const items = gen('verbanden', { reps: ['breuk', 'decimaal'], given: 'procent' }, 8) as VerbandExercise[];
        expect(items.length).toBeGreaterThan(0);
        for (const ex of items) expect(['breuk', 'decimaal']).toContain(ex.given);
    });
});

describe('E8 geld degenerate denominations', () => {
    test.each([
        ['none ticked', { allowedDenominations: [] as number[], format: 'euros' }],
        ['only bills above the max', { allowedDenominations: [50000], maxGetal: 10, format: 'euros' }],
        ['5 c only, euros', { allowedDenominations: [5], format: 'euros' }],
    ])('geld-herkennen %s keeps a drawable amount', (_n, constraints) => {
        for (const ex of gen('geld-herkennen', constraints, 8) as GeldExercise[]) {
            expect(ex.amountCents).toBeGreaterThan(0);
            expect(ex.denominations.reduce((s, d) => s + d.valueCents * d.count, 0)).toBe(ex.amountCents);
            if (constraints.format === 'euros') expect(ex.amountCents % 100).toBe(0);
        }
    });
});

describe('L21 stale Ondergrens hint', () => {
    const HINT = /Ondergrens valt buiten het bereik/;
    test.each(['getallenas', 'getallenrijen', 'ordenen', 'getalpatronen'])('%s shows the hint only when minGetal < -max', (typeId) => {
        const { Config } = EXERCISE_UI[typeId];
        const stale = makeBlock(typeId, { constraints: { numberType: 'geheel', maxGetal: 100, minGetal: -1000 } });
        const { container, unmount } = render(<Config block={stale} />);
        expect(container.textContent).toMatch(HINT);
        expect(container.textContent).toContain('−100 tot 100');
        unmount();
        const ok = makeBlock(typeId, { constraints: { numberType: 'geheel', maxGetal: 100, minGetal: -100 } });
        const r2 = render(<Config block={ok} />);
        expect(r2.container.textContent).not.toMatch(HINT);
    });
});
