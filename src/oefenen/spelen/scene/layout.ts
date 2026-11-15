import { mulberry32, type Rng } from '../distractors';

// The scene kit's geometry: pure and seeded, so a scene looks the same on every render and the tests can
// check it. The components (Clouds, Snow, Burst, Cracks) only turn these numbers into SVG and CSS.

const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

// ── Clouds ──────────────────────────────────────────────────────────────────
export type CloudLayer = 'far' | 'mid' | 'near';
// Parallax: far clouds are smaller, slower and paler; near ones bigger and quicker.
export const CLOUD_LAYERS: Record<CloudLayer, { size: number; time: number; opacity: number }> = {
    far: { size: 0.6, time: 1.7, opacity: 0.75 },
    mid: { size: 1, time: 1, opacity: 1 },
    near: { size: 1.35, time: 0.65, opacity: 1 },
};
// The cloud outlines (100 × 60 box, flat base at y 50): puffs as circles [cx, cy, r] and a base bar [x0, x1].
export const CLOUD_SHAPES: readonly { puffs: readonly (readonly [number, number, number])[]; base: readonly [number, number] }[] = [
    { puffs: [[22, 38, 13], [42, 27, 19], [64, 29, 16], [81, 39, 11]], base: [14, 88] },
    { puffs: [[20, 40, 11], [36, 30, 15], [55, 22, 20], [75, 33, 14], [88, 42, 8]], base: [12, 94] },
    { puffs: [[26, 36, 15], [50, 25, 21], [73, 36, 14]], base: [14, 86] },
    { puffs: [[18, 41, 9], [33, 33, 13], [50, 29, 15], [67, 31, 13], [82, 40, 10]], base: [10, 90] },
];

export interface CloudOptions {
    count: number;
    seed: number;
    // Width range in px (before the layer's scale).
    size: readonly [number, number];
    // Seconds a mid-size cloud takes to cross (before the layer's factor).
    speed: number;
    // Where the clouds float, as % of the layer's height (their top edge).
    band: readonly [number, number];
    layer: CloudLayer;
}

export interface CloudSpec {
    key: string;
    shape: number;
    width: number;
    // % of the layer's height.
    top: number;
    // Seconds per crossing; delay is negative: the cloud is already that far along when the scene opens.
    duration: number;
    delay: number;
    // Mirrored, so the same shape looks new.
    flip: boolean;
    opacity: number;
}

/** Clouds spread evenly over one crossing, so the sky is never empty and never bunched at the start. */
export function cloudLayout(o: CloudOptions): CloudSpec[] {
    const rng = mulberry32(o.seed);
    const L = CLOUD_LAYERS[o.layer];
    const out: CloudSpec[] = [];
    // Shuffled slots: neighbours on screen are not neighbours in height.
    const slots = Array.from({ length: o.count }, (_, i) => i).sort(() => rng() - 0.5);
    for (let i = 0; i < o.count; i++) {
        const width = Math.round(between(rng, o.size) * L.size);
        // ±15 % per cloud; a bigger cloud is a little quicker (it is "closer").
        const duration = o.speed * L.time * (0.85 + 0.3 * rng()) * (1.15 - 0.3 * (width / (o.size[1] * L.size)));
        const along = (slots[i] + 0.2 + 0.6 * rng()) / o.count;
        out.push({
            key: `c${i}`,
            shape: Math.floor(rng() * CLOUD_SHAPES.length),
            width,
            top: between(rng, o.band),
            duration,
            delay: -along * duration,
            flip: rng() < 0.5,
            opacity: L.opacity,
        });
    }
    return out;
}

/** Where a cloud's left edge is after t seconds (it enters at -width and leaves at span, then wraps round). */
export function driftX(spec: Pick<CloudSpec, 'duration' | 'delay' | 'width'>, t: number, span: number, direction: 'right' | 'left' = 'right'): number {
    const p = (((t - spec.delay) / spec.duration) % 1 + 1) % 1;
    const x = -spec.width + p * (span + spec.width);
    return direction === 'right' ? x : span - spec.width - x;
}

// ── Snow ────────────────────────────────────────────────────────────────────
export interface FlakeSpec {
    key: string;
    // % of the layer's width.
    left: number;
    size: number;
    duration: number;
    delay: number;
    // Side to side, px.
    sway: number;
    opacity: number;
}

/** Flakes for a snowfall. full = already snowing when the scene opens; otherwise they start at the top, one by one. */
export function snowLayout(count: number, seed: number, full: boolean, size: readonly [number, number] = [3, 8], fall: readonly [number, number] = [6, 11]): FlakeSpec[] {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
        const duration = between(rng, fall);
        const s = between(rng, size);
        return {
            key: `f${i}`,
            left: rng() * 100,
            size: Math.round(s * 10) / 10,
            duration,
            // Spread over one fall: either already under way, or still to come.
            delay: full ? -rng() * duration : rng() * duration,
            sway: 6 + rng() * 18,
            // Small flakes are further away: a little paler.
            opacity: 0.55 + 0.45 * ((s - size[0]) / Math.max(1e-6, size[1] - size[0])),
        };
    });
}

// ── Bursts ──────────────────────────────────────────────────────────────────
export type BurstKind = 'splash' | 'sparkle' | 'smoke' | 'pieces';

export interface ParticleSpec {
    key: string;
    // The way out, px from the burst's point (dy < 0 is up), and for falling kinds where it ends.
    dx: number;
    dy: number;
    fall: number;
    size: number;
    rot: number;
    // ms.
    delay: number;
    dur: number;
    // Which fill of the palette (0–5).
    tone: number;
}

const BURST_COUNT: Record<BurstKind, number> = { splash: 14, sparkle: 9, smoke: 9, pieces: 14 };
export const BURST_MS: Record<BurstKind, number> = { splash: 850, sparkle: 800, smoke: 1000, pieces: 950 };

/** The particles of one burst; spread = how far they fly (px). */
export function burstParticles(kind: BurstKind, seed: number, spread: number, count = BURST_COUNT[kind]): ParticleSpec[] {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
        // Splash and pieces fan upward and fall back; sparkles and smoke go all round (smoke rising).
        const up = kind === 'splash' || kind === 'pieces';
        const a = up ? (-150 + 120 * ((i + rng()) / count)) * (Math.PI / 180) : ((i + 0.3 * rng()) / count) * 2 * Math.PI;
        const r = spread * (kind === 'smoke' ? 0.3 + 0.4 * rng() : 0.6 + 0.4 * rng());
        const dx = Math.cos(a) * r * (kind === 'splash' ? 0.8 : 1);
        // A splash throws its drops high rather than wide.
        const dy = Math.sin(a) * r * (kind === 'splash' ? 1.6 : kind === 'pieces' ? 1.2 : 1) - (kind === 'smoke' ? spread * 0.4 : 0);
        return {
            key: `p${i}`,
            dx: Math.round(dx),
            dy: Math.round(dy),
            fall: up ? Math.round(spread * (1.2 + 0.6 * rng())) : 0,
            size: Math.round(({ smoke: 0.34, sparkle: 0.22, splash: 0.15, pieces: 0.12 })[kind] * spread * (0.7 + 0.6 * rng())),
            rot: Math.round((rng() - 0.5) * (kind === 'pieces' ? 900 : 180)),
            delay: Math.round(rng() * (kind === 'smoke' ? 160 : 70)),
            dur: Math.round(BURST_MS[kind] * (0.75 + 0.25 * rng())),
            tone: i % 6,
        };
    });
}

// ── Cracks ──────────────────────────────────────────────────────────────────
export interface CrackSegment {
    key: string;
    // An SVG path (polyline) in the box's own units.
    d: string;
    // The stage that adds it: stage 2 extends the stage-1 cracks and adds more.
    stage: 1 | 2;
    points: readonly (readonly [number, number])[];
}

/** Cracks from an impact point in a w × h box; stage 1 = a short star of cracks, stage 2 = the same ones grown plus branches. */
export function crackLines(w: number, h: number, seed: number, origin?: readonly [number, number]): CrackSegment[] {
    const rng = mulberry32(seed);
    const pad = Math.min(w, h) * 0.04;
    const clampPt = (x: number, y: number): [number, number] => [Math.min(w - pad, Math.max(pad, x)), Math.min(h - pad, Math.max(pad, y))];
    const [ox, oy] = origin ?? [w * (0.35 + 0.3 * rng()), h * (0.3 + 0.3 * rng())];
    // How far the box reaches in a direction (an ellipse in the box): a wide block cracks further sideways.
    const reachAt = (a: number) => 1 / Math.hypot(Math.cos(a) / (w / 2), Math.sin(a) / (h / 2));
    const segs: CrackSegment[] = [];
    const walk = (from: readonly [number, number], angle: number, length: number, steps: number): [number, number][] => {
        const pts: [number, number][] = [[from[0], from[1]]];
        let [x, y] = from;
        // A crack zigzags: it turns one way, then the other, and keeps its heading overall.
        let side = rng() < 0.5 ? -1 : 1;
        for (let s = 0; s < steps; s++) {
            const a = angle + side * (0.25 + 0.4 * rng());
            side = -side;
            [x, y] = clampPt(x + Math.cos(a) * (length / steps), y + Math.sin(a) * (length / steps));
            pts.push([x, y]);
        }
        return pts;
    };
    const path = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const mains = 5;
    const early = 3;
    const start = rng() * Math.PI * 2;
    for (let m = 0; m < mains; m++) {
        const angle = start + (m / mains) * Math.PI * 2 + (rng() - 0.5) * 0.5;
        const reach = reachAt(angle);
        // The first three show at stage 1 (short); stage 2 grows them and adds the other two.
        const first = m < early ? walk([ox, oy], angle, reach * 0.42, 3) : null;
        if (first) segs.push({ key: `m${m}a`, d: path(first), stage: 1, points: first });
        const tail = walk(first ? first[first.length - 1] : [ox, oy], angle, reach * (first ? 0.5 : 0.7), first ? 3 : 5);
        segs.push({ key: `m${m}b`, d: path(tail), stage: 2, points: tail });
        // A branch off the middle of each stage-2 crack.
        const mid = tail[Math.floor(tail.length / 2)];
        const branch = walk(mid, angle + (rng() < 0.5 ? -1 : 1) * (0.6 + 0.4 * rng()), reach * 0.3, 2);
        segs.push({ key: `m${m}c`, d: path(branch), stage: 2, points: branch });
    }
    return segs;
}
