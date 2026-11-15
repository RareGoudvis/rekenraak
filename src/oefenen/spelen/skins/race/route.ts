import { RACE } from './track';

// The landscapes a race drives through, and the gate (tunnel, bridge, sign) between two of them. Pure: the
// order comes from an injected random, so a test (or ?raceLand= in dev) can pin it.

export const LANDS = ['platteland', 'woestijn', 'sneeuw', 'stad', 'strand', 'herfst'] as const;
export type Land = typeof LANDS[number];

// The pre-start choice (registry: options.modus): Tijdrit is the default.
export type RaceMode = 'tijdrit' | 'benzine';
export const raceModeOf = (options: Readonly<Record<string, string>>): RaceMode => (options.modus === 'benzine' ? 'benzine' : 'tijdrit');

export const GATES = ['tunnel', 'brug', 'bord'] as const;
export type Gate = typeof GATES[number];

// What the scene is called (the world's aria label).
export const LAND_LABEL: Record<Land, string> = {
    platteland: 'Platteland in de zomer', woestijn: 'Woestijn met cactussen', sneeuw: 'Besneeuwd bos',
    stad: 'Stad bij nacht', strand: 'Strand met palmbomen', herfst: 'Herfstbos in de regen',
};

// Benzine has no finish: a new landscape every this many metres (about 9 right answers).
export const BENZINE_SEGMENT = 500;
// Tijdrit: three landscapes, so a gate at a third and two thirds of the track.
export const TIJDRIT_LANDS = 3;

export interface Route {
    // Tijdrit: the 3 picked; Benzine: all 6 in a shuffled order, then round again.
    lands: Land[];
    // The gate before segment i (i ≥ 1) is gates[(i - 1) % gates.length].
    gates: Gate[];
    // Metres per landscape.
    segment: number;
    // How many segments there are (Infinity for Benzine).
    segments: number;
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** The run's route: 3 random landscapes for Tijdrit, all 6 shuffled for Benzine; `pinned` lands and gate (dev) go first. */
export function routeOf(mode: RaceMode, rand: () => number = Math.random, pinned: readonly Land[] = [], gate: Gate | null = null): Route {
    const rest = shuffled(LANDS.filter(l => !pinned.includes(l)), rand);
    const order = [...pinned, ...rest];
    const mixed = shuffled(GATES, rand);
    const gates = gate ? [gate, ...mixed.filter(g => g !== gate)] : mixed;
    return mode === 'tijdrit'
        ? { lands: order.slice(0, TIJDRIT_LANDS), gates, segment: RACE.length / TIJDRIT_LANDS, segments: TIJDRIT_LANDS }
        : { lands: order, gates, segment: BENZINE_SEGMENT, segments: Infinity };
}

/** Which segment the car's nose is in (0-based; the last one holds the finish). */
export const segmentAt = (r: Route, x: number) => Math.min(r.segments - 1, Math.max(0, Math.floor(x / r.segment)));

export const landOf = (r: Route, seg: number): Land => r.lands[((seg % r.lands.length) + r.lands.length) % r.lands.length];

/** The gate at the start of segment seg (seg ≥ 1), null before the first or past the last. */
export const gateOf = (r: Route, seg: number): Gate | null => (seg < 1 || seg >= r.segments ? null : r.gates[(seg - 1) % r.gates.length]);

/** Dev builds: ?raceLand=sneeuw,stad pins the first landscapes, ?raceGate=brug the first gate (screenshots, review). */
export function pinnedOf(search: string): { lands: Land[]; gate: Gate | null } {
    const q = new URLSearchParams(search);
    const lands = (q.get('raceLand') ?? '').split(',').map(s => s.trim()).filter((s): s is Land => (LANDS as readonly string[]).includes(s));
    const g = q.get('raceGate') ?? '';
    return { lands: [...new Set(lands)], gate: (GATES as readonly string[]).includes(g) ? g as Gate : null };
}
