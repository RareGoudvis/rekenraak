// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import GameRow from '../oefenen/zelf/GameRow';
import { gamesFor } from '../oefenen/zelf/topicGames';
import { NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import SpelOptions from '../oefenen/spelen/SpelOptions';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import Kasteel from '../oefenen/spelen/skins/kasteel/Kasteel';
import { KASTEEL, KASTEEL_RULE, damageOf, isBig } from '../oefenen/spelen/skins/kasteel/rule';
import { BLOCKS, aimAt, knockedOff, stageOf, standing } from '../oefenen/spelen/skins/kasteel/castle';
import { RELEASE_MS, flightTiming } from '../oefenen/spelen/skins/kasteel/throw';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';

// Kasteel on the duel engine: the rule (a stone per right answer, a big one at 3 in a row, the damage when it
// lands), the castle look, the screen for 1 (against the computer) and 2 players, and its place in the grid.

let choice: ZelfChoice;
let from: SpelFrom;
const kasteel = () => skinById('kasteel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(kasteel().meta, picks);
const sp = () => useSpelStore.getState();
const du = () => useDuelStore.getState();
const q = (side: 'left' | 'right') => du().sides[side].question!;
const bars = () => [...document.querySelectorAll('.ks-bar')].map(b => Number(b.getAttribute('data-hp')));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); sp().otherGame(); sp().takePickerAt(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Kasteel: the registry entry and the pre-start screen', () => {
    test('one tile, 1 of 2 spelers, a duel Screen for both; the shared duel options with 1 speler first', () => {
        const k = kasteel();
        expect(k.meta).toMatchObject({ id: 'kasteel', label: 'Kasteel', input: 'keypad', timed: false, players: '1-2' });
        expect(k.meta.accepts.kinds).toEqual(['number']);
        expect(k.Screen && !k.Component && !k.screenWhen).toBe(true);
        expect(k.meta.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes', 'manier']);
        expect(meta().chosen).toEqual({ spelers: '1', niveau: 'normaal', levens: '10', rondes: '3', manier: 'samen' });
        // A device that still remembers a retired choice (3 levens) gets the default.
        expect(meta({ levens: '3' }).chosen!.levens).toBe('10');
        render(<GameRow games={gamesFor(NUMBER_CONTENT, new Date(2026, 6, 1))} onPlay={() => { }} />);
        const tile = screen.getByRole('button', { name: /^Kasteel/ });
        expect(tile.getAttribute('aria-label')).toBe('Kasteel, 1 of 2 spelers');
    });

    test('Niveau for 1 and 2 spelers; Elk een eigen som / Samen één som only for 2', () => {
        const onStart = vi.fn();
        render(<SpelOptions meta={kasteel().meta} onStart={onStart} onBack={() => { }} />);
        expect(screen.getByRole('button', { name: 'Normaal' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Samen één som' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '2 spelers' }));
        expect(screen.getByRole('button', { name: 'Moeilijk' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Samen één som' }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Hoeveel levens?' })).getByRole('button', { name: '15' }));
        fireEvent.click(within(screen.getByRole('group', { name: 'Hoeveel rondes?' })).getByRole('button', { name: '5' }));
        fireEvent.click(screen.getByRole('button', { name: /Start/ }));
        expect(onStart.mock.calls[0][0].chosen).toMatchObject({ spelers: '2', levens: '15', manier: 'beurt', rondes: '5' });
    });

    test('the shell plays the duel screen for 1 and for 2 spelers', async () => {
        sp().start({ ...from, meta: meta({ spelers: '2' }) });
        const two = render(<SpelScreen />);
        expect(await screen.findByRole('group', { name: 'Cijfers Blauw' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Oranje' })).toBeTruthy();
        two.unmount();
        sp().start({ ...from, meta: meta({ spelers: '1' }) });
        render(<SpelScreen />);
        expect(await screen.findByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Hoe los ik dit op/ })).toBeNull();
    });
});

describe('Kasteel: the rule and the castle', () => {
    const ctx = (streak: number) => ({ side: 'left' as const, other: 'right' as const, me: freshSideView(5), them: freshSideView(5), streak, level: 'normaal' as const, round: 1, config: { players: 2 as const, level: 'normaal' as const, lives: 5, bestOf: 3 as const, stream: 'own' as const } });

    test('a right answer launches a stone that takes 1 when it lands; every 3rd in a row a big one for 2', () => {
        const stone = KASTEEL_RULE.right!(ctx(1));
        expect(stone.damage).toBeUndefined();
        expect(stone.launch).toMatchObject({ ms: KASTEEL.flightMs, tag: 'stone', data: { big: false }, effect: { damage: { right: 1 } } });
        expect(KASTEEL_RULE.right!(ctx(3)).launch).toMatchObject({ data: { big: true }, effect: { damage: { right: 2 }, tag: 'big' } });
        expect([1, 2, 3, 4, 6].map(isBig)).toEqual([false, false, true, false, true]);
        expect(damageOf({ to: 'right', effect: { damage: { right: 2 } } })).toBe(2);
        expect(KASTEEL_RULE.cardMs).toBe(KASTEEL.endMs);
    });

    test('the castle look: blocks fall per hit, towers lean then topple, the flag droops, a heap at 0', () => {
        expect(standing(5, 5)).toBe(BLOCKS.length);
        expect(standing(0, 5)).toBe(0);
        expect(knockedOff(5, 4, 5)).toHaveLength(BLOCKS.length / 5);
        expect(stageOf(5, 5)).toEqual({ cracks: 0, inner: 'up', outer: 'up', flag: 'up', fallen: false });
        expect(stageOf(2, 5)).toMatchObject({ inner: 'down', outer: 'lean', flag: 'droop', cracks: 3 });
        expect(stageOf(0, 5)).toMatchObject({ fallen: true, flag: 'gone' });
        expect(stageOf(5, 5, true).flag).toBe('raised');
        expect(aimAt(4, 5)).toEqual({ x: BLOCKS[3].x + BLOCKS[3].w / 2, y: BLOCKS[3].y + BLOCKS[3].h / 2 });
        expect(flightTiming(KASTEEL.flightMs)).toEqual({ wait: RELEASE_MS, fly: KASTEEL.flightMs - RELEASE_MS });
    });
});

describe('Kasteel: the screen', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        vi.setSystemTime(1_000_000);
    });
    const two = (picks: Record<string, string> = {}) => meta({ spelers: '2', levens: '5', ...picks });
    const ready = () => tick(DUEL_TIMING.readyMs);

    test('2 spelers: a right answer fires; the hit counts when the stone lands; 3 in a row is a big stone; the castle falls, then the card', () => {
        render(<Kasteel meta={two({ levens: '5' })} from={from} onExit={() => { }} />);
        ready();
        expect(bars()).toEqual([5, 5]);
        const rightQ = q('right');
        act(() => du().answer('left', q('left').answer));
        expect(du().sides.right.question).toBe(rightQ);
        expect(document.querySelectorAll('.ks-fly-x')).toHaveLength(1);
        expect(document.querySelector('.ks-arm.is-fire .ks-load-out .ks-ball')).toBeTruthy();
        const fly = document.querySelector<SVGGElement>('.ks-fly')!;
        expect(parseFloat(fly.style.getPropertyValue('--wait')) + parseFloat(fly.style.getPropertyValue('--dur'))).toBe(KASTEEL.flightMs);
        tick(KASTEEL.flightMs - 50);
        expect(bars()).toEqual([5, 5]);
        tick(60);
        expect(bars()).toEqual([5, 4]);
        expect(document.querySelectorAll('.ks-chunk').length).toBeGreaterThan(0);
        expect(document.querySelector('.ks-fly')).toBeNull();
        // Two more in a row: the third is a big stone (2 lives) with its call.
        for (let i = 0; i < 2; i++) {
            tick(DUEL_TIMING.flashRight);
            act(() => du().answer('left', q('left').answer));
        }
        expect(document.querySelector('.ks-fly .ks-ball.is-big')).toBeTruthy();
        expect(screen.getByText('Grote steen!')).toBeTruthy();
        tick(KASTEEL.flightMs + 10);
        expect(bars()).toEqual([5, 1]);
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('left', q('left').answer));
        tick(KASTEEL.flightMs + 10);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(document.querySelector('.ks-castle.is-fallen')).toBeTruthy();
        expect(document.querySelectorAll('.ks-kid.is-cheer')).toHaveLength(2);
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(KASTEEL.endMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new round: both castles stand again.
        expect(bars()).toEqual([5, 5]);
        expect(document.querySelector('.ks-castle.is-fallen')).toBeNull();
    });

    test('2 spelers: both keypads at the same moment (interleaved pointer events)', () => {
        render(<Kasteel meta={two()} from={from} onExit={() => { }} />);
        ready();
        const pad = (name: string) => screen.getByRole('group', { name });
        const press = (name: string, key: string) => fireEvent.pointerDown(pad(name).querySelector(`[data-key="${key}"]`)!);
        const a = { left: q('left').answer, right: q('right').answer };
        act(() => {
            for (let i = 0; i < Math.max(a.left.length, a.right.length); i++) {
                if (a.left[i]) press('Cijfers Blauw', a.left[i]);
                if (a.right[i]) press('Cijfers Oranje', a.right[i]);
            }
            press('Cijfers Oranje', 'ok');
            press('Cijfers Blauw', 'ok');
        });
        expect(document.querySelectorAll('.ks-fly-x')).toHaveLength(2);
        tick(KASTEEL.flightMs + 10);
        expect(bars()).toEqual([4, 4]);
    });

    test('Samen één som: one shared sum, the first right answer fires', () => {
        render(<Kasteel meta={two({ manier: 'beurt' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().config.stream).toBe('shared');
        expect(q('left')).toBe(q('right'));
        act(() => du().answer('right', q('right').answer));
        expect([du().sides.left.right, du().sides.right.right]).toEqual([0, 1]);
        expect(du().sides.left.locked).toBe(true);
    });

    test('1 speler: Jij against the computer, which fires on its own; the match card after 2 round wins', () => {
        render(<Kasteel meta={meta({ spelers: '1', levens: '5' })} from={from} onExit={() => { }} />);
        // A steady computer: every answer right, mid-range in time (the match keeps this config for every round).
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        ready();
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        expect(document.querySelector('.duel-bot')).toBeTruthy();
        // The pupil does nothing: the computer wins two rounds.
        for (let r = 0; r < 2; r++) {
            tick(60_000);
            expect(du().roundWinner).toBe('right');
            tick(KASTEEL.endMs);
            if (r === 0) { fireEvent.click(screen.getByRole('button', { name: /Volgende ronde/ })); ready(); }
        }
        expect(screen.getByRole('heading', { name: 'De computer wint!' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Nog eens/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ander spel/ })).toBeTruthy();
    });
});

describe('games grid categories', () => {
    test('derived from meta: the duels under Samen spelen, boards under zoeken, empty groups hidden', () => {
        render(<GameRow games={gamesFor(NUMBER_CONTENT, new Date(2026, 6, 1))} onPlay={() => { }} />);
        const heads = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(heads).toEqual(['Rustig spelen', 'Op tijd', 'Samen spelen', 'Zoeken en koppelen']);
        const has = (region: string, name: RegExp) => within(screen.getByRole('region', { name: region })).getAllByRole('button').some(b => name.test(b.getAttribute('aria-label')!));
        expect(has('Samen spelen', /^Touwtrekken/)).toBe(true);
        expect(has('Samen spelen', /^Kasteel/)).toBe(true);
        expect(has('Zoeken en koppelen', /^Honingraat/)).toBe(true);
    });
});
