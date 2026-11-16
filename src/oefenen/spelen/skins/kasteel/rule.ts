import type { DuelFlight, DuelRule } from '../../duel/types';

// Kasteel on the duel engine: each right answer fires that side's catapult at the other castle; the stone
// does its damage when it lands. Every 3rd right answer in a row is a big stone (2 lives). A castle at 0 crumbles.

export const KASTEEL = {
    // Every this many right in a row: a big stone.
    bigEvery: 3,
    damage: { stone: 1, big: 2 },
    // A stone's flight (the arm's swing included, throw.ts).
    flightMs: 900,
    // A castle at 0 crumbles this long before the scoreboard card.
    endMs: 2200,
} as const;

export const isBig = (streak: number) => streak > 0 && streak % KASTEEL.bigEvery === 0;

/** The lives a stone in the air will take off its target. */
export const damageOf = (f: Pick<DuelFlight, 'to' | 'effect'>) => f.effect.damage?.[f.to] ?? 0;

export const KASTEEL_RULE: DuelRule = {
    right: ({ other, streak }) => {
        const big = isBig(streak);
        return { launch: { ms: KASTEEL.flightMs, tag: 'stone', data: { big }, effect: { damage: { [other]: big ? KASTEEL.damage.big : KASTEEL.damage.stone }, ...(big && { tag: 'big' }) } } };
    },
    cardMs: KASTEEL.endMs,
};
