import type { MathBlock, HandigExercise } from '../math/types';

// Handig rekenen — compenseren (b near a tienvoud, round then correct) and
// splitsen (decompose b into T + E and add in two hops).

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

export function generateHandigExercises(block: MathBlock): HandigExercise[] {
    const c = block.constraints;
    const strategy: 'compenseren' | 'splitsen' = c.subType ?? 'compenseren';
    const operators: ('+' | '-')[] = c.operators ?? ['+'];
    const maxGetal: number = c.maxGetal ?? 100;
    const distance: number = c.distance ?? 1;   // compenseren: max afstand tot het tienvoud
    const count = block.numberOfExercises || 8;

    const out: HandigExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const operator = pick(operators);
        let a: number, b: number, steps: [number, number];
        if (strategy === 'compenseren') {
            // b sits just under a tienvoud: 29 → +30 −1. Scale the tienvoud with maxGetal.
            const unit = maxGetal > 100 ? 100 : 10;
            const tens = randInt(2, Math.max(2, Math.floor(maxGetal / unit) - 1)) * unit;
            const delta = randInt(1, distance);
            b = tens - delta;
            steps = [tens, delta];
            a = randInt(unit + 1, maxGetal - (operator === '+' ? tens : 0));
            if (operator === '-' && a <= b) continue;
            // a must not itself be a round number, else there is nothing handig about it.
            if (a % unit === 0) continue;
        } else {
            // splitsen: b decomposes into its tens + units part (both non-zero).
            const tPart = randInt(1, Math.min(9, Math.floor((maxGetal - 11) / 10))) * 10;
            const ePart = randInt(1, 9);
            b = tPart + ePart;
            steps = [tPart, ePart];
            a = randInt(2, maxGetal - (operator === '+' ? b : 0));
            if (operator === '-' && a <= b) continue;
        }
        const answer = operator === '+' ? a + b : a - b;
        if (answer < 0 || answer > maxGetal) continue;
        const key = `${a}${operator}${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), a, b, operator, strategy, steps, answer, isManuallyEdited: false });
    }
    return out;
}
