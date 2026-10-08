import type { MathBlock, VerbandExercise, VerbandRep, Fraction } from '../math/types';
import type { VerbandenConstraints } from '../math/constraintTypes';
import { repeatNote, joinNotes } from '../generationNotes';

// Verbanden breuk · decimaal · procent — benchmark equivalences (1/2 = 0,5 = 50 %).
// Only terminating denominators are offered so decimal/percent stay exact.

// Numerators per denominator that give distinct, curriculum-friendly values (proper fractions).
const BENCHMARK_DENOMINATORS = [2, 4, 5, 8, 10, 20, 25, 100];

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

// Percent value of n/d — exact for all benchmark denominators (8 → halves of a percent).
export function fractionToPercent(f: Fraction): number {
    return Number(((f.n / f.d) * 100).toFixed(1));
}

export function fractionToDecimal(f: Fraction): number {
    return Number((f.n / f.d).toFixed(3));
}

// The reduced fraction: equal values collide whatever representation they were given in.
export function valueKey(f: Fraction): string {
    const g = gcd(f.n, f.d);
    return `${f.n / g}/${f.d / g}`;
}

// One pass over a fixed denominator pool. Split out so the caller can widen the pool and
// try again when the teacher's own pool cannot fill the requested count.
// allowRepeats = last resort: the same VALUE may return with another given/target (noted by the caller).
function generateFromPool(pool: number[], reps: VerbandRep[], subType: string, given: string, count: number, allowRepeats = false): VerbandExercise[] {
    const out: VerbandExercise[] = [];
    const seen = new Set<string>();
    const seenValues = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const d = pick(pool);
        const n = randInt(1, d - 1);
        // Skip reducible fractions that duplicate a simpler benchmark (2/4 = 1/2).
        const g = gcd(n, d);
        if (g > 1 && pool.includes(d / g)) continue;
        const fraction: Fraction = { n, d };
        const givenRep: VerbandRep = given === 'random' ? pick(reps) : (given as VerbandRep);
        const others = reps.filter(r => r !== givenRep);
        if (!others.length) continue;
        const target = subType === 'paren' ? pick(others) : undefined;
        // One value (reduced) once per block: 9/10 given as breuk and as procent is the same row twice.
        const vk = valueKey(fraction);
        if (seenValues.has(vk) && !allowRepeats) continue;
        const key = `${n}/${d}-${givenRep}-${target ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        seenValues.add(vk);
        out.push({ id: Math.random().toString(36).substring(2, 9), fraction, given: givenRep, target, isManuallyEdited: false });
    }
    return out;
}

/**
 * Denominators [2] only hold one proper fraction (½), so a sheet of 8 paren came back with
 * one exercise. The teacher's pool is tried first and only widened — along the benchmark
 * list, smallest first — as far as the requested count actually needs.
 */
export function generateVerbandExercisesNoted(block: MathBlock): { items: VerbandExercise[]; note: string | null } {
    const c = block.constraints as VerbandenConstraints;
    const subType: string = c.subType ?? 'tabel';
    const repsRaw: VerbandRep[] = c.reps ?? ['breuk', 'decimaal', 'procent'];
    // Fewer than 2 representations leaves nothing to convert to: fall back to all three.
    const reps: VerbandRep[] = repsRaw.length >= 2 ? repsRaw : ['breuk', 'decimaal', 'procent'];
    const denominators: number[] = (c.denominators ?? [2, 4, 5, 10, 100]).filter((d: number) => BENCHMARK_DENOMINATORS.includes(d));
    // A pinned 'Gegeven voorstelling' that was untoggled under 'Voorstellingen' falls back to a random selected one.
    const given: string = c.given && reps.includes(c.given as VerbandRep) ? c.given : 'random';
    const count = block.numberOfExercises || 8;

    let pool = denominators.length ? [...denominators] : [2, 4, 10];
    let items = generateFromPool(pool, reps, subType, given, count);
    const spare = BENCHMARK_DENOMINATORS.filter(d => !pool.includes(d));
    const widened = items.length < count && spare.length > 0;

    while (items.length < count && spare.length) {
        pool = [...pool, spare.shift()!].sort((a, b) => a - b);
        items = generateFromPool(pool, reps, subType, given, count);
    }

    // Every denominator is in and there are still fewer distinct values than asked: repeat values, and say so.
    let repeats = 0;
    if (items.length < count) {
        const padded = generateFromPool(pool, reps, subType, given, count, true);
        if (padded.length > items.length) { items = padded; repeats = items.length - new Set(items.map(e => valueKey(e.fraction))).size; }
    }
    const rep = repeatNote(repeats);

    if (items.length < count) return { items, note: joinNotes(`Slechts ${items.length} oefeningen mogelijk bij deze instellingen.`, rep) };
    return { items, note: joinNotes(widened ? `Noemers uitgebreid naar ${pool.join(', ')}.` : null, rep) };
}

export function generateVerbandExercises(block: MathBlock): VerbandExercise[] {
    return generateVerbandExercisesNoted(block).items;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
