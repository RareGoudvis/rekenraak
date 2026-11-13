// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REGISTRY } from '../config/exerciseRegistry';
import { codecById, codecForType, codecsForType, TUTOR_CODECS } from '../services/steps/tutorCodecs';
import { STEPS_VISUALS, stepsVisualFor } from '../components/steps/stepsVisuals';
import { decodeTutor, encodeTutorPage, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { packText } from '../services/oefenen/session';
import { blockHasTutorSteps, stepsFor } from '../services/stepsAvailability';
import { breukHoeveelheidSteps, workedSteps } from '../services/math/workedSteps';
import StepsPanel from '../oefenen/kiosk/StepsPanel';
import TutorApp from '../tutor/TutorApp';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';

// The per-type steps foundation: tutor codecs (QR wire) and steps visuals register themselves by file,
// old QRs keep decoding, and both the kiosk panel and the stappenhulp draw a type's visual above its steps.

afterEach(() => { cleanup(); window.location.hash = ''; localStorage.clear(); });

const frac = (t: number, n: number, g: number): FractionExercise => ({ id: 'f', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, isManuallyEdited: false });
const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;
const breukBlock = (exercises: FractionExercise[]) => ({ ...makeBlock('breuken', { id: 'b' }), itemNumbering: 'letter', fractionExercises: exercises } as MathBlock);

describe('tutor codec registry', () => {
    it('every codec has a unique wire id and only carries typeIds that have steps', () => {
        expect(TUTOR_CODECS.length).toBeGreaterThan(0);
        expect(new Set(TUTOR_CODECS.map(c => c.id)).size).toBe(TUTOR_CODECS.length);
        for (const c of TUTOR_CODECS) {
            expect(c.id).toMatch(/^[a-z0-9]{1,3}$/);
            for (const t of c.typeIds) expect(REGISTRY[t]?.steps, `${c.id} → ${t}`).toBeTruthy();
        }
        // A typeId may carry several codecs (breuken sums ride on hoofdrekenen), but one codec never lists a typeId twice.
        for (const c of TUTOR_CODECS) expect(new Set(c.typeIds).size, c.id).toBe(c.typeIds.length);
        expect(codecsForType('hr-std-optellen').map(c => c.id)).toEqual(['bs']);
        expect(codecForType('breuken')?.id).toBe('h');
        expect(codecById('h')).toBe(codecForType('breuken'));
    });

    it('a codec round trip gives the steps the sheet gives (out → JSON → in → steps)', () => {
        const codec = codecForType('breuken')!;
        for (const ex of [frac(1, 5, 20), frac(3, 4, 28), frac(2, 3, 12)]) {
            const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, {}))));
            expect(codec.steps(data!)).toEqual(stepsFor('breuken', ex, {}));
        }
        expect(codec.out({ ...frac(1, 4, 8), subType: 'kleuren' }, {})).toBeNull();
        expect(codec.in([1, 'a', 3])).toBeNull();
    });

    it('steps visuals register by file and only for typeIds with steps; the hoeveelheid groups stay out of the kiosk', () => {
        for (const v of STEPS_VISUALS) for (const t of v.typeIds) expect(REGISTRY[t]?.steps, t).toBeTruthy();
        const lines = breukHoeveelheidSteps(frac(1, 5, 20))!;
        expect(stepsVisualFor('breuken', frac(1, 5, 20), lines, 'kiosk')).toBeUndefined();
        // Hoofdrekenen has the MAB visual (leerjaar 1–3); its applies() refuses what it cannot draw, so no empty box.
        expect(stepsVisualFor('hr-std-optellen', {}, lines, 'tutor', { grade: 2 })).toBeUndefined();
        const sum: Equation = { id: 'x', operands: [475, 368], operator: '+', answer: 843, isManuallyEdited: false };
        expect(stepsVisualFor('hr-std-optellen', sum, workedSteps(sum)!, 'tutor', { grade: 2 })).toBeDefined();
        expect(stepsVisualFor('hr-std-optellen', sum, workedSteps(sum)!, 'tutor')).toBeUndefined();
        const draw = stepsVisualFor('breuken', frac(1, 5, 20), lines, 'tutor')!;
        const { container } = render(<>{draw(2)}</>);
        // Two answers revealed (geheel, noemer): 20 objects in 5 numbered outline groups, none chosen yet.
        expect(container.querySelectorAll('.steps-visual .tutor-hv-dot')).toHaveLength(20);
        expect(container.querySelectorAll('.tutor-hv-dot.is-grouped')).toHaveLength(20);
        expect(container.querySelectorAll('.tutor-hv-dot.is-chosen')).toHaveLength(0);
    });

    it('codecs and visuals stay light: no registry, generator or viewer import (the tutor bundle loads them all)', () => {
        const dirs = ['src/services/steps', 'src/services/steps/codecs', 'src/components/steps', 'src/components/steps/visuals'];
        for (const dir of dirs) {
            for (const f of readdirSync(dir).filter(n => /\.tsx?$/.test(n))) {
                const src = readFileSync(join(dir, f), 'utf8');
                expect(src, `${dir}/${f}`).not.toMatch(/from '[^']*(config\/exerciseRegistry|config\/exerciseUI|Generator|components\/viewer\/[A-Z][^']*Viewer)'/);
            }
        }
    });
});

describe('tutor payload with codecs', () => {
    it('decodes a breuken QR printed before the codecs (["h", t, n, g]) exactly as before', () => {
        // Built by encodeTutorPage of 1b77311b: 475 + 368; then 1/5 van 20, 2/3 van 10 greyed, a kleuren placeholder, 3/4 van 28.
        const printed = 'EWGTSDWCGAKEJL3C7V5IJPBEIDGRC2FNL4ABSZETBASMXSPZOGOGFCVH3GREG3ESHNTX5TM25NESBL74PGZUQ44GZOEHBPVKFKRIPXCYPJXKE6IWV2Z5SHQ52KHRXOJE4ZU66L5M6XUEWERYRTYLMDLU6IEHBNXNLF2A4GHA64B5KPY';
        const { groups } = decodeTutor(TUTOR_HASH_PREFIX + printed);
        expect(groups.map(g => [g.n, g.title, g.numbering])).toEqual([[1, 'Reken uit.', 'cijfer'], [2, 'Bereken de breuk van de hoeveelheid.', 'letter']]);
        expect(groups[0].items).toEqual([{ kind: 'sum', eq: { id: '', operands: [475, 368], operator: '+', isManuallyEdited: false, answer: 843 }, steps: true }]);
        const strip = (f: FractionExercise) => ({ ...f, id: '' });
        expect(groups[1].items).toEqual([
            { kind: 'codec', codec: 'h', data: strip(frac(1, 5, 20)), steps: true },
            { kind: 'codec', codec: 'h', data: strip(frac(2, 3, 10)), steps: false },
            null,
            { kind: 'codec', codec: 'h', data: strip(frac(3, 4, 28)), steps: true },
        ]);
    });

    it('new QRs carry a codec type as ["@", id, data], wrapped once when the sheet said no steps', () => {
        const page = [{ block: breukBlock([]), n: 1, title: '', exercises: [frac(1, 5, 20), frac(2, 3, 10)] }];
        const sheet = decodeTutor(encodeTutorPage(page, hasSteps)!);
        expect(sheet.groups[0].items).toMatchObject([{ kind: 'codec', codec: 'h', steps: true }, { kind: 'codec', codec: 'h', steps: false }]);
        const same = decodeTutor(packText(JSON.stringify([1, [[1, '', 'letter', [['@', 'h', [1, 5, 20]], [['@', 'h', [2, 3, 10]]]]]]])));
        expect(same).toEqual(sheet);
    });

    it('an unknown codec id (a newer release) keeps its place; a broken codec item is refused in Dutch', () => {
        const sheet = decodeTutor(packText(JSON.stringify([1, [[1, '', null, [['@', 'zz', [1]], ['@', 'h', [1, 5, 20]]]]]])));
        expect(sheet.groups[0].items[0]).toBeNull();
        expect(sheet.groups[0].items[1]).toMatchObject({ kind: 'codec', codec: 'h' });
        expect(() => decodeTutor(packText(JSON.stringify([1, [[1, '', null, [['@', 'h', [1, 'a', 3]]]]]])))).toThrow(/breuk/);
        expect(() => decodeTutor(packText(JSON.stringify([1, [[1, '', null, [['@', 'h']]]]])))).toThrow(/oefening/);
    });

    it('the QR is offered for any block whose type has a codec and a sum with steps', () => {
        expect(blockHasTutorSteps(breukBlock([frac(1, 5, 20)]))).toBe(true);
        expect(blockHasTutorSteps(breukBlock([frac(2, 3, 10)]))).toBe(false);
        const hr = { ...makeBlock('hr-std-optellen'), exercises: [{ id: 'x', operands: [475, 368], operator: '+', answer: 843, isManuallyEdited: false } as Equation] } as MathBlock;
        expect(blockHasTutorSteps(hr)).toBe(true);
        expect(workedSteps(hr.exercises![0])).not.toBeNull();
    });
});

describe('the visual slot on screen', () => {
    it('the stappenhulp draws the codec type\'s visual above its questions and fills it per answer', () => {
        window.location.hash = TUTOR_HASH_PREFIX + encodeTutorPage([{ block: breukBlock([]), n: 4, title: 'Breuk', exercises: [frac(1, 5, 20)] }], hasSteps)!;
        const { container } = render(<TutorApp />);
        fireEvent.click(screen.getByRole('button', { name: /1 op 5 van 20/ }));
        const card = container.querySelector('.tutor-card')!;
        expect(card.querySelector('.steps-visual + .tutor-lines')).toBeTruthy();
        expect(card.querySelectorAll('.tutor-hv-dot.is-grouped')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        expect(card.querySelectorAll('.tutor-hv-dot.is-grouped')).toHaveLength(20);
        fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        expect(card.querySelectorAll('.tutor-hv-dot.is-chosen')).toHaveLength(4);
    });

    it('the kiosk steps panel draws a visual above token lines, told how many lines are revealed', () => {
        const lines = workedSteps({ id: 'x', operands: [475, 368], operator: '+', answer: 843, isManuallyEdited: false })!;
        const seen: number[] = [];
        const visual = (revealed: number) => { seen.push(revealed); return <div className="steps-visual" data-testid="vis">{revealed}</div>; };
        const { container } = render(<StepsPanel lines={lines} onNext={() => {}} visual={visual} />);
        expect(screen.queryByTestId('vis')).toBeNull();
        fireEvent.click(screen.getByText('Toon de stappen'));
        expect(container.querySelector('.steps-visual + .kiosk-steps-lines')).toBeTruthy();
        const first = Number(screen.getByTestId('vis').textContent);
        expect(first).toBe(lines.findIndex(l => l.basis) + 1);
        fireEvent.click(screen.getByText('Toon de volgende stap'));
        expect(Number(screen.getByTestId('vis').textContent)).toBeGreaterThan(first);
    });

    it('the kiosk question steps pass the answered count to the visual', () => {
        const visual = (revealed: number) => <div data-testid="vis">{revealed}</div>;
        render(<StepsPanel lines={breukHoeveelheidSteps(frac(2, 3, 12))!} onNext={() => {}} visual={visual} />);
        fireEvent.click(screen.getByText('Toon de stappen'));
        expect(screen.getByTestId('vis').textContent).toBe('0');
        fireEvent.click(screen.getByText('Toon het antwoord'));
        expect(screen.getByTestId('vis').textContent).toBe('1');
    });
});
