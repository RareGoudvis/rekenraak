// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { useOefenStore } from '../oefenen/useOefenStore';
import { cardLines, isWordCard } from '../oefenen/spelen/board/board';
import { FRANS_TYPE_ID } from '../talen/frans/fransCards';
import { resetKiosk } from './helpers/oefenKiosk';

// The Frans section on the Zelf home: leerjaar 5 and 6 only, five drawn cards, the three oefeningen, a run in the kiosk.

beforeEach(() => { resetKiosk(); vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Frans on the Zelf home', () => {
    test('leerjaar 4 has no Frans; leerjaar 5 has its section with eight cards', async () => {
        localStorage.setItem(GRADE_KEY, '4');
        const { unmount } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.queryByRole('region', { name: 'Frans' })).toBeNull();
        unmount();
        localStorage.setItem(GRADE_KEY, '5');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        const frans = screen.getByRole('region', { name: 'Frans' });
        const cards = within(frans).getAllByRole('button');
        expect(cards.map(b => b.querySelector('.zelf-topic-title')?.textContent)).toEqual(['avoir & être', 'Onregelmatig', 'Werkwoorden op -er', 'Op -ir en -re', 'Alles door elkaar', 'Dagen', 'Maanden', 'Dagen en maanden']);
        // A drawing, never a maths screenshot.
        expect(frans.querySelectorAll('svg.fr-art')).toHaveLength(8);
        expect(frans.querySelector('img')).toBeNull();
    });

    test('a card: the three oefeningen, then Oefenen starts a Frans run in the kiosk', async () => {
        localStorage.setItem(GRADE_KEY, '6');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[0]);
        expect(screen.getByRole('heading', { name: 'avoir & être' })).toBeTruthy();
        for (const m of ['Eén werkwoord vervoegen', 'Welk werkwoord?', 'Alles samen']) expect(screen.getByRole('button', { name: m })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Alles samen' }));
        const oefenen = screen.queryByRole('button', { name: 'Oefenen' });
        if (oefenen) fireEvent.click(oefenen);
        fireEvent.click(screen.getByRole('button', { name: '3 oefeningen' }));
        fireEvent.click(screen.getByRole('button', { name: /Begin met oefenen/ }));
        const st = useOefenStore.getState();
        expect(st.phase).toBe('exercise');
        expect(st.sessie!.types.every(t => t.typeId === FRANS_TYPE_ID)).toBe(true);
        expect(await screen.findByRole('radiogroup', { name: 'Kies het antwoord' })).toBeTruthy();
        expect(screen.getAllByRole('radio')).toHaveLength(6);
    });
});

describe('Frans memory cards', () => {
    test('word cards wrap at the bracket and between words; sums stay as they were', () => {
        expect(isWordCard('jullie (luisteren)')).toBe(true);
        expect(isWordCard('5 918 − 2 499')).toBe(false);
        expect(cardLines('jullie (luisteren)')).toEqual(['jullie', '(luisteren)']);
        expect(cardLines('Lotte en Lien (kiezen)')).toEqual(['Lotte en', 'Lien', '(kiezen)']);
        expect(cardLines('choisissez')).toEqual(['choisissez']);
        expect(cardLines('5 918 − 2 499')).toEqual(['5 918', '− 2 499']);
    });
});
