import type { DuelConfig, DuelRoundView, DuelRule, Side } from '../../duel/types';

// Monstertrucks on the duel engine: a race in two lanes. A right answer = gas (+1 towards the finish); every 3rd
// right in a row is a ramp jump over a row of cars the truck flattens (+2 on top). A wrong answer or a time-out is a
// wheelie: no points, the streak breaks (the engine resets it). The first truck at the finish wins the round.
// The race does not use lives: the levens row is the race's length ("Hoe ver rijden?"), so config.lives = the finish.

export const TRUCK = {
    // The finish in steps (the levens row): owner brief 20, about a minute at Normaal against the computer.
    finish: { label: 'Hoe ver rijden?', choices: [10, 15, 20, 25, 30] as readonly number[], default: 20 },
    // Every this many right in a row: a ramp jump (the ramp shows one answer before, so the pupil sees it coming).
    jumpEvery: 3,
    // The jump's bonus on top of the gas: the flattened cars are worth 2 steps.
    jumpBonus: 2,
    // The winner's donut and the confetti before the scoreboard card.
    cardMs: 3400,
} as const;

/** The race's finish: the levens pick (the Hoe ver rijden? row). */
export const finishOf = (config: Pick<DuelConfig, 'lives'>) => config.lives;

/** This right answer (streak counted) is a ramp jump. */
export const jumpsNow = (streak: number) => streak > 0 && streak % TRUCK.jumpEvery === 0;

/** The ramp waits in front of the truck: the next right answer jumps. */
export const rampAhead = (streak: number) => streak % TRUCK.jumpEvery === TRUCK.jumpEvery - 1;

/** How far along a truck is, 0..1. */
export const progressOf = (points: number, finish: number) => Math.max(0, Math.min(1, points / Math.max(1, finish)));

/** The first truck at the finish wins; nothing else ends a race (it has no round clock). */
export function raceRoundOver(view: DuelRoundView): Side | 'draw' | null {
    const finish = finishOf(view.config);
    const { left, right } = view.sides;
    const l = left.points >= finish, r = right.points >= finish;
    if (l && r) return left.points === right.points ? 'draw' : left.points > right.points ? 'left' : 'right';
    return l ? 'left' : r ? 'right' : null;
}

export const TRUCK_RULE: DuelRule = {
    right: ({ side, streak }) => (jumpsNow(streak)
        ? { points: { [side]: 1 + TRUCK.jumpBonus }, tag: 'jump' }
        : { points: { [side]: 1 }, tag: 'gas' }),
    roundOver: view => raceRoundOver(view),
    cardMs: TRUCK.cardMs,
};
