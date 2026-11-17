// Brandweer: the fire level of the burning apartment block, in steps of the truck's heat gauge. Pure, so the tuning
// is testable. The level rises with play time (help pauses the clock) and one step per counted mistake; every window
// sprayed out cools it one step and every 3 in a row cools one more (the Superstraal). At 0 the building is fully out
// and the next one is already burning (buildings counts them); at max it is too hot: the friendly early end.

// THE tuning table. Checked with a simulated pupil over the 3 minutes (spelen.brandweer.test): at one answer every
// 6–8 s, 80 % right holds about 9 rounds in 10, 60 % right burns down in about 2 of 3, guessing (25 %) always.
export const FIRE = {
    // The gauge's top: the building is too hot here.
    max: 10,
    // A fresh building: already burning, the gauge in its yellow zone so the first sums matter.
    start: 4,
    // One step hotter per this much play time (the owner's first idea: 15 s).
    riseMs: 15_000,
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

// The block: 3 × 3 windows, numbered left to right, top to bottom.
export const WINDOWS = 9;
export const COLS = 3;

// A pet waits in one window that never burns; every this many right answers it jumps into the rescue sheet.
export const RESCUE_EVERY = 4;
export const PETS = ['kat', 'hond', 'konijn'] as const;
export type Pet = typeof PETS[number];

export interface FireCounts { elapsedMs: number; right: number; mistakes: number; streak: number }
export interface FireState extends FireCounts {
    level: number;
    // Buildings fully put out this round.
    buildings: number;
    // Superstralen so far (3 in a row): the skin plays the double jet when it grows.
    supers: number;
}

export const fireStart = (): FireState => ({ level: FIRE.start, buildings: 0, supers: 0, elapsedMs: 0, right: 0, mistakes: 0, streak: 0 });

const ticksOf = (ms: number) => Math.floor(Math.max(0, ms) / FIRE.riseMs);
const hotter = (level: number, by: number) => Math.min(FIRE.max, level + by);

/** The state after the session's counts moved from s to now: time first, then mistakes, then the sprayed windows. Counts going back = a new round. */
export function fireStep(s: FireState, now: FireCounts): FireState {
    const from = now.right < s.right || now.mistakes < s.mistakes || now.elapsedMs < s.elapsedMs ? fireStart() : s;
    if (tooHot(from.level)) return { ...from, ...now };
    let level = hotter(from.level, ticksOf(now.elapsedMs) - ticksOf(from.elapsedMs));
    level = hotter(level, FIRE.mistake * Math.max(0, now.mistakes - from.mistakes));
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
    return { level, buildings, supers, ...now };
}

/** The round's level from cold, for a list of moments (tests and the tuning simulation). */
export const fireOf = (steps: readonly FireCounts[]) => steps.reduce(fireStep, fireStart());

export const tooHot = (level: number) => level >= FIRE.max;

export type FireMood = 'calm' | 'warm' | 'hot';
export const fireMood = (level: number): FireMood => (level >= FIRE.hot ? 'hot' : level >= FIRE.smoky ? 'warm' : 'calm');

/** How big the flames are drawn at this level: 0.8 at a cold gauge, 1.1 at too hot (they never reach the window above). */
export const flameScale = (level: number) => 0.8 + 0.03 * Math.min(FIRE.max, Math.max(0, level));

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
