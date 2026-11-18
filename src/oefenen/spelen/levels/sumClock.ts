import { clockMs } from './clock';
import type { Level } from './levels';

// The clock per sum for a game that has no clock of its own (Bever, Zeehondjes, Pinguïntoren): pure. Play time
// (the clock rule's elapsed) and the sum's waiting only run while `live` (the sum waits: no help, no flash, no
// rotate prompt, no dive); each new sum gets clockMs(level, play time so far). Makkelijk: never runs out.

export interface SumClock {
    // Play time of the round so far, ms.
    playedMs: number;
    // The sum on screen, how long it has waited, its time (null = no clock) and whether it already ran out.
    key: string | null;
    waitedMs: number;
    limitMs: number | null;
    out: boolean;
}

export const sumClockStart = (): SumClock => ({ playedMs: 0, key: null, waitedMs: 0, limitMs: null, out: false });

/** One tick of dtMs; timeUp = this tick ran the sum's time out (once per sum). */
export function sumClockStep(s: SumClock, dtMs: number, level: Level, key: string | null, live: boolean): { clock: SumClock; timeUp: boolean } {
    let c = s;
    if (key !== s.key) c = { ...s, key, waitedMs: 0, limitMs: key === null ? null : clockMs(level, s.playedMs), out: false };
    if (!live || dtMs <= 0) return { clock: c, timeUp: false };
    const waitedMs = c.waitedMs + dtMs;
    const timeUp = !c.out && c.limitMs !== null && waitedMs >= c.limitMs;
    return { clock: { ...c, playedMs: c.playedMs + dtMs, waitedMs, out: c.out || timeUp }, timeUp };
}

/** What is left of the sum's time, 1 = all, 0 = out; 1 without a clock. */
export const sumClockLeft = (c: SumClock) => (c.limitMs === null ? 1 : Math.max(0, 1 - c.waitedMs / c.limitMs));

// The last stretch the ring turns warm: this many ms before the time is up.
export const SUM_CLOCK_URGENT_MS = 3_000;
export const sumClockUrgent = (c: SumClock) => c.limitMs !== null && !c.out && c.limitMs - c.waitedMs <= SUM_CLOCK_URGENT_MS;
