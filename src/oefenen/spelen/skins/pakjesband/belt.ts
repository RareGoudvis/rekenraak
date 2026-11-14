// The Pakjesband belt, in shares of the track (0 = a parcel's left edge at the belt's start, 1 = its right edge
// at the end: it falls off). The four parcels ride together, so one "run" moves them all. The first parcel to
// fall off the end (the rightmost) is the sum's deadline: the same for every sum, whichever parcel is right.
// Pure, for the tests.

export const BELT = {
    parcels: 4,
    // Parcel i starts at start0 + i × gap (key 1 is the leftmost).
    start0: 0.02,
    gap: 0.19,
    // Track per second: the rightmost parcel reaches the end after about 12 s (mildly timed).
    speed: 0.034,
    // A new sum: the parcels wait this long before the belt starts.
    waitS: 0.6,
} as const;

export const startOf = (i: number) => BELT.start0 + i * BELT.gap;

/** The run at the start of a question: negative, so the belt waits a moment. */
export const runStart = () => -BELT.speed * BELT.waitS;

/** One frame of the belt. */
export const beltStep = (run: number, dt: number) => run + BELT.speed * dt;

/** Where parcel i is (never before its start). */
export const parcelAt = (i: number, run: number) => startOf(i) + Math.max(0, run);

/** Off the end of the belt. */
export const isOff = (i: number, run: number) => parcelAt(i, run) >= 1;

/** Seconds of belt time until parcel i falls off. */
export const secondsUntilOff = (i: number) => BELT.waitS + (1 - startOf(i)) / BELT.speed;

/** The sum's deadline: the first (rightmost) parcel fell off the end. */
export const beltDone = (run: number) => isOff(BELT.parcels - 1, run);
