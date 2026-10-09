import type { MathBlock } from '../math/types';
import type { OefenHistoryEntry, OefenSessie, OefenStats, OefenType } from './types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { DEFAULT_BASE, seedConstraints } from '../../config/baseSettings';
import { exerciseKeyOf, generateForBlock } from '../generateDispatch';

// Which type comes next, which exercise, and when a run is over. Pure: the RNG is injected
// so the tests (and a resumed run) are deterministic.

export type Rng = () => number;

export interface OefenPick { slot: number; type: OefenType }

// Re-draws spent on an exercise the pupil already saw before accepting a repeat (a tafel of 2
// up to 10 has only 10 sums).
export const MAX_REDRAWS = 20;

/** Exercises made per slot so far. */
export function madePerSlot(s: OefenSessie, history: readonly OefenHistoryEntry[]): number[] {
    const made = s.types.map(() => 0);
    for (const h of history) if (h.slot >= 0 && h.slot < made.length) made[h.slot] += 1;
    return made;
}

/** Slots whose limit is not reached yet. */
export function poolOf(s: OefenSessie, history: readonly OefenHistoryEntry[]): number[] {
    const made = madePerSlot(s, history);
    return s.types.map((_, i) => i).filter(i => s.types[i].limit === undefined || made[i] < (s.types[i].limit as number));
}

/** The run's length when it has one: `total`, else the sum of the limits when every type has one. */
export function plannedTotal(s: OefenSessie): number | null {
    const sum = s.types.every(t => t.limit !== undefined) ? s.types.reduce((a, t) => a + (t.limit as number), 0) : null;
    if (s.total !== undefined) return sum === null ? s.total : Math.min(s.total, sum);
    return sum;
}

function weightedDraw(s: OefenSessie, pool: number[], rng: Rng): number {
    const weights = pool.map(i => Math.max(0, s.types[i].weight || 0));
    const sum = weights.reduce((a, w) => a + w, 0);
    // Every slider at 0: treat them as equal rather than locking the kiosk.
    if (sum <= 0) return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    let r = rng() * sum;
    for (let k = 0; k < pool.length; k++) {
        r -= weights[k];
        if (r < 0) return pool[k];
    }
    return pool[pool.length - 1];
}

/** The next type to show, or null when the run is over (total or every limit reached). */
export function nextType(s: OefenSessie, history: readonly OefenHistoryEntry[], rng: Rng = Math.random): OefenPick | null {
    const total = plannedTotal(s);
    if (total !== null && history.length >= total) return null;
    const pool = poolOf(s, history);
    if (pool.length === 0) return null;
    const prev = history.length ? history[history.length - 1].slot : -1;
    let slot: number;
    if (s.mode === 'afwisselen') {
        // Round-robin in session order from the previous slot: with ≥ 2 left that skips it.
        const n = s.types.length;
        slot = pool[0];
        for (let step = 1; step <= n; step++) {
            const cand = (prev + step + n) % n;
            if (pool.includes(cand)) { slot = cand; break; }
        }
    } else {
        const others = pool.filter(i => i !== prev);
        // Without repeats the previous type sits out whenever another can serve; the weights renormalise over the rest.
        slot = weightedDraw(s, !s.allowRepeatType && others.length > 0 ? others : pool, rng);
    }
    return { slot, type: s.types[slot] };
}

// The throwaway block a type's generator runs on.
// SYNC: mirrors the block literal of addBlockFromType (blocksSlice.ts), like the test helper makeBlock.
function blockFor(type: OefenType): MathBlock {
    return {
        id: 'oefen',
        typeId: type.typeId,
        leafId: type.leafId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: 1,
        totalPoints: 1,
        verticalSpacing: 18,
        constraints: seedConstraints({ typeId: type.typeId, base: DEFAULT_BASE, override: type.constraints, leafId: type.leafId }),
        exercises: [],
    } as MathBlock;
}

export interface OefenExercise {
    exercise: unknown;
    key: string;
    // The block's full constraints (seeded): what answerOf / display / checkAnswer take.
    constraints: Record<string, unknown>;
    // True when MAX_REDRAWS could not find an unseen exercise.
    repeat: boolean;
}

/** One fresh exercise of this type, avoiding `seenKeys`; null when the generator yields nothing. */
export function nextExercise(_s: OefenSessie, type: OefenType, seenKeys: ReadonlySet<string>, rng?: Rng): OefenExercise | null {
    const def = REGISTRY[type.typeId];
    if (!def) return null;
    const block = blockFor(type);
    const constraints = block.constraints as Record<string, unknown>;
    const realRandom = Math.random;
    // Generators call Math.random directly; swapping it is the only way to seed them.
    if (rng) Math.random = rng;
    try {
        let last: OefenExercise | null = null;
        for (let attempt = 0; attempt <= MAX_REDRAWS; attempt++) {
            // A descriptor may adjust the settings per kiosk exercise (a random bill); the sheet's generator is untouched.
            const c = def.kiosk?.prepare?.(constraints, Math.random) ?? constraints;
            let items: unknown[];
            try { items = generateForBlock(c === constraints ? block : { ...block, constraints: c } as MathBlock).items; } catch { items = []; }
            const exercise = items[0];
            if (exercise === undefined) continue;
            const key = exerciseKeyOf(type.typeId, exercise);
            last = { exercise, key, constraints: c, repeat: seenKeys.has(key) };
            if (!last.repeat) return last;
        }
        return last;
    } finally {
        Math.random = realRandom;
    }
}

/** The run is over: total or every limit reached, or the timer ran out (`now` ≥ end). */
export function isDone(s: OefenSessie, stats: OefenStats, now?: number): boolean {
    if (stats.finishedAt !== undefined) return true;
    if (s.timerMin !== undefined && now !== undefined && now >= stats.startedAt + s.timerMin * 60_000) return true;
    return nextType(s, stats.history, () => 0) === null;
}
