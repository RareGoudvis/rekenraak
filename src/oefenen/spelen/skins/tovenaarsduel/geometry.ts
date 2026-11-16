import type { Side } from '../../duel/types';

// Tovenaarsduel's stage geometry (art.tsx draws in these units). Every wizard is drawn facing right with its feet
// at (0, 0); the right one is mirrored.

// The scene: 920 × 330 from y −30 (the hats and the dome stay in) down to the floor line at 300, its bottom edge.
// The svg's bottom sits on the arena's floor line (tovenaarsduel.css); shadows and the floor runes overflow below it.
export const VIEW = { x: -60, y: -30, w: 920, h: 330 } as const;
export const FLOOR = 300;
export const WIZ_X: Record<Side, number> = { left: 190, right: 610 };

export type Model = 'sage' | 'stout';
export const MODEL: Record<Side, Model> = { left: 'sage', right: 'stout' };

export interface Pt { x: number; y: number }

// Wizard units: the shoulder the staff arm turns on, the orb on the staff, where the orb is when a spell leaves
// (the arm turned forward by CAST_DEG), the chest where a spell lands, the shield dome's centre and radii.
export const SHOULDER: Pt = { x: 14, y: -112 };
export const ORB: Pt = { x: 46, y: -214 };
export const CAST_DEG = 25;
export const RELEASE: Pt = (() => {
    const a = (CAST_DEG * Math.PI) / 180;
    const dx = ORB.x - SHOULDER.x, dy = ORB.y - SHOULDER.y;
    return { x: SHOULDER.x + dx * Math.cos(a) - dy * Math.sin(a), y: SHOULDER.y + dx * Math.sin(a) + dy * Math.cos(a) };
})();
export const CHEST: Pt = { x: 6, y: -104 };
export const DOME = { x: 6, y: -138, rx: 104, ry: 150 } as const;

/** Wizard units of `side` → scene units. */
export function toScene(side: Side, p: Pt): Pt {
    return { x: side === 'left' ? WIZ_X.left + p.x : WIZ_X.right - p.x, y: FLOOR + p.y };
}
export const releaseAt = (side: Side) => toScene(side, RELEASE);
export const chestAt = (side: Side) => toScene(side, CHEST);
/** Where a spell meets a raised shield: the dome's front edge, toward the caster. */
export const domeHitAt = (side: Side) => toScene(side, { x: DOME.x + DOME.rx * 0.96, y: CHEST.y });

/** Where a spell lands: the chest, or the dome's edge when a shield is up. */
export const landPoint = (to: Side, shielded: boolean): Pt => (shielded ? domeHitAt(to) : chestAt(to));

/** The point at t (0..1) on a spell's path (a fireball arcs `arc` units over the straight line, the spear flies straight). */
export function pathAt(from: Pt, to: Pt, t: number, arc: number): Pt {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - arc * 4 * t * (1 - t) };
}
