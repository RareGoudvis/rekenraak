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

export function generateRekenvolgordeExercises(block: MathBlock): RekenvolgordeExercise[] {
    const c = block.constraints;
    const operators: string[] = c.operators ?? ['+', '-', 'x'];
    const haakjes: boolean = c.haakjes ?? true;
    const opsCount: number = c.opsCount ?? 2;
    const maxGetal: number = c.maxGetal ?? 100;
    const tableLimit: number = c.tableLimit ?? 10;
    const count = block.numberOfExercises || 10;

    const out: RekenvolgordeExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        // Build a flat expression; ×/: operands stay within the tafelbereik.
        const ops = Array.from({ length: opsCount }, () => pick(operators));
        // At least one ×/: needed, else volgorde is trivial left-to-right.
        if (!ops.some(o => o === 'x' || o === ':')) continue;
        const nums: number[] = [];
        for (let i = 0; i <= opsCount; i++) {
            const nextToMul = ops[i] === 'x' || ops[i] === ':' || ops[i - 1] === 'x' || ops[i - 1] === ':';
            nums.push(nextToMul ? randInt(2, tableLimit) : randInt(1, Math.min(50, maxGetal)));
        }
        const flat: Tok[] = [];
        nums.forEach((n, i) => { flat.push(n); if (i < ops.length) flat.push(ops[i]); });

        const plain = evalFlat(flat);
        if (plain === null || plain > maxGetal || !Number.isInteger(plain)) continue;

        let tokens: Tok[] = flat;
        let answer = plain;
        let firstStep: number;

        const wantBrackets = haakjes && Math.random() < 0.5;
        if (wantBrackets) {
            // Bracket the FIRST pair (a op b) — meaningful only if it changes the result.
            const sub = evalFlat(flat.slice(0, 3));
            if (sub === null) continue;
            const bracketed = evalFlat([sub, ...flat.slice(3)]);
            if (bracketed === null || bracketed === plain || bracketed > maxGetal || bracketed < 0 || !Number.isInteger(bracketed)) continue;
            tokens = ['(', ...flat.slice(0, 3), ')', ...flat.slice(3)];
            answer = bracketed;
            firstStep = sub;
        } else {
            // First step = leftmost ×/: pair.
            const i = flat.findIndex(t => t === 'x' || t === ':');
            const a = flat[i - 1] as number, b = flat[i + 1] as number;
            firstStep = flat[i] === 'x' ? a * b : a / b;
        }

        const key = tokens.join(' ');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), tokens, answer, firstStep, isManuallyEdited: false });
    }
    return out;
}
