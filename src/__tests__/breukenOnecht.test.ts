import { describe, test, expect, afterEach } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { kioskFor } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { EMPTY_INTERACTION } from '../components/viewer/ViewerInteractionContext';
import type { BreukBewerkExercise, Fraction, OrdenenExercise } from '../services/math/types';

// "Ook onechte breuken" on gelijknamig maken, vereenvoudigen and rangschikken (owner request 2026-10-28).
const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });
const seeded = <T,>(seed: number, fn: () => T): T => {
    Math.random = mulberry32(seed);
    try { return fn(); } finally { Math.random = realRandom; }
};

const bew = (constraints: Record<string, unknown>) => makeBlock('breuken-bewerken', { constraints, block: { numberOfExercises: 60 } });
const rang = (constraints: Record<string, unknown>) => makeBlock('breuken-rangschikken', { constraints, block: { numberOfExercises: 40 } });
const SEEDS = [1, 7, 42, 1234, 99999];

const bewFracs = (constraints: Record<string, unknown>, seed: number): Fraction[] =>
    seeded(seed, () => (generateFor(bew(constraints)) as BreukBewerkExercise[]).flatMap(e => e.inputs));
const rangFracs = (constraints: Record<string, unknown>, seed: number): Fraction[] =>
    seeded(seed, () => (generateFor(rang(constraints)) as OrdenenExercise[]).flatMap(e => e.values as Fraction[]));

const proper = (f: Fraction) => f.n >= 1 && f.n < f.d;
const improperOk = (f: Fraction) => f.n >= 1 && f.n !== f.d && f.n < 2 * f.d;

const CASES: { name: string; draw: (on: boolean | undefined, seed: number) => Fraction[] }[] = [
    { name: 'gelijknamig maken', draw: (on, s) => bewFracs({ subType: 'gelijknamig', minDenominator: 2, maxDenominator: 10, ...(on === undefined ? {} : { allowImproper: on }) }, s) },
    { name: 'vereenvoudigen', draw: (on, s) => bewFracs({ subType: 'vereenvoudigen', maxNumerator: 20, maxDenominator: 24, ...(on === undefined ? {} : { allowImproper: on }) }, s) },
    { name: 'rangschikken gelijknamige', draw: (on, s) => rangFracs({ fractionMode: 'gelijknamige', count: 4, ...(on === undefined ? {} : { allowImproper: on }) }, s) },
    { name: 'rangschikken gelijknamig te maken', draw: (on, s) => rangFracs({ fractionMode: 'gelijknamig-te-maken', count: 4, ...(on === undefined ? {} : { allowImproper: on }) }, s) },
];

describe.each(CASES)('$name', ({ draw }) => {
    test('off draws exactly what an absent flag draws, all proper', () => {
        for (const s of SEEDS) {
            const off = draw(false, s);
            expect(off).toEqual(draw(undefined, s));
            expect(off.every(proper)).toBe(true);
        }
    });
    test('on mixes proper and improper, never d/d, teller below 2d', () => {
        for (const s of SEEDS) {
            const on = draw(true, s);
            expect(on.every(improperOk)).toBe(true);
            const share = on.filter(f => f.n > f.d).length / on.length;
            expect(share).toBeGreaterThan(0.15);
            expect(share).toBeLessThan(0.85);
        }
    });
});

describe('the flag stays inside its modes', () => {
    test('stambreuken and speciale ignore it', () => {
        for (const fractionMode of ['stambreuken', 'speciale']) {
            for (const s of SEEDS) {
                expect(rangFracs({ fractionMode, allowImproper: true }, s)).toEqual(rangFracs({ fractionMode }, s));
            }
        }
    });
    test('vereenvoudigen keeps the teller and noemer caps when on', () => {
        for (const s of SEEDS) {
            const exs = seeded(s, () => generateFor(bew({ subType: 'vereenvoudigen', maxNumerator: 12, maxDenominator: 10, tablesOnly: false, allowImproper: true })) as BreukBewerkExercise[]);
            for (const e of exs) {
                expect(e.inputs[0].n).toBeLessThanOrEqual(12);
                expect(e.inputs[0].d).toBeLessThanOrEqual(10);
                expect(e.answers[0].n * e.inputs[0].d).toBe(e.inputs[0].n * e.answers[0].d);
            }
        }
    });
    test('gelijknamige with the flag fits more breuken on a small noemer (2d-2)', () => {
        // Noemer 4 holds 3 proper tellers; with 5/4, 6/4, 7/4 it holds 6.
        for (const s of SEEDS) {
            const exs = seeded(s, () => generateFor(rang({ fractionMode: 'gelijknamige', count: 5, minDenominator: 4, maxDenominator: 4, allowImproper: true })) as OrdenenExercise[]);
            for (const e of exs) expect(e.values).toHaveLength(5);
        }
    });
});

describe('kiosk with improper breuken', () => {
    test('rangschikken: a 5/4 card is solvable', () => {
        const d = kioskFor('breuken-rangschikken')!;
        const ia = d.interact!;
        const ex: OrdenenExercise = { id: 'o', operator: '<', display: [{ n: 5, d: 4 }, { n: 3, d: 4 }, { n: 7, d: 4 }], values: [{ n: 3, d: 4 }, { n: 5, d: 4 }, { n: 7, d: 4 }], isManuallyEdited: false };
        const c = { fractionMode: 'gelijknamige', allowImproper: true };
        const tapped = (order: string[]) => checkAnswer(d, ex, c, ia.fromState({ ...EMPTY_INTERACTION, order }, ex, c));
        expect(tapped(['1', '0', '2'])).toBe(true);
        expect(tapped(['0', '1', '2'])).toBe(false);
    });
    test('vereenvoudigen: an improper answer in lowest terms', () => {
        const d = kioskFor('breuken-bewerken')!;
        const ex: BreukBewerkExercise = { id: 'b', subType: 'vereenvoudigen', inputs: [{ n: 10, d: 4 }], answers: [{ n: 5, d: 2 }], isManuallyEdited: false };
        expect(checkAnswer(d, ex, {}, '5/2')).toBe(true);
        expect(checkAnswer(d, ex, {}, '10/4')).toBe(false);
    });
    test('vereenvoudigen: a whole-number answer reads 2 or 2/1', () => {
        const d = kioskFor('breuken-bewerken')!;
        const ex: BreukBewerkExercise = { id: 'b', subType: 'vereenvoudigen', inputs: [{ n: 6, d: 3 }], answers: [{ n: 2, d: 1 }], isManuallyEdited: false };
        expect(checkAnswer(d, ex, {}, '2')).toBe(true);
        expect(checkAnswer(d, ex, {}, '2/1')).toBe(true);
        expect(checkAnswer(d, ex, {}, '6/3')).toBe(false);
    });
    test('gelijknamig: improper inputs scale to the common noemer', () => {
        const d = kioskFor('breuken-bewerken')!;
        const ex: BreukBewerkExercise = { id: 'b', subType: 'gelijknamig', inputs: [{ n: 5, d: 4 }, { n: 1, d: 6 }], answers: [{ n: 15, d: 12 }, { n: 2, d: 12 }], isManuallyEdited: false };
        expect(checkAnswer(d, ex, {}, ['15/12', '2/12'])).toBe(true);
        expect(checkAnswer(d, ex, {}, ['30/24', '4/24'])).toBe(true);
        expect(checkAnswer(d, ex, {}, ['1 3/12', '2/12'])).toBe(false);
    });
});
