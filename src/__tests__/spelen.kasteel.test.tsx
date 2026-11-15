// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta, SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { createSpelEvents, type SpelEvents } from '../oefenen/spelen/events';
import GameRow from '../oefenen/zelf/GameRow';
import { gamesFor } from '../oefenen/zelf/topicGames';
import { NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import SpelOptions from '../oefenen/spelen/SpelOptions';
import SpelEnd from '../oefenen/spelen/SpelEnd';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import Kasteel from '../oefenen/spelen/skins/kasteel/Kasteel';
import KasteelDuel from '../oefenen/spelen/skins/kasteel/KasteelDuel';
import { KASTEEL, advance, clockShotAt, endDue, isBig, launch, levelOf, livesOf, siegeOf, type KasteelLevel, type Siege } from '../oefenen/spelen/skins/kasteel/siege';
import { BLOCKS, aimAt, knockedOff, stageOf, standing } from '../oefenen/spelen/skins/kasteel/castle';
import { RELEASE_MS, flightTiming } from '../oefenen/spelen/skins/kasteel/throw';
import { useDuelStore, targetWinnerOf } from '../oefenen/spelen/skins/touwtrekken/duelStore';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';

// Kasteel: the siege model (lives, stones, the computer's clock, the tuning), the 1-player skin (damage when a
// stone lands, the clock paused under help, the win and the friendly early end) and the 2-player duel.

let choice: ZelfChoice;
let from: SpelFrom;
const kasteel = () => skinById('kasteel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(kasteel().meta, picks);
const sp = () => useSpelStore.getState();
const du = () => useDuelStore.getState();

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
    test('one tile, 1 of 2 spelers, timed; options; a Component for 1 and a Screen for 2', () => {
        const k = kasteel();
        expect(k.meta).toMatchObject({ id: 'kasteel', label: 'Kasteel', input: 'keypad', timed: true, players: '1-2', canFail: true, round: { cap: KASTEEL.cap } });
        expect(k.meta.accepts.kinds).toEqual(['number']);
        expect(k.Component && k.Screen && k.Ending).toBeTruthy();
        expect(k.screenWhen).toEqual({ id: 'spelers', value: '2' });
        expect(k.meta.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'manier']);
        expect(meta().chosen).toEqual({ spelers: '1', levens: '20', niveau: 'normaal', manier: 'samen' });
        render(<GameRow games={gamesFor(NUMBER_CONTENT, new Date(2026, 6, 1))} onPlay={() => { }} />);
        const tile = screen.getByRole('button', { name: /^Kasteel/ });
        expect(tile.getAttribute('aria-label')).toBe('Kasteel, op tijd, 1 of 2 spelers');
        // A clock and two pupils as stickers on the picture.
        expect(within(tile).getByText('Kasteel')).toBeTruthy();
        expect(tile.querySelectorAll('.zelf-play-mark')).toHaveLength(2);
    });

    test('Normaal / Moeilijk only for 1 speler, Samen tegelijk / Om beurten only for 2', () => {
        const onStart = vi.fn();
        render(<SpelOptions meta={kasteel().meta} onStart={onStart} onBack={() => { }} />);
        expect(screen.getByRole('button', { name: 'Normaal' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Samen tegelijk' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '2 spelers' }));
        expect(screen.queryByRole('button', { name: 'Normaal' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Om beurten' }));
        fireEvent.click(screen.getByRole('button', { name: '30 levens' }));
        fireEvent.click(screen.getByRole('button', { name: /Start/ }));
        expect(onStart.mock.calls[0][0].chosen).toMatchObject({ spelers: '2', levens: '30', manier: 'beurt' });
    });

    test('the shell plays the Component for 1 speler and the duel Screen for 2', async () => {
        sp().start({ ...from, meta: meta({ spelers: '2', levens: '10' }) });
        const two = render(<SpelScreen />);
        expect(await screen.findByRole('group', { name: 'Cijfers Blauw' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Oranje' })).toBeTruthy();
        two.unmount();
        sp().start({ ...from, meta: meta({ spelers: '1' }) });
        render(<SpelScreen />);
        expect(await screen.findByRole('group', { name: 'Cijfers' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Hoe los ik dit op/ })).toBeTruthy();
    });

    test('the end titles: a castle taken (won), and the friendly early end', () => {
        sp().start({ ...from, meta: meta() });
        sp().finish({});
        expect(sp().outcome).toBe('won');
        const won = render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Kasteel veroverd!' })).toBeTruthy();
        expect(screen.getByText(/0 juist/)).toBeTruthy();
        won.unmount();
        sp().start({ ...from, meta: meta() });
        sp().fail();
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Oei! Je kasteel is om. Nog eens?' })).toBeTruthy();
    });
});

describe('Kasteel: the siege model', () => {
    const land = (s: Siege, level: KasteelLevel = 'normaal') => advance(s, level, KASTEEL.flightMs).siege;

    test('a right answer takes 1 off the enemy when its stone lands; every 5th in a row 2; a mistake 1 off yours', () => {
        let s = siegeOf(20);
        s = launch(s, 'me');
        expect(s.theirs).toBe(20);
        s = land(s);
        expect(s.theirs).toBe(19);
        expect([1, 4, 5, 6, 10].map(n => isBig(n, false))).toEqual([false, false, true, false, true]);
        expect(isBig(5, true)).toBe(false);
        s = land(launch(s, 'me', true));
        expect(s.theirs).toBe(17);
        s = land(launch(s, 'foe'));
        expect(s.mine).toBe(19);
        // The foe never throws a big stone.
        expect(launch(s, 'foe', true).shots.at(-1)!.big).toBe(false);
    });

    test("the computer's clock: the first shot after firstMs, then every everyMs; Moeilijk is quicker", () => {
        for (const level of ['normaal', 'moeilijk'] as const) {
            const { firstMs, everyMs } = KASTEEL.levels[level];
            let step = advance(siegeOf(20), level, firstMs - 1);
            expect(step.fired).toHaveLength(0);
            step = advance(step.siege, level, 1);
            expect(step.fired).toHaveLength(1);
            step = advance(step.siege, level, KASTEEL.flightMs);
            expect(step.siege.mine).toBe(19);
            expect(clockShotAt(level, 1) - clockShotAt(level, 0)).toBe(everyMs);
        }
        expect(KASTEEL.levels.moeilijk.everyMs).toBeLessThan(KASTEEL.levels.normaal.everyMs);
        expect(levelOf({ niveau: 'moeilijk' })).toBe('moeilijk');
        expect(levelOf({})).toBe('normaal');
        expect([livesOf({ levens: '10' }), livesOf({ levens: '30' }), livesOf({ levens: '7' }), livesOf({})]).toEqual([10, 30, 20, 20]);
    });

    test('a castle at 0 ends it: who won, nothing more flies, and the round may end after the crumbling', () => {
        let s = siegeOf(2);
        s = launch(launch(s, 'me'), 'foe');
        s = land(s);
        expect([s.mine, s.theirs, s.over]).toEqual([1, 1, null]);
        s = land(launch(s, 'me'));
        expect(s.over).toMatchObject({ winner: 'me' });
        expect(launch(s, 'foe')).toBe(s);
        expect(endDue(s)).toBe(false);
        s = advance(s, 'normaal', KASTEEL.endMs).siege;
        expect(endDue(s)).toBe(true);
        expect(s.mine).toBe(1);
    });

    test('the castle look: blocks fall one by one, towers lean then topple, the flag droops, a heap at 0', () => {
        expect(standing(20, 20)).toBe(BLOCKS.length);
        expect(standing(0, 20)).toBe(0);
        expect(knockedOff(20, 19, 20)).toHaveLength(1);
        expect(knockedOff(10, 9, 10)).toHaveLength(2);
        expect(knockedOff(30, 29, 30).length).toBeLessThanOrEqual(1);
        expect(stageOf(20, 20)).toEqual({ cracks: 0, inner: 'up', outer: 'up', flag: 'up', fallen: false });
        expect(stageOf(15, 20)).toMatchObject({ inner: 'lean', outer: 'up', cracks: 1 });
        expect(stageOf(10, 20)).toMatchObject({ inner: 'down', outer: 'lean', flag: 'droop', cracks: 2 });
        expect(stageOf(5, 20)).toMatchObject({ inner: 'down', outer: 'down', flag: 'low', cracks: 3 });
        expect(stageOf(0, 20)).toMatchObject({ fallen: true, flag: 'gone' });
        expect(stageOf(20, 20, true).flag).toBe('raised');
        // A tower is bare before it topples: its blocks went first.
        const at = (part: string) => BLOCKS.map((b, i) => (b.part === part ? i : -1)).filter(i => i >= 0);
        expect(Math.max(...at('inner'))).toBeLessThan(BLOCKS.length / 2);
        expect(Math.max(...at('outer'))).toBeLessThan(BLOCKS.length * 3 / 4);
        expect(aimAt(19, 20)).toEqual({ x: BLOCKS[0].x + BLOCKS[0].w / 2, y: BLOCKS[0].y + BLOCKS[0].h / 2 });
    });

    // A simulated pupil: one answer every minS–maxS seconds, pRight right; seeded, so the numbers are stable.
    function mulberry32(seed: number) {
        return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function play(level: KasteelLevel, lives: number, rnd: () => number, minS = 6, maxS = 8, pRight = 0.8) {
        let s = siegeOf(lives);
        let streak = 0;
        let answers = 0;
        while (!s.over) {
            s = advance(s, level, (minS + (maxS - minS) * rnd()) * 1000).siege;
            if (s.over) break;
            answers++;
            if (rnd() < pRight) s = launch(s, 'me', isBig(++streak, false));
            else { streak = 0; s = launch(s, 'foe'); }
        }
        return { won: s.over.winner === 'me', answers };
    }
    const winRate = (level: KasteelLevel, lives = 20, minS?: number, maxS?: number, pRight?: number) => {
        const rnd = mulberry32(42);
        let won = 0;
        for (let i = 0; i < 1000; i++) if (play(level, lives, rnd, minS, maxS, pRight).won) won++;
        return won / 1000;
    };

    test('the tuning: an average L2 pupil wins Normaal most of the time; Moeilijk is tight', () => {
        expect(winRate('normaal')).toBeGreaterThanOrEqual(0.85);
        const hard = winRate('moeilijk');
        expect(hard).toBeGreaterThan(0.35);
        expect(hard).toBeLessThan(0.75);
        // Fewer or more lives keep Normaal winnable; a quick, sure pupil wins even Moeilijk.
        expect(winRate('normaal', 10)).toBeGreaterThan(0.75);
        expect(winRate('normaal', 30)).toBeGreaterThan(0.85);
        expect(winRate('moeilijk', 20, 4, 6, 0.9)).toBeGreaterThan(0.85);
    });

    test('the hidden question cap never comes first: every answer costs a castle a life', () => {
        const rnd = mulberry32(7);
        let most = 0;
        for (let i = 0; i < 300; i++) most = Math.max(most, play('normaal', 30, rnd, 1, 2, 0.5).answers);
        expect(most).toBeLessThan(2 * 30);
        expect(KASTEEL.cap).toBeGreaterThan(2 * 30);
    });
});

describe('Kasteel: the 1-player skin', () => {
    const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
        answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
    });
    let events: SpelEvents;
    const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
        question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), onFinish: vi.fn(), sound: vi.fn(),
        progress: progressWith(), options: { levens: '10' }, events, reducedMotion: false, ...over,
    });
    const hp = (c: HTMLElement, team: 'blue' | 'orange') => Number(c.querySelector(`.ks-bar.is-${team}`)!.getAttribute('data-hp'));
    const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        events = createSpelEvents();
    });

    test('a stone per right answer (a big one at 5 in a row, never after help); the enemy fires on a mistake', () => {
        const sound = vi.fn();
        const { container } = render(<Kasteel {...propsWith({ sound })} />);
        expect([hp(container, 'blue'), hp(container, 'orange')]).toEqual([10, 10]);
        act(() => events.emit('correct', { given: '12', streak: 1 }));
        expect(hp(container, 'orange')).toBe(10);
        expect(container.querySelectorAll('.ks-fly-x')).toHaveLength(1);
        tick(KASTEEL.flightMs + 60);
        expect(hp(container, 'orange')).toBe(9);
        expect(sound).toHaveBeenCalledWith('hit');
        expect(container.querySelectorAll('.ks-chunk').length).toBeGreaterThan(0);
        act(() => events.emit('correct', { given: '12', streak: 5 }));
        tick(KASTEEL.flightMs + 60);
        expect(hp(container, 'orange')).toBe(7);
        act(() => { events.emit('help', {}); events.emit('correct', { given: '12', streak: 10 }); });
        tick(KASTEEL.flightMs + 60);
        expect(hp(container, 'orange')).toBe(6);
        act(() => events.emit('wrong', { given: '13', expected: '12' }));
        tick(KASTEEL.flightMs + 60);
        expect(hp(container, 'blue')).toBe(9);
    });

    test('a throw: the stone rides the arm until the release, then flies; the hit comes only when it arrives', () => {
        const { container } = render(<Kasteel {...propsWith()} />);
        // Both catapults wait with a stone in the bucket.
        expect(container.querySelectorAll('.ks-arm .ks-ball')).toHaveLength(2);
        act(() => events.emit('correct', { given: '12', streak: 1 }));
        expect(container.querySelector('.ks-arm.is-fire .ks-load-out .ks-ball')).toBeTruthy();
        const fly = container.querySelector<SVGGElement>('.ks-fly')!;
        const ms = (v: string) => parseFloat(fly.style.getPropertyValue(v));
        expect(ms('--wait')).toBe(RELEASE_MS);
        expect(ms('--wait') + ms('--dur')).toBe(KASTEEL.flightMs);
        expect(ms('--dur')).toBeGreaterThanOrEqual(600);
        expect(ms('--dur')).toBeLessThanOrEqual(900);
        expect(flightTiming(0)).toEqual({ wait: 0, fly: 0 });
        tick(KASTEEL.flightMs - 60);
        expect(hp(container, 'orange')).toBe(10);
        expect(container.querySelectorAll('.ks-chunk')).toHaveLength(0);
        tick(120);
        expect(hp(container, 'orange')).toBe(9);
        expect(container.querySelectorAll('.ks-chunk').length).toBeGreaterThan(0);
        expect(container.querySelector('.ks-fly')).toBeNull();
        // A big stone is big in the bucket and in the air.
        act(() => events.emit('correct', { given: '12', streak: 5 }));
        expect(container.querySelector('.ks-load-out .ks-ball.is-big')).toBeTruthy();
        expect(container.querySelector('.ks-fly .ks-ball.is-big')).toBeTruthy();
    });

    test("the computer's clock fires on its own and stops under help", () => {
        const sound = vi.fn();
        const p = (phase: SkinProps['phase']) => propsWith({ sound, phase, options: { levens: '10', niveau: 'moeilijk' } });
        const { container, rerender } = render(<Kasteel {...p('play')} />);
        const { firstMs, everyMs } = KASTEEL.levels.moeilijk;
        tick(firstMs - 500);
        rerender(<Kasteel {...p('help')} />);
        tick(60_000);
        expect(hp(container, 'blue')).toBe(10);
        expect(sound).not.toHaveBeenCalledWith('launch');
        rerender(<Kasteel {...p('play')} />);
        tick(500 + KASTEEL.flightMs + 100);
        expect(sound).toHaveBeenCalledWith('launch');
        expect(hp(container, 'blue')).toBe(9);
        tick(everyMs);
        expect(hp(container, 'blue')).toBe(8);
    });

    test('the enemy castle at 0: the win (onFinish) after the crumbling, once; yours at 0: the early end', () => {
        const onFinish = vi.fn();
        const onFail = vi.fn();
        const won = render(<Kasteel {...propsWith({ onFinish, onFail })} />);
        for (let i = 1; i <= 10; i++) act(() => events.emit('correct', { given: '12', streak: i }));
        tick(KASTEEL.flightMs + 60);
        expect(hp(won.container, 'orange')).toBe(0);
        expect(won.container.querySelector('.ks-castle.is-fallen')).toBeTruthy();
        expect(won.container.querySelectorAll('.ks-kid.is-cheer')).toHaveLength(2);
        expect(onFinish).not.toHaveBeenCalled();
        tick(KASTEEL.endMs);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onFinish).toHaveBeenCalledWith({});
        tick(5000);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(onFail).not.toHaveBeenCalled();
        won.unmount();

        events = createSpelEvents();
        const p = (phase: SkinProps['phase']) => propsWith({ onFinish, onFail, phase });
        const lost = render(<Kasteel {...p('play')} />);
        for (let i = 0; i < 10; i++) act(() => events.emit('wrong', { given: '1', expected: '12' }));
        tick(KASTEEL.flightMs + 60);
        expect(hp(lost.container, 'blue')).toBe(0);
        // No early end while help is open; it comes once the round runs again.
        lost.rerender(<Kasteel {...p('help')} />);
        tick(KASTEEL.endMs * 3);
        expect(onFail).not.toHaveBeenCalled();
        lost.rerender(<Kasteel {...p('play')} />);
        tick(KASTEEL.endMs + 100);
        expect(onFail).toHaveBeenCalledTimes(1);
        expect(lost.container.querySelectorAll('.ks-kid')).toHaveLength(0);
    });

    test('reduced motion: no stones in the air and no chunks, only the lives and the blocks', () => {
        const { container } = render(<Kasteel {...propsWith({ reducedMotion: true })} />);
        act(() => events.emit('correct', { given: '12', streak: 1 }));
        expect(container.querySelectorAll('.ks-fly-x')).toHaveLength(0);
        tick(120);
        expect(hp(container, 'orange')).toBe(9);
        expect(container.querySelectorAll('.ks-chunk')).toHaveLength(0);
        expect(container.querySelector('.ks-root.is-still')).toBeTruthy();
    });
});

describe('Kasteel: 2 players', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        vi.setSystemTime(1_000_000);
    });
    const two = (manier = 'samen') => meta({ spelers: '2', levens: '10', manier });
    const q = (side: 'left' | 'right') => du().sides[side].question!;

    test('the win rule: the first to knock the other castle to 0; at the time limit the one ahead, else a draw', () => {
        expect(targetWinnerOf(10, 3, 10, false)).toBe('left');
        expect(targetWinnerOf(4, 10, 10, false)).toBe('right');
        expect(targetWinnerOf(9, 9, 10, false)).toBeNull();
        expect(targetWinnerOf(6, 4, 10, true)).toBe('left');
        expect(targetWinnerOf(5, 5, 10, true)).toBe('draw');
    });

    test('samen: two independent streams; a right answer fires at the other castle; 10 hits wins', () => {
        render(<KasteelDuel meta={two()} from={from} onExit={() => { }} />);
        expect(du().rule).toEqual({ seconds: 10 * KASTEEL.duelSecondsPerLife, target: 10 });
        const rightQ = q('right');
        act(() => du().answer('left', q('left').answer));
        expect(du().sides.left.score).toBe(1);
        expect(du().sides.right.question).toBe(rightQ);
        expect(du().sides.right.history).toHaveLength(0);
        act(() => du().answer('right', String(Number(q('right').answer) + 1)));
        expect(du().sides.right.score).toBe(0);
        act(() => { vi.advanceTimersByTime(KASTEEL.flightMs + 10); });
        const bars = () => [...document.querySelectorAll('.ks-bar')].map(b => Number(b.getAttribute('data-hp')));
        expect(bars()).toEqual([10, 9]);
        for (let i = 1; i < 10; i++) {
            act(() => { vi.advanceTimersByTime(1600); });
            act(() => du().answer('left', q('left').answer));
        }
        expect(du().phase).toBe('end');
        expect(du().winner).toBe('left');
        expect(screen.queryByRole('dialog')).toBeNull();
        act(() => { vi.advanceTimersByTime(KASTEEL.flightMs + 10); });
        expect(bars()).toEqual([10, 0]);
        act(() => { vi.advanceTimersByTime(KASTEEL.endMs + 10); });
        const end = screen.getByRole('dialog');
        expect(within(end).getByRole('heading', { name: 'Blauw wint!' })).toBeTruthy();
        expect(within(end).getByText('Goed gespeeld, allebei!')).toBeTruthy();
        expect(within(end).getByLabelText('10 juist')).toBeTruthy();
        expect(within(end).getByLabelText('nog 0 levens')).toBeTruthy();
        // No help and no Nakijken in a duel.
        expect(screen.queryByRole('button', { name: /Hoe los ik dit op|Nakijken/ })).toBeNull();
        fireEvent.click(within(end).getByRole('button', { name: /Nog eens/ }));
        expect(du().phase).toBe('play');
        expect(bars()).toEqual([10, 10]);
    });

    test('samen: both keypads at the same moment (interleaved pointer events)', () => {
        render(<KasteelDuel meta={two()} from={from} onExit={() => { }} />);
        const pad = (name: string) => screen.getByRole('group', { name });
        const press = (name: string, key: string) => fireEvent.pointerDown(pad(name).querySelector(`[data-key="${key}"]`)!);
        const a = { left: q('left').answer, right: q('right').answer };
        for (let i = 0; i < Math.max(a.left.length, a.right.length); i++) {
            if (a.left[i]) press('Cijfers Blauw', a.left[i]);
            if (a.right[i]) press('Cijfers Oranje', a.right[i]);
        }
        press('Cijfers Oranje', 'ok');
        press('Cijfers Blauw', 'ok');
        expect([du().sides.left.score, du().sides.right.score]).toEqual([1, 1]);
        expect(document.querySelectorAll('.ks-fly-x')).toHaveLength(2);
        act(() => { vi.advanceTimersByTime(KASTEEL.flightMs + 10); });
        expect([...document.querySelectorAll('.ks-bar')].map(b => Number(b.getAttribute('data-hp')))).toEqual([9, 9]);
    });

    test('om beurten: one shared sum, the first right answer fires', () => {
        render(<KasteelDuel meta={two('beurt')} from={from} onExit={() => { }} />);
        expect(du().mode).toBe('beurt');
        expect(q('left')).toBe(q('right'));
        act(() => du().answer('right', q('right').answer));
        expect([du().sides.left.score, du().sides.right.score]).toEqual([0, 1]);
        expect(du().sides.left.locked).toBe(true);
        expect(screen.getByText('Om beurten')).toBeTruthy();
    });

    test('Touwtrekken keeps its rope rule', () => {
        du().setup({ meta: skinById('touwtrekken')!.meta, from });
        expect(du().rule).toEqual({ seconds: 120 });
    });
});

describe('games grid categories', () => {
    test('derived from meta: Touwtrekken samen, Kasteel op tijd with both marks, boards zoeken, empty groups hidden', () => {
        render(<GameRow games={gamesFor(NUMBER_CONTENT, new Date(2026, 6, 1))} onPlay={() => { }} />);
        const heads = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(heads).toEqual(['Rustig spelen', 'Op tijd', 'Samen spelen', 'Zoeken en koppelen']);
        const has = (region: string, name: RegExp) => within(screen.getByRole('region', { name: region })).getAllByRole('button').some(b => name.test(b.getAttribute('aria-label')!));
        expect(has('Samen spelen', /^Touwtrekken/)).toBe(true);
        expect(has('Op tijd', /^Kasteel/)).toBe(true);
        expect(has('Zoeken en koppelen', /^Honingraat/)).toBe(true);
    });
});
