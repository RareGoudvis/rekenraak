// The Bom's time penalty for a counted wrong answer, pure so the store and the tests share it.

export const WRONG_PENALTY_MS = 3000;

/** The clock after a counted mistake: the deadline (or the frozen remainder) moves closer, never past "now". */
export function penalise(clock: { endsAt: number | null; pausedLeft: number | null }, penaltyMs: number, now: number): { endsAt: number | null; pausedLeft: number | null } {
    if (clock.pausedLeft !== null) return { endsAt: clock.endsAt, pausedLeft: Math.max(0, clock.pausedLeft - penaltyMs) };
    if (clock.endsAt === null) return clock;
    // At 0 the usual time-up end happens on the next answer or tick; the clock never reads below 0.
    return { endsAt: Math.max(now, clock.endsAt - penaltyMs), pausedLeft: null };
}

/** True when the counted mistakes grew: one flash per wrong answer (a re-render must not repeat it). */
export const penaltyHit = (prevMistakes: number, mistakes: number) => mistakes > prevMistakes;
