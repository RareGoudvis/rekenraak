import { mulberry32 } from '../../distractors';

// Aquarium: the tank's pure logic. Each right answer adds the next item of a seeded order; two counted mistakes in a
// row let the cat scoop the newest fish out (the skin then takes one off the climb, onSetback), and the next right
// answer drops a fresh one in its place. The swim paths are pure functions of game time, so the scene only draws.

// ── Tuning (the owner tunes these after playing) ──
// One round in this many ends on a rare white goldfish instead of the usual last item.
export const JACKPOT_CHANCE = 0.1;
// Counted mistakes in a row before the cat catches a fish; a single mistake is only the paw at the surface.
export const CATCH_AFTER = 2;
// The items in a round: the session's goal (registry: round.goal).
export const TANK_GOAL = 20;

// ── The scene, in SVG viewBox units ──
export const VIEW_W = 400;
export const VIEW_H = 300;
// The glass inside, the water surface and the sand line.
export const GLASS = { x0: 44, x1: 292, top: 96, bottom: 214 } as const;
export const WATER_TOP = 108;
export const SAND_Y = 200;
// The cabinet's top and the floor.
export const CABINET_Y = 222;
export const FLOOR_Y = 272;
// Where the cat's paw dips into the water (over the right rim) and its nose at the glass.
export const PAW_AT = { x: 278, y: WATER_TOP + 4 } as const;
export const NOSE_AT = { x: 288, y: 132 } as const;

export type ItemKind =
    | 'goudvis' | 'neons' | 'guppy' | 'clownvis' | 'maanvis' | 'kogelvis' | 'doktersvis' | 'meerval' | 'zeepaardje' | 'krab' | 'slak'
    | 'plantHoog' | 'plantBos' | 'plantRood'
    | 'schelp' | 'kasteel' | 'schatkist' | 'duiker' | 'steenboog' | 'zeester'
    | 'witteGoudvis';

// What an item is: a fish swims (its own path), a crawler walks the sand, a plant sways, the rest sits on the sand.
export type ItemClass = 'fish' | 'crawler' | 'plant' | 'decor';
export const CLASS_OF: Readonly<Record<ItemKind, ItemClass>> = {
    goudvis: 'fish', neons: 'fish', guppy: 'fish', clownvis: 'fish', maanvis: 'fish', kogelvis: 'fish', doktersvis: 'fish',
    meerval: 'fish', zeepaardje: 'fish', witteGoudvis: 'fish', krab: 'crawler', slak: 'crawler',
    plantHoog: 'plant', plantBos: 'plant', plantRood: 'plant',
    schelp: 'decor', kasteel: 'decor', schatkist: 'decor', duiker: 'decor', steenboog: 'decor', zeester: 'decor',
};

// The fish a paw can scoop: single swimmers that come up (not the school, the bottom catfish or the seahorse), never the white goldfish.
export const CATCHABLE: ReadonlySet<ItemKind> = new Set(['goudvis', 'guppy', 'clownvis', 'maanvis', 'kogelvis', 'doktersvis']);

// The first item is always a goldfish, so the tank has life after one answer.
const FIRST: ItemKind = 'goudvis';
const MOVERS: readonly ItemKind[] = ['neons', 'guppy', 'clownvis', 'maanvis', 'kogelvis', 'doktersvis', 'meerval', 'zeepaardje', 'krab', 'slak'];
const PLANTS: readonly ItemKind[] = ['plantHoog', 'plantBos', 'plantRood'];
const DECOR: readonly ItemKind[] = ['schelp', 'kasteel', 'schatkist', 'duiker', 'steenboog', 'zeester'];
// The mix after the first goldfish (M mover, D decor, P plant): something swimming every other answer, never three things that sit still in a row.
const PATTERN = 'DMPMDMDMPMDMDMPMDMM';

function shuffled<T>(xs: readonly T[], rnd: () => number): T[] {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** The round's items in the order they go in (TANK_GOAL long); a jackpot round ends on the white goldfish. */
export function orderFor(seed: number, jackpot: boolean): ItemKind[] {
    const rnd = mulberry32(seed);
    const pools: Record<string, ItemKind[]> = { M: shuffled(MOVERS, rnd), D: shuffled(DECOR, rnd), P: shuffled(PLANTS, rnd) };
    const rest = [...PATTERN].map(c => pools[c].shift()!);
    const order = [FIRST, ...rest];
    if (jackpot) order[order.length - 1] = 'witteGoudvis';
    return order;
}

/** Whether this round is a jackpot round (rnd = a 0..1 draw). */
export const isJackpot = (rnd: number) => rnd < JACKPOT_CHANCE;

// ── Where things sit ──
// Plants and decor have a designed spot each (x on the sand); front ones are drawn over the fish, so a fish can hide behind them.
export interface Spot { x: number; front: boolean }
export const SPOT_OF: Partial<Readonly<Record<ItemKind, Spot>>> = {
    plantHoog: { x: 72, front: true },
    plantBos: { x: 256, front: false },
    plantRood: { x: 166, front: false },
    schelp: { x: 104, front: true },
    kasteel: { x: 206, front: false },
    schatkist: { x: 128, front: true },
    duiker: { x: 236, front: true },
    steenboog: { x: 140, front: false },
    zeester: { x: 274, front: true },
};
// The base tank's own front bush (there from the start): a hiding place before any plant was added.
export const BASE_FRONT_BUSH = 266;

/** Hiding places (x) for a scared fish: behind the front plants in the tank. */
export function hideSpots(kinds: readonly ItemKind[]): number[] {
    const xs = kinds.filter(k => k === 'plantHoog').map(k => SPOT_OF[k]!.x);
    return [...xs, BASE_FRONT_BUSH];
}

// ── Swimming ──
export interface SwimPath {
    cx: number; cy: number;
    // Half the swim range, and the speed (rad/s) of the sweep and the bob.
    ax: number; ay: number; wx: number; wy: number;
    p: number; q: number;
    // Body length, so the path keeps the whole fish inside the glass.
    size: number;
}

// The swimmers are drawn this much bigger than their art (art.tsx), so a fish reads well beside the big cat.
export const FISH_SCALE = 1.4;

// Each swimmer's zone: centre, half range, speed, drawn length. Slow ones (angelfish, puffer, catfish) sweep slowly.
const ZONE: Partial<Readonly<Record<ItemKind, Omit<SwimPath, 'p' | 'q'>>>> = {
    goudvis: { cx: 168, cy: 142, ax: 84, ay: 18, wx: 0.32, wy: 0.7, size: 32 },
    neons: { cx: 166, cy: 128, ax: 80, ay: 9, wx: 0.4, wy: 0.9, size: 16 },
    guppy: { cx: 124, cy: 126, ax: 46, ay: 10, wx: 0.55, wy: 1.1, size: 22 },
    clownvis: { cx: 206, cy: 160, ax: 54, ay: 12, wx: 0.45, wy: 0.8, size: 26 },
    maanvis: { cx: 150, cy: 150, ax: 62, ay: 8, wx: 0.22, wy: 0.5, size: 28 },
    kogelvis: { cx: 190, cy: 138, ax: 60, ay: 12, wx: 0.2, wy: 0.45, size: 30 },
    doktersvis: { cx: 172, cy: 170, ax: 86, ay: 9, wx: 0.36, wy: 0.75, size: 30 },
    meerval: { cx: 168, cy: 192, ax: 96, ay: 1.5, wx: 0.12, wy: 0.4, size: 36 },
    zeepaardje: { cx: 248, cy: 150, ax: 6, ay: 14, wx: 0.3, wy: 0.6, size: 22 },
    witteGoudvis: { cx: 168, cy: 134, ax: 80, ay: 16, wx: 0.3, wy: 0.65, size: 34 },
    krab: { cx: 128, cy: 193, ax: 44, ay: 0, wx: 0.5, wy: 0, size: 22 },
    slak: { cx: 168, cy: 203, ax: 104, ay: 0, wx: 0.05, wy: 0, size: 20 },
};

/** A swimmer's seeded path (phase per item, so two rounds never swim alike). */
export function pathFor(kind: ItemKind, seed: number): SwimPath | null {
    const z = ZONE[kind];
    if (!z) return null;
    const rnd = mulberry32(seed * 31 + kind.length * 977 + kind.charCodeAt(0));
    return { ...z, p: rnd() * Math.PI * 2, q: rnd() * Math.PI * 2 };
}

export interface SwimPos { x: number; y: number; vx: number; vy: number }

/** Where a swimmer is at t seconds: a sweep with a slower second wave (never quite periodic), clamped inside the glass. */
export function swimAt(path: SwimPath, t: number): SwimPos {
    const pos = (s: number) => {
        const x = path.cx + path.ax * (0.78 * Math.sin(path.wx * s + path.p) + 0.22 * Math.sin(path.wx * 2.37 * s + path.q));
        const y = path.cy + path.ay * Math.sin(path.wy * s + path.q) * (0.7 + 0.3 * Math.sin(0.13 * s + path.p));
        const half = path.size / 2 + 2;
        return { x: Math.min(GLASS.x1 - half, Math.max(GLASS.x0 + half, x)), y: Math.min(SAND_Y + 8, Math.max(WATER_TOP + 6, y)) };
    };
    const a = pos(t);
    const b = pos(t + 0.05);
    return { x: a.x, y: a.y, vx: (b.x - a.x) / 0.05, vy: (b.y - a.y) / 0.05 };
}

/** Where a new swimmer splashes in at the surface (then it swims down onto its path). */
export const entryX = (path: SwimPath) => Math.round(path.cx + path.ax * 0.6 * Math.sin(path.p));

/** Which way a fish faces from its speed: 1 right, −1 left, through 0 as it turns (the 2-D turn). */
export const facing = (vx: number) => Math.tanh(vx / 6);

// The neon school: each follows the leader's path a little later, at its own offset.
export const SCHOOL = [
    { lag: 0, dx: 0, dy: 0 }, { lag: 0.35, dx: -6, dy: -7 }, { lag: 0.55, dx: -4, dy: 8 }, { lag: 0.8, dx: -14, dy: 1 }, { lag: 1.05, dx: -18, dy: -8 },
] as const;

// A crawler pauses now and then: the crab scuttles in bursts, the snail creeps.
export function crawlAt(path: SwimPath, t: number): SwimPos {
    // Stop-and-go: game time runs at full speed half of each 3 s, slowly the other half.
    const burst = Math.floor(t / 3) * 3 * 0.6 + Math.min(t % 3, 1.5) + Math.max(0, (t % 3) - 1.5) * 0.2;
    return swimAt(path, burst);
}

// ── Moments ──
// A fish that hides from the paw: out fast, a hold behind the plant, then back to its path (ms).
export const HIDE_MS = { out: 450, hold: 1700, back: 900 } as const;
// A right answer: a fish swims to the glass at the cat's nose, taps it, the cat jumps back (ms after the answer).
export const TAP_MS = { go: 250, tap: 1000, back: 1900 } as const;
// The catch: the fish is drawn up to the paw, scooped, the cat hops off with it and comes back licking its lips.
export const CATCH_MS = { up: 650, scoop: 700, away: 1500, nom: 2100, back: 3900, done: 5200 } as const;

/** 0 → 1 → 0 over a hide (how far towards its hiding place), at ms since it started. */
export function hideBlend(ms: number): number {
    if (ms <= 0) return 0;
    const ease = (u: number) => u * u * (3 - 2 * u);
    if (ms < HIDE_MS.out) return ease(ms / HIDE_MS.out);
    if (ms < HIDE_MS.out + HIDE_MS.hold) return 1;
    const back = ms - HIDE_MS.out - HIDE_MS.hold;
    return back < HIDE_MS.back ? 1 - ease(back / HIDE_MS.back) : 0;
}

/** 0 → 1 → 0 for the glass tap: to the glass by TAP_MS.tap, back on its path by TAP_MS.back. */
export function tapBlend(ms: number): number {
    const ease = (u: number) => u * u * (3 - 2 * u);
    if (ms <= TAP_MS.go || ms >= TAP_MS.back) return 0;
    if (ms < TAP_MS.tap) return ease((ms - TAP_MS.go) / (TAP_MS.tap - TAP_MS.go));
    return 1 - ease((ms - TAP_MS.tap) / (TAP_MS.back - TAP_MS.tap));
}

// A new swimmer comes in from the splash at the surface and joins its path (ms).
export const ENTER_MS = 1300;

// ── The cat's gaze ──
// Between the cat's eyes in the room's units (art.tsx CatArt at its seat, scale 1.25). It watches the fish of the
// moment (a tap, a hide, the catch), else the fish nearest to it; its pupils and head follow (owner 2026-11-18).
export const CAT_EYE = { x: 304, y: 145 } as const;

/** The point nearest to `at` (the cat's eyes), or null when there is none. */
export function nearestTo<T extends { x: number; y: number }>(points: readonly T[], at: { x: number; y: number } = CAT_EYE): T | null {
    let best: T | null = null;
    let d = Infinity;
    for (const p of points) {
        const e = Math.hypot(p.x - at.x, p.y - at.y);
        if (e < d) { d = e; best = p; }
    }
    return best;
}

/** Where the cat looks for a point: its pupils' offset (the cat's units) and its head's turn (deg); null = straight ahead. */
export function catGaze(look: { x: number; y: number } | null): { dx: number; dy: number; deg: number } {
    if (!look) return { dx: -1, dy: 0, deg: 0 };
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    return {
        dx: clamp((look.x - CAT_EYE.x) / 30, -2.4, 1.2),
        dy: clamp((look.y - CAT_EYE.y) / 24, -1.8, 1.8),
        deg: clamp((look.y - CAT_EYE.y) / 5, -8, 10),
    };
}

// ── The tank's state through a round ──
export interface Caught {
    // The order position whose fish the cat took.
    pos: number;
    kind: ItemKind;
    // Which catch of the round (0, 1, ...).
    n: number;
}

export interface TankState {
    // The session's counters this state has seen (progress.right, progress.mistakes).
    right: number;
    mistakes: number;
    // Counted mistakes since the last right answer or the last catch.
    run: number;
    // Order positions that went in so far (0..filled-1), the gaps included.
    filled: number;
    // Positions whose fish the cat took, waiting for a right answer to drop a fresh one in.
    gaps: number[];
    // Every catch this round, in order.
    caught: Caught[];
    // Positions the last step put in (new or refilled): they splash in.
    added: number[];
}

export const startTank = (count = 0, right = 0, mistakes = 0): TankState =>
    ({ right, mistakes, run: 0, filled: Math.max(0, Math.min(TANK_GOAL, count)), gaps: [], caught: [], added: [] });

/** The positions in the tank now (filled, minus the gaps). */
export const shownOf = (s: TankState) => Array.from({ length: s.filled }, (_, i) => i).filter(i => !s.gaps.includes(i));

/** The fish the cat scoops: the newest catchable fish in the tank, or null (nothing to catch). */
export function victimOf(order: readonly ItemKind[], s: TankState): number | null {
    for (let i = s.filled - 1; i >= 0; i--) if (!s.gaps.includes(i) && CATCHABLE.has(order[i])) return i;
    return null;
}

/**
 * The next state after the session's counters moved; the same object when nothing changed. count = the session's climb
 * (after any setback the skin asked for). A right answer fills the oldest gap first, then the next new item.
 */
export function stepTank(s: TankState, order: readonly ItemKind[], now: { count: number; right: number; mistakes: number }): TankState {
    // The counters went back: a new round on the same screen.
    if (now.right < s.right || now.mistakes < s.mistakes) return startTank(now.count, now.right, now.mistakes);
    if (now.right > s.right) {
        const gaps = [...s.gaps];
        const added: number[] = [];
        let filled = s.filled;
        let need = Math.min(TANK_GOAL, now.count) - (filled - gaps.length);
        while (need > 0) {
            if (gaps.length) added.push(gaps.shift()!);
            else if (filled < order.length) added.push(filled++);
            else break;
            need--;
        }
        return { ...s, right: now.right, mistakes: now.mistakes, run: 0, filled, gaps, added };
    }
    if (now.mistakes > s.mistakes) {
        const run = s.run + (now.mistakes - s.mistakes);
        const base = { ...s, right: now.right, mistakes: now.mistakes, added: [] };
        if (run < CATCH_AFTER) return { ...base, run };
        const pos = victimOf(order, s);
        // No fish to catch: the cat only gets a wet paw, and the next two mistakes are a new run.
        if (pos === null) return { ...base, run: 0 };
        return { ...base, run: 0, gaps: [...s.gaps, pos], caught: [...s.caught, { pos, kind: order[pos], n: s.caught.length }] };
    }
    return s;
}
