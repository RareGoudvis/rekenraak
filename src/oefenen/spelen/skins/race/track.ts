// How the race car drives, in metres and seconds. Pure, so the boost, turbo, brake and finish are testable.

export const RACE = {
    // The track: about 20 right answers' worth of driving at a calm pace.
    length: 1000,
    // On its own the car always gets there (about 5.5 minutes), so a round always ends.
    base: 3,
    // A right answer: this many metres extra, handed out at boostRate (a burst of speed).
    boost: 36,
    // 5 right in a row (and on): turbo, a flame and a bigger boost.
    turboAt: 5,
    turbo: 56,
    boostRate: 60,
    // A mistake: the car stands still this long, and a boost still under way is lost.
    brakeSec: 1.4,
    // The ghost's trace: one position per half second of race time.
    sampleSec: 0.5,
    // A long frame (a hidden tab, a slow laptop) never jumps the car or the clock.
    maxDt: 0.25,
    // A trace never grows past 10 minutes.
    maxSamples: 1200,
} as const;

export interface RaceCar {
    // Metres from the start, and race seconds (the clock stops under "Hoe los ik dit op?").
    x: number;
    t: number;
    // Boost metres still to come, brake seconds left.
    boost: number;
    brake: number;
    // x at every sampleSec, from t = 0.
    trace: number[];
    // Race seconds at the finish line, null while driving.
    finishedAt: number | null;
}

export const startCar = (): RaceCar => ({ x: 0, t: 0, boost: 0, brake: 0, trace: [0], finishedAt: null });

export const isTurbo = (streak: number) => streak >= RACE.turboAt;

/** One frame: base speed plus any boost; standing still while braking; stops at the finish. */
export function drive(c: RaceCar, dtIn: number): RaceCar {
    if (c.finishedAt !== null) return c;
    const dt = Math.min(RACE.maxDt, Math.max(0, dtIn));
    if (dt === 0) return c;
    const braking = c.brake > 0;
    // A brake ending mid-frame drives the rest of it.
    const free = braking ? Math.max(0, dt - c.brake) : dt;
    const extra = Math.min(c.boost, RACE.boostRate * free);
    const dx = RACE.base * free + extra;
    let x = c.x + dx;
    let t = c.t + dt;
    let finishedAt: number | null = null;
    if (x >= RACE.length) {
        // The exact moment the nose crossed the line, inside this frame.
        finishedAt = c.t + (dt - free) + (dx > 0 ? free * (RACE.length - c.x) / dx : 0);
        t = finishedAt;
        x = RACE.length;
    }
    const trace = c.trace.slice();
    while (trace.length * RACE.sampleSec <= t && trace.length < RACE.maxSamples) {
        const at = trace.length * RACE.sampleSec;
        trace.push(Math.round(c.x + (x - c.x) * ((at - c.t) / Math.max(1e-9, t - c.t))));
    }
    return { x, t, boost: c.boost - extra, brake: Math.max(0, c.brake - dt), trace, finishedAt };
}

/** A right answer: a boost, bigger at turbo (streak = right answers in a row, this one included). */
export const boostCar = (c: RaceCar, streak: number): RaceCar =>
    c.finishedAt !== null ? c : { ...c, boost: c.boost + (isTurbo(streak) ? RACE.turbo : RACE.boost) };

/** A mistake: a short stop, and the boost still under way is gone. */
export const brakeCar = (c: RaceCar): RaceCar => (c.finishedAt !== null ? c : { ...c, boost: 0, brake: RACE.brakeSec });

/** Where a recorded run was after t race seconds (its trace, then the finish at ms). */
export function ghostAt(ghost: { ms: number; trace: readonly number[] }, t: number): number {
    const end = ghost.ms / 1000;
    if (t >= end) return RACE.length;
    const i = t / RACE.sampleSec;
    const lo = Math.floor(i);
    const last = ghost.trace.length - 1;
    if (lo >= last) {
        // Between the last sample and the finish.
        const from = last * RACE.sampleSec;
        const x0 = ghost.trace[last] ?? 0;
        return x0 + (RACE.length - x0) * ((t - from) / Math.max(1e-9, end - from));
    }
    const a = ghost.trace[lo];
    return a + (ghost.trace[lo + 1] - a) * (i - lo);
}

/** "1:23,4": minutes, seconds, tenths (a race time, Flemish decimal comma). */
export function formatRaceTime(ms: number): string {
    const tenths = Math.max(0, Math.round(ms / 100));
    const m = Math.floor(tenths / 600);
    const s = Math.floor((tenths % 600) / 10);
    return `${m}:${String(s).padStart(2, '0')},${tenths % 10}`;
}

/** "3,2": a gap in seconds with one decimal. */
export const formatGap = (ms: number) => (Math.round(Math.abs(ms) / 100) / 10).toFixed(1).replace('.', ',');
