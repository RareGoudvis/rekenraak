import type { Side } from '../../duel/types';

// Kikkers en vliegjes: the bugs over the pond, pure. Each bug hovers on its own wobbly path (a function of
// time, so the picture and the tongue agree on where it is), flies in from the sky and out again. The pond
// keeps a few in the air, now and then a golden dragonfly. A right answer takes the nearest bug in reach.
// Scene units: the pond picture is 1000 × 300 (art.tsx), y down.

export type BugKind = 'fly' | 'beetle' | 'dragonfly';
export const BUG_POINTS: Record<BugKind, number> = { fly: 1, beetle: 2, dragonfly: 5 };

export interface Pt { x: number; y: number }

// The frogs sit here (feet on the pad); the right one is the left one mirrored (art.tsx). Mouth = +66, -80.
export const FROG_AT: Record<Side, Pt> = { left: { x: 150, y: 262 }, right: { x: 850, y: 262 } };
// Drawing scale per bug (art.tsx BugArt is drawn small).
export const BUG_SCALE: Record<BugKind, number> = { fly: 1.45, beetle: 1.35, dragonfly: 1.55 };

export const POND = {
    // Where the bugs hover: between the two frogs, above the water.
    field: { x0: 300, x1: 700, y0: 52, y1: 196 },
    // The frogs' mouths (the tongue's root), from art.tsx FROG_AT + the mouth in the frog drawing.
    mouths: { left: { x: 216, y: 182 }, right: { x: 784, y: 182 } } as Record<Side, Pt>,
    // Bugs in the air besides a dragonfly.
    count: 5,
    respawnMs: [500, 1300] as const,
    stayMs: { fly: [9000, 16000], beetle: [8000, 13000], dragonfly: [7000, 8000] } as Record<BugKind, readonly [number, number]>,
    enterMs: 1100,
    leaveMs: 1000,
    beetleChance: 0.3,
    // The first golden dragonfly this long after the round starts, then one every so often (never two at once).
    dragonFirstMs: [12_000, 20_000] as const,
    dragonEveryMs: [22_000, 32_000] as const,
    // "Near": the frog takes the nearest bug within this; nothing near = the best bug in reach.
    nearPx: 250,
    reachPx: 760,
    // The tongue reaches its bug this long after the answer: it aims where the bug will be then.
    tongueMs: 110,
} as const;

export interface Bug {
    id: number;
    kind: BugKind;
    born: number;
    // It starts flying off at leaveAt and is gone leaveMs later.
    leaveAt: number;
    // The hover: a centre, a wobble (amplitudes, speeds in rad/s, phases).
    cx: number; cy: number; ax: number; ay: number; w1: number; w2: number; p1: number; p2: number;
    from: Pt;
    to: Pt;
}

export interface Pond { bugs: Bug[]; nextId: number; spawnAt: number; dragonAt: number }

const between = (rng: () => number, [a, b]: readonly [number, number]) => a + (b - a) * rng();
const smooth = (k: number) => k * k * (3 - 2 * k);
const lerp = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
export const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** A new bug of this kind, born at `born`: a hover inside the field, an entry and an exit in the sky. */
export function makeBug(id: number, kind: BugKind, born: number, rng: () => number): Bug {
    const { x0, x1, y0, y1 } = POND.field;
    // The dragonfly sweeps the whole pond (so it comes near each frog in turn); the others keep to a patch.
    const dragon = kind === 'dragonfly';
    const ax = dragon ? 190 + 30 * rng() : 30 + 50 * rng();
    const ay = dragon ? 46 : 14 + 22 * rng();
    const cx = dragon ? 500 : x0 + ax + (x1 - x0 - 2 * ax) * rng();
    const cy = dragon ? 112 + 20 * rng() : y0 + ay + 8 + (y1 - y0 - 2 * ay - 16) * rng();
    const side = rng() < 0.5 ? -1 : 1;
    return {
        id, kind, born, leaveAt: born + between(rng, POND.stayMs[kind]),
        cx, cy, ax, ay,
        w1: (dragon ? 0.9 : 0.8 + 0.9 * rng()) * (rng() < 0.5 ? -1 : 1), w2: dragon ? 2.1 : 1.3 + 1.6 * rng(),
        p1: rng() * Math.PI * 2, p2: rng() * Math.PI * 2,
        // The dragonfly zooms in low across the pond from one side (both frogs see it come), the others drop in from the sky.
        from: dragon ? { x: 500 + side * 640, y: 70 } : { x: cx + side * (60 + 140 * rng()), y: -50 },
        to: dragon ? { x: 500 - side * 640, y: 40 } : { x: cx - side * (80 + 200 * rng()), y: -60 },
    };
}

/** Where the bug hovers at t (no entry or exit). */
function hover(b: Bug, t: number): Pt {
    const s = (t - b.born) / 1000;
    // A main swing, a quicker harmonic on x and a small buzz on y: a believable wobbly flight.
    return {
        x: b.cx + b.ax * Math.sin(b.w1 * s + b.p1) + 0.22 * b.ax * Math.sin(3.3 * b.w1 * s + b.p2),
        y: b.cy + b.ay * Math.sin(b.w2 * s + b.p2) + 5 * Math.sin(11 * s + b.p1),
    };
}

/** The bug's place at t (flying in, hovering or flying off); null before it is born or after it left. */
export function bugAt(b: Bug, t: number): Pt | null {
    if (t < b.born || t >= b.leaveAt + POND.leaveMs) return null;
    const h = hover(b, t);
    if (t < b.born + POND.enterMs) return lerp(b.from, h, smooth((t - b.born) / POND.enterMs));
    if (t > b.leaveAt) return lerp(h, b.to, smooth((t - b.leaveAt) / POND.leaveMs));
    return h;
}

/** A tongue can take it: in the air over the pond (on every screen), not already far up and away. */
function catchable(b: Bug, t: number): Pt | null {
    const at = bugAt(b, t);
    return at && at.y > 14 && at.x > 0 && at.x < 1000 && t < b.leaveAt + POND.leaveMs / 2 ? at : null;
}

/** The bug a frog snaps at t: the nearest one near it, else the best (most points, then nearest) in reach; null = none. */
export function pickTarget(bugs: readonly Bug[], mouth: Pt, t: number): Bug | null {
    const inReach = bugs
        .map(b => { const at = catchable(b, t); return at ? { b, d: distance(at, mouth) } : null; })
        .filter((x): x is { b: Bug; d: number } => !!x && x.d <= POND.reachPx);
    const near = inReach.filter(x => x.d <= POND.nearPx).sort((a, z) => a.d - z.d);
    if (near.length) return near[0].b;
    inReach.sort((a, z) => BUG_POINTS[z.b.kind] - BUG_POINTS[a.b.kind] || a.d - z.d);
    return inReach[0]?.b ?? null;
}

/** A round's pond at `now`: a full swarm flying in (there by the end of the "Ronde N" banner), the first dragonfly some seconds away. */
export function newPond(now: number, rng: () => number): Pond {
    let pond: Pond = { bugs: [], nextId: 1, spawnAt: now + between(rng, POND.respawnMs), dragonAt: now + between(rng, POND.dragonFirstMs) };
    for (let i = 0; i < POND.count; i++) pond = addBug(pond, kindOf(rng), now - POND.enterMs * 0.6 * rng(), rng);
    return pond;
}

const kindOf = (rng: () => number): BugKind => (rng() < POND.beetleChance ? 'beetle' : 'fly');

/** The pond with one more bug born at `born` (a game's own spawn: the dragonfly, a fly when the air is empty). */
export function addBug(p: Pond, kind: BugKind, born: number, rng: () => number): Pond {
    return { ...p, bugs: [...p.bugs, makeBug(p.nextId, kind, born, rng)], nextId: p.nextId + 1 };
}

/** The pond at `now`: bugs that flew off are gone, a new one comes in when the swarm is short, the dragonfly on its time. The same object when nothing changed. */
export function tickPond(p: Pond, now: number, rng: () => number): Pond {
    let out = p;
    const live = p.bugs.filter(b => now < b.leaveAt + POND.leaveMs);
    if (live.length !== p.bugs.length) out = { ...out, bugs: live };
    if (now >= out.dragonAt) {
        const hasDragon = out.bugs.some(b => b.kind === 'dragonfly');
        out = { ...(hasDragon ? out : addBug(out, 'dragonfly', now, rng)), dragonAt: now + between(rng, POND.dragonEveryMs) };
    }
    const staying = out.bugs.filter(b => b.kind !== 'dragonfly' && now < b.leaveAt).length;
    if (staying < POND.count && now >= out.spawnAt) out = { ...addBug(out, kindOf(rng), now, rng), spawnAt: now + between(rng, POND.respawnMs) };
    return out;
}

/** The pond without the bug a tongue took. */
export const withoutBug = (p: Pond, id: number): Pond => ({ ...p, bugs: p.bugs.filter(b => b.id !== id) });

/** A right answer's catch at `now` for this side: the target, where the tongue meets it, and the pond after. Empty air = a fly zips in to be caught. */
export function snapAt(p: Pond, side: Side, now: number, rng: () => number): { bug: Bug; at: Pt; pond: Pond } {
    const mouth = POND.mouths[side];
    const t = now + POND.tongueMs;
    let pond = p;
    let bug = pickTarget(pond.bugs, mouth, t);
    if (!bug) {
        // Born so it is already hovering when the tongue gets there.
        pond = addBug(pond, 'fly', t - POND.enterMs, rng);
        bug = pond.bugs[pond.bugs.length - 1];
    }
    return { bug, at: bugAt(bug, t)!, pond: withoutBug(pond, bug.id) };
}

export interface PondKeeper {
    // A new round's swarm.
    reset(now: number): void;
    // Spawns and departures at `now`; returns a golden dragonfly that just arrived (the frogs notice it), else null.
    tick(now: number): Bug | null;
    // A right answer for this side: takes its bug off the pond (drawn until the tongue gets there) and tells the listeners.
    snap(side: Side, now: number): { bug: Bug; at: Pt };
    // Dev and thumbnails: a golden dragonfly now (the next tick reports it).
    summon(now: number): void;
    // The screen's tongue and sounds for each snap; returns the unsubscribe.
    onSnap(fn: (s: { side: Side; bug: Bug; at: Pt }) => void): () => void;
    // The bugs to draw: those in the air and those a tongue is still reaching.
    drawn(): Bug[];
    // Where to draw a bug at `now` (a caught one stays put once the tongue has it); null = hide it.
    placeOf(b: Bug, now: number): Pt | null;
    // What a frog's eyes follow: the golden dragonfly while it is there, else the bug it would snap.
    lookAt(side: Side, now: number): Pt | null;
}

/** The pond of one screen across rounds, with the bugs on their way into a mouth. */
export function createPondKeeper(now: number, rng: () => number = Math.random): PondKeeper {
    let pond = newPond(now, rng);
    // Caught bugs stay drawn until the tongue reaches them (then the tongue's tip carries them).
    const caught = new Map<number, { bug: Bug; until: number }>();
    const listeners = new Set<(s: { side: Side; bug: Bug; at: Pt }) => void>();
    return {
        reset(t) { pond = newPond(t, rng); caught.clear(); },
        tick(t) {
            const before = pond;
            pond = tickPond(pond, t, rng);
            for (const [id, c] of caught) if (t > c.until + 200) caught.delete(id);
            return pond.bugs.find(b => b.kind === 'dragonfly' && !before.bugs.some(o => o.id === b.id)) ?? null;
        },
        snap(side, t) {
            const r = snapAt(pond, side, t, rng);
            pond = r.pond;
            caught.set(r.bug.id, { bug: r.bug, until: t + POND.tongueMs });
            listeners.forEach(fn => fn({ side, bug: r.bug, at: r.at }));
            return { bug: r.bug, at: r.at };
        },
        onSnap(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
        summon(t) { pond = { ...pond, dragonAt: t }; },
        drawn: () => [...pond.bugs, ...[...caught.values()].map(c => c.bug)],
        placeOf(b, t) {
            const c = caught.get(b.id);
            return c && t >= c.until ? null : bugAt(b, t);
        },
        lookAt(side, t) {
            const dragon = pond.bugs.find(b => b.kind === 'dragonfly');
            const d = dragon && bugAt(dragon, t);
            if (d) return d;
            const b = pickTarget(pond.bugs, POND.mouths[side], t);
            return b && bugAt(b, t);
        },
    };
}
