import type { MathBlock, EvenOnevenExercise } from '../math/types';
import type { EvenOnevenConstraints } from '../math/constraintTypes';

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick `n` distinct numbers in [1, maxGetal].
function distinctNumbers(n: number, maxGetal: number): number[] {
    const pool = new Set<number>();
    let attempts = 0;
    while (pool.size < n && attempts < n * 50) {
        pool.add(randInt(1, maxGetal));
        attempts++;
    }
    return [...pool];
}

export function generateEvenOnevenExercises(block: MathBlock): EvenOnevenExercise[] {
    const c = block.constraints as EvenOnevenConstraints;
    const subType: string = c.subType ?? 'rooster';
    const maxGetal: number = c.maxGetal ?? 100;
    const perRow: number = c.perRow ?? 10;
    const count = block.numberOfExercises || (subType === 'rooster' ? 3 : 6);

    if (subType === 'cirkels') {
        // One number per exercise, drawn as circles the pupil pairs up.
        const out: EvenOnevenExercise[] = [];
        const seen = new Set<number>();
        let attempts = 0;
        const max = Math.min(maxGetal, 24);   // keep the circle count drawable
        while (out.length < count && attempts < 20000) {
            attempts++;
            const number = randInt(2, max);
            if (seen.has(number)) continue;
            seen.add(number);
            out.push({ id: Math.random().toString(36).substring(2, 9), number, isManuallyEdited: false });
        }
        return out;
    }

    // rooster: each exercise is a row/grid of numbers to colour.
    return Array.from({ length: count }, () => ({
        id: Math.random().toString(36).substring(2, 9),
        numbers: distinctNumbers(perRow, maxGetal),
        isManuallyEdited: false,
    }));
}
