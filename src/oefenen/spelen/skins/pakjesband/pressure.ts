// The Speelgoedfabriek's pressure meter, in steps. Pure, so the tuning is testable: a counted mistake (a wrong
// present, or the belt running out before an answer) heats the machine one step, a right answer cools it one step
// (never below 0). At max the machine sputters: the friendly early end.

// THE tuning table. Checked with simulated 20-sum rounds (spelen.fabriek.test): a pupil who guesses (1 in 4 right)
// sputters in nearly every round, a 70 % pupil in about 1 round of 20, an 80 % pupil almost never.
export const PRESSURE = {
    max: 5,
    heat: 1,
    cool: 1,
    // From here the gauge is in its yellow zone and the valve puffs; at max - 1 (orange) the machine trembles.
    warm: 3,
} as const;

export type PressureMood = 'calm' | 'warm' | 'high' | 'burst';

export const pressureAfter = (p: number, step: 'right' | 'wrong') =>
    step === 'wrong' ? Math.min(PRESSURE.max, p + PRESSURE.heat) : Math.max(0, p - PRESSURE.cool);

/** The meter after a run of answers, from cold. */
export const pressureOf = (steps: readonly ('right' | 'wrong')[]) => steps.reduce(pressureAfter, 0);

export const sputters = (p: number) => p >= PRESSURE.max;

export function pressureMood(p: number): PressureMood {
    if (p >= PRESSURE.max) return 'burst';
    if (p >= PRESSURE.max - 1) return 'high';
    return p >= PRESSURE.warm ? 'warm' : 'calm';
}

// The needle sweeps 220°, from cold (lower left) to the end of the orange zone (lower right).
export const NEEDLE_SWEEP = 110;
export const needleAngle = (p: number) => -NEEDLE_SWEEP + 2 * NEEDLE_SWEEP * Math.min(1, Math.max(0, p) / PRESSURE.max);

export interface PressureCounts { right: number; mistakes: number }

/** The meter after the session's counts moved from prev to now; counts going back mean a new round (cold again). */
export function pressureFrom(p: number, prev: PressureCounts, now: PressureCounts): number {
    if (now.right < prev.right || now.mistakes < prev.mistakes) return 0;
    let next = p;
    for (let i = prev.mistakes; i < now.mistakes; i++) next = pressureAfter(next, 'wrong');
    for (let i = prev.right; i < now.right; i++) next = pressureAfter(next, 'right');
    return next;
}
