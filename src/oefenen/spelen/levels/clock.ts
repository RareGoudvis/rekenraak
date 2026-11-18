import type { Level } from './levels';

// THE clock rule every timed game shares (owner 2026-11-17): the time a pupil gets for one sum, from how long
// the round has been played. Pure; the game measures elapsed in its own game time (paused during help, the
// flashes and the rotate prompt) and a new duel round starts it again at 0.

// The first sums of a round: 12 s each, and the whole first minute stays at that.
export const CLOCK = { startMs: 12_000, holdMs: 60_000, stepMs: 1_000 } as const;

// Per level: a step of −1 s this often once the first minute is over (the first step comes at 1 minute), never under floorMs.
export const CLOCK_ROWS = {
    normaal: { everyMs: 60_000, floorMs: 8_000 },
    moeilijk: { everyMs: 45_000, floorMs: 6_000 },
    onmogelijk: { everyMs: 30_000, floorMs: 4_000 },
} as const satisfies Record<Exclude<Level, 'makkelijk'>, { everyMs: number; floorMs: number }>;

/** How many −1 s steps the clock has taken after elapsedMs of play (0 in the first minute; Makkelijk always 0). */
export function clockSteps(level: Level, elapsedMs: number): number {
    if (level === 'makkelijk') return 0;
    const row = CLOCK_ROWS[level];
    const e = Math.max(0, elapsedMs);
    if (e < CLOCK.holdMs) return 0;
    const steps = 1 + Math.floor((e - CLOCK.holdMs) / row.everyMs);
    return Math.min(steps, (CLOCK.startMs - row.floorMs) / CLOCK.stepMs);
}

/** The time for one sum after elapsedMs of play; null = no clock (Makkelijk). */
export function clockMs(level: Level, elapsedMs: number): number | null {
    if (level === 'makkelijk') return null;
    return CLOCK.startMs - CLOCK.stepMs * clockSteps(level, elapsedMs);
}

/** When the next step comes (elapsed ms), or null once the floor is reached (or Makkelijk). */
export function nextClockStepAt(level: Level, elapsedMs: number): number | null {
    if (level === 'makkelijk') return null;
    const row = CLOCK_ROWS[level];
    const steps = clockSteps(level, elapsedMs);
    if (CLOCK.startMs - CLOCK.stepMs * steps <= row.floorMs) return null;
    return CLOCK.holdMs + steps * row.everyMs;
}
