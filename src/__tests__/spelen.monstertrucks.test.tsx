// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import { MUSIC_IDS } from '../oefenen/spelen/music';
import { expectRecipesPlay } from './helpers/recipeSounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, Side } from '../oefenen/spelen/duel/types';
import { COURSE } from '../oefenen/spelen/course/course';
import Monstertrucks from '../oefenen/spelen/skins/monstertrucks/Monstertrucks';
import { TRUCK, TRUCK_FRONT, TRUCK_KINDS, TRUCK_OBSTACLES, TRUCK_RULE, finishOf, turboNow } from '../oefenen/spelen/skins/monstertrucks/rule';
import { TRUCK_SOUNDS, playTruck, soundOfContact } from '../oefenen/spelen/skins/monstertrucks/sounds';

// Monstertrucks on the shared obstacle course (course/): the rule (a clear +1, a crash nothing, the catch-up turbo,
// the first through the course wins), the six obstacles, its sounds, the race on the engine, and the screen: the
// obstacle rolls in, an answer rushes the truck into it (a jump, a crash), the finish arch, the donut and the card.

let from: SpelFrom;
const du = () => useDuelStore.getState();
const skin = () => skinById('monstertrucks')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'makkelijk', lives: 20, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const ctx = (streak: number, mine = 0, theirs = 0): DuelCtx => ({ side: 'left', other: 'right', me: { ...freshSideView(20), streak, points: mine }, them: { ...freshSideView(20), points: theirs }, streak, level: 'normaal', round: 1, config: cfg() });
const right = (side: Side) => { act(() => du().answer(side, q(side).answer)); tick(DUEL_TIMING.flashRight); };
const wrong = (side: Side) => { act(() => du().answer(side, String(Number(q(side).answer) + 1))); tick(DUEL_TIMING.flashWrong); };

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Monstertrucks: the registry entry', () => {
    test('a duel for 1 or 2 spelers; the levens row is the course (Hoe ver rijden?, 20); own sounds; a blurb', () => {
        const m = skin().meta;
        expect(m).toMatchObject({ id: 'monstertrucks', label: 'Monstertrucks', input: 'keypad', timed: false, players: '1-2', music: 'race' });
        expect(MUSIC_IDS).toContain(m.music);
        expect(m.accepts.kinds).toEqual(['number']);
        expect(m.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes']);
        const levens = m.options!.find(o => o.id === 'levens')!;
        expect(levens.label).toBe('Hoe ver rijden?');
        expect(levens.choices.map(c => c.value)).toEqual(['10', '15', '20', '25', '30']);
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', levens: '20', rondes: '3' });
        expect(m.sounds!.correct).toBeNull();
        expect(skin().Screen && !skin().Component).toBeTruthy();
        expect(GAME_BLURB.monstertrucks).toMatch(/hindernis/i);
    });
});

describe('Monstertrucks: the rule and the obstacles (pure)', () => {
    test('a clear is +1; a crash (wrong or too late) nothing; 3 in a row of a truck behind is a turbo (+1 more)', () => {
        expect(TRUCK_RULE.right!(ctx(1))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(TRUCK_RULE.right!(ctx(3, 5, 5))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(TRUCK_RULE.right!(ctx(3, 4, 6))).toEqual({ points: { left: 2 }, tag: 'turbo' });
        expect(TRUCK_RULE.wrong!(ctx(0))).toEqual({ tag: 'crash' });
        expect(TRUCK_RULE.timeout!(ctx(0))).toEqual({ tag: 'crash' });
        expect([1, 2, 3, 6].map(turboNow)).toEqual([false, false, true, true]);
        expect(finishOf(cfg({ lives: 25 }))).toBe(25);
        expect(TRUCK_RULE.cardMs).toBe(TRUCK.cardMs);
    });

    test('six obstacles, each with its own move and word for a clear and a crash; the crusher and the mud draw over the truck', () => {
        expect(TRUCK_KINDS).toHaveLength(6);
        const moves = new Set<string>();
        for (const k of TRUCK_KINDS) {
            for (const o of ['clear', 'crash'] as const) {
                expect(TRUCK_OBSTACLES[k][o].call.length, `${k} ${o}`).toBeGreaterThan(2);
                moves.add(`${o}-${TRUCK_OBSTACLES[k][o].move}`);
            }
        }
        expect(moves.size).toBe(12);
        expect(TRUCK_FRONT).toEqual(['crusher', 'mud']);
        expect(soundOfContact('cars', 'clear')).toBe('crunch');
        expect(soundOfContact('tyres', 'clear')).toBeNull();
    });
});

describe('Monstertrucks: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        expect(TRUCK_SOUNDS).toEqual(['rev', 'boost', 'crunch', 'oops', 'horn', 'screech', 'turbo', 'splat', 'boing', 'clang', 'whoosh']);
        expectRecipesPlay(TRUCK_SOUNDS, playTruck);
    });
});

describe('Monstertrucks: on the engine', () => {
    const begin = (over: Partial<DuelConfig> = {}) => du().begin({ meta: skin().meta, from, rule: TRUCK_RULE, config: cfg(over) });

    test('clears count, crashes do not; a time-out is a crash; the first through the course wins the round', () => {
        begin({ lives: 4, level: 'normaal' });
        right('left'); right('left');
        expect(du().sides.left.points).toBe(2);
        wrong('left');
        expect(du().sides.left).toMatchObject({ points: 2, streak: 0, wrong: 1 });
        // The obstacle arrives before an answer: a crash, no point.
        act(() => { vi.advanceTimersByTime(12_000); });
        expect(du().sides.right).toMatchObject({ points: 0, wrong: 1 });
        tick(DUEL_TIMING.flashWrong);
        right('left'); right('left');
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Monstertrucks: the screen', () => {
    const ready = () => { tick(DUEL_TIMING.readyMs + 20); tick(40); };
    const truckMove = (c: HTMLElement, side: Side) => c.querySelector(`.mtk-truck.is-${side}`)!.getAttribute('data-move');

    test('2 spelers: the obstacle rolls in, a right answer jumps it, a wrong one crashes, the finish arch, the donut and the card', () => {
        const { container } = render(<Monstertrucks meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        ready();
        expect(container.querySelectorAll('.mtk-truck')).toHaveLength(2);
        expect(container.querySelectorAll('.mtk-fan').length).toBeGreaterThan(50);
        expect(container.querySelector('.crs-bar')).toBeTruthy();
        // Each lane has its first obstacle, placed by the frame loop.
        const first = container.querySelector('[data-kind]') as SVGGElement;
        expect(first.getAttribute('visibility')).toBe('visible');
        const x0 = Number(/translate\(([-\d.]+)/.exec(first.getAttribute('transform')!)![1]);
        tick(1000);
        const x1 = Number(/translate\(([-\d.]+)/.exec(first.getAttribute('transform')!)![1]);
        expect(x1).toBeLessThan(x0);

        act(() => du().answer('left', q('left').answer));
        expect(truckMove(container, 'left')).toBe('');
        tick(COURSE.rushMs + 50);
        expect(truckMove(container, 'left')).toMatch(/^clear-/);
        expect(container.querySelector('.mtk-call.is-clear')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);

        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        tick(COURSE.rushMs + 50);
        expect(truckMove(container, 'right')).toMatch(/^crash-/);
        expect(container.querySelector('.mtk-truck.is-right .mtk-stars')).toBeTruthy();
        expect(du().sides.right.points).toBe(0);
        tick(DUEL_TIMING.flashWrong + 1500);

        // Left on to the finish (1 + 9): the arch appears ahead, the truck bursts through, the donut, then the card.
        for (let i = 0; i < 9; i++) { act(() => du().answer('left', q('left').answer)); tick(i < 8 ? DUEL_TIMING.flashRight + 200 : 50); }
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(container.querySelector('.mtk-finish')).toBeTruthy();
        tick(2000);
        expect(container.querySelector('.mtk-finish.is-torn')).toBeTruthy();
        expect(container.querySelector('.mtk-truck.is-left.is-donut')).toBeTruthy();
        expect(container.querySelector('.mtk-truck.is-right.is-tired')).toBeTruthy();
        expect(container.querySelector('.mtk-confetti')).toBeTruthy();
        tick(TRUCK.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.mtk-card-art')).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new race: no finish, no confetti, a fresh first obstacle.
        expect(container.querySelector('.mtk-finish')).toBeNull();
        expect(container.querySelector('.mtk-confetti')).toBeNull();
        expect(truckMove(container, 'left')).toBe('');
    });

    test('Makkelijk: no clock, the truck waits in front of the obstacle; 1 speler: Jij against the computer', () => {
        const { container } = render(<Monstertrucks meta={meta({ spelers: '1', niveau: 'makkelijk' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20, level: 'makkelijk' });
        expect(screen.getAllByText('Jij').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.duel-ring')).toHaveLength(0);
        useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.99 } }));
        tick(6000);
        expect(container.querySelector('.mtk-truck.is-left.is-waiting')).toBeTruthy();
        expect(du().sides.left.wrong).toBe(0);
    });

    test('1 speler on Normaal: the clock ring', () => {
        render(<Monstertrucks meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20, level: 'normaal' });
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.duel-ring').length).toBeGreaterThan(0);
    });
});
