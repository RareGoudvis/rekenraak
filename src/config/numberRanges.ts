// ── Number ranges: every max-number picker's option list, declared once ─────
// The config plugins render these lists, constraintSpace.ts sweeps them, and the
// registry's `maxPresets` names which one a block shows — so the grade seed can floor
// into the list the teacher will actually see. Pure data (no React, no store).

// Highest number any generator is handed: 1e9 × INTERNAL_SCALE (1e6) = 1e15 stays below
// 2^53, while 1e10 (the old leerjaar-6 seed) does not.
export const NAT_CEILING = 1_000_000_000;

// Every step a natural-number max can take, low to high.
export const NAT_STEPS: readonly number[] = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000];

export type MaxKey = 'maxGetal' | 'maxRange' | 'maxNumber';
export interface MaxRange { key: MaxKey; presets: readonly number[] }
// Registry contract: the list a block's config shows for its current settings (null = no picker).
export type MaxPresetsFn = (c: Record<string, unknown>) => MaxRange | null;

// ── Lists that reach 1e9 (every list the old global 1 000 000 used to cap) ──
const NAT_TO_1E9_FROM_100: readonly number[] = NAT_STEPS.filter(v => v >= 100);

// ── Lists that keep their own didactic ceiling ──
const DECIMAL: readonly number[] = [10, 100, 1_000];
const HR_TIENVOUD: readonly number[] = [100, 1_000, 10_000];
const SPLITSEN_BASIS: readonly number[] = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000];
const SPLITSEN_BOOM: readonly number[] = [10, 20, 100, 1_000];
const SPLITSEN_HARTEN: readonly number[] = [10, 20, 100];
const TO_1E5_FROM_20: readonly number[] = [20, 100, 1_000, 10_000, 100_000];
const TO_1E5_FROM_100: readonly number[] = [100, 1_000, 10_000, 100_000];
const TO_1E4_FROM_100: readonly number[] = [100, 1_000, 10_000];
const TO_1E3_FROM_10: readonly number[] = [10, 20, 100, 1_000];

export const RANGES = {
    // Basisinstellingen (sidebar → Geavanceerd): the seed every new block floors from.
    base: NAT_STEPS,
    // Hoofdrekenen + / − and gemengd, natural (and gehele: same panel).
    hrNatural: NAT_STEPS,
    // Hoofdrekenen × / : in 'andere' mode (free sums with masks and division levels).
    hrAndere: NAT_STEPS.filter(v => v >= 1_000),
    // ×/: 'Met 10, 100, 1000': the factor does the work, the base number stays small.
    hrTienvoud: HR_TIENVOUD,
    // Every decimal list (hoofdrekenen, gemengd, afronden, schattend, vergelijken-representaties).
    decimal: DECIMAL,
    cijferNatural: NAT_STEPS.filter(v => v >= 20),
    // Decimal cijferen never had 1e7 / 1e8: it jumps from 1e6 to the ceiling.
    cijferDecimal: [20, 100, 1_000, 10_000, 100_000, 1_000_000, 1_000_000_000] as readonly number[],
    afrondenNatural: NAT_TO_1E9_FROM_100,
    plaatswaarde: NAT_TO_1E9_FROM_100,
    vergelijken: NAT_TO_1E9_FROM_100,
    vergelijkenRepresentaties: DECIMAL,
    splitsenTabel: NAT_STEPS,
    // positie-benen + positie-math.
    splitsenPositie: NAT_STEPS,
    // The rooster pins 10 on its leaf; its list stays where it was (owner call, plan appendix #10).
    splitsenBasis: SPLITSEN_BASIS,
    splitsenBoom: SPLITSEN_BOOM,
    splitsenHarten: SPLITSEN_HARTEN,
    deelbaarheid: TO_1E5_FROM_100,
    deelbaarheidKleurStrook: [20, 100, 1_000] as readonly number[],
    deelbaarheidKleurRaster: [100, 1_000] as readonly number[],
    getallenas: TO_1E5_FROM_20,
    getallenrijen: TO_1E5_FROM_20,
    patronen: TO_1E5_FROM_20,
    ordenen: TO_1E5_FROM_20,
    schattendNatural: TO_1E5_FROM_100,
    evenOneven: [20, 100, 1_000, 10_000] as readonly number[],
    procenten: TO_1E4_FROM_100,
    controleren: [1_000, 10_000] as readonly number[],
    geld: TO_1E3_FROM_10,
    // maxEuro, not a base-seeded key: euros with a percent on top.
    geldRekenen: TO_1E4_FROM_100,
    mab: TO_1E3_FROM_10,
    ketting: [20, 100, 1_000] as readonly number[],
    rekenvolgorde: [100, 1_000] as readonly number[],
    // Herleidingen are unit-based (km² ≥ 1e4 already overflows), so they never grow.
    herleidingenSamengesteld: [10, 100, 1_000, 10_000, 100_000, 1_000_000] as readonly number[],
} as const;

// maxEnkel is a free slider (step 10), not a list; the matrix samples min / default / max.
export const HERLEIDINGEN_ENKEL = { min: 10, max: 1_000, step: 10 } as const;

// Largest preset ≤ v. Below the lowest (or not a finite number) → lowest; above the top → top.
export function floorToPreset(v: number, presets: readonly number[]): number {
    if (presets.length === 0) return v;
    const sorted = [...presets].sort((a, b) => a - b);
    if (!Number.isFinite(v)) return sorted[0];
    let out = sorted[0];
    for (const p of sorted) if (p <= v) out = p;
    return out;
}

export const presetLabel = (v: number): string => `Tot ${v.toLocaleString('nl-BE')}`;
