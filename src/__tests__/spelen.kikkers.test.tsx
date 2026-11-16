// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { gameBlurb } from '../oefenen/zelf/gameBlurbs';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import Kikkers from '../oefenen/spelen/skins/kikkers/Kikkers';
import { BUG_POINTS, POND, addBug, bugAt, createPondKeeper, makeBug, newPond, pickTarget, snapAt, tickPond, type Bug, type Pond } from '../oefenen/spelen/skins/kikkers/pond';
import { KIKKER, kikkerRoundOver, kikkerRule, modeOf } from '../oefenen/spelen/skins/kikkers/rule';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelRoundView } from '../oefenen/spelen/duel/types';

// Kikkers en vliegjes: the pond (bugs, spawning, which bug a tongue takes, with an injected rng), the rule
// (points per bug, a life per mistake, Op tijd / Tot 25), the match on the engine, and the screen.

let from: SpelFrom;
const kikkers = () => skinById('kikkers')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(kikkers().meta, picks);
const du = () => useDuelStore.getState();
const q = (side: 'left' | 'right') => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const wrongOf = (a: string) => String(Number(a) + 1);

// A small seeded generator (mulberry32): the same pond every run.
function seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A bug that hangs still at (x, y) (only its small buzz on y), born long ago, staying long.
const still = (id: number, kind: Bug['kind'], x: number, y: number): Bug => ({
    id, kind, born: -100_000, leaveAt: 1_000_000, cx: x, cy: y, ax: 0, ay: 0, w1: 1, w2: 1, p1: 0, p2: 0, from: { x, y: -50 }, to: { x, y: -60 },
});
const pondOf = (bugs: Bug[]): Pond => ({ bugs, nextId: 100, spawnAt: 1e12, dragonAt: 1e12 });

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

describe('Kikkers en vliegjes: the registry entry', () => {
    test('a duel tile for 1 or 2 spelers with the shared options and Hoe winnen? (Op tijd / Tot 25)', () => {
        const k = kikkers();
        expect(k.meta).toMatchObject({ id: 'kikkers', label: 'Kikkers en vliegjes', input: 'keypad', players: '1-2', music: 'weide' });
        expect(k.Screen && !k.Component).toBe(true);
        expect(k.meta.options!.map(o => o.id)).toEqual(['spelers', 'niveau', 'levens', 'rondes', 'winnen']);
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', levens: '5', rondes: '3', winnen: 'tijd' });
        expect(k.meta.options!.at(-1)!.choices.map(c => c.label)).toEqual(['Op tijd', 'Tot 25 punten']);
        expect([modeOf(undefined), modeOf({ winnen: 'doel' })]).toEqual(['tijd', 'doel']);
        expect(gameBlurb('kikkers', 'x')).toMatch(/libel/);
    });
});

describe('Kikkers en vliegjes: the pond', () => {
    test('a new pond: a full swarm flying in, hovering over the water between the frogs; a dragonfly is not there yet', () => {
        const rng = seeded(7);
        const p = newPond(0, rng);
        expect(p.bugs).toHaveLength(POND.count);
        expect(p.bugs.some(b => b.kind === 'dragonfly')).toBe(false);
        expect(p.dragonAt).toBeGreaterThanOrEqual(POND.dragonFirstMs[0]);
        // Once in, every bug stays near the field (its wobble may poke out a little), never over a frog.
        for (const b of p.bugs) {
            for (let t = POND.enterMs; t < b.leaveAt; t += 250) {
                const at = bugAt(b, t)!;
                expect(at.x).toBeGreaterThan(POND.field.x0 - 30);
                expect(at.x).toBeLessThan(POND.field.x1 + 30);
                expect(at.y).toBeGreaterThan(POND.field.y0 - 20);
                expect(at.y).toBeLessThan(POND.field.y1 + 20);
            }
        }
        // It flies in from the sky and out again; gone after leaving.
        const b = p.bugs[0];
        expect(bugAt(b, b.born)!.y).toBeLessThan(0);
        expect(bugAt(b, b.leaveAt + POND.leaveMs - 1)!.y).toBeLessThan(0);
        expect(bugAt(b, b.leaveAt + POND.leaveMs)).toBeNull();
    });

    test('the pond keeps its swarm: gone bugs drop out, a new one comes in on time, a golden dragonfly now and then (never two)', () => {
        const rng = seeded(3);
        let p = newPond(0, rng);
        const first = Math.min(...p.bugs.map(b => b.leaveAt + POND.leaveMs));
        p = tickPond(p, first, rng);
        expect(p.bugs.length).toBeGreaterThanOrEqual(POND.count - 1);
        // The same object when nothing changes.
        const quiet = pondOf([still(1, 'fly', 500, 100)]);
        expect(tickPond(quiet, 10, rng)).toBe(quiet);
        // Short of bugs: one more per tick once spawnAt has come.
        const short = tickPond({ ...quiet, spawnAt: 5 }, 10, rng);
        expect(short.bugs).toHaveLength(2);
        expect(short.spawnAt).toBeGreaterThan(10);
        // The dragonfly on its time, one at a time.
        let d = tickPond({ ...quiet, dragonAt: 10 }, 10, rng);
        expect(d.bugs.filter(b => b.kind === 'dragonfly')).toHaveLength(1);
        expect(d.dragonAt).toBeGreaterThanOrEqual(10 + POND.dragonEveryMs[0]);
        d = tickPond({ ...d, dragonAt: 20 }, 20, rng);
        expect(d.bugs.filter(b => b.kind === 'dragonfly')).toHaveLength(1);
        // Mostly flies, some beetles (POND.beetleChance).
        const kinds = Array.from({ length: 60 }, () => newPond(0, rng).bugs.map(b => b.kind)).flat();
        const beetles = kinds.filter(k => k === 'beetle').length / kinds.length;
        expect(beetles).toBeGreaterThan(POND.beetleChance - 0.1);
        expect(beetles).toBeLessThan(POND.beetleChance + 0.1);
        expect(makeBug(1, 'dragonfly', 0, rng).ax).toBeGreaterThan(150);
    });

    test('a tongue takes the nearest bug near the frog; nothing near = the best bug in reach; nothing = a fly zips in', () => {
        const left = POND.mouths.left;
        const near = still(1, 'fly', left.x + 150, left.y - 40);
        const nearer = still(2, 'beetle', left.x + 100, left.y - 30);
        const far = still(3, 'dragonfly', 700, 100);
        expect(pickTarget([near, nearer, far], left, 0)!.id).toBe(2);
        // Nothing within POND.nearPx: the dragonfly (5) beats a closer beetle (2) and fly.
        const midFly = still(4, 'fly', 470, 110);
        const midBeetle = still(5, 'beetle', 520, 110);
        expect(pickTarget([midFly, midBeetle, far], left, 0)!.id).toBe(3);
        // Same points: the nearer one.
        expect(pickTarget([still(6, 'fly', 600, 100), still(7, 'fly', 520, 100)], left, 0)!.id).toBe(7);
        // From the right frog's side the same pond looks different.
        expect(pickTarget([nearer, far], POND.mouths.right, 0)!.id).toBe(3);
        // A bug flying high off the pond can't be taken.
        const leaving = { ...still(8, 'fly', 500, 100), leaveAt: 0 };
        expect(pickTarget([leaving], left, POND.leaveMs * 0.9)).toBeNull();

        const r = snapAt(pondOf([near, nearer]), 'left', 0, seeded(1));
        expect(r.bug.id).toBe(2);
        expect(r.pond.bugs.map(b => b.id)).toEqual([1]);
        expect(Math.abs(r.at.x - nearer.cx)).toBeLessThan(1);
        const empty = snapAt(pondOf([]), 'right', 0, seeded(1));
        expect(empty.bug.kind).toBe('fly');
        expect(empty.pond.bugs).toHaveLength(0);
        expect(empty.at.x).toBeGreaterThan(POND.field.x0 - 30);
    });

    test('the keeper: both frogs compete for the same bugs; a caught bug is drawn until the tongue reaches it', () => {
        const keeper = createPondKeeper(0, seeded(2));
        keeper.reset(0);
        const heard: string[] = [];
        const off = keeper.onSnap(s => heard.push(`${s.side}:${s.bug.kind}`));
        const t = POND.enterMs + 10;
        const a = keeper.snap('left', t);
        const b = keeper.snap('right', t);
        expect(a.bug.id).not.toBe(b.bug.id);
        expect(heard).toHaveLength(2);
        expect(keeper.drawn().map(x => x.id)).toContain(a.bug.id);
        expect(keeper.placeOf(a.bug, t)).not.toBeNull();
        expect(keeper.placeOf(a.bug, t + POND.tongueMs)).toBeNull();
        keeper.tick(t + POND.tongueMs + 500);
        expect(keeper.drawn().map(x => x.id)).not.toContain(a.bug.id);
        off();
        keeper.snap('left', t + 600);
        expect(heard).toHaveLength(2);
        // A dragonfly arriving is reported once.
        const k2 = createPondKeeper(0, seeded(4));
        let seen = 0;
        for (let ms = 0; ms < POND.dragonFirstMs[1] + 1000; ms += 200) if (k2.tick(ms)) seen++;
        expect(seen).toBe(1);
        expect(k2.lookAt('left', POND.dragonFirstMs[1] + 1000)).not.toBeNull();
        expect(addBug(pondOf([]), 'beetle', 0, seeded(1)).bugs[0].kind).toBe('beetle');
    });
});

describe('Kikkers en vliegjes: the rule', () => {
    const config: DuelConfig = { players: 2, level: 'normaal', lives: 3, bestOf: 3, stream: 'own' };
    const ctx = (side: 'left' | 'right') => ({ side, other: side === 'left' ? 'right' as const : 'left' as const, me: freshSideView(3), them: freshSideView(3), streak: 1, level: 'normaal' as const, round: 1, config });
    const view = (l: [number, number], r: [number, number]): DuelRoundView => ({
        sides: { left: { ...freshSideView(3), lives: l[0], points: l[1] }, right: { ...freshSideView(3), lives: r[0], points: r[1] } }, config,
    });

    test('a right answer scores the caught bug for that frog; a mistake costs that frog a life (a time-out too)', () => {
        const kinds = ['fly', 'beetle', 'dragonfly'] as const;
        let i = 0;
        const rule = kikkerRule('tijd', () => kinds[i++]);
        expect(rule.right!(ctx('left'))).toEqual({ points: { left: 1 }, tag: 'fly' });
        expect(rule.right!(ctx('right'))).toEqual({ points: { right: 2 }, tag: 'beetle' });
        expect(rule.right!(ctx('left')).points).toEqual({ left: BUG_POINTS.dragonfly });
        expect(rule.wrong!(ctx('right'))).toEqual({ damage: { right: 1 }, tag: 'oops' });
        expect(rule.timeout).toBeUndefined();
        expect(rule.cardMs).toBe(KIKKER.cardMs);
    });

    test('Op tijd: at the clock most points wins, then most lives, else a draw; 0 lives always loses', () => {
        expect(kikkerRoundOver(view([3, 30], [3, 10]), false, null)).toBeNull();
        expect(kikkerRoundOver(view([3, 9], [1, 12]), true, null)).toBe('right');
        expect(kikkerRoundOver(view([3, 12], [1, 12]), true, null)).toBe('left');
        expect(kikkerRoundOver(view([2, 12], [2, 12]), true, null)).toBe('draw');
        expect(kikkerRoundOver(view([0, 40], [2, 1]), false, null)).toBe('right');
        expect(kikkerRoundOver(view([0, 4], [0, 1]), false, null)).toBe('draw');
    });

    test('Tot 25: the first frog at 25 wins at once; lives still count', () => {
        expect(kikkerRoundOver(view([3, 24], [3, 20]), false, 25)).toBeNull();
        expect(kikkerRoundOver(view([3, 24], [1, 26]), false, 25)).toBe('right');
        expect(kikkerRoundOver(view([3, 25], [3, 3]), false, 25)).toBe('left');
        expect(kikkerRoundOver(view([3, 24], [0, 3]), false, 25)).toBe('left');
    });
});

describe('Kikkers en vliegjes: a long match never runs out of sums', () => {
    test('Tot 25 with only flies: 25 right answers in round 1, and round 2 still gives both frogs a sum', () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        du().begin({ meta: meta({ spelers: '2' }), from, rule: kikkerRule('doel', () => 'fly'), config: { players: 2, level: 'normaal', lives: 3, bestOf: 3, stream: 'own', readyMs: 0 } });
        for (let i = 0; i < KIKKER.goal; i++) {
            du().answer('left', q('left').answer);
            vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        }
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        vi.advanceTimersByTime(KIKKER.cardMs);
        du().nextRound();
        expect(du().sides.left.question).not.toBeNull();
        expect(du().sides.right.question).not.toBeNull();
    });
});

describe('Kikkers en vliegjes: the screen on the engine', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        vi.setSystemTime(1_000_000);
    });
    const ready = () => tick(DUEL_TIMING.readyMs);

    test('Tot 25, 2 spelers: right answers snap bugs for points (a tongue each), mistakes cost lives with a dizzy frog; 25 takes the round', () => {
        render(<Kikkers meta={meta({ spelers: '2', levens: '3', winnen: 'doel' })} from={from} onExit={() => { }} />);
        expect(screen.getByText(/Wie eerst 25 punten heeft/)).toBeTruthy();
        ready();
        expect(du().roundEndsAt).toBeNull();
        expect(document.querySelector('.kv-scene')!.getAttribute('data-bugs')).toBe(String(POND.count));
        act(() => du().answer('left', q('left').answer));
        expect(du().sides.left.points).toBeGreaterThanOrEqual(1);
        expect(document.querySelectorAll('.kv-tongue')).toHaveLength(1);
        expect(document.querySelector('.kv-popup')).toBeTruthy();
        expect(document.querySelector('.kv-frog-at.is-left .kv-lunge')).toBeTruthy();
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('right', wrongOf(q('right').answer)));
        expect(du().sides.right.lives).toBe(2);
        expect(document.querySelector('.kv-frog-at.is-right .kv-sway')).toBeTruthy();
        expect(document.querySelector('.kv-splash')).toBeTruthy();
        // Keep scoring until 25.
        while (du().phase === 'play') {
            tick(DUEL_TIMING.flashRight);
            act(() => du().answer('left', q('left').answer));
        }
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(du().sides.left.points).toBeGreaterThanOrEqual(KIKKER.goal);
        expect(document.querySelector('.kv-frog-at.is-left .kv-frog.is-cheer')).toBeTruthy();
        expect(document.querySelector('.kv-frog-at.is-right .kv-frog.is-flop')).toBeTruthy();
        tick(KIKKER.cardMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        expect(within(card).getByText(/Blauw: \d+ punten/)).toBeTruthy();
    });

    test('Op tijd: a 2-minute round clock; at the end the frog with the most points wins; 0 lives ends it sooner', () => {
        render(<Kikkers meta={meta({ spelers: '2', levens: '3' })} from={from} onExit={() => { }} />);
        ready();
        expect(du().roundEndsAt).toBe(Date.now() + KIKKER.seconds * 1000);
        act(() => du().answer('right', q('right').answer));
        tick(KIKKER.seconds * 1000);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'right' });
        tick(KIKKER.cardMs);
        act(() => du().nextRound());
        ready();
        expect(du().sides.right.points).toBe(0);
        expect(document.querySelector('.kv-frog.is-flop')).toBeNull();
        for (let i = 0; i < 3; i++) {
            act(() => du().answer('left', wrongOf(q('left').answer)));
            tick(DUEL_TIMING.flashWrong);
        }
        // Oranje's second round: the match (best of 3).
        expect(du()).toMatchObject({ phase: 'matchEnd', roundWinner: 'right', matchWinner: 'right' });
    });

    test('Moeilijk: a time-out costs a life too; 1 speler plays the computer', () => {
        render(<Kikkers meta={meta({ spelers: '1', niveau: 'moeilijk', levens: '3' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.99 } })));
        ready();
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        const limit = du().sides.left.limitMs!;
        tick(limit + 10);
        expect(du().sides.left.lives).toBe(2);
    });
});
