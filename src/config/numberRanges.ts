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
// Leerjaar 1 (tot 20) seeds 20 here instead of flooring to 100 (owner sign-off, limit audit L20).
const NAT_TO_1E9_FROM_20: readonly number[] = NAT_STEPS.filter(v => v >= 20);

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
    // : 'Met rest': the deeltal follows the grade (owner rule). N1/N2 stay two-digit, so 100 is
    // the floor (leerjaar 1 lands there too) and N3's three-digit deeltal needs 1000.
    hrMetRest: [100, 1_000] as readonly number[],
    // Every decimal list (hoofdrekenen, gemengd, afronden, schattend, vergelijken-representaties).
    decimal: DECIMAL,
    cijferNatural: NAT_STEPS.filter(v => v >= 20),
    // Decimal cijferen never had 1e7 / 1e8: it jumps from 1e6 to the ceiling.
    cijferDecimal: [20, 100, 1_000, 10_000, 100_000, 1_000_000, 1_000_000_000] as readonly number[],
    afrondenNatural: NAT_TO_1E9_FROM_100,
    plaatswaarde: NAT_TO_1E9_FROM_20,
    // getallen + kiezen; representaties has its own list below.
    vergelijken: NAT_TO_1E9_FROM_20,
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
    // The rechthoek raster at 20 is a 2-row grid of 1-20 (the "Aantal getallen" slider caps at the max).
    deelbaarheidKleurRaster: [20, 100, 1_000] as readonly number[],
    getallenas: TO_1E5_FROM_20,
    getallenrijen: TO_1E5_FROM_20,
    // Decimal rows step by 0,1 from 0 to 10 (the leaf's pin); natural rows keep 20 as their floor.
    getallenrijenDecimal: [10, ...TO_1E5_FROM_20] as readonly number[],
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

// Met rest niveau → the lowest deeltal max that still fills a block: N1 (quotiënt 1-9) fits
// any max, N2 needs a deeltal ≥ 21 (10 × 2 + 1), N3 a three-digit deeltal (100-999).
// SYNC: the met-rest branch of generateDivisionExercises (mathEngine.ts) draws inside these.
export const MET_REST_LEVEL_MIN_MAX: Readonly<Record<number, number>> = { 1: 0, 2: 100, 3: 1_000 };
export const metRestLevelFits = (level: number, max: number): boolean => max >= (MET_REST_LEVEL_MIN_MAX[level] ?? 0);
// The highest niveau ≤ `level` that fits under `max` (N1 always does).
export function clipMetRestLevel(level: number, max: number): number {
    let l = level;
    while (l > 1 && !metRestLevelFits(l, max)) l--;
    return l;
}

// Steps a getallenas / getallenrij may fall back to when its span overruns a seeded max: the
// presets both configs offer. SYNC: STEP_PRESETS / DECIMAL_STEPS in GetallenasConfig.tsx and
// GetallenrijenConfig.tsx.
export const AXIS_FALLBACK_STEPS = {
    natural: [1, 2, 5, 10, 25, 50, 100] as readonly number[],
    decimal: [0.001, 0.01, 0.1, 0.5, 1] as readonly number[],
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
