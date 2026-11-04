import type { MathBlock, PlaatswaardeExercise } from '../math/types';
import { getMaskPlaces, digitAtPlace } from '../math/mathEngine';
import type { PlaatswaardeConstraints } from '../math/constraintTypes';

// What a block asks: a plaats / omcirkelen block whose Antwoord is 'waarde' asks the digit's value,
// exactly like a waarde block (same number + underlined place).
export function plaatsView(c: Partial<PlaatswaardeConstraints>): PlaatswaardeConstraints['subType'] {
    const sub = c.subType ?? 'waarde';
    return (sub === 'plaats' || sub === 'omcirkelen') && c.plaatsAnswer === 'waarde' ? 'waarde' : sub;
}

/** The place choices' display order (indices into the number's places, high to low): mixed for 'plaats-shuffle', else as printed. */
export function placeOrder(count: number, ex: Pick<PlaatswaardeExercise, 'number' | 'placeKey'>, c: Partial<PlaatswaardeConstraints>): number[] {
    const order = Array.from({ length: count }, (_, i) => i);
    if (c.plaatsAnswer !== 'plaats-shuffle' || count < 2) return order;
    // Seeded by the exercise itself (FNV-1a of number + place), so the sheet, its key, a kiosk reload
    // and the stats row all see one order without storing it.
    let h = 2166136261;
    for (const ch of `${ex.number}|${ex.placeKey}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const next = () => { h = Math.imul(h ^ (h >>> 13), 2246822507) >>> 0; h = (h ^ (h >>> 16)) >>> 0; return h; };
    for (let i = count - 1; i > 0; i--) {
        const j = next() % (i + 1);
        [order[i], order[j]] = [order[j], order[i]];
    }
    // Three or more places never keep the digits' order (the pupil would count along again);
    // two may, or "always reversed" would be a rule to learn.
    if (count >= 3 && order.every((v, i) => v === i)) order.push(order.shift()!);
    return order;
}

// The top of the tabel's column picker: every place a sheet number can have.
export const TABLE_PLACES_TOP = 1_000_000_000;

/** The tabel's columns for one exercise, high to low, with the digit under each. */
export function tabelPlaces(ex: Pick<PlaatswaardeExercise, 'number'>, c: Partial<PlaatswaardeConstraints>) {
    const dp = c.decimalPlaces ?? 0;
    const chosen = c.tablePlaces;
    if (chosen?.length) {
        // An exercise generated at more decimals than the block now asks keeps its own places.
        const own = Math.max(dp, (String(ex.number).split('.')[1] ?? '').length);
        const picked = getMaskPlaces(TABLE_PLACES_TOP, own > 0 ? 'decimal' : 'natural', own).filter(p => chosen.includes(p.key));
        if (picked.length) return picked.map(p => ({ key: p.key, label: p.label, weight: p.weight, digit: digitAtPlace(ex.number, p.weight) }));
    }
    const all = getMaskPlaces(c.maxGetal ?? 1000, dp > 0 ? 'decimal' : 'natural', dp);
    const start = all.findIndex(p => digitAtPlace(ex.number, p.weight) !== 0);
    return (start < 0 ? all.slice(-1) : all.slice(start)).map(p => ({ key: p.key, label: p.label, weight: p.weight, digit: digitAtPlace(ex.number, p.weight) }));
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Build a number respecting the optional mask. decimalPlaces>0 → decimal (kommagetal).
// Empty mask → free number in range. Each masked place gets a 1–9 digit.
function buildNumber(maxGetal: number, numberMask: Record<string, boolean>, decimalPlaces: number): number {
    const numberType = decimalPlaces > 0 ? 'decimal' : 'natural';
    const active = getMaskPlaces(maxGetal, numberType, decimalPlaces).filter(p => numberMask[p.key]);
    const scale = Math.pow(10, decimalPlaces);
    // Inclusive: "tot 1000" can draw 1000 itself (the rule every other max picker follows).
    const freeNumber = () => Number((randInt(1, maxGetal * scale) / scale).toFixed(decimalPlaces));
    if (!active.length) return freeNumber();
    // A masked place can carry digit 1-9, so a top place at/near maxGetal can overshoot
    // (mask {D} at maxGetal 1000 → 1000-9000). Retry until in range; only an impossible
    // mask (min masked value already > maxGetal) falls back to a free in-range number.
    for (let tries = 0; tries < 200; tries++) {
        let n = 0;
        for (const p of active) n += randInt(1, 9) * p.weight;
        const v = Number(n.toFixed(decimalPlaces));
        if (v <= maxGetal) return v;
    }
    return freeNumber();
}

export function generatePlaatswaardeExercises(block: MathBlock): PlaatswaardeExercise[] {
    const c = block.constraints as PlaatswaardeConstraints;
    const subType: string = c.subType ?? 'waarde';
    const maxGetal: number = c.maxGetal ?? 1000;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    const decimalPlaces: number = c.decimalPlaces ?? 0;
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
