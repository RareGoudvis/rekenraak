import type { Side } from '../../duel/types';

// Monstertrucks' scene geometry: an arena H units high seen from the side (its width follows the band), the crowd
// on top, two lanes in the dirt (left = the back lane, right = the front lane), both trucks driving to the right.
// A truck is drawn with its front bumper at x 0 and its tyres on y 0; an obstacle with its near edge at x 0.

export const H = 300;
// Each lane's ground line and how big its truck and obstacles are drawn: two lanes of their own, the crash barrier
// between them (the left lane's ground + 6), the small grandstand above. A truck is 175 units high: 0.5 = 88.
export const LANE: Record<Side, { y: number; scale: number }> = { left: { y: 170, scale: 0.5 }, right: { y: 298, scale: 0.5 } };
// The tiles the backdrop and the dirt repeat in (they scroll by whole tiles without a seam).
export const TILE = { stand: 640, wall: 200, dirt: 260, tyres: 64 } as const;
// The truck: its wheels (x of the hubs) and their radius; its length behind the bumper.
export const WHEELS = [-122, -36] as const;
export const WHEEL_R = 36;
export const TRUCK_LEN = 156;
