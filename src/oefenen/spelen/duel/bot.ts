import type { DuelLevel } from './types';

// The computer player (1 speler, the right side): when it answers and whether it gets the sum right. Pure,
// with the randomness injected, so the pacing is testable (spelen.duel.test plays simulated pupils against it
// through the real store, for every duel game's rule).

// THE tuning table (owner 2026-11-16: "the cpu should be better"). Checked by spelen.duel.test against a
// simulated 9-year-old (an answer every 4–7 s, 85 % right): Normaal = the pupil wins about two rounds in three,
// Moeilijk = the computer wins about two in three. Slower and faster pupils get a match that stays close.
export const BOT = {
    normaal: { minMs: 4_400, maxMs: 7_800, miss: 0.18, paceTimes: 1.05 },
    moeilijk: { minMs: 3_200, maxMs: 5_800, miss: 0.1, paceTimes: 0.92 },
    // A longer answer takes longer to type: per character past two.
    perCharMs: 350,
    // How far the bot moves from its own pace toward the pupil's (times paceTimes), 0..1.
    follow: 0.85,
    // The rubber band, at a full lead (1) or a full deficit (−1): ahead it eases off, behind it pushes.
    ahead: { slower: 1, miss: 0.25 },
    behind: { quicker: 0.5, miss: 0.1 },
    // One shared sum (Taartgevecht): every sum is a straight race, so the bot follows a little slower.
    sharedPaceTimes: 0.05,
    // The miss chance follows the same ratio, within these bounds.
    missFollow: [0.4, 1.6] as [number, number],
    // Never quicker than a person can read and type.
    floorMs: 1_500,
};
export type BotTuning = typeof BOT;

export interface BotTurn { delayMs: number; correct: boolean }

export interface BotSituation {
    // How far the bot is ahead, about −1..1 (rules.ts leadOf).
    lead: number;
    answerChars: number;
    // The pupil's recent answer time (nextPace); null before the first answer.
    paceMs?: number | null;
    // Both race for one shared sum.
    shared?: boolean;
}

/** The bot's next answer: after delayMs, right or wrong. */
export function botTurn(level: DuelLevel, { lead, answerChars, paceMs = null, shared = false }: BotSituation, rng: () => number, tune: BotTuning = BOT): BotTurn {
    const t = tune[level];
    const typing = tune.perCharMs * Math.max(0, answerChars - 2);
    // Two draws averaged: most answers come mid-range, as a person's do.
    const u = (rng() + rng()) / 2;
    let ms = t.minMs + (t.maxMs - t.minMs) * u + typing;
    let miss: number = t.miss;
    if (paceMs !== null && paceMs > 0) {
        // A quick pupil meets a quicker and surer bot, a slow one a slower and sloppier bot.
        const own = (t.minMs + t.maxMs) / 2 + typing;
        const follow = 1 + tune.follow * ((paceMs * (t.paceTimes + (shared ? tune.sharedPaceTimes : 0))) / own - 1);
        ms *= follow;
        miss *= Math.max(tune.missFollow[0], Math.min(tune.missFollow[1], follow));
    }
    const l = Math.max(-1, Math.min(1, lead));
    if (l > 0) { ms *= 1 + tune.ahead.slower * l; miss += tune.ahead.miss * l; }
    else if (l < 0) { ms *= 1 + tune.behind.quicker * l; miss += tune.behind.miss * l; }
    return { delayMs: Math.round(Math.max(tune.floorMs, ms)), correct: rng() >= Math.max(0, miss) };
}

/** The pupil's pace after one more answer time: a running average that leans on the last few sums. */
export const nextPace = (pace: number | null, ms: number) => (pace === null ? ms : Math.round(pace * 0.65 + ms * 0.35));
