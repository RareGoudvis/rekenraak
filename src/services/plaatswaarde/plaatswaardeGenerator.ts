import type { MathBlock, PlaatswaardeExercise } from '../math/types';
import { getMaskPlaces, digitAtPlace } from '../math/mathEngine';

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Build a number respecting the optional mask. decimalPlaces>0 → decimal (kommagetal).
// Empty mask → free number in range. Each masked place gets a 1–9 digit.
function buildNumber(maxGetal: number, numberMask: Record<string, boolean>, decimalPlaces: number): number {
    const numberType = decimalPlaces > 0 ? 'decimal' : 'natural';
    const active = getMaskPlaces(maxGetal, numberType, decimalPlaces).filter(p => numberMask[p.key]);
    if (!active.length) {
        const scale = Math.pow(10, decimalPlaces);
        return Number((randInt(1, maxGetal * scale - 1) / scale).toFixed(decimalPlaces));
    }
    let n = 0;
    for (const p of active) n += randInt(1, 9) * p.weight;
    return Number(n.toFixed(decimalPlaces));
}

export function generatePlaatswaardeExercises(block: MathBlock): PlaatswaardeExercise[] {
    const subType: string = block.constraints.subType ?? 'waarde';
    const maxGetal: number = block.constraints.maxGetal ?? 1000;
    const numberMask: Record<string, boolean> = block.constraints.numberMask ?? {};
    const decimalPlaces: number = block.constraints.decimalPlaces ?? 0;
    const count = block.numberOfExercises || 6;
    const places = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);

    const out: PlaatswaardeExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const number = buildNumber(maxGetal, numberMask, decimalPlaces);
        // Places whose digit is non-zero — candidates to underline / ask about.
        const present = places.filter(p => digitAtPlace(number, p.weight) !== 0);
        if (!present.length) continue;
        const chosen = present[randInt(0, present.length - 1)];
        // tabel asks for the whole number; waarde/plaats single out one digit.
        const key = subType === 'tabel' ? `t${number}` : `${number}-${chosen.key}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), number, placeKey: chosen.key, isManuallyEdited: false });
    }
    return out;
}
