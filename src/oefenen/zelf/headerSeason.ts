import type { Leerjaar } from '../../config/gradePresets';
import { mulberry32 } from '../spelen/distractors';
import { brusselsDay, seasonsOn, type SEASONS } from '../spelen/seasons';
import type { SpelSound } from '../spelen/sound';

// The Zelf home's seasonal header: which effect set the leerjaar bar wears today, and the seeded layout of its
// particles. Pure; the drawing is SeasonHeader.tsx, the motion seasonHeader.css. Kids app only.

// A season of the shelf calendar (taken from seasons.ts: the zelf files stay clear of the skins folder).
export type Season = (typeof SEASONS)[number];

// When seasons overlap, the shorter, more specific feast wins: Carnaval's eleven days inside Valentijn's two weeks,
// Pasen inside Lente; the broad Winter and Zomer come last.
export const HEADER_ORDER: readonly Season[] = ['halloween', 'sinterklaas', 'kerst', 'carnaval', 'valentijn', 'pasen', 'lente', 'winter', 'zomer'];
// 14 February itself is Valentijn's day, even when Carnaval falls on it.
const VALENTIJN_DAY = { m: 2, d: 14 };

/** Today's header effect set (null = none: the bar stays plain). */
export function headerSeasonOf(at: Date): Season | null {
    const on = seasonsOn(at);
    const day = brusselsDay(at);
    if (on.includes('valentijn') && day.m === VALENTIJN_DAY.m && day.d === VALENTIJN_DAY.d) return 'valentijn';
    return HEADER_ORDER.find(s => on.includes(s)) ?? null;
}

/** One seed per Brussels day: the same particles all day, new ones tomorrow. */
export function headerSeed(at: Date): number {
    const { y, m, d } = brusselsDay(at);
    return y * 10_000 + m * 100 + d;
}

/** The tile that wears the season's hat: the chosen leerjaar, or before a pick one of the six by the day's seed. */
export const wornTile = (grade: Leerjaar | null, seed: number): Leerjaar => grade ?? (((seed % 6) + 1) as Leerjaar);

// ── The tappable decoration ─────────────────────────────────────────────────
// What the pupil taps (its name for screen readers), and the soft sound of its trick (silent when game sound is off).
export const TOY_LABEL: Record<Season, string> = {
    halloween: 'Vleermuis', sinterklaas: 'Cadeautje', kerst: 'Sneeuwbol', winter: 'Sneeuwbol', carnaval: 'Toeter',
    valentijn: 'Hartje', pasen: 'Paasei', lente: 'Bij', zomer: 'Strandbal',
};
export const TOY_SOUND: Record<Season, SpelSound> = {
    halloween: 'piep', sinterklaas: 'pop', kerst: 'sparkle', winter: 'sparkle', carnaval: 'pop',
    valentijn: 'ting', pasen: 'krak', lente: 'bzz', zomer: 'boing',
};
// How long a trick plays, ms (the CSS keyframes run this long); the egg keeps its chick out a little longer.
export const TRICK_MS: Record<Season, number> = {
    halloween: 1300, sinterklaas: 1200, kerst: 1600, winter: 1600, carnaval: 1100, valentijn: 1300, pasen: 2600, lente: 1600, zomer: 1300,
};
// The chick's own "piep" after the egg cracks open, ms after the tap.
export const CHICK_PEEP_MS = 450;

// ── The band's particles (behind the tiles, inside the strip) ────────────────
export type DriftKind = 'confetti' | 'heart' | 'petal' | 'glint';
export interface DriftSpec {
    kind: DriftKind;
    // Few particles: the strip is small and the CPU is a school laptop.
    count: number;
    // px.
    size: readonly [number, number];
    // Seconds per crossing (a twinkle: per blink).
    dur: readonly [number, number];
}
export interface BandSpec {
    drift?: DriftSpec;
    // Light snow (the scene kit's Snow): flakes on screen.
    snow?: number;
    // Something crossing the strip now and then: a bat flitting, pepernoten hopping along the bottom.
    cross?: 'bat' | 'nuts';
    // Eggs peeking from behind the tiles at the bottom edge.
    eggs?: number;
    // A cobweb in the strip's corner.
    web?: boolean;
}
export const BAND: Record<Season, BandSpec> = {
    halloween: { cross: 'bat', web: true },
    sinterklaas: { cross: 'nuts' },
    kerst: { snow: 20 },
    winter: { snow: 18 },
    carnaval: { drift: { kind: 'confetti', count: 14, size: [6, 10], dur: [5, 8] } },
    valentijn: { drift: { kind: 'heart', count: 10, size: [12, 18], dur: [6, 9] } },
    pasen: { eggs: 5 },
    lente: { drift: { kind: 'petal', count: 10, size: [8, 12], dur: [6, 10] } },
    zomer: { drift: { kind: 'glint', count: 8, size: [12, 18], dur: [2.2, 3.6] } },
};

export interface Drift {
    key: string;
    // % of the strip's width; glints and eggs also a top %.
    left: number;
    top: number;
    size: number;
    dur: number;
    // Negative: already under way when the page opens.
    delay: number;
    sway: number;
    rot: number;
    // Which of the season's colours (0–3).
    tone: number;
}

const between = (rng: () => number, [a, b]: readonly [number, number]) => a + (b - a) * rng();
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The particles of a drift: spread evenly over the width (seeded jitter), already under way. */
export function driftLayout(spec: DriftSpec, seed: number): Drift[] {
    const rng = mulberry32(seed);
    return Array.from({ length: spec.count }, (_, i) => {
        const dur = round1(between(rng, spec.dur));
        return {
            key: `${spec.kind}${i}`,
            left: round1(((i + 0.15 + 0.7 * rng()) / spec.count) * 100),
            top: round1(10 + rng() * 70),
            size: Math.round(between(rng, spec.size)),
            dur,
            delay: round1(-rng() * dur),
            sway: Math.round(8 + rng() * 22),
            rot: Math.round((rng() - 0.5) * 720),
            tone: Math.floor(rng() * 4),
        };
    });
}

/** Eggs along the bottom edge, most of them half behind a tile. */
export function eggLayout(count: number, seed: number): Drift[] {
    const rng = mulberry32(seed ^ 0x9e37);
    return Array.from({ length: count }, (_, i) => ({
        key: `egg${i}`,
        left: round1(((i + 0.2 + 0.6 * rng()) / count) * 100),
        top: 0,
        size: Math.round(18 + rng() * 6),
        dur: round1(2.4 + rng() * 1.6),
        delay: round1(-rng() * 3),
        sway: 0,
        rot: Math.round((rng() - 0.5) * 30),
        tone: i % 4,
    }));
}

// ── Scenes: a short character moment running along the strip ────────────────
export type SceneId = 'sint' | 'witch' | 'ghosts' | 'sled' | 'snowman' | 'parade' | 'cupid' | 'bunny' | 'butterflies' | 'flowers' | 'icecream';
// A season's scenes take turns, in this order.
export const SCENES: Record<Season, readonly SceneId[]> = {
    halloween: ['witch', 'ghosts'], sinterklaas: ['sint'], kerst: ['sled', 'snowman'], winter: ['snowman', 'sled'], carnaval: ['parade'],
    valentijn: ['cupid'], pasen: ['bunny'], lente: ['butterflies', 'flowers'], zomer: ['icecream'],
};
// How long each scene runs, ms (its CSS keyframes are written in fractions of this).
export const SCENE_MS: Record<SceneId, number> = {
    sint: 8000, witch: 6500, ghosts: 4200, sled: 7000, snowman: 7500, parade: 9000, cupid: 7500, bunny: 9000, butterflies: 7500, flowers: 6000, icecream: 9000,
};
// Start to start, ms: often enough to be a surprise, rare enough to stay a treat (owner: every 10 to 15 s).
export const SCENE_GAP: readonly [number, number] = [10_000, 15_000];
// The first one comes soon after the page opens, so a pupil sees one.
export const FIRST_SCENE: readonly [number, number] = [2500, 5000];
// A scene never starts within this long of the last one's end.
const SCENE_REST_MS = 1500;

/** The seeded waits before each scene (the first, then each start to the next), ms. */
export function sceneWaits(seed: number, count: number, season: Season): number[] {
    const rng = mulberry32(seed ^ 0x5ce7e);
    return Array.from({ length: count }, (_, i) => {
        if (i === 0) return Math.round(between(rng, FIRST_SCENE));
        const before = SCENE_MS[sceneAt(season, i - 1)];
        return Math.max(Math.round(between(rng, SCENE_GAP)), before + SCENE_REST_MS);
    });
}

/** The i-th scene of a season (they take turns). */
export const sceneAt = (season: Season, i: number): SceneId => SCENES[season][i % SCENES[season].length];

// Where the strip's tiles are, px in the strip (measured when a scene starts).
export interface TileBox { x: number; y: number; w: number; h: number }
export interface StripGeo { w: number; h: number; tiles: TileBox[] }

/** The strip in jsdom or before layout: a plausible stand-in, so the plans still have numbers. */
export function geoOr(geo: StripGeo | null): StripGeo {
    if (geo && geo.w > 0 && geo.tiles.length === 6) return geo;
    return { w: 900, h: 160, tiles: Array.from({ length: 6 }, (_, i) => ({ x: 200 + i * 110, y: 36, w: 100, h: 100 })) };
}

/** Where scenes stand, puppet-theatre style: the tiles are the booth's wall. Walkers' feet low behind the tiles (their
 *  heads and shoulders show above them, the whole figure beside them); fliers fill the sky and dip behind the tiles. */
export function walkLine(geo: StripGeo): { feet: number; size: number; tile: number; top: number; sky: number } {
    const tile = Math.min(...geo.tiles.map(t => t.h));
    const top = Math.min(...geo.tiles.map(t => t.y));
    const feet = top + tile * 0.8;
    // Capped by the tile: on a phone the label's line above the tiles is tall, and the figures would dwarf the tiles.
    return { feet, size: Math.max(28, Math.min(feet - 2, tile * 1.5)), tile, top, sky: Math.max(24, Math.min(top + tile * 0.3, tile * 0.95)) };
}

/** When something crossing from x0 to x1 in `ms` is at x, ms after it set off. */
export const crossAt = (x: number, x0: number, x1: number, ms: number) => Math.round(((x - x0) / (x1 - x0)) * ms);

// Tile reactions the scene sets off: the tiles shiver (Halloween's ghosts) or one blushes (Valentijn's cupid).
export interface TileCue { at: number; ms: number; kind: 'shiver' | 'blush'; tile?: number }

// Cupid: crosses in this share of the scene, shoots this many tiles, and a heart takes this long to land.
const CUPID_RUN = 0.92;
const CUPID_SHOTS = 3;
export const HEART_FLIGHT_MS = 420;

/** Which tiles (0–5) a scene picks, seeded: the ghosts' and cupid's targets, left to right. */
export function pickTiles(seed: number, n: number): number[] {
    const rng = mulberry32(seed ^ 0x7111e5);
    const all = [0, 1, 2, 3, 4, 5];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, n).sort((a, b) => a - b);
}

/** Cupid's flight and shots: he crosses left to right above the tiles and shoots each target as he passes it. */
export function cupidPlan(geo: StripGeo, seed: number) {
    const { sky } = walkLine(geo);
    const w = sky * 1.3;
    const x0 = -w, x1 = geo.w + w, run = Math.round(SCENE_MS.cupid * CUPID_RUN);
    const shots = pickTiles(seed, CUPID_SHOTS).map(tile => {
        const t = geo.tiles[tile];
        const cx = t.x + t.w / 2;
        // He lets go a little before he is above it: the heart flies forward and down.
        const at = Math.max(0, crossAt(cx - w * 0.9, x0, x1, run));
        return { tile, at, x0: cx - w * 0.45, x1: cx, y1: t.y + t.h * 0.2 };
    });
    return { x0, x1, run, w, shots };
}

/** The tile reactions of a scene, ms after its start. */
export function sceneCues(id: SceneId, geo: StripGeo, seed: number): TileCue[] {
    if (id === 'ghosts') return [{ at: 900, ms: 1400, kind: 'shiver' }];
    if (id === 'cupid') return cupidPlan(geo, seed).shots.map(s => ({ at: s.at + HEART_FLIGHT_MS, ms: 2600, kind: 'blush', tile: s.tile }));
    return [];
}
