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
import { JOUST, JOUST_RULE, baanOf, lanceDown, shareOf, tiltOf, tiltReason } from '../oefenen/spelen/skins/steekspel/rule';
import { LANCE_DEG, MEET_GAP, START, knightX } from '../oefenen/spelen/skins/steekspel/geometry';
import { JOUST_SOUNDS, playJoust } from '../oefenen/spelen/skins/steekspel/sounds';

// Steekspel on the duel engine: the rule (a gallop step per right answer, the lance down after 3 in a row until the
// next mistake, the tilt when the knights meet: more steps, then the lance, else a draw), the list's geometry, its
// sounds, the charge on the engine, the screen with the tilt, the fall into the hay and the draw.

let from: SpelFrom;
const du = () => useDuelStore.getState();
const skin = () => skinById('steekspel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'makkelijk', lives: 20, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const ctx = (streak: number, lance = false): DuelCtx => ({
    side: 'left', other: 'right', me: { ...freshSideView(20), streak, flags: lance ? { lance: 1 } : {} }, them: freshSideView(20), streak, level: 'normaal', round: 1, config: cfg(),
});
const view = (l: number, r: number, lances: [boolean, boolean] = [false, false], baan = 20): DuelRoundView => ({
    sides: {
        left: { ...freshSideView(baan), points: l, flags: lances[0] ? { lance: 1 } : {} },
        right: { ...freshSideView(baan), points: r, flags: lances[1] ? { lance: 1 } : {} },
    },
    config: cfg({ lives: baan }),
});
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

describe('Steekspel: the registry entry', () => {
    test('a duel for 1 or 2 spelers; the levens row is the list length (Hoe lang is de baan?, 20); music kasteel; a blurb', () => {
        const m = skin().meta;
        expect(m).toMatchObject({ id: 'steekspel', label: 'Steekspel', input: 'keypad', timed: false, players: '1-2', music: 'kasteel' });
        expect(MUSIC_IDS).toContain(m.music);
        expect(m.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes']);
        expect(m.options!.find(o => o.id === 'levens')!.label).toBe('Hoe lang is de baan?');
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', levens: '20', rondes: '3' });
        expect(m.sounds!.correct).toBeNull();
        expect(skin().Screen && !skin().Component).toBeTruthy();
        expect(GAME_BLURB.steekspel).toBeTruthy();
    });
});

describe('Steekspel: the rule (pure)', () => {
    test('a right answer is a gallop step; the 3rd in a row lowers the lance, once', () => {
        expect(JOUST_RULE.right!(ctx(1))).toEqual({ points: { left: 1 } });
        expect(JOUST_RULE.right!(ctx(2))).toEqual({ points: { left: 1 } });
        expect(JOUST_RULE.right!(ctx(JOUST.lanceAt))).toEqual({ points: { left: 1 }, flags: { left: { lance: 1 } }, tag: 'lance' });
        expect(JOUST_RULE.right!(ctx(4, true))).toEqual({ points: { left: 1 } });
    });

    test('a mistake lifts a lowered lance (no step back, never below 0); without one it costs only the step', () => {
        expect(JOUST_RULE.wrong!(ctx(0, true))).toEqual({ flags: { left: { lance: 0 } }, tag: 'lanceUp' });
        expect(JOUST_RULE.wrong!(ctx(0))).toEqual({});
        expect(JOUST_RULE.timeout).toBeUndefined();
        expect(shareOf(-2, 20)).toBe(0);
    });

    test('the tilt when the steps add up to the list: more steps wins, a lowered lance wins a tie, else a draw', () => {
        expect(baanOf(cfg({ lives: 15 }))).toBe(15);
        expect(tiltOf(view(10, 9))).toBeNull();
        expect(tiltOf(view(12, 8))).toBe('left');
        expect(tiltOf(view(7, 13, [true, false]))).toBe('right');
        expect(tiltOf(view(10, 10, [false, true]))).toBe('right');
        expect(tiltOf(view(10, 10, [true, false]))).toBe('left');
        expect(tiltOf(view(10, 10, [true, true]))).toBe('draw');
        expect(tiltOf(view(10, 10))).toBe('draw');
        expect(tiltOf(view(5, 5, [false, false], 10))).toBe('draw');
        expect([tiltReason(view(12, 8)), tiltReason(view(10, 10, [true, false])), tiltReason(view(10, 10)), tiltReason(view(3, 3))]).toEqual(['steps', 'lance', 'draw', null]);
        expect(JOUST_RULE.roundOver!(view(9, 9), true)).toBeNull();
        expect(lanceDown({ flags: { lance: 1 } })).toBe(true);
    });

    test('the list: each knight starts at its end; at the tilt the gap between them is the lances\' reach', () => {
        expect(knightX('left', 0, 20)).toBe(START.left);
        expect(knightX('right', 0, 20)).toBe(START.right);
        for (const [l, r] of [[10, 10], [14, 6], [3, 17]]) expect(knightX('right', r, 20) - knightX('left', l, 20)).toBeCloseTo(MEET_GAP);
        expect(knightX('left', 6, 20)).toBeGreaterThan(knightX('left', 5, 20));
        expect(knightX('right', 6, 20)).toBeLessThan(knightX('right', 5, 20));
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
        expect(JOUST_SOUNDS).toEqual(['gallop', 'shing', 'sneeze', 'bonk', 'hay', 'tweet', 'fanfare']);
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

    test('the lance goes down on the 3rd in a row and up on a mistake; the tilt ends the round', () => {
        begin({ lives: 10 });
        right('left'); right('left');
        expect(lanceDown(du().sides.left)).toBe(false);
        right('left');
        expect(lanceDown(du().sides.left)).toBe(true);
        right('left');
        expect(lanceDown(du().sides.left)).toBe(true);
        wrong('left');
        expect(du().sides.left).toMatchObject({ points: 4, streak: 0 });
        expect(lanceDown(du().sides.left)).toBe(false);
        right('right'); right('right'); right('right');
        expect(lanceDown(du().sides.right)).toBe(true);
        expect(du().phase).toBe('play');
        // 4 + 3 = 7 of 10: three more steps for the left knight and they meet, 7 to 3.
        right('left'); right('left'); right('left');
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Steekspel: the screen', () => {
    const ready = () => tick(DUEL_TIMING.readyMs);

    test('2 spelers: gallop, the lance down, a sneeze, the tilt: the loser into the hay, the winner rears, the card', () => {
        const { container } = render(<Steekspel meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        ready();
        expect(container.querySelectorAll('.stk-knight')).toHaveLength(2);
        expect(container.querySelector('.stk-barrier')).toBeTruthy();
        const knight = (side: Side) => container.querySelector(`.stk-knight.is-${side}`) as SVGGElement;
        const start = knight('left').style.transform;
        act(() => du().answer('left', q('left').answer));
        expect(knight('left').style.transform).not.toBe(start);
        expect(knight('left').querySelector('.stk-gallop')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        right('left');
        expect(knight('left').querySelector('.stk-lance.is-down')).toBeNull();
        right('left');
        expect(knight('left').querySelector('.stk-lance.is-down')).toBeTruthy();
        expect(knight('left').querySelector('.stk-gleam')).toBeTruthy();
        expect(screen.getByText('Lans omlaag!')).toBeTruthy();
        expect(container.querySelector('.stk-scene')!.getAttribute('data-lances')).toBe('1,0');
        // Right: a mistake, the horse sneezes.
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        expect(knight('right').querySelector('.stk-sneeze')).toBeTruthy();
        expect(screen.getByText('Hatsjoe!')).toBeTruthy();
        tick(DUEL_TIMING.flashWrong);
        right('right'); right('right');
        // 3 + 2 = 5 of 10: left rides on to 8 and they meet.
        for (let i = 0; i < 4; i++) right('left');
        act(() => du().answer('left', q('left').answer));
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        // Both lances down for the crash, then the crash itself.
        expect((knight('right').querySelector('.stk-lance-arm') as SVGGElement).style.rotate).toBe(`${LANCE_DEG.right.down}deg`);
        expect(container.querySelector('.stk-knight.is-fell')).toBeNull();
        tick(700);
        expect(knight('right').classList.contains('is-fell')).toBe(true);
        expect(knight('left').classList.contains('is-won')).toBe(true);
        expect(knight('right').querySelector('.stk-bale')).toBeTruthy();
        expect(knight('right').querySelector('.stk-stars')).toBeTruthy();
        expect(knight('left').querySelector('.stk-lance.is-broken')).toBeTruthy();
        expect(container.querySelector('.stk-clash')).toBeTruthy();
        expect(screen.getByText('BONK!')).toBeTruthy();
        expect(container.querySelector('.stk-petals')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(JOUST.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.stk-card-art')).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new charge: both back at their ends, lances up, nobody in the hay.
        expect(knight('left').style.transform).toBe(start);
        expect(container.querySelector('.stk-bale')).toBeNull();
        expect(container.querySelector('.stk-lance.is-down')).toBeNull();
    });

    test('a tie with both lances down: both lances break, nobody falls, Gelijk!', () => {
        const { container } = render(<Steekspel meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        ready();
        for (let i = 0; i < 2; i++) { act(() => { du().answer('left', q('left').answer); du().answer('right', q('right').answer); }); tick(DUEL_TIMING.flashRight); }
        act(() => { du().answer('left', String(Number(q('left').answer) + 1)); du().answer('right', String(Number(q('right').answer) + 1)); });
        tick(DUEL_TIMING.flashWrong);
        for (let i = 0; i < 2; i++) { act(() => { du().answer('left', q('left').answer); du().answer('right', q('right').answer); }); tick(DUEL_TIMING.flashRight); }
        expect(du().phase).toBe('play');
        act(() => { du().answer('left', q('left').answer); du().answer('right', q('right').answer); });
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'draw' });
        expect(container.querySelector('.stk-scene')!.getAttribute('data-lances')).toBe('1,1');
        tick(1300);
        expect(container.querySelectorAll('.stk-knight.is-draw')).toHaveLength(2);
        expect(container.querySelector('.stk-knight.is-fell')).toBeNull();
        expect(container.querySelectorAll('.stk-lance.is-broken')).toHaveLength(2);
        expect(screen.getByText('Gelijk!')).toBeTruthy();
    });

    test('1 speler: Jij against the computer', () => {
        render(<Steekspel meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20 });
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
    });
});
