// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { COURSE } from '../oefenen/spelen/course/course';
import Wildwaterrace from '../oefenen/spelen/skins/wildwaterrace/Wildwaterrace';
import { WILD, WILD_FRONT, WILD_KINDS, WILD_OBSTACLES, WILD_RULE, ridesWave } from '../oefenen/spelen/skins/wildwaterrace/rule';
import { WILD_SOUNDS, playWild, soundOfContact } from '../oefenen/spelen/skins/wildwaterrace/sounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, Side } from '../oefenen/spelen/duel/types';
import { expectRecipesPlay } from './helpers/recipeSounds';

// Wildwaterrace on the shared obstacle course (course/): a clear +1, a crash nothing, the catch-up wave; the six
// river obstacles; a match on the engine; the screen (the obstacle drifts in, a clear, a crash, over the waterfall,
// the card); the sounds.

let from: SpelFrom;
const skin = () => skinById('wildwaterrace')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const du = () => useDuelStore.getState();
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const ctx = (streak: number, mine = 0, theirs = 0): DuelCtx => ({
    side: 'left', other: 'right', me: { ...freshSideView(20), streak, points: mine }, them: { ...freshSideView(20), points: theirs }, streak, level: 'normaal', round: 1, config: { lives: 20 } as DuelConfig,
});
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'makkelijk', lives: 20, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const right = (side: Side) => { act(() => du().answer(side, q(side).answer)); tick(DUEL_TIMING.flashRight); };
const wrong = (side: Side) => { act(() => du().answer(side, String(Number(q(side).answer) + 1))); tick(DUEL_TIMING.flashWrong); };

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Wildwaterrace: the tile', () => {
    test('a 1-2 player duel race on the summer shelf: the levens row is the course, rivier music, a blurb', () => {
        const s = skin();
        expect(s.meta).toMatchObject({ id: 'wildwaterrace', label: 'Wildwaterrace', input: 'keypad', players: '1-2', music: 'rivier', season: 'zomer' });
        expect(s.Screen && !s.Component).toBeTruthy();
        const course = s.meta.options!.find(o => o.id === 'levens')!;
        expect(course.label).toBe('Hoe ver varen?');
        expect(course.default).toBe(String(WILD.course.default));
        expect(course.choices.map(c => c.value)).toEqual(['10', '15', '20', '25', '30']);
        expect(GAME_BLURB.wildwaterrace).toMatch(/hindernis/);
    });
});

describe('Wildwaterrace: the pure rule', () => {
    test('a clear is +1, a crash nothing; 3 in a row of a raft behind surfs a wave (+1 more)', () => {
        expect(WILD_RULE.right!(ctx(1))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(WILD_RULE.right!(ctx(3, 4, 6))).toEqual({ points: { left: 2 }, tag: 'turbo' });
        expect(WILD_RULE.right!(ctx(3, 6, 6))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(WILD_RULE.wrong!(ctx(0, 3))).toEqual({ tag: 'crash' });
        expect([1, 2, 3, 6].map(ridesWave)).toEqual([false, false, true, true]);
        expect(WILD_RULE.cardMs).toBe(WILD.cardMs);
    });

    test('six river obstacles, each with its own move and words; the branch hangs over the raft', () => {
        expect(WILD_KINDS).toHaveLength(6);
        const moves = new Set<string>();
        for (const k of WILD_KINDS) for (const o of ['clear', 'crash'] as const) {
            expect(WILD_OBSTACLES[k][o].call.length, `${k} ${o}`).toBeGreaterThan(2);
            moves.add(`${o}-${WILD_OBSTACLES[k][o].move}`);
        }
        // Rocks and the crocodile are both steered round; every crash is its own.
        expect(moves.size).toBe(11);
        expect(WILD_FRONT).toEqual(['branch']);
        expect(soundOfContact('croc', 'crash')).toBe('chomp');
    });
});

describe('Wildwaterrace: a match on the engine', () => {
    test('clears move on, crashes do not; the first through the course wins the round', () => {
        du().begin({ meta: skin().meta, from, rule: WILD_RULE, config: cfg({ lives: 3 }) });
        right('left'); wrong('left');
        expect(du().sides.left).toMatchObject({ points: 1, wrong: 1 });
        right('left'); right('left');
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Wildwaterrace: the screen', () => {
    const ready = () => { tick(DUEL_TIMING.readyMs + 20); tick(40); };

    test('2 spelers: the obstacles drift in, a clear, a crash, over the waterfall into the lake, the card', () => {
        const { container } = render(<Wildwaterrace meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        // A short course: the levens row starts at 10.
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, lives: 3 } })));
        ready();
        expect(container.querySelectorAll('.ww-raft-at')).toHaveLength(2);
        expect(container.querySelectorAll('[data-kind]').length).toBe(2);
        act(() => du().answer('left', q('left').answer));
        tick(COURSE.rushMs + 50);
        expect(container.querySelector('.ww-raft-at.is-left .ww-move[class*="is-clear-"]')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        tick(COURSE.rushMs + 50);
        expect(container.querySelector('.ww-raft-at.is-right .ww-move[class*="is-crash-"]')).toBeTruthy();
        tick(DUEL_TIMING.flashWrong);
        right('left');
        act(() => du().answer('left', q('left').answer));
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(container.querySelector('.ww-falls')).toBeTruthy();
        tick(2500);
        expect(container.querySelector('.ww-raft-at.is-left.is-over')).toBeTruthy();
        expect(container.querySelector('.ww-raft-at.is-right.is-lost')).toBeTruthy();
        tick(WILD.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.ww-card-art')).toBeTruthy();
    });

    test('1 speler: the computer paddles the orange raft', () => {
        render(<Wildwaterrace meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20, level: 'normaal' });
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
    });
});

describe('Wildwaterrace: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        expect(WILD_SOUNDS).toEqual(expect.arrayContaining(['stroke', 'wave', 'eddy', 'fall', 'splash', 'horn', 'bonk', 'chomp', 'rustle']));
        expectRecipesPlay(WILD_SOUNDS, playWild);
    });
});
