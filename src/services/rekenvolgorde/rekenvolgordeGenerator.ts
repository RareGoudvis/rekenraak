import type { MathBlock, RekenvolgordeExercise } from '../math/types';

// Rekenvolgorde en haakjes — small token expressions where order of operations
// matters. Brackets are only planted when they actually change the outcome.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

type Tok = number | string;

// Evaluate a flat token list with ×/: before +/− (brackets already resolved by caller).
function evalFlat(tokens: Tok[]): number | null {
    const t = [...tokens];
    for (let i = 1; i < t.length - 1; i++) {
        if (t[i] === 'x' || t[i] === ':') {
            const a = t[i - 1] as number, b = t[i + 1] as number;
            if (t[i] === ':' && (b === 0 || a % b !== 0)) return null;
            t.splice(i - 1, 3, t[i] === 'x' ? a * b : a / b);
            i -= 1;
        }
    }
    let acc = t[0] as number;
    for (let i = 1; i < t.length - 1; i += 2) {
        const b = t[i + 1] as number;
        acc = t[i] === '+' ? acc + b : acc - b;
        if (acc < 0) return null;
    }
    return acc;
}

// Friendly pairs make long chains hoofdrekenbaar: two values that combine to a
// round number (150+50, 750−250, 4×25) — pupils may reorder, so placement is free.
const MUL_PAIRS: [number, number][] = [[2, 5], [4, 25], [5, 20], [2, 50], [5, 2]];

function friendlyNums(ops: string[], maxGetal: number, tableLimit: number): number[] | null {
    const opsCount = ops.length;
    const allPlus = ops.every(o => o === '+');
    const plusMinus = ops.every(o => o === '+' || o === '-');
    const allMul = ops.every(o => o === 'x');
    if (allMul) {
        const [p, q] = MUL_PAIRS[randInt(0, MUL_PAIRS.length - 1)];
        const rest = Array.from({ length: opsCount - 1 }, () => randInt(2, Math.min(9, tableLimit)));
        // Friendly factors at the ends (4 × 7 × 25 pattern).
        return [p, ...rest, q];
    }
    if (allPlus || plusMinus) {
        // One rounding pair: x + y lands exactly on a tienvoud/honderdtal (150 + 50).
        const unit = maxGetal >= 500 ? 100 : 10;
        const r = randInt(1, unit - 1);
        const x = randInt(1, Math.max(1, Math.min(9, Math.floor(maxGetal / unit) - 1))) * unit + r;
        const y = (unit - r) + unit * randInt(0, 1);   // complement, optionally one extra round unit
        const rest = Array.from({ length: opsCount - 1 }, () => randInt(2, Math.min(maxGetal, unit === 100 ? 400 : 40)));
        if (allPlus) return [x, ...rest, y];
        // minus chain: big minuend, friendly pair = first & last (750 − 37 − 250).
        const round = unit * randInt(2, Math.max(3, Math.floor(maxGetal / unit) - 1));
        const sub = unit * randInt(1, Math.max(1, Math.floor(round / unit) - 1));
        return [round, ...rest, sub];
    }
    return null;   // mixed ops with ×/: — no friendly bias, plain random works
}

export function generateRekenvolgordeExercises(block: MathBlock): RekenvolgordeExercise[] {
    const c = block.constraints;
    const operators: string[] = c.operators ?? ['+', '-', 'x'];
    // GEEN = never brackets · MAG = ~half the items · MOET = every item.
    const haakjesMode: string = c.haakjesMode ?? 'MAG';
    const opsCount: number = Math.min(4, Math.max(2, c.opsCount ?? 2));
    const maxGetal: number = c.maxGetal ?? 100;
    const tableLimit: number = c.tableLimit ?? 10;
    const count = block.numberOfExercises || 10;

    const out: RekenvolgordeExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const ops = Array.from({ length: opsCount }, () => pick(operators));
        // Long +/− chains are allowed without ×/: (volgorde = reordering practice);
        // 2-op expressions still need a ×/: or there is nothing to learn.
        if (opsCount === 2 && !ops.some(o => o === 'x' || o === ':')) continue;

        let nums: number[] | null = opsCount >= 3 ? friendlyNums(ops, maxGetal, tableLimit) : null;
        if (!nums) {
            nums = [];
            for (let i = 0; i <= opsCount; i++) {
                const nextToMul = ops[i] === 'x' || ops[i] === ':' || ops[i - 1] === 'x' || ops[i - 1] === ':';
                nums.push(nextToMul ? randInt(2, tableLimit) : randInt(1, Math.min(50, maxGetal)));
            }
        }
        if (nums.length !== opsCount + 1) continue;
        const flat: Tok[] = [];
        nums.forEach((n, i) => { flat.push(n); if (i < ops.length) flat.push(ops[i]); });

        const plain = evalFlat(flat);
        if (plain === null || plain > maxGetal * (opsCount >= 3 ? 10 : 1) || plain < 0 || !Number.isInteger(plain)) continue;

        let tokens: Tok[] = flat;
        let answer = plain;

        const wantBrackets = haakjesMode === 'MOET' || (haakjesMode === 'MAG' && Math.random() < 0.5);
        if (wantBrackets) {
            // Bracket the FIRST pair (a op b) — meaningful only if it changes the result.
            const sub = evalFlat(flat.slice(0, 3));
            if (sub === null) continue;
            const bracketed = evalFlat([sub, ...flat.slice(3)]);
            if (bracketed === null || bracketed === plain || bracketed > maxGetal * (opsCount >= 3 ? 10 : 1) || bracketed < 0 || !Number.isInteger(bracketed)) continue;
            tokens = ['(', ...flat.slice(0, 3), ')', ...flat.slice(3)];
            answer = bracketed;
        }

        const key = tokens.join(' ');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), tokens, answer, firstStep: 0, isManuallyEdited: false });
    }
    return out;
}
