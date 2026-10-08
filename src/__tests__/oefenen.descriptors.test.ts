import { describe, test, expect } from 'vitest';
import type { AfrondenExercise, CijferExercise, Equation, Fraction, ProcentExercise, VergelijkenExercise } from '../services/math/types';
import type { KioskDescriptor, KioskInput, OefenSessie, OefenType } from '../services/oefenen/types';
import type { AppLeaf } from '../config/appstructure';
import { LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { seedConstraints } from '../config/baseSettings';
import { targetsFor } from '../services/afronden/afrondenGenerator';
import { formatMathNumber } from '../services/math/formatters';
import { kioskCapableLeaves, kioskFor, kioskInputOf, kioskSupports } from '../services/oefenen/kiosk';
import { nextExercise } from '../services/oefenen/scheduler';
import { checkAnswer, normaliseFraction, normaliseNumber } from '../services/oefenen/check';
import { fractionSpellings, numberSpellings } from '../services/oefenen/kioskDescriptors';
import { gradeBase, mulberry32 } from './helpers/limitHarness';
import { sanitizeAnswer } from '../oefenen/useOefenStore';
import { evaluateChain, isFraction, numValue, scaled } from './helpers/answerKeys';

// Every kiosk-capable leaf × every leerjaar seed × 50 seeds: the descriptor's answer must be
// the generator's own answer field, and checkAnswer must take it (in every spelling) and
// refuse a wrong one.

const SEEDS = 50;

const EXPECTED_LEAVES = [
    'hr-std-optellen-nat', 'hr-std-optellen-dec', 'hr-std-optellen-rat',
    'hr-std-aftrekken-nat', 'hr-std-aftrekken-dec', 'hr-std-aftrekken-rat',
    'hr-std-vermenigvuldigen-nat', 'hr-std-vermenigvuldigen-dec', 'hr-std-vermenigvuldigen-rat',
    'hr-std-delen-nat', 'hr-std-delen-dec', 'hr-std-delen-rat',
    'procenten-nemen', 'procenten-welk', 'afronden-nat-simpel', 'afronden-dec-simpel', 'vergelijken-getallen',
    'hr-std-gemengd-nat', 'hr-std-gemengd-dec',
    'cijferen-optellen-nat', 'cijferen-optellen-dec', 'cijferen-aftrekken-nat', 'cijferen-aftrekken-dec',
    'cijferen-vermenigvuldigen-nat', 'cijferen-vermenigvuldigen-dec', 'cijferen-delen-nat', 'cijferen-delen-dec',
];

// Parses an accepted spelling back to a value, independently of check.ts.
function valueOf(spelling: string): number {
    const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(spelling);
    if (m) return (m[1] ? -1 : 1) * (Number(m[2] ?? 0) + Number(m[3]) / Number(m[4]));
    return Number(spelling.replace(',', '.'));
}

const missingIdx = (eq: Equation) =>
    eq.missingIndex ?? (eq.missingTerm === 'operand1' ? 0 : eq.missingTerm === 'operand2' ? 1 : undefined);

// Written from scratch: half up on scaled integers.
function roundHalfUp(n: number, weight: number): number {
    const units = Math.round(n * 1e6), step = Math.round(weight * 1e6);
    return (Math.floor((units + step / 2) / step) * step) / 1e6;
}

// What the pupil must give: a number, [quotiënt, rest], a choice, accepted words, accepted
// times or one number per field.
type Truth = number | [number, number] | string | { text: string[] } | { time: Array<[number, number]> } | { multi: number[] };

// Every cijferen leaf is its own typeId; the answer must also redo the column sum.
function cijferTruth(ex: CijferExercise): Truth {
    const [a, b] = ex.operands;
    if (ex.operator === ':') {
        expect(scaled(ex.answer * b + ex.remainder)).toBe(scaled(a));
        expect(ex.remainder).toBeGreaterThanOrEqual(0);
        return [ex.answer, ex.remainder];
    }
    const want = ex.operator === '+' ? ex.operands.reduce((x, y) => x + y, 0) : ex.operator === '-' ? a - b : a * b;
    expect(scaled(want)).toBe(scaled(ex.answer));
    return ex.answer;
}

function hrTruth(eq: Equation): Truth {
    if (eq.remainder !== undefined) return [eq.answer as number, eq.remainder];
    // The equation itself must hold, so a field that agrees with answerOf is also right.
    expect(scaled(evaluateChain(eq)), JSON.stringify(eq)).toBe(scaled(numValue(eq.answer)));
    const idx = missingIdx(eq);
    return numValue(idx !== undefined ? eq.operands[idx] : eq.answer);
}

// The value the pupil must give, read straight from the generator's fields, per typeId.
const TRUTH: Record<string, (ex: never, c: Record<string, unknown>) => Truth> = {
    procenten: (p: ProcentExercise, c) => {
        expect(scaled((p.base * p.percent) / 100)).toBe(scaled(p.answer));
        return c.subType === 'welk-percent' ? p.percent : p.answer;
    },
    afronden: (a: AfrondenExercise, c) => {
        const t = targetsFor(c.numberType as string).find(x => x.key === a.targetKey);
        expect(t, `target ${a.targetKey}`).toBeDefined();
        return roundHalfUp(a.number as number, t!.weight);
    },
    vergelijken: (v: VergelijkenExercise) => (v.a! < v.b! ? '<' : v.a! > v.b! ? '>' : '='),
};

function generatorAnswer(typeId: string, ex: unknown, c: Record<string, unknown>): Truth {
    if (typeId.startsWith('hr-std-')) return hrTruth(ex as Equation);
    if (typeId.startsWith('cijferen-')) return cijferTruth(ex as CijferExercise);
    const f = TRUTH[typeId];
    expect(f, `no truth for ${typeId}`).toBeDefined();
    return f(ex as never, c);
}

const wrongNumber = (x: number) => numberSpellings(x + 1)[0];

describe('kiosk-capable leaves', () => {
    test('exactly the expected leaves; roosters / representaties / drawing stay out', () => {
        const ids = kioskCapableLeaves().map(l => l.id);
        expect([...ids].sort()).toEqual([...EXPECTED_LEAVES].sort());
    });

    test('supported() follows the settings, registry defaults filling gaps', () => {
        expect(kioskSupports('afronden', { subType: 'simpel' })).toBe(true);
        expect(kioskSupports('afronden', {})).toBe(false);
        expect(kioskSupports('vergelijken', {})).toBe(true);
        expect(kioskSupports('vergelijken', { subType: 'kiezen' })).toBe(false);
        expect(kioskSupports('procenten', {})).toBe(true);
        expect(kioskSupports('klok-kloklezen', {})).toBe(false);
        expect(kioskSupports('nope', {})).toBe(false);
    });
});

describe('descriptor answers agree with the generators', () => {
    test.each(kioskCapableLeaves().map(l => [l.id, l] as const))('%s', (_id, leaf) => {
        const inputs = agreeOverSeeds(leaf);
        expect([...inputs.values()].reduce((a, b) => a + b, 0)).toBe(SEEDS * 7);
    });

    // Settings a teacher picks in the builder that the leaf defaults never reach.
    test.each<[string, Record<string, unknown>, string]>([
        ['hr-std-optellen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-optellen-nat', { equationType: 'puntoefening', termCount: 3 }, 'missing-operand'],
        ['hr-std-aftrekken-dec', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-vermenigvuldigen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-vermenigvuldigen-nat', { multiplicationMode: 'andere' }, 'number'],
        ['hr-std-delen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-delen-nat', { multiplicationMode: 'met_rest' }, 'number+rest'],
        ['hr-std-delen-rat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-aftrekken-rat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-optellen-nat', { numberType: 'geheel' }, 'number'],
        ['hr-std-aftrekken-nat', { numberType: 'geheel' }, 'number'],
        ['afronden-dec-simpel', { decimalPlaces: 3, roundTargets: ['E', 't', 'h'] }, 'number'],
        ['procenten-welk', { percents: [1, 5, 10, 20, 25, 50, 75] }, 'number'],
        ['vergelijken-getallen', { decimalPlaces: 2 }, 'choice'],
    ])('%s + %j → %s', (leafId, extra, want) => {
        const leaf = kioskCapableLeaves().find(l => l.id === leafId)!;
        const inputs = agreeOverSeeds(leaf, extra);
        expect(inputs.get(want as KioskInput) ?? 0, JSON.stringify([...inputs])).toBeGreaterThan(0);
    });
});

// Runs the agreement checks for one leaf (+ extra settings) over every grade × SEEDS seeds;
// returns how often each input kind came up.
function agreeOverSeeds(leaf: AppLeaf, extra: Record<string, unknown> = {}): Map<KioskInput, number> {
    const inputs = new Map<KioskInput, number>();
    const d = kioskFor(leaf.typeId)!;
    for (const grade of [null, ...LEERJAREN] as Array<Leerjaar | null>) {
        const constraints = seedConstraints({ typeId: leaf.typeId, base: gradeBase(grade), override: { ...leaf.defaultConstraints, ...extra }, grade, leafId: leaf.id });
        const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
        const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
        for (let seed = 1; seed <= SEEDS; seed++) {
            const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 7919 + (grade ?? 0)));
            expect(got, `L${grade} seed ${seed}: no exercise`).not.toBeNull();
            const { exercise: ex, constraints: c } = got!;
            const where = `L${grade} seed ${seed}: ${JSON.stringify(ex)}`;
            const accepted = d.answerOf(ex, c);
            const input = kioskInputOf(d, ex, c);
            const truth = generatorAnswer(leaf.typeId, ex, c);
            expect(d.display(ex, c), where).toContain('?');

            const keys = d.keys?.(c) ?? [];
            // The pupil can type every field's first spelling with the keys on offer.
            const typeable = (a: string) => expect(sanitizeAnswer(a, keys, input).replace(',', '.'), `${where} untypeable ${a} keys ${keys}`).toBe(a.replace(',', '.'));

            if (input === 'number+rest') {
                const [q, r] = truth as [number, number];
                expect(accepted.map(Number), where).toEqual([q, r]);
                accepted.forEach(typeable);
                expect(checkAnswer(d, ex, c, accepted), where).toBe(true);
                expect(checkAnswer(d, ex, c, [` 0${accepted[0]} `, accepted[1]]), where).toBe(true);
                expect(checkAnswer(d, ex, c, [accepted[0], String(r + 1)]), where).toBe(false);
                expect(checkAnswer(d, ex, c, accepted[0]), where).toBe(false);
            } else if (input === 'choice') {
                const choices = d.choicesOf?.(ex, c) ?? d.choices ?? [];
                expect(accepted, where).toEqual([truth]);
                expect(choices, where).toContain(truth);
                expect(new Set(choices).size, where).toBe(choices.length);
                expect(checkAnswer(d, ex, c, truth as string), where).toBe(true);
                for (const other of choices.filter(x => x !== truth)) expect(checkAnswer(d, ex, c, other), where).toBe(false);
            } else if (input === 'text') {
                const { text } = truth as { text: string[] };
                for (const t of text) {
                    expect(checkAnswer(d, ex, c, t), where).toBe(true);
                    expect(checkAnswer(d, ex, c, ` ${t.toLowerCase()} `), where).toBe(true);
                    expect(checkAnswer(d, ex, c, `${t}x`), where).toBe(false);
                }
                expect(accepted.map(a => a.toLowerCase()), where).toContain(text[0].toLowerCase());
                typeable(accepted[0]);
                expect(checkAnswer(d, ex, c, ''), where).toBe(false);
            } else if (input === 'time') {
                const { time } = truth as { time: Array<[number, number]> };
                const hm = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
                for (const [h, m] of time) {
                    expect(accepted, where).toContain(hm(h, m));
                    expect(checkAnswer(d, ex, c, [String(h), String(m).padStart(2, '0')]), where).toBe(true);
                    expect(checkAnswer(d, ex, c, [String(h), String((m + 1) % 60)]), where).toBe(false);
                }
                for (const a of accepted) expect(time.some(([h, m]) => a === hm(h, m)), `${where} extra ${a}`).toBe(true);
            } else if (input === 'multi-number') {
                const { multi } = truth as { multi: number[] };
                expect(accepted.length, where).toBe(multi.length);
                accepted.forEach((a, i) => {
                    for (const alt of a.split('|')) expect(scaled(valueOf(alt)), where).toBe(scaled(multi[i]));
                    typeable(a.split('|')[0]);
                });
                const firsts = accepted.map(a => a.split('|')[0]);
                expect(checkAnswer(d, ex, c, firsts), where).toBe(true);
                const last = multi.length - 1;
                expect(checkAnswer(d, ex, c, firsts.map((a, i) => (i === last ? wrongNumber(multi[i]) : a))), where).toBe(false);
                expect(checkAnswer(d, ex, c, firsts.slice(0, last)), where).toBe(false);
            } else {
                for (const a of accepted) {
                    expect(scaled(valueOf(a)), where).toBe(scaled(truth as number));
                    expect(checkAnswer(d, ex, c, a), where).toBe(true);
                }
                const first = accepted[0];
                typeable(first);
                if (!first.includes('/')) {
                    // The sheet's own spelling (space thousands, decimal comma) is accepted too.
                    expect(checkAnswer(d, ex, c, formatMathNumber(first.replace(',', '.'))), where).toBe(true);
                    expect(checkAnswer(d, ex, c, wrongNumber(truth as number)), where).toBe(false);
                } else {
                    expect(checkAnswer(d, ex, c, `${first}1`), where).toBe(false);
                }
                expect(checkAnswer(d, ex, c, ''), where).toBe(false);
            }
            inputs.set(input, (inputs.get(input) ?? 0) + 1);
        }
    }
    return inputs;
}

describe('inputs per exercise', () => {
    const d = kioskFor('hr-std-delen')!;
    const eq = (over: Partial<Equation>): Equation => ({ id: 'x', operands: [12, 4], operator: ':', answer: 3, isManuallyEdited: false, ...over });
    test('puntoefening = missing-operand, met rest = number+rest, else number', () => {
        expect(kioskInputOf(d, eq({}), {})).toBe('number');
        expect(kioskInputOf(d, eq({ missingIndex: 1 }), {})).toBe('missing-operand');
        expect(kioskInputOf(d, eq({ missingTerm: 'operand1' }), {})).toBe('missing-operand');
        expect(kioskInputOf(d, eq({ operands: [14, 4], remainder: 2 }), {})).toBe('number+rest');
        expect(d.answerOf(eq({ missingIndex: 1 }), {})).toEqual(['4']);
        expect(d.answerOf(eq({ operands: [14, 4], remainder: 2 }), {})).toEqual(['3', '2']);
        expect(d.display(eq({ missingIndex: 0 }), {})).toBe('? : 4 = 3');
        expect(d.display(eq({ operands: [14, 4], remainder: 2 }), {})).toBe('14 : 4 = ? r ?');
    });
    test('keypad keys come from the settings', () => {
        expect(d.keys!({ numberType: 'decimal' })).toEqual([',']);
        expect(d.keys!({ numberType: 'rational' })).toEqual(['/', ' ']);
        expect(d.keys!({ numberType: 'natural' })).toEqual([]);
    });
    test('display uses the sheet glyphs', () => {
        const add = kioskFor('hr-std-vermenigvuldigen')!;
        expect(add.display(eq({ operands: [1200, 3], operator: 'x', answer: 3600 }), {})).toBe('1 200 × 3 = ?');
        expect(kioskFor('procenten')!.display({ id: 'p', percent: 25, base: 80, answer: 20, isManuallyEdited: false }, { subType: 'welk-percent' })).toBe('20 van 80 = ? %');
        expect(kioskFor('afronden')!.display({ id: 'a', number: 3.47, targetKey: 't', isManuallyEdited: false }, { subType: 'simpel', numberType: 'decimal' })).toBe('3,47 ≈ ? (op tiende)');
    });
});

describe('text, time and multi-number checks', () => {
    const fake = (input: KioskInput, accepted: string[]): KioskDescriptor => ({ input, answerOf: () => accepted, display: () => '?' });
    test('text: case and outer spaces do not count', () => {
        const d = fake('text', ['XIV']);
        expect(checkAnswer(d, {}, {}, ' xiv ')).toBe(true);
        expect(checkAnswer(d, {}, {}, 'XV')).toBe(false);
        expect(checkAnswer(d, {}, {}, '')).toBe(false);
    });
    test('time: uur + minuten against every accepted spelling', () => {
        const d = fake('time', ['8:05', '20:05']);
        expect(checkAnswer(d, {}, {}, ['08', '05'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['20', '5'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['8', '50'])).toBe(false);
        expect(checkAnswer(d, {}, {}, ['8', ''])).toBe(false);
        expect(checkAnswer(d, {}, {}, '8:05')).toBe(false);
    });
    test('multi-number: every field in order, alternatives per field', () => {
        const d = fake('multi-number', ['12', '1 1/2|3/2', '2,5']);
        expect(checkAnswer(d, {}, {}, ['12', '3/2', '2.5'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['12', '1 1/2', '2,50'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['2,5', '3/2', '12'])).toBe(false);
        expect(checkAnswer(d, {}, {}, ['12', '3/2'])).toBe(false);
    });
    test('sanitize: a text field keeps letters, a time field two digits', () => {
        expect(sanitizeAnswer('MM3x IV!', [], 'text')).toBe('MMx IV');
        expect(sanitizeAnswer('1234', [], 'time')).toBe('12');
        expect(sanitizeAnswer('1:2', [':'], 'time')).toBe('12');
    });
});

describe('spellings and normalisation', () => {
    test('numbers: comma and dot', () => {
        expect(numberSpellings(2.5)).toEqual(['2,5', '2.5']);
        expect(numberSpellings(0.1 + 0.2)).toEqual(['0,3', '0.3']);
        expect(numberSpellings(1234)).toEqual(['1234']);
    });
    test('fractions: mixed and improper, whole values as integers', () => {
        const f = (whole: number, n: number, d: number): Fraction => ({ whole, n, d });
        expect(fractionSpellings(f(1, 3, 4))).toEqual(['1 3/4', '7/4']);
        expect(fractionSpellings({ n: 3, d: 4 })).toEqual(['3/4']);
        expect(fractionSpellings({ n: 9, d: 4 })).toEqual(['2 1/4', '9/4']);
        expect(fractionSpellings({ n: 8, d: 4 })).toEqual(['2']);
        expect(fractionSpellings({ n: 0, d: 4 })).toEqual(['0']);
        expect(isFraction({ n: 1, d: 2 })).toBe(true);
    });
    test.each([
        ['7', '7'], [' 007 ', '7'], ['1 234', '1234'], ['1 234,50', '1234.5'], ['2,5', '2.5'], ['2.50', '2.5'],
        ['0,0', '0'], ['-0', '0'], ['−12', '-12'], [',5', '0.5'], ['5,', '5'],
    ])('normaliseNumber(%j) = %j', (raw, want) => expect(normaliseNumber(raw)).toBe(want));
    test.each(['', ',', 'abc', '1,2,3', '1.2,3', '--1', '1-'])('normaliseNumber(%j) = null', raw => expect(normaliseNumber(raw)).toBeNull());
    test.each([
        ['3/4', '3/4'], [' 1  3 / 4 ', '1 3/4'], ['03/04', '3/4'], ['0 3/4', '3/4'],
    ])('normaliseFraction(%j) = %j', (raw, want) => expect(normaliseFraction(raw)).toBe(want));
    test.each(['3/0', '3/', '/4', '1 2 3/4'])('normaliseFraction(%j) = null', raw => expect(normaliseFraction(raw)).toBeNull());
});
