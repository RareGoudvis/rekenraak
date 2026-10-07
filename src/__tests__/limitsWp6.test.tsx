// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { kalenderShortNote } from '../services/kalender/kalenderGenerator';
import { generateForBlock } from '../services/generateDispatch';
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
    test('ordenen decimal + mask H at max 100 is not empty', () => {
        const items = gen('ordenen', { numberType: 'decimal', maxGetal: 100, decimalPlaces: 1, numberMask: { H: true }, count: 3 }, 5) as OrdenenExercise[];
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

describe('generation notes (never silently change what the teacher picked)', () => {
    const noted = (typeId: string, constraints: Record<string, unknown>, count: number) =>
        REGISTRY[typeId].generateNoted!(makeBlock(typeId, { constraints, block: { numberOfExercises: count } }));

    test('ordenen: a relaxed mask is reported, singular and plural', () => {
        const c = { numberType: 'decimal', maxGetal: 100, decimalPlaces: 1, numberMask: { H: true }, count: 3 };
        expect(noted('ordenen', c, 1).note).toBe('De getalopbouw past niet bij dit maximum; voor 1 oefening is ze losgelaten.');
        expect(noted('ordenen', c, 4).note).toBe('De getalopbouw past niet bij dit maximum; voor 4 oefeningen is ze losgelaten.');
        expect(noted('ordenen', { numberType: 'natural', maxGetal: 100, count: 3 }, 4).note).toBeNull();
    });
    test('geld-herkennen: coupures that were not ticked are reported', () => {
        const r = noted('geld-herkennen', { allowedDenominations: [5], format: 'euros' }, 3);
        expect(r.note).toBe('De gekozen coupures volstaan niet voor 3 oefeningen; daarvoor zijn ook andere coupures gebruikt.');
        expect(noted('geld-herkennen', {}, 3).note).toBeNull();
    });
    test('geld-tekenen: an amount the ticked set cannot make is reported', () => {
        const r = noted('geld-tekenen', { allowedDenominations: [50000], maxGetal: 10, format: 'euros' }, 2);
        expect(r.note).toBe('Bij 2 oefeningen is het bedrag niet met de gekozen coupures te leggen.');
        for (const ex of noted('geld-tekenen', { allowedDenominations: [200], maxGetal: 20, format: 'euros' }, 8).items as GeldExercise[]) expect(ex.amountCents % 200).toBe(0);
    });
    test('kalender: fewer questions than asked is reported', () => {
        const r = noted('kalender', { subType: 'maandrooster', questionTypes: ['tellen'], questionCount: 5 }, 1);
        expect(r.note).toBe('Bij deze vraagsoorten is er maar 1 vraag per rooster mogelijk (gevraagd: 5).');
        expect(kalenderShortNote(3, 5)).toBe('Bij deze vraagsoorten zijn er maar 3 verschillende vragen per rooster mogelijk (gevraagd: 5).');
        expect(kalenderShortNote(5, 5)).toBeNull();
    });
    test('repeat fills carry the duplicate note', () => {
        expect(noted('maateenheid', { grootheden: ['temperatuur'] }, 40).note).toMatch(/^Kleine reeks: \d+ oefeningen komen dubbel voor\.$/);
        expect(noted('herleidingen', { measure: 'lengte', units: ['hm', 'dam'], maxEnkel: 20, formats: ['enkel-getal'] }, 40).note).toMatch(/^Kleine reeks: 20 oefeningen komen dubbel voor\.$/);
        expect(noted('geld-teruggeven', { payWithOptions: [500], centenDeel: 'vijfentwintig' }, 40).note).toMatch(/^Kleine reeks: 28 oefeningen komen dubbel voor\.$/);
    });
    test('dispatch keeps its Kleine reeks wording (single source in generationNotes)', () => {
        const block = makeBlock('maateenheid', { constraints: { grootheden: ['temperatuur'] }, block: { numberOfExercises: 40 } });
        expect(generateForBlock(block, true).note).toMatch(/Kleine reeks: \d+ oefeningen komen dubbel voor\./);
        const one = makeBlock('geld-teruggeven', { constraints: { payWithOptions: [500], minPriceEuros: 1, maxPriceEuros: 1, centenDeel: 'vijfentwintig' }, block: { numberOfExercises: 4 } });
        expect(generateForBlock(one, true).note).toBe('Kleine reeks: 1 oefening komt dubbel voor.');
    });
    test('breuken-rangschikken: too few noemers for the count is reported', () => {
        const r = noted('breuken-rangschikken', { fractionMode: 'gelijknamig-te-maken', minDenominator: 7, maxDenominator: 7, count: 4 }, 3);
        expect(r.note).toMatch(/past maar 1 breuk per/);
    });
});

describe('L21 stale Ondergrens hint', () => {
    const HINT = /Ondergrens valt buiten het bereik/;
    test.each(['getallenas', 'getallenrijen', 'ordenen', 'getalpatronen'])('%s shows the hint only when minGetal < -max', (typeId) => {
        const { Config } = EXERCISE_UI[typeId];
        const stale = makeBlock(typeId, { constraints: { numberType: 'geheel', maxGetal: 100, minGetal: -1000 } });
        const { container, unmount } = render(<Config block={stale} />);
        expect(container.textContent).toMatch(HINT);
        expect(container.textContent).toContain('(−100 tot 100)');
        expect(container.textContent).toContain('Ondergrens: −1 000');
        unmount();
        const ok = makeBlock(typeId, { constraints: { numberType: 'geheel', maxGetal: 100, minGetal: -100 } });
        const r2 = render(<Config block={ok} />);
        expect(r2.container.textContent).not.toMatch(HINT);
    });
});
