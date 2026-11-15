import type { ZombieLevel } from './defence';

// How the zombies walk, in % of the street (0 = the door, 100 = the right edge). Pure, so the speeds are testable.

export const ZOMBIE = {
    // On the street at once: the front one with the sum, the others behind it with "?".
    count: 3,
    // Where the first one starts, and the spacing behind it (the start line and every newcomer).
    start: 84,
    gap: 24,
    // A follower never shuffles closer than this behind the one ahead (it slows to that one's pace, never stops).
    minGap: 14,
    // Off screen (past the street's visible end) a zombie runs in at this speed, unseen, so the next sum is soon on screen.
    enter: 60,
    // A wrong answer: one step closer (never onto the door itself).
    step: 14,
    stepMin: 4,
    // % per second at streak 0 (about 21 s from the start to the door), +10% per right answer in a row, up to 8.
    speed: 4,
    perStreak: 0.1,
    maxStreak: 8,
    // The ones behind shamble slower than the hungry one in front, so a new front zombie starts well away.
    follow: 0.72,
    // Seconds to ease into a new pace (a streak, a new front zombie): no sudden jumps.
    ease: 0.45,
} as const;

// Each zombie has its own pace and tempo, picked by id: a mixed little crowd, never in step.
const PACES = [1, 0.9, 1.08, 0.95, 1.04] as const;
export const paceOf = (id: number): number => PACES[((id % PACES.length) + PACES.length) % PACES.length];

export interface Walker { x: number; v: number; pace: number }

/** Walking speed for a streak: rises slowly with right answers in a row, back to the base after a mistake. */
export function zombieSpeed(streak: number): number {
    return ZOMBIE.speed * (1 + ZOMBIE.perStreak * Math.min(Math.max(streak, 0), ZOMBIE.maxStreak));
}

// Over the game the zombies slowly speed up (owner 2026-11-15): 100 % at the start, 150 % at 2:00, 200 % at 4:00, then capped.
export const RAMP = { perMs: 0.5 / 120_000, max: 2 } as const;

/** The speed factor after elapsedMs of play: linear, capped at RAMP.max; Makkelijk stays at a steady 100 %. */
export const speedAt = (elapsedMs: number, level: ZombieLevel = 'normaal') =>
    level === 'makkelijk' ? 1 : Math.min(RAMP.max, 1 + Math.max(0, elapsedMs) * RAMP.perMs);

/** The pace a zombie heads for: the front one at the streak speed, the ones behind a bit slower, each at its own pace. */
export const targetSpeed = (i: number, pace: number, speed: number) => speed * pace * (i === 0 ? 1 : ZOMBIE.follow);

/**
 * One frame for the line, front first. Every zombie keeps walking at its own (eased) pace; one behind only slows
 * to keep minGap. Past offAt (not on screen yet) it runs in unseen. The front one stops at the door.
 */
export function walk(line: readonly Walker[], dt: number, speed: number, offAt = 100 + ZOMBIE.gap): { line: Walker[]; atDoor: boolean } {
    const out: Walker[] = [];
    let atDoor = false;
    const k = Math.min(1, dt / ZOMBIE.ease);
    line.forEach((z, i) => {
        const want = targetSpeed(i, z.pace, speed);
        if (z.x > offAt) {
            // Unseen: run in, and arrive at the walking pace (no visible slowdown at the edge).
            const x = Math.max(offAt, z.x - ZOMBIE.enter * dt);
            out.push({ ...z, x: i === 0 ? x : Math.max(x, out[i - 1].x + ZOMBIE.minGap), v: want });
            return;
        }
        const v = z.v + (want - z.v) * k;
        let x = z.x - v * dt;
        if (i === 0) {
            atDoor = x <= 0;
            x = Math.max(0, x);
        } else x = Math.max(x, out[i - 1].x + ZOMBIE.minGap);
        out.push({ ...z, x, v });
    });
    return { line: out, atDoor };
}

/** A wrong answer: the front zombie one step closer. */
export const stepCloser = (x: number) => Math.min(x, Math.max(ZOMBIE.stepMin, x - ZOMBIE.step));

/** Where a newcomer joins: a gap behind the last one and not before offAt (off screen), or at the start when the street is empty. */
export const joinAt = (last: number | null, offAt = 100 + ZOMBIE.gap) => (last === null ? ZOMBIE.start : Math.max(last + ZOMBIE.gap, offAt));

/** Where the street stops being visible, in %: a lane at 100 still shows the whole zombie, so add its width. */
export const offStreetAt = (trackPx: number, zombiePx: number) => (trackPx > 0 ? 100 + (zombiePx / trackPx) * 100 : 100 + ZOMBIE.gap);

// The shamble: one cycle = two steps. Driven by the distance walked (not a CSS loop), so it never restarts
// between answers, slows and speeds with the zombie and holds still when it stops.
export const SHAMBLE = {
    // A cycle covers about this many zombie widths of street (a short, dragging stride).
    stride: 0.55,
    // Cycles per second, kept in a lively band: on a narrow phone the street is short, on a wide screen long.
    minRate: 0.55,
    maxRate: 1.25,
    // Seconds to settle into a stand (feet together) when the zombies stop, and to pick the stride up again.
    settle: 0.3,
} as const;

/** Cycles per second for a pace in %/s on a track of trackPx, a zombie zombiePx wide; a stopped zombie does not step. */
export function shambleRate(v: number, trackPx: number, zombiePx: number): number {
    if (v <= 0) return 0;
    const raw = trackPx > 0 && zombiePx > 0 ? (v / 100) * trackPx / (zombiePx * SHAMBLE.stride) : SHAMBLE.minRate;
    return Math.min(SHAMBLE.maxRate, Math.max(SHAMBLE.minRate, raw));
}

export interface Pose { legA: number; legB: number; liftA: number; liftB: number; bob: number; lean: number; armA: number; armB: number; head: number }

/** The body at a point of the cycle (p in cycles, unbounded); amp 0 = standing still, 1 = full shamble. Angles in degrees, SVG units. */
export function shamble(p: number, amp: number): Pose {
    const s = Math.sin(2 * Math.PI * p);
    const c = Math.cos(2 * Math.PI * p);
    // A positive leg angle swings the foot forward (left, towards the door); the swinging leg lifts.
    return {
        legA: 17 * s * amp,
        legB: -17 * s * amp,
        liftA: -4 * Math.max(0, c) * amp,
        liftB: -4 * Math.max(0, -c) * amp,
        // Heavy steps: the body sinks at every full stride and rises as the legs pass.
        bob: 3.2 * Math.abs(s) * amp,
        // Leaning in towards the door, rocking over the planted foot.
        lean: (-6 + 4 * c) * amp,
        // Arms reach forward and pump out of step with each other.
        armA: (-3 + 7 * Math.sin(2 * Math.PI * p + 1.2)) * amp,
        armB: (3 - 7 * Math.sin(2 * Math.PI * p + 1.2)) * amp,
        // The head lolls at half the step rate: a loose, silly wobble.
        head: 5 * Math.sin(Math.PI * p) * amp,
    };
}

/** Cycles walked over dx % of the street (a lunge's quick steps). */
export const strideOf = (dx: number, trackPx: number, zombiePx: number) =>
    dx <= 0 ? 0 : trackPx > 0 && zombiePx > 0 ? ((dx / 100) * trackPx) / (zombiePx * SHAMBLE.stride) : dx / 8;
