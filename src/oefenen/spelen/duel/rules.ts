import { otherSide, SIDES, type DuelBestOf, type DuelEffect, type DuelRoundView, type DuelRule, type DuelSideView, type Side } from './types';

// The duel engine's pure rules: best of, applying an effect, the default round end,
// and ready-made rules a game can start from. No timers and no store here (spelen.duel.test).

export const DUEL_TIMING = {
    // Own stream: the flash after a right / wrong answer before the next sum.
    flashRight: 700,
    flashWrong: 1500,
    // Shared stream: the pause after the sum was taken (or missed by both) before the next one.
    sharedNext: 1000,
    // Shared stream: a wrong answer locks that keypad this long.
    wrongLockMs: 2000,
    // The "Ronde N" banner.
    readyMs: 1400,
    // The round's win moment before the scoreboard card.
    cardMs: 1600,
} as const;

// Shared stream: wrong tries per side on one sum before that side is out for it.
export const SHARED_TRIES = 2;

/** Round wins that take the match: best of 3 = 2. */
export const winsNeeded = (bestOf: DuelBestOf) => Math.floor(bestOf / 2) + 1;

/** The match winner once a side has enough round wins, else null. */
export function matchWinnerOf(wins: Record<Side, number>, bestOf: DuelBestOf): Side | null {
    const need = winsNeeded(bestOf);
    return SIDES.find(s => wins[s] >= need) ?? null;
}

/** A fresh side for a round. */
export const freshSideView = (lives: number): DuelSideView => ({ lives, points: 0, streak: 0, right: 0, wrong: 0, flags: {} });

/** Applies an effect's lives, points and flags (no launch: the store keeps flights). Lives stay within 0..max. */
export function applyEffect(sides: Record<Side, DuelSideView>, e: DuelEffect, maxLives = Infinity): Record<Side, DuelSideView> {
    const out = { ...sides };
    for (const s of SIDES) {
        const d = e.damage?.[s] ?? 0;
        const p = e.points?.[s] ?? 0;
        const f = e.flags?.[s];
        if (!d && !p && !f) continue;
        const flags = f ? Object.fromEntries(Object.entries({ ...out[s].flags, ...f }).filter(([, v]) => v !== 0)) : out[s].flags;
        out[s] = { ...out[s], lives: Math.min(maxLives, Math.max(0, out[s].lives - d)), points: out[s].points + p, flags };
    }
    return out;
}

/** The default round end: a side at 0 lives loses (both = a draw); at the round clock more lives, then more points, else a draw. */
export function defaultRoundOver({ sides }: DuelRoundView, timeUp: boolean): Side | 'draw' | null {
    const { left, right } = sides;
    if (left.lives <= 0 && right.lives <= 0) return 'draw';
    if (left.lives <= 0) return 'right';
    if (right.lives <= 0) return 'left';
    if (!timeUp) return null;
    if (left.lives !== right.lives) return left.lives > right.lives ? 'left' : 'right';
    if (left.points !== right.points) return left.points > right.points ? 'left' : 'right';
    return 'draw';
}

/** How far a side is ahead, about âˆ’1..1 (lives and points): the bot eases off when it leads. */
export function leadOf(me: DuelSideView, them: DuelSideView, lives: number): number {
    const byLives = (me.lives - them.lives) / Math.max(1, lives);
    const byPoints = (me.points - them.points) / Math.max(10, me.points + them.points);
    return Math.max(-1, Math.min(1, byLives + byPoints));
}

// â”€â”€ Ready-made rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Each right answer hits the other side for 1; every `every`-th in a row hits for `damage` (tag 'special'). */
export function hitRule(special?: { every: number; damage: number }): DuelRule {
    return {
        right: ({ other, streak }) => (special && streak % special.every === 0
            ? { damage: { [other]: special.damage }, tag: 'special' }
            : { damage: { [other]: 1 } }),
    };
}

/** Touwtrekken's rope: a right answer pulls one step (the other side âˆ’1, this side +1); the lives always add up to 2 Ã— start. */
export const ropeRule: DuelRule = {
    right: ({ side }) => ({ damage: { [otherSide(side)]: 1, [side]: -1 } }),
    maxLives: c => c.lives * 2,
};

/** The rope's position from the lives: negative = toward left, Â±lives = a win. */
export const ropeOf = (sides: Record<Side, Pick<DuelSideView, 'lives'>>) => (sides.right.lives - sides.left.lives) / 2;

/** A wrong answer string the check rejects (the bot's miss): the answer Â± 1, or a mark for a non-number. */
export function wrongOf(answer: string, rng: () => number = Math.random): string {
    if (!/^\d+$/.test(answer)) return '?';
    const n = Number(answer);
    return String(n === 0 || rng() < 0.5 ? n + 1 : n - 1);
}
