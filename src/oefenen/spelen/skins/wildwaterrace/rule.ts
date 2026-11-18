import type { DuelRoundView, DuelRule, DuelSideView, Side } from '../../duel/types';

// Wildwaterrace on the duel engine: two rafts race down a wild river to the waterfall. A right answer is a paddle
// stroke (+1); every 3rd right in a row the raft surfs a wave (+2 instead). A wrong answer (or a time-out) lets the
// current push the raft back (-1, never below 0) and spin it in an eddy. The round's "levens" are the course: the
// first raft at the waterfall goes over into the lake below and wins.

export const WILD = {
    // Every this many right in a row: a wave to surf.
    streak: 3,
    // How far a stroke and a wave carry the raft.
    stroke: 1,
    wave: 2,
    // How far the current pushes a raft back after a mistake.
    back: 1,
    // The course (the levens row, "Hoe ver varen?"): 20 keeps a round near two minutes for a 9-year-old.
    course: { choices: [10, 15, 20, 25, 30] as const, default: 20 },
    // The winner goes over the falls, then the other raft drifts after it, before the scoreboard card.
    cardMs: 4400,
} as const;

/** This right answer (streak counted) rides a wave. */
export const ridesWave = (streak: number) => streak > 0 && streak % WILD.streak === 0;

/** How far the current pushes a raft at `points` back (never below the start). */
export const pushOf = (points: number) => Math.min(WILD.back, Math.max(0, points));

/** The first raft at the course's end wins; the course is the round's lives (the levens row). */
export function raceOver({ sides, config }: DuelRoundView): Side | null {
    if (sides.left.points >= config.lives) return 'left';
    if (sides.right.points >= config.lives) return 'right';
    return null;
}

/** The raft's place on the course, 0..1. */
export const progressOf = (v: Pick<DuelSideView, 'points'>, course: number) => Math.max(0, Math.min(1, v.points / Math.max(1, course)));

export const WILD_RULE: DuelRule = {
    right: ({ side, streak }) => (ridesWave(streak)
        ? { points: { [side]: WILD.wave }, tag: 'wave' }
        : { points: { [side]: WILD.stroke }, tag: 'stroke' }),
    wrong: ({ side, me }) => {
        const back = pushOf(me.points);
        return back ? { points: { [side]: -back }, tag: 'eddy' } : { tag: 'eddy' };
    },
    roundOver: raceOver,
    cardMs: WILD.cardMs,
};
