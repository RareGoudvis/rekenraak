import type { SkinProgress } from '../types';

// Zeehondjes voeren, pure: what the bucket holds and the throw of one fish (measured once per right answer).

// The round: one fish per question in the bucket.
export const ZEEHOND_ROUND = 15;

/** Fish still in the bucket: a fish leaves only when a seal eats it (met hulp included). */
export const fishLeft = (p: Pick<SkinProgress, 'total' | 'right'>) => Math.max(0, (p.total ?? ZEEHOND_ROUND) - p.right);

export interface Flight {
    key: string;
    // Start (the bucket's mouth) in the skin's box, px.
    x: number;
    y: number;
    // To the seal's mouth.
    dx: number;
    dy: number;
    // The top of the arc, relative to the start (negative = up).
    arc: number;
}

interface Box { left: number; top: number; width: number; height: number }
const mid = (b: Box) => ({ x: b.left + b.width / 2, y: b.top + b.height / 2 });

/** A soft arc from the bucket to the mouth: it always rises a little above the higher end. */
export function flightOf(key: string, box: Box, from: Box, to: Box): Flight {
    const a = mid(from);
    const b = mid(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { key, x: a.x - box.left, y: a.y - box.top, dx, dy, arc: Math.min(0, dy) - Math.max(40, Math.abs(dx) * 0.2) };
}
