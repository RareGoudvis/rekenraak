import type { MathBlock, MabExercise } from '../math/types';

// 'MAB' = Multibase Arithmetic Blocks (Dienes blocks). Exercise asks pupil
// to read a quantity drawn as place-value blocks and write the matching number.

function decompose(n: number): { thousands: number; hundreds: number; tens: number; units: number } {
    return {
        thousands: Math.floor(n / 1000),
        hundreds: Math.floor(n / 100) % 10,
        tens: Math.floor(n / 10) % 10,
        units: n % 10,
    };
}

// User can require specific place-values to be non-zero via operand1Mask.
// E.g. mask = { H:true, E:true } forces hundreds≥1 and units≥1; tens free.
function maskMatches(n: number, mask: Record<string, boolean>, maxNumber: number): boolean {
    const { thousands, hundreds, tens, units } = decompose(n);
    if (mask.D && maxNumber >= 1000 && thousands < 1) return false;
    if (mask.H && hundreds < 1) return false;
    if (mask.T && tens < 1) return false;
    if (mask.E && units < 1) return false;
    return true;
}

function shuffle(arr: number[]): number[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function generateMabExercises(block: MathBlock): MabExercise[] {
    const {
        maxNumber = 100,
        operand1Mask = {},
    } = block.constraints;

    const n = block.numberOfExercises;

    // Enumerate the valid pool up front (maxNumber ≤ 1000, cheap) rather than sampling and
    // giving up at MAX_ATTEMPTS with a short/empty block. A near-empty mask (e.g. H at
    // maxNumber 100 → only {100}) or an impossible one (D+H at 1000 → none) previously
    // returned fewer or zero exercises silently.
    let pool = shuffle(Array.from({ length: maxNumber }, (_, i) => i + 1)
        .filter(v => maskMatches(v, operand1Mask, maxNumber)));
    // Impossible mask → relax it so the block isn't empty (better than a blank worksheet).
    if (pool.length === 0) pool = shuffle(Array.from({ length: maxNumber }, (_, i) => i + 1));

    const results: MabExercise[] = [];
    // Prefer distinct values; only repeat (cycling the shuffled pool) when the pool is
    // smaller than the requested count, so the teacher still gets `n` exercises.
    for (let i = 0; i < n; i++) {
        const v = pool[i % pool.length];
        results.push({ id: Math.random().toString(36).substring(2, 9), value: v, ...decompose(v), isManuallyEdited: false });
    }

    return results;
}
