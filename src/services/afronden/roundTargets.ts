// Rounding targets and half-up rounding, shared by the afronden generator, viewer, kiosk and worked steps.
// Light on purpose: the stappenhulp bundle reads it through the afronden steps.

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

