// Voetbal's pitch in a slight top-down view, pure for the tests. Pitch spots are (u, v): u runs along the length
// from the polar bears' goal line (0) to the black bears' (1), v across from the far touchline (0) to the near one
// (1). project() turns a spot into the scene's viewBox (0 0 400 300) with a simple perspective: the far side is
// narrower, and everything on it is drawn smaller (s).

export const VIEW = { w: 400, h: 300 } as const;

// The pitch quad in the viewBox: the far touchline at y far, the near one at y near (the stand sits above far).
export const PITCH = { far: 116, near: 284, farL: 48, farR: 352, nearL: 14, nearR: 386 } as const;

export interface Spot { u: number; v: number }
export interface XY { x: number; y: number }
export interface Projected extends XY { s: number }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A pitch spot in the viewBox; s = the depth scale (1 on the near touchline). */
export function project(u: number, v: number): Projected {
    const left = lerp(PITCH.farL, PITCH.nearL, v);
    const right = lerp(PITCH.farR, PITCH.nearR, v);
    return { x: left + u * (right - left), y: lerp(PITCH.far, PITCH.near, v), s: (right - left) / (PITCH.nearR - PITCH.nearL) };
}

const pt = (u: number, v: number) => { const p = project(u, v); return `${r1(p.x)} ${r1(p.y)}`; };
const quad = (u0: number, v0: number, u1: number, v1: number) => `M${pt(u0, v0)} L${pt(u1, v0)} L${pt(u1, v1)} L${pt(u0, v1)} Z`;

// Length over width of the pitch, so the centre circle is a circle on the grass and not a stretched ring.
const ASPECT = 1.6;

/** A circle on the grass (radius in v units), drawn as a projected polygon. */
export function ringPath(cu: number, cv: number, r: number, steps = 36): string {
    const pts = Array.from({ length: steps }, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return pt(cu + (Math.cos(a) * r) / ASPECT, cv + Math.sin(a) * r);
    });
    return `M${pts.join(' L')} Z`;
}

// The goal mouth runs across v GOAL_V..1-GOAL_V on each goal line; the box sizes are in pitch units.
export const GOAL_V = 0.38;
const BOX = { depth: 0.16, v: 0.2 };
const SIX = { depth: 0.055, v: 0.31 };
const SPOT_U = 0.115;

// The mowing stripes, the lines and the spots, all inside the pitch (nothing runs off it).
export function pitchLines() {
    const stripes = Array.from({ length: 5 }, (_, i) => quad(i * 0.2, 0, i * 0.2 + 0.1, 1));
    const lines = [
        quad(0, 0, 1, 1),
        `M${pt(0.5, 0)} L${pt(0.5, 1)}`,
        ringPath(0.5, 0.5, 0.17),
        quad(0, BOX.v, BOX.depth, 1 - BOX.v),
        quad(1 - BOX.depth, BOX.v, 1, 1 - BOX.v),
        quad(0, SIX.v, SIX.depth, 1 - SIX.v),
        quad(1 - SIX.depth, SIX.v, 1, 1 - SIX.v),
    ];
    const spots = [project(0.5, 0.5), project(SPOT_U, 0.5), project(1 - SPOT_U, 0.5)];
    return { stripes, lines, spots };
}

// The goal frame: posts GOAL_H tall at the depth scale, the net running back NET_U beyond the goal line.
const GOAL_H = 50;
const NET_U = 0.07;
const BACK_H = 0.72;

export interface GoalArt {
    back: string; sideFar: string; top: string; sideNear: string;
    frame: string; backFrame: string; floor: string;
}

/** The goal on one end (side 1 = the black bears' goal on the right), its net in perspective. */
export function goalArt(side: 0 | 1): GoalArt {
    const gu = side;
    const bu = side ? 1 + NET_U : -NET_U;
    const g = (u: number, v: number, h: number) => { const p = project(u, v); return `${r1(p.x)} ${r1(p.y - h * p.s)}`; };
    const v0 = GOAL_V, v1 = 1 - GOAL_V;
    const fg1 = g(gu, v0, 0), ft1 = g(gu, v0, GOAL_H), fg2 = g(gu, v1, 0), ft2 = g(gu, v1, GOAL_H);
    const bg1 = g(bu, v0, 0), bt1 = g(bu, v0, GOAL_H * BACK_H), bg2 = g(bu, v1, 0), bt2 = g(bu, v1, GOAL_H * BACK_H);
    return {
        floor: `M${fg1} L${bg1} L${bg2} L${fg2} Z`,
        back: `M${bg1} L${bt1} L${bt2} L${bg2} Z`,
        sideFar: `M${fg1} L${ft1} L${bt1} L${bg1} Z`,
        top: `M${ft1} L${ft2} L${bt2} L${bt1} Z`,
        sideNear: `M${fg2} L${ft2} L${bt2} L${bg2} Z`,
        frame: `M${fg1} L${ft1} L${ft2} L${fg2}`,
        backFrame: `M${ft1} L${bt1} L${bg1} M${ft2} L${bt2} L${bg2} M${bt1} L${bt2}`,
    };
}

/** Where a ball shot at the goal ends up on the grass: inside the net, across the goal at v. */
export function netSpot(side: 0 | 1, v: number): Spot {
    return { u: side ? 1 + NET_U * 0.75 : -NET_U * 0.75, v };
}

// The stand's front rows of tiny bear fans (x, baseline y, fur, scarf), far beyond the viewBox's sides so a wide
// screen still shows a full stand. Seeded by position only: the same crowd every match.
export interface Fan { x: number; y: number; ijs: boolean; blue: boolean; waves: boolean; row: number }
export const FAN_ROWS = [54, 72, 90] as const;

export function fans(from = -160, to = 560, gap = 17): Fan[] {
    const out: Fan[] = [];
    FAN_ROWS.forEach((y, row) => {
        for (let x = from + (row % 2) * (gap / 2), i = 0; x <= to; x += gap, i++) {
            const h = Math.abs((i * 7 + row * 13) % 11);
            out.push({ x, y, row, ijs: h % 2 === 0, blue: h % 3 !== 1, waves: h === 3 || h === 8 });
        }
    });
    return out;
}
