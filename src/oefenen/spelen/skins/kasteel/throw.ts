// A catapult throw, pure: the arm's geometry and timing that put a stone's flight on the arm tip at the
// release (art.tsx draws it, kasteel.css moves it). Units: the castle's (castle.ts).

// The catapult's pivot on the wall.
export const PIVOT = { x: 146, y: -162 };
// The arm swings from rest (pulled back) to its stop bar at RELEASE_DEG; it hits the bar at RELEASE_AT of
// THROW_MS (the 20% keyframe of ks-throw in kasteel.css), and that is when the stone leaves.
export const RELEASE_DEG = 95;
export const THROW_MS = 1100;
const RELEASE_AT = 0.2;
/** Ms from the fire to the stone leaving the bucket; the rest of a flight's ms is the flight itself. */
export const RELEASE_MS = THROW_MS * RELEASE_AT;

export const stoneR = (big: boolean) => (big ? 16 : 10);
/** The stone's centre in the bucket at rest (arm units around the pivot): a big one sits higher. */
export const seatOf = (big: boolean) => ({ x: -54, y: -2 - stoneR(big) * 0.45 });

function turn(p: { x: number; y: number }, deg: number) {
    const a = (deg * Math.PI) / 180;
    return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) };
}

/** Where a stone leaves the bucket (castle units): its seat, swung with the arm to the stop bar. */
export function launchOf(big: boolean) {
    const p = turn(seatOf(big), RELEASE_DEG);
    return { x: PIVOT.x + p.x, y: PIVOT.y + p.y };
}

/** A flight's timing: it waits in the bucket until the release, then flies the rest of its ms. */
export function flightTiming(ms: number) {
    const wait = Math.min(RELEASE_MS, ms);
    return { wait, fly: ms - wait };
}
