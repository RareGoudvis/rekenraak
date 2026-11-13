// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { REGISTRY } from '../config/exerciseRegistry';
import { codecForType } from '../services/steps/tutorCodecs';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { stepsFor } from '../services/stepsAvailability';
import { stepLineText, stepText, type StepLine } from '../services/math/workedSteps';
import { formatMathNumber } from '../services/math/formatters';
import { afrondenSteps } from '../services/steps/afrondenSteps';
import { axisValues, getallenasSteps, valueText } from '../services/steps/getallenasSteps';
import { roundTo, targetsFor } from '../services/afronden/roundTargets';
import { makeBlock } from './helpers/makeBlock';
import type { AfrondenExercise, Fraction, GetallenasExercise } from '../services/math/types';

afterEach(cleanup);

const read = (ls: StepLine[] | null) => ls?.map(l => [l.question ?? '', l.hint ?? '', stepLineText(l, formatMathNumber)]);
const afr = (number: number, targetKey: string, decimalPlaces?: number): AfrondenExercise => ({ id: 'a', number, targetKey, ...(decimalPlaces && { decimalPlaces }), isManuallyEdited: false });
const axis = (values: (number | Fraction)[], mask: string, jumps?: number[]): GetallenasExercise => ({
    id: 'g', start: 0, step: 0, tickCount: values.length, blankMask: [...mask].map(c => c === '1'), direction: 'right', values, ...(jumps && { jumps }), isManuallyEdited: false,
});
const generate = (typeId: string, constraints: Record<string, unknown>, count = 12) =>
    REGISTRY[typeId].generate({ ...makeBlock(typeId, { constraints }), numberOfExercises: count }) as unknown[];

describe('afronden steps', () => {
    it('347 op een tiental: between, the deciding digit, up, then 347 ≈ 350', () => {
        expect(read(afrondenSteps(afr(347, 'T')))).toEqual([
            ['Tussen welke twee tientallen ligt 347?', 'Maak de cijfers rechts van de tientallen 0: dat is het eerste getal.', '340 en 350'],
            ['Welk cijfer beslist?', 'Kijk naar het cijfer rechts van de tientallen.', 'de eenheden: 7'],
            ['Rond je naar boven of naar beneden af?', '5 of meer: naar boven. Minder dan 5: naar beneden.', '7 is 5 of meer: naar boven'],
            ['', '', '347 ≈ 350'],
        ]);
    });

    it('down, decimals keep their printed zeros, the millions read in words, a round number has nothing to ask', () => {
        expect(read(afrondenSteps(afr(3249, 'H')))!.map(r => r[2])).toEqual(['3 200 en 3 300', 'de tientallen: 4', '4 is minder dan 5: naar beneden', '3 249 ≈ 3 200']);
        expect(read(afrondenSteps(afr(55.97, 't', 2)))).toEqual([
            ['Tussen welke twee getallen met 1 cijfer na de komma ligt 55,97?', 'Laat de cijfers rechts van de tienden weg: dat is het eerste getal.', '55,9 en 56,0'],
            ['Welk cijfer beslist?', 'Kijk naar het cijfer rechts van de tienden.', 'de honderdsten: 7'],
            ['Rond je naar boven of naar beneden af?', '5 of meer: naar boven. Minder dan 5: naar beneden.', '7 is 5 of meer: naar boven'],
            ['', '', '55,97 ≈ 56,0'],
        ]);
        expect(read(afrondenSteps(afr(7.5, 'E', 1)))![0][0]).toBe('Tussen welke twee gehele getallen ligt 7,5?');
        expect(read(afrondenSteps(afr(999_999_999, 'Mrd')))!.map(r => r[2])).toEqual(['0 en 1 000 000 000', 'de honderdtallen miljoenen: 9', '9 is 5 of meer: naar boven', '999 999 999 ≈ 1 000 000 000']);
        expect(read(afrondenSteps(afr(300, 'T')))).toEqual([['', '', '300 ligt al op een tiental, dus 300 ≈ 300']]);
        expect(read(afrondenSteps(afr(4.1, 't', 2)))).toEqual([['', '', '4,10 ligt al op een tiende, dus 4,10 ≈ 4,1']]);
        // A rooster row (numbers, no number) has no steps; neither has an exercise without its target: the block's first.
        expect(afrondenSteps({ id: 'r', numbers: [347, 512], isManuallyEdited: false })).toBeNull();
        expect(read(afrondenSteps({ id: 'x', number: 4.37, decimalPlaces: 2, isManuallyEdited: false }, { numberType: 'decimal' }))!.at(-1)![2]).toBe('4,37 ≈ 4');
    });

    it('every generated simpel exercise: the pair holds the number, the digit is the one right of the place, the closing is the sheet answer', () => {
        const settings = [
            { subType: 'simpel', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] },
            { subType: 'simpel', numberType: 'natural', maxGetal: 1_000_000_000, roundTargets: ['T', 'D', 'HD', 'M', 'Mrd'] },
            { subType: 'simpel', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] },
            { subType: 'simpel', numberType: 'decimal', maxGetal: 10, decimalPlaces: 3, roundTargets: ['E', 't', 'h'] },
        ];
        for (const c of settings) {
            for (const ex of generate('afronden', c, 30) as AfrondenExercise[]) {
                const t = targetsFor(c.numberType).find(x => x.key === ex.targetKey)!;
                const lines = stepsFor('afronden', ex, c)!;
                const n = ex.number!;
                const closing = stepText(lines.at(-1)!.tokens, formatMathNumber).replace(/\s/g, '');
                expect(closing.endsWith(`≈${formatMathNumber(roundTo(n, t.weight).toFixed(Math.max(0, -Math.round(Math.log10(t.weight)))))}`.replace(/\s/g, '')), `${n} ${t.key}`).toBe(true);
                if (lines.length === 1) { expect(roundTo(n, t.weight)).toBeCloseTo(n, 9); continue; }
                const [lo, hi] = stepText(lines[0].tokens).split(' en ').map(s => Number(s.replace(/\s/g, '').replace(',', '.')));
                expect(lo).toBeLessThan(n);
                expect(hi).toBeGreaterThan(n);
                expect(hi - lo).toBeCloseTo(t.weight, 9);
                const digit = lines[1].tokens.at(-1);
                const expected = Math.floor(Math.round(n * 1e6) / Math.round(t.weight * 1e5)) % 10;
                expect(digit).toEqual({ t: 'num', v: expected });
                expect(stepText(lines[2].tokens).includes('boven')).toBe(expected >= 5);
            }
        }
    });

    it('the codec carries the resolved target and the printed decimals; out → JSON → in → steps equals the sheet', () => {
        const codec = codecForType('afronden')!;
        for (const c of [{ subType: 'simpel', numberType: 'natural', maxGetal: 10000, roundTargets: ['T', 'H', 'D'] }, { subType: 'simpel', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] }]) {
            for (const ex of generate('afronden', c) as AfrondenExercise[]) {
                const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, c))));
                expect(codec.steps(data!)).toEqual(stepsFor('afronden', ex, c));
            }
        }
        expect(codec.out({ id: 'x', number: 4.37, decimalPlaces: 2, isManuallyEdited: false }, { numberType: 'decimal' })).toEqual([4.37, 'E', 2]);
        expect(codec.out({ id: 'r', numbers: [1, 2], isManuallyEdited: false }, {})).toBeNull();
        for (const bad of [[347], [347, 'X'], [-1, 'T'], ['347', 'T'], [4.37, 't', 9], [1e12, 'T']]) expect(codec.in(bad)).toBeNull();
        expect(stepText(codec.sum(codec.in([4.1, 't', 2])!))).toBe('4,10 ≈ … (t)');
        expect(stepText(codec.sum(codec.in([2_500_000, 'M'])!))).toBe('2 500 000 ≈ … (1M)');
    });

    it('the visual: ends are "?" until the pair is found, then the place is underlined, the digit marked, the arrow drawn', () => {
        const ex = afr(347, 'T');
        const lines = afrondenSteps(ex)!;
        const draw = stepsVisualFor('afronden', ex, lines, 'kiosk')!;
        const at = (r: number) => { cleanup(); return render(<>{draw(r)}</>).container; };
        let c = at(0);
        expect([...c.querySelectorAll('.sv-afr-end')].map(e => e.textContent)).toEqual(['?', '?']);
        expect(c.querySelector('.sv-afr-dot')).toBeNull();
        expect(c.querySelector('.sv-afr-number')!.textContent).toBe('347');
        c = at(1);
        expect([...c.querySelectorAll('.sv-afr-end')].map(e => e.textContent)).toEqual(['340', '350']);
        expect(c.querySelector('.is-place')!.textContent).toBe('4');
        expect(c.querySelector('.is-decider')).toBeNull();
        c = at(2);
        expect(c.querySelector('.is-decider')!.textContent).toBe('7');
        expect(c.querySelector('.sv-afr-end.is-chosen')).toBeNull();
        c = at(3);
        expect(c.querySelector('.sv-afr-end.is-chosen')!.textContent).toBe('350');
        expect(c.querySelectorAll('.sv-afr-jump')).toHaveLength(1);
        // A decimal: the place and digit sit after the comma.
        const d = afr(55.97, 't', 2);
        cleanup();
        const dc = render(<>{stepsVisualFor('afronden', d, afrondenSteps(d)!, 'tutor')!(2)}</>).container;
        expect(dc.querySelector('.is-place')!.textContent).toBe('9');
        expect(dc.querySelector('.is-decider')!.textContent).toBe('7');
    });
});

// A value as the steps print it, back to a number: "1 1/4", "−5", "0,25", "1 000".
function parse(text: string): number {
    const s = text.trim().replace(/−/g, '-');
    if (s.includes('/')) {
        const parts = s.split(/\s+/);
        const [n, d] = parts.at(-1)!.split('/').map(Number);
        return (parts.length > 1 ? Number(parts[0]) : 0) + n / d;
    }
    return Number(s.replace(/\s/g, '').replace(',', '.'));
}
const num = (v: number | Fraction) => (typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d);

describe('getallenas / getallenrijen steps', () => {
    it('one sprong: found between two neighbours, then the blanks left to right, then the row', () => {
        expect(read(getallenasSteps(axis([25, 30, 35, 40, 45], '00101')))).toEqual([
            ['Hoe groot is de sprong?', 'Kijk naar twee getallen naast elkaar.', 'van 25 naar 30: +5'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 30 en spring +5.', '30 + 5 = 35'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 40 en spring +5.', '40 + 5 = 45'],
            ['', '', '25, 30, 35, 40, 45'],
        ]);
    });

    it('a decreasing row without two neighbours: the difference over the sprongen', () => {
        expect(read(getallenasSteps(axis([50, 40, 30, 20, 10], '01101')))).toEqual([
            ['Hoe groot is de sprong?', 'Zoek twee getallen die je kent. Hoeveel sprongen liggen ertussen?', 'van 50 naar 20 zijn 3 sprongen: 30 : 3 = 10, dus −10'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 50 en spring −10.', '50 − 10 = 40'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 40 en spring −10.', '40 − 10 = 30'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 20 en spring −10.', '20 − 10 = 10'],
            ['', '', '50, 40, 30, 20, 10'],
        ]);
    });

    it('mixed jumps in one row, breuken, negatives, decimals (a semicolon between them), and a blank only reachable from the right', () => {
        expect(read(getallenasSteps(axis([3, 8, 18, 23, 33, 38], '000101', [5, 10])))).toEqual([
            ['Welke sprongen zie je?', 'Kijk vooraan in de rij: van elk getal naar het volgende.', '+5, dan +10, en zo verder'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 18 en spring +5.', '18 + 5 = 23'],
            ['Welk getal komt op de volgende lege plek?', 'Begin bij 33 en spring +5.', '33 + 5 = 38'],
            ['', '', '3, 8, 18, 23, 33, 38'],
        ]);
        expect(read(getallenasSteps(axis([{ n: 1, d: 4 }, { n: 1, d: 2 }, { n: 3, d: 4 }, 1, { whole: 1, n: 1, d: 4 }], '00011')))!.map(r => r[2]))
            .toEqual(['van 1/4 naar 1/2: +1/4', '3/4 + 1/4 = 1', '1 + 1/4 = 1 1/4', '1/4, 1/2, 3/4, 1, 1 1/4']);
        expect(read(getallenasSteps(axis([-10, -5, 0, 5], '0101')))!.map(r => r[2]))
            .toEqual(['van −10 naar 0 zijn 2 sprongen: 10 : 2 = 5, dus +5', '−10 + 5 = −5', '0 + 5 = 5', '−10, −5, 0, 5']);
        expect(read(getallenasSteps(axis([0.25, 0.5, 0.75, 1], '0011')))!.at(-1)![2]).toBe('0,25; 0,5; 0,75; 1');
        expect(read(getallenasSteps(axis([20, 15, 10, 5], '1001')))!.slice(1).map(r => r.slice(1)))
            .toEqual([['Begin bij 15 en spring terug: +5.', '15 + 5 = 20'], ['Begin bij 10 en spring −5.', '10 − 5 = 5'], ['', '20, 15, 10, 5']]);
        // No method: one given number, nothing blank, or a mixed row whose opening cells are hidden.
        expect(getallenasSteps(axis([5, 10, 15, 20], '0111'))).toBeNull();
        expect(getallenasSteps(axis([5, 10, 15, 20], '0000'))).toBeNull();
        expect(getallenasSteps(axis([3, 8, 18, 23, 33], '01000', [5, 10]))).toBeNull();
    });

    const SETTINGS: [string, Record<string, unknown>][] = [
        ['getallenas', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right' }],
        ['getallenas', { numberType: 'natural', maxGetal: 1000, step: 50, direction: 'beide', hardMode: true }],
        ['getallenas', { numberType: 'decimal', maxGetal: 10, step: 0.25, direction: 'left' }],
        ['getallenas', { numberType: 'geheel', maxGetal: 20, step: 5, direction: 'beide' }],
        ['getallenas', { numberType: 'rational', fractionStep: 4, allowMixed: true }],
        ['getallenas', { numberType: 'rational', fractionStep: 6, gelijknamig: true, allowMixed: false, direction: 'left' }],
        ['getallenas', { numberType: 'natural', maxGetal: 100, step: 2, jumps: [2, 5, 10], direction: 'beide' }],
        ['getallenrijen', { numberType: 'natural', maxGetal: 100, step: 5, jumps: [5, 10], jumpMode: 'per-rij', direction: 'beide' }],
        ['getallenrijen', { numberType: 'natural', maxGetal: 200, step: 5, jumps: [5, 10], jumpMode: 'in-rij', direction: 'beide', hardMode: true }],
        ['getallenrijen', { numberType: 'decimal', maxGetal: 10, step: 0.1, jumps: [0.1, 0.5], jumpMode: 'in-rij', direction: 'left' }],
        ['getallenrijen', { numberType: 'rational', fractionStep: 3, maxTeller: 12 }],
    ];

    it('every generated row has steps; every fill adds the right sprong to a number already known and lands on that place', () => {
        for (const [typeId, c] of SETTINGS) {
            for (const ex of generate(typeId, c) as GetallenasExercise[]) {
                const lines = stepsFor(typeId, ex, c);
                expect(lines, `${typeId} ${JSON.stringify(ex.values)} ${ex.blankMask}`).not.toBeNull();
                const values = axisValues(ex);
                const known = values.map((_, k) => !ex.blankMask[k]);
                for (const l of lines!.slice(1, -1)) {
                    const k = Number(l.mark);
                    expect(known[k]).toBe(false);
                    const [lhs, rhs] = stepText(l.tokens, formatMathNumber).split(' = ');
                    const m = lhs.match(/^(.+) ([+−]) (.+)$/)!;
                    const from = parse(m[1]);
                    const result = m[2] === '+' ? from + parse(m[3]) : from - parse(m[3]);
                    expect(result).toBeCloseTo(num(values[k]), 9);
                    expect(parse(rhs)).toBeCloseTo(num(values[k]), 9);
                    // The number it starts from is a neighbour the pupil already has.
                    const n = [k - 1, k + 1].find(i => known[i] && Math.abs(num(values[i]) - from) < 1e-9);
                    expect(n, `${l.hint}`).toBeDefined();
                    known[k] = true;
                }
                expect(known.every(Boolean)).toBe(true);
                expect(stepText(lines!.at(-1)!.tokens, formatMathNumber).split(/; |, (?=[−\d])/).length).toBe(values.length);
                // The sprong line names the row's own jump(s).
                const signed = (j: number) => valueText(Math.abs(j));
                const first = Number((num(values[1]) - num(values[0])).toFixed(9));
                if (values.every(v => typeof v === 'number')) expect(stepText(lines![0].tokens, formatMathNumber)).toContain(`${first > 0 ? '+' : '−'}${signed(first)}`);
            }
        }
    });

    it('both codecs: out → JSON → in → steps equals the sheet, the data keeps the exercise shape, broken data is refused', () => {
        for (const [typeId, c] of SETTINGS) {
            const codec = codecForType(typeId)!;
            for (const ex of generate(typeId, c) as GetallenasExercise[]) {
                const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, c)))) as GetallenasExercise;
                expect(codec.steps(data)).toEqual(stepsFor(typeId, ex, c));
                expect(data.values).toEqual(axisValues(ex));
                expect(data.direction).toBe(ex.direction);
            }
        }
        expect(codecForType('getallenas')!.id).toBe('ga');
        expect(codecForType('getallenrijen')!.id).toBe('gr');
        const codec = codecForType('getallenrijen')!;
        expect(stepText(codec.sum(codec.in([[25, 30, 35, 40], '0011'])!))).toBe('25, 30, □, …');
        expect(stepText(codec.sum(codec.in([[1.5, 2, 2.5], '010'])!), formatMathNumber)).toBe('1,5; □; 2,5');
        for (const bad of [[[1, 2, 3], '01'], [[1, 2, 3], '0x1'], [[1, 'a', 3], '010'], [[1, [1, 0], 3], '010'], [[1, 2, 3], '010', [5]], [[5, 10, 15, 20], '0111'], 'x', null]) {
            expect(codec.in(bad), JSON.stringify(bad)).toBeNull();
        }
    });

    it('the visual: arcs get their sprong once it is found, the next empty place is outlined, blanks fill in one by one', () => {
        const ex = axis([25, 30, 35, 40, 45], '00101');
        const lines = getallenasSteps(ex)!;
        for (const [typeId, look] of [['getallenas', 'as'], ['getallenrijen', 'rij']] as const) {
            const draw = stepsVisualFor(typeId, ex, lines, 'kiosk')!;
            const at = (r: number) => { cleanup(); return render(<>{draw(r)}</>).container; };
            let c = at(0);
            expect(c.querySelector(`.sv-jr-${look}`)).toBeTruthy();
            expect(c.querySelectorAll('.sv-jr-jump.is-unknown')).toHaveLength(4);
            expect(c.querySelectorAll('.sv-jr-jump text')).toHaveLength(0);
            expect(c.querySelector('.is-next')).toBeNull();
            expect(c.querySelector('svg')!.getAttribute('aria-label')).toBe('25, 30, …, 40, …');
            c = at(1);
            expect([...c.querySelectorAll('.sv-jr-jump text')].map(t => t.textContent)).toEqual(['+5', '+5', '+5', '+5']);
            expect(c.querySelectorAll('.is-next')).toHaveLength(1);
            c = at(2);
            expect(c.querySelector('.sv-jr-new')!.textContent).toBe('35');
            expect(c.querySelector('svg')!.getAttribute('aria-label')).toBe('25, 30, 35, 40, …');
            c = at(4);
            expect(c.querySelectorAll('.sv-jr-filled, .sv-jr-new')).toHaveLength(2);
            expect(c.querySelector('.is-next')).toBeNull();
        }
        // A breuken row stacks its breuken; a mixed row labels each arc with its own jump.
        cleanup();
        const fr = axis([{ n: 1, d: 4 }, { n: 1, d: 2 }, { n: 3, d: 4 }, 1, { whole: 1, n: 1, d: 4 }], '00011');
        const fc = render(<>{stepsVisualFor('getallenrijen', fr, getallenasSteps(fr)!, 'tutor')!(3)}</>).container;
        expect(fc.querySelectorAll('.sv-jr-bar').length).toBe(4);
        cleanup();
        const mx = axis([3, 8, 18, 23, 33, 38], '000101', [5, 10]);
        const mc = render(<>{stepsVisualFor('getallenrijen', mx, getallenasSteps(mx)!, 'kiosk')!(1)}</>).container;
        expect([...mc.querySelectorAll('.sv-jr-jump text')].map(t => t.textContent)).toEqual(['+5', '+10', '+5', '+10', '+5']);
    });
});
