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
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../oefenen/spelen/sound';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, DuelRoundView, Side } from '../oefenen/spelen/duel/types';
import Monstertrucks from '../oefenen/spelen/skins/monstertrucks/Monstertrucks';
import { TRUCK, TRUCK_RULE, finishOf, jumpsNow, progressOf, raceRoundOver, rampAhead } from '../oefenen/spelen/skins/monstertrucks/rule';
import { CAR, FINISH_X, RAMP, START_X, jumpLen, rowOf, truckX } from '../oefenen/spelen/skins/monstertrucks/geometry';
import { TRUCK_SOUNDS, playTruck } from '../oefenen/spelen/skins/monstertrucks/sounds';

// Monstertrucks on the duel engine: the rule (gas +1, every 3rd right in a row a ramp jump +3, a wheelie on a
// mistake, the first truck at the finish wins), the lane geometry, its sounds, the race on the engine, the screen.

let from: SpelFrom;
const du = () => useDuelStore.getState();
const skin = () => skinById('monstertrucks')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'makkelijk', lives: 20, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const ctx = (streak: number): DuelCtx => ({ side: 'left', other: 'right', me: { ...freshSideView(20), streak }, them: freshSideView(20), streak, level: 'normaal', round: 1, config: cfg() });
const view = (l: number, r: number, finish = 20): DuelRoundView => ({ sides: { left: { ...freshSideView(finish), points: l }, right: { ...freshSideView(finish), points: r } }, config: cfg({ lives: finish }) });
const right = (side: Side) => { act(() => du().answer(side, q(side).answer)); tick(DUEL_TIMING.flashRight); };
const wrong = (side: Side) => { act(() => du().answer(side, String(Number(q(side).answer) + 1))); tick(DUEL_TIMING.flashWrong); };

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Monstertrucks: the registry entry', () => {
    test('a duel for 1 or 2 spelers; the levens row is the race length (Hoe ver rijden?, 20); own sounds; a blurb', () => {
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
        expect(GAME_BLURB.monstertrucks).toBeTruthy();
    });
});

describe('Monstertrucks: the rule (pure)', () => {
    test('a right answer is gas (+1); every 3rd in a row a ramp jump (+1 and the bonus); the ramp shows one answer before', () => {
        expect(TRUCK_RULE.right!(ctx(1))).toEqual({ points: { left: 1 }, tag: 'gas' });
        expect(TRUCK_RULE.right!(ctx(2))).toEqual({ points: { left: 1 }, tag: 'gas' });
        expect(TRUCK_RULE.right!(ctx(3))).toEqual({ points: { left: 1 + TRUCK.jumpBonus }, tag: 'jump' });
        expect(TRUCK_RULE.right!(ctx(6)).tag).toBe('jump');
        expect([1, 2, 3, 4, 5, 6].map(jumpsNow)).toEqual([false, false, true, false, false, true]);
        expect([0, 1, 2, 3, 4, 5].map(rampAhead)).toEqual([false, false, true, false, false, true]);
    });

    test('a mistake is only a wheelie: no rule hook, so no points and never below 0', () => {
        expect(TRUCK_RULE.wrong).toBeUndefined();
        expect(TRUCK_RULE.timeout).toBeUndefined();
        expect(progressOf(-3, 20)).toBe(0);
    });

    test('the first truck at the finish wins; nothing else ends the race', () => {
        expect(finishOf(cfg({ lives: 25 }))).toBe(25);
        expect(raceRoundOver(view(19, 18))).toBeNull();
        expect(raceRoundOver(view(20, 18))).toBe('left');
        expect(raceRoundOver(view(4, 22))).toBe('right');
        expect(raceRoundOver(view(10, 9, 10))).toBe('left');
        expect(TRUCK_RULE.roundOver!(view(19, 3), true)).toBeNull();
        expect(TRUCK_RULE.cardMs).toBe(TRUCK.cardMs);
    });

    test('the lanes: the bumper glides from the start to the line and stops there; the cars fit under one jump', () => {
        expect(truckX(0, 20)).toBe(START_X);
        expect(truckX(20, 20)).toBe(FINISH_X);
        expect(truckX(26, 20)).toBe(FINISH_X);
        expect(truckX(10, 20)).toBeCloseTo((START_X + FINISH_X) / 2);
        for (const finish of TRUCK.finish.choices) {
            const row = rowOf(finish);
            expect(row.cars.length, `${finish}`).toBeGreaterThanOrEqual(1);
            expect(row.cars.length).toBeLessThanOrEqual(CAR.max);
            // The first car starts after the ramp; the row ends about where the jump lands.
            expect(row.cars[0]).toBeGreaterThanOrEqual(row.ramp + RAMP.len);
            if (row.cars.length > 1) expect(row.cars.at(-1)! + CAR.len).toBeLessThanOrEqual(jumpLen(finish) + CAR.len / 2);
        }
        expect(rowOf(20).cars).toHaveLength(2);
    });
});

describe('Monstertrucks: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } linearRampToValueAtTime() { } value = 0; }
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
        expect(TRUCK_SOUNDS).toEqual(['rev', 'boost', 'crunch', 'wheelie', 'horn', 'screech', 'ramp']);
        for (const s of TRUCK_SOUNDS) {
            const before = made;
            playTruck(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playTruck('crunch');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});

describe('Monstertrucks: on the engine', () => {
    const begin = (over: Partial<DuelConfig> = {}) => du().begin({ meta: skin().meta, from, rule: TRUCK_RULE, config: cfg(over) });

    test('gas, a jump on the 3rd in a row, a wheelie that breaks the streak but keeps the points, the finish ends the round', () => {
        begin({ lives: 10 });
        right('left'); right('left');
        expect(du().sides.left.points).toBe(2);
        right('left');
        expect(du().sides.left.points).toBe(5);
        wrong('left');
        expect(du().sides.left).toMatchObject({ points: 5, streak: 0 });
        wrong('right');
        expect(du().sides.right.points).toBe(0);
        right('left'); right('left'); right('left');
        expect(du().sides.left.points).toBe(10);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Monstertrucks: the screen', () => {
    const ready = () => tick(DUEL_TIMING.readyMs);

    test('2 spelers: gas rolls the truck, the ramp waits after 2, the jump flattens the cars, a wheelie, the donut and the card', () => {
        const { container } = render(<Monstertrucks meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        ready();
        expect(container.querySelectorAll('.mtk-truck')).toHaveLength(2);
        expect(container.querySelectorAll('.mtk-fan').length).toBeGreaterThan(50);
        const bumper = (side: Side) => (container.querySelector(`.mtk-truck.is-${side}`) as SVGGElement).style.transform;
        const start = bumper('left');
        right('left');
        expect(bumper('left')).not.toBe(start);
        expect(container.querySelector('.mtk-truck.is-left .mtk-spin.is-rolling')).toBeTruthy();
        expect(container.querySelector('.mtk-row')).toBeNull();
        right('left');
        // Two in a row: the ramp and the junk cars wait in front of the truck.
        expect(container.querySelector('.mtk-row.is-waiting[data-side="left"]')).toBeTruthy();
        expect(container.querySelectorAll('.mtk-row.is-waiting .mtk-car')).toHaveLength(rowOf(10).cars.length);
        act(() => du().answer('left', q('left').answer));
        expect(container.querySelector('.mtk-truck.is-left .mtk-hop')).toBeTruthy();
        expect(container.querySelector('.mtk-truck.is-left .mtk-flames')).toBeTruthy();
        expect(screen.getByText('Sprong!')).toBeTruthy();
        expect(container.querySelector('.mtk-row.is-flat')).toBeNull();
        tick(600);
        expect(container.querySelector('.mtk-row.is-flat[data-side="left"]')).toBeTruthy();
        expect(container.querySelector('.mtk-crowd[class*="is-cheer"]')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        // Right: two in a row, then a mistake: a wheelie, and its waiting ramp rolls away.
        right('right'); right('right');
        expect(container.querySelector('.mtk-row.is-waiting[data-side="right"]')).toBeTruthy();
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        expect(container.querySelector('.mtk-truck.is-right .mtk-wheelie')).toBeTruthy();
        expect(screen.getByText('Wheelie!')).toBeTruthy();
        expect(container.querySelector('.mtk-row.is-waiting[data-side="right"]')).toBeNull();
        expect(container.querySelector('.mtk-row.is-leaving[data-side="right"]')).toBeTruthy();
        expect(du().sides.right.points).toBe(2);
        tick(DUEL_TIMING.flashWrong);
        // Left to the finish (5 + 1 + 1 + 3 = 10): the donut, the confetti, Finish!, then the card.
        right('left'); right('left');
        act(() => du().answer('left', q('left').answer));
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(container.querySelector('.mtk-truck.is-left.is-donut')).toBeTruthy();
        expect(container.querySelector('.mtk-truck.is-right.is-tired')).toBeTruthy();
        expect(container.querySelector('.mtk-confetti')).toBeTruthy();
        expect(screen.getByText('Finish!')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(TRUCK.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.mtk-card-art')).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new race: both at the start, no ramps, no confetti.
        expect(bumper('left')).toBe(start);
        expect(container.querySelector('.mtk-row')).toBeNull();
        expect(container.querySelector('.mtk-confetti')).toBeNull();
    });

    test('1 speler: Jij against the computer, the clock ring on Normaal', () => {
        render(<Monstertrucks meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20, level: 'normaal' });
        expect(screen.getAllByText('Jij').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('.duel-ring').length).toBeGreaterThan(0);
    });
});
