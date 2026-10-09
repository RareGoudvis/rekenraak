import type { MathBlock, AfrondenExercise } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';
import { formatMathNumber } from '../math/formatters';
import type { AfrondenConstraints } from '../math/constraintTypes';

export interface RoundTarget {
    key: string;
    label: string;
    weight: number;
    // What the sheet's column header prints when the key alone would not read ('M' vs 'MLD').
    heading?: string;
    // Offered once maxGetal REACHES the weight instead of exceeding it: only 1MLD, the top of the list.
    inclusive?: boolean;
}

// Natural rounding targets (units excluded — rounding to E is a no-op).
const NATURAL_TARGETS: RoundTarget[] = [
    { key: 'T',  label: 'tiental',        weight: 10 },
    { key: 'H',  label: 'honderdtal',     weight: 100 },
    { key: 'D',  label: 'duizendtal',     weight: 1000 },
    { key: 'TD', label: 'tienduizendtal', weight: 10000 },
    // Appended, never inserted: the fallback is all[0] and random picks index the pool in this order,
    // and usableTargets only offers each once maxGetal exceeds its weight (HD from max 1e6 on).
    { key: 'HD', label: 'honderdduizendtal', weight: 100000 },
    // Owner decision (2026-09-27): the millions read as 1M / 10M / 100M / 1MLD, in the config and on the sheet.
    { key: 'M',   label: '1M',   heading: '1M',   weight: 1000000 },
    { key: 'TM',  label: '10M',  heading: '10M',  weight: 10000000 },
    { key: 'HM',  label: '100M', heading: '100M', weight: 100000000 },
    // Rounding a number ≤ 1e9 to the billion gives 0 or 1 000 000 000 — still a real question at the ceiling.
    { key: 'Mrd', label: '1MLD', heading: '1MLD', weight: 1000000000, inclusive: true },
];

// Decimal rounding targets.
const DECIMAL_TARGETS: RoundTarget[] = [
    { key: 'E', label: 'eenheid',     weight: 1 },
    { key: 't', label: 'tiende',      weight: 0.1 },
    { key: 'h', label: 'honderdste',  weight: 0.01 },
];

export function targetsFor(numberType: string): RoundTarget[] {
    return numberType === 'decimal' ? DECIMAL_TARGETS : NATURAL_TARGETS;
}

// Targets that actually CHANGE a number under these settings:
//  - natural: weight must be below maxGetal (rounding to a place ≥ the max is a no-op).
//  - decimal: weight must exceed the number's granularity 10^-decimalPlaces (rounding
//    to the same-or-finer place than the number's precision leaves it unchanged).
// SYNC: AfrondenViewer uses this so its rooster/simpel columns match the generator.
export function usableTargets(numberType: string, maxGetal: number, decimalPlaces: number, selected: string[]): RoundTarget[] {
    const minChanging = Math.pow(10, -decimalPlaces);
    return targetsFor(numberType).filter(t => selected.includes(t.key) && (
        numberType === 'decimal' ? t.weight > minChanging + 1e-9 : naturalTargetOffered(t, maxGetal)
    ));
}

// SYNC: AfrondenConfig offers exactly these pills for a natural block.
export function naturalTargetOffered(t: RoundTarget, maxGetal: number): boolean {
    return t.inclusive ? t.weight <= maxGetal : t.weight < maxGetal;
}

/** The column header a sheet prints for a target: the short heading, else its key. */
export function targetHeading(t: RoundTarget): string {
    return t.heading ?? t.key;
}

// 1e6 = micro-units: every place weight (≥ 0.001) and every generated number is a whole
// count of them, and 1e9 × 1e6 still sits below 2^53.
export const ROUND_SCALE = 1e6;

// Round half up to a place weight (10, 100, 0.1, 0.01, …) in scaled integers: dividing by a
// decimal weight first turns 97.05 / 0.1 into 970.4999… and rounds it the wrong way.
export function roundTo(n: number, weight: number): number {
    const units = Math.round(n * ROUND_SCALE);
    const step = Math.round(weight * ROUND_SCALE);
    let q = Math.floor(units / step);
    const rest = units - q * step;
    if (rest * 2 >= step) q += 1;
    return (q * step) / ROUND_SCALE;
}

// The rounded value as the key prints it: a decimal target keeps its own decimals, so 55,97
// rounded to the tiende reads "56,0" in a t column, never "56".
export function roundedText(n: number, t: RoundTarget): string {
    const decimals = t.weight < 1 ? Math.round(-Math.log10(t.weight)) : 0;
    return formatMathNumber(roundTo(n, t.weight).toFixed(decimals));
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildNatural(maxGetal: number, numberMask: Record<string, boolean>): number {
    const active = getMaskPlaces(maxGetal, 'natural').filter(p => numberMask[p.key]);
    if (!active.length) return randInt(1, maxGetal);
    // Retry the masked build until it fits (a top place near maxGetal can overshoot);
    // only an impossible mask drops to a free number, so the mask is honored whenever
    // it can produce an in-range value (was: silently random on the first overshoot).
    for (let tries = 0; tries < 200; tries++) {
        let n = 0;
        for (const p of active) n += randInt(1, 9) * p.weight;
        if (n <= maxGetal) return n;
    }
    return randInt(1, maxGetal);
}

// Decimal number with `decimalPlaces` digits after the comma, in [0.1, maxGetal].
function buildDecimal(maxGetal: number, decimalPlaces: number): number {
    const scale = Math.pow(10, decimalPlaces);
    const intval = randInt(1, maxGetal * scale - 1);
    return Number((intval / scale).toFixed(decimalPlaces));
}

export function generateAfrondenExercises(block: MathBlock): AfrondenExercise[] {
    const c = block.constraints as AfrondenConstraints;
    const subType: string = c.subType ?? 'rooster';
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces: number = c.decimalPlaces ?? 2;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    const roosterSize: number = c.roosterSize ?? 6;
    const targets: string[] = c.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const all = targetsFor(numberType);
    // Only targets that actually change the number (excludes decimal no-ops like rounding
    // a 1-decimal number "to tiende"). Falls back to the coarsest target if none qualify.
    const usable = usableTargets(numberType, maxGetal, decimalPlaces, targets).map(t => t.key);
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
