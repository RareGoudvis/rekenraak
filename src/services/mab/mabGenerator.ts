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

const MAX_ATTEMPTS = 20000;

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMabExercises(block: MathBlock): MabExercise[] {
    const {
        operand1Mask = {},
    } = block.constraints;

    // MAB is a place-value drawing (units/tens/hundreds/thousands) and tops out at 1000 by
    // design, but the global base seed can push maxNumber to 1e10 — clamp before it is ever
    // used as a range (it used to size an Array.from pool → RangeError at leerjaar 6).
    const maxNumber = Math.max(1, Math.min(block.constraints.maxNumber ?? 100, 9999));

    const n = block.numberOfExercises;
    const results: MabExercise[] = [];
    const used = new Set<number>();

    const push = (v: number) => {
        results.push({ id: Math.random().toString(36).substring(2, 9), value: v, ...decompose(v), isManuallyEdited: false });
    };

    let attempts = 0;
    while (results.length < n && attempts < MAX_ATTEMPTS) {
        attempts++;
        const v = randInt(1, maxNumber);
        if (!maskMatches(v, operand1Mask, maxNumber)) continue;
        if (used.has(v)) continue;
        used.add(v);
        push(v);
    }

    // A near-empty mask (H at maxNumber 100 → only {100}) or an impossible one (D+H at 1000
    // → none) exhausts the attempts; repeat matching values, or drop the mask entirely, so
    // the teacher gets `n` exercises instead of a blank block.
    while (results.length < n) {
        let v = randInt(1, maxNumber);
        for (let i = 0; i < 500 && !maskMatches(v, operand1Mask, maxNumber); i++) v = randInt(1, maxNumber);
        push(v);
    }

    return results;
}
