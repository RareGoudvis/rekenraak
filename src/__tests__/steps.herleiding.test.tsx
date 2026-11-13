// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { REGISTRY } from '../config/exerciseRegistry';
import { codecForType } from '../services/steps/tutorCodecs';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { stepsFor } from '../services/stepsAvailability';
import { stepText, type StepLine } from '../services/math/workedSteps';
import { herleidingSteps, herleidTabel } from '../services/steps/herleidingSteps';
import { ladderFor } from '../services/herleidingen/herleidingenGenerator';
import { makeBlock } from './helpers/makeBlock';
import type { HerleidingExercise } from '../services/math/types';

// Worked steps for herleidingen with the herleidingstabel: the lines, the table they fill, the tutor
// codec and the visual.

afterEach(cleanup);

const fmt = (n: number) => String(n).replace('.', ',');
const text = (lines: StepLine[] | null) => lines!.map(l => (l.question ? `${l.question} → ${stepText(l.tokens, fmt)}` : stepText(l.tokens, fmt)));
const herl = (from: [string, number][], to: [string, number][], blank: 'number' | 'unit' = 'number'): HerleidingExercise =>
    ({ id: 'x', format: 'enkel-getal', fromParts: from.map(([key, value]) => ({ key, value })), toParts: to.map(([key, value]) => ({ key, value })), blank, isManuallyEdited: false });

describe('herleidingen with the herleidingstabel', () => {
    it('3 km = ? m: place, count the steps, fill the zeros, read', () => {
        expect(text(herleidingSteps(herl([['km', 3]], [['m', 3000]])))).toEqual([
            'Zet 3 km in de tabel. → 3 onder km',
            'Hoeveel stappen is het van km naar m? → Van km naar m: 3 stappen naar rechts, dus × 1000',
            'Welke lege vakjes krijgen een 0? → onder hm, dam en m',
            'Lees het getal af tot onder m. → 3000 m',
            '3 km = 3000 m',
        ]);
    });

    it('compound, unit asked, oppervlakte and a komma', () => {
        expect(text(herleidingSteps(herl([['cm', 325]], [['m', 3], ['dm', 2], ['cm', 5]])))).toEqual([
            'Zet 325 cm in de tabel. → 325: de 5 onder cm', 'Lees per eenheid af. → 3 m 2 dm 5 cm', '325 cm = 3 m 2 dm 5 cm',
        ]);
        expect(text(herleidingSteps(herl([['m', 3000]], [['km', 3]], 'unit')))).toEqual([
            'Zet 3 000 m in de tabel. → 3000: de 0 onder m', 'Onder welke eenheid staat het laatste cijfer van 3? → onder km', '3000 m = 3 km',
        ]);
        expect(text(herleidingSteps(herl([['m²', 500]], [['a', 5]])))[1]).toBe('Hoeveel stappen is het van m² naar a? → Van m² naar a: 1 stap naar links, dus : 100');
        expect(text(herleidingSteps(herl([['ha', 2], ['a', 5], ['ca', 7]], [['m²', 20507]])))[3]).toBe('Welke lege vakjes krijgen een 0? → onder dam² en m²');
        expect(text(herleidingSteps(herl([['cm', 250]], [['m', 2.5]]))).slice(-2)).toEqual(['Lees het getal af tot onder m. → 2,5 m', '250 cm = 2,5 m']);
        // A compound answer leaves out its zero parts, like the key.
        expect(text(herleidingSteps(herl([['dl', 71]], [['l', 7], ['dl', 1], ['cl', 0]]))).at(-1)).toBe('71 dl = 7 l 1 dl');
    });

    it('a wrong answer or a mix of measures has no steps', () => {
        expect(herleidingSteps(herl([['km', 3]], [['m', 300]]))).toBeNull();
        expect(herleidingSteps(herl([['km', 3]], [['l', 3000]]))).toBeNull();
    });

    it('the table: the boxes per unit, the zeros, the read boxes', () => {
        const t = herleidTabel(herl([['cm', 250]], [['m', 2.5]]))!;
        expect(t.cols.map(c => c.key)).toEqual(['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']);
        expect(t.cells.map(c => c.digit ?? '').join('')).toBe('250');
        expect(t.reads).toEqual([{ key: 'm', lo: 3, hi: 3, value: 2.5 }]);
        expect(t.fracLo).toBe(2);
        const opp = herleidTabel(herl([['ha', 2], ['a', 5], ['ca', 7]], [['m²', 20507]]))!;
        expect(opp.width).toBe(2);
        expect(opp.cols.find(c => c.key === 'hm²')?.alias).toBe('ha');
        expect(opp.cells.filter(c => c.zero).map(c => c.pos)).toEqual([9, 7]);
    });

    it.each(['lengte', 'inhoud', 'massa', 'oppervlakte'])('every generated %s exercise has steps that end on its answer', (measure) => {
        for (const extra of [{}, { compoundMode: 'volledig' }, { formats: ['vierkant-are', 'are-vierkant'] }, { formats: ['vierkant-are', 'are-vierkant'], areMode: 'enkel' }]) {
            if (measure !== 'oppervlakte' && 'formats' in extra) continue;
            const units = ladderFor(measure).map(u => u.key);
            const block = makeBlock('herleidingen', { constraints: { measure, units, ...extra }, block: { numberOfExercises: 40 } });
            for (const ex of REGISTRY.herleidingen.generate(block) as HerleidingExercise[]) {
                const lines = stepsFor('herleidingen', ex, block.constraints);
                expect(lines, JSON.stringify(ex)).not.toBeNull();
                expect(lines!.slice(0, -1).every(l => l.question)).toBe(true);
            }
        }
    });
});

describe('tutor codecs', () => {
    const roundTrip = (typeId: string, ex: unknown) => {
        const codec = codecForType(typeId)!;
        const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, {}))));
        expect(data).not.toBeNull();
        expect(codec.steps(data!)).toEqual(stepsFor(typeId, ex, {}));
        return { codec, data: data! };
    };

    it('herleidingen travels as its parts and rebuilds the same steps', () => {
        const { codec, data } = roundTrip('herleidingen', herl([['m', 3], ['cm', 25]], [['cm', 325]]));
        expect(codec.id).toBe('hl');
        expect(stepText(codec.sum(data), fmt)).toBe('3 m 25 cm = ? cm');
        const u = roundTrip('herleidingen', herl([['m', 3000]], [['km', 3]], 'unit'));
        expect(stepText(u.codec.sum(u.data), fmt)).toBe('3000 m = 3 ?');
        expect(codec.in(['n', [['km', 3]], [['m', 300]]])).toBeNull();
        expect(codec.in(['n', [['zz', 3]], [['m', 3]]])).toBeNull();
        expect(codec.in(['n', [['km', '3']], [['m', 3000]]])).toBeNull();
    });
});

describe('steps visuals', () => {
    it('the herleidingstabel places, steps, fills and reads', () => {
        const ex = herl([['km', 3]], [['m', 3000]]);
        const lines = herleidingSteps(ex)!;
        const draw = stepsVisualFor('herleidingen', ex, lines, 'tutor')!;
        const at = (revealed: number) => { cleanup(); return render(<>{draw(revealed)}</>).container; };
        const row = (c: HTMLElement) => [...c.querySelectorAll('tbody tr:first-child td')].map(td => td.textContent).join('|');
        expect(row(at(0))).toBe('||||||');
        expect(row(at(1))).toBe('3||||||');
        expect(at(2).querySelectorAll('.steps-herl-arrows td')[3].textContent).toBe('→');
        expect(row(at(3))).toBe('3|0|0|0|||');
        const read = at(4);
        expect(read.querySelectorAll('td.is-read')).toHaveLength(4);
        expect(read.querySelector('th.is-target')?.textContent).toBe('m');
        // Hidden from screen readers: the lines carry the method in words.
        expect(read.querySelector('.steps-herl')?.getAttribute('aria-hidden')).toBe('true');
    });
});
