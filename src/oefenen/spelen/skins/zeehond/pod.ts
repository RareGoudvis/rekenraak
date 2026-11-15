import { mulberry32 } from '../../distractors';
import type { SkinChoices } from '../types';

// Zeehondjes voeren, pure: the seals of a game (looks, how round each one has eaten itself) and, in Moeilijk,
// where each seal has drifted on its floe at a moment (never overlapping, never off the sea, slow).

export type ZeehondLevel = 'normaal' | 'moeilijk';
export const levelOf = (o: SkinChoices): ZeehondLevel => (o.niveau === 'moeilijk' ? 'moeilijk' : 'normaal');

export type SealWear = 'none' | 'hat' | 'bow' | 'scarf';
export interface SealLook {
    id: string;
    // The fur shade (--zh-fur-N in zeehond.css); 4 = a white pup.
    fur: 0 | 1 | 2 | 3 | 4;
    spots: boolean;
    wear: SealWear;
    lashes: boolean;
    whiskers: 'long' | 'short' | 'curly';
    pup: boolean;
}

// Eight slightly different seals; a game takes four of them (pickPod).
export const SEAL_LOOKS: readonly SealLook[] = [
    { id: 'grijs', fur: 0, spots: false, wear: 'none', lashes: false, whiskers: 'long', pup: false },
    { id: 'stippel', fur: 1, spots: true, wear: 'none', lashes: true, whiskers: 'short', pup: false },
    { id: 'sjaal', fur: 2, spots: false, wear: 'scarf', lashes: false, whiskers: 'long', pup: false },
    { id: 'strik', fur: 3, spots: false, wear: 'bow', lashes: true, whiskers: 'short', pup: false },
    { id: 'muts', fur: 0, spots: false, wear: 'hat', lashes: false, whiskers: 'curly', pup: false },
    { id: 'pup', fur: 4, spots: false, wear: 'none', lashes: true, whiskers: 'short', pup: true },
    { id: 'vlek', fur: 2, spots: true, wear: 'bow', lashes: false, whiskers: 'curly', pup: false },
    { id: 'snor', fur: 3, spots: true, wear: 'hat', lashes: false, whiskers: 'curly', pup: false },
];

/** Four different seals for a game: shuffled by the seed, preferring a fur shade and a hat/bow/scarf not taken yet. */
export function pickPod(seed: number, n = 4): SealLook[] {
    const rng = mulberry32(seed);
    const order = SEAL_LOOKS.map(l => ({ l, r: rng() })).sort((a, b) => a.r - b.r).map(x => x.l);
    const out: SealLook[] = [];
    const fresh = (l: SealLook) => !out.some(o => o.fur === l.fur) && (l.wear === 'none' || !out.some(o => o.wear === l.wear));
    for (const l of order) if (out.length < n && fresh(l)) out.push(l);
    for (const l of order) if (out.length < n && !out.includes(l)) out.push(l);
    return out;
}

// How round a seal gets: one step per fish, capped so it stays cute and fits its floe.
export const GROW_STEPS = 4;
export const girthOf = (fed: number) => Math.max(0, Math.min(GROW_STEPS, Math.floor(fed)));

/** The fish counts per seal after seal `i` ate one. */
export const fedAfter = (counts: readonly number[], i: number, n = 4): number[] =>
    Array.from({ length: Math.max(n, counts.length) }, (_, k) => (counts[k] ?? 0) + (k === i ? 1 : 0));

export interface SealShape {
    body: string;
    tail: string;
    belly: { rx: number; ry: number };
    // Half the body's width at the base (viewBox units): spots sit relative to it.
    hw: number;
    // How far each flipper sits out from the thin seal's (viewBox units).
    flip: number;
}

/** The body for a girth step, in the seal's 120 × 104 box: thin at 0, round at GROW_STEPS; the head never changes. */
export function sealShape(step: number): SealShape {
    const s = girthOf(step);
    const hw = 30 + 5.5 * s;
    const bulge = 1 + 2 * s;
    const l = 60 - hw;
    const r = 60 + hw;
    const body = `M${l} 100 C${l - bulge} ${74 - s} ${60 - hw * 0.62} 50 60 50 C${60 + hw * 0.62} 50 ${r + bulge} ${74 - s} ${r} 100 Z`;
    const tail = `M${l + 16} 96 L${l - 4} 102 L${l + 2} 90 Z M${r - 16} 96 L${r + 4} 102 L${r - 2} 90 Z`;
    return { body, tail, belly: { rx: 17 + 3.6 * s, ry: 11 + 1.4 * s }, hw, flip: (hw - 30) * 0.75 };
}

// ── Moeilijk: drifting floes ──────────────────────────────────────────────────

export interface SpotBox { x: number; y: number; w: number; h: number }
export interface DriftSpec {
    // The pod's inner size, px: a seal never leaves it.
    width: number;
    height: number;
    // Room kept between two floes, px.
    gap: number;
    seed: number;
}
export interface Offset { dx: number; dy: number }

// Fair for six-year-olds on an iPad: never faster than this (px per second), however far a floe wanders.
export const DRIFT_MAX_SPEED = 24;
// Reduced motion: each question shows the seals at the moment this many seconds further (new spots, no movement).
export const DRIFT_STILL_STEP = 9.7;
const W1 = (2 * Math.PI) / 23;
const W2 = (2 * Math.PI) / 37;
const WY = (2 * Math.PI) / 17;

/** Each seal's offset from its spot at time t (s): its own slow wander, pushed apart so floes never overlap or leave the pod. */
export function driftOffsets(t: number, spots: readonly SpotBox[], spec: DriftSpec): Offset[] {
    const rng = mulberry32(spec.seed);
    // Per seal: two x phases, a y phase and a small tempo factor, so no two drift alike.
    const phases = spots.map(() => [rng() * 2 * Math.PI, rng() * 2 * Math.PI, rng() * 2 * Math.PI, 0.85 + rng() * 0.3]);
    const out: Offset[] = spots.map(() => ({ dx: 0, dy: 0 }));
    // Seals on (about) the same height share a row; each row is a line of floes that keep their order.
    const rows: number[][] = [];
    for (const i of spots.map((_, k) => k).sort((a, b) => spots[a].y - spots[b].y || spots[a].x - spots[b].x)) {
        const row = rows.find(r => Math.abs(spots[r[0]].y - spots[i].y) < spots[i].h / 2);
        if (row) row.push(i); else rows.push([i]);
    }
    rows.forEach(r => r.sort((a, b) => spots[a].x - spots[b].x));
    const rowTop = rows.map(r => Math.min(...r.map(i => spots[i].y)));
    const rowBottom = rows.map(r => Math.max(...r.map(i => spots[i].y + spots[i].h)));
    rows.forEach((row, ri) => {
        // How far this row may rise or sink: half the room to its neighbours (or the pod's edge).
        const above = ri === 0 ? rowTop[ri] : (rowTop[ri] - rowBottom[ri - 1]) / 2;
        const below = ri === rows.length - 1 ? spec.height - rowBottom[ri] : (rowTop[ri + 1] - rowBottom[ri]) / 2;
        const ampY = Math.max(0, Math.min(above, below, 26));
        const slack = row.length > 1
            ? (spots[row.at(-1)!].x - spots[row[0]].x) / (row.length - 1) - Math.max(...row.map(i => spots[i].w)) - spec.gap
            : spec.width - spots[row[0]].w;
        // Wide enough to bump a neighbour now and then, never faster than DRIFT_MAX_SPEED.
        const ampX = Math.max(0, Math.min(slack * 0.9 + 12, DRIFT_MAX_SPEED / ((0.6 * W1 + 0.4 * W2) * 1.15)));
        const want = row.map(i => {
            const [a, b, , k] = phases[i];
            return spots[i].x + ampX * (0.6 * Math.sin(W1 * k * t + a) + 0.4 * Math.sin(W2 * k * t + b));
        });
        // Floes keep their order and their gap: push right, then pull back from the right edge.
        const x = [...want];
        x[0] = Math.max(0, x[0]);
        for (let k = 1; k < row.length; k++) x[k] = Math.max(x[k], x[k - 1] + spots[row[k - 1]].w + spec.gap);
        x[row.length - 1] = Math.min(x[row.length - 1], spec.width - spots[row.at(-1)!].w);
        for (let k = row.length - 2; k >= 0; k--) x[k] = Math.min(x[k], x[k + 1] - spots[row[k]].w - spec.gap);
        row.forEach((i, k) => {
            const [, , c, kk] = phases[i];
            const maxY = Math.min(ampY, DRIFT_MAX_SPEED / (WY * 1.15) / 2);
            out[i] = { dx: x[k] - spots[i].x, dy: maxY * Math.sin(WY * kk * t + c) };
        });
    });
    return out;
}
