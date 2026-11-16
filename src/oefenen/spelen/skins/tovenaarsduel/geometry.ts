import type { Side } from '../../duel/types';

// Tovenaarsduel's stage geometry (art.tsx draws in these units). The scene is VIEW_H units high, from the top
// (VIEW_TOP) down to the floor line (FLOOR, the svg's bottom edge, on the arena's floor); its width follows the
// band's shape (stageOf), so the wizards stand near the outer edges at every size and the middle is the runway.
// Every wizard is drawn facing right with its feet at (0, 0); the right one is mirrored.

export const VIEW_TOP = -40;
export const FLOOR = 300;
export const VIEW_H = FLOOR - VIEW_TOP;
// Where the wizards stand, as a share of the width (owner 2026-11-17: near the edges, a wide runway between).
export const STAND = 0.135;

export type Model = 'paars' | 'rood';
export const MODEL: Record<Side, Model> = { left: 'paars', right: 'rood' };

export interface Pt { x: number; y: number }
export interface Stage { w: number; x: Record<Side, number> }

/** The stage for a band of this width / height (of the svg box); a sane default before it is measured. */
export function stageOf(aspect = 3.2): Stage {
    const w = Math.round(VIEW_H * Math.max(1.4, Math.min(6, aspect)));
    return { w, x: { left: Math.round(w * STAND), right: Math.round(w * (1 - STAND)) } };
}

// Wizard units: the shoulder the staff arm turns on, the orb in the staff's prongs, where the orb is when a spell
// leaves (the arm turned forward by CAST_DEG), the chest where a spell lands, the shield dome's centre and radii.
export const SHOULDER: Pt = { x: 14, y: -106 };
export const ORB: Pt = { x: 66, y: -228 };
export const CAST_DEG = 25;
export const RELEASE: Pt = (() => {
    const a = (CAST_DEG * Math.PI) / 180;
    const dx = ORB.x - SHOULDER.x, dy = ORB.y - SHOULDER.y;
    return { x: SHOULDER.x + dx * Math.cos(a) - dy * Math.sin(a), y: SHOULDER.y + dx * Math.sin(a) + dy * Math.cos(a) };
})();
export const CHEST: Pt = { x: 6, y: -110 };
export const DOME = { x: 4, y: -142, rx: 122, ry: 166 } as const;

/** Wizard units of `side` → scene units. */
export function toScene(st: Stage, side: Side, p: Pt): Pt {
    return { x: side === 'left' ? st.x.left + p.x : st.x.right - p.x, y: FLOOR + p.y };
}
export const releaseAt = (st: Stage, side: Side) => toScene(st, side, RELEASE);
export const chestAt = (st: Stage, side: Side) => toScene(st, side, CHEST);
/** Where a spell meets a raised shield: the dome's front edge, toward the caster. */
export const domeHitAt = (st: Stage, side: Side) => toScene(st, side, { x: DOME.x + DOME.rx * 0.97, y: CHEST.y });
/** Where a spell lands: the chest, or the dome's edge when a shield is up. */
export const landPoint = (st: Stage, to: Side, shielded: boolean): Pt => (shielded ? domeHitAt(st, to) : chestAt(st, to));

/** The point at t (0..1) on a spell's path (a fireball arcs `arc` units over the straight line, the spear flies straight). */
export function pathAt(from: Pt, to: Pt, t: number, arc: number): Pt {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - arc * 4 * t * (1 - t) };
}
