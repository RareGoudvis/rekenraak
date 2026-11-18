// Brandweer: the fire level of the burning apartment block, in steps of the truck's heat gauge. Pure, so the tuning
// is testable. The level rises with play time (help pauses the clock), one step per counted mistake and one step per
// fire that jumps to the next window (each burning window has its own clock, WINDOW_CLOCK); every window sprayed out
// cools it one step and every 3 in a row cools one more (the Superstraal). At 0 the building is fully out and the next
// one is already burning (buildings counts them); at max it is too hot: the building collapses (the friendly early end).
// Makkelijk (levels/levels.ts): no window clocks (the fire never jumps) and the gauge stops one step under too hot.

import { shortClockMs } from '../../levels/clock';
import type { Level } from '../../levels/levels';

// THE tuning table. Checked with a simulated pupil over the 3 minutes (spelen.brandweer.test, think time per sum plus the
// flash): thinking 4–6 s, 80 % right fails about 1 round in 100, 70 % about 1 in 10, 60 % about 1 in 3; a slow
// 6-year-old (6–9 s) at 80 % about 1 in 20; guessing (25 %) always.
export const FIRE = {
    // The gauge's top: the building is too hot here.
    max: 10,
    // A fresh building: already burning, the gauge in its yellow zone so the first sums matter.
    start: 4,
    // One step hotter per this much play time (15 s before the window clocks; they carry the time pressure now).
    riseMs: 30_000,
    // One step per fire that jumps to a neighbouring window.
    jump: 1,
    // One step per counted mistake (met hulp never heats).
    mistake: 1,
    // One step cooler per right answer: the window it sprayed out.
    right: 1,
    // Every this many in a row: one step more (a double jet with a rainbow).
    streak: 3,
    // From here the gauge flashes, the roof smokes hard and the residents go "oh!".
    hot: 7,
    // From here smoke also rises from the roof.
    smoky: 5,
} as const;

// The collapse when too hot, in ms: the crew steps back, three floors drop, the rest comes down into the heap, the cheer,
// then the end screen. The skin holds the session clock meanwhile (onHold), so the round never ends under it.
export const COLLAPSE = { back: 1300, floors: [1900, 2350, 2800], down: 3250, cheer: 4300, end: 5800 } as const;

// The block: 3 × 3 windows, numbered left to right, top to bottom.
export const WINDOWS = 9;
export const COLS = 3;

// A pet waits in one window that never burns; every this many right answers it jumps into the rescue sheet.
export const RESCUE_EVERY = 4;
export const PETS = ['kat', 'hond', 'konijn'] as const;
export type Pet = typeof PETS[number];

export interface FireCounts { elapsedMs: number; right: number; mistakes: number; streak: number; jumps?: number }
export interface FireState extends FireCounts {
    level: number;
    // Buildings fully put out this round.
    buildings: number;
    // Superstralen so far (3 in a row): the skin plays the double jet when it grows.
    supers: number;
}

export const fireStart = (): FireState => ({ level: FIRE.start, buildings: 0, supers: 0, elapsedMs: 0, right: 0, mistakes: 0, streak: 0, jumps: 0 });

const ticksOf = (ms: number) => Math.floor(Math.max(0, ms) / FIRE.riseMs);
const hotter = (level: number, by: number) => Math.min(FIRE.max, level + by);

// The hottest the gauge gets on this level: Makkelijk never collapses.
const topOf = (level: Level) => (level === 'makkelijk' ? FIRE.max - 1 : FIRE.max);

/** The state after the session's counts moved from s to now: time first, then mistakes, then the sprayed windows. Counts going back = a new round. */
export function fireStep(s: FireState, now: FireCounts, lvl: Level = 'normaal'): FireState {
    const jumps = now.jumps ?? 0;
    const from = now.right < s.right || now.mistakes < s.mistakes || now.elapsedMs < s.elapsedMs || jumps < (s.jumps ?? 0) ? fireStart() : s;
    if (tooHot(from.level)) return { ...from, ...now, jumps };
    let level = hotter(from.level, ticksOf(now.elapsedMs) - ticksOf(from.elapsedMs));
    level = hotter(level, FIRE.mistake * Math.max(0, now.mistakes - from.mistakes));
    level = Math.min(topOf(lvl), hotter(level, FIRE.jump * Math.max(0, jumps - (from.jumps ?? 0))));
    let { buildings, supers } = from;
    const gained = Math.max(0, now.right - from.right);
    for (let k = 0; k < gained && !tooHot(level); k++) {
        // The streak this right answer reached (several at once only in a test).
        const streak = now.streak - (gained - 1 - k);
        const bonus = streak > 0 && streak % FIRE.streak === 0;
        if (bonus) supers++;
        level -= FIRE.right + (bonus ? 1 : 0);
        if (level <= 0) { buildings++; level = FIRE.start; }
    }
    return { level, buildings, supers, ...now, jumps };
}

/** The round's level from cold, for a list of moments (tests and the tuning simulation). */
export const fireOf = (steps: readonly FireCounts[], lvl: Level = 'normaal') => steps.reduce<FireState>((s, n) => fireStep(s, n, lvl), fireStart());

export const tooHot = (level: number) => level >= FIRE.max;

export type FireMood = 'calm' | 'warm' | 'hot';
export const fireMood = (level: number): FireMood => (level >= FIRE.hot ? 'hot' : level >= FIRE.smoky ? 'warm' : 'calm');

/** How big the flames are drawn at this level: 0.75 at a cold gauge, 1 at too hot; a window's clock grows them by up to a fifth more. */
export const flameScale = (level: number) => 0.75 + 0.025 * Math.min(FIRE.max, Math.max(0, level));

// A small seeded hash (FNV-1a), so the same sum always lights the same windows.
function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** The window the n-th pet waits in: never the previous pet's window, so a rescue always shows a new spot. */
export function petWindow(n: number): number {
    const at = (k: number) => hash(`pet-${k}`) % WINDOWS;
    if (n <= 0) return at(0);
    const prev = petWindow(n - 1);
    const w = at(n);
    return w === prev ? (w + 1 + (n % (WINDOWS - 1))) % WINDOWS : w;
}

export const petOf = (n: number): Pet => PETS[n % PETS.length];

/** Pets rescued after this many right answers. */
export const rescuedOf = (right: number) => Math.floor(Math.max(0, right) / RESCUE_EVERY);

/** The burning windows of a sum, one per option in order: n different windows, never the pet's. */
export function windowsOf(key: string, n: number, pet: number): number[] {
    const free = Array.from({ length: WINDOWS }, (_, i) => i).filter(i => i !== pet);
    const rng = seeded(hash(key));
    for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
    }
    return free.slice(0, Math.min(n, free.length));
}

export type Decor = 'dark' | 'plant' | 'lamp' | 'curtain';
const DECOR: readonly Decor[] = ['plant', 'dark', 'curtain', 'lamp', 'dark', 'plant', 'curtain', 'dark', 'lamp'];
/** What a window that does not burn shows, per building (a plant, a lamp, curtains, or just dark). */
export const decorOf = (window: number, building: number): Decor => DECOR[(window + building * 4) % DECOR.length];

// ── The window clocks ───────────────────────────────────────────────────────
// Each burning window has its own clock, running only while the sum waits (flashes and help freeze it). When it runs
// out the fire jumps to a free neighbour (left, right or up; never the pet's window) and the level goes up FIRE.jump;
// the window's clock then starts again. A jumped fire is extra danger, never an extra choice: it has no answer and
// burns until the sum is answered. The four clocks are staggered, so at most one window runs out at a time. The first
// window's clock is the shared clock (levels/clock.ts: 12 s the first minute, then shorter per level); Makkelijk has none.
export const WINDOW_CLOCK = {
    // Each next window's clock is this much longer.
    stepMs: 3_000,
} as const;

/** The clocks (ms) of a sum's burning windows, one per option in order; their order is seeded per sum. None on Makkelijk. */
export function windowClocks(key: string, n: number, elapsedMs: number, lvl: Level = 'normaal'): number[] {
    const first = shortClockMs(lvl, elapsedMs);
    if (first === null) return [];
    const rank = Array.from({ length: n }, (_, i) => i);
    const rng = seeded(hash(`clock-${key}`));
    for (let i = rank.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [rank[i], rank[j]] = [rank[j], rank[i]];
    }
    return rank.map(r => first + r * WINDOW_CLOCK.stepMs);
}

/** Which windows' clocks ran out by sumMs of waiting, in time order (option indices; a window runs out again each clock). */
export function jumpEvents(sumMs: number, clocks: readonly number[]): number[] {
    const events: { at: number; i: number }[] = [];
    clocks.forEach((d, i) => { for (let at = d; at <= sumMs; at += d) events.push({ at, i }); });
    return events.sort((a, b) => a.at - b.at || a.i - b.i).map(e => e.i);
}

/** A free neighbour of a window for the fire to jump to (up first, then left, then right); null = none free. */
export function jumpTarget(from: number, taken: ReadonlySet<number>): number | null {
    const col = from % COLS;
    const tries = [from - COLS, col > 0 ? from - 1 : -1, col < COLS - 1 ? from + 1 : -1];
    return tries.find(w => w >= 0 && w < WINDOWS && !taken.has(w)) ?? null;
}

/** The first n events (the smallest clock alone gives n of them by n of its rounds). */
export const firstEvents = (n: number, clocks: readonly number[]) =>
    (n <= 0 || !clocks.length ? [] : jumpEvents(n * Math.min(...clocks), clocks).slice(0, n));

export interface Jump { from: number; to: number | null }

/** The jumps of a sum so far: each event's window and where its fire went (burning windows, earlier jumps and the pet are taken). */
export function jumpsOf(events: readonly number[], burning: readonly number[], pet: number): Jump[] {
    const taken = new Set([...burning, pet]);
    return events.map(i => {
        const from = burning[i];
        const to = jumpTarget(from, taken);
        if (to !== null) taken.add(to);
        return { from, to };
    });
}
