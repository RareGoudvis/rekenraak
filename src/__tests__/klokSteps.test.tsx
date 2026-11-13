// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { klokSteps, parseCountMark } from '../services/steps/klokSteps';
import { codecForType } from '../services/steps/tutorCodecs';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { stepsFor } from '../services/stepsAvailability';
import { stepLineText, type StepLine } from '../services/math/workedSteps';
import { formatDigitalTime, formatTimeText } from '../services/clock/clockTypes';
import { parseTimeWords, timeWords, timeWordsText } from '../services/clock/timeWords';
import QuestionSteps from '../oefenen/kiosk/QuestionSteps';
import type { ClockExercise } from '../services/math/types';

afterEach(cleanup);

type Mode = 'lezen' | 'tekenen' | 'omzetten';
const clock = (hours: number, minutes: number, clockType: 'analoog' | 'digitaal' = 'analoog', exerciseMode: Mode = 'lezen', is24hour = false): ClockExercise => ({
    id: 'k', hours, minutes, timeText: formatTimeText(hours, minutes, is24hour), digitalText: formatDigitalTime(hours, minutes),
    clockType, exerciseMode, is24hour, handChoice: 'beide', isManuallyEdited: false,
});
const text = (lines: StepLine[] | null) => lines!.map(l => (l.question ? `${l.question} | ${stepLineText(l)}` : stepLineText(l)));
// Where the counted minutes end: the grote wijzer's minute (60 = the 12).
const landing = (l: StepLine) => { const c = parseCountMark(l.mark)!; return (((c.start + c.dir * c.n) % 60) + 60) % 60; };

describe('analoge klok lezen, line for line', () => {
    it('3:35 on the sheet: over half counts from the 6', () => {
        expect(text(klokSteps(clock(3, 35)))).toEqual([
            'Waar staat de kleine wijzer? | tussen 3 en 4: het is na 3 uur',
            'Waar staat de grote wijzer? | op de 7',
            'Hoeveel minuten over half? | 5 minuten',
            'Na 3 uur komt 4 uur: het is 5 over half 4.',
        ]);
    });

    it('3:35 in Oefenmodus woorden: four-word grammar, counted back to the 12', () => {
        const lines = klokSteps(clock(3, 35), { klokAnswer: 'woorden' })!;
        expect(text(lines)).toEqual([
            'Waar staat de kleine wijzer? | tussen 3 en 4: het is na 3 uur',
            'Waar staat de grote wijzer? | op de 7',
            'Hoeveel minuten nog tot het volgende uur? | 5, 10, 15, 20, 25 minuten',
            'Na 3 uur komt 4 uur: het is 25 voor 4.',
        ]);
        expect(lines[2].hint).toMatch(/tegen de klok in/);
    });

    it('3:37 as uu:mm counts clockwise from the 12, five per cijfer then single minutes', () => {
        expect(text(klokSteps(clock(3, 37), { klokAnswer: 'digitaal' }))).toEqual([
            'Waar staat de kleine wijzer? | tussen 3 en 4: het is na 3 uur',
            'Waar staat de grote wijzer? | tussen de 7 en de 8',
            'Hoeveel minuten na het uur? | 5, 10, 15, 20, 25, 30, 35, 36, 37 minuten',
            'Het is 03:37.',
        ]);
    });

    it('kwart, uur and half', () => {
        expect(text(klokSteps(clock(3, 15)))).toEqual([
            'Waar staat de kleine wijzer? | tussen 3 en 4: het is na 3 uur',
            'Waar staat de grote wijzer? | op de 3',
            'Hoeveel minuten over het uur? | 5, 10, 15 minuten: een kwart',
            'Het is kwart over 3.',
        ]);
        expect(text(klokSteps(clock(3, 0)))).toEqual([
            'Waar staat de kleine wijzer? | op de 3: het is 3 uur',
            'Waar staat de grote wijzer? | op de 12',
            'Het is 3 uur.',
        ]);
        expect(text(klokSteps(clock(12, 30)))).toEqual([
            'Waar staat de kleine wijzer? | tussen 12 en 1: het is na 12 uur',
            'Waar staat de grote wijzer? | op de 6',
            'Na 12 uur komt 1 uur: het is half 1.',
        ]);
    });

    it('voor half counts back from the 6; 24 uur keeps the sheet hours', () => {
        expect(text(klokSteps(clock(15, 22, 'analoog', 'lezen', true)))).toEqual([
            'Waar staat de kleine wijzer? | tussen 3 en 4: het is na 15 uur',
            'Waar staat de grote wijzer? | tussen de 4 en de 5',
            'Hoeveel minuten nog tot half? | 5, 6, 7, 8 minuten',
            'Na 15 uur komt 16 uur: het is 8 voor half 16.',
        ]);
    });

    it('omzetten reads like uu:mm', () => {
        expect(text(klokSteps(clock(9, 50, 'analoog', 'omzetten'))).slice(2)).toEqual([
            'Hoeveel minuten na het uur? | 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 minuten',
            'Het is 09:50.',
        ]);
    });
});

describe('the other klok kinds', () => {
    it('analoog tekenen: words → hands', () => {
        expect(text(klokSteps(clock(3, 25, 'analoog', 'tekenen')))).toEqual([
            'Waar zet je de kleine wijzer? | tussen 3 en 4, dicht bij de 3',
            'Waar zet je de grote wijzer? | 5 minuten, dus op de 5',
            'Kleine wijzer tussen 3 en 4, grote wijzer op de 5.',
        ]);
        expect(klokSteps(clock(3, 25, 'analoog', 'tekenen'))![1].hint).toBe('Tel 5 minuten vanaf de 6 terug, tegen de klok in.');
    });

    it('digitaal lezen: uu:mm → words, minutes clockwise from the 12', () => {
        expect(text(klokSteps(clock(14, 35, 'digitaal', 'lezen', true)))).toEqual([
            'Welk uur staat er? | 14 uur',
            'Hoeveel minuten na het uur? | 5, 10, 15, 20, 25, 30, 35 minuten',
            'Hoe zeg je dat? | 5 over half 15',
            '14:35 = 5 over half 15',
        ]);
    });

    it('digitaal tekenen: words → uu:mm', () => {
        expect(text(klokSteps(clock(3, 45, 'digitaal', 'tekenen')))).toEqual([
            'Welk uur schrijf je? | 3 uur: je schrijft 03',
            'Hoeveel minuten na het uur? | 5, 10, 15, 20, 25, 30, 35, 40, 45 minuten',
            'Het is 03:45.',
        ]);
    });

    it('null for a broken time or a hand-edited text that no longer matches', () => {
        expect(klokSteps(undefined)).toBeNull();
        expect(klokSteps({ ...clock(3, 15), minutes: 60 })).toBeNull();
        expect(klokSteps({ ...clock(3, 15), timeText: 'half 4' })).toBeNull();
        expect(klokSteps({ ...clock(3, 15), hours: 0 })).toBeNull();
    });
});

// Every time on the face, every kind and wording: each line means the right thing.
describe('every line evaluates', () => {
    const kinds: [ClockExercise['clockType'], Mode][] = [['analoog', 'lezen'], ['analoog', 'omzetten'], ['analoog', 'tekenen'], ['digitaal', 'lezen'], ['digitaal', 'tekenen']];
    const answers = [undefined, 'woorden', 'digitaal'] as const;
    it.each(kinds)('%s %s', (type, mode) => {
        for (const is24 of [false, true]) for (let h = is24 ? 0 : 1; h <= (is24 ? 23 : 12); h++) for (let m = 0; m < 60; m++) for (const klokAnswer of answers) {
            const ex = clock(h, m, type, mode, is24);
            const lines = klokSteps(ex, klokAnswer ? { klokAnswer } : {})!;
            expect(lines, `${h}:${m}`).not.toBeNull();
            // Questions first, one closing line at the end (QuestionSteps relies on it).
            expect(lines.slice(0, -1).every(l => l.question)).toBe(true);
            expect(lines[lines.length - 1].question).toBeUndefined();
            for (const l of lines) {
                const c = parseCountMark(l.mark);
                if (!c) continue;
                // The counted minutes land on the grote wijzer, and the spoken count ends at that number.
                expect(landing(l), `${h}:${m}`).toBe(m);
                const nums = l.tokens.filter(t => t.t === 'num').map(t => (t as { v: number }).v);
                expect(nums[nums.length - 1]).toBe(c.n);
            }
            const last = stepLineText(lines[lines.length - 1]);
            const woorden = klokAnswer === 'woorden' && type === 'analoog' && mode === 'lezen';
            const digital = mode === 'omzetten' && type === 'analoog' || mode === 'tekenen' && type === 'digitaal' || (klokAnswer === 'digitaal' && type === 'analoog' && mode === 'lezen');
            if (woorden) {
                // The closing wording is the one the kiosk checks the pupil against.
                const said = timeWordsText(timeWords(h, m));
                expect(last).toContain(said);
                expect(parseTimeWords(timeWords(h, m))).toBe((h % 12) * 60 + m);
            } else if (digital) expect(last).toBe(`Het is ${formatDigitalTime(h, m)}.`);
            else if (mode !== 'tekenen' || type !== 'analoog') expect(last).toContain(formatTimeText(h, m, is24));
        }
    });
});

describe('codec and visual', () => {
    const codec = codecForType('klok-kloklezen')!;
    it('round trip: out → JSON → in → steps equals the registry steps', () => {
        const cases: [ClockExercise, Record<string, unknown>][] = [
            [clock(3, 35), {}], [clock(3, 35), { klokAnswer: 'woorden' }], [clock(11, 7), { klokAnswer: 'digitaal' }],
            [clock(0, 5, 'analoog', 'lezen', true), {}], [clock(9, 50, 'analoog', 'omzetten'), {}], [clock(3, 25, 'analoog', 'tekenen'), {}],
            [clock(14, 35, 'digitaal', 'lezen', true), {}], [clock(3, 45, 'digitaal', 'tekenen'), {}], [clock(6, 30, 'digitaal', 'omzetten'), {}],
        ];
        for (const [ex, c] of cases) {
            const data = codec.in(JSON.parse(JSON.stringify(codec.out(ex, c))));
            expect(data, ex.digitalText).not.toBeNull();
            expect(codec.steps(data!)).toEqual(stepsFor('klok-kloklezen', ex, c));
        }
        // Settings the exercise lacks come from the block.
        const bare = { ...clock(14, 35, 'digitaal', 'lezen', true), clockType: undefined, exerciseMode: undefined, is24hour: undefined };
        const c = { clockType: 'digitaal', exerciseMode: 'lezen', is24hour: true };
        expect(codec.steps(codec.in(codec.out(bare, c))!)).toEqual(stepsFor('klok-kloklezen', bare, c));
        expect(codec.sum(codec.in(codec.out(clock(3, 35), {}))!)).toEqual([{ t: 'word', w: 'Lees de klok' }]);
        expect(codec.sum(codec.in(codec.out(clock(3, 35, 'analoog', 'tekenen'), {}))!)).toEqual([{ t: 'word', w: '5 over half 4' }]);
        expect(codec.out({ ...clock(3, 15), timeText: 'half 4' }, {})).toBeNull();
        for (const bad of [null, [3, 15, 0], [13, 15, 0, 0], [3, 60, 0, 0], [3, 15, 5, 0], [3, 15, 0, 6], [0, 15, 0, 0], ['3', 15, 0, 0]]) expect(codec.in(bad)).toBeNull();
    });

    it('the visual grows with the answers: kleine wijzer, grote wijzer, then the petals', () => {
        const ex = clock(3, 37);
        const lines = klokSteps(ex, { klokAnswer: 'digitaal' })!;
        const draw = stepsVisualFor('klok-kloklezen', ex, lines, 'kiosk')!;
        const at = (revealed: number) => { cleanup(); return render(<>{draw(revealed)}</>).container; };
        let c = at(0);
        // Lezen: both hands printed from the start, the kleine wijzer asked about first.
        expect(c.querySelectorAll('.klok-bb-hand')).toHaveLength(2);
        expect(c.querySelector('.klok-bb-hand.is-kleine.is-hot')).toBeTruthy();
        expect(c.querySelector('.klok-bb-hand.is-grote.is-hot')).toBeNull();
        expect(c.querySelectorAll('.klok-bb-petal')).toHaveLength(0);
        c = at(2);
        expect(c.querySelector('.klok-bb-hand.is-grote.is-hot')).toBeTruthy();
        expect(c.querySelectorAll('.klok-bb-petal')).toHaveLength(0);
        c = at(3);
        // 37 minutes: 7 petals of 5, 2 single minutes; labels 5…35 and 37.
        expect(c.querySelectorAll('.klok-bb-petal')).toHaveLength(7);
        expect(c.querySelectorAll('.klok-bb-dot')).toHaveLength(2);
        expect([...c.querySelectorAll('.klok-bb-count')].map(n => n.textContent)).toEqual(['5', '10', '15', '20', '25', '30', '35', '37']);
    });

    it('tekenen: no hands until they are answered; the visual follows QuestionSteps', () => {
        const ex = clock(3, 25, 'analoog', 'tekenen');
        const lines = klokSteps(ex)!;
        const visual = stepsVisualFor('klok-kloklezen', ex, lines, 'tutor');
        const { container } = render(<QuestionSteps lines={lines} look="tutor" visual={visual} />);
        expect(container.querySelectorAll('.steps-visual .klok-bb-hand')).toHaveLength(0);
        fireEvent.click(screen.getByText('Toon het antwoord'));
        expect(container.querySelectorAll('.klok-bb-hand.is-kleine')).toHaveLength(1);
        fireEvent.click(screen.getByText('Toon het antwoord'));
        expect(container.querySelectorAll('.klok-bb-hand')).toHaveLength(2);
        // 5 voor half 4: one petal from the 6 back to the 5.
        expect(container.querySelectorAll('.klok-bb-petal')).toHaveLength(1);
        expect(screen.getByText(/Kleine wijzer tussen 3 en 4/)).toBeTruthy();
    });
});
