import type { SkinProgress } from '../types';

// Grijpmachine, pure: the claw's trip per pick as a timeline of stages, its pose at any moment of that trip (px in the
// glass), the near-miss draw and the coin counter. The component only measures the glass and calls poseAt per frame.

export const GRIJP = {
    // One prize per sum: 15 coins in the machine (the shelf has 15 places).
    questions: 15,
    // Crossing the whole glass takes this long; a short hop never feels instant (a real claw is slow, that is the fun).
    crossMs: 1150,
    minMoveMs: 360,
    // Down to the plush, the fingers closing, then a short hush with the claw shut before the reveal.
    dropMs: 520,
    grabMs: 280,
    holdMs: 160,
    // Up again; a wrong plush slips out at this share of the lift and falls back to its place in fallMs.
    liftMs: 520,
    slipAt: 0.5,
    fallMs: 620,
    // Over the chute: the fingers open and the prize drops out of sight.
    releaseMs: 300,
    chuteMs: 380,
    // Now and then the prize slides in the claw on the way to the chute (drama), never twice in a row; it always holds.
    nearMissChance: 0.3,
    nearMissMs: 760,
    // How far a near-miss prize slides down, as a share of the plush's height.
    nearMissSag: 0.16,
    // The idle sway: degrees each way and one full swing.
    swayDeg: 4,
    swayMs: 2600,
    // The claw leans back while it travels (degrees).
    leanDeg: 5,
} as const;

export type Stage = 'idle' | 'go' | 'drop' | 'grab' | 'hold' | 'lift' | 'carry' | 'wobble' | 'release' | 'chute' | 'back';
export type Result = 'right' | 'wrong';

// The glass as the claw sees it (px from the glass's top-left). y = the claw head's top, so the cable length.
export interface ClawGeom {
    w: number;
    homeX: number;
    restY: number;
    // Per slot: the claw's x over the plush, its y at the bottom, and the plush's resting centre.
    slots: readonly { x: number; grabY: number; cx: number; cy: number; h: number }[];
    // The chute's floor: a released prize falls to here (below the glass edge, out of sight).
    chuteY: number;
}

export interface Job {
    slot: number;
    result: Result | null;
    nearMiss: boolean;
}

export interface Span { stage: Stage; at: number; ms: number }

export const moveMs = (dx: number, w: number) => Math.max(GRIJP.minMoveMs, Math.round((Math.abs(dx) / Math.max(1, w)) * GRIJP.crossMs));

/** The trip's stages in order with their start (ms since the tap); after the hold it needs the result. */
export function timeline(job: Job, g: ClawGeom): Span[] {
    const s = g.slots[job.slot];
    const out: Span[] = [];
    let at = 0;
    const add = (stage: Stage, ms: number) => { out.push({ stage, at, ms }); at += ms; };
    const there = moveMs(s.x - g.homeX, g.w);
    add('go', there);
    add('drop', GRIJP.dropMs);
    add('grab', GRIJP.grabMs);
    add('hold', GRIJP.holdMs);
    if (!job.result) return out;
    add('lift', GRIJP.liftMs);
    if (job.result === 'wrong') {
        add('back', there);
        return out;
    }
    const half = Math.round(there / 2);
    add('carry', half);
    if (job.nearMiss) add('wobble', GRIJP.nearMissMs);
    add('carry', there - half);
    add('release', GRIJP.releaseMs);
    add('chute', GRIJP.chuteMs);
    return out;
}

/** The moment of the reveal (ms since the tap): the claw is shut on the plush, the answer goes to the session. */
export const revealAt = (job: Job, g: ClawGeom) => timeline({ ...job, result: null }, g).reduce((t, s) => t + s.ms, 0);

/** The whole trip's length, the slipped plush's fall included; Infinity while the result is unknown. */
export function tripMs(job: Job, g: ClawGeom): number {
    if (!job.result) return Infinity;
    const spans = timeline(job, g);
    const end = spans.reduce((t, s) => t + s.ms, 0);
    if (job.result === 'right') return end;
    const lift = spans.find(s => s.stage === 'lift')!;
    return Math.max(end, lift.at + lift.ms * GRIJP.slipAt + GRIJP.fallMs);
}

// Smooth start and stop for every move.
const ease = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// A fall that lands and bounces twice, smaller each time (k 0 … 1 → 0 … 1 with dips back up).
export function bounce(k: number): number {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    if (k < 0.56) return (k / 0.56) ** 2;
    if (k < 0.82) { const u = (k - 0.69) / 0.13; return 1 - 0.14 * (1 - u * u); }
    const u = (k - 0.91) / 0.09;
    return 1 - 0.04 * (1 - u * u);
}

export interface Pose {
    stage: Stage;
    x: number;
    y: number;
    // 0 = fingers shut, 1 = wide open.
    open: number;
    rot: number;
    // The prize while it is out of its place (carried, slipping back or dropping into the chute); null = in its place.
    prize: { x: number; y: number; rot: number } | null;
    // A wrong plush has slipped (falling back, or already back in its place).
    slipped: boolean;
    done: boolean;
}

/** The claw at rest over the chute, swaying a little; clock = game time in ms. */
export const idlePose = (g: ClawGeom, clock: number): Pose => ({
    stage: 'idle', x: g.homeX, y: g.restY, open: 0.55, rot: Math.sin((clock / GRIJP.swayMs) * 2 * Math.PI) * GRIJP.swayDeg,
    prize: null, slipped: false, done: true,
});

/** Where everything is t ms after the tap (t never passes the reveal while the result is unknown). */
export function poseAt(job: Job, t: number, g: ClawGeom, clock: number): Pose {
    const s = g.slots[job.slot];
    const spans = timeline(job, g);
    const span = spans.find(p => t < p.at + p.ms) ?? spans[spans.length - 1];
    const k = Math.min(1, Math.max(0, (t - span.at) / span.ms));
    const dir = Math.sign(s.x - g.homeX) || 1;
    const sway = Math.sin((clock / GRIJP.swayMs) * 2 * Math.PI) * GRIJP.swayDeg * 0.4;
    // The plush hangs from the claw at the offset it had when the fingers closed.
    const hang = { dx: s.cx - s.x, dy: s.cy - s.grabY };
    // The claw head turns round the cable's end (x, y), so the hanging plush swings with it.
    const held = (x: number, y: number, rot: number, sag = 0, spin = rot) => {
        const r = (rot * Math.PI) / 180;
        const dy = hang.dy + sag;
        return { x: x + hang.dx * Math.cos(r) - dy * Math.sin(r), y: y + hang.dx * Math.sin(r) + dy * Math.cos(r), rot: spin };
    };
    const done = t >= tripMs(job, g);
    const base = { stage: span.stage, slipped: false, done };
    switch (span.stage) {
        case 'go': {
            const x = lerp(g.homeX, s.x, ease(k));
            return { ...base, x, y: g.restY, open: 0.55 + 0.45 * ease(k), rot: -dir * GRIJP.leanDeg * Math.sin(k * Math.PI) + sway, prize: null };
        }
        case 'drop':
            return { ...base, x: s.x, y: lerp(g.restY, s.grabY, ease(k)), open: 1, rot: 0, prize: null };
        case 'grab':
            return { ...base, x: s.x, y: s.grabY, open: 1 - ease(k), rot: 0, prize: null };
        case 'hold':
            return { ...base, x: s.x, y: s.grabY, open: 0, rot: 0, prize: null };
        case 'lift': {
            const y = lerp(s.grabY, g.restY, ease(k));
            if (job.result === 'wrong' && k >= GRIJP.slipAt) {
                return { ...base, x: s.x, y, open: Math.min(0.35, (k - GRIJP.slipAt) * 2), rot: 0, prize: slipPrize(job, t, g, spans), slipped: true };
            }
            return { ...base, x: s.x, y, open: 0, rot: 0, prize: held(s.x, y, 0) };
        }
        case 'back': {
            const x = lerp(s.x, g.homeX, ease(k));
            return { ...base, x, y: g.restY, open: 0.35 + 0.2 * k, rot: dir * GRIJP.leanDeg * Math.sin(k * Math.PI) + sway, prize: slipPrize(job, t, g, spans), slipped: true };
        }
        case 'carry': {
            const carries = spans.filter(p => p.stage === 'carry');
            const total = carries.reduce((n, p) => n + p.ms, 0);
            const done0 = span === carries[0] ? 0 : carries[0].ms;
            const kk = (done0 + k * span.ms) / Math.max(1, total);
            const x = lerp(s.x, g.homeX, ease(kk));
            const rot = dir * GRIJP.leanDeg * Math.sin(kk * Math.PI) + sway;
            // After a near miss the prize climbs back up into the fingers over the second half.
            const sag = job.nearMiss && span !== carries[0] ? s.h * GRIJP.nearMissSag * (1 - ease(k)) : 0;
            return { ...base, x, y: g.restY, open: 0, rot, prize: held(x, g.restY, rot, sag, rot * 1.6) };
        }
        case 'wobble': {
            const x = lerp(s.x, g.homeX, 0.5);
            // It slides down fast, shivers in the fingers, then holds.
            const sag = s.h * GRIJP.nearMissSag * ease(Math.min(1, k * 3));
            const shake = Math.sin(k * Math.PI * 9) * (1 - k) * 9;
            return { ...base, x, y: g.restY, open: 0.12 * Math.sin(k * Math.PI), rot: shake * 0.4, prize: held(x, g.restY, shake * 0.4, sag, shake) };
        }
        case 'release':
            return { ...base, x: g.homeX, y: g.restY, open: ease(k), rot: sway, prize: held(g.homeX, g.restY, sway, (g.chuteY - g.restY) * 0.12 * k * k, 0) };
        case 'chute': {
            const from = g.restY + (g.chuteY - g.restY) * 0.12;
            const y = lerp(from, g.chuteY, k * k);
            return { ...base, x: g.homeX, y: g.restY, open: 1 - 0.45 * k, rot: sway, prize: done ? null : held(g.homeX, y, 0, 0, k * 25) };
        }
        default:
            return idlePose(g, clock);
    }
}

// The slipped plush: from the claw at the slip back to its own place, bouncing on the heap; null once it is back.
function slipPrize(job: Job, t: number, g: ClawGeom, spans: Span[]): Pose['prize'] {
    const s = g.slots[job.slot];
    const lift = spans.find(p => p.stage === 'lift')!;
    const slipT = lift.at + lift.ms * GRIJP.slipAt;
    const k = (t - slipT) / GRIJP.fallMs;
    if (k >= 1) return null;
    const fromY = lerp(s.grabY, g.restY, ease(GRIJP.slipAt)) + (s.cy - s.grabY);
    const y = lerp(fromY, s.cy, bounce(Math.max(0, k)));
    return { x: s.cx, y, rot: Math.sin(Math.max(0, k) * Math.PI * 3) * 14 * (1 - k) };
}

/** A tap's trip: does this right answer get a near miss? Never twice in a row (lastNear = the previous right one's). */
export const nearMissOf = (roll: number, lastNear: boolean) => !lastNear && roll < GRIJP.nearMissChance;

/** Coins still in the machine: one per sum; a coin goes in when the claw sets off (inFlight), before the session counts it. */
export const coinsLeft = (p: Pick<SkinProgress, 'total' | 'answered'>, inFlight: boolean) =>
    Math.max(0, (p.total ?? GRIJP.questions) - p.answered - (inFlight ? 1 : 0));

/** The stage a sound or a look starts on, between two moments of the trip (one frame): each crossed start once. */
export function crossed(job: Job, g: ClawGeom, from: number, to: number): Stage[] {
    return timeline(job, g).filter(s => s.at > from && s.at <= to).map(s => s.stage);
}
