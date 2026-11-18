import type { Level } from '../../levels/levels';
import type { SkinMeta } from '../types';

// The Bom's time penalty for a counted wrong answer, pure so the store and the tests share it.

// Normaal's penalty (the round's default before a level is picked).
export const WRONG_PENALTY_MS = 3000;

// Per level (owner 2026-11-17): what a counted mistake costs, and on Onmogelijk how many mistakes make it go PUF.
export const BOM_LEVELS: Record<Level, { penaltyMs: number; strikes: number | null }> = {
    makkelijk: { penaltyMs: 0, strikes: null },
    normaal: { penaltyMs: WRONG_PENALTY_MS, strikes: null },
    moeilijk: { penaltyMs: 5000, strikes: null },
    onmogelijk: { penaltyMs: 5000, strikes: 3 },
};

// The level row's round patches: the session charges round.wrongPenaltyMs (0 = nothing).
export const BOM_LEVEL_ROUNDS = Object.fromEntries(
    Object.entries(BOM_LEVELS).map(([l, v]) => [l, { wrongPenaltyMs: v.penaltyMs }]),
) as Record<Level, Partial<SkinMeta['round']>>;

/** Onmogelijk: this many counted mistakes and the bomb goes PUF (the friendly early end). */
export const bomBursts = (level: Level, mistakes: number) => BOM_LEVELS[level].strikes !== null && mistakes >= BOM_LEVELS[level].strikes!;

/** The clock after a counted mistake: the deadline (or the frozen remainder) moves closer, never past "now". */
export function penalise(clock: { endsAt: number | null; pausedLeft: number | null }, penaltyMs: number, now: number): { endsAt: number | null; pausedLeft: number | null } {
    if (clock.pausedLeft !== null) return { endsAt: clock.endsAt, pausedLeft: Math.max(0, clock.pausedLeft - penaltyMs) };
    if (clock.endsAt === null) return clock;
    // At 0 the usual time-up end happens on the next answer or tick; the clock never reads below 0.
    return { endsAt: Math.max(now, clock.endsAt - penaltyMs), pausedLeft: null };
}

/** True when the counted mistakes grew: one flash per wrong answer (a re-render must not repeat it). */
export const penaltyHit = (prevMistakes: number, mistakes: number) => mistakes > prevMistakes;
