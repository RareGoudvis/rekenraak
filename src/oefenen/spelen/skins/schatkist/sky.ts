// Schatkist's sky, pure: in a timed round the sun follows the clock (it rises from the sea when the time starts,
// is high at half time and sinks at the end), and the sky follows the sun: dawn → day → sunset.

export interface Sky {
    // The sun's centre in the island's 400 × 300 viewBox.
    x: number;
    y: number;
    // 0–1: how much of the dawn and the sunset colours are in the sky (both 0 = plain day).
    dawn: number;
    dusk: number;
}

// The sea's horizon line in the viewBox; the sun (r 26) starts and ends with its top just peeking out.
export const HORIZON = 190;
const LOW = HORIZON + 14;
const HIGH = 44;
// Left of the palm, so the first light is not hidden behind its trunk.
const FROM_X = 18;
const TO_X = 354;
// Dawn fades out over the first quarter of the round, the sunset glows in over the last third.
const DAWN_UNTIL = 0.25;
const DUSK_FROM = 0.66;

// An untimed round: a sunny day, the sun high on the right.
export const DAY: Sky = { x: 352, y: 56, dawn: 0, dusk: 0 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The sky at a point of the round (0 = the clock starts, 1 = time up). */
export function skyAt(t: number): Sky {
    const p = clamp01(t);
    return {
        x: FROM_X + (TO_X - FROM_X) * p,
        y: LOW - (LOW - HIGH) * Math.sin(Math.PI * p),
        dawn: clamp01(1 - p / DAWN_UNTIL),
        dusk: clamp01((p - DUSK_FROM) / (1 - DUSK_FROM)),
    };
}

/** The sky for a round's progress: the day when untimed, else where the clock is. */
export function skyFor(msLeft: number | null, msTotal: number | null): Sky {
    if (msLeft === null || !msTotal) return DAY;
    return skyAt(1 - msLeft / msTotal);
}

// The end scene of a timed round: the sun half under the sea, the sky aglow.
export const SUNSET: Sky = skyAt(0.965);
