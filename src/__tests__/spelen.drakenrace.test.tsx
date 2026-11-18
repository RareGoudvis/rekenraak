// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../oefenen/spelen/sound';
import Drakenrace from '../oefenen/spelen/skins/drakenrace/Drakenrace';
import { DRAAK, DRAAK_RULE, callsLightning, knockOf, progressOf, raceOver } from '../oefenen/spelen/skins/drakenrace/rule';
import { DRAAK_SOUNDS, playDraak } from '../oefenen/spelen/skins/drakenrace/sounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, Side } from '../oefenen/spelen/duel/types';

// Drakenrace on the duel engine: the race rule (a wingbeat +1, every 3rd in a row the lightning knocks the other
// dragon back 1 and never below the start, a stall on a wrong answer, the first at the course's end wins), a
// match on the engine, the screen for 1 and 2 spelers, and the sounds.

let from: SpelFrom;
const skin = () => skinById('drakenrace')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const du = () => useDuelStore.getState();
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const view = (points: number, streak = 0) => ({ ...freshSideView(20), points, streak });
const ctx = (streak: number, them = 5): DuelCtx => ({
    side: 'left', other: 'right', me: view(4, streak), them: view(them), streak, level: 'normaal', round: 1, config: { lives: 20 } as DuelConfig,
});

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

describe('Drakenrace: the tile', () => {
    test('a 1-2 player duel race: the levens row is the course, kasteel music, a blurb', () => {
        const s = skin();
        expect(s.meta).toMatchObject({ id: 'drakenrace', label: 'Drakenrace', input: 'keypad', players: '1-2', music: 'kasteel' });
        expect(s.Screen && !s.Component).toBeTruthy();
        const course = s.meta.options!.find(o => o.id === 'levens')!;
        expect(course.label).toBe('Hoe ver vliegen?');
        expect(course.default).toBe(String(DRAAK.course.default));
        expect(course.choices.map(c => c.value)).toEqual(DRAAK.course.choices.map(String));
        expect(GAME_BLURB.drakenrace).toBeTruthy();
    });
});

describe('Drakenrace: the pure rule', () => {
    test('every 3rd right answer in a row calls the lightning', () => {
        expect([0, 1, 2, 3, 4, 5, 6, 9].map(callsLightning)).toEqual([false, false, false, true, false, false, true, true]);
    });

    test('the knock is 1, never below the start', () => {
        expect([0, 1, 2, 7].map(knockOf)).toEqual([0, 1, 1, 1]);
    });

    test('a right answer is a wingbeat; the 3rd in a row also knocks the other dragon back; a wrong one only stalls', () => {
        expect(DRAAK_RULE.right!(ctx(1))).toEqual({ points: { left: 1 }, tag: 'beat' });
        expect(DRAAK_RULE.right!(ctx(3))).toEqual({ points: { left: 1, right: -1 }, tag: 'lightning' });
        // The other dragon at the start: the lightning still strikes, nobody goes below 0.
        expect(DRAAK_RULE.right!(ctx(6, 0))).toEqual({ points: { left: 1 }, tag: 'lightning' });
        expect(DRAAK_RULE.wrong!(ctx(0))).toEqual({ tag: 'stall' });
        expect(DRAAK_RULE.timeout).toBeUndefined();
    });

    test('the first dragon at the course (the levens) wins; the place on the course is 0..1', () => {
        const config = { lives: 10 } as DuelConfig;
        expect(raceOver({ sides: { left: view(9), right: view(9) }, config })).toBeNull();
        expect(raceOver({ sides: { left: view(10), right: view(9) }, config })).toBe('left');
        expect(raceOver({ sides: { left: view(3), right: view(10) }, config })).toBe('right');
        expect(progressOf({ points: 5 }, 10)).toBe(0.5);
        expect(progressOf({ points: 12 }, 10)).toBe(1);
        expect(progressOf({ points: 0 }, 0)).toBe(0);
    });
});

describe('Drakenrace: a match on the engine', () => {
    const begin = (lives = 6) => {
        vi.useFakeTimers();
        du().begin({ meta: meta({ spelers: '2' }), from, rule: DRAAK_RULE, config: { players: 2, level: 'normaal', lives, bestOf: 3, stream: 'own', readyMs: 0 } });
    };
    const answer = (side: Side, right: boolean) => {
        const q = du().sides[side].question!.answer;
        du().answer(side, right ? q : `${q}9`);
        vi.advanceTimersByTime(right ? DUEL_TIMING.flashRight : DUEL_TIMING.flashWrong);
    };

    test('wingbeats move forward; the 3rd in a row knocks the other back; a stall costs nothing but the streak', () => {
        begin();
        answer('right', true);
        answer('right', true);
        expect(du().sides.right.points).toBe(2);
        answer('left', true);
        answer('left', true);
        answer('left', false);
        expect(du().sides.left).toMatchObject({ points: 2, streak: 0 });
        answer('left', true);
        answer('left', true);
        answer('left', true);
        expect(du().sides.left.points).toBe(5);
        expect(du().sides.right.points).toBe(1);
    });

    test('the lightning never knocks a dragon below the start', () => {
        begin();
        for (let i = 0; i < 3; i++) answer('left', true);
        expect(du().sides.right.points).toBe(0);
        expect(du().sides.left.points).toBe(3);
    });

    test('the first at the course wins the round; the card waits for the gong', () => {
        begin(4);
        const wins: string[] = [];
        const off = du().events.on('roundEnd', ({ winner }) => wins.push(String(winner)));
        for (let i = 0; i < 3; i++) answer('left', true);
        expect(du().phase).toBe('play');
        du().answer('left', du().sides.left.question!.answer);
        expect(du().phase).toBe('roundEnd');
        expect(wins).toEqual(['left']);
        vi.advanceTimersByTime(DRAAK.cardMs - 1);
        expect(du().card).toBe(false);
        vi.advanceTimersByTime(1);
        expect(du().card).toBe(true);
        off();
    });
});

describe('Drakenrace: the screen', () => {
    test('2 spelers: two keypads and dragons, the lightning with ZAP!, the stall, the gong and the card', () => {
        vi.useFakeTimers();
        render(<Drakenrace meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Blauw' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Oranje' })).toBeTruthy();
        expect(document.querySelectorAll('.dk-dragon-at')).toHaveLength(2);
        expect(document.querySelector('.duel-hearts')).toBeNull();
        const right = (side: Side) => { act(() => du().answer(side, du().sides[side].question!.answer)); tick(DUEL_TIMING.flashRight); };
        right('right');
        right('left');
        right('left');
        expect(screen.getByRole('img', { name: '2 van 3 op rij' })).toBeTruthy();
        expect(document.querySelector('.dk-storm.is-charge.is-left')).not.toBeNull();
        act(() => du().answer('left', du().sides.left.question!.answer));
        expect(document.querySelector('.dk-bolt')).not.toBeNull();
        expect(screen.getByText('ZAP!')).toBeTruthy();
        expect(document.querySelector('.dk-dragon-at.is-right .dk-move.is-zap')).not.toBeNull();
        expect(du().sides.right.points).toBe(0);
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('left', '99999'));
        expect(document.querySelector('.dk-dragon-at.is-left .dk-move.is-stall')).not.toBeNull();
        tick(DUEL_TIMING.flashWrong);
        while (du().phase === 'play') right('left');
        expect(du().roundWinner).toBe('left');
        tick(600);
        expect(document.querySelector('.dk-dragon.is-ringing')).not.toBeNull();
        expect(document.querySelector('.dk-gong.is-ring')).not.toBeNull();
        tick(DRAAK.cardMs);
        expect(screen.getByRole('button', { name: /Volgende ronde/ })).toBeTruthy();
        expect(document.querySelector('.dk-card-art')).not.toBeNull();
    });

    test('1 speler: the computer flies the orange dragon', () => {
        vi.useFakeTimers();
        render(<Drakenrace meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Cijfers Computer' })).toBeNull();
        tick(15_000);
        expect(du().sides.right.right + du().sides.right.wrong).toBeGreaterThan(0);
    });
});

describe('Drakenrace: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } value = 0; }
        class Node { connect<T>(n: T) { return n; } }
        let made = 0;
        class Ctx {
            state = 'running'; currentTime = 0; sampleRate = 8000; destination = new Node();
            resume() { return Promise.resolve(); }
            createGain() { return Object.assign(new Node(), { gain: new Param() }); }
            createBiquadFilter() { return Object.assign(new Node(), { type: '', frequency: new Param(), Q: new Param() }); }
            createOscillator() { made++; return Object.assign(new Node(), { type: '', frequency: new Param(), start() { }, stop() { } }); }
            createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
            createBufferSource() { made++; return Object.assign(new Node(), { buffer: null, start() { }, stop() { } }); }
        }
        const g = globalThis as unknown as { AudioContext?: unknown };
        g.AudioContext = Ctx;
        localStorage.setItem(SOUND_KEY, '0');
        resetSoundForTests();
        setSoundOn(true);
        expect(DRAAK_SOUNDS).toEqual(expect.arrayContaining(['beat', 'charge', 'lightning', 'zapped', 'stall', 'gong', 'firework']));
        for (const s of DRAAK_SOUNDS) {
            const before = made;
            playDraak(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playDraak('gong');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});
