// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { resetKiosk } from './helpers/oefenKiosk';

const st = () => useOefenStore.getState();
// Optellen exists under Hoofdrekenen and Cijferen: the section is part of the address.
const topic = (section: string, name: string) => fireEvent.click(within(screen.getByRole('region', { name: section })).getByRole('button', { name }));
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
    resetKiosk();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Zelf oefenen picker', () => {
    test('a bare page shows the picker, a broken link still shows its error', () => {
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Welk leerjaar?' })).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        cleanup();
        st().load('#oefen=kapot');
        render(<OefenApp />);
        expect(screen.getByRole('alert').textContent).toMatch(/ongeldig/);
    });

    test('leerjaar, onderwerp, oefening, hoeveel: starts a counted run; Andere oefening returns to the picker', async () => {
        render(<OefenApp />);
        click('2');
        expect(await screen.findByRole('heading', { name: 'Wat wil je oefenen?' })).toBeTruthy();
        // Back goes one step up and the topic list is still there afterwards.
        click(/Terug/);
        expect(screen.getByRole('heading', { name: 'Welk leerjaar?' })).toBeTruthy();
        click('2');
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        topic('Hoofdrekenen', 'Optellen');
        const variants = screen.getAllByRole('button').filter(b => !/Terug/.test(b.textContent ?? ''));
        expect(variants.length).toBeGreaterThan(0);
        fireEvent.click(variants[0]);
        // + and − at leerjaar 1–3 ask Oefenen or Spelen first.
        click('Oefenen');
        expect(screen.getByRole('heading', { name: 'Hoeveel wil je doen?' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
        click('3 oefeningen');
        click('Begin met oefenen');
        const s = st().sessie!;
        expect(s.id).toMatch(/^zelf-/);
        expect(s.total).toBe(3);
        expect(st().phase).toBe('exercise');
        expect(st().run).not.toBeNull();
    });

    test('a timed choice sets the timer and no total', async () => {
        render(<OefenApp />);
        click('1');
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        topic('Hoofdrekenen', 'Optellen');
        fireEvent.click(screen.getAllByRole('button').filter(b => !/Terug/.test(b.textContent ?? ''))[0]);
        click('Oefenen');
        click('3 minuten');
        click('Begin met oefenen');
        expect(st().sessie!.timerMin).toBe(3);
        expect(st().sessie!.total).toBeUndefined();
    });

    test('the end screen of a zelf run offers Andere oefening', async () => {
        render(<OefenApp />);
        click('1');
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        topic('Hoofdrekenen', 'Optellen');
        fireEvent.click(screen.getAllByRole('button').filter(b => !/Terug/.test(b.textContent ?? ''))[0]);
        click('Oefenen');
        click('Begin met oefenen');
        // A finished run, set straight into the store (the run itself is the kiosk's own tested path).
        useOefenStore.setState({ phase: 'locked', run: { ...st().run!, done: true } });
        fireEvent.click(await screen.findByRole('button', { name: 'Andere oefening' }));
        expect(await screen.findByRole('heading', { name: 'Welk leerjaar?' })).toBeTruthy();
        expect(st().sessie).toBeNull();
    });
});
