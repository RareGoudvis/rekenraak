// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { FLASH_MS, useOefenStore } from '../oefenen/useOefenStore';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';
import type { OefenType } from '../services/oefenen/types';
import { emptyStats, saveRun } from '../services/oefenen/stats';
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
    vi.useRealTimers();
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

    test('start screen leaves a type that generates nothing out of the count and the total', () => {
        const dead: OefenType = { typeId: 'klok-kloklezen', leafId: 'klok-analoog-lezen', label: 'Klok', constraints: { clockType: 'analoog', exerciseMode: 'lezen', timeTypes: [] }, limit: 5, weight: 1 };
        st().load(hashOf(starterSessie({ types: [dead, STARTER_TYPES[0]] })));
        render(<OefenApp />);
        expect(screen.getByText(/^1 soort · 2 oefening/)).toBeTruthy();
        expect(screen.queryByText('Klok')).toBeNull();
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

    test('keypad types, Controleer flashes juist / fout and moves on by itself (no Volgende)', () => {
        vi.useFakeTimers();
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[0]] })));
        st().start();
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: '7' }));
        expect((screen.getByRole('textbox', { name: 'Antwoord' }) as HTMLInputElement).value).toBe('7');
        fireEvent.click(screen.getByRole('button', { name: 'Laatste teken wissen' }));
        act(() => fillAnswer(false));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        // Juist / fout only: the right answer never shows on the kiosk mid-run.
        expect(screen.getByRole('status').textContent).toBe('Fout');
        expect(screen.queryByRole('button', { name: 'Volgende' })).toBeNull();
        act(() => { vi.advanceTimersByTime(FLASH_MS.fout); });
        expect(st().phase).toBe('exercise');
        expect(screen.queryByRole('status')).toBeNull();
    });

    test('Enter is Controleer, and Enter (or a tap) during the flash skips it', () => {
        st().load(hashOf(starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 5 }] })));
        st().start();
        render(<OefenApp />);
        act(() => fillAnswer(true));
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(screen.getByRole('status').textContent).toMatch(/Juist/);
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history).toHaveLength(1);
        act(() => fillAnswer(false));
        // Focus on Controleer: Enter during the flash skips it and does not answer again.
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        fireEvent.keyDown(screen.getByRole('button', { name: 'Controleer' }), { key: 'Enter' });
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history).toHaveLength(2);
        act(() => fillAnswer(true));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        fireEvent.click(screen.getByRole('status'));
        expect(st().phase).toBe('exercise');
    });

    test('2 kansen: "probeer nog eens", then Kans 2 van 2 on the same exercise', () => {
        vi.useFakeTimers();
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[0]], attempts: 2 })));
        st().start();
        render(<OefenApp />);
        expect(screen.queryByText('Kans 2 van 2')).toBeNull();
        act(() => fillAnswer(false));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(screen.getByRole('status').textContent).toBe('Fout — probeer nog eens');
        act(() => { vi.advanceTimersByTime(FLASH_MS.retry); });
        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.getByText('Kans 2 van 2')).toBeTruthy();
        expect((screen.getByRole('textbox', { name: 'Antwoord' }) as HTMLInputElement).value).toBe('');
        expect(screen.getByLabelText('Oefening 1 van 2')).toBeTruthy();
    });

    test('the stats table gets a "Juist na 2e kans" column with 2 kansen, and the first try in Foutjes', () => {
        st().load(hashOf(starterSessie({ types: [STARTER_TYPES[0]], attempts: 2 })));
        st().start();
        act(() => { fillAnswer(false); st().answer(); st().skipFlash(); fillAnswer(true); st().answer(); });
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(screen.getByRole('columnheader', { name: 'Juist na 2e kans' })).toBeTruthy();
        const row = screen.getByRole('row', { name: /Optellen/ });
        expect([...row.querySelectorAll('td')].map(td => td.textContent)).toEqual(['1', '1', '1', '0', '100 %']);
        expect(screen.getByText('99999, dan juist')).toBeTruthy();
    });

    test('one kans: no "Juist na 2e kans" column', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        expect(screen.queryByRole('columnheader', { name: 'Juist na 2e kans' })).toBeNull();
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

    test('testmode hides the Resultaten button mid-run, also with statsLocked off', () => {
        st().load(hashOf(starterSessie({ testMode: true, statsLocked: false })));
        st().start();
        act(() => { fillAnswer(false); st().answer(); });
        render(<OefenApp />);
        expect(screen.queryByRole('button', { name: /Resultaten/ })).toBeNull();
    });

    test('storage refusing the run shows a banner while practising and on the end screen', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        try {
            st().load(hashOf(starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 1 }] })));
            st().start();
            const { unmount } = render(<OefenApp />);
            expect(screen.getByRole('alert').textContent).toBe('Dit toestel kan je resultaten niet bewaren.');
            unmount();
            act(() => { fillAnswer(true); st().answer(); st().next(); });
            expect(st().phase).toBe('locked');
            render(<OefenApp />);
            expect(screen.getByRole('alert').textContent).toBe('Dit toestel kan je resultaten niet bewaren.');
        } finally { spy.mockRestore(); }
    });

    test('no banner while storage works', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        render(<OefenApp />);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    test('choice buttons: signs big, words in the word size; kiezen is tapped on the card', () => {
        const kiezen = leafType('vergelijken-kiezen');
        st().load(hashOf(starterSessie({ types: [kiezen] })));
        st().start();
        // Pin three-digit numbers: a random row can be all one- or two-digit (those stay sign-sized).
        const shown = st().shown!;
        useOefenStore.setState({ shown: { ...shown, exercise: { ...(shown.exercise as object), numbers: [437, 514, 416] } } });
        const { container, unmount } = render(<OefenApp />);
        // Phase C: no answer buttons, the row's own numbers are the buttons.
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect([...container.querySelectorAll('.kiosk-card-inner [data-kiosk-key]')].map(r => r.textContent)).toEqual(['437', '514', '416']);
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

    test('locked screen lists the earlier runs under Vorige keren; tapping one shows its numbers read-only', () => {
        const sessie = starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 1 }] });
        const run = (index: number, correct: number, wrong: number) => {
            const stats = emptyStats(sessie, Date.UTC(2026, 8, 1 + index, 10, 0));
            stats.perType[0] = { made: correct + wrong, correct, wrong, errors: [] };
            stats.finishedAt = stats.startedAt + 5 * 60_000;
            saveRun(sessie.id, { index, stats, done: true });
        };
        run(0, 3, 1); run(1, 2, 2); run(2, 4, 0);
        st().load(hashOf(sessie));
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Vorige keren' })).toBeTruthy();
        const rows = screen.getAllByRole('button', { name: /juist · 5 min/ });
        expect(rows).toHaveLength(2);
        // Newest earlier run first.
        expect(rows[0].textContent).toContain('2 van 4 juist');
        expect(rows[1].textContent).toContain('3 van 4 juist');
        fireEvent.click(rows[1]);
        expect(screen.getByText('3 van 4 juist')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Opnieuw' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Wissen' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
    });
});
