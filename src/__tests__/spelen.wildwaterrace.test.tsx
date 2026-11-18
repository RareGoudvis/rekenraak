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
import Wildwaterrace from '../oefenen/spelen/skins/wildwaterrace/Wildwaterrace';
import { WILD, WILD_RULE, progressOf, pushOf, raceOver, ridesWave } from '../oefenen/spelen/skins/wildwaterrace/rule';
import { WILD_SOUNDS, playWild } from '../oefenen/spelen/skins/wildwaterrace/sounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, Side } from '../oefenen/spelen/duel/types';

// Wildwaterrace on the duel engine: the race rule (a stroke +1, every 3rd in a row a wave +2, a mistake lets the
// current push the raft back 1 and never below the start, the first at the course's end wins), a match on the
// engine, the screen for 1 and 2 spelers (the finish over the waterfall), and the sounds.

let from: SpelFrom;
const skin = () => skinById('wildwaterrace')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const du = () => useDuelStore.getState();
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const view = (points: number, streak = 0) => ({ ...freshSideView(20), points, streak });
const ctx = (streak: number, points = 4): DuelCtx => ({
    side: 'left', other: 'right', me: view(points, streak), them: view(5), streak, level: 'normaal', round: 1, config: { lives: 20 } as DuelConfig,
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

describe('Wildwaterrace: the tile', () => {
    test('a 1-2 player duel race on the summer shelf: the levens row is the course, rivier music, a blurb', () => {
        const s = skin();
        expect(s.meta).toMatchObject({ id: 'wildwaterrace', label: 'Wildwaterrace', input: 'keypad', players: '1-2', music: 'rivier', season: 'zomer' });
        expect(s.Screen && !s.Component).toBeTruthy();
        const course = s.meta.options!.find(o => o.id === 'levens')!;
        expect(course.label).toBe('Hoe ver varen?');
        expect(course.default).toBe(String(WILD.course.default));
        expect(course.choices.map(c => c.value)).toEqual(WILD.course.choices.map(String));
        expect(GAME_BLURB.wildwaterrace).toBeTruthy();
    });
});

describe('Wildwaterrace: the pure rule', () => {
    test('every 3rd right answer in a row rides a wave', () => {
        expect([0, 1, 2, 3, 4, 5, 6, 9].map(ridesWave)).toEqual([false, false, false, true, false, false, true, true]);
    });

    test('the push back is 1, never below the start', () => {
        expect([0, 1, 2, 7].map(pushOf)).toEqual([0, 1, 1, 1]);
    });

    test('a stroke is +1, a wave +2; a mistake pushes back 1 (at the start: only the spin)', () => {
        expect(WILD_RULE.right!(ctx(1))).toEqual({ points: { left: 1 }, tag: 'stroke' });
        expect(WILD_RULE.right!(ctx(3))).toEqual({ points: { left: 2 }, tag: 'wave' });
        expect(WILD_RULE.wrong!(ctx(0, 4))).toEqual({ points: { left: -1 }, tag: 'eddy' });
        expect(WILD_RULE.wrong!(ctx(0, 0))).toEqual({ tag: 'eddy' });
        expect(WILD_RULE.timeout).toBeUndefined();
    });

    test('the first raft at the course (the levens) wins; the place on the course is 0..1', () => {
        const config = { lives: 10 } as DuelConfig;
        expect(raceOver({ sides: { left: view(9), right: view(9) }, config })).toBeNull();
        expect(raceOver({ sides: { left: view(11), right: view(9) }, config })).toBe('left');
        expect(raceOver({ sides: { left: view(3), right: view(10) }, config })).toBe('right');
        expect(progressOf({ points: 5 }, 10)).toBe(0.5);
        expect(progressOf({ points: 11 }, 10)).toBe(1);
    });
});

describe('Wildwaterrace: a match on the engine', () => {
    const begin = (lives = 8) => {
        vi.useFakeTimers();
        du().begin({ meta: meta({ spelers: '2' }), from, rule: WILD_RULE, config: { players: 2, level: 'normaal', lives, bestOf: 3, stream: 'own', readyMs: 0 } });
    };
    const answer = (side: Side, right: boolean) => {
        const q = du().sides[side].question!.answer;
        du().answer(side, right ? q : `${q}9`);
        vi.advanceTimersByTime(right ? DUEL_TIMING.flashRight : DUEL_TIMING.flashWrong);
    };

    test('strokes, the wave on the 3rd in a row, the current after a mistake, the floor at 0', () => {
        begin(20);
        answer('left', false);
        expect(du().sides.left.points).toBe(0);
        answer('left', true);
        answer('left', true);
        expect(du().sides.left.points).toBe(2);
        answer('left', true);
        expect(du().sides.left.points).toBe(4);
        answer('left', false);
        expect(du().sides.left).toMatchObject({ points: 3, streak: 0 });
        expect(du().sides.right.points).toBe(0);
    });

    test('the first at the course wins the round (a wave may carry it past); the card waits for the falls', () => {
        begin(4);
        const wins: string[] = [];
        const off = du().events.on('roundEnd', ({ winner }) => wins.push(String(winner)));
        answer('left', true);
        answer('left', true);
        expect(du().phase).toBe('play');
        du().answer('left', du().sides.left.question!.answer);
        expect(du().sides.left.points).toBe(4);
        expect(du().phase).toBe('roundEnd');
        expect(wins).toEqual(['left']);
        vi.advanceTimersByTime(WILD.cardMs - 1);
        expect(du().card).toBe(false);
        vi.advanceTimersByTime(1);
        expect(du().card).toBe(true);
        off();
    });
});

describe('Wildwaterrace: the screen', () => {
    test('2 spelers: two keypads and rafts, a stroke, a wave with Golf!, an eddy with Woeps!, over the falls, the card', () => {
        vi.useFakeTimers();
        render(<Wildwaterrace meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Blauw' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Oranje' })).toBeTruthy();
        expect(document.querySelectorAll('.ww-raft-at')).toHaveLength(2);
        expect(document.querySelector('.duel-hearts')).toBeNull();
        const right = (side: Side) => { act(() => du().answer(side, du().sides[side].question!.answer)); tick(DUEL_TIMING.flashRight); };
        act(() => du().answer('left', du().sides.left.question!.answer));
        expect(document.querySelector('.ww-raft-at.is-left .ww-move.is-stroke')).not.toBeNull();
        tick(DUEL_TIMING.flashRight);
        right('left');
        expect(screen.getByRole('img', { name: '2 van 3 op rij' })).toBeTruthy();
        act(() => du().answer('left', du().sides.left.question!.answer));
        expect(document.querySelector('.ww-raft-at.is-left .ww-move.is-wave')).not.toBeNull();
        expect(document.querySelector('.ww-surf')).not.toBeNull();
        expect(screen.getByText('Golf!')).toBeTruthy();
        expect(du().sides.left.points).toBe(4);
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('left', '99999'));
        expect(document.querySelector('.ww-raft-at.is-left .ww-move.is-eddy')).not.toBeNull();
        expect(screen.getByText('Woeps!')).toBeTruthy();
        expect(du().sides.left.points).toBe(3);
        tick(DUEL_TIMING.flashWrong);
        while (du().phase === 'play') right('left');
        expect(du().roundWinner).toBe('left');
        tick(100);
        expect(document.querySelector('.ww-raft-at.is-left .ww-over.is-over')).not.toBeNull();
        expect(document.querySelector('.ww-raft-at.is-right .ww-over.is-over')).toBeNull();
        tick(3000);
        expect(document.querySelector('.ww-raft-at.is-right .ww-over.is-over')).not.toBeNull();
        tick(WILD.cardMs);
        expect(screen.getByRole('button', { name: /Volgende ronde/ })).toBeTruthy();
        expect(document.querySelector('.ww-card-art')).not.toBeNull();
    });

    test('1 speler: the computer paddles the orange raft', () => {
        vi.useFakeTimers();
        render(<Wildwaterrace meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Cijfers Computer' })).toBeNull();
        tick(15_000);
        expect(du().sides.right.right + du().sides.right.wrong).toBeGreaterThan(0);
    });
});

describe('Wildwaterrace: its sounds', () => {
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
        expect(WILD_SOUNDS).toEqual(expect.arrayContaining(['stroke', 'wave', 'eddy', 'fall', 'splash', 'horn']));
        for (const s of WILD_SOUNDS) {
            const before = made;
            playWild(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playWild('splash');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});
