// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { cardLines, isWordCard } from '../oefenen/spelen/board/board';
import { FRANS_TYPE_ID } from '../talen/frans/fransCards';
import { FRANS_OPTIONS_KEY, readPicks } from '../talen/frans/fransPicks';
import { FRANS_WOORD_TYPE_ID } from '../talen/frans/woordCards';
import type { FransExercise } from '../talen/frans/questions';
import type { WordExercise } from '../talen/frans/woorden';
import { resetKiosk } from './helpers/oefenKiosk';

// The Frans section on the Zelf home: leerjaar 5 and 6 only, three drawn cards, each with its options screen
// (remembered on the device), then a run in the kiosk.

beforeEach(() => {
    resetKiosk(); localStorage.clear();
    useSpelStore.getState().otherGame(); useSpelStore.getState().takePickerAt();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openCard(grade: string, nth: number) {
    localStorage.setItem(GRADE_KEY, grade);
    render(<OefenApp />);
    await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
    fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[nth]);
}
const group = (name: string) => screen.getByRole('group', { name });
const pressed = (el: HTMLElement) => el.getAttribute('aria-pressed') === 'true';
function startRun() {
    const oefenen = screen.queryByRole('button', { name: 'Oefenen' });
    if (oefenen) fireEvent.click(oefenen);
    fireEvent.click(screen.getByRole('button', { name: '3 oefeningen' }));
    fireEvent.click(screen.getByRole('button', { name: /Begin met oefenen/ }));
}

describe('Frans on the Zelf home', () => {
    test('leerjaar 4 has no Frans; leerjaar 5 has its section with three drawn cards', async () => {
        localStorage.setItem(GRADE_KEY, '4');
        const { unmount } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
        expect(screen.queryByRole('region', { name: 'Frans' })).toBeNull();
        unmount();
        localStorage.setItem(GRADE_KEY, '5');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        const frans = screen.getByRole('region', { name: 'Frans' });
        const cards = within(frans).getAllByRole('button');
        expect(cards.map(b => b.querySelector('.zelf-topic-title')?.textContent)).toEqual(['Werkwoorden', 'Dagen en maanden', 'Getallen']);
        // A drawing, never a maths screenshot.
        expect(frans.querySelectorAll('svg.fr-art')).toHaveLength(3);
        expect(frans.querySelector('img')).toBeNull();
    });

    test('Werkwoorden: groups, a verb list per group, Hoe? and Richting; the pick runs in the kiosk and is remembered', async () => {
        await openCard('6', 0);
        expect(screen.getByRole('heading', { name: 'Werkwoorden' })).toBeTruthy();
        expect(screen.queryByText('Welke oefening?')).toBeNull();
        const groups = group('Welke werkwoorden?');
        const chip = (name: string) => within(groups).getByRole('button', { name });
        // The default: avoir and être, so the irregular group is on.
        expect(['Onregelmatig', '-er', '-ir', '-re'].map(n => pressed(chip(n)))).toEqual([true, false, false, false]);
        fireEvent.click(chip('-er'));
        expect(pressed(chip('-er'))).toBe(true);
        // The irregular list folds open: two of thirteen on; turn faire on, then the whole group off.
        const fold = screen.getByRole('button', { name: /Onregelmatig: 2 van 13/ });
        fireEvent.click(fold);
        fireEvent.click(within(group('Werkwoorden Onregelmatig')).getByRole('button', { name: 'faire' }));
        expect(screen.getByRole('button', { name: /Onregelmatig: 3 van 13/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Alles uit' }));
        expect(pressed(chip('Onregelmatig'))).toBe(false);
        // The last group never goes off.
        fireEvent.click(chip('-er'));
        expect(pressed(chip('-er'))).toBe(true);
        fireEvent.click(within(group('Hoe?')).getByRole('button', { name: 'Alles samen' }));
        fireEvent.click(within(group('Richting')).getByRole('button', { name: 'Frans → Nederlands' }));
        expect(readPicks().werkwoorden).toMatchObject({ mode: 'samen', dir: 'fr-nl' });
        expect(readPicks().werkwoorden.verbs.every(v => ['parler', 'aimer', 'jouer', 'regarder', 'écouter', 'chanter', 'danser', 'manger', 'habiter', 'travailler', 'chercher', 'donner'].includes(v))).toBe(true);
        startRun();
        const st = useOefenStore.getState();
        expect(st.phase).toBe('exercise');
        expect(st.sessie!.types.every(t => t.typeId === FRANS_TYPE_ID)).toBe(true);
        const ex = st.shown!.exercise as FransExercise;
        expect(ex.dir).toBe('fr-nl');
        expect(ex.mode).toBe('samen');
        expect(screen.getAllByRole('radio')).toHaveLength(6);
        expect(localStorage.getItem(FRANS_OPTIONS_KEY)).toContain('samen');
    });

    test('Dagen en maanden: two toggles (one stays on) and Richting, no Hoe?', async () => {
        await openCard('5', 1);
        const lists = group('Wat wil je oefenen?');
        const chip = (name: string) => within(lists).getByRole('button', { name });
        expect([pressed(chip('Dagen')), pressed(chip('Maanden'))]).toEqual([true, false]);
        fireEvent.click(chip('Dagen'));
        expect(pressed(chip('Dagen'))).toBe(true);
        fireEvent.click(chip('Maanden'));
        fireEvent.click(chip('Dagen'));
        expect([pressed(chip('Dagen')), pressed(chip('Maanden'))]).toEqual([false, true]);
        expect(screen.queryByRole('group', { name: 'Hoe?' })).toBeNull();
        fireEvent.click(within(group('Richting')).getByRole('button', { name: 'Nederlands → Frans' }));
        startRun();
        const st = useOefenStore.getState();
        expect(st.sessie!.types.every(t => t.typeId === FRANS_WOORD_TYPE_ID)).toBe(true);
        const ex = st.shown!.exercise as WordExercise;
        expect([ex.list, ex.dir]).toEqual(['maanden', 'nl-fr']);
    });

    test('Getallen: which numbers and Richting', async () => {
        await openCard('5', 2);
        fireEvent.click(within(group('Welke getallen?')).getByRole('button', { name: 'tientallen tot 100' }));
        fireEvent.click(within(group('Richting')).getByRole('button', { name: 'Frans → cijfer' }));
        startRun();
        const ex = useOefenStore.getState().shown!.exercise as WordExercise;
        expect([ex.list, ex.dir]).toEqual(['tientallen', 'fr-nl']);
        expect(Number(ex.answer) % 10).toBe(0);
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
