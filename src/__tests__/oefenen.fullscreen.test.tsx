// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// "Volledig scherm uit": the button shows only while fullscreen, exits on click, and leaving an oefening or game exits too.

let full: Element | null;
const requestFullscreen = vi.fn();
const exitFullscreen = vi.fn();
const setFull = (el: Element | null) => { full = el; document.dispatchEvent(new Event('fullscreenchange')); };
const btn = () => screen.queryByRole('button', { name: 'Volledig scherm uit' });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const unlimited = STARTER_TYPES.map(t => ({ ...t, limit: undefined }));

beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    useSpelStore.getState().otherGame();
    useSpelStore.getState().takePickerAt();
    full = null;
    requestFullscreen.mockReset().mockImplementation(() => { act(() => setFull(document.documentElement)); return Promise.resolve(); });
    exitFullscreen.mockReset().mockImplementation(() => { act(() => setFull(null)); return Promise.resolve(); });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => full });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Volledig scherm uit', () => {
    test('hidden in a window, shown in fullscreen, a tap exits', () => {
        useOefenStore.getState().openZelf(starterSessie({ id: 'zelf-abc123', types: unlimited }));
        render(<OefenApp />);
        expect(btn()).toBeNull();
        act(() => setFull(document.documentElement));
        expect(btn()).toBeTruthy();
        fireEvent.click(btn()!);
        expect(exitFullscreen).toHaveBeenCalledTimes(1);
        expect(btn()).toBeNull();
    });

    test('Terug naar begin (an oefening) exits fullscreen and the picker follows', async () => {
        useOefenStore.getState().openZelf(starterSessie({ id: 'zelf-abc123', types: unlimited }));
        render(<OefenApp />);
        act(() => setFull(document.documentElement));
        click('Terug naar begin');
        click('Ja, terug');
        expect(await screen.findByRole('heading', { name: 'Wat wil je oefenen?' })).toBeTruthy();
        expect(exitFullscreen).toHaveBeenCalled();
        expect(full).toBeNull();
    });

    test('a game: fullscreen on start, the button in its top bar, Ander spel exits', async () => {
        render(<OefenApp />);
        click('Leerjaar 1');
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(within(screen.getByRole('region', { name: 'Hoofdrekenen' })).getByRole('button', { name: 'Aftrekken' }));
        click('tot 20');
        click(/Zonder brug/);
        click('Ballonnen');
        await screen.findByRole('group', { name: 'Kies het antwoord' });
        expect(requestFullscreen).toHaveBeenCalled();
        expect(within(document.querySelector('.spel-topbar') as HTMLElement).getByRole('button', { name: 'Volledig scherm uit' })).toBeTruthy();
        act(() => useSpelStore.getState().otherGame());
        expect(await screen.findByRole('region', { name: 'Of speel een spel' })).toBeTruthy();
        expect(exitFullscreen).toHaveBeenCalled();
        expect(full).toBeNull();
        expect(btn()).toBeNull();
    });
});
