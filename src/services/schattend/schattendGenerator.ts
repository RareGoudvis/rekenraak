import type { MathBlock, SchattendExercise } from '../math/types';
import { targetsFor, roundTo, usableTargets } from '../afronden/afrondenGenerator';
import type { SchattendConstraints } from '../math/constraintTypes';

// Schattend rekenen — round both operands to a place, then compute mentally:
// "412 + 387 ≈ ___ + ___ ≈ ___". Reuses the afronden target/rounding helpers.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

// Operand in [lo, hi]; decimals are whole multiples of 10^-decimalPlaces.
function buildOperand(numberType: string, lo: number, hi: number, decimalPlaces: number): number {
    if (numberType === 'decimal') {
        const scale = Math.pow(10, decimalPlaces);
        const sLo = Math.max(1, Math.ceil(lo * scale - 1e-9)), sHi = Math.floor(hi * scale + 1e-9);
        return Number((randInt(sLo, Math.max(sLo, sHi)) / scale).toFixed(decimalPlaces));
    }
    return randInt(lo, hi);
}

// Selected targets that cannot change a number at this max (or precision) are swapped for the nearest one that can.
function resolveTargets(numberType: string, maxGetal: number, decimalPlaces: number, selected: string[]) {
        const all = targetsFor(numberType);
    const usable = usableTargets(numberType, maxGetal, decimalPlaces, selected);
    if (usable.length) return { pool: usable, note: null as string | null };
    const valid = usableTargets(numberType, maxGetal, decimalPlaces, all.map(t => t.key));
    const want = all.filter(t => selected.includes(t.key));
    const ref = want.length ? Math.max(...want.map(t => t.weight)) : all[0].weight;
    const nearest = (valid.length ? valid : [all[0]]).reduce((best, t) =>
        Math.abs(Math.log(t.weight / ref)) < Math.abs(Math.log(best.weight / ref)) ? t : best);
    const from = want.map(t => t.label).join(', ') || ref.toString();
    return { pool: [nearest], note: `Afronden op ${from} past niet bij dit maximum; afgerond op ${nearest.label}.` };
}

export function generateSchattendNoted(block: MathBlock): { items: SchattendExercise[]; note: string | null } {
    const c = block.constraints as SchattendConstraints;
    const operators: ('+' | '-' | 'x' | ':')[] = c.operators ?? ['+', '-'];
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = c.decimalPlaces ?? 2;
    const targets: string[] = c.roundTargets ?? (numberType === 'decimal' ? ['E'] : ['H']);
    const { pool, note } = resolveTargets(numberType, maxGetal, decimalPlaces, targets);
    const count = block.numberOfExercises || 8;

    const out: SchattendExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const operator = pick(operators);
        const t = pick(pool);
        // Keep operands above the rounding weight so the estimate isn't trivially 0.
        const lo = numberType === 'decimal' ? 1 / Math.pow(10, decimalPlaces) : Math.max(2, Math.round(t.weight / 2));
        // The RESULT (exact and rounded) stays ≤ maxGetal, so each operand is drawn under what is left of the max.
        let a: number;
        let b: number;
        if (operator === 'x') {
            // One small factor keeps the estimate hoofdrekenbaar.
            b = randInt(2, 9);
            if (maxGetal / b < lo) continue;
            a = buildOperand(numberType, lo, maxGetal / b, decimalPlaces);
        } else if (operator === ':') {
            a = buildOperand(numberType, lo, maxGetal, decimalPlaces);
            b = randInt(2, 9);
            // Make the ROUNDED division exact so the estimate is a clean number.
            const ra = roundTo(a, t.weight);
            if (ra === 0 || (ra / b) % 1 !== 0) continue;
        } else if (operator === '+') {
            if (maxGetal < 2 * lo) continue;
            a = buildOperand(numberType, lo, maxGetal - lo, decimalPlaces);
            b = buildOperand(numberType, lo, maxGetal - a, decimalPlaces);
        } else {
            a = buildOperand(numberType, lo, maxGetal, decimalPlaces);
            b = buildOperand(numberType, lo, maxGetal, decimalPlaces);
        }
        if (operator === '-' && a < b) [a, b] = [b, a];
        const ra = roundTo(a, t.weight);
        const rb = operator === 'x' || operator === ':' ? b : roundTo(b, t.weight);
        // A rounded operand of 0 (e.g. 34 → 0 op H) makes a meaningless exercise.
        if (ra === 0 || rb === 0) continue;
        // Both the exact result and the estimate printed in the key must respect the max.
        const rounded = operator === '+' ? ra + rb : operator === '-' ? ra - rb : operator === 'x' ? ra * rb : ra / rb;
        const exact = operator === '+' ? a + b : operator === '-' ? a - b : operator === 'x' ? a * b : a / b;
        if (rounded > maxGetal + 1e-9 || exact > maxGetal + 1e-9) continue;
        // Skip when nothing actually rounds — then it's not schattend.
        if (ra === a && rb === b) continue;
        const key = `${a}${operator}${b}-${t.key}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), a, b, operator, targetKey: t.key, isManuallyEdited: false });
    }
    return { items: out, note };
}

export function generateSchattendExercises(block: MathBlock): SchattendExercise[] {
    return generateSchattendNoted(block).items;
}
