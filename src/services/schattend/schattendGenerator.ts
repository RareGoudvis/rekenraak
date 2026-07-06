import type { MathBlock, SchattendExercise } from '../math/types';
import { targetsFor, roundTo } from '../afronden/afrondenGenerator';

// Schattend rekenen — round both operands to a place, then compute mentally:
// "412 + 387 ≈ ___ + ___ ≈ ___". Reuses the afronden target/rounding helpers.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

function buildOperand(numberType: string, maxGetal: number, decimalPlaces: number, weight: number): number {
    if (numberType === 'decimal') {
        const scale = Math.pow(10, decimalPlaces);
        return Number((randInt(1, maxGetal * scale - 1) / scale).toFixed(decimalPlaces));
    }
    // Keep operands above the rounding weight so the estimate isn't trivially 0.
    return randInt(Math.max(2, Math.round(weight / 2)), maxGetal);
}

export function generateSchattendExercises(block: MathBlock): SchattendExercise[] {
    const c = block.constraints;
    const operators: ('+' | '-' | 'x' | ':')[] = c.operators ?? ['+', '-'];
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = c.decimalPlaces ?? 2;
    const targets: string[] = c.roundTargets ?? (numberType === 'decimal' ? ['E'] : ['H']);
    const all = targetsFor(numberType);
    const usable = all.filter(t => targets.includes(t.key) && (numberType === 'decimal' || t.weight < maxGetal));
    const pool = usable.length ? usable : [all[0]];
    const count = block.numberOfExercises || 8;

    const out: SchattendExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const operator = pick(operators);
        const t = pick(pool);
        let a = buildOperand(numberType, maxGetal, decimalPlaces, t.weight);
        let b: number;
        if (operator === 'x') {
            // One small factor keeps the estimate hoofdrekenbaar.
            b = randInt(2, 9);
        } else if (operator === ':') {
            b = randInt(2, 9);
            // Make the ROUNDED division exact so the estimate is a clean number.
            const ra = roundTo(a, t.weight);
            if (ra === 0 || (ra / b) % 1 !== 0) continue;
        } else {
            b = buildOperand(numberType, maxGetal, decimalPlaces, t.weight);
        }
        if (operator === '-' && a < b) [a, b] = [b, a];
        const ra = roundTo(a, t.weight);
        const rb = operator === 'x' || operator === ':' ? b : roundTo(b, t.weight);
        // A rounded operand of 0 (e.g. 34 → 0 op H) makes a meaningless exercise.
        if (ra === 0 || rb === 0) continue;
        // Skip when nothing actually rounds — then it's not schattend.
        if (ra === a && rb === b) continue;
        const key = `${a}${operator}${b}-${t.key}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), a, b, operator, targetKey: t.key, isManuallyEdited: false });
    }
    return out;
}
