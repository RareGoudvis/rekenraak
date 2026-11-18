import { COURSE, courseRule } from '../../course/course';

// Monstertrucks on the shared obstacle course (course/course.ts): two trucks race through the arena, every sum is
// the next obstacle rolling at them. A right answer clears it (a jump, a loop, a drift: +1), a wrong answer or the
// obstacle arriving first is a funny crash (no point). The first truck through the course wins the round; the
// levens row is the course's length ("Hoe ver rijden?"). Every 3rd right in a row: turbo flames (only a look).

export const TRUCK = {
    // The course in obstacles (the levens row).
    finish: { label: 'Hoe ver rijden?', choices: COURSE.lengths.choices, default: COURSE.lengths.default },
    // Every this many right in a row the exhausts flame (a show, no points).
    turboEvery: 3,
    // The winner's burst through the finish banner, the donut and the confetti before the scoreboard card.
    cardMs: 3600,
} as const;

// The arena's obstacles; every kind shows up once in every six (course.ts courseKind).
export const TRUCK_KINDS = ['cars', 'mud', 'tyres', 'crusher', 'loop', 'oil'] as const;
export type TruckKind = typeof TRUCK_KINDS[number];

// What the truck does at each obstacle (its CSS move) and the comic word that pops up, for a clear and a crash.
export const TRUCK_OBSTACLES: Record<TruckKind, { clear: { move: string; call: string }; crash: { move: string; call: string } }> = {
    cars: { clear: { move: 'jump', call: 'Sprong!' }, crash: { move: 'flip', call: 'Boem!' } },
    mud: { clear: { move: 'skim', call: 'Erdoor!' }, crash: { move: 'stuck', call: 'Vast!' } },
    tyres: { clear: { move: 'hop', call: 'Hop!' }, crash: { move: 'bounce', call: 'Boing!' } },
    crusher: { clear: { move: 'dash', call: 'Net op tijd!' }, crash: { move: 'squash', call: 'Plof!' } },
    loop: { clear: { move: 'loop', call: 'Looping!' }, crash: { move: 'slide', call: 'Oei oei!' } },
    oil: { clear: { move: 'drift', call: 'Gedrift!' }, crash: { move: 'spin', call: 'Slip!' } },
};

// Kinds that draw a part over the truck (the crusher's press, the mud's splash).
export const TRUCK_FRONT: readonly TruckKind[] = ['crusher', 'mud'];

/** The race's finish: the levens pick (the Hoe ver rijden? row). */
export const finishOf = (config: { lives: number }) => config.lives;

/** This right answer (streak counted) lights the turbo. */
export const turboNow = (streak: number) => streak > 0 && streak % TRUCK.turboEvery === 0;

export const TRUCK_RULE = courseRule({ catchUp: { every: TRUCK.turboEvery, bonus: 1 }, cardMs: TRUCK.cardMs });
