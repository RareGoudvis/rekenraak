// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { cleanup, screen, fireEvent, act, within } from '@testing-library/react';
import { dobbelProps, faceKind, inkOn } from '../board/settings/dobbelModel';
import { resetProps } from '../board/settings/widgetDefaults';
import DobbelsteenWidget from '../board/components/widgets/DobbelsteenWidget';
import { st, w, liveW, mountWidget, openPanel, click, typeIn, patch, expectRoundTrip } from './helpers/boardWidgetHarness';

// Dice settings: defaults = one white 6-pip die; faces, colours, locks, sum, history, the ⚙ panel.
afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
});

describe('dobbelsteen model', () => {
    test('junk falls back per field', () => {
        expect(dobbelProps(w('dobbelsteen', { dieColors: ['#f00', 'paars'], values: [2, -1, 'a'] }))).toMatchObject({ dieColors: ['#f00', '#ffffff'], values: [2, 0, 0] });
    });
    test('faces: images > labels > numbers; ink contrasts with the die', () => {
        expect(faceKind(dobbelProps(w('dobbelsteen')))).toBe('pips');
        expect(faceKind(dobbelProps(w('dobbelsteen', { sides: 20 })))).toBe('number');
        expect(faceKind(dobbelProps(w('dobbelsteen', { custom: 'a\nb' })))).toBe('label');
        expect(faceKind(dobbelProps(w('dobbelsteen', { custom: 'a', faceImages: ['data:x'] })))).toBe('image');
        expect([inkOn('#ffffff'), inkOn('#1e3a8a')]).toEqual(['#111', '#fff']);
    });
    test('Standaard herstellen keeps the rolls and the pictures', () => {
        expect(resetProps('dobbelsteen', { count: 4, values: [1, 2], history: [['2']], faceImages: ['data:a'] })).toEqual({ values: [1, 2], history: [['2']], faceImages: ['data:a'] });
    });
});

describe('dobbelsteen widget', () => {
    test('six coloured dice, a lock keeps its face, sum and history', () => {
        const { live, container } = mountWidget('dobbelsteen', { count: 6, dieColors: ['#1e3a8a'], animate: false, showSum: true, showHistory: true, values: [5, 0, 0, 0, 0, 0] }, DobbelsteenWidget);
        expect(container.querySelectorAll('[data-die]')).toHaveLength(6);
        act(() => { fireEvent.click(container.querySelectorAll('[data-die]')[0]); });
        expect(live().props!.locked).toEqual([true, false, false, false, false, false]);
        for (let i = 0; i < 5; i++) act(() => { fireEvent.click(screen.getByText('🎲 Rol')); });
        expect((live().props!.values as number[])[0]).toBe(5);
        expect(live().props!.history).toHaveLength(5);
        expect(container.querySelector('[data-dobbel-sum]')!.textContent).toMatch(/Som: \d+/);
        expect(container.querySelectorAll('[data-dobbel-history] li')).toHaveLength(5);
    });

    test('picture faces', () => {
        const { container } = mountWidget('dobbelsteen', { faceImages: ['data:image/png;base64,AA==', 'data:image/png;base64,AB=='] }, DobbelsteenWidget);
        expect(container.querySelector('[data-die] img')).toBeTruthy();
    });
});

describe('dobbelsteen panel', () => {
    test('every control writes the widget and survives save + load', () => {
        const id = openPanel('dobbelsteen');
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Aantal' })).getByRole('button', { name: '4' })); });
        click('20');
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur alle dobbelstenen' })).getByRole('button', { name: 'Lichtblauw' })); });
        expect(dobbelProps(liveW(id)).dieColors).toEqual(Array(4).fill('#bfdbfe'));
        click('Elke dobbelsteen een eigen kleur', 'switch');
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur dobbelsteen 2' })).getByRole('button', { name: 'Wit' })); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur dobbelsteen 1' })).getByRole('button', { name: 'Lichtgeel' })); });
        for (const s of ['Rolanimatie', 'Som tonen', 'Vorige worpen tonen']) click(s, 'switch');
        expect(dobbelProps(liveW(id))).toMatchObject({ count: 4, sides: 20, dieColors: ['#fef08a', '#ffffff', '#bfdbfe', '#bfdbfe'], animate: false, showSum: true, showHistory: true });
        typeIn('Eigen woorden (één per lijn)', 'rood\nblauw');
        expect(dobbelProps(liveW(id)).labels).toEqual(['rood', 'blauw']);
        patch(id, { history: [['rood']], locked: [true] });
        click('Alles losmaken');
        click('Geschiedenis wissen (1)');
        expect(dobbelProps(liveW(id))).toMatchObject({ locked: [], history: [] });
        expectRoundTrip(id);
    });
});
