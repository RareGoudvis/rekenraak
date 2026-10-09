import { describe, test, expect } from 'vitest';
import type { OefenHistoryEntry, OefenSessie, OefenStats, OefenType } from '../services/oefenen/types';
import { deadSlots, isDone, nextExercise, nextType, plannedTotal, poolOf } from '../services/oefenen/scheduler';
import { mulberry32 } from './helpers/limitHarness';

const type = (over: Partial<OefenType> = {}): OefenType => ({
    typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat', label: 'Optellen',
    constraints: { numberType: 'natural', maxGetal: 1000 }, weight: 1, ...over,
});

const sessie = (types: OefenType[], over: Partial<OefenSessie> = {}): OefenSessie => ({
    v: 1, id: 'sched', createdAt: 0, types, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false, ...over,
});

// Bare stats: stats.ts builds the real ones; isDone only reads startedAt / finishedAt / history.
const emptyStats = (_s: OefenSessie, startedAt: number): OefenStats => ({ startedAt, perType: {}, history: [] });

const entry = (slot: number): OefenHistoryEntry => ({ slot, typeId: 'x', exerciseKey: `${slot}`, correct: true, ms: 1 });

// Runs the scheduler to the end (or `cap` picks) and returns the slots it chose.
function drain(s: OefenSessie, cap = 10_000, rng = mulberry32(1)): number[] {
    const history: OefenHistoryEntry[] = [];
    for (let i = 0; i < cap; i++) {
        const pick = nextType(s, history, rng);
        if (!pick) break;
        history.push(entry(pick.slot));
    }
    return history.map(h => h.slot);
}

describe('limits and total', () => {
    test('every limit is reached exactly, then the run ends', () => {
        for (const mode of ['afwisselen', 'willekeurig'] as const) {
            const s = sessie([type({ limit: 2 }), type({ limit: 3 }), type({ limit: 1 })], { mode });
            const slots = drain(s);
            expect(slots).toHaveLength(6);
            expect([0, 1, 2].map(i => slots.filter(x => x === i).length)).toEqual([2, 3, 1]);
            expect(plannedTotal(s)).toBe(6);
        }
    });
    test('a type that hit its limit leaves the pool; the rest keep going', () => {
        const s = sessie([type({ limit: 1 }), type()]);
        expect(poolOf(s, [entry(0)])).toEqual([1]);
        const slots = drain(s, 50);
        expect(slots.filter(x => x === 0)).toHaveLength(1);
        expect(slots).toHaveLength(50);
        expect(plannedTotal(s)).toBeNull();
    });
    test('total caps everything', () => {
        const s = sessie([type(), type()], { total: 7 });
        expect(drain(s)).toHaveLength(7);
        expect(plannedTotal(sessie([type({ limit: 3 }), type({ limit: 3 })], { total: 10 }))).toBe(6);
        expect(plannedTotal(sessie([type({ limit: 3 }), type({ limit: 3 })], { total: 4 }))).toBe(4);
    });
});

describe('afwisselen', () => {
    test('never the same type twice in a row while ≥ 2 remain', () => {
        for (const n of [2, 3, 5]) {
            const slots = drain(sessie(Array.from({ length: n }, () => type())), 500);
            for (let i = 1; i < slots.length; i++) expect(slots[i], `n=${n} at ${i}`).not.toBe(slots[i - 1]);
        }
    });
    test('round-robin in session order', () => {
        expect(drain(sessie([type(), type(), type()]), 7)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    });
    test('the last type left repeats', () => {
        expect(drain(sessie([type({ limit: 1 }), type({ limit: 3 })]))).toEqual([0, 1, 1, 1]);
    });
});

describe('willekeurig', () => {
    test('weights ≈ distribution over 10 000 draws (±2 %)', () => {
        const weights = [50, 30, 20];
        const s = sessie(weights.map(weight => type({ weight })), { mode: 'willekeurig', allowRepeatType: true });
        const slots = drain(s, 10_000, mulberry32(42));
        expect(slots).toHaveLength(10_000);
        weights.forEach((w, i) => {
            const share = slots.filter(x => x === i).length / slots.length;
            expect(Math.abs(share - w / 100), `slot ${i}: ${share}`).toBeLessThanOrEqual(0.02);
        });
    });
    test('all weights 0 = equal chances', () => {
        const slots = drain(sessie([type({ weight: 0 }), type({ weight: 0 })], { mode: 'willekeurig', allowRepeatType: true }), 4000, mulberry32(3));
        expect(Math.abs(slots.filter(x => x === 0).length / 4000 - 0.5)).toBeLessThanOrEqual(0.03);
    });
    test('allowRepeatType: a type may follow itself (≈ 50 % at 50/50)', () => {
        const slots = drain(sessie([type({ weight: 1 }), type({ weight: 1 })], { mode: 'willekeurig', allowRepeatType: true }), 4000, mulberry32(9));
        expect(slots.filter((x, i) => i > 0 && x === slots[i - 1]).length / 4000).toBeGreaterThan(0.45);
    });
    test('!allowRepeatType: zero repeats in 10 000 draws while another type has capacity', () => {
        for (const weights of [[1, 1], [50, 30, 20], [90, 10], [1, 0], [0, 0, 0]]) {
            const s = sessie(weights.map(weight => type({ weight })), { mode: 'willekeurig' });
            const slots = drain(s, 10_000, mulberry32(9));
            expect(slots).toHaveLength(10_000);
            expect(repeatsWithCapacity(s, slots), `weights ${weights}`).toBe(0);
        }
    });
    test('!allowRepeatType: the draw after a type is renormalised over the others', () => {
        const s = sessie([50, 30, 20].map(weight => type({ weight })), { mode: 'willekeurig' });
        const slots = drain(s, 10_000, mulberry32(42));
        const after0 = slots.filter((_, i) => i > 0 && slots[i - 1] === 0);
        // 30 : 20 over the two left = 60 % / 40 %.
        expect(Math.abs(after0.filter(x => x === 1).length / after0.length - 0.6)).toBeLessThanOrEqual(0.03);
    });
    test('!allowRepeatType: the last type with capacity left does repeat', () => {
        const s = sessie([type({ limit: 1 }), type({ limit: 4 })], { mode: 'willekeurig' });
        for (let seed = 0; seed < 50; seed++) {
            const slots = drain(s, 100, mulberry32(seed));
            expect(slots).toHaveLength(5);
            expect(slots.filter(x => x === 1)).toHaveLength(4);
            expect(repeatsWithCapacity(s, slots), `seed ${seed}: ${slots}`).toBe(0);
            expect(slots.at(-1)).toBe(slots.at(-2));
        }
        expect(drain(sessie([type()], { mode: 'willekeurig' }), 20)).toEqual(Array(20).fill(0));
    });
});

// Consecutive repeats at moments another slot was still under its limit.
function repeatsWithCapacity(s: OefenSessie, slots: number[]): number {
    const made = s.types.map(() => 0);
    let n = 0;
    slots.forEach((x, i) => {
        if (i > 0 && x === slots[i - 1] && s.types.some((t, j) => j !== x && (t.limit === undefined || made[j] < t.limit))) n++;
        made[x]++;
    });
    return n;
}

describe('nextExercise', () => {
    test('no exact repeat in 200 draws', () => {
        const t = type();
        const s = sessie([t]);
        const seen = new Set<string>();
        const rng = mulberry32(5);
        for (let i = 0; i < 200; i++) {
            const got = nextExercise(s, t, seen, rng)!;
            expect(got.repeat, `draw ${i}`).toBe(false);
            expect(seen.has(got.key)).toBe(false);
            seen.add(got.key);
        }
    });
    test('a tiny pool hands back a repeat, flagged, instead of nothing', () => {
        const t = type({ typeId: 'hr-std-vermenigvuldigen', leafId: 'hr-std-vermenigvuldigen-nat', constraints: { numberType: 'natural', multiplicationMode: 'tafels', selectedTables: [2], tableLimit: 1 } });
        const s = sessie([t]);
        const seen = new Set<string>();
        let repeats = 0;
        for (let i = 0; i < 30; i++) {
            const got = nextExercise(s, t, seen, mulberry32(i))!;
            expect(got).not.toBeNull();
            if (got.repeat) repeats++;
            seen.add(got.key);
        }
        expect(repeats).toBeGreaterThan(0);
    });
    test('same seed, same exercise; Math.random is restored', () => {
        const t = type();
        const real = Math.random;
        const a = nextExercise(sessie([t]), t, new Set(), mulberry32(77))!;
        const b = nextExercise(sessie([t]), t, new Set(), mulberry32(77))!;
        expect(a.key).toBe(b.key);
        expect(Math.random).toBe(real);
    });
    test('constraints come back seeded (registry defaults filled in)', () => {
        const t = type({ constraints: { numberType: 'natural', maxGetal: 100 } });
        const got = nextExercise(sessie([t]), t, new Set(), mulberry32(1))!;
        expect(got.constraints.maxGetal).toBe(100);
        expect(got.constraints.bridges).toBeDefined();
    });
});

describe('a type whose settings generate nothing is retired', () => {
    // Every tijdstype unticked: the clock generator returns [].
    const dead = () => type({ typeId: 'klok-kloklezen', leafId: 'klok-analoog-lezen', label: 'Klok', constraints: { clockType: 'analoog', exerciseMode: 'lezen', timeTypes: [] } });
    const live = () => type({ limit: 1 });

    // The kiosk store's next() loop: isDone → nextType → nextExercise, the run ends on the first null.
    function serve(s: OefenSessie, rng = mulberry32(4)): number[] {
        const history: OefenHistoryEntry[] = [];
        for (let i = 0; i < 50; i++) {
            if (isDone(s, { startedAt: 0, perType: {}, history })) break;
            const pick = nextType(s, history, rng);
            const made = pick && nextExercise(s, pick.type, new Set(history.map(h => h.exerciseKey)), rng);
            if (!pick || !made) break;
            history.push({ slot: pick.slot, typeId: pick.type.typeId, exerciseKey: made.key, correct: true, ms: 1 });
        }
        return history.map(h => h.slot);
    }

    test('the live type is served, then the run is done', () => {
        for (const mode of ['afwisselen', 'willekeurig'] as const) {
            expect(serve(sessie([dead(), live()], { mode })), `${mode} dead first`).toEqual([1]);
            expect(serve(sessie([live(), dead()], { mode })), `${mode} dead last`).toEqual([0]);
            expect(serve(sessie([dead(), live(), dead(), type({ limit: 2 })], { mode })).sort(), `${mode} mixed`).toEqual([1, 3, 3]);
        }
    });
    test('an endless live type keeps going; the dead slot is reported', () => {
        const s = sessie([dead(), type()], { mode: 'willekeurig' });
        expect(drain(s, 30)).toEqual(Array(30).fill(1));
        expect([...deadSlots(s)]).toEqual([0]);
        expect(poolOf(s, [])).toEqual([1]);
    });
    test('every type dead: nothing to serve, the run is done', () => {
        const s = sessie([dead(), dead()]);
        expect(nextType(s, [])).toBeNull();
        expect(isDone(s, emptyStats(s, 0))).toBe(true);
        expect([...deadSlots(s)]).toEqual([0, 1]);
    });
});

describe('descriptor prepare (kiosk-only settings per exercise)', () => {
    test('geld-wissel draws every one of the teacher bills, never one without smaller money', () => {
        const bills = [500, 1000, 2000, 5000, 10000];
        const t = type({ typeId: 'geld-wissel', leafId: 'geld-wissel', constraints: { exerciseBills: [...bills, 5] } });
        const seen = new Map<number, number>();
        const rng = mulberry32(11);
        for (let i = 0; i < 200; i++) {
            const got = nextExercise(sessie([t]), t, new Set(), rng)!;
            const bill = (got.exercise as { billValueCents: number }).billValueCents;
            // answerOf / display / check get the drawn bill as the only one.
            expect(got.constraints.exerciseBills).toEqual([bill]);
            seen.set(bill, (seen.get(bill) ?? 0) + 1);
        }
        expect([...seen.keys()].sort((a, b) => a - b)).toEqual(bills);
        // The row's own settings are left alone.
        expect(t.constraints.exerciseBills).toEqual([...bills, 5]);
    });
});

describe('isDone', () => {
    const t = type();
    test('limits reached', () => {
        const s = sessie([type({ limit: 1 })]);
        let stats = emptyStats(s, 0);
        expect(isDone(s, stats)).toBe(false);
        stats = { ...stats, history: [entry(0)] };
        expect(isDone(s, stats)).toBe(true);
    });
    test('timer runs out', () => {
        const s = sessie([t], { timerMin: 15 });
        const stats = emptyStats(s, 1000);
        expect(isDone(s, stats, 1000 + 15 * 60_000 - 1)).toBe(false);
        expect(isDone(s, stats, 1000 + 15 * 60_000)).toBe(true);
        expect(isDone(s, stats)).toBe(false);
    });
    test('finishedAt ends it; an endless session never ends on its own', () => {
        const s = sessie([t, t]);
        expect(isDone(s, emptyStats(s, 0))).toBe(false);
        expect(isDone(s, { ...emptyStats(s, 0), finishedAt: 5 })).toBe(true);
    });
});
