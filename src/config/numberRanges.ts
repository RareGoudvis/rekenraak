// ── Number ranges: every max-number picker's option list, declared once ─────
// The config plugins render these lists, constraintSpace.ts sweeps them (force=true),
// and the registry's `maxPresets` names which one a block shows — so the grade seed can
// floor into the list the teacher will actually see. Pure data (no React, no store).

// Highest number any generator is handed: 1e9 × INTERNAL_SCALE (1e6) = 1e15 stays below
// 2^53, while 1e10 (the old leerjaar-6 seed) does not.
export const NAT_CEILING = 1_000_000_000;

// Every step a natural-number max can take, low to high.
export const NAT_STEPS: readonly number[] = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000];

// Temporary switch: off, the lists that will grow to 1e9 still return today's values, so
// the groundwork lands without changing a single rendered option. Removed once enabled.
export const BIG_NUMBERS_ENABLED = false;

export type MaxKey = 'maxGetal' | 'maxRange' | 'maxNumber';
export interface MaxRange { key: MaxKey; presets: readonly number[] }
// Registry contract: the list a block's config shows for its current settings (null = no picker).
export type MaxPresetsFn = (c: Record<string, unknown>, force?: boolean) => MaxRange | null;

const BIG_STEPS: readonly number[] = [10_000_000, 100_000_000, 1_000_000_000];

// Lists capped today by the old global 1 000 000 grow by the three big steps; the result
// is sorted and deduped because a few (cijferen, splitsen benen) already end in 1e9.
function grown(legacy: readonly number[], force?: boolean): readonly number[] {
    if (!force && !BIG_NUMBERS_ENABLED) return legacy;
    return [...new Set([...legacy, ...BIG_STEPS])].sort((a, b) => a - b);
}

// ── Lists that grow to 1e9 (legacy values) ──
const HR_NATURAL: readonly number[] = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000];
const HR_ANDERE: readonly number[] = [1_000, 10_000, 100_000, 1_000_000];
const CIJFER: readonly number[] = [20, 100, 1_000, 10_000, 100_000, 1_000_000, 1_000_000_000];
const TO_1E6_FROM_100: readonly number[] = [100, 1_000, 10_000, 100_000, 1_000_000];
const SPLITSEN_POSITIE: readonly number[] = [...HR_NATURAL, 1_000_000_000];

// ── Lists that keep their own didactic ceiling ──
const DECIMAL: readonly number[] = [10, 100, 1_000];
const HR_TIENVOUD: readonly number[] = [100, 1_000, 10_000];
const SPLITSEN_BOOM: readonly number[] = [10, 20, 100, 1_000];
const SPLITSEN_HARTEN: readonly number[] = [10, 20, 100];
const TO_1E5_FROM_20: readonly number[] = [20, 100, 1_000, 10_000, 100_000];
const TO_1E5_FROM_100: readonly number[] = [100, 1_000, 10_000, 100_000];
const TO_1E4_FROM_100: readonly number[] = [100, 1_000, 10_000];
const TO_1E3_FROM_10: readonly number[] = [10, 20, 100, 1_000];

export const RANGES = {
    // Basisinstellingen (sidebar → Geavanceerd): the seed every new block floors from.
    base: (force?: boolean) => grown(HR_NATURAL, force),
    // Hoofdrekenen + / − and gemengd, natural (and gehele: same panel).
    hrNatural: (force?: boolean) => grown(HR_NATURAL, force),
    // Hoofdrekenen × / : in 'andere' mode (free sums with masks and division levels).
    hrAndere: (force?: boolean) => grown(HR_ANDERE, force),
    // ×/: 'Met 10, 100, 1000': the factor does the work, the base number stays small.
    hrTienvoud: (_force?: boolean) => HR_TIENVOUD,
    // Every decimal list (hoofdrekenen, gemengd, afronden, schattend, vergelijken-representaties).
    decimal: (_force?: boolean) => DECIMAL,
    cijferNatural: (force?: boolean) => grown(CIJFER, force),
    cijferDecimal: (_force?: boolean) => CIJFER,
    afrondenNatural: (force?: boolean) => grown(TO_1E6_FROM_100, force),
    plaatswaarde: (force?: boolean) => grown(TO_1E6_FROM_100, force),
    vergelijken: (force?: boolean) => grown(TO_1E6_FROM_100, force),
    vergelijkenRepresentaties: (_force?: boolean) => DECIMAL,
    splitsenTabel: (force?: boolean) => grown(HR_NATURAL, force),
    // positie-benen + positie-math: legacy list already jumps from 1e6 to 1e9.
    splitsenPositie: (force?: boolean) => grown(SPLITSEN_POSITIE, force),
    splitsenBasis: (_force?: boolean) => HR_NATURAL,
    splitsenBoom: (_force?: boolean) => SPLITSEN_BOOM,
    splitsenHarten: (_force?: boolean) => SPLITSEN_HARTEN,
    deelbaarheid: (_force?: boolean) => TO_1E5_FROM_100,
    deelbaarheidKleurStrook: (_force?: boolean) => [20, 100, 1_000] as readonly number[],
    deelbaarheidKleurRaster: (_force?: boolean) => [100, 1_000] as readonly number[],
    getallenas: (_force?: boolean) => TO_1E5_FROM_20,
    getallenrijen: (_force?: boolean) => TO_1E5_FROM_20,
    patronen: (_force?: boolean) => TO_1E5_FROM_20,
    ordenen: (_force?: boolean) => TO_1E5_FROM_20,
    schattendNatural: (_force?: boolean) => TO_1E5_FROM_100,
    evenOneven: (_force?: boolean) => [20, 100, 1_000, 10_000] as readonly number[],
    procenten: (_force?: boolean) => TO_1E4_FROM_100,
    controleren: (_force?: boolean) => [1_000, 10_000] as readonly number[],
    geld: (_force?: boolean) => TO_1E3_FROM_10,
    // maxEuro, not a base-seeded key: euros with a percent on top.
    geldRekenen: (_force?: boolean) => TO_1E4_FROM_100,
    mab: (_force?: boolean) => TO_1E3_FROM_10,
    ketting: (_force?: boolean) => [20, 100, 1_000] as readonly number[],
    rekenvolgorde: (_force?: boolean) => [100, 1_000] as readonly number[],
    // Herleidingen are unit-based (km² ≥ 1e4 already overflows), so they never grow.
    herleidingenSamengesteld: (_force?: boolean) => [10, 100, 1_000, 10_000, 100_000, 1_000_000] as readonly number[],
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
