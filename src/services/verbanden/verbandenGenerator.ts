import type { MathBlock, VerbandExercise, VerbandRep, Fraction } from '../math/types';

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

export function generateVerbandExercises(block: MathBlock): VerbandExercise[] {
    const c = block.constraints;
    const subType: string = c.subType ?? 'tabel';
    const reps: VerbandRep[] = c.reps ?? ['breuk', 'decimaal', 'procent'];
    const denominators: number[] = (c.denominators ?? [2, 4, 5, 10, 100]).filter((d: number) => BENCHMARK_DENOMINATORS.includes(d));
    const given: string = c.given ?? 'random';
    const pool = denominators.length ? denominators : [2, 4, 10];
    const count = block.numberOfExercises || 8;

    const out: VerbandExercise[] = [];
    const seen = new Set<string>();
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
        const key = `${n}/${d}-${givenRep}-${target ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), fraction, given: givenRep, target, isManuallyEdited: false });
    }
    return out;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
