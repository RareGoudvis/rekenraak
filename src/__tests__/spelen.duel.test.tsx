// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import SpelOptions from '../oefenen/spelen/SpelOptions';
import Touwtrekken from '../oefenen/spelen/skins/touwtrekken/Touwtrekken';
import { TOUW } from '../oefenen/spelen/skins/touwtrekken/rule';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { playRecipe } from '../oefenen/spelen/sound';
import { BOT, botTurn } from '../oefenen/spelen/duel/bot';
import { duelConfigOf, duelOptions } from '../oefenen/spelen/duel/options';
import {
    DUEL_TIMING, SHARED_TRIES, SUM_CLOCK, applyEffect, defaultRoundOver, freshSideView, hitRule, leadOf, matchWinnerOf, ropeOf, ropeRule, sumLimitMs, winsNeeded, wrongOf,
} from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelEventMap, DuelLevel, DuelRule, Side } from '../oefenen/spelen/duel/types';

// The duel engine (spelen/duel/): the pure rules (Moeilijk clock, best of, effects, round end), the bot's pacing
// against a simulated pupil, the store (streams, lives, flights, timers, rounds, the bot) and Touwtrekken on it.

let from: SpelFrom;
let meta: SkinMeta;
const du = () => useDuelStore.getState();
const wrongAnswer = (answer: string) => String(Number(answer) + 1);
const q = (side: Side) => du().sides[side].question!;
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'normaal', lives: 3, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const begin = (config: Partial<DuelConfig> = {}, rule: DuelRule = {}) => du().begin({ meta, from, rule, config: cfg(config) });
const rightBy = (side: Side) => du().answer(side, q(side).answer);
const wrongBy = (side: Side) => du().answer(side, wrongAnswer(q(side).answer));

// Seeded randomness (mulberry32): the simulations give the same numbers every run.
function mulberry32(seed: number) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
    meta = skinById('touwtrekken')!.meta;
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('duel rules (pure)', () => {
    test('the Moeilijk clock: 10 s, 0.4 s less per right answer, never under 4 s', () => {
        expect([0, 1, 5, 10, 15, 30].map(sumLimitMs)).toEqual([10_000, 9_600, 8_000, 6_000, 4_000, 4_000]);
        expect(SUM_CLOCK).toEqual({ startMs: 10_000, stepMs: 400, floorMs: 4_000 });
    });

    test('best of: 1, 2 or 3 round wins take the match', () => {
        expect([1, 3, 5].map(n => winsNeeded(n as 1 | 3 | 5))).toEqual([1, 2, 3]);
        expect(matchWinnerOf({ left: 1, right: 1 }, 3)).toBeNull();
        expect(matchWinnerOf({ left: 2, right: 1 }, 3)).toBe('left');
        expect(matchWinnerOf({ left: 0, right: 1 }, 1)).toBe('right');
        expect(matchWinnerOf({ left: 2, right: 2 }, 5)).toBeNull();
    });

    test('effects: lives never below 0 nor over the ceiling, points add, a flag of 0 clears', () => {
        const sides = { left: freshSideView(3), right: freshSideView(3) };
        const a = applyEffect(sides, { damage: { right: 5, left: -2 }, points: { left: 4 }, flags: { left: { guard: 1, shield: 2 } } }, 4);
        expect([a.left.lives, a.right.lives, a.left.points]).toEqual([4, 0, 4]);
        expect(a.left.flags).toEqual({ guard: 1, shield: 2 });
        expect(applyEffect(a, { flags: { left: { guard: 0 } } }).left.flags).toEqual({ shield: 2 });
        expect(applyEffect(sides, {})).toEqual(sides);
    });

    test('the default round end: 0 lives loses, both = a draw; the clock: more lives, then more points', () => {
        const v = (l: number, r: number, lp = 0, rp = 0) => ({ sides: { left: { ...freshSideView(l), points: lp }, right: { ...freshSideView(r), points: rp } }, config: cfg() });
        expect(defaultRoundOver(v(0, 2), false)).toBe('right');
        expect(defaultRoundOver(v(2, 0), false)).toBe('left');
        expect(defaultRoundOver(v(0, 0), false)).toBe('draw');
        expect(defaultRoundOver(v(1, 2), false)).toBeNull();
        expect(defaultRoundOver(v(1, 2), true)).toBe('right');
        expect(defaultRoundOver(v(2, 2, 7, 3), true)).toBe('left');
        expect(defaultRoundOver(v(2, 2, 3, 3), true)).toBe('draw');
    });

    test('ready-made rules: a hit, a special every n in a row, the rope', () => {
        const ctx = (side: Side, streak: number) => ({ side, other: side === 'left' ? 'right' as const : 'left' as const, me: freshSideView(3), them: freshSideView(3), streak, level: 'normaal' as const, round: 1, config: cfg() });
        expect(hitRule().right!(ctx('left', 1))).toEqual({ damage: { right: 1 } });
        const special = hitRule({ every: 3, damage: 2 });
        expect([1, 2, 3, 6].map(n => special.right!(ctx('right', n)).damage)).toEqual([{ left: 1 }, { left: 1 }, { left: 2 }, { left: 2 }]);
        expect(ropeRule.right!(ctx('left', 1))).toEqual({ damage: { right: 1, left: -1 } });
        expect(ropeRule.maxLives!(cfg({ lives: 5 }))).toBe(10);
        expect(ropeOf({ left: { lives: 7 }, right: { lives: 3 } })).toBe(-2);
        expect(wrongOf('12', () => 0.9)).toBe('11');
        expect(wrongOf('0', () => 0.9)).toBe('1');
        expect(wrongOf('3,5')).toBe('?');
        // A game's own sound: silent without Web Audio, never a throw.
        expect(() => playRecipe(() => { throw new Error('never called'); })).not.toThrow();
    });

    test('the shared options: spelers, niveau, levens, rondes, then the extras; picks make the config', () => {
        const opts = duelOptions({ lives: { label: 'Hoe ver?', unit: n => `${n} stappen` }, extras: [{ id: 'x', label: 'X', default: 'a', choices: [{ value: 'a', label: 'A' }] }] });
        expect(opts.map(o => o.id)).toEqual(['spelers', 'niveau', 'levens', 'rondes', 'x']);
        expect(opts.map(o => o.default)).toEqual(['2', 'normaal', '5', '3', 'a']);
        expect(opts[2].choices.map(c => c.label)).toEqual(['3 stappen', '5 stappen', '7 stappen']);
        expect(opts[3].choices.map(c => c.label)).toEqual(['1 ronde', 'Beste van 3', 'Beste van 5']);
        expect(duelConfigOf({})).toEqual({ players: 2, level: 'normaal', lives: 5, bestOf: 3, stream: 'own' });
        expect(duelConfigOf({ spelers: '1', niveau: 'moeilijk', levens: '7', rondes: '5', manier: 'beurt' })).toEqual({ players: 1, level: 'moeilijk', lives: 7, bestOf: 5, stream: 'own' });
        expect(duelConfigOf({ spelers: '2', manier: 'beurt', rondes: '4' }, { roundSeconds: 60 })).toMatchObject({ stream: 'shared', bestOf: 3, roundSeconds: 60 });
    });
});

describe('the bot', () => {
    test('pacing: Moeilijk is quicker and surer than Normaal; ahead it eases off, behind it pushes a little', () => {
        const avg = (level: DuelLevel, lead = 0) => {
            const rnd = mulberry32(3);
            let ms = 0, right = 0;
            for (let i = 0; i < 2000; i++) { const t = botTurn(level, lead, 2, rnd); ms += t.delayMs; right += t.correct ? 1 : 0; }
            return { ms: ms / 2000, right: right / 2000 };
        };
        const n = avg('normaal'), m = avg('moeilijk');
        expect(m.ms).toBeLessThan(n.ms);
        expect(m.right).toBeGreaterThan(n.right);
        expect(n.ms).toBeGreaterThan(BOT.normaal.minMs);
        expect(avg('normaal', 1).ms).toBeGreaterThan(n.ms * 1.3);
        expect(avg('normaal', 1).right).toBeLessThan(n.right);
        expect(avg('normaal', -1).ms).toBeLessThan(n.ms);
        // A longer answer takes longer to type.
        expect(botTurn('normaal', 0, 5, () => 0.5).delayMs - botTurn('normaal', 0, 2, () => 0.5).delayMs).toBe(3 * BOT.perCharMs);
        expect(leadOf(freshSideView(5), { ...freshSideView(5), lives: 0 }, 5)).toBe(1);
    });

    // One round, 5 lives, a right answer takes 1 off the other: a pupil (an answer every minMs–maxMs, pRight right)
    // against the bot, with the engine's flash times and, on Moeilijk, the sum clock (a slow answer times out).
    function round(level: DuelLevel, rnd: () => number, kid = { minMs: 4_000, maxMs: 7_000, pRight: 0.85 }, lives = 5): Side {
        const s = { left: { ...freshSideView(lives) }, right: { ...freshSideView(lives) } };
        const next = { left: 0, right: 0 };
        const turn = (side: Side, at: number) => {
            const me = s[side], them = s[side === 'left' ? 'right' : 'left'];
            const t = side === 'left'
                ? { delayMs: kid.minMs + (kid.maxMs - kid.minMs) * rnd(), correct: rnd() < kid.pRight }
                : botTurn(level, leadOf(me, them, lives), 2, rnd);
            const limit = level === 'moeilijk' ? sumLimitMs(me.right) : Infinity;
            const right = t.correct && t.delayMs <= limit;
            return { at: at + Math.min(t.delayMs, limit), right };
        };
        let pend = { left: turn('left', 0), right: turn('right', 0) };
        for (;;) {
            const side: Side = pend.left.at <= pend.right.at ? 'left' : 'right';
            const other: Side = side === 'left' ? 'right' : 'left';
            const { at, right } = pend[side];
            if (right) { s[side].right++; s[other].lives--; if (s[other].lives <= 0) return side; }
            next[side] = at + (right ? DUEL_TIMING.flashRight : DUEL_TIMING.flashWrong);
            pend = { ...pend, [side]: turn(side, next[side]) };
        }
    }
    const winRate = (level: DuelLevel, kid?: Parameters<typeof round>[2]) => {
        const rnd = mulberry32(42);
        let won = 0;
        for (let i = 0; i < 1000; i++) if (round(level, rnd, kid) === 'left') won++;
        return won / 1000;
    };

    test('a 9-year-old beats Normaal most of the time; Moeilijk is a real fight', () => {
        expect(winRate('normaal')).toBeGreaterThanOrEqual(0.75);
        const hard = winRate('moeilijk');
        expect(hard).toBeGreaterThan(0.3);
        expect(hard).toBeLessThan(0.7);
        // A slower pupil (6–9 s, 80 %) still wins Normaal more often than not; a quick sure one wins Moeilijk.
        expect(winRate('normaal', { minMs: 6_000, maxMs: 9_000, pRight: 0.8 })).toBeGreaterThan(0.5);
        expect(winRate('moeilijk', { minMs: 2_500, maxMs: 4_500, pRight: 0.95 })).toBeGreaterThan(0.75);
    });
});

describe('the duel store', () => {
    test('own streams: each side its own sums; a right answer takes a life off the other; events in order', () => {
        const seen: string[] = [];
        const ev = du().events;
        const offs = (['right', 'wrong', 'damage', 'roundEnd'] as const).map(n => ev.on(n, p => seen.push(`${n}:${(p as { side?: Side; winner?: Side }).side ?? (p as { winner?: Side }).winner}`)));
        begin();
        expect(du().phase).toBe('play');
        const r1 = q('right');
        rightBy('left');
        expect([du().sides.left.lives, du().sides.right.lives]).toEqual([3, 2]);
        expect(q('right')).toBe(r1);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        expect(du().sides.left.history).toHaveLength(1);
        expect(du().sides.right.history).toHaveLength(0);
        wrongBy('right');
        expect(du().sides.right.feedback).toMatchObject({ correct: false, expected: r1.answer });
        // No second answer during the flash.
        du().answer('right', r1.answer);
        expect(du().sides.left.lives).toBe(3);
        expect(seen).toEqual(['right:left', 'damage:right', 'wrong:right']);
        offs.forEach(off => off());
    });

    test('rounds and best of 3: the round card after cardMs, Volgende ronde, the match after 2 round wins', () => {
        const ends: DuelEventMap['matchEnd'][] = [];
        const off = du().events.on('matchEnd', e => ends.push(e));
        begin({ lives: 2 });
        const winRound = (side: Side) => {
            for (let i = 0; i < 2; i++) { rightBy(side); vi.advanceTimersByTime(DUEL_TIMING.flashRight); }
        };
        winRound('left');
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left', card: false });
        expect(du().sides.left.wins).toBe(1);
        // Nothing moves between rounds.
        du().answer('right', q('right').answer);
        expect(du().sides.left.lives).toBe(2);
        vi.advanceTimersByTime(DUEL_TIMING.cardMs);
        expect(du().card).toBe(true);
        du().nextRound();
        expect(du()).toMatchObject({ phase: 'play', round: 2, card: false });
        expect([du().sides.left.lives, du().sides.right.lives, du().sides.left.wins]).toEqual([2, 2, 1]);
        winRound('right');
        vi.advanceTimersByTime(DUEL_TIMING.cardMs);
        du().nextRound();
        winRound('left');
        expect(du()).toMatchObject({ phase: 'matchEnd', matchWinner: 'left' });
        expect(ends).toEqual([{ winner: 'left', wins: { left: 2, right: 1 } }]);
        expect(du().sides.left.totalRight).toBe(4);
        du().nextRound();
        expect(du().phase).toBe('matchEnd');
        du().again();
        expect(du()).toMatchObject({ phase: 'play', round: 1, matchWinner: null });
        expect(du().sides.left.wins).toBe(0);
        off();
    });

    test('the ready banner: no sums until readyMs has passed', () => {
        const plays: number[] = [];
        const off = du().events.on('play', e => plays.push(e.round));
        begin({ readyMs: 1000 });
        expect(du().phase).toBe('ready');
        expect(du().sides.left.question).toBeNull();
        vi.advanceTimersByTime(1000);
        expect(du().phase).toBe('play');
        expect(q('left')).toBeTruthy();
        expect(plays).toEqual([1]);
        off();
    });

    test('Moeilijk: a clock per sum per side that shortens with that side\'s right answers; a time-out counts as wrong', () => {
        const outs: Side[] = [];
        const off = du().events.on('timeout', e => outs.push(e.side));
        begin({ level: 'moeilijk', lives: 5 }, { timeout: ({ side }) => ({ damage: { [side]: 1 } }) });
        expect(du().sides.left.limitMs).toBe(10_000);
        rightBy('left');
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        expect(du().sides.left.limitMs).toBe(9_600);
        expect(du().sides.right.limitMs).toBe(10_000);
        // The right side's first sum (10 s from the start) runs out first, then the left's second (9.6 s after its flash).
        vi.advanceTimersByTime(10_000 - DUEL_TIMING.flashRight - 1);
        expect(outs).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(outs).toEqual(['right']);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        expect(outs).toEqual(['right', 'left']);
        expect(du().sides.left).toMatchObject({ streak: 0, wrong: 1, lives: 4 });
        expect(du().sides.left.feedback).toMatchObject({ correct: false, given: '' });
        expect(du().sides.left.history.at(-1)).toMatchObject({ correct: false });
        // Normaal: no clock at all.
        begin({ level: 'normaal' });
        expect(du().sides.left.limitMs).toBeNull();
        vi.advanceTimersByTime(60_000);
        expect(du().sides.left.feedback).toBeNull();
        off();
    });

    test('shared stream: one sum; the first right answer takes it; a wrong one locks for 2 s, then a retry; two wrong = out', () => {
        begin({ stream: 'shared', lives: 5 });
        const s1 = q('left');
        expect(q('right')).toBe(s1);
        wrongBy('left');
        expect(du().sides.left).toMatchObject({ locked: true, tries: 1, out: false });
        du().answer('left', s1.answer);
        expect(du().sides.left.right).toBe(0);
        vi.advanceTimersByTime(DUEL_TIMING.wrongLockMs);
        expect(du().sides.left.locked).toBe(false);
        rightBy('left');
        expect([du().sides.right.lives, du().sides.right.locked]).toEqual([4, true]);
        expect(du().sides.right.feedback).toMatchObject({ correct: false, given: '' });
        vi.advanceTimersByTime(DUEL_TIMING.sharedNext);
        const s2 = q('left');
        expect(s2).not.toBe(s1);
        for (let i = 0; i < SHARED_TRIES; i++) { wrongBy('right'); vi.advanceTimersByTime(DUEL_TIMING.wrongLockMs); }
        expect(du().sides.right).toMatchObject({ out: true, locked: true });
        // The other side may still take it.
        expect(q('left')).toBe(s2);
        wrongBy('left'); vi.advanceTimersByTime(DUEL_TIMING.wrongLockMs); wrongBy('left');
        expect(du().sides.left.feedback).toMatchObject({ expected: s2.answer });
        vi.advanceTimersByTime(DUEL_TIMING.flashWrong);
        expect(q('left')).not.toBe(s2);
        expect(du().shared).toHaveLength(2 + 2 * SHARED_TRIES);
    });

    test('flights: a launch lands later and does its damage then; the round ends on the landing; the rule may read flags', () => {
        const rule: DuelRule = {
            right: ({ other }) => ({ launch: { ms: 3000, tag: 'meteor', data: { size: 2 }, effect: { damage: { [other]: 1 } } } }),
            wrong: ({ side }) => ({ flags: { [side]: { guard: 1 } } }),
            land: ({ them }, f) => (them.flags.guard ? { damage: { [f.to]: 2 }, flags: { [f.to]: { guard: 0 } }, tag: 'double' } : f.effect),
        };
        const landed: DuelEventMap['land'][] = [];
        const hits: DuelEventMap['damage'][] = [];
        const offs = [du().events.on('land', e => landed.push(e)), du().events.on('damage', e => hits.push(e))];
        begin({ lives: 3 }, rule);
        rightBy('left');
        expect(du().flights).toHaveLength(1);
        expect(du().flights[0]).toMatchObject({ from: 'left', to: 'right', tag: 'meteor', data: { size: 2 } });
        expect(du().sides.right.lives).toBe(3);
        wrongBy('right');
        expect(du().sides.right.flags).toEqual({ guard: 1 });
        vi.advanceTimersByTime(3000);
        expect(du().flights).toHaveLength(0);
        expect(du().sides.right).toMatchObject({ lives: 1, flags: {} });
        expect(hits).toEqual([{ side: 'right', by: 'left', amount: 2, lives: 1, tag: 'double' }]);
        expect(landed).toHaveLength(1);
        rightBy('left');
        expect(du().phase).toBe('play');
        vi.advanceTimersByTime(3000);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        // A game-driven effect (a bug flies off) goes through the same path.
        begin();
        du().effect('right', { points: { right: 5 } });
        expect(du().sides.right.points).toBe(5);
        offs.forEach(off => off());
    });

    test('the round clock: at 0 the side with more lives wins', () => {
        begin({ roundSeconds: 30, lives: 5 });
        rightBy('right');
        expect(du().roundEndsAt).toBe(Date.now() + 30_000);
        vi.advanceTimersByTime(30_000);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'right' });
    });

    test('1 speler: the bot answers the right side by itself; the human cannot answer for it', () => {
        begin({ players: 1, lives: 5, rng: mulberry32(9) });
        const bq = q('right');
        du().answer('right', bq.answer);
        expect(du().sides.right.history).toHaveLength(0);
        vi.advanceTimersByTime(BOT.normaal.minMs - 1);
        expect(du().sides.right.feedback).toBeNull();
        vi.advanceTimersByTime(BOT.normaal.maxMs);
        expect(du().sides.right.history).toHaveLength(1);
        // Left alone for a minute, the bot wins the round.
        vi.advanceTimersByTime(120_000);
        expect(du().phase).toBe('roundEnd');
        expect(du().roundWinner).toBe('right');
        expect(du().sides.right.right).toBeGreaterThanOrEqual(5);
    });

    test('1 speler, shared stream: the bot waits out its lock and tries again; a human right answer stops it', () => {
        begin({ players: 1, stream: 'shared', lives: 5, rng: () => 0.01 });
        // rng 0.01: every bot answer is a quick miss.
        vi.advanceTimersByTime(60_000);
        expect(du().sides.right).toMatchObject({ out: true, tries: SHARED_TRIES });
        rightBy('left');
        expect(du().sides.right.lives).toBe(4);
    });
});

describe('Touwtrekken on the engine', () => {
    const pad = (team: string) => screen.getByRole('group', { name: `Cijfers ${team}` });
    const down = (team: string, key: string) => {
        const b = pad(team).querySelector(`[data-key="${key}"]`)!;
        fireEvent.pointerDown(b, { pointerId: team === 'Blauw' ? 1 : 2, pointerType: 'touch', isPrimary: team === 'Blauw' });
    };
    const type = (team: string, answer: string) => { for (const d of answer) down(team, d); down(team, 'ok'); };
    const two = (picks: Record<string, string> = {}) => resolveMeta(meta, { spelers: '2', levens: '3', ...picks });
    const ready = () => act(() => { vi.advanceTimersByTime(DUEL_TIMING.readyMs); });

    test('the registry entry and its options: 1 or 2 spelers, how far, rondes, manier for 2', () => {
        const e = skinById('touwtrekken')!;
        expect(e.meta).toMatchObject({ id: 'touwtrekken', players: '1-2', timed: false });
        expect(e.Screen && !e.Component).toBe(true);
        expect(e.meta.options!.map(o => o.id)).toEqual(['spelers', 'niveau', 'levens', 'rondes', 'manier']);
        render(<SpelOptions meta={meta} onStart={() => { }} onBack={() => { }} />);
        expect(screen.getByRole('button', { name: '5 stappen' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Beste van 3' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '1 speler' }));
        expect(screen.queryByRole('button', { name: 'Samen één som' })).toBeNull();
    });

    test('both keypads in the same tick; each right answer pulls the rope; 3 steps win the round; the round card', () => {
        render(<Touwtrekken meta={two()} from={from} onExit={vi.fn()} />);
        expect(du().phase).toBe('ready');
        ready();
        expect(du().config).toMatchObject({ lives: 3, roundSeconds: TOUW.seconds, stream: 'own' });
        const a = q('left').answer, b = q('right').answer;
        act(() => {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i]) down('Blauw', a[i]);
                if (b[i]) down('Oranje', b[i]);
            }
            down('Blauw', 'ok');
            down('Oranje', 'ok');
        });
        expect(du().sides.left.right + du().sides.right.right).toBe(2);
        expect(document.querySelector('.tt-pull')!.getAttribute('data-rope')).toBe('0');
        expect(screen.getAllByText('Trek!')).toHaveLength(2);
        act(() => { vi.advanceTimersByTime(DUEL_TIMING.flashRight); });
        expect(within(pad('Blauw')).getByLabelText('Antwoord').textContent).toBe('');
        for (let i = 0; i < 3; i++) {
            act(() => type('Oranje', q('right').answer));
            act(() => { vi.advanceTimersByTime(DUEL_TIMING.flashRight); });
        }
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'right' });
        expect(document.querySelector('.tt-pull')!.getAttribute('data-rope')).toBe('3');
        expect(document.querySelector('.tt-bear.is-right .is-cheer')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        act(() => { vi.advanceTimersByTime(TOUW.cardMs); });
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Oranje wint ronde 1!' })).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        expect(du()).toMatchObject({ phase: 'ready', round: 2 });
        expect(document.querySelector('.duel-banner')!.textContent).toBe('Ronde 2');
    });

    test('the match end: the winner, Nog eens restarts the match, Terug leaves', () => {
        const onExit = vi.fn();
        render(<Touwtrekken meta={two({ rondes: '1' })} from={from} onExit={onExit} />);
        ready();
        for (let i = 0; i < 3; i++) {
            act(() => type('Blauw', q('left').answer));
            act(() => { vi.advanceTimersByTime(DUEL_TIMING.flashRight); });
        }
        act(() => { vi.advanceTimersByTime(TOUW.cardMs); });
        expect(screen.getByRole('heading', { name: 'Blauw wint!' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Nakijken|Hoe los ik dit op/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Nog eens/ }));
        expect(du()).toMatchObject({ phase: 'ready', round: 1 });
        fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
        fireEvent.click(screen.getByRole('button', { name: 'Ja, stoppen' }));
        expect(onExit).toHaveBeenCalledOnce();
        expect(du().phase).toBe('idle');
    });

    test('1 speler against the computer: one keypad, the computer\'s face on the right; Moeilijk shows a ring per side', () => {
        render(<Touwtrekken meta={resolveMeta(meta, { spelers: '1', niveau: 'moeilijk' })} from={from} onExit={vi.fn()} />);
        ready();
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Cijfers Computer' })).toBeNull();
        expect(document.querySelector('.duel-half.is-right .duel-bot')).toBeTruthy();
        expect(document.querySelectorAll('.duel-ring')).toHaveLength(2);
        // The one human keypad takes the keyboard too.
        const a = q('left').answer;
        act(() => { for (const k of a) fireEvent.keyDown(window, { key: k }); fireEvent.keyDown(window, { key: 'Enter' }); });
        expect(du().sides.left.right).toBe(1);
    });

    test('Samen één som: one sum on both halves; the other side reads who was quicker', () => {
        render(<Touwtrekken meta={two({ manier: 'beurt' })} from={from} onExit={vi.fn()} />);
        ready();
        expect(q('left')).toBe(q('right'));
        act(() => type('Blauw', wrongAnswer(q('left').answer)));
        expect(screen.getByText('Even wachten…')).toBeTruthy();
        expect(document.querySelector('.duel-sign-answer')).toBeNull();
        act(() => type('Oranje', q('right').answer));
        expect(screen.getByText('De ander was sneller!')).toBeTruthy();
        expect(document.querySelectorAll('.duel-sign-answer')).toHaveLength(2);
    });
});
