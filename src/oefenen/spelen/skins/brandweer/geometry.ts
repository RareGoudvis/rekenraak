import { COLS } from './fire';

// Brandweer's stage, in the SVG's units (viewBox 1600 × 1000, the stage keeps that 16:10 box; brandweer.css SYNC
// .bw-stage). The windows' tap buttons sit on the same box in percentages, so the art and the buttons line up.

export const STAGE_W = 1600;
export const STAGE_H = 1000;
// The building's foot (the lawn and the sidewalk), and the street below it.
export const GROUND = 880;
export const STREET = 905;
// The apartment block, and its 3 × 3 windows (left edges, top edges, size).
export const BLOCK = { x: 560, y: 160, w: 740, h: GROUND - 160 } as const;
export const WIN_X = [600, 835, 1070] as const;
export const WIN_Y = [215, 400, 585] as const;
export const WIN_W = 190;
export const WIN_H = 150;

export const winBox = (i: number) => ({ x: WIN_X[i % COLS], y: WIN_Y[Math.floor(i / COLS)], w: WIN_W, h: WIN_H });
export const winCentre = (i: number) => { const b = winBox(i); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
export const rowOf = (i: number) => Math.floor(i / COLS);

/** A window's box in percentages of the stage, for its HTML button. */
export function winPercent(i: number) {
    const b = winBox(i);
    return { left: `${(b.x / STAGE_W) * 100}%`, top: `${(b.y / STAGE_H) * 100}%`, width: `${(b.w / STAGE_W) * 100}%`, height: `${(b.h / STAGE_H) * 100}%` };
}

/** A stage point as CSS percentages (Bursts in the HTML layer). */
export const pct = (x: number, y: number) => ({ x: `${(x / STAGE_W) * 100}%`, y: `${(y / STAGE_H) * 100}%` });

// The ladder truck: its turntable's pivot, the ladder's base section and the most its fly section slides out.
export const PIVOT = { x: 215, y: 812 } as const;
export const LADDER_BASE = 300;
export const LADDER_FLY = 320;
// Where the basket stops for a row: just left of the facade, so the ladder never hides a window.
const BASKET_X = 470;
// At rest (before the first sum) the ladder lies over the cab.
export const REST = { angle: -9, ext: 0 } as const;

// The nozzle's grip in the basket's frame (the ladder tip at 0 0); the water leaves NOZZLE_LEN further on.
export const GRIP = { x: 16, y: -30 } as const;
export const NOZZLE_LEN = 52;

export interface Aim { angle: number; ext: number; tip: { x: number; y: number } }

/** The ladder raised to a row (0 = top): the angle in degrees (negative = up) and how far the fly section is out. */
export function aimAt(row: number): Aim {
    const tip = { x: BASKET_X, y: WIN_Y[Math.min(2, Math.max(0, row))] + WIN_H / 2 - 22 };
    const dx = tip.x - PIVOT.x;
    const dy = tip.y - PIVOT.y;
    const len = Math.hypot(dx, dy);
    return { angle: (Math.atan2(dy, dx) * 180) / Math.PI, ext: Math.min(LADDER_FLY, Math.max(0, len - LADDER_BASE)), tip };
}

/** The resting ladder's tip (where the basket hangs). */
export function restTip() {
    const a = (REST.angle * Math.PI) / 180;
    return { x: PIVOT.x + Math.cos(a) * LADDER_BASE, y: PIVOT.y + Math.sin(a) * LADDER_BASE };
}

/** The water's arc from the nozzle to a window: a quadratic curve that bows up a little over its length. */
export function sprayPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
    const mx = (from.x + to.x) / 2;
    const my = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.22 - 20;
    return `M${from.x.toFixed(1)} ${from.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

// The rescue sheet held by two firefighters in front of the door, and the lawn where the residents wait.
export const SHEET = { x: 930, y: 868, rx: 104, ry: 20 } as const;
export const HOLDERS = [SHEET.x - SHEET.rx - 14, SHEET.x + SHEET.rx + 14] as const;
export const RESIDENTS = [1372, 1462, 1552] as const;
// Rescued pets sit along the lawn's front, at most this many shown.
export const PET_ROW = { x: 1350, y: 920, step: 62, max: 6 } as const;
export const petSpot = (k: number) => ({ x: PET_ROW.x + (k % PET_ROW.max) * PET_ROW.step, y: PET_ROW.y });
