// Ballonnen float: where each of the four balloons is at a moment of game time. Pure maths, no DOM, so
// the skin's rAF loop only writes transforms and the tests can check readability over a whole round.
//
// A balloon loops: it rises from just under the stage to just over its top, then wraps to the bottom.
// p (0..1) is the share of one loop's TIME; floatPath maps it to a height. The number is readable in the
// "band" (above the bottom edge, below the sign); the balloon spends FLOAT.band of the loop there at a
// steady pace and hurries through the hidden part (off the top, back in from below), with a soft ramp.
// The four loops are a quarter apart with a small bounded wobble, so two balloons are never hidden at
// once: at least three numbers can be read at any moment.

export const FLOAT = {
    // One loop at streak 0 (s): bottom to top in about 8.5 s, the rest is the quick wrap.
    loopS: 10,
    // Share of a loop the number is readable.
    band: 0.84,
    // Loop offsets per balloon (not in lane order, so the four do not climb as a staircase).
    phases: [0, 0.5, 0.25, 0.75],
    // Each balloon's own pace: a phase wobble (share of a loop) and its period (s). 2 × wobble + (1 − band) < 0.25.
    wobble: 0.03,
    wobbleS: [13, 17, 11, 19],
    // Sideways sway: period per balloon (s) and the largest swing (px).
    swayS: [4.2, 5.4, 4.8, 6.0],
    swayPx: 18,
    // A little faster with the streak, never frantic: +2 % a step, at most +20 %.
    perStreak: 0.02,
    maxStreak: 10,
    // Under reduced motion: still heights inside the band (share of the band from the bottom).
    still: [0.25, 0.5, 0.3, 0.55],
    // Space kept free under the number at the bottom edge (px).
    margin: 8,
} as const;

export interface FloatGeom {
    // The sky's size (px).
    w: number;
    h: number;
    // One balloon's box (px): width, height (string included).
    bw: number;
    bh: number;
    // The number patch's centre from the balloon's top, and half its height (px).
    numAt: number;
    numHalf: number;
    // The lowest edge of the sign (px from the sky's top): the number is hidden above it.
    top: number;
}

export interface FloatPath {
    // The balloon's top (px from the sky's top) at loop share p.
    yAt(p: number): number;
    // The band in path distance (px risen since the balloon's top left the bottom edge).
    band: [number, number];
    // Path distance at loop share p.
    dAt(p: number): number;
}

const SAMPLES = 512;
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const frac = (x: number) => x - Math.floor(x);

/** The loop for this stage: a steady pace in the band, R times faster outside it (soft ramps). */
export function floatPath(g: FloatGeom): FloatPath {
    const total = Math.max(1, g.h + g.bh);
    const d0 = Math.max(0, FLOAT.margin + g.numAt + g.numHalf);
    const d1 = Math.min(total, g.h - g.top - g.numHalf + g.numAt);
    // A stage too small for a band: an even pace.
    if (d1 - d0 < 1) {
        return { yAt: p => g.h - frac(p) * total, dAt: p => frac(p) * total, band: [d0, Math.max(d0, d1)] };
    }
    const ramp = Math.min(60, g.bh * 0.5);
    const speed = (d: number, r: number) => {
        if (d >= d0 && d <= d1) return 1;
        const out = d > d1 ? (d - d1) / ramp : (d0 - d) / ramp;
        return 1 + (r - 1) * smooth(out);
    };
    const step = total / SAMPLES;
    // Cumulative time at each sample for a hidden-part speed r; and the share spent in the band.
    const timesFor = (r: number) => {
        const t = new Float64Array(SAMPLES + 1);
        let inBand = 0;
        for (let k = 0; k < SAMPLES; k++) {
            const mid = (k + 0.5) * step;
            const dt = step / speed(mid, r);
            t[k + 1] = t[k] + dt;
            if (mid >= d0 && mid <= d1) inBand += dt;
        }
        return { t, share: inBand / t[SAMPLES] };
    };
    // The smallest speed-up that keeps the band's share (an even pace already does on a tall stage).
    let lo = 1, hi = 60;
    if (timesFor(1).share >= FLOAT.band) hi = 1;
    else for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (timesFor(mid).share < FLOAT.band) lo = mid; else hi = mid;
    }
    const { t } = timesFor(hi);
    const end = t[SAMPLES];
    const dAt = (p: number) => {
        const want = frac(p) * end;
        let a = 0, b = SAMPLES;
        while (b - a > 1) { const m = (a + b) >> 1; if (t[m] <= want) a = m; else b = m; }
        const span = t[b] - t[a];
        return (a + (span > 0 ? (want - t[a]) / span : 0)) * step;
    };
    return { yAt: p => g.h - dAt(p), dAt, band: [d0, d1] };
}

/** Game-time pace for a streak (1 = the base loop). */
export const floatPace = (streak: number) => 1 + FLOAT.perStreak * Math.min(Math.max(0, streak), FLOAT.maxStreak);

/** Balloon i's loop share at game time tau (s). */
export function phaseAt(i: number, tau: number): number {
    const wob = FLOAT.wobble * Math.sin((2 * Math.PI * tau) / FLOAT.wobbleS[i] + i * 1.3);
    return frac(tau / FLOAT.loopS + FLOAT.phases[i] + wob);
}

/** The centre of balloon i's lane, its sway and its still height. */
export const laneX = (g: FloatGeom, i: number) => (g.w * (i + 0.5)) / 4;
export const swayAmp = (g: FloatGeom) => Math.max(0, Math.min(FLOAT.swayPx, (g.w / 4 - g.bw) / 4));

/** Where balloon i's box goes (left, top in px) at game time tau, or still (reduced motion). */
export function floatAt(g: FloatGeom, path: FloatPath, i: number, tau: number | null): { x: number; y: number } {
    if (tau === null) {
        const [d0, d1] = path.band;
        return { x: laneX(g, i) - g.bw / 2, y: g.h - (d0 + (d1 - d0) * FLOAT.still[i]) };
    }
    const sway = swayAmp(g) * Math.sin((2 * Math.PI * tau) / FLOAT.swayS[i] + i * 2.1);
    return { x: laneX(g, i) - g.bw / 2 + sway, y: path.yAt(phaseAt(i, tau)) };
}

/** Is balloon i's number readable at game time tau (in the band)? */
export function readableAt(path: FloatPath, i: number, tau: number): boolean {
    const d = path.dAt(phaseAt(i, tau));
    return d >= path.band[0] && d <= path.band[1];
}
