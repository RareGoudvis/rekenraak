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

// Per session object: slot → false once its settings proved to generate nothing (a klok with every
// tijdstype unticked). A shared session never changes, so the verdict holds for the whole run.
const viability = new WeakMap<OefenSessie, Map<number, boolean>>();

function verdicts(s: OefenSessie): Map<number, boolean> {
    let m = viability.get(s);
    if (!m) viability.set(s, (m = new Map()));
    return m;
}

// Fixed-seed probe RNG: nextExercise swaps it in, so the caller's Math.random sequence is untouched.
function probeRng(): Rng {
    let a = 0x9e3779b9;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function isDead(s: OefenSessie, slot: number): boolean {
    const m = verdicts(s);
    if (!m.has(slot)) m.set(slot, nextExercise(s, s.types[slot], new Set(), probeRng()) !== null);
    return m.get(slot) === false;
}

/** Slots whose settings generate no exercise at all: retired for the whole run (the kiosk may count the rest). */
export function deadSlots(s: OefenSessie): ReadonlySet<number> {
    return new Set(s.types.map((_, i) => i).filter(i => isDead(s, i)));
}

/** Slots that can still serve: under their limit and not dead. */
export function poolOf(s: OefenSessie, history: readonly OefenHistoryEntry[]): number[] {
    const made = madePerSlot(s, history);
    return s.types.map((_, i) => i).filter(i => (s.types[i].limit === undefined || made[i] < (s.types[i].limit as number)) && !isDead(s, i));
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

/** One fresh exercise of this type, avoiding `seenKeys`; null when the generator yields nothing (the type is then retired). */
export function nextExercise(s: OefenSessie, type: OefenType, seenKeys: ReadonlySet<string>, rng?: Rng): OefenExercise | null {
    const made = generateOne(type, seenKeys, rng);
    const slot = s.types.indexOf(type);
    if (!made && slot >= 0) verdicts(s).set(slot, false);
    return made;
}

function generateOne(type: OefenType, seenKeys: ReadonlySet<string>, rng?: Rng): OefenExercise | null {
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
