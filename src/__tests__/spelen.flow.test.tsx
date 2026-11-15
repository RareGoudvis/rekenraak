// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { resetKiosk } from './helpers/oefenKiosk';
import { SOUND_KEY, setSoundOn } from '../oefenen/spelen/sound';

// The page flow: the Keuze screen shows Automatiseren and, where games play the choice, the games bar under it;
// Ballonnen plays 20 questions, the end screen offers Nakijken, Opnieuw spelen and Ander spel (back to the Keuze screen).

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
afterEach(() => { cleanup(); vi.restoreAllMocks(); setSoundOn(false); });

async function toGames(grade: string, section: string, name: string, choice: RegExp) {
    render(<OefenApp />);
    click(`Leerjaar ${grade}`);
    await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
    topic(section, name);
    // Leerjaar 1 starts on "tot 10" (no brug there): these flows play the tot 20 sums.
    if (grade === '1') click('tot 20');
    click(choice);
}

describe('Spelen flow', () => {
    test('the registry: the tiles, Zombies timed', () => {
        expect(SKINS.map(s => s.meta.label)).toEqual(expect.arrayContaining(['Pinguïntoren', 'Ballonnen', 'Zombies', 'Race', 'Touwtrekken', 'Bom', 'Bever']));
        expect(SKINS.every(s => s.Component || s.Screen)).toBe(true);
        expect(SKINS.find(s => s.meta.id === 'zombies')!.meta.timed).toBe(true);
        expect(SKINS.find(s => s.meta.id === 'pinguintoren')!.meta).toMatchObject({ input: 'keypad', timed: false, round: { questions: 30, goal: 20 } });
        expect(SKINS.find(s => s.meta.id === 'ballonnen')!.meta).toMatchObject({ input: 'choice', round: { questions: 20 } });
    });

    test('the games bar only where a game plays the choice (+ and − up to leerjaar 6 since 2026-11-15, not cijferen); Automatiseren always', async () => {
        await toGames('2', 'Hoofdrekenen', 'Optellen', /Met brug/);
        expect(screen.getByRole('region', { name: 'Automatiseren' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Oefenen of spelen?' })).toBeNull();
        // The choice, Automatiseren and the games share one screen: Terug goes back to the topics.
        click(/Terug/);
        expect(screen.getByRole('heading', { name: 'Wat wil je oefenen?' })).toBeTruthy();
        cleanup();
        await toGames('4', 'Hoofdrekenen', 'Optellen', /Met brug/);
        expect(screen.getByRole('region', { name: 'Automatiseren' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        cleanup();
        await toGames('3', 'Cijferen', 'Optellen', /Met brug/);
        expect(screen.getByRole('region', { name: 'Automatiseren' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Of speel een spel' })).toBeNull();
    });

    test('the games bar, then Ballonnen; 20 answers with some wrong and one help; end screen; Nakijken runs the mistakes', async () => {
        await toGames('2', 'Hoofdrekenen', 'Optellen', /Met brug/);
        expect(screen.getByRole('group', { name: 'Kies een spel' })).toBeTruthy();
        expect((screen.getByRole('button', { name: 'Pinguïntoren' }) as HTMLButtonElement).disabled).toBe(false);
        expect((screen.getByRole('button', { name: 'Zombies, op tijd' }) as HTMLButtonElement).disabled).toBe(false);
        expect(screen.queryByText('binnenkort')).toBeNull();
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
        expect(screen.getByText('16 van 20 juist, 1 met hulp')).toBeTruthy();
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
        click('Pinguïntoren');
        await screen.findByRole('group', { name: 'Cijfers' });
        // The lazy skin's effects (the keypad's key listener) run before the first key.
        await act(async () => { });
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

    test('Zombies: the sum on the front sign, typed answers, a zombie at the door is a mistake shown as geen; the clock ends it', async () => {
        await toGames('2', 'Hoofdrekenen', 'Aftrekken', /Met brug/);
        click('Zombies, op tijd');
        // The pre-start screen: Normaal is already picked, one tap on Start.
        expect(screen.getByRole('button', { name: 'Normaal' }).getAttribute('aria-pressed')).toBe('true');
        click('Start');
        await screen.findByRole('group', { name: 'Cijfers' });
        // The lazy skin's effects (the keypad's key listener) run before the first key.
        await act(async () => { });
        expect(sp().sessie!.total).toBeUndefined();
        const q = sp().question!;
        expect(document.querySelector('.zb-sign.is-front')!.textContent).toBe(q.text);
        for (const k of [...q.answer, 'Enter']) fireEvent.keyDown(window, { key: k });
        expect(sp().history.map(h => [h.exerciseKey, h.correct])).toEqual([[q.key, true]]);
        expect(sp().score).toBe(1);
        act(() => sp().next());
        const missed = sp().question!;
        act(() => sp().miss());
        expect(sp().mistakes).toEqual([{ question: missed, given: '' }]);
        act(() => sp().tick(sp().endsAt! + 1));
        // Survivors left at the end: they cheer.
        expect(await screen.findByRole('heading', { name: 'Gered!' })).toBeTruthy();
        expect(sp().outcome).toBe('won');
        expect(screen.getByText('geen')).toBeTruthy();
    });

    test('Ander spel goes back to the Keuze screen of the same choice; keys 1 to 4 pick a balloon', async () => {
        await toGames('1', 'Hoofdrekenen', 'Aftrekken', /Zonder brug/);
        click('Ballonnen');
        await screen.findByRole('group', { name: 'Kies het antwoord' });
        // The speaker in the game bar: off by default, remembered per device.
        const speaker = screen.getByRole('button', { name: 'Geluid uit' });
        expect(speaker.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(speaker);
        expect(screen.getByRole('button', { name: 'Geluid aan' }).getAttribute('aria-pressed')).toBe('true');
        expect(localStorage.getItem(SOUND_KEY)).toBe('1');
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(sp().score).toBe(1);
        act(() => sp().otherGame());
        expect(await screen.findByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Aftrekken' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zonder brug' }).getAttribute('aria-pressed')).toBe('true');
        click(/Terug/);
        expect(screen.getByRole('heading', { name: 'Wat wil je oefenen?' })).toBeTruthy();
    });
});
