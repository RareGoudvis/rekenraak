// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import type { DuelConfig, DuelLevel, DuelRule, DuelStream } from '../oefenen/spelen/duel/types';
import { ROBOT_RULE } from '../oefenen/spelen/skins/robotduel/rule';
import { METEOR_RULE } from '../oefenen/spelen/skins/meteorietenregen/rule';
import { TAART_RULE } from '../oefenen/spelen/skins/taartgevecht/rule';
import { KASTEEL_RULE } from '../oefenen/spelen/skins/kasteel/rule';
import { TOUW, TOUW_RULE } from '../oefenen/spelen/skins/touwtrekken/rule';
import { KIKKER, kikkerRule } from '../oefenen/spelen/skins/kikkers/rule';
import { TOVER, TOVER_RULE } from '../oefenen/spelen/skins/tovenaarsduel/rule';
import { KIDS, mulberry32, simulateRounds, type KidModel } from './helpers/duelSim';

// The computer opponent (duel/bot.ts) against simulated pupils, through the real store and every duel game's own
// rule (flights, shields, specials, the shared race of Taartgevecht, the rope's clock, the frogs' points), at each
// of the four levels (Makkelijk no clock, the others the shared clock per sum, levels/clock.ts).
// Owner target (2026-11-17) for a 9-year-old (4–7 s per answer, 85 % right): 85+ % pupil round wins on Makkelijk,
// about 2 in 3 on Normaal, about 1 in 3 on Moeilijk, under 20 % on Onmogelijk; close matches for slower and faster pupils.
// Measured 2026-11-18 (200 rounds per cell, 5 lives, seed 42; SIM_PRINT=1 prints it), pupil round wins:
//   game               avg M / N / Mo / O    slower M / N   fast Mo
//   robotduel            86 / 63 / 35 / 16      78 / 49        73
//   meteorietenregen     96 / 63 / 33 /  7      93 / 45        71
//   taartgevecht        100 / 73 / 28 /  2      98 / 57        57
//   kasteel              89 / 55 / 25 /  7      81 / 42        70
//   touwtrekken          97 / 75 / 50 / 12      90 / 57        73
//   kikkers              88 / 60 / 35 / 10      75 / 49        60
//   tovenaarsduel        99 / 64 / 25 /  1      99 / 47        72
//   mean                 93 / 64 / 33 /  7
// (At 10 lives, the game default, a check run gave about the same means: the rubber band keeps the levels apart.)

let from: SpelFrom;
beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    // The exercise generators draw from Math.random: seed it too, or the rates drift a few points per run and a band edge flakes.
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(2026));
});
afterEach(() => { useDuelStore.getState().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

const bugs = mulberry32(7);
// The pond's mix, roughly: mostly flies, some beetles, now and then a golden dragonfly.
const bug = () => { const x = bugs(); return x < 0.7 ? 'fly' as const : x < 0.95 ? 'beetle' as const : 'dragonfly' as const; };

interface Game { id: string; rule: DuelRule; stream?: DuelStream; extra?: Partial<DuelConfig>; lives?: number }
const GAMES: Game[] = [
    { id: 'robotduel', rule: ROBOT_RULE },
    { id: 'meteorietenregen', rule: METEOR_RULE },
    { id: 'taartgevecht', rule: TAART_RULE, stream: 'shared', extra: { wrongLockMs: 2000 } },
    { id: 'kasteel', rule: KASTEEL_RULE },
    { id: 'touwtrekken', rule: TOUW_RULE, extra: { roundSeconds: TOUW.seconds } },
    { id: 'kikkers', rule: kikkerRule('tijd', bug), extra: { roundSeconds: KIKKER.seconds } },
    { id: 'tovenaarsduel', rule: TOVER_RULE, lives: TOVER.lives.default },
];
const ROUNDS = 200;

const rate = (g: Game, level: DuelLevel, kid: KidModel) => simulateRounds({
    meta: resolveMeta(skinById(g.id)!.meta, { spelers: '1' }), from, rule: g.rule, level, kid, rounds: ROUNDS, stream: g.stream, extra: g.extra, lives: g.lives,
}).kidWins;

const LEVEL_ROWS: DuelLevel[] = ['makkelijk', 'normaal', 'moeilijk', 'onmogelijk'];
const pct = (x: number) => String(Math.round(x * 100)).padStart(4);

describe('the bot against simulated pupils, every duel game', () => {
    test('a 9-year-old: 85+ % on Makkelijk, about 2 in 3 on Normaal, about 1 in 3 on Moeilijk, under 20 % on Onmogelijk', () => {
        const by: Record<DuelLevel, number[]> = { makkelijk: [], normaal: [], moeilijk: [], onmogelijk: [] };
        for (const g of GAMES) {
            const r = LEVEL_ROWS.map(l => rate(g, l, KIDS.average));
            if (process.env.SIM_PRINT) console.log(g.id.padEnd(18), r.map(pct).join(''));
            const [rk, rn, rm, ro] = r;
            expect(rk, `${g.id} makkelijk`).toBeGreaterThan(0.75);
            expect(rn, `${g.id} normaal`).toBeGreaterThan(0.5);
            expect(rn, `${g.id} normaal`).toBeLessThan(0.85);
            // Tovenaarsduel's spells come in bursts, so at its 20-life default Moeilijk sits near 10 %; the mean below still holds.
            expect(rm, `${g.id} moeilijk`).toBeGreaterThan(g.id === 'tovenaarsduel' ? 0.04 : 0.12);
            expect(rm, `${g.id} moeilijk`).toBeLessThan(0.55);
            expect(ro, `${g.id} onmogelijk`).toBeLessThan(0.3);
            // Every step up is harder.
            expect(rk).toBeGreaterThan(rn);
            expect(rn).toBeGreaterThan(rm);
            expect(rm).toBeGreaterThan(ro);
            LEVEL_ROWS.forEach((l, i) => by[l].push(r[i]));
        }
        const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
        if (process.env.SIM_PRINT) console.log('mean'.padEnd(18), LEVEL_ROWS.map(l => pct(mean(by[l]))).join(''));
        expect(mean(by.makkelijk)).toBeGreaterThan(0.85);
        expect(mean(by.normaal)).toBeGreaterThan(0.62);
        expect(mean(by.normaal)).toBeLessThan(0.72);
        expect(mean(by.moeilijk)).toBeGreaterThan(0.28);
        expect(mean(by.moeilijk)).toBeLessThan(0.4);
        expect(mean(by.onmogelijk)).toBeLessThan(0.2);
    }, 240_000);

    test('slower and faster pupils still get a match: the slower wins Makkelijk and Normaal often, the fast one does not sweep Moeilijk', () => {
        for (const g of GAMES) {
            const easy = rate(g, 'makkelijk', KIDS.slower), slow = rate(g, 'normaal', KIDS.slower), fast = rate(g, 'moeilijk', KIDS.fast);
            if (process.env.SIM_PRINT) console.log(g.id.padEnd(18), 'slower makkelijk', pct(easy), 'slower normaal', pct(slow), 'fast moeilijk', pct(fast));
            expect(easy, `${g.id} slower makkelijk`).toBeGreaterThan(0.6);
            expect(slow, `${g.id} slower normaal`).toBeGreaterThan(0.3);
            expect(fast, `${g.id} fast moeilijk`).toBeGreaterThan(0.45);
            expect(fast, `${g.id} fast moeilijk`).toBeLessThan(0.9);
        }
    }, 240_000);
});
