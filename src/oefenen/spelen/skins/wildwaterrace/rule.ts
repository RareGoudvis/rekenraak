import { COURSE, courseRule } from '../../course/course';

// Wildwaterrace on the shared obstacle course (course/course.ts): two rafts race down a wild river, every sum is the
// next obstacle the current carries at them. A right answer clears it (around, over, under: +1); a wrong answer or
// the obstacle arriving first is a funny crash, a splash (no point). The first raft through the course goes over
// the waterfall into the lake and wins. Every 3rd right in a row the paddlers cheer on a wave (only a look).

export const WILD = {
    // Every this many right in a row the raft surfs a wave (a show, no points).
    streak: 3,
    // The course in obstacles (the levens row, "Hoe ver varen?").
    course: { choices: COURSE.lengths.choices, default: COURSE.lengths.default },
    // The winner goes over the falls, then the other raft drifts after it, before the scoreboard card.
    cardMs: 4400,
} as const;

export const WILD_KINDS = ['rocks', 'log', 'whirl', 'drop', 'croc', 'branch'] as const;
export type WildKind = typeof WILD_KINDS[number];

export const WILD_OBSTACLES: Record<WildKind, { clear: { move: string; call: string }; crash: { move: string; call: string } }> = {
    rocks: { clear: { move: 'swerve', call: 'Ontweken!' }, crash: { move: 'bump', call: 'Bonk!' } },
    log: { clear: { move: 'hop', call: 'Hop!' }, crash: { move: 'teeter', call: 'Wiebel!' } },
    whirl: { clear: { move: 'around', call: 'Erlangs!' }, crash: { move: 'spin', call: 'Draaien!' } },
    drop: { clear: { move: 'dive', call: 'Joehoe!' }, crash: { move: 'splash', call: 'Plons!' } },
    croc: { clear: { move: 'swerve', call: 'Mis, krokodil!' }, crash: { move: 'chomp', call: 'Hap!' } },
    branch: { clear: { move: 'duck', call: 'Bukken!' }, crash: { move: 'leaves', call: 'Takken!' } },
};

// Kinds drawn over the raft (the branch hangs above it), not under it.
export const WILD_FRONT: readonly WildKind[] = ['branch'];

/** This right answer (streak counted) surfs a wave. */
export const ridesWave = (streak: number) => streak > 0 && streak % WILD.streak === 0;

export const WILD_RULE = courseRule({ catchUp: { every: WILD.streak, bonus: 1 }, cardMs: WILD.cardMs });
