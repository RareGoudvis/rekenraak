// How the zombies walk, in % of the street (0 = the door, 100 = the right edge). Pure, so the speeds are testable.

export const ZOMBIE = {
    // On the street at once: the front one with the sum, the others behind it with "?".
    count: 3,
    // Where the first one starts, and the spacing behind it.
    start: 84,
    gap: 24,
    // Off the street (a new front zombie past start, any zombie past 100) they run in at this speed, so the
    // next sum is on screen soon even after quick answers.
    enter: 50,
    // A follower waits here, so a new front zombie never starts close to the door.
    nextMin: 60,
    // A wrong answer: one step closer (never onto the door itself).
    step: 14,
    stepMin: 4,
    // % per second at streak 0 (about 21 s from the start to the door), +10% per right answer in a row, up to 8.
    speed: 4,
    perStreak: 0.1,
    maxStreak: 8,
} as const;

/** Walking speed for a streak: rises slowly with right answers in a row, back to the base after a mistake. */
export function zombieSpeed(streak: number): number {
    return ZOMBIE.speed * (1 + ZOMBIE.perStreak * Math.min(Math.max(streak, 0), ZOMBIE.maxStreak));
}

/** One frame: the front zombie walks to the door, the others follow at a gap and wait at nextMin; off the street they run in first. */
export function walk(xs: readonly number[], dt: number, speed: number): { xs: number[]; atDoor: boolean } {
    const out: number[] = [];
    let atDoor = false;
    xs.forEach((x, i) => {
        const away = x > (i === 0 ? ZOMBIE.start : 100);
        const moved = x - (away ? Math.max(speed, ZOMBIE.enter) : speed) * dt;
        if (i === 0) {
            atDoor = moved <= 0;
            out.push(Math.max(0, moved));
        } else out.push(Math.max(moved, out[i - 1] + ZOMBIE.gap, ZOMBIE.nextMin));
    });
    return { xs: out, atDoor };
}

/** A wrong answer: the front zombie one step closer. */
export const stepCloser = (x: number) => Math.min(x, Math.max(ZOMBIE.stepMin, x - ZOMBIE.step));

/** Where a newcomer joins: behind the last one (at x = last) and off the street, or at the start when the street is empty. */
export const joinAt = (last: number | null) => (last === null ? ZOMBIE.start : Math.max(last + ZOMBIE.gap, 100 + ZOMBIE.gap));
