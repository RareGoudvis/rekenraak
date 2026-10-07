import type { MathBlock, ProcentExercise } from '../math/types';
import type { ProcentenConstraints } from '../math/constraintTypes';

// Procenten — "25 % van 80 = ___" (nemen) or "15 van de 60 = ___ %" (welk-percent).
// Bases are constructed answer-first so every result is a natural number.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

export function generateProcentNoted(block: MathBlock): { items: ProcentExercise[]; note: string | null } {
    const c = block.constraints as ProcentenConstraints;
    const subType: string = c.subType ?? 'nemen';
    const percents: number[] = c.percents ?? [10, 25, 50];
    const maxGetal: number = c.maxGetal ?? 1000;
    const count = block.numberOfExercises || 8;

    const out: ProcentExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    // welk-percent with only 100 % has no non-trivial sum; the second pass allows "60 van de 60".
    let allowTrivial = false;
    let usedTrivial = false;
    while (out.length < count) {
        if (attempts >= 20000) {
            if (allowTrivial || subType !== 'welk-percent') break;
            allowTrivial = true; attempts = 0;
        }
        attempts++;
        const percent = pick(percents);
        // Base must be a multiple of 100/gcd(percent,100) for a natural answer.
        const step = 100 / gcd(percent, 100);
        const maxK = Math.floor(maxGetal / step);
        if (maxK < 1) continue;
        const base = randInt(1, maxK) * step;
        const answer = (base * percent) / 100;
        if (subType === 'welk-percent' && answer === base) { if (!allowTrivial) continue; usedTrivial = true; }   // "60 van de 60" is trivial
        const key = `${percent}-${base}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), percent, base, answer, isManuallyEdited: false });
    }
    const notes: string[] = [];
    if (out.length < count) notes.push(`Slechts ${out.length} ${out.length === 1 ? 'oefening' : 'oefeningen'} mogelijk bij deze instellingen.`);
    if (usedTrivial) notes.push('Bij 100 % is "60 van de 60" de enige mogelijkheid.');
    return { items: out, note: notes.length ? notes.join(' ') : null };
}

export function generateProcentExercises(block: MathBlock): ProcentExercise[] {
    return generateProcentNoted(block).items;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
