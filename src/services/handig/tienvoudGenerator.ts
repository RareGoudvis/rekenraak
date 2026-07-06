import type { MathBlock, Equation } from '../math/types';

// × / : met 10, 100, 1000 — reuses the standard Equation shape so the existing
// MathBlockRenderer prints these like any hoofdrekenen line.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

// Decimal-safe multiply/divide by a power of ten (comma shift, no float drift).
function shift(n: number, factor: number, divide: boolean): number {
    return Number((divide ? n / factor : n * factor).toFixed(6));
}

export function generateTienvoudExercises(block: MathBlock): Equation[] {
    const c = block.constraints;
    const operators: ('x' | ':')[] = c.operators ?? ['x', ':'];
    const factors: number[] = c.factors ?? [10, 100, 1000];
    const numberType: string = c.numberType ?? 'natural';
    const decimalPlaces: number = c.decimalPlaces ?? 2;
    const maxGetal: number = c.maxGetal ?? 1000;
    const missingFactor: boolean = c.missingFactor ?? false;
    const count = block.numberOfExercises || 10;

    const out: Equation[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const operator = pick(operators);
        const factor = pick(factors);
        let base: number;
        if (numberType === 'decimal') {
            const scale = Math.pow(10, decimalPlaces);
            base = Number((randInt(1, maxGetal * scale - 1) / scale).toFixed(decimalPlaces));
        } else {
            // For ':' build answer-first: quotient ≤ maxGetal, dividend = quotient × factor
            // (dividends legitimately exceed maxGetal — that's the point of ": 1000").
            base = operator === ':' ? randInt(1, maxGetal) * factor : randInt(1, maxGetal);
        }
        const answer = shift(base, factor, operator === ':');
        // Natural mode must never produce a decimal answer.
        if (numberType !== 'decimal' && !Number.isInteger(answer)) continue;
        const key = `${base}${operator}${factor}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            id: Math.random().toString(36).substring(2, 9),
            operands: [base, factor],
            operator,
            answer,
            // A share of items asks the factor instead of the result.
            missingTerm: missingFactor && out.length % 2 === 1 ? 'operand2' : 'result',
            isManuallyEdited: false,
        });
    }
    return out;
}
