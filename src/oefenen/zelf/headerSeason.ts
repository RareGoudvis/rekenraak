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
