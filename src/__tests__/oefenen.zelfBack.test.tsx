// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { STOP_DISARM_MS } from '../oefenen/kiosk/TwoTapButton';
import { loadRuns } from '../services/oefenen/stats';
import type { OefenSessie } from '../services/oefenen/types';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// Terug naar begin: every Zelf oefenen run (count, timer, endless) can go back to the picker in two
// taps; what was made is kept as a finished run. A teacher's link never shows it.

const st = () => useOefenStore.getState();
const unlimited = STARTER_TYPES.map(t => ({ ...t, limit: undefined }));
const zelf = (over: Partial<OefenSessie> = {}) => starterSessie({ id: 'zelf-abc123', types: unlimited, ...over });
const backBtn = () => screen.queryByRole('button', { name: 'Terug naar begin' });

beforeEach(() => {
    resetKiosk();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Terug naar begin (Zelf oefenen)', () => {
    test('shown in count, timed and endless zelf runs; never with a teacher link', () => {
        for (const s of [zelf({ total: 3 }), zelf({ timerMin: 1 }), zelf()]) {
            resetKiosk();
            st().openZelf(s);
            const { unmount } = render(<OefenApp />);
            expect(backBtn()).toBeTruthy();
            unmount();
        }
        for (const s of [starterSessie(), starterSessie({ timerMin: 5 }), starterSessie({ types: unlimited })]) {
            resetKiosk();
            st().load(hashOf(s));
            st().start();
            const { unmount } = render(<OefenApp />);
            expect(backBtn()).toBeNull();
            unmount();
        }
    });

    test('two taps: the first only arms (focus on Annuleer), Ja, terug keeps the run and opens the picker', async () => {
        const s = zelf({ total: 5 });
        st().openZelf(s);
        act(() => { fillAnswer(true); st().answer(); st().next(); });
        act(() => { fillAnswer(false); st().answer(); st().next(); });
        render(<OefenApp />);
        fireEvent.click(backBtn()!);
        expect(st().phase).toBe('exercise');
        expect(st().sessie).not.toBeNull();
        expect(document.activeElement?.textContent).toBe('Annuleer');
        fireEvent.click(screen.getByRole('button', { name: 'Ja, terug' }));
        expect(st().sessie).toBeNull();
        expect(await screen.findByRole('heading', { name: 'Welk leerjaar?' })).toBeTruthy();
        const stored = loadRuns(s.id);
        expect(stored).toHaveLength(1);
        expect(stored[0].done).toBe(true);
        expect(stored[0].current).toBeUndefined();
        expect(stored[0].stats.finishedAt).toBeTypeOf('number');
        expect(stored[0].stats.history).toHaveLength(2);
    });

    test('Annuleer and a 3 s wait both disarm, the run goes on', () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        st().openZelf(zelf({ timerMin: 3 }));
        render(<OefenApp />);
        fireEvent.click(backBtn()!);
        fireEvent.click(screen.getByRole('button', { name: 'Annuleer' }));
        expect(document.activeElement).toBe(backBtn());
        fireEvent.click(backBtn()!);
        act(() => { vi.advanceTimersByTime(STOP_DISARM_MS); });
        expect(screen.queryByRole('button', { name: 'Ja, terug' })).toBeNull();
        expect(st().phase).toBe('exercise');
    });

    test('the same choice afterwards starts a new run, the left one listed as earlier', () => {
        const s = zelf({ total: 3 });
        st().openZelf(s);
        fillAnswer(true); st().answer(); st().next();
        st().leaveZelf();
        st().openZelf(s);
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history).toHaveLength(0);
        expect(loadRuns(s.id)).toHaveLength(2);
    });

    test('works from the Resultaten peek; leaveZelf does nothing for a teacher link', () => {
        st().openZelf(zelf({ total: 3 }));
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: /Resultaten/ }));
        fireEvent.click(backBtn()!);
        fireEvent.click(screen.getByRole('button', { name: 'Ja, terug' }));
        expect(st().sessie).toBeNull();
        cleanup();
        resetKiosk();
        st().load(hashOf(starterSessie()));
        st().start();
        st().leaveZelf();
        expect(st().sessie).not.toBeNull();
        expect(st().phase).toBe('exercise');
    });
});
