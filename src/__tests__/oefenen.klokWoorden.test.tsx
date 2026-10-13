// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { ClockExercise } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInstructionOf } from '../services/oefenen/kiosk';
import { emptyStats, expectedText, recordAnswer } from '../services/oefenen/stats';
import { currentInput, sanitizeAnswer, typedReady, useOefenStore, type KioskCurrent } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Analoge klok · lezen answered in words (owner 2026-10-13): a chip uur · half · voor · over, the hour on the
// keypad, and for voor / over the minutes or the kwart key. Checked by value in the four-word grammar.

const d = kioskFor('klok-kloklezen')!;
const WOORDEN = { clockType: 'analoog', exerciseMode: 'lezen', klokAnswer: 'woorden' };
const clock = (hours: number, minutes: number): ClockExercise => ({
    id: 'k', hours, minutes, timeText: '', digitalText: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    exerciseMode: 'lezen', clockType: 'analoog', is24hour: false, handChoice: 'beide', isManuallyEdited: false,
} as ClockExercise);
const ok = (h: number, m: number, given: [hour: string, minute: string, word: string]) => checkAnswer(d, clock(h, m), WOORDEN, given);

describe('descriptor: klokAnswer picks the input', () => {
    test('woorden = time-words; digitaal or absent (an older link) = uu:mm', () => {
        expect(kioskInputOf(d, clock(3, 15), WOORDEN)).toBe('time-words');
        expect(kioskInputOf(d, clock(3, 15), { ...WOORDEN, klokAnswer: 'digitaal' })).toBe('time');
        expect(kioskInputOf(d, clock(3, 15), { clockType: 'analoog', exerciseMode: 'lezen' })).toBe('time');
        // Only lezen analoog: tekenen stays a drag, omzetten uu:mm.
        expect(kioskInputOf(d, { ...clock(3, 15), exerciseMode: 'tekenen' }, { ...WOORDEN, exerciseMode: 'tekenen' })).toBe('interactive');
        expect(kioskInputOf(d, { ...clock(3, 15), exerciseMode: 'omzetten' }, { ...WOORDEN, exerciseMode: 'omzetten' })).toBe('time');
    });
    test('the expected answer is the four-word wording, never the sheet\'s "voor half"', () => {
        expect(d.answerOf(clock(3, 15), WOORDEN)).toEqual(['3', 'kwart', 'over']);
        expect(d.answerOf(clock(3, 35), WOORDEN)).toEqual(['4', '25', 'voor']);
        expect(expectedText(d, clock(3, 25), WOORDEN)).toBe('25 over 3');
        expect(expectedText(d, clock(3, 45), WOORDEN)).toBe('kwart voor 4');
        expect(expectedText(d, clock(3, 30), WOORDEN)).toBe('half 4');
        expect(expectedText(d, clock(12, 0), WOORDEN)).toBe('12 uur');
    });
    test('the header has no pen verb and does not ask for uu:mm', () => {
        const h = kioskInstructionOf('klok-kloklezen', clock(3, 15), WOORDEN, 'Hoe laat is het?');
        expect(h).toBe('Lees de klok en zeg hoe laat het is.');
        expect(h).not.toMatch(/\b(schrijf|in woorden|uu:mm)\b/i);
    });
});

describe('check by value in the four-word grammar', () => {
    test('kwart over 3 is right, 15 over 3 is wrong', () => {
        expect(ok(3, 15, ['3', 'kwart', 'over'])).toBe(true);
        expect(ok(3, 15, ['15', 'kwart', 'over'])).toBe(true);
        expect(ok(3, 15, ['3', '15', 'over'])).toBe(false);
        expect(ok(3, 45, ['4', 'kwart', 'voor'])).toBe(true);
        expect(ok(3, 45, ['4', '15', 'voor'])).toBe(false);
    });
    test('3:35 is 25 voor 4, never 35 over 3', () => {
        expect(ok(3, 35, ['4', '25', 'voor'])).toBe(true);
        expect(ok(3, 35, ['3', '35', 'over'])).toBe(false);
        expect(ok(3, 35, ['3', '25', 'voor'])).toBe(false);
    });
    test('3 uur and half 4', () => {
        expect(ok(3, 0, ['3', '', 'uur'])).toBe(true);
        expect(ok(15, 0, ['3', '', 'uur'])).toBe(true);
        expect(ok(3, 0, ['15', '', 'uur'])).toBe(true);
        expect(ok(3, 30, ['4', '', 'half'])).toBe(true);
        expect(ok(3, 30, ['3', '', 'half'])).toBe(false);
        expect(ok(3, 30, ['3', '30', 'over'])).toBe(false);
        expect(ok(12, 0, ['12', '', 'uur'])).toBe(true);
        expect(ok(12, 30, ['1', '', 'half'])).toBe(true);
    });
    test('anything but [uur, minuten, woord] is wrong', () => {
        expect(checkAnswer(d, clock(3, 0), WOORDEN, '3 uur')).toBe(false);
        expect(checkAnswer(d, clock(3, 0), WOORDEN, ['3', ''])).toBe(false);
        expect(ok(3, 0, ['3', '', ''])).toBe(false);
    });
    test('the error row shows the words as built and the expected wording', () => {
        const row = recordAnswer(emptyStats({ types: [] } as never, 0), 0, 'klok-kloklezen', clock(3, 15), ['3', '15', 'over'], false, 1, WOORDEN, 1).perType[0].errors[0];
        expect(row.given).toBe('15 over 3');
        expect(row.expected).toBe('kwart over 3');
        expect(row.exercise).toBe('analoge klok toont 3:15: hoe laat?');
    });
    test('fields keep only what they hold', () => {
        expect(sanitizeAnswer('kwart', [], 'time-words')).toBe('kwart');
        expect(sanitizeAnswer('kwart5', [], 'time-words')).toBe('5');
        expect(sanitizeAnswer('123', [], 'time-words')).toBe('12');
        expect(typedReady(['3', '', 'uur'], false, 'time-words')).toBe(true);
        expect(typedReady(['3', '', 'over'], false, 'time-words')).toBe(false);
        expect(typedReady(['3', 'kwart', ''], false, 'time-words')).toBe(false);
        expect(typedReady(['', 'kwart', 'over'], false, 'time-words')).toBe(false);
    });
});

function lezenType(): OefenType {
    const leaf = flattenLeaves().find(l => l.id === 'klok-analoog-lezen')!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, klokAnswer: 'woorden' }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId: leaf.id, label: 'Analoge klok · lezen', constraints, limit: 5, weight: 1 };
}

describe('kiosk: chips, the hour and the minutes (or kwart)', () => {
    const st = () => useOefenStore.getState();
    beforeEach(resetKiosk);
    afterEach(cleanup);
    // Puts a known time on the card (the draw is random), keeping the constraints it was drawn with.
    const show = (hours: number, minutes: number) => {
        const shown = st().shown!;
        useOefenStore.setState({ shown: { ...shown, exercise: { ...(shown.exercise as ClockExercise), hours, minutes } } as KioskCurrent });
    };
    const start = () => {
        st().load(hashOf(starterSessie({ types: [lezenType()], attempts: 2 })));
        st().start();
    };

    test('store: kwart over 3 is juist', () => {
        start();
        show(3, 15);
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('time-words');
        expect(info.choices).toEqual(['uur', 'half', 'voor', 'over']);
        expect(st().input).toEqual(['', '', '']);
        expect(st().field).toBe(0);
        st().choose('over');
        expect(st().field).toBe(1);
        st().press('kwart');
        // kwart fills the minutes and hands the keypad to the empty hour.
        expect(st().input).toEqual(['', 'kwart', 'over']);
        expect(st().field).toBe(0);
        st().press('3');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('store: 15 over 3 is fout (first try), then kwart over 3 on the second try is juist', () => {
        start();
        show(3, 15);
        st().choose('over');
        st().press('1'); st().press('5');
        expect(st().field).toBe(0);
        st().press('3');
        expect(st().input).toEqual(['3', '15', 'over']);
        st().answer();
        expect(st().phase).toBe('retry');
        st().skipFlash();
        expect(st().input).toEqual(['', '', '']);
        st().choose('over'); st().press('kwart'); st().press('3');
        st().answer();
        expect(st().lastCorrect).toBe(true);
        const err = st().run!.stats.perType[0].errors[0];
        expect(err.given).toBe('15 over 3');
        expect(err.secondTry).toBe(true);
    });

    test('store: 25 voor 4 for 3:35 is juist, 35 over 3 is fout', () => {
        start();
        show(3, 35);
        st().choose('voor'); st().press('2'); st().press('5'); st().press('4');
        st().answer();
        expect(st().lastCorrect).toBe(true);
        st().skipFlash();
        show(3, 35);
        st().choose('over'); st().press('3'); st().press('5'); st().press('3');
        expect(st().input).toEqual(['3', '35', 'over']);
        st().answer();
        expect(st().phase).toBe('retry');
    });

    test('store: 3 uur and half 4; picking uur drops the minutes and kwart does nothing there', () => {
        start();
        show(3, 0);
        st().choose('over'); st().press('kwart');
        st().choose('uur');
        expect(st().input).toEqual(['', '', 'uur']);
        st().press('kwart');
        expect(st().input).toEqual(['', '', 'uur']);
        st().press('3');
        st().answer();
        expect(st().lastCorrect).toBe(true);
        st().skipFlash();
        show(3, 30);
        st().press('4'); st().choose('half');
        expect(st().input).toEqual(['4', '', 'half']);
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('screen: chip row, the phrase in spoken order, kwart key and Verder', () => {
        start();
        show(3, 15);
        const { container } = render(<OefenApp />);
        const chips = screen.getByRole('radiogroup', { name: 'Kies het woord' });
        expect(within(chips).getAllByRole('radio').map(b => b.textContent)).toEqual(['uur', 'half', 'voor', 'over']);
        // No "voor half" / "over half" anywhere on the panel.
        expect(container.querySelector('.kiosk-panel')!.textContent).not.toMatch(/voor half|over half/);
        const kwart = screen.getByRole('button', { name: 'kwart' }) as HTMLButtonElement;
        expect(kwart.disabled).toBe(true);
        fireEvent.click(within(chips).getByRole('radio', { name: 'over' }));
        expect(kwart.disabled).toBe(false);
        // Spoken order: minutes, the word, the hour.
        const phrase = container.querySelector('.kiosk-tw-phrase')!;
        expect([...phrase.children].map(el => el.getAttribute('aria-label') ?? el.textContent)).toEqual(['Minuten', 'over', 'Uur']);
        fireEvent.click(kwart);
        expect((screen.getByRole('textbox', { name: 'Minuten' }) as HTMLInputElement).value).toBe('kwart');
        expect(screen.getByRole('textbox', { name: 'Uur' }).className).toContain('is-active');
        fireEvent.click(screen.getByRole('button', { name: '3' }));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(st().lastCorrect).toBe(true);
    });

    test('screen: Verder moves from the typed minutes to the empty hour', () => {
        start();
        show(3, 35);
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('radio', { name: 'voor' }));
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        const verder = screen.getByRole('button', { name: 'Verder' });
        fireEvent.click(verder);
        expect(st().field).toBe(0);
        // 25 typed? Not yet: one digit, then Verder; the pupil may go back by tapping the minutes.
        fireEvent.focus(screen.getByRole('textbox', { name: 'Minuten' }));
        fireEvent.click(screen.getByRole('button', { name: '5' }));
        expect(st().input).toEqual(['', '25', 'voor']);
        expect(st().field).toBe(0);
        fireEvent.click(screen.getByRole('button', { name: '4' }));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(st().lastCorrect).toBe(true);
    });

    test('physical keyboard: first letters pick the word, k types kwart, digits, Enter checks', () => {
        start();
        show(3, 45);
        render(<OefenApp />);
        fireEvent.keyDown(document.body, { key: 'v' });
        expect(st().input[2]).toBe('voor');
        fireEvent.keyDown(document.body, { key: 'k' });
        expect(st().input[1]).toBe('kwart');
        fireEvent.keyDown(document.body, { key: '4' });
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(st().lastCorrect).toBe(true);
    });
});
