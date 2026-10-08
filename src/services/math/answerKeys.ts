import type { Equation, Fraction } from './types';

// Answer-key arithmetic shared by generators.answers.test.ts, the limit harness and the kiosk
// answer check (oefenen): written from scratch, never imported from the generators it checks.

// mathEngine works in scaled integers (INTERNAL_SCALE = 1_000_000) to dodge JS float
// rounding, so comparisons scale the same way instead of using a tolerance.
export const SCALE = 1_000_000;
export const scaled = (x: number) => Math.round(x * SCALE);

export const isFraction = (v: unknown): v is Fraction => typeof v === 'object' && v !== null && 'n' in (v as object) && 'd' in (v as object);
export const fracValue = (f: Fraction) => (f.whole ?? 0) + f.n / f.d;
export const numValue = (v: number | Fraction) => (isFraction(v) ? fracValue(v) : v);

export function applyOp(a: number, op: string, b: number): number {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case 'x': return a * b;
        case ':': return a / b;
        default: throw new Error(`unknown operator ${op}`);
    }
}

/** Left-to-right evaluation — mathEngine builds chains, not precedence expressions. */
export function evaluateChain(eq: Equation): number {
    const ops = eq.operators ?? eq.operands.slice(1).map(() => eq.operator);
    let acc = numValue(eq.operands[0]);
    for (let i = 1; i < eq.operands.length; i++) acc = applyOp(acc, ops[i - 1], numValue(eq.operands[i]));
    return acc;
}

/** Rekenvolgorde tokens: brackets first, then ×/: left-to-right, then +/−. */
export function evaluateTokens(tokens: (number | string)[]): number {
    const t = [...tokens];
    while (t.includes('(')) {
        const open = t.lastIndexOf('(');
        const close = open + t.slice(open).indexOf(')');
        t.splice(open, close - open + 1, evaluateTokens(t.slice(open + 1, close)));
    }
    for (let i = 1; i < t.length - 1; i++) {
        if (t[i] === 'x' || t[i] === ':') {
            const a = t[i - 1] as number, b = t[i + 1] as number;
            t.splice(i - 1, 3, t[i] === 'x' ? a * b : a / b);
            i -= 1;
        }
    }
    let acc = t[0] as number;
    for (let i = 1; i < t.length - 1; i += 2) acc = t[i] === '+' ? acc + (t[i + 1] as number) : acc - (t[i + 1] as number);
    return acc;
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
