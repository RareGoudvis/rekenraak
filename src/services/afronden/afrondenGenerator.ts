import type { MathBlock, AfrondenExercise } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';
import { formatMathNumber } from '../math/formatters';
import type { AfrondenConstraints } from '../math/constraintTypes';
import { targetsFor, roundTo, type RoundTarget } from './roundTargets';

// The target table and roundTo live in roundTargets.ts so the worked steps can read them without this generator.
export { type RoundTarget, targetsFor, ROUND_SCALE, roundTo } from './roundTargets';

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

// The columns a block really prints: usable targets, else the first one (viewer, generator and title agree).
export function columnTargets(c: AfrondenConstraints): RoundTarget[] {
    const numberType = c.numberType ?? 'natural';
    const maxGetal = c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000);
    const decimalPlaces = c.decimalPlaces ?? 2;
    const selected = c.roundTargets ?? (numberType === 'decimal' ? ['E', 't'] : ['T', 'H']);
    const usable = usableTargets(numberType, maxGetal, decimalPlaces, selected);
    return usable.length ? usable : [targetsFor(numberType)[0]];
}

// SYNC: AfrondenConfig offers exactly these pills for a natural block.
export function naturalTargetOffered(t: RoundTarget, maxGetal: number): boolean {
    return t.inclusive ? t.weight <= maxGetal : t.weight < maxGetal;
}

/** The column header a sheet prints for a target: the short heading, else its key. */
export function targetHeading(t: RoundTarget): string {
    return t.heading ?? t.key;
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
    // From 5: a smaller number rounds to 0 on the tiental ("2 ≈ 0") and teaches nothing.
    const floor = Math.min(5, maxGetal);
    if (!active.length) return randInt(floor, maxGetal);
    // Retry the masked build until it fits (a top place near maxGetal can overshoot);
    // only an impossible mask drops to a free number, so the mask is honored whenever
    // it can produce an in-range value (was: silently random on the first overshoot).
    for (let tries = 0; tries < 200; tries++) {
        let n = 0;
        for (const p of active) n += randInt(1, 9) * p.weight;
        if (n <= maxGetal) return n;
    }
    return randInt(floor, maxGetal);
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
    // The printed decimals travel with the numbers, so 4,10 keeps its zero beside 70,34.
    const dp = numberType === 'decimal' ? { decimalPlaces } : {};

    if (subType === 'simpel') {
        const out: AfrondenExercise[] = [];
        const seen = new Set<string>();
        let attempts = 0;
        while (out.length < count && attempts < 20000) {
            attempts++;
            const targetKey = pool[randInt(0, pool.length - 1)];
            const weight = all.find(t => t.key === targetKey)?.weight ?? 1;
            // A number that rounds to 0 on this target shows nothing: redraw it (a few tries, a mask may allow no other).
            let number = newNumber();
            for (let t = 0; t < 50 && roundTo(number, weight) === 0; t++) number = newNumber();
            const key = `${number}-${targetKey}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), number, targetKey, ...dp, isManuallyEdited: false });
        }
        return out;
    }

    // rooster: each exercise is a whole rooster of `roosterSize` distinct numbers.
    return Array.from({ length: count }, () => {
        const nums = new Set<number>();
        let g = 0;
        while (nums.size < roosterSize && g++ < roosterSize * 60) nums.add(newNumber());
        return { id: Math.random().toString(36).substring(2, 9), numbers: [...nums], ...dp, isManuallyEdited: false };
    });
}
