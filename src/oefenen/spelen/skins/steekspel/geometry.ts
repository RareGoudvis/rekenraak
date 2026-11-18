import type { Side } from '../../duel/types';
import { shareOf } from './rule';

// Steekspel's scene geometry, pure: a 1200 × 340 tournament ground seen from the side. The blue knight (left) rides
// behind the barrier, the orange one (right) in front of it, towards each other. A knight's x is its horse's middle;
// the knight is drawn facing right (the right one mirrored). Knight units: y 0 = the hooves, up negative.

export const VIEW = { w: 1200, h: 340 } as const;
export const ROW: Record<Side, { y: number; scale: number }> = { left: { y: 252, scale: 1 }, right: { y: 334, scale: 1.12 } };
// The start of each knight and the gap left between them at the tilt (the lances reach across it).
export const START: Record<Side, number> = { left: 150, right: 1050 };
export const MEET_GAP = 168;
// The barrier between the rows (scene units): its foot and its top rail.
export const BARRIER = { x0: 40, x1: 1160, foot: 274, top: 234 } as const;

// The lance: its pivot in the knight's hand, its reach, and its angle up (riding) and down (couched), per row
// (the back knight's lance points a little down over the barrier, the front one's up, so they meet the shields).
export const LANCE = { x: 2, y: -100, len: 160, butt: 28 } as const;
export const LANCE_DEG: Record<Side, { up: number; down: number }> = { left: { up: -50, down: 18 }, right: { up: -58, down: -24 } };

/** A knight's x after its steps on a list of `baan` steps (both together reach the gap at the tilt). */
export function knightX(side: Side, points: number, baan: number): number {
    const run = (START.right - START.left - MEET_GAP) * shareOf(points, baan);
    return side === 'left' ? START.left + run : START.right - run;
}

/** Where the lances meet at the tilt: between the two knights, over the barrier. */
export const clashAt = (xl: number, xr: number) => ({ x: (xl + xr) / 2, y: 178 });
