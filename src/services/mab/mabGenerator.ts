import type { MathBlock, MabExercise } from '../math/types';
import type { MabConstraints } from '../math/constraintTypes';

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

// "Specifieke getalopbouw": a ticked place holds 1-9, an unticked place must be 0
// (H + T at 1000 → 110, 120 … 990). An empty mask means free.
function maskMatches(n: number, mask: Record<string, boolean>): boolean {
    const { thousands, hundreds, tens, units } = decompose(n);
    const digits: Record<string, number> = { D: thousands, H: hundreds, T: tens, E: units };
    return Object.entries(digits).every(([k, d]) => (mask[k] ? d >= 1 : d === 0));
}

const MAX_ATTEMPTS = 20000;

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMabExercises(block: MathBlock): MabExercise[] {
    const {
        operand1Mask = {},
    } = block.constraints as MabConstraints;

    // MAB is a place-value drawing (units/tens/hundreds/thousands) and tops out at 1000 by
    // design, but the global base seed can push maxNumber to 1e10 — clamp before it is ever
    // used as a range (it used to size an Array.from pool → RangeError at leerjaar 6).
    const maxNumber = Math.max(1, Math.min((block.constraints as MabConstraints).maxNumber ?? 100, 9999));

    const n = block.numberOfExercises;
    const results: MabExercise[] = [];
    const used = new Set<number>();

    const push = (v: number) => {
        results.push({ id: Math.random().toString(36).substring(2, 9), value: v, ...decompose(v), isManuallyEdited: false });
    };

    const hasMask = Object.values(operand1Mask).some(Boolean);
    if (!hasMask) {
        // Unchanged rejection loop so the default (free) blocks keep their random stream.
        let attempts = 0;
        while (results.length < n && attempts < MAX_ATTEMPTS) {
            attempts++;
            const v = randInt(1, maxNumber);
            if (used.has(v)) continue;
            used.add(v);
            push(v);
        }
        while (results.length < n) push(randInt(1, maxNumber));
        return results;
    }

    // A mask admits few values (H+T at 1000 → 81), so list them and draw without
    // replacement; repeat only when the pool is smaller than the block.
    let pool: number[] = [];
    for (let v = 1; v <= maxNumber; v++) if (maskMatches(v, operand1Mask)) pool.push(v);
    // An impossible mask (T+E at max 10) falls back to free numbers rather than a blank block.
    if (pool.length === 0) pool = Array.from({ length: maxNumber }, (_, i) => i + 1);
    let bag: number[] = [];
    while (results.length < n) {
        if (bag.length === 0) bag = [...pool];
        push(bag.splice(randInt(0, bag.length - 1), 1)[0]);
    }

    return results;
}
