// How the race car drives, in metres and seconds. Pure, so the boost, turbo, stop and finish are testable.

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
    // A longer, smoother burst than a jump: 36 m in about 0.8 s.
    boostRate: 45,
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
    // Boost metres still to come.
    boost: number;
    // Standing still (Tijdrit: after a mistake, until the next right answer; Benzine: at the pump, out of fuel).
    stopped: boolean;
    // A scripted slow-down to a stop at `to` (pulling in at a petrol station, sputtering out): from, to, its seconds.
    glide: { from: number; to: number; sec: number; at: number } | null;
    // x at every sampleSec, from t = 0.
    trace: number[];
    // Race seconds at the finish line, null while driving.
    finishedAt: number | null;
}

export const startCar = (): RaceCar => ({ x: 0, t: 0, boost: 0, stopped: false, glide: null, trace: [0], finishedAt: null });

export const isTurbo = (streak: number) => streak >= RACE.turboAt;

/** One frame: base speed plus any boost; standing still when stopped; a glide eases to its stop; stops at the finish (length). */
export function drive(c: RaceCar, dtIn: number, length: number = RACE.length): RaceCar {
    if (c.finishedAt !== null) return c;
    const dt = Math.min(RACE.maxDt, Math.max(0, dtIn));
    if (dt === 0) return c;
    let x: number;
    let boost = c.boost;
    let stopped = c.stopped;
    let glide = c.glide;
    if (glide) {
        const at = Math.min(glide.sec, glide.at + dt);
        const p = glide.sec > 0 ? at / glide.sec : 1;
        // Ease-out: fast at first, rolling gently to a stop at `to`.
        x = glide.from + (glide.to - glide.from) * (1 - (1 - p) * (1 - p));
        glide = at >= glide.sec ? null : { ...glide, at };
        if (!glide) stopped = true;
    } else if (stopped) {
        x = c.x;
    } else {
        const extra = Math.min(boost, RACE.boostRate * dt);
        boost -= extra;
        x = c.x + RACE.base * dt + extra;
    }
    let t = c.t + dt;
    let finishedAt: number | null = null;
    if (x >= length) {
        // The exact moment the nose crossed the line, inside this frame.
        finishedAt = c.t + (x > c.x ? dt * (length - c.x) / (x - c.x) : dt);
        t = finishedAt;
        x = length;
    }
    const trace = c.trace.slice();
    while (trace.length * RACE.sampleSec <= t && trace.length < RACE.maxSamples) {
        const at = trace.length * RACE.sampleSec;
        trace.push(Math.round(c.x + (x - c.x) * ((at - c.t) / Math.max(1e-9, t - c.t))));
    }
    return { x, t, boost, stopped, glide, trace, finishedAt };
}

/** A right answer: a boost, bigger at turbo (streak = right answers in a row, this one included); a stopped car drives off. */
export const boostCar = (c: RaceCar, streak: number): RaceCar =>
    c.finishedAt !== null ? c : { ...c, stopped: false, glide: null, boost: c.boost + (isTurbo(streak) ? RACE.turbo : RACE.boost) };

/** Tijdrit mistake: the car stops and stays stopped until the next right answer; the boost under way is gone. */
export const stopCar = (c: RaceCar): RaceCar => (c.finishedAt !== null ? c : { ...c, boost: 0, glide: null, stopped: true });

/** Drive on after a stop without a boost (Benzine: leaving the pump after a missed station question). */
export const resumeCar = (c: RaceCar): RaceCar => (c.finishedAt !== null ? c : { ...c, stopped: false, glide: null });

/** Roll `metres` further over `sec`, slowing down, then stand still (the petrol station, an empty tank). */
export const glideCar = (c: RaceCar, metres: number, sec: number): RaceCar =>
    c.finishedAt !== null ? c : { ...c, boost: 0, stopped: false, glide: { from: c.x, to: c.x + Math.max(0, metres), sec: Math.max(0, sec), at: 0 } };

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
