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
// rule (flights, shields, specials, the shared race of Taartgevecht, the rope's clock, the frogs' points).
// Owner target (2026-11-16) for a 9-year-old (4–7 s per answer, 85 % right): about 65–70 % pupil wins on
// Normaal and 30–35 % on Moeilijk, and close matches for slower and faster pupils.
// Measured 2026-11-16 (200 rounds per cell, seed 42; SIM_PRINT=1 prints it), pupil round wins:
//   game               average N / M   slower N   fast M     (old bot, average N / M)
//   robotduel            64 / 31          49         76        77 / 38
//   meteorietenregen     64 / 39          52         64        94 / 35
//   taartgevecht         77 / 33          72         58       100 / 23
//   kasteel              53 / 23          36         71        85 / 32
//   touwtrekken          75 / 28          59         77        98 / 39
//   kikkers              63 / 39          52         58        79 / 40
//   tovenaarsduel        72 / 20          47         68         -

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

describe('the bot against simulated pupils, every duel game', () => {
    test('a 9-year-old: about 2 in 3 on Normaal, about 1 in 3 on Moeilijk (each game near, all games on target)', () => {
        const n: number[] = [], m: number[] = [];
        for (const g of GAMES) {
            const rn = rate(g, 'normaal', KIDS.average), rm = rate(g, 'moeilijk', KIDS.average);
            if (process.env.SIM_PRINT) console.log(g.id.padEnd(18), Math.round(rn * 100), Math.round(rm * 100));
            expect(rn, `${g.id} normaal`).toBeGreaterThan(0.5);
            expect(rn, `${g.id} normaal`).toBeLessThan(0.85);
            expect(rm, `${g.id} moeilijk`).toBeGreaterThan(0.15);
            expect(rm, `${g.id} moeilijk`).toBeLessThan(0.5);
            n.push(rn); m.push(rm);
        }
        const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
        expect(mean(n)).toBeGreaterThan(0.62);
        expect(mean(n)).toBeLessThan(0.72);
        expect(mean(m)).toBeGreaterThan(0.28);
        expect(mean(m)).toBeLessThan(0.4);
    }, 120_000);

    test('slower and faster pupils still get a match: the slower wins Normaal often, the fast one does not sweep Moeilijk', () => {
        for (const g of GAMES) {
            const slow = rate(g, 'normaal', KIDS.slower), fast = rate(g, 'moeilijk', KIDS.fast);
            if (process.env.SIM_PRINT) console.log(g.id.padEnd(18), 'slower normaal', Math.round(slow * 100), 'fast moeilijk', Math.round(fast * 100));
            expect(slow, `${g.id} slower normaal`).toBeGreaterThan(0.3);
            expect(fast, `${g.id} fast moeilijk`).toBeGreaterThan(0.45);
            expect(fast, `${g.id} fast moeilijk`).toBeLessThan(0.9);
        }
    }, 120_000);
});
