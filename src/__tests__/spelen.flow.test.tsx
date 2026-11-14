// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { resetKiosk } from './helpers/oefenKiosk';

// The page flow: a + / − card at leerjaar 1–3 asks Oefenen or Spelen; Spelen shows the game tiles,
// Ballonnen plays 20 questions, the end screen offers Nakijken, Opnieuw spelen and Ander spel.

const sp = () => useSpelStore.getState();
const topic = (section: string, name: string) => fireEvent.click(within(screen.getByRole('region', { name: section })).getByRole('button', { name }));
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    vi.spyOn(console, 'error').mockImplementation(() => { });
    // jsdom has no matchMedia; the shell reads prefers-reduced-motion through it.
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function toGames(grade: string, section: string, name: string, choice: RegExp) {
    render(<OefenApp />);
    click(grade);
    await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
    topic(section, name);
    click(choice);
}

describe('Spelen flow', () => {
    test('the registry: three tiles, Zombies timed', () => {
        expect(SKINS.map(s => s.meta.label)).toEqual(['Pinguïntoren', 'Ballonnen', 'Zombies']);
        expect(SKINS.filter(s => s.Component).map(s => s.meta.id)).toEqual(['pinguintoren', 'ballonnen']);
        expect(SKINS.find(s => s.meta.id === 'zombies')!.meta.timed).toBe(true);
        expect(SKINS.find(s => s.meta.id === 'pinguintoren')!.meta).toMatchObject({ input: 'keypad', timed: false, round: { questions: 30, goal: 20 } });
        expect(SKINS.find(s => s.meta.id === 'ballonnen')!.meta).toMatchObject({ input: 'choice', round: { questions: 20 } });
    });

    test('Oefenen of spelen? only for + and − at leerjaar 1 to 3', async () => {
        await toGames('2', 'Hoofdrekenen', 'Optellen', /Met brug/);
        expect(screen.getByRole('heading', { name: 'Oefenen of spelen?' })).toBeTruthy();
        // Terug goes back to the choices.
        click(/Terug/);
        expect(screen.getByRole('heading', { name: 'Optellen' })).toBeTruthy();
        cleanup();
        await toGames('4', 'Hoofdrekenen', 'Optellen', /Met brug/);
        expect(screen.getByRole('heading', { name: 'Hoeveel wil je doen?' })).toBeTruthy();
        cleanup();
        await toGames('3', 'Cijferen', 'Optellen', /Met brug/);
        expect(screen.getByRole('heading', { name: 'Hoeveel wil je doen?' })).toBeTruthy();
    });

    test('Spelen: the tiles, then Ballonnen; 20 answers with some wrong and one help; end screen; Nakijken runs the mistakes', async () => {
        await toGames('2', 'Hoofdrekenen', 'Optellen', /Met brug/);
        click('Spelen');
        expect(screen.getByRole('heading', { name: 'Kies een spel' })).toBeTruthy();
        expect((screen.getByRole('button', { name: 'Pinguïntoren' }) as HTMLButtonElement).disabled).toBe(false);
        expect((screen.getByRole('button', { name: /Zombies, op tijd, binnenkort/ }) as HTMLButtonElement).disabled).toBe(true);
        click('Ballonnen');
        expect(sp().phase).toBe('play');
        expect(sp().sessie!.total).toBe(20);
        // The skin is its own lazy chunk.
        const group = await screen.findByRole('group', { name: 'Kies het antwoord' });
        expect(within(group).getAllByRole('button')).toHaveLength(4);
        expect(screen.getByRole('button', { name: /Hoe los ik dit op/ })).toBeTruthy();

        for (let i = 0; i < 20; i++) {
            const q = sp().question!;
            if (i === 2) {
                click(/Hoe los ik dit op/);
                expect(screen.getByRole('dialog')).toBeTruthy();
                click('Verder spelen');
                expect(screen.queryByRole('dialog')).toBeNull();
            }
            const pick = [5, 11, 17].includes(i) ? q.choices.find(c => c !== q.answer)! : q.answer;
            const balloons = within(await screen.findByRole('group', { name: 'Kies het antwoord' })).getAllByRole('button');
            fireEvent.click(balloons[q.choices.indexOf(pick)]);
            act(() => sp().next());
        }
        expect(await screen.findByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        expect(screen.getByText('16 van 20 juist')).toBeTruthy();
        expect(sp().helped).toBe(1);
        expect(sp().mistakes).toHaveLength(3);
        const keys = sp().mistakes.map(m => m.question.key);
        click('Nakijken');
        expect(useOefenStore.getState().sessie!.title).toBe('Nakijken');
        expect(useOefenStore.getState().shown!.exerciseKey).toBe(keys[0]);
        expect(await screen.findByText('1 / 3')).toBeTruthy();
    });

    test('Pinguïntoren: typed answers build the tower; a mistake takes a block off; 20 blocks end on De toren is af!', async () => {
        await toGames('1', 'Hoofdrekenen', 'Optellen', /Zonder brug/);
        click('Spelen');
        click('Pinguïntoren');
        await screen.findByRole('group', { name: 'Cijfers' });
        const type = (v: string) => { for (const k of [...v, 'Enter']) fireEvent.keyDown(window, { key: k }); };
        let n = 0;
        while (sp().phase === 'play') {
            const q = sp().question!;
            type(n === 3 || n === 7 ? String(Number(q.answer) + 1) : q.answer);
            n++;
            act(() => sp().next());
        }
        expect(await screen.findByRole('heading', { name: 'De toren is af!' })).toBeTruthy();
        // Each mistake takes a block back: 24 questions for 20 blocks.
        expect(screen.getByText('22 van 24 juist')).toBeTruthy();
        expect(sp().mistakes).toHaveLength(2);
    });

    test('Ander spel goes back to the tiles of the same choice; keys 1 to 4 pick a balloon', async () => {
        await toGames('1', 'Hoofdrekenen', 'Aftrekken', /Zonder brug/);
        click('Spelen');
        click('Ballonnen');
        await screen.findByRole('group', { name: 'Kies het antwoord' });
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(sp().score).toBe(1);
        act(() => sp().otherGame());
        expect(await screen.findByRole('heading', { name: 'Kies een spel' })).toBeTruthy();
        click(/Terug/);
        expect(screen.getByRole('heading', { name: 'Oefenen of spelen?' })).toBeTruthy();
    });
});
