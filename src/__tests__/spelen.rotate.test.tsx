// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import Touwtrekken from '../oefenen/spelen/skins/touwtrekken/Touwtrekken';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, Side } from '../oefenen/spelen/duel/types';

// "Draai je toestel" (kiosk/RotatePrompt): a phone held upright pauses the duel engine and the game session's
// clock, and the duel halves show no team pill: the score sits beside the lives in the band.

let from: SpelFrom;
let touw: SkinMeta;
const du = () => useDuelStore.getState();
const sp = () => useSpelStore.getState();
const q = (side: Side) => du().sides[side].question!;
const begin = (over: Partial<DuelConfig> = {}) =>
    du().begin({ meta: touw, from, rule: {}, config: { players: 2, level: 'moeilijk', lives: 3, bestOf: 3, stream: 'own', readyMs: 0, ...over } });

// A matchMedia whose answer the test flips (jsdom has none).
let upright = false;
const listeners = new Set<() => void>();
function setUpright(on: boolean) { upright = on; act(() => listeners.forEach(fn => fn())); }

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
    touw = skinById('touwtrekken')!.meta;
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    upright = false;
    window.matchMedia = ((query: string) => ({
        get matches() { return upright && query.includes('portrait'); },
        media: query,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); du().stop(); listeners.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the duel engine pauses', () => {
    test('a paused sum clock keeps what was left and runs out that much later; answers wait; the pause is no game time', () => {
        const outs: Side[] = [];
        const off = du().events.on('timeout', e => outs.push(e.side));
        begin();
        const deadline = du().sides.left.deadline!;
        vi.advanceTimersByTime(4_000);
        du().pause();
        expect(du().paused).toBe(true);
        vi.advanceTimersByTime(60_000);
        expect(outs).toEqual([]);
        // Nothing counts while paused.
        du().answer('left', q('left').answer);
        expect(du().sides.left.right).toBe(0);
        du().resume();
        expect(du().sides.left.deadline).toBe(deadline + 60_000);
        vi.advanceTimersByTime(8_000 - 1);
        expect(outs).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(outs.sort()).toEqual(['left', 'right']);
        // 12 s of play, not 72 s: the next sums still get the first minute's 12 s.
        vi.advanceTimersByTime(1_500);
        expect(du().sides.left.limitMs).toBe(12_000);
        off();
    });

    test('flights and the round clock shift with the pause; the ready banner waits too', () => {
        begin({ level: 'normaal', roundSeconds: 60, readyMs: 1_000 });
        expect(du().phase).toBe('ready');
        du().pause();
        vi.advanceTimersByTime(30_000);
        expect(du().phase).toBe('ready');
        du().resume();
        vi.advanceTimersByTime(1_000);
        expect(du().phase).toBe('play');
        // The round clock starts when play really starts, not when the paused banner was due.
        expect(du().roundEndsAt).toBe(Date.now() + 60_000);
        const lands: number[] = [];
        const off = du().events.on('land', () => lands.push(Date.now()));
        du().effect('left', { launch: { ms: 3_000, effect: { damage: { right: 1 } } } });
        const flight = du().flights[0];
        vi.advanceTimersByTime(1_000);
        du().pause();
        vi.advanceTimersByTime(10_000);
        du().resume();
        expect(du().flights[0].landsAt).toBe(flight.landsAt + 10_000);
        vi.advanceTimersByTime(2_000);
        expect(lands).toEqual([flight.landsAt + 10_000]);
        expect(du().sides.right.lives).toBe(2);
        off();
    });

    test('between rounds there is nothing to pause; stop clears a pause', () => {
        begin({ level: 'normaal' });
        du().pause();
        du().stop();
        expect(du().paused).toBe(false);
        begin({ level: 'normaal', lives: 1 });
        du().answer('left', q('left').answer);
        expect(du().phase).toBe('roundEnd');
        du().pause();
        expect(du().paused).toBe(false);
    });
});

describe('the duel screen', () => {
    const ready = () => act(() => { vi.advanceTimersByTime(DUEL_TIMING.readyMs); });

    test('no team pill in the halves; the score star sits beside the lives and counts right answers', () => {
        render(<Touwtrekken meta={resolveMeta(touw, { spelers: '2' })} from={from} onExit={vi.fn()} />);
        ready();
        expect(document.querySelector('.duel-half .duel-name')).toBeNull();
        expect(screen.getByRole('region', { name: 'Blauw' })).toBeTruthy();
        const star = (side: Side) => document.querySelector(`.duel-corner.is-${side} .duel-score-star`)!.getAttribute('aria-label');
        expect([star('left'), star('right')]).toEqual(['0 juist', '0 juist']);
        act(() => du().answer('left', q('left').answer));
        expect([star('left'), star('right')]).toEqual(['1 juist', '0 juist']);
    });

    test('held upright: "Draai je toestel" over the duel and the match pauses; on its side it plays on', () => {
        render(<Touwtrekken meta={resolveMeta(touw, { spelers: '2', niveau: 'moeilijk' })} from={from} onExit={vi.fn()} />);
        ready();
        expect(screen.queryByRole('dialog', { name: 'Draai je toestel' })).toBeNull();
        setUpright(true);
        expect(screen.getByRole('dialog', { name: 'Draai je toestel' })).toBeTruthy();
        expect(du().paused).toBe(true);
        expect(document.querySelector('.duel-app.is-paused')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(30_000); });
        expect(du().sides.left.wrong).toBe(0);
        setUpright(false);
        expect(screen.queryByRole('dialog', { name: 'Draai je toestel' })).toBeNull();
        expect(du().paused).toBe(false);
    });
});

describe('the game session pauses', () => {
    test('away: a timed round\'s clock stands still and resumes with what was left, also under a skin\'s hold', () => {
        const zombies = skinById('zombies')!.meta;
        sp().start({ ...from, meta: zombies });
        const left = sp().endsAt! - Date.now();
        vi.advanceTimersByTime(10_000);
        sp().setAway(true);
        expect(sp().pausedLeft).toBe(left - 10_000);
        vi.advanceTimersByTime(600_000);
        sp().tick();
        expect(sp().phase).not.toBe('end');
        // A skin's hold ending meanwhile does not restart the clock while the phone is still upright.
        sp().hold(true);
        sp().hold(false);
        expect(sp().pausedLeft).toBe(left - 10_000);
        sp().setAway(false);
        expect(sp().pausedLeft).toBeNull();
        expect(sp().endsAt).toBe(Date.now() + left - 10_000);
    });
});
