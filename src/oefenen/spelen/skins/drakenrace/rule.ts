import type { DuelRoundView, DuelRule, DuelSideView, Side } from '../../duel/types';

// Drakenrace on the duel engine: two dragons race across a sunset sky to the gong. A right answer is a wingbeat
// (+1); every 3rd right in a row the storm cloud halfway strikes the OTHER dragon with lightning (it is knocked
// back 1, never below 0; your own dragon still gets its +1). A wrong answer (or a time-out) is a stall: the dragon
// spins, no points. The round's "levens" are the course: the first dragon there rings the gong and wins.

export const DRAAK = {
    // Every this many right in a row: the lightning at the other dragon.
    streak: 3,
    // How far the lightning knocks the other dragon back.
    knock: 1,
    // The course (the levens row, "Hoe ver vliegen?"): 20 keeps a round near two minutes for a 9-year-old.
    course: { choices: [10, 15, 20, 25, 30] as const, default: 20 },
    // The winner flies to the gong, rings it and the fireworks go off before the scoreboard card.
    cardMs: 3400,
} as const;

/** This right answer (streak counted) calls the lightning. */
export const callsLightning = (streak: number) => streak > 0 && streak % DRAAK.streak === 0;

/** How far the lightning knocks a dragon at `points` back (never below the start). */
export const knockOf = (points: number) => Math.min(DRAAK.knock, Math.max(0, points));

/** The first dragon at the course's end wins; the course is the round's lives (the levens row). */
export function raceOver({ sides, config }: DuelRoundView): Side | null {
    if (sides.left.points >= config.lives) return 'left';
    if (sides.right.points >= config.lives) return 'right';
    return null;
}

/** The dragon's place on the course, 0..1. */
export const progressOf = (v: Pick<DuelSideView, 'points'>, course: number) => Math.max(0, Math.min(1, v.points / Math.max(1, course)));

export const DRAAK_RULE: DuelRule = {
    right: ({ side, other, streak, them }) => {
        if (!callsLightning(streak)) return { points: { [side]: 1 }, tag: 'beat' };
        const knock = knockOf(them.points);
        return { points: knock ? { [side]: 1, [other]: -knock } : { [side]: 1 }, tag: 'lightning' };
    },
    wrong: () => ({ tag: 'stall' }),
    roundOver: raceOver,
    cardMs: DRAAK.cardMs,
};
