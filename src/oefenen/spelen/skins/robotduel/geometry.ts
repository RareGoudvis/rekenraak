import type { Side } from '../../duel/types';

// Robotduel's stage geometry (art.tsx draws in these units).

export type Model = 'bruiser' | 'sleek';
export const MODEL: Record<Side, Model> = { left: 'bruiser', right: 'sleek' };

// The scene: 800 × 380 from y −40 (headroom for the health bars), the mat's front edge at 324, the robots' feet on 306.
export const VIEW = { x: 0, y: -40, w: 800, h: 380 } as const;
export const FLOOR = 306;
export const ROBOT_X: Record<Side, number> = { left: 228, right: 572 };
// Where a hit lands on a robot (robot units): the front of its chest.
const IMPACT = { x: 46, y: -168 } as const;

/** Robot units of `side` → scene units. */
export function toScene(side: Side, p: { x: number; y: number }) {
    return { x: side === 'left' ? ROBOT_X.left + p.x : ROBOT_X.right - p.x, y: FLOOR + p.y };
}
export const impactAt = (side: Side) => toScene(side, IMPACT);
