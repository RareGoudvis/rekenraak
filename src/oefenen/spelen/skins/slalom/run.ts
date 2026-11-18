// Skislalom: the run down the slope. Pure: the skin calls tickRun every frame (game time only runs while
// the sum waits or flashes; help freezes it) and answerRun on the session's events; the score is the metres.
// One gate at a time carries the sum's three choices; it comes up the slope at the skier's speed. A right answer
// shoots the skier through his lane and adds a speed step, a wrong one shoots him through and he tumbles (back
// to step 1), a gate reached without an answer slips past (one step slower) and the same sum comes on a new gate.
// The levels (levels/clock.ts): at step 1 a gate takes the shared clock (12 s the first minute, then shorter); the
// whole speed table scales with it (pace), so each step stays as much faster. Makkelijk keeps the clock's first
// 12 s all round, and a tumble costs no speed (gentle).

import { CLOCK, clockMs } from '../../levels/clock';
import type { Level } from '../../levels/levels';

export const SLALOM = {
    // Speed per step in m/s at pace 1 (5 steps): about 8 s per gate at step 1, under 5 s at step 5 (gateSeconds).
    speeds: [7, 8.5, 10, 11.5, 13] as readonly number[],
    // A new gate stands this far down the slope (m); far enough to look small, near enough to read soon.
    spawnM: 55,
    // The skier reaches the gate at this distance (m): too late, it slips past.
    arriveM: 3,
    // Inside this distance he checks his speed for the gate, down to slowMin of his step (it also gives a slow thinker time).
    slowM: 20,
    slowMin: 0.45,
    // After an answer he shoots through the gate in at most this long (ms): inside the session's 700 ms right flash.
    passMs: 520,
    // Leaving a gate he is this much faster than his new step for a moment (then eases back, speedTau).
    exitBoost: 1.35,
    // How quickly the speed follows its target (s): smooth, never a jolt.
    speedTau: 0.45,
    // A passed gate fades out this long after the skier went through (ms).
    fadeMs: 220,
    // Right answers in a row for a little jump.
    jumpEvery: 3,
    // A tumble: down this long after the gate until he gets up (ms), the first rollMs of it rolling; the slide stops
    // with slideTau (s). The next sum may already be on screen: its gate waits until he is up.
    tumbleMs: 1500,
    rollMs: 600,
    slideTau: 0.3,
    // Back on his skis: the little hop up (ms); then he pushes off from standstill.
    upMs: 380,
    // A gate reached without an answer costs this many steps.
    missSteps: 1,
} as const;

export const STEPS = SLALOM.speeds.length;

export type GateEnd = 'right' | 'wrong' | 'miss';

export interface SlGate {
    id: number;
    // Metres between the skier and the gate (negative = behind him).
    d: number;
    // How the gate was taken; null = still open (waiting for an answer).
    end: GateEnd | null;
    // The shoot-through: ms since it started and the distance it started from; null = not rushing.
    rush: { t: number; from: number; speed: number } | null;
    // ms since the skier went through; null = not yet.
    pastMs: number | null;
}

export interface SlRun {
    // Metres down the slope: the score.
    metres: number;
    // 1..STEPS.
    step: number;
    // m/s now (the scene's motion, the speed lines).
    speed: number;
    gates: SlGate[];
    // ms left in a tumble (0 = on his skis), and of the hop up after it.
    down: number;
    up: number;
    nextId: number;
    // The speed table times this (paceOf: the shared clock); 1 = the table as it stands.
    pace: number;
    // A tumble keeps his speed step (Makkelijk).
    gentle: boolean;
}

/** What one tick did, for the skin's moments (sounds, bursts). */
export interface TickNews {
    // A gate the skier just went through, and how it was taken.
    passed: { id: number; end: GateEnd } | null;
    // An open gate just slipped past without an answer.
    missed: number | null;
    // He is back on his skis.
    gotUp: boolean;
}

export const speedOf = (step: number, pace = 1) => SLALOM.speeds[Math.min(STEPS, Math.max(1, step)) - 1] * pace;

/** How long a gate takes from spawn to arrival at this step without an answer (s). */
export function gateSeconds(step: number, pace = 1): number {
    const v = speedOf(step, pace);
    const { spawnM, arriveM, slowM, slowMin } = SLALOM;
    // Full speed down to slowM, then a straight ramp to slowMin: the time of the ramp is its distance over the log-mean speed.
    const ramp = slowM - arriveM;
    const k = (1 - slowMin) / ramp;
    return (spawnM - slowM) / v + Math.log(1 / slowMin) / (k * v);
}

/** The pace at which a step-1 gate takes the shared clock after elapsedMs of the round (Makkelijk: its first 12 s, held). */
export const paceOf = (level: Level, elapsedMs: number) => (gateSeconds(1) * 1000) / (clockMs(level, elapsedMs) ?? CLOCK.startMs);

export function startRun(pace = 1, gentle = false): SlRun {
    return { metres: 0, step: 1, speed: speedOf(1, pace), gates: [], down: 0, up: 0, nextId: 1, pace, gentle };
}

/** The gate waiting for an answer, if any. */
export const openGate = (r: SlRun): SlGate | null => r.gates.find(g => g.end === null) ?? null;

/** A new gate down the slope for the sum on screen (never on top of one still on its way). */
export function spawnGate(r: SlRun): SlRun {
    if (openGate(r)) return r;
    const g: SlGate = { id: r.nextId, d: SLALOM.spawnM, end: null, rush: null, pastMs: null };
    return { ...r, gates: [...r.gates, g], nextId: r.nextId + 1 };
}

// The speed he aims for: nothing while down, braking for an open gate as it comes close, else his step's speed.
function targetSpeed(r: SlRun): number {
    if (r.down > 0) return 0;
    const v = speedOf(r.step, r.pace);
    const g = openGate(r);
    if (!g || g.d >= SLALOM.slowM) return v;
    const k = Math.max(0, (g.d - SLALOM.arriveM) / (SLALOM.slowM - SLALOM.arriveM));
    return v * (SLALOM.slowMin + (1 - SLALOM.slowMin) * k);
}

// The open gate starts its shoot-through: at least a little faster than he skis now, and never longer than passMs.
function rushGate(r: SlRun, end: GateEnd): SlRun {
    const g = openGate(r);
    if (!g) return r;
    const speed = Math.max(r.speed * 1.2, g.d / (SLALOM.passMs / 1000), 1);
    return { ...r, gates: r.gates.map(x => (x === g ? { ...x, end, rush: { t: 0, from: g.d, speed } } : x)) };
}

/** The session judged the answer on the open gate: right = a step faster, wrong = back to step 1 after the tumble (gentle: his step stays). */
export function answerRun(r: SlRun, correct: boolean): SlRun {
    if (!openGate(r)) return r;
    const next = rushGate(r, correct ? 'right' : 'wrong');
    return { ...next, step: correct ? Math.min(STEPS, r.step + 1) : r.gentle ? r.step : 1 };
}

/** One frame of game time (ms). */
export function tickRun(r: SlRun, ms: number): { run: SlRun; news: TickNews } {
    const news: TickNews = { passed: null, missed: null, gotUp: false };
    if (ms <= 0) return { run: r, news };
    const dt = ms / 1000;
    let { down, up, step, speed } = r;
    let gates = r.gates;

    if (down > 0) {
        down = Math.max(0, down - ms);
        if (down === 0) { up = SLALOM.upMs; news.gotUp = true; }
    } else if (up > 0) up = Math.max(0, up - ms);

    // A rushing gate sets how far the world moves this frame; otherwise the skier's own speed does.
    const rushing = gates.find(g => g.rush);
    let advance: number;
    const waiting = !!rushing?.rush && (down > 0 || up > 0);
    if (waiting) {
        // Still in the snow: the shoot-through waits until he is up.
        advance = 0;
        speed = 0;
    } else if (rushing?.rush) {
        advance = Math.min(rushing.d, rushing.rush.speed * dt);
        speed = rushing.rush.speed;
    } else {
        const tau = r.down > 0 ? SLALOM.slideTau : SLALOM.speedTau;
        speed += (targetSpeed({ ...r, down, up }) - speed) * (1 - Math.exp(-dt / tau));
        // Getting up: no slide while he stands up.
        if (up > 0) speed = 0;
        advance = speed * dt;
    }

    gates = gates.map(g => {
        let d = g.d - advance;
        let { rush, pastMs, end } = g;
        if (rush) {
            if (waiting) return g;
            rush = { ...rush, t: rush.t + ms };
            if (d <= 0) {
                d = 0;
                rush = null;
                pastMs = 0;
                news.passed = { id: g.id, end: end! };
            }
        } else if (pastMs !== null) pastMs += ms;
        else if (end === null && d <= SLALOM.arriveM) {
            // Too late: it slips past with the same shoot-through; the same sum comes on the next gate.
            end = 'miss';
            news.missed = g.id;
            rush = { t: 0, from: d, speed: Math.max(speed * 1.2, d / (SLALOM.passMs / 1000), 1) };
        }
        return { ...g, d, rush, pastMs, end };
    }).filter(g => g.pastMs === null || g.pastMs < SLALOM.fadeMs);

    if (news.missed !== null) step = Math.max(1, step - SLALOM.missSteps);
    if (news.passed) {
        if (news.passed.end === 'wrong') { down = SLALOM.tumbleMs; up = 0; speed = Math.min(speed, speedOf(STEPS, r.pace)); }
        else speed = speedOf(step, r.pace) * SLALOM.exitBoost;
    }

    return { run: { ...r, metres: r.metres + advance, step, speed, gates, down, up }, news };
}

export type SkierPose = 'ski' | 'roll' | 'sit' | 'up';

/** How the skier stands: on his skis, rolling through the tumble, sitting in the snow, hopping back up. */
export function poseOf(r: SlRun): SkierPose {
    if (r.down > 0) return SLALOM.tumbleMs - r.down < SLALOM.rollMs ? 'roll' : 'sit';
    return r.up > 0 ? 'up' : 'ski';
}

/** A jump after this many right answers in a row (3, 6, 9 …). */
export const isJump = (streak: number) => streak > 0 && streak % SLALOM.jumpEvery === 0;

// ── The view: where things down the slope stand on screen ────────────────────

export const VIEW = {
    // The slope's crest (the horizon) and the skier's feet, as shares of the scene's height.
    horizon: 0.36,
    ground: 0.93,
    // The camera stands this far behind the skier (m): a long lens, so a far gate is still readable.
    camM: 16,
    // One metre beside the skier in px = this share of the design width (min(width, 1.6 × height)). SYNC: slalom.css --sl-u.
    unit: 0.135,
    // Lanes are this far apart (m); the piste's edge is this far from its middle.
    laneM: 2.6,
    pisteM: 7.4,
} as const;

export interface Box { w: number; h: number }

/** The px of one metre beside the skier (at his depth). */
export const unitOf = (b: Box) => Math.min(b.w, 1.6 * b.h) * VIEW.unit;

/** The scale of something d metres down the slope: 1 at the skier, smaller towards the crest. */
export const scaleAt = (d: number) => VIEW.camM / Math.max(0.5, VIEW.camM + d);

/** Where a point d metres down the slope and x metres beside the piste's middle stands on screen (px), and its scale. */
export function project(b: Box, d: number, x: number): { x: number; y: number; s: number } {
    const s = scaleAt(d);
    const top = b.h * VIEW.horizon;
    return { x: b.w / 2 + x * unitOf(b) * s, y: top + (b.h * VIEW.ground - top) * s, s };
}

/** Lane i's middle beside the piste's middle (m): 0, 1, 2 of three, round the middle. */
export const laneX = (i: number, lanes = 3) => (i - (lanes - 1) / 2) * VIEW.laneM;
