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
import Drakenrace from '../oefenen/spelen/skins/drakenrace/Drakenrace';
import { DRAAK, DRAAK_KINDS, DRAAK_OBSTACLES, DRAAK_RULE, callsStorm, isStorm, knockOf, stormFlagOf } from '../oefenen/spelen/skins/drakenrace/rule';
import { DRAAK_SOUNDS, playDraak, soundOfContact } from '../oefenen/spelen/skins/drakenrace/sounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, DuelFlags, Side } from '../oefenen/spelen/duel/types';
import { expectRecipesPlay } from './helpers/recipeSounds';

// Drakenrace on the shared obstacle course (course/): a clear +1, a crash nothing; on 3 in a row the storm blows into
// the other lane when that dragon is level or ahead (crashing into it knocks it back 1, never below the start); the
// catch-up tailwind; the six obstacles; a match on the engine; the screen for 1 and 2 spelers; the sounds.

let from: SpelFrom;
const skin = () => skinById('drakenrace')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const du = () => useDuelStore.getState();
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const view = (points: number, streak = 0, right = 0, wrong = 0, storm = 0) => ({ ...freshSideView(20), points, streak, right, wrong, flags: (storm ? { storm } : {}) as DuelFlags });
const ctx = (me: ReturnType<typeof view>, them: ReturnType<typeof view>): DuelCtx => ({
    side: 'left', other: 'right', me, them, streak: me.streak, level: 'normaal', round: 1, config: { lives: 20 } as DuelConfig,
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

describe('Drakenrace: the tile', () => {
    test('a 1-2 player duel race: the levens row is the course, kasteel music, a blurb', () => {
        const s = skin();
        expect(s.meta).toMatchObject({ id: 'drakenrace', label: 'Drakenrace', input: 'keypad', players: '1-2', music: 'kasteel' });
        expect(s.Screen && !s.Component).toBeTruthy();
        const course = s.meta.options!.find(o => o.id === 'levens')!;
        expect(course.label).toBe('Hoe ver vliegen?');
        expect(course.default).toBe(String(DRAAK.course.default));
        expect(course.choices.map(c => c.value)).toEqual(['10', '15', '20', '25', '30']);
        expect(GAME_BLURB.drakenrace).toMatch(/hindernis/);
    });
});

describe('Drakenrace: the pure rule', () => {
    test('a clear is +1; the 3rd in a row sends the storm to a rival that is level or ahead, marking its obstacle now', () => {
        expect(DRAAK_RULE.right!(ctx(view(4, 1, 1), view(5)))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect([1, 2, 3, 4, 6].map(callsStorm)).toEqual([false, false, true, false, true]);
        // The rival has answered 7 sums: its obstacle now (or next) is index 7, the flag says 8.
        expect(DRAAK_RULE.right!(ctx(view(5, 3, 3), view(5, 0, 5, 2)))).toEqual({ flags: { right: { storm: 8 } }, points: { left: 1 }, tag: 'storm' });
        expect(stormFlagOf({ right: 5, wrong: 2 })).toBe(8);
        // A rival behind is spared; a dragon behind gets the tailwind instead (+1 more).
        expect(DRAAK_RULE.right!(ctx(view(6, 3, 3), view(5)))).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(DRAAK_RULE.right!(ctx(view(3, 3, 3), view(5)))).toMatchObject({ points: { left: 2 }, flags: { right: { storm: 1 } } });
    });

    test('a crash is nothing, unless it is the storm: then it knocks the dragon back 1, never below the start', () => {
        // The crash hook sees the answer counted: 4 right + 4 wrong = the obstacle at index 7 was just hit.
        expect(DRAAK_RULE.wrong!(ctx(view(4, 0, 4, 4), view(5)))).toEqual({ tag: 'crash' });
        expect(DRAAK_RULE.wrong!(ctx(view(4, 0, 4, 4, 8), view(5)))).toEqual({ points: { left: -1 }, tag: 'stormhit' });
        expect(DRAAK_RULE.timeout!(ctx(view(0, 0, 0, 1, 1), view(5)))).toEqual({ tag: 'stormhit' });
        expect(isStorm(view(0, 0, 0, 0, 3), 2)).toBe(true);
        expect(isStorm(view(0, 0, 0, 0, 3), 3)).toBe(false);
        expect([0, 1, 5].map(knockOf)).toEqual([0, 1, 1]);
    });

    test('six obstacles and the storm, each with its own words for a clear and a crash', () => {
        expect(DRAAK_KINDS).toHaveLength(6);
        for (const k of [...DRAAK_KINDS, 'storm' as const]) for (const o of ['clear', 'crash'] as const) expect(DRAAK_OBSTACLES[k][o].call.length, `${k} ${o}`).toBeGreaterThan(2);
        expect(soundOfContact('storm', 'crash')).toBe('lightning');
    });
});

describe('Drakenrace: a match on the engine', () => {
    const begin = (over: Partial<DuelConfig> = {}) => du().begin({ meta: skin().meta, from, rule: DRAAK_RULE, config: cfg(over) });

    test('clears move on, crashes do not; the storm lands in the rival\'s lane and a crash into it knocks back', () => {
        begin({ lives: 20 });
        right('right'); right('right');
        right('left'); right('left');
        // Left's 3rd in a row: right is level (2 = 2), so its obstacle now (index 2) becomes the storm.
        right('left');
        expect(du().sides.right.flags.storm).toBe(3);
        expect(du().sides.left.points).toBe(3);
        wrong('right');
        expect(du().sides.right.points).toBe(1);
        // The next obstacle is a plain one again: a crash there costs nothing.
        wrong('right');
        expect(du().sides.right.points).toBe(1);
    });

    test('the first through the course wins the round', () => {
        begin({ lives: 3 });
        right('left'); right('left'); right('left');
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Drakenrace: the screen', () => {
    const ready = () => { tick(DUEL_TIMING.readyMs + 20); tick(40); };

    test('2 spelers: the obstacles fly in, a clear with fire, a crash, the storm in the other lane, the gong and the card', () => {
        const { container } = render(<Drakenrace meta={meta({ spelers: '2', levens: '10' })} from={from} onExit={() => { }} />);
        // A short course: the levens row starts at 10.
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, lives: 5 } })));
        ready();
        expect(container.querySelectorAll('.dk-dragon-at')).toHaveLength(2);
        expect(container.querySelectorAll('[data-kind]').length).toBe(2);
        expect(container.querySelector('.crs-bar')).toBeTruthy();
        act(() => du().answer('left', q('left').answer));
        tick(COURSE.rushMs + 50);
        expect(container.querySelector('.dk-dragon-at.is-left .dk-move[class*="is-clear-"]')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        tick(COURSE.rushMs + 50);
        expect(container.querySelector('.dk-dragon-at.is-right .dk-move[class*="is-crash-"]')).toBeTruthy();
        tick(DUEL_TIMING.flashWrong);
        // Two more in a row for left: right is behind (0 against 2), so it is spared the storm.
        right('left'); right('left');
        expect(container.querySelector('[data-kind="storm"]')).toBeNull();
        // Left on to the finish: the gong comes, the dragon rings it, the card.
        right('left');
        act(() => du().answer('left', q('left').answer));
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        tick(2400);
        expect(container.querySelector('.dk-gong.is-ring')).toBeTruthy();
        expect(container.querySelector('.dk-dragon-at.is-left.is-won')).toBeTruthy();
        tick(DRAAK.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(card.querySelector('.dk-card-art')).toBeTruthy();
    });

    test('the storm a dragon sends shows up in the other lane', () => {
        const { container } = render(<Drakenrace meta={meta({ spelers: '2' })} from={from} onExit={() => { }} />);
        ready();
        right('right'); right('right');
        right('left'); right('left');
        act(() => du().answer('left', q('left').answer));
        tick(60);
        expect(du().sides.right.flags.storm).toBe(3);
        expect(container.querySelector('[data-kind="storm"]')).toBeTruthy();
        expect(screen.getByText('Storm!')).toBeTruthy();
    });

    test('1 speler: the computer flies the orange dragon', () => {
        render(<Drakenrace meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config).toMatchObject({ players: 1, lives: 20, level: 'normaal' });
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
    });
});

describe('Drakenrace: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        expect(DRAAK_SOUNDS).toEqual(expect.arrayContaining(['beat', 'stall', 'gong', 'firework', 'wind', 'poof', 'bonk', 'tweet', 'boing']));
        expectRecipesPlay(DRAAK_SOUNDS, playDraak);
    });
});
