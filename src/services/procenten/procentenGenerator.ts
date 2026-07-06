import type { MathBlock, ProcentExercise } from '../math/types';

// Procenten — "25 % van 80 = ___" (nemen) or "15 van de 60 = ___ %" (welk-percent).
// Bases are constructed answer-first so every result is a natural number.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

export function generateProcentExercises(block: MathBlock): ProcentExercise[] {
    const c = block.constraints;
    const subType: string = c.subType ?? 'nemen';
    const percents: number[] = c.percents ?? [10, 25, 50];
    const maxGetal: number = c.maxGetal ?? 1000;
    const count = block.numberOfExercises || 8;

    const out: ProcentExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const percent = pick(percents);
        // Base must be a multiple of 100/gcd(percent,100) for a natural answer.
        const step = 100 / gcd(percent, 100);
        const maxK = Math.floor(maxGetal / step);
        if (maxK < 1) continue;
        const base = randInt(1, maxK) * step;
        const answer = (base * percent) / 100;
        if (subType === 'welk-percent' && answer === base) continue;   // "60 van de 60" is trivial
        const key = `${percent}-${base}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), percent, base, answer, isManuallyEdited: false });
    }
    return out;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
