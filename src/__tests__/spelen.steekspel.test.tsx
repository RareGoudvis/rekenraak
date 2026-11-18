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
import Steekspel from '../oefenen/spelen/skins/steekspel/Steekspel';
import { GEAR, JOUST, JOUST_RULE, gearGained, gearOf, tiltOf } from '../oefenen/spelen/skins/steekspel/rule';
import { LANCE_DEG, MEET_GAP, START, knightX } from '../oefenen/spelen/skins/steekspel/geometry';
import { JOUST_SOUNDS, playJoust } from '../oefenen/spelen/skins/steekspel/sounds';

// Steekspel on the duel engine (owner 2026-11-18): a joust is one minute of sums; each right answer is a point that
// shows on the knight (a stamp, the score board, every few a piece of gear); when the minute is up they charge and
// tilt: more right answers wins, the same = both lances break (a draw). The rule, the geometry, the sounds, the
// minute on the engine, the screen with the gear, the last seconds, the charge, the fall into the hay and the draw.

let from: SpelFrom;
const du = () => useDuelStore.getState();
const skin = () => skinById('steekspel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'makkelijk', lives: 10, bestOf: 3, stream: 'own', readyMs: 0, roundSeconds: JOUST.seconds, ...over });
const ctx = (): DuelCtx => ({ side: 'left', other: 'right', me: freshSideView(10), them: freshSideView(10), streak: 1, level: 'normaal', round: 1, config: cfg() });
const view = (l: number, r: number): DuelRoundView => ({
    sides: { left: { ...freshSideView(10), points: l }, right: { ...freshSideView(10), points: r } },
    config: cfg(),
});
const right = (side: Side) => { act(() => du().answer(side, q(side).answer)); tick(DUEL_TIMING.flashRight); };
const wrong = (side: Side) => { act(() => du().answer(side, String(Number(q(side).answer) + 1))); tick(DUEL_TIMING.flashWrong); };
// Both at once, so the minute passes for both alike.
const both = (n: number) => { for (let i = 0; i < n; i++) { act(() => { du().answer('left', q('left').answer); du().answer('right', q('right').answer); }); tick(DUEL_TIMING.flashRight); } };

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

describe('Steekspel: the registry entry', () => {
    test('a duel for 1 or 2 spelers without a levens row (a joust is a minute); music kasteel; a blurb', () => {
        const m = skin().meta;
        expect(m).toMatchObject({ id: 'steekspel', label: 'Steekspel', input: 'keypad', timed: false, players: '1-2', music: 'kasteel' });
        expect(MUSIC_IDS).toContain(m.music);
        expect(m.options!.map(o => o.id)).toEqual(['spelers', 'niveau', 'rondes']);
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', rondes: '3' });
        expect(m.sounds!.correct).toBeNull();
        expect(skin().Screen && !skin().Component).toBeTruthy();
        expect(GAME_BLURB.steekspel).toBeTruthy();
    });
});

describe('Steekspel: the rule (pure)', () => {
    test('a right answer is a point; a mistake costs only the flash', () => {
        expect(JOUST_RULE.right!(ctx())).toEqual({ points: { left: 1 } });
        expect(JOUST_RULE.wrong).toBeUndefined();
        expect(JOUST_RULE.timeout).toBeUndefined();
        expect(JOUST.seconds).toBe(60);
    });

    test('the gear comes with the right answers, one piece at a time, in order', () => {
        expect([0, 1, 2, 3, 4, 6, 9, 12, 30].map(gearOf)).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 5]);
        expect(JOUST.gearAt.map(gearGained)).toEqual([...GEAR]);
        expect(gearGained(3)).toBeNull();
        expect(gearGained(13)).toBeNull();
    });

    test('the tilt only when the minute is up: more right answers wins, the same is a draw', () => {
        expect(tiltOf(view(12, 3), false)).toBeNull();
        expect(tiltOf(view(12, 8), true)).toBe('left');
        expect(tiltOf(view(7, 13), true)).toBe('right');
        expect(tiltOf(view(9, 9), true)).toBe('draw');
        expect(tiltOf(view(0, 0), true)).toBe('draw');
    });

    test('the list: each knight waits at its end; at the charge the gap between them is the lances\' reach', () => {
        expect(knightX('left', false)).toBe(START.left);
        expect(knightX('right', false)).toBe(START.right);
        expect(knightX('right', true) - knightX('left', true)).toBeCloseTo(MEET_GAP);
    });
});

describe('Steekspel: its sounds', () => {
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
        expect(JOUST_SOUNDS).toEqual(['stamp', 'charge', 'shing', 'sneeze', 'bonk', 'hay', 'tweet', 'fanfare']);
        for (const s of JOUST_SOUNDS) {
            const before = made;
            playJoust(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playJoust('bonk');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});

describe('Steekspel: on the engine', () => {
    const begin = (over: Partial<DuelConfig> = {}) => du().begin({ meta: skin().meta, from, rule: JOUST_RULE, config: cfg(over) });

    test('the round runs the whole minute, however far one side is ahead; then the most right answers wins', () => {
        begin();
        for (let i = 0; i < 14; i++) right('left');
        right('right'); wrong('right');
        expect(du().phase).toBe('play');
        expect(du().sides.left.points).toBe(14);
        tick(JOUST.seconds * 1000);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Steekspel: the screen', () => {
    const ready = () => tick(DUEL_TIMING.readyMs);
    const knight = (c: HTMLElement, side: Side) => c.querySelector(`.stk-knight.is-${side}`) as SVGGElement;
    const board = (c: HTMLElement, side: Side) => c.querySelector(`.stk-board.is-${side} .stk-board-num`)!.textContent;

    test('2 spelers: a right answer stamps and counts, gear comes, a sneeze; the last seconds; the charge and the tilt', () => {
        const { container } = render(<Steekspel meta={meta({ spelers: '2', niveau: 'makkelijk' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config.roundSeconds).toBe(JOUST.seconds);
        expect(container.querySelectorAll('.stk-knight')).toHaveLength(2);
        expect(container.querySelector('.stk-barrier')).toBeTruthy();
        const start = knight(container, 'left').style.transform;
        act(() => du().answer('left', q('left').answer));
        // The knight stays at its end: the horse stamps, the board counts, a +1.
        expect(knight(container, 'left').style.transform).toBe(start);
        expect(knight(container, 'left').querySelector('.stk-stamp')).toBeTruthy();
        expect(board(container, 'left')).toBe('1');
        expect(screen.getByText('+1')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        right('left');
        expect(knight(container, 'left').getAttribute('data-gear')).toBe('1');
        expect(knight(container, 'left').querySelector('.stk-plume-big')).toBeTruthy();
        expect(knight(container, 'left').querySelector('.stk-sparkle')).toBeTruthy();
        expect(screen.getByText('Een pluim!')).toBeTruthy();
        right('left'); right('left');
        expect(knight(container, 'left').querySelector('.stk-lance.is-shiny')).toBeTruthy();
        right('left'); right('left');
        expect(knight(container, 'left').querySelector('.stk-chanfron')).toBeTruthy();
        // Lances up through the minute.
        expect((knight(container, 'left').querySelector('.stk-lance-arm') as SVGGElement).style.rotate).toBe(`${LANCE_DEG.left.up}deg`);
        // Right: a mistake, the horse sneezes; then two right.
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        expect(knight(container, 'right').querySelector('.stk-sneeze')).toBeTruthy();
        expect(screen.getByText('Hatsjoe!')).toBeTruthy();
        tick(DUEL_TIMING.flashWrong);
        right('right'); right('right');
        expect(board(container, 'right')).toBe('2');
        expect(container.querySelector('.stk-glass.is-run')).toBeTruthy();
        // The last seconds: lances down, the horses paw.
        const spent = 6 * DUEL_TIMING.flashRight + DUEL_TIMING.flashWrong + 2 * DUEL_TIMING.flashRight;
        tick(JOUST.seconds * 1000 - spent - (JOUST.readySeconds * 1000) / 2);
        expect(du().phase).toBe('play');
        expect(container.querySelectorAll('.stk-knight.is-ready')).toHaveLength(2);
        expect((knight(container, 'right').querySelector('.stk-lance-arm') as SVGGElement).style.rotate).toBe(`${LANCE_DEG.right.down}deg`);
        expect(container.querySelector('.stk-glass.is-low')).toBeTruthy();
        tick((JOUST.readySeconds * 1000) / 2 + 50);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        // The charge: both gallop to the middle, nobody fell yet.
        expect(container.querySelectorAll('.stk-knight.is-charging')).toHaveLength(2);
        expect(knight(container, 'left').style.transform).not.toBe(start);
        expect(screen.getByText('Daar gaan ze!')).toBeTruthy();
        expect(container.querySelector('.stk-knight.is-fell')).toBeNull();
        tick(1500);
        expect(knight(container, 'right').classList.contains('is-fell')).toBe(true);
        expect(knight(container, 'left').classList.contains('is-won')).toBe(true);
        expect(knight(container, 'right').querySelector('.stk-bale')).toBeTruthy();
        expect(knight(container, 'right').querySelector('.stk-stars')).toBeTruthy();
        expect(knight(container, 'left').querySelector('.stk-lance.is-broken')).toBeTruthy();
        expect(container.querySelector('.stk-clash')).toBeTruthy();
        expect(screen.getByText('BONK!')).toBeTruthy();
        expect(container.querySelector('.stk-petals')).toBeTruthy();
        tick(600);
        expect(screen.getByText('6 tegen 2!')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(JOUST.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.stk-card-art')).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new joust: both back at their ends, no gear, boards at 0, nobody in the hay.
        expect(knight(container, 'left').style.transform).toBe(start);
        expect(knight(container, 'left').getAttribute('data-gear')).toBe('0');
        expect(board(container, 'left')).toBe('0');
        expect(container.querySelector('.stk-bale')).toBeNull();
        expect(container.querySelector('.stk-knight.is-ready')).toBeNull();
    });

    test('the same number right: both lances break, nobody falls, Gelijk!', () => {
        const { container } = render(<Steekspel meta={meta({ spelers: '2', niveau: 'makkelijk' })} from={from} onExit={() => { }} />);
        ready();
        both(4);
        tick(JOUST.seconds * 1000 - 4 * DUEL_TIMING.flashRight);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'draw' });
        tick(2200);
        expect(container.querySelectorAll('.stk-knight.is-draw')).toHaveLength(2);
        expect(container.querySelector('.stk-knight.is-fell')).toBeNull();
        expect(container.querySelectorAll('.stk-lance.is-broken')).toHaveLength(2);
        expect(screen.getByText('Gelijk!')).toBeTruthy();
    });

    test('1 speler: Jij against the computer, which answers through the minute', () => {
        const { container } = render(<Steekspel meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } }));
        ready();
        expect(du().config).toMatchObject({ players: 1, roundSeconds: JOUST.seconds });
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        tick(20_000);
        expect(Number(board(container, 'right'))).toBeGreaterThan(0);
    });
});
