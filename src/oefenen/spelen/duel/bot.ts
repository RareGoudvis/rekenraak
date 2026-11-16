import type { DuelLevel } from './types';

// The computer player (1 speler, the right side): when it answers and whether it gets the sum right. Pure,
// with the randomness injected, so the pacing is testable (spelen.duel.test simulates a pupil against it).

// THE tuning table. Checked by spelen.duel.test against a simulated 9-year-old (an answer every 4â€“7 s, 85 % right):
// Normaal = the pupil wins most rounds; Moeilijk = about even, a real fight.
export const BOT = {
    normaal: { minMs: 5_500, maxMs: 9_500, miss: 0.25 },
    moeilijk: { minMs: 3_600, maxMs: 6_400, miss: 0.12 },
    // A longer answer takes longer to type: per character past two.
    perCharMs: 350,
    // Ahead (lead > 0, up to 1): slower and sloppier; behind: a little quicker and surer. Gentle on purpose.
    ahead: { slower: 0.5, miss: 0.15 },
    behind: { quicker: 0.15, miss: 0.05 },
} as const;

export interface BotTurn { delayMs: number; correct: boolean }

/** The bot's next answer: after delayMs, right or wrong. lead = how far it is ahead, about âˆ’1..1 (rules.ts leadOf). */
export function botTurn(level: DuelLevel, lead: number, answerChars: number, rng: () => number): BotTurn {
    const t = BOT[level];
    // Two draws averaged: most answers come mid-range, as a person's do.
    const u = (rng() + rng()) / 2;
    let ms = t.minMs + (t.maxMs - t.minMs) * u + BOT.perCharMs * Math.max(0, answerChars - 2);
    let miss: number = t.miss;
    const l = Math.max(-1, Math.min(1, lead));
    if (l > 0) { ms *= 1 + BOT.ahead.slower * l; miss += BOT.ahead.miss * l; }
    else if (l < 0) { ms *= 1 + BOT.behind.quicker * l; miss += BOT.behind.miss * l; }
    return { delayMs: Math.round(ms), correct: rng() >= miss };
}
