// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';
import type { OefenType } from '../services/oefenen/types';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';

// A session row for a sidebar leaf at its sidebar defaults, as the builder makes it.
function leafType(leafId: string): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    return { typeId: leaf.typeId, leafId, label: leafId, constraints: makeDraftBlock(leaf.typeId, leaf.defaultConstraints ?? {}).constraints as Record<string, unknown>, limit: 2, weight: 1 };
}

// Smoke render of every kiosk screen with a session of the four starter leaves: it renders,
// shows the right controls, and React logs nothing.

const st = () => useOefenStore.getState();
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    resetKiosk();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    cleanup();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
});

describe('kiosk screens', () => {
    test('no link and a broken link show the error screen', () => {
        render(<OefenApp />);
        expect(screen.getByRole('alert').textContent).toMatch(/werkt niet/);
        cleanup();
        st().load('#oefen=kapot');
        render(<OefenApp />);
        expect(screen.getByRole('alert').textContent).toMatch(/ongeldig/);
    });

    test('start screen names the session', () => {
        st().load(hashOf(starterSessie({ title: 'Week 6', timerMin: 15 })));
        render(<OefenApp />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Week 6');
        expect(screen.getByText('4 soorten · 8 oefeningen · 15 min')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Start/ }));
        expect(st().phase).toBe('exercise');
    });

    test('every starter type renders its exercise and answer panel', () => {
        for (const type of STARTER_TYPES) {
            resetKiosk();
            st().load(hashOf(starterSessie({ types: [type], timerMin: 10 })));
            st().start();
            const { container, unmount } = render(<OefenApp />);
            expect(container.querySelector('.kiosk-card-inner')?.children.length, type.leafId).toBeGreaterThan(0);
            expect(container.querySelector('.kiosk-card-fallback'), type.leafId).toBeNull();
            if (type.typeId === 'vergelijken') expect(screen.getAllByRole('radio')).toHaveLength(3);
            else expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
            expect(screen.getByRole('timer').textContent).toMatch(/10:00/);
            unmount();
        }
    });

    test('keypad types, Controleer shows juist / fout, Volgende moves on', () => {
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[0]] })));
        st().start();
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: '7' }));
        expect((screen.getByRole('textbox', { name: 'Antwoord' }) as HTMLInputElement).value).toBe('7');
        fireEvent.click(screen.getByRole('button', { name: 'Laatste teken wissen' }));
        act(() => fillAnswer(false));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(screen.getByRole('status').textContent).toMatch(/Fout/);
        // Juist / fout only: the right answer never shows on the kiosk mid-run.
        fireEvent.click(screen.getByRole('button', { name: 'Volgende' }));
        expect(st().phase).toBe('exercise');
        expect(screen.queryByRole('status')).toBeNull();
    });

    test('Enter is Controleer, then Volgende', () => {
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[0]] })));
        st().start();
        render(<OefenApp />);
        act(() => fillAnswer(true));
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(screen.getByRole('status').textContent).toMatch(/Juist/);
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(st().phase).toBe('exercise');
    });

    test('stats mid-run, and the button hidden while statsLocked', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        act(() => { fillAnswer(false); st().answer(); });
        const { unmount } = render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(screen.getByRole('heading', { name: 'Resultaten' })).toBeTruthy();
        expect(screen.getByText('Foutjes')).toBeTruthy();
        expect(screen.getByText('0 van 1 juist')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Verder oefenen' }));
        unmount();

        resetKiosk();
        st().load(hashOf(starterSessie({ statsLocked: true })));
        st().start();
        render(<OefenApp />);
        expect(screen.queryByRole('button', { name: /Resultaten/ })).toBeNull();
    });

    test('choice buttons: signs big, numbers in the number size, words in the word size', () => {
        const kiezen = leafType('vergelijken-kiezen');
        st().load(hashOf(starterSessie({ types: [kiezen] })));
        st().start();
        // Pin three-digit numbers: a random row can be all one- or two-digit (those stay sign-sized).
        const shown = st().shown!;
        useOefenStore.setState({ shown: { ...shown, exercise: { ...(shown.exercise as object), numbers: [437, 514, 416] } } });
        const { container, unmount } = render(<OefenApp />);
        expect(screen.getAllByRole('radio').map(r => r.textContent)).toEqual(['437', '514', '416']);
        expect(container.querySelector('.kiosk-choices')?.className).toBe('kiosk-choices is-numbers');
        unmount();

        resetKiosk();
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[3]] })));
        st().start();
        const signs = render(<OefenApp />);
        expect(signs.container.querySelector('.kiosk-choices')?.className).toBe('kiosk-choices');
        signs.unmount();

        resetKiosk();
        st().load(hashOf(starterSessie({ types: [leafType('even-oneven-cirkels')] })));
        st().start();
        const words = render(<OefenApp />);
        expect(words.container.querySelector('.kiosk-choices')?.className).toBe('kiosk-choices is-words');
    });

    test('a captioned field (euro / cent) has no placeholder repeating its caption', () => {
        st().load(hashOf(starterSessie({ types: [leafType('geld-teruggeven')] })));
        st().start();
        const { container } = render(<OefenApp />);
        expect([...container.querySelectorAll('.kiosk-field-cap')].map(c => c.textContent)).toEqual(['euro', 'cent']);
        for (const f of container.querySelectorAll('input.kiosk-field')) expect(f.getAttribute('placeholder')).toBeNull();
    });

    test('peeking at the stats keeps the progress on the exercise that waits', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        render(<OefenApp />);
        expect(screen.getByLabelText('Oefening 1 van 8')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(screen.getByLabelText('Oefening 1 van 8')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Verder oefenen' }));
        act(() => { fillAnswer(true); st().answer(); });
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(screen.getByLabelText('Oefening 1 van 8')).toBeTruthy();
    });

    test('mid-run peek shows only Verder oefenen, no Opnieuw or Wissen', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(st().phase).toBe('stats');
        expect(screen.getByRole('button', { name: 'Verder oefenen' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Opnieuw' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Wissen' })).toBeNull();
    });

    test('locked end screen: no way back, Opnieuw and a two-tap Wissen', () => {
        st().load(hashOf(starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 1 }] })));
        st().start();
        act(() => { fillAnswer(true); st().answer(); st().next(); });
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Verder oefenen' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Opnieuw' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Wissen' }));
        fireEvent.click(screen.getByRole('button', { name: 'Ja, alles wissen' }));
        expect(st().phase).toBe('start');
    });
});
