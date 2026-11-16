import type { Side } from '../../duel/types';

// Meteorietenregen's scene geometry, pure: where the bases stand, where a meteor leaves and lands, and the
// arc it flies (art.tsx draws it, the CSS moves it). Scene units: a 1200 × 340 world, the ground at y 292,
// shown from y `top` down.
// Base units: x 0 = the base's middle, positive towards the other base, y 0 = the ground, up negative.

export const VIEW = { w: 1200, h: 340, top: 40, ground: 292 } as const;
export const BASE_X: Record<Side, number> = { left: 200, right: 1000 };

// The shield domes, inner (green) and outer (blue): half ellipses on the ground around the base.
export const DOMES = [{ rx: 178, ry: 170 }, { rx: 198, ry: 190 }] as const;

// The launcher on the base's inner side: its pivot, its barrel angle (up and inwards) and length.
export const LAUNCHER = { x: 124, y: -22, deg: -40, len: 44 } as const;
// Where an unshielded meteor strikes: the habitat roof on the side it comes from.
export const ROOF = { x: 26, y: -94 } as const;
// The highest point of a meteor's arc (scene y).
export const APEX_Y = 64;
// The angle on a dome (from the ground, on the attacker's side) where a meteor meets it.
const DOME_HIT_DEG = 50;

export interface Pt { x: number; y: number }

/** Base units of a side → scene units (the right base is drawn mirrored). */
export const toScene = (side: Side, p: Pt): Pt => ({ x: side === 'left' ? BASE_X.left + p.x : BASE_X.right - p.x, y: VIEW.ground + p.y });

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The launcher's muzzle (base units). */
export const muzzle = (): Pt => ({ x: LAUNCHER.x + LAUNCHER.len * Math.cos(rad(LAUNCHER.deg)), y: LAUNCHER.y + LAUNCHER.len * Math.sin(rad(LAUNCHER.deg)) });

/** Where a meteor meets its target (base units): the outer shield it will hit (layer 1 or 2), or the roof (0). */
export function strikeAt(layer: number): Pt {
    const d = DOMES[Math.min(layer, DOMES.length) - 1];
    if (!d) return ROOF;
    return { x: d.rx * Math.cos(rad(DOME_HIT_DEG)), y: -d.ry * Math.sin(rad(DOME_HIT_DEG)) };
}

export interface Arc {
    from: Pt;
    to: Pt;
    dx: number;
    dy: number;
    // The arc's height over the straight line at its middle (the parabola 4h·t(1−t)).
    h: number;
    // 1 = flying right, -1 = left (the head is drawn mirrored, so the heading never wraps past 180°).
    dir: 1 | -1;
    // The heading (deg, as if flying right) at t = 0, 1/8, …, 1: the flame trails behind it.
    heading: number[];
}

/** A meteor from `from`'s launcher to `to`'s base, striking shield `layer` (0 = the roof): a parabola peaking at APEX_Y. */
export function arcOf(from: Side, to: Side, layer: number): Arc {
    const a = toScene(from, muzzle());
    const b = toScene(to, strikeAt(layer));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const h = Math.max(40, (a.y + b.y) / 2 - APEX_Y);
    const heading = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        return (Math.atan2(dy - 4 * h * (1 - 2 * t), Math.abs(dx)) * 180) / Math.PI;
    });
    return { from: a, to: b, dx, dy, h, dir: dx < 0 ? -1 : 1, heading };
}

/** A tiny seeded random (mulberry32): the stars and rocks lie the same every visit. */
export function seeded(seed: number) {
    let s = seed;
    return () => {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
