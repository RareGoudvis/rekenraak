// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// The restyled Fout and Klaar screens (mockup 2026-11-14): Nog eens proberen after the steps is the same sum once
// more, never counted; Nakijken on a Zelf oefenen end screen runs this run's fouts again.

const st = () => useOefenStore.getState();
// Optellen only, with steps: every fout offers them.
const sums = (over = {}, limit = 3) => starterSessie({ id: 'zelf-try1', types: [{ ...STARTER_TYPES[0], limit }], noSteps: undefined, ...over });
// Wrong answers until a sum offers steps (a drawn sum may have none): the steps phase, as after a real fout.
function toSteps() {
    st().openZelf(sums({}, 30));
    for (let i = 0; i < 30 && st().phase !== 'steps'; i++) act(() => { if (st().phase !== 'exercise') st().next(); fillAnswer(false); st().answer(); st().skipFlash(); });
    expect(st().phase).toBe('steps');
}

beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ missed: [] });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Nog eens proberen', () => {
    test('the same exercise again, uncounted: juist moves on, the run keeps its one fout', () => {
        toSteps();
        const first = st().shown!;
        const made = st().run!.stats.history.length;
        act(() => st().tryAgain());
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).toBe(first.exerciseKey);
        expect(st().shown!.practice).toBe(true);
        expect(st().input.every(v => v === '')).toBe(true);
        act(() => { fillAnswer(true); st().answer(); });
        expect(st().lastCorrect).toBe(true);
        expect(st().run!.stats.history).toHaveLength(made);
        expect(st().run!.stats.history[made - 1].correct).toBe(false);
        act(() => st().skipFlash());
        expect(st().shown!.exerciseKey).not.toBe(first.exerciseKey);
        expect(st().shown!.practice).toBeUndefined();
    });

    test('a wrong practice try shows the steps again, still uncounted', () => {
        toSteps();
        const made = st().run!.stats.history.length;
        act(() => st().tryAgain());
        act(() => { fillAnswer(false); st().answer(); st().skipFlash(); });
        expect(st().phase).toBe('steps');
        expect(st().run!.stats.history).toHaveLength(made);
        expect(st().missed).toHaveLength(made);
    });

    test('the steps panel shows the struck answer and the button', () => {
        toSteps();
        render(<OefenApp />);
        expect(screen.getByText('Jouw antwoord:')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Toon de stappen/ }));
        expect(screen.getByText('Bijna! Kijk even mee.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Nog eens proberen/ }));
        expect(st().phase).toBe('exercise');
    });
});

describe('Nakijken on the end screen', () => {
    test('a zelf run with fouts offers it and runs exactly those exercises; a teacher link never does', () => {
        st().openZelf(sums());
        const wrong: string[] = [];
        for (const right of [false, true, false]) {
            if (!right) wrong.push(st().shown!.exerciseKey);
            act(() => { fillAnswer(right); st().answer(); st().next(); });
        }
        expect(st().phase).toBe('locked');
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Nakijken/ }));
        expect(st().sessie!.id).toMatch(/^zelf-/);
        expect(st().sessie!.total).toBe(2);
        expect(st().shown!.exerciseKey).toBe(wrong[0]);
        cleanup();

        resetKiosk();
        st().load(hashOf(sums({ id: 'teach123' })));
        st().start();
        for (const right of [false, true, true]) act(() => { fillAnswer(right); st().answer(); st().next(); });
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Nakijken/ })).toBeNull();
    });

    test('Knap gedaan! for a zelf run with half or more juist', () => {
        st().openZelf(sums());
        for (const right of [true, true, false]) act(() => { fillAnswer(right); st().answer(); st().next(); });
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Knap gedaan!' })).toBeTruthy();
        expect(screen.getByRole('img', { name: '2 van de 3 sterren' })).toBeTruthy();
    });
});
