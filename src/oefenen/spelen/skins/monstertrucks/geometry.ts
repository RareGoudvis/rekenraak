import type { Side } from '../../duel/types';
import { progressOf, TRUCK } from './rule';

// Monstertrucks' scene geometry, pure: a 1200 × 340 world seen from the side, the crowd on top, two lanes in the
// dirt (left = the back lane, right = the front lane), both trucks driving left to right. A truck's x is its front
// bumper; its body reaches TRUCK_LEN back from there.

export const VIEW = { w: 1200, h: 340 } as const;
// Each lane's ground line and how big its truck is drawn (the back lane a little smaller: depth).
export const LANE: Record<Side, { y: number; scale: number }> = { left: { y: 240, scale: 0.96 }, right: { y: 324, scale: 1.1 } };
// The front bumper at 0 points and at the finish.
export const START_X = 176;
export const FINISH_X = 1112;
export const TRUCK_LEN = 132;
// The ramp and the row of cars in front of the truck (lane units from its bumper): the ramp's length and a car's.
export const RAMP = { len: 34, h: 32 } as const;
export const CAR = { len: 44, h: 30, gap: 2, max: 4 } as const;

/** A truck's front bumper at points of finish (it stops at the line). */
export const truckX = (points: number, finish: number) => START_X + (FINISH_X - START_X) * progressOf(points, finish);

/** How far one jump carries a truck (its gas and the bonus), in scene units: the cars must fit under it. */
export const jumpLen = (finish: number) => truckX(1 + TRUCK.jumpBonus, finish) - START_X;

/** The ramp and the cars in front of the bumper (scene units from it): as many cars as the jump clears (2 on the default 20). */
export function rowOf(finish: number): { ramp: number; cars: number[] } {
    const room = jumpLen(finish) - RAMP.len - 6;
    const n = Math.max(1, Math.min(CAR.max, Math.floor(room / (CAR.len + CAR.gap))));
    return { ramp: 4, cars: Array.from({ length: n }, (_, i) => 4 + RAMP.len + 2 + i * (CAR.len + CAR.gap)) };
}
