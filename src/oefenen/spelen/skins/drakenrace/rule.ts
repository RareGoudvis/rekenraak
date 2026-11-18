import { COURSE, courseRule, obstacleIndexOf } from '../../course/course';
import type { DuelSideView } from '../../duel/types';

// Drakenrace on the shared obstacle course (course/course.ts): two dragons race over the sky, every sum is the next
// obstacle flying at them. A right answer clears it (over, under, through, with a puff of fire: +1); a wrong answer
// or the obstacle arriving first is a funny crash (no point). The first dragon through the course rings the gong.
// The catch-up storm stays: every 3rd right in a row the storm cloud blows into the OTHER lane as that dragon's
// obstacle, when it is level or ahead; crashing into the storm knocks it back 1 (never below 0), clearing it costs
// nothing. A dragon already behind is spared, so a faster bot never runs further away (spelen.bot.test.ts).

export const DRAAK = {
    // Every this many right in a row: the storm for the other dragon.
    streak: 3,
    // How far a crash into the storm knocks a dragon back.
    knock: 1,
    // The course in obstacles (the levens row, "Hoe ver vliegen?").
    course: { choices: COURSE.lengths.choices, default: COURSE.lengths.default },
    // The winner rings the gong and the fireworks go off before the scoreboard card.
    cardMs: 3600,
} as const;

export const DRAAK_KINDS = ['cloud', 'tower', 'birds', 'island', 'gate', 'balloon'] as const;
// The storm is no course obstacle: the other dragon sends it.
export type DraakKind = typeof DRAAK_KINDS[number] | 'storm';

export const DRAAK_OBSTACLES: Record<DraakKind, { clear: { move: string; call: string }; crash: { move: string; call: string } }> = {
    cloud: { clear: { move: 'through', call: 'Poef!' }, crash: { move: 'zap', call: 'Bzzt!' } },
    tower: { clear: { move: 'over', call: 'Erover!' }, crash: { move: 'bonk', call: 'Bonk!' } },
    birds: { clear: { move: 'under', call: 'Ontweken!' }, crash: { move: 'feathers', call: 'Piep piep!' } },
    island: { clear: { move: 'over', call: 'Hup!' }, crash: { move: 'tangle', call: 'Takken!' } },
    gate: { clear: { move: 'through', call: 'Erdoor!' }, crash: { move: 'zap', call: 'Zap!' } },
    balloon: { clear: { move: 'roll', call: 'Joepie!' }, crash: { move: 'boing', call: 'Boing!' } },
    storm: { clear: { move: 'through', call: 'Weggeblazen!' }, crash: { move: 'zap', call: 'ZAP!' } },
};

/** This right answer (streak counted) sends the storm. */
export const callsStorm = (streak: number) => streak > 0 && streak % DRAAK.streak === 0;

/** The storm's flag for a side: its obstacle index + 1 (0 = none), so it marks one obstacle and goes stale after it. */
export const stormFlagOf = (v: Pick<DuelSideView, 'right' | 'wrong'>) => obstacleIndexOf(v) + 1;

/** The side's obstacle at index is the storm the other dragon sent. */
export const isStorm = (v: Pick<DuelSideView, 'flags'>, index: number) => (v.flags.storm ?? 0) === index + 1;

/** How far the storm knocks a dragon at `points` back (never below the start). */
export const knockOf = (points: number) => Math.min(DRAAK.knock, Math.max(0, points));

export const DRAAK_RULE = courseRule({
    // The rival's obstacle now (or its next, while its flash shows) is the storm: right + wrong is its index either way.
    right: ({ other, streak, me, them }) => (callsStorm(streak) && them.points >= me.points
        ? { flags: { [other]: { storm: stormFlagOf(them) } }, tag: 'storm' }
        : {}),
    // In a crash hook the answer is counted already: the obstacle just hit is index right + wrong − 1.
    crash: ({ side, me }) => {
        if (!isStorm(me, obstacleIndexOf(me) - 1)) return { tag: 'crash' };
        const knock = knockOf(me.points);
        return knock ? { points: { [side]: -knock }, tag: 'stormhit' } : { tag: 'stormhit' };
    },
    catchUp: { every: DRAAK.streak, bonus: 1 },
    cardMs: DRAAK.cardMs,
});
