import type { MathBlock, RomeinseExercise } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';

// Difficulty levels (shared by herkennen + schrijven). Higher niveau = bigger range
// and therefore more Roman symbols in play (I V X → L → C D M).
export const NIVEAU_MAX: Record<number, number> = { 1: 12, 2: 39, 3: 100, 4: 3999 };
export const NIVEAU_HINT: Record<number, string> = {
    1: 'tot 12 — I V X (klok-niveau)',
    2: 'tot 39 — I V X (+ IV, IX)',
    3: 'tot 100 — + L (XL, XC)',
    4: 'tot 3999 — + C D M',
};

// Convert to Roman. subtractive=true → IV/IX/XL…; false → additive IIII/VIIII… (easier).
export function toRoman(n: number, subtractive = true): string {
    if (n <= 0) return '';
    const map: [number, string][] = subtractive
        ? [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
        : [[1000, 'M'], [500, 'D'], [100, 'C'], [50, 'L'], [10, 'X'], [5, 'V'], [1, 'I']];
    let res = '', x = n;
    for (const [v, sym] of map) while (x >= v) { res += sym; x -= v; }
    return res;
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildNumber(maxGetal: number, numberMask: Record<string, boolean>): number {
    const active = getMaskPlaces(maxGetal, 'natural').filter(p => numberMask[p.key]);
    if (!active.length) return randInt(1, maxGetal);
    let n = 0;
    for (const p of active) n += randInt(1, 9) * p.weight;
    return n < 1 || n > maxGetal ? randInt(1, maxGetal) : n;
}

export function generateRomeinseExercises(block: MathBlock): RomeinseExercise[] {
    const niveau: number = block.constraints.niveau ?? 2;
    const subtractief: boolean = block.constraints.subtractief ?? true;
    const numberMask: Record<string, boolean> = block.constraints.numberMask ?? {};
    const maxGetal = NIVEAU_MAX[niveau] ?? 39;
    const count = block.numberOfExercises || 8;

    const out: RomeinseExercise[] = [];
    const seen = new Set<number>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const value = buildNumber(maxGetal, numberMask);
        if (seen.has(value)) continue;
        seen.add(value);
        out.push({ id: Math.random().toString(36).substring(2, 9), value, roman: toRoman(value, subtractief), isManuallyEdited: false });
    }
    return out;
}
