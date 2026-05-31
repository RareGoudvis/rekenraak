import type { MathBlock, AfrondenExercise } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';

export interface RoundTarget { key: string; label: string; weight: number; }

// Natural rounding targets (units excluded — rounding to E is a no-op).
export const NATURAL_TARGETS: RoundTarget[] = [
    { key: 'T',  label: 'tiental',        weight: 10 },
    { key: 'H',  label: 'honderdtal',     weight: 100 },
    { key: 'D',  label: 'duizendtal',     weight: 1000 },
    { key: 'TD', label: 'tienduizendtal', weight: 10000 },
];

// Decimal rounding targets.
export const DECIMAL_TARGETS: RoundTarget[] = [
    { key: 'E', label: 'eenheid',     weight: 1 },
    { key: 't', label: 'tiende',      weight: 0.1 },
    { key: 'h', label: 'honderdste',  weight: 0.01 },
];

export function targetsFor(numberType: string): RoundTarget[] {
    return numberType === 'decimal' ? DECIMAL_TARGETS : NATURAL_TARGETS;
}

// Decimal-safe round to a place weight (10, 100, 0.1, 0.01, …).
export function roundTo(n: number, weight: number): number {
    return Number((Math.round(n / weight) * weight).toFixed(6));
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildNatural(maxGetal: number, numberMask: Record<string, boolean>): number {
    const active = getMaskPlaces(maxGetal, 'natural').filter(p => numberMask[p.key]);
    if (!active.length) return randInt(1, maxGetal);
    let n = 0;
    for (const p of active) n += randInt(1, 9) * p.weight;
    return n > maxGetal ? randInt(1, maxGetal) : n;
}

// Decimal number with `decimalPlaces` digits after the comma, in [0.1, maxGetal].
function buildDecimal(maxGetal: number, decimalPlaces: number): number {
    const scale = Math.pow(10, decimalPlaces);
    const intval = randInt(1, maxGetal * scale - 1);
    return Number((intval / scale).toFixed(decimalPlaces));
}

export function generateAfrondenExercises(block: MathBlock): AfrondenExercise[] {
    const subType: string = block.constraints.subType ?? 'rooster';
    const numberType: string = block.constraints.numberType ?? 'natural';
    const maxGetal: number = block.constraints.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = block.constraints.decimalPlaces ?? 2;
    const numberMask: Record<string, boolean> = block.constraints.numberMask ?? {};
    const roosterSize: number = block.constraints.roosterSize ?? 6;
    const targets: string[] = block.constraints.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const all = targetsFor(numberType);
    // Only targets that make sense for this range (natural: weight below maxGetal).
    const usable = all.filter(t => targets.includes(t.key) && (numberType === 'decimal' || t.weight < maxGetal)).map(t => t.key);
    const pool = usable.length ? usable : [all[0].key];

    const newNumber = () => (numberType === 'decimal' ? buildDecimal(maxGetal, decimalPlaces) : buildNatural(maxGetal, numberMask));
    const count = block.numberOfExercises || 6;

    if (subType === 'simpel') {
        const out: AfrondenExercise[] = [];
        const seen = new Set<string>();
        let attempts = 0;
        while (out.length < count && attempts < 20000) {
            attempts++;
            const number = newNumber();
            const targetKey = pool[randInt(0, pool.length - 1)];
            const key = `${number}-${targetKey}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), number, targetKey, isManuallyEdited: false });
        }
        return out;
    }

    // rooster: each exercise is a whole rooster of `roosterSize` distinct numbers.
    return Array.from({ length: count }, () => {
        const nums = new Set<number>();
        let g = 0;
        while (nums.size < roosterSize && g++ < roosterSize * 60) nums.add(newNumber());
        return { id: Math.random().toString(36).substring(2, 9), numbers: [...nums], isManuallyEdited: false };
    });
}
