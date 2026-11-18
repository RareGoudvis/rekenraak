// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import GameRow from '../oefenen/zelf/GameRow';
import { gamesFor } from '../oefenen/zelf/topicGames';
import { NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Taartgevecht from '../oefenen/spelen/skins/taartgevecht/Taartgevecht';
import { TAART, TAART_RULE, creamBlobs, isFinalPie } from '../oefenen/spelen/skins/taartgevecht/rule';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import { CLOCK } from '../oefenen/spelen/levels/clock';
import type { DuelCtx } from '../oefenen/spelen/duel/types';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';

// Taartgevecht on the duel engine: one shared sum, the first right answer throws a pie (a life off when it
// lands), a wrong answer makes that contestant dizzy for the 2 s lock; the cream grows per hit; the last pie.

let from: SpelFrom;
const taart = () => skinById('taartgevecht')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(taart().meta, picks);
const du = () => useDuelStore.getState();
const q = () => du().sides.left.question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const who = (side: 'left' | 'right') => document.querySelector(`.tg-who.is-${side}`)!;
const lives = () => [du().sides.left.lives, du().sides.right.lives];

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); useSpelStore.getState().otherGame(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Taartgevecht: the registry entry', () => {
    test('a duel tile for 1 or 2 spelers with the shared duel options and a blurb', () => {
        const t = taart();
        expect(t.meta).toMatchObject({ id: 'taartgevecht', label: 'Taartgevecht', input: 'keypad', timed: false, players: '1-2', music: 'gek' });
        expect(t.Screen && !t.Component).toBeTruthy();
        expect(t.meta.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes']);
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', levens: '10', rondes: '3' });
        // The scene voices the throw and the dizzy lock itself.
        expect(t.meta.sounds).toMatchObject({ correct: null, wrong: null });
        expect(GAME_BLURB.taartgevecht).toBeTruthy();
        render(<GameRow games={gamesFor(NUMBER_CONTENT, new Date(2026, 6, 1))} onPlay={() => { }} />);
        expect(screen.getByRole('button', { name: /^Taartgevecht/ }).getAttribute('aria-label')).toBe('Taartgevecht, 1 of 2 spelers');
    });
});

describe('Taartgevecht: the rule', () => {
    const ctx = (themLives: number): DuelCtx => ({
        side: 'left', other: 'right', me: freshSideView(5), them: { ...freshSideView(5), lives: themLives }, streak: 1, level: 'normaal', round: 1,
        config: { players: 2, level: 'normaal', lives: 5, bestOf: 3, stream: 'shared' },
    });

    test('a right answer throws a pie that takes 1 life when it lands; the last life gets the slow final pie', () => {
        expect(TAART_RULE.right!(ctx(3))).toEqual({ launch: { ms: TAART.flightMs, tag: 'pie', data: { final: false }, effect: { damage: { right: 1 } } } });
        expect(TAART_RULE.right!(ctx(1)).launch).toMatchObject({ ms: TAART.finalMs, data: { final: true }, effect: { damage: { right: 1 }, tag: 'final' } });
        expect([3, 2, 1, 0].map(isFinalPie)).toEqual([false, false, true, true]);
        // A wrong answer and a time-out throw nothing (the lock and the clock are the cost).
        expect(TAART_RULE.wrong).toBeUndefined();
        expect(TAART_RULE.timeout).toBeUndefined();
        expect(TAART_RULE.cardMs).toBe(TAART.endMs);
    });

    test('every pie lands before the next shared sum shows, so two pies never cross', () => {
        expect(TAART.flightMs).toBeLessThan(DUEL_TIMING.sharedNext);
        expect(TAART.finalMs).toBeLessThan(DUEL_TIMING.sharedNext);
        expect(TAART.releaseMs).toBeLessThan(TAART.flightMs);
    });

    test('the cream grows with every hit and is complete one hit before the end', () => {
        for (const n of [3, 5, 7]) {
            const seq = Array.from({ length: n + 1 }, (_, h) => creamBlobs(h, n));
            expect(seq[0]).toBe(0);
            expect(seq[n - 1]).toBe(TAART.blobs);
            expect(seq[n]).toBe(TAART.blobs);
            for (let h = 1; h < n; h++) expect(seq[h]).toBeGreaterThan(seq[h - 1]);
        }
    });
});

describe('Taartgevecht: the screen', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        vi.setSystemTime(1_000_000);
    });
    const ready = () => tick(DUEL_TIMING.readyMs);

    test('2 spelers: one shared sum; a pie flies and splats; the cream stays; the last pie ends the round', () => {
        render(<Taartgevecht meta={meta({ spelers: '2', levens: '5' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ stream: 'shared', wrongLockMs: TAART.wrongLockMs });
        expect(du().sides.left.question).toBe(du().sides.right.question);
        expect(who('left').classList).toContain('is-kid-a');
        expect(who('right').classList).toContain('is-kid-b');
        act(() => du().answer('left', q().answer));
        expect(document.querySelectorAll('.tg-fly')).toHaveLength(1);
        expect(document.querySelector('.tg-arm.is-throw')).toBeTruthy();
        tick(TAART.flightMs - 20);
        expect(lives()).toEqual([5, 5]);
        tick(30);
        expect(lives()).toEqual([5, 4]);
        expect(document.querySelector('.tg-fly')).toBeNull();
        expect(document.querySelector('.tg-splat')).toBeTruthy();
        expect(who('right').classList).toContain('is-hit');
        expect(who('right').querySelectorAll('.tg-blob')).toHaveLength(creamBlobs(1, 5));
        expect(document.querySelector('.tg-crowd.is-ooh')).toBeTruthy();
        tick(DUEL_TIMING.sharedNext);
        expect(who('right').classList).toContain('is-idle');
        expect(who('right').querySelectorAll('.tg-blob')).toHaveLength(creamBlobs(1, 5));
        // Right throws back.
        act(() => du().answer('right', q().answer));
        tick(TAART.flightMs + 10);
        expect(lives()).toEqual([4, 4]);
        tick(DUEL_TIMING.sharedNext);
        for (let i = 0; i < 3; i++) {
            act(() => du().answer('left', q().answer));
            tick(TAART.flightMs + 10);
            tick(DUEL_TIMING.sharedNext);
        }
        // Right has 1 life: the last pie is slow, the camera leans in.
        act(() => du().answer('left', q().answer));
        expect(document.querySelector('.tg-fly.is-final')).toBeTruthy();
        expect(document.querySelector('.tg-cam.is-slowmo')).toBeTruthy();
        tick(TAART.flightMs + 10);
        expect(du().phase).toBe('play');
        tick(TAART.finalMs - TAART.flightMs);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(who('right').querySelector('.tg-cover')).toBeTruthy();
        expect(who('left').classList).toContain('is-win');
        expect(document.querySelector('.tg-crowd.is-cheer')).toBeTruthy();
        expect(document.querySelector('.tg-confetti')).toBeTruthy();
        tick(1500);
        expect(who('right').classList).toContain('is-lose');
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(TAART.endMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.tg-card-art')).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new round: clean faces.
        expect(document.querySelectorAll('.tg-blob, .tg-cover')).toHaveLength(0);
        expect(document.querySelector('.tg-cam.is-slowmo')).toBeNull();
    });

    test('a wrong answer: that contestant is dizzy for the 2 s lock and loses no life; the other may still throw', () => {
        render(<Taartgevecht meta={meta({ spelers: '2', levens: '5' })} from={from} onExit={() => { }} />);
        ready();
        const wrong = String(Number(q().answer) + 1);
        act(() => du().answer('left', wrong));
        expect(du().sides.left.locked).toBe(true);
        expect(who('left').classList).toContain('is-dizzy');
        expect(who('left').querySelector('.tg-stars')).toBeTruthy();
        expect(lives()).toEqual([5, 5]);
        tick(TAART.wrongLockMs + 10);
        expect(who('left').classList).toContain('is-idle');
        act(() => du().answer('right', q().answer));
        tick(TAART.flightMs + 10);
        expect(lives()).toEqual([4, 5]);
    });

    test('Moeilijk: a time-out throws nothing; both out = the answer shows and the next sum comes', () => {
        render(<Taartgevecht meta={meta({ spelers: '2', levens: '5', niveau: 'moeilijk' })} from={from} onExit={() => { }} />);
        ready();
        const first = q().key;
        expect(du().sides.left.limitMs).toBe(CLOCK.startMs);
        expect(document.querySelectorAll('.duel-ring')).toHaveLength(2);
        tick(CLOCK.startMs + 10);
        expect(lives()).toEqual([5, 5]);
        expect(du().flights).toHaveLength(0);
        tick(DUEL_TIMING.flashWrong + 10);
        expect(q().key).not.toBe(first);
    });

    test('1 speler: the computer is a robot chef on the right that throws on its own', () => {
        render(<Taartgevecht meta={meta({ spelers: '1', levens: '5' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        ready();
        expect(who('right').classList).toContain('is-robot');
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        tick(12_000);
        expect(du().sides.left.lives).toBeLessThan(5);
    });
});
