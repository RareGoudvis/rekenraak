// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { FractionExercise } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { checkAnswer, exactFormOf } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInstructionOf } from '../services/oefenen/kiosk';
import { emptyStats, expectedText, recordAnswer } from '../services/oefenen/stats';
import { currentInput, useOefenStore } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Breuken herkennen (owner, kiosk triage 2026-10-10): the pupil names the coloured part as a breuk,
// not as two counting answers. The `fraction` input: the keypad types the NOEMER first, then the
// TELLER, drawn as a stacked breuk in the answer panel. It counts the drawn form (2/6 for two of six
// parts, not 1/3) unless the row's Antwoord says any equal value.

const d = kioskFor('breuken')!;
const ex = (n: number, den: number): FractionExercise => ({
    id: 'f', subType: 'herkennen', numerator: n, denominator: den, shape: 'rectangle', coloredIndices: [], gridRows: 1, gridCols: den, isManuallyEdited: false,
});
const HERKENNEN = { subType: 'herkennen' };

describe('descriptor', () => {
    test.each(['fraction-questions', 'blank-fraction', 'phrase', 'fraction'])('herkennen (%s) asks a breuk through the fraction input', (answerFormat) => {
        expect(kioskInputOf(d, ex(2, 6), { ...HERKENNEN, answerFormat })).toBe('fraction');
        expect(d.answerOf(ex(2, 6), { ...HERKENNEN, answerFormat })).toEqual(['2/6']);
        expect(d.keys?.({ ...HERKENNEN, answerFormat }) ?? []).toEqual([]);
    });
    test('the drawn form is the answer by default; the row may take any equal value', () => {
        expect(exactFormOf(d, HERKENNEN)).toBe(true);
        expect(exactFormOf(d, HERKENNEN, false)).toBe(false);
    });
    test('the header asks for the breuk as the pupil sees it', () => {
        expect(kioskInstructionOf('breuken', ex(2, 6), HERKENNEN, 'Welk deel is gekleurd? Schrijf de breuk.')).toBe('Welk deel is gekleurd? Typ de breuk zoals je ze ziet.');
    });
});

describe('check: [noemer, teller], typed in that order', () => {
    const e = ex(2, 6);
    test('2 of 6 parts = 2/6', () => {
        expect(checkAnswer(d, e, HERKENNEN, ['6', '2'])).toBe(true);
        expect(checkAnswer(d, e, HERKENNEN, [' 06', '2 '])).toBe(true);
    });
    test('another form only when the row takes any equal value', () => {
        expect(checkAnswer(d, e, HERKENNEN, ['3', '1'])).toBe(false);
        expect(checkAnswer(d, e, HERKENNEN, ['3', '1'], false)).toBe(true);
        expect(checkAnswer(d, e, HERKENNEN, ['12', '4'], false)).toBe(true);
    });
    test('swapped, another value, a zero noemer or a blank field is wrong', () => {
        for (const g of [['2', '6'], ['6', '3'], ['0', '2'], ['6', ''], ['', '2'], ['6']]) expect(checkAnswer(d, e, HERKENNEN, g), JSON.stringify(g)).toBe(false);
        expect(checkAnswer(d, e, HERKENNEN, '2/6')).toBe(false);
        expect(checkAnswer(d, e, HERKENNEN, ['3', '1'], false) && checkAnswer(d, e, HERKENNEN, ['2', '6'], false)).toBe(false);
    });
    test('stats read the breuk "2/6"', () => {
        const row = recordAnswer(emptyStats({ types: [] } as never, 0), 0, 'breuken', e, ['6', '3'], false, 1, HERKENNEN, 1).perType[0].errors[0];
        expect(row.given).toBe('3/6');
        expect(row.expected).toBe('2/6');
        expect(expectedText(d, e, HERKENNEN)).toBe('2/6');
    });
});

function herkennenType(): OefenType {
    const leaf = flattenLeaves().find(l => l.id === 'breuken-herkennen')!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId: leaf.id, label: 'Breuken herkennen', constraints, limit: 3, weight: 1 };
}

describe('kiosk: noemer first, then teller, as a stacked breuk', () => {
    const st = () => useOefenStore.getState();
    beforeEach(resetKiosk);
    afterEach(cleanup);
    const shownEx = () => st().shown!.exercise as FractionExercise;

    test('store: the keypad types the noemer, then (Enter) the teller', () => {
        st().load(hashOf(starterSessie({ types: [herkennenType()] })));
        st().start();
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('fraction');
        expect(info.labels).toEqual(['noemer', 'teller']);
        expect(st().input).toEqual(['', '']);
        expect(st().field).toBe(0);
        const { numerator: n, denominator: den } = shownEx();
        for (const ch of String(den)) st().press(ch);
        expect(st().input).toEqual([String(den), '']);
        st().answer();
        expect(st().phase).toBe('exercise');
        st().focusField(1);
        for (const ch of String(n)) st().press(ch);
        expect(st().input).toEqual([String(den), String(n)]);
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('screen: teller above the bar, noemer below; the keypad starts in the noemer and Verder moves up', () => {
        st().load(hashOf(starterSessie({ types: [herkennenType()] })));
        st().start();
        const { container } = render(<OefenApp />);
        const teller = screen.getByRole('textbox', { name: 'teller' });
        const noemer = screen.getByRole('textbox', { name: 'noemer' });
        const frac = container.querySelector('.kiosk-fraction')!;
        expect(frac).toBeTruthy();
        // Teller first in the stack, the bar between them.
        const parts = [...frac.children].map(el => (el.querySelector('input')?.getAttribute('aria-label') ?? el.className));
        expect(parts[0]).toBe('teller');
        expect(parts[parts.length - 1]).toBe('noemer');
        expect(frac.querySelector('.kiosk-fraction-bar')).toBeTruthy();
        expect(noemer.className).toContain('is-active');
        expect(teller.className).not.toContain('is-active');
        // The written questions under the figure stay on paper.
        expect(container.querySelector('.kiosk-card')!.textContent).not.toMatch(/In hoeveel|Hoeveel gelijke/);

        const { numerator: n, denominator: den } = shownEx();
        for (const ch of String(den)) fireEvent.click(screen.getByRole('button', { name: ch }));
        const verder = screen.getByRole('button', { name: 'Verder' }) as HTMLButtonElement;
        expect(verder.disabled).toBe(false);
        fireEvent.click(verder);
        expect(st().field).toBe(1);
        expect(screen.getByRole('textbox', { name: 'teller' }).className).toContain('is-active');
        for (const ch of String(n)) fireEvent.click(screen.getByRole('button', { name: ch }));
        const check = screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;
        expect(check.disabled).toBe(false);
        fireEvent.click(check);
        expect(st().lastCorrect).toBe(true);
    });

    test('physical keyboard: Enter in the noemer moves to the teller, then checks', () => {
        st().load(hashOf(starterSessie({ types: [herkennenType()] })));
        st().start();
        render(<OefenApp />);
        const { numerator: n, denominator: den } = shownEx();
        st().setField(0, String(den));
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(st().field).toBe(1);
        st().setField(1, String(n));
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(st().lastCorrect).toBe(true);
    });
});
