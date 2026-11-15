// Ballonnen scenery: the three landscapes a passing bird switches between, when the bird flies, and the
// state each balloon shows after a pick. Pure, so the tests can check the cycle, the schedule and the
// wrong-answer moment without a DOM.

export const LANDS = ['gras', 'bergen', 'strand'] as const;
export type Land = typeof LANDS[number];

/** The landscape after a tap on the bird: grasland → besneeuwde bergen → palmstrand → grasland. */
export const nextLand = (land: Land): Land => LANDS[(LANDS.indexOf(land) + 1) % LANDS.length];

export const BIRD = {
    // The first flight soon after the start (s of play), so the pupil finds it in the first sums.
    firstS: 7,
    // Then one about every gapS, give or take jitterS; jitterS × 2 + flyS < gapS keeps flights apart.
    gapS: 22,
    jitterS: 4,
    // One crossing (s): quick enough never to hide a balloon for long.
    flyS: 5,
    // Up and down while it flies (px) and how many beats per crossing.
    bobPx: 6,
    bobs: 3,
} as const;

export interface BirdFlight {
    // The flight's number (0, 1, 2 …): a tap belongs to one flight.
    k: number;
    // Share of the crossing flown (0..1).
    p: number;
    // 1 = left to right, -1 = right to left.
    dir: 1 | -1;
}

// A small fixed jitter per flight (no rng state: the same game time gives the same bird).
const jitter = (k: number) => {
    const x = Math.sin(k * 12.9898 + 4.1) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
};

/** When flight k leaves (s of play). */
export const birdStart = (k: number) => BIRD.firstS + k * BIRD.gapS + (k === 0 ? 0 : jitter(k) * BIRD.jitterS);

/** The bird in the air at play time t (s), or null between flights. */
export function birdFlight(t: number): BirdFlight | null {
    if (t < BIRD.firstS) return null;
    const around = Math.floor((t - BIRD.firstS) / BIRD.gapS);
    for (const k of [around - 1, around, around + 1]) {
        if (k < 0) continue;
        const s = birdStart(k);
        if (t >= s && t < s + BIRD.flyS) return { k, p: (t - s) / BIRD.flyS, dir: k % 2 === 0 ? 1 : -1 };
    }
    return null;
}

/** The bird's box (left, top in px) on a stage w wide whose sign ends at signBottom: it crosses just under the sign. */
export function birdAt(f: BirdFlight, w: number, signBottom: number, bw: number, bh: number): { x: number; y: number } {
    const along = -bw + f.p * (w + bw);
    const x = f.dir === 1 ? along : w - bw - along;
    const y = signBottom + bh * 0.15 + BIRD.bobPx * Math.sin(f.p * Math.PI * 2 * BIRD.bobs);
    return { x, y };
}

// The ground's height near the right edge per landscape (share of the stage from the top): the hill, the snow, the sand.
const PERCH_AT: Record<Land, number> = { gras: 0.86, bergen: 0.88, strand: 0.92 };

/** Where the bird sits under reduced motion: on the ground near the right edge, never in the sum's way. */
export const birdPerch = (land: Land, w: number, h: number, bw: number, bh: number) => ({ x: w * 0.93 - bw / 2, y: h * PERCH_AT[land] - bh * 0.85 });

// What a balloon shows: popped (right pick), deflate (wrong pick: pfff and away), answer (the right one shows
// itself after a wrong pick), rest (the others step back), fresh (blown up anew on the next sum), idle.
export type SlotState = 'popped' | 'deflate' | 'answer' | 'rest' | 'fresh' | 'idle';

export interface SlotInput {
    // The balloon picked on this sum (null = none yet).
    picked: number | null;
    // The balloon picked on the sum before (it comes back blown up).
    fresh: number | null;
    // The right answer's balloon while the session shows feedback (-1 = none).
    answer: number;
    // The session shows the right / wrong flash.
    flash: boolean;
    correct: boolean;
}

export function slotState(i: number, s: SlotInput): SlotState {
    if (s.picked === i) return s.correct ? 'popped' : 'deflate';
    if (s.flash && i === s.answer && !s.correct) return 'answer';
    if (s.flash) return 'rest';
    return s.fresh === i ? 'fresh' : 'idle';
}
