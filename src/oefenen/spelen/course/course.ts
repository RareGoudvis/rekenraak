import type { DuelEffect, DuelRoundView, DuelRule, DuelSideView, Side } from '../duel/types';

// The obstacle course the three duel races share (Monstertrucks, Drakenrace, Wildwaterrace; owner 2026-11-18): the
// vehicle keeps moving, the world scrolls, and every sum is the next obstacle coming at it. A right answer clears
// it (+1, a little boost); a wrong answer, or the obstacle arriving before the answer (the level's clock per sum),
// is a funny crash and a short stop: no point, the next sum brings the next obstacle. The first to clear the course
// (the levens row = how many obstacles) wins the round. Makkelijk has no clock: the vehicle slows down and waits in
// front of the obstacle. Pure: the course, the rule and the lane's motion (useCourse.ts runs it every frame).

export const COURSE = {
    // The levens row: obstacles to clear. 20 keeps a round near two minutes for a 9-year-old (spelen.bot.test).
    lengths: { choices: [10, 15, 20, 25, 30] as readonly number[], default: 20 },
    // After an answer the vehicle rushes into the obstacle in this long at most (the clear or the crash plays at contact).
    rushMs: 420,
    // A rush over a short distance (the obstacle almost there) is quicker, never under this.
    rushMinMs: 150,
    // The distance a full rush is for (scene units); shorter = a shorter rush.
    rushRef: 420,
    // The vehicle's front at contact stays this far before the obstacle's near edge (scene units).
    contactGap: 26,
    // Makkelijk: the vehicle rolls up to this far before the obstacle and waits there.
    waitGap: 150,
    // Makkelijk: how quickly it slows down toward the wait point (1/s) and its top speed (units/s) on the way.
    waitGain: 1.3,
    waitTop: 300,
    // Right after a clear: the boost (units/s), then it eases back to cruising between the sums.
    boost: 520,
    cruise: 180,
    // How quickly the speed follows its target (1/s): a heavy vehicle, not a cursor.
    accel: 3.2,
    // After a crash the vehicle stands still this long, then drives on.
    stopMs: 1050,
    // The new obstacle appears this far past the band's right edge (its own width fits in it).
    spawnPad: 60,
    // How far the vehicle's front moves across the band from the start to the finish (share of the band's width).
    travel: [0.2, 0.44] as readonly [number, number],
    // The winner rolls to a stop this far past the finish.
    goalOver: 90,
    // The finish appears this far ahead of the winner (share of the room to the band's right edge).
    goalAt: 0.55,
    // The round's win moment (the finish) before the scoreboard card.
    cardMs: 3600,
} as const;

/** The race's length: the levens pick. */
export const courseLength = (config: { lives: number }) => Math.max(1, config.lives);

/** How far along a side is, 0..1. */
export const progressOf = (points: number, length: number) => Math.max(0, Math.min(1, points / Math.max(1, length)));

/** The vehicle's front in the band (scene units) at points of length, in a band w wide. */
export const noseOf = (points: number, length: number, w: number) => Math.round(w * (COURSE.travel[0] + (COURSE.travel[1] - COURSE.travel[0]) * progressOf(points, length)));

/** The index of the obstacle a side faces now: one per sum posed this round (cleared or crashed). */
export const obstacleIndexOf = (s: Pick<DuelSideView, 'right' | 'wrong'>) => s.right + s.wrong;

/** The index of the side's sum on screen (its answer already counted while the flash shows); null = no sum. */
export const sumIndexOf = (s: Pick<DuelSideView, 'right' | 'wrong'> & { question: unknown; feedback: unknown }) =>
    (s.question ? obstacleIndexOf(s) - (s.feedback ? 1 : 0) : null);

function mulberry(seed: number) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The course's obstacle at index (both lanes race the same course; a new one every round): every kind once per
 *  block of kinds.length in a shuffled order, never the same kind twice in a row. */
export function courseKind<K>(kinds: readonly K[], round: number, index: number): K {
    const n = kinds.length;
    if (n <= 1) return kinds[0];
    const blockOf = (b: number): K[] => {
        const rng = mulberry(round * 7919 + b * 104729 + 17);
        const order = [...kinds];
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        return order;
    };
    const b = Math.floor(Math.max(0, index) / n);
    const block = blockOf(b);
    // A block that would start with the previous block's last kind starts with its second instead.
    if (b > 0 && block[0] === blockOf(b - 1)[n - 1]) [block[0], block[1]] = [block[1], block[0]];
    return block[Math.max(0, index) % n];
}

/** The first side to clear the course wins; nothing else ends a race. */
export function courseOver({ sides, config }: DuelRoundView): Side | 'draw' | null {
    const n = courseLength(config);
    const l = sides.left.points >= n, r = sides.right.points >= n;
    if (l && r) return 'draw';
    return l ? 'left' : r ? 'right' : null;
}

/** This right answer (streak counted) of a side behind (points before it) is a catch-up turbo. */
export const catchesUp = (streak: number, mine: number, theirs: number, every: number) => streak > 0 && streak % every === 0 && mine < theirs;

export interface CourseRuleSpec {
    // Extra on a right answer (Drakenrace's storm for the rival); merged into the clear.
    right?: DuelRule['right'];
    // A crash's effect instead of a plain 'crash' (Drakenrace: a storm crash knocks back 1).
    crash?: DuelRule['wrong'];
    // The catch-up: every `every`-th right in a row of a side that is behind carries it `bonus` further (tag 'turbo').
    catchUp?: { every: number; bonus: number };
    cardMs?: number;
}

/** The race's rule: a clear = +1 (tag 'clear'); a wrong answer or a time-out = a crash (tag 'crash'), no point. */
export function courseRule(spec: CourseRuleSpec = {}): DuelRule {
    const crash = spec.crash ?? (() => ({ tag: 'crash' }));
    return {
        right: ctx => {
            const extra: DuelEffect = spec.right?.(ctx) ?? {};
            const c = spec.catchUp;
            const turbo = !!c && catchesUp(ctx.streak, ctx.me.points, ctx.them.points, c.every);
            const gain = 1 + (turbo ? c!.bonus : 0);
            return { ...extra, points: { ...extra.points, [ctx.side]: (extra.points?.[ctx.side] ?? 0) + gain }, tag: extra.tag ?? (turbo ? 'turbo' : 'clear') };
        },
        wrong: crash,
        timeout: crash,
        roundOver: v => courseOver(v),
        cardMs: spec.cardMs ?? COURSE.cardMs,
    };
}

// ── The lane's motion (scene units, ms) ────────────────────────────────────────────────────────────────────────

export interface Lane {
    // How far the lane's world has scrolled (the ground moves by this), and how fast now (units/s).
    dist: number;
    speed: number;
    // The sum whose obstacle is ahead, and where that obstacle's near edge is (world units).
    key: string | null;
    at: number | null;
    // Its outcome once the answer came; the rush into it and when it began (lane time).
    outcome: 'clear' | 'crash' | null;
    rush: { from: number; to: number; ms: number; t: number } | null;
    // A crash (or a hold at a clear): ms left standing still, and the speed to go on with after it.
    stop: number;
    after: number;
    // The finish was reached.
    goal: boolean;
    // The vehicle's front in the band (eases toward its race place).
    nose: number;
}

export const freshLane = (nose: number): Lane => ({ dist: 0, speed: 0, key: null, at: null, outcome: null, rush: null, stop: 0, after: 0, goal: false, nose });

export interface LaneInput {
    // The side's sum: its key, and whether it is still open (no answer, no time-out yet); null = no sum (ready, between).
    key: string | null;
    open: boolean;
    correct: boolean;
    // Ms until the sum's clock runs out; null = no clock (Makkelijk).
    leftMs: number | null;
    // Where an obstacle appears (scene units past the vehicle's front) and the front's race place.
    spawn: number;
    nose: number;
    // The round is over: everything rolls to a stop.
    halt?: boolean;
    // How long the vehicle holds still at this contact (a loop done in place, a crash's stop); absent = clear 0, crash stopMs.
    holdMs?: { clear?: number; crash?: number };
    // The finish (world units) for the round's winner: it drives on to it and rolls to a stop just past it.
    goal?: number | null;
}

export type LaneEvent = { kind: 'spawn'; key: string; at: number } | { kind: 'contact'; key: string; outcome: 'clear' | 'crash' } | { kind: 'go' } | { kind: 'goal' };

/** How long the rush over this distance takes. */
export const rushMsOf = (d: number) => Math.round(Math.max(COURSE.rushMinMs, Math.min(COURSE.rushMs, COURSE.rushMs * Math.max(0, d) / COURSE.rushRef)));

// Ease-in: the vehicle speeds up into the obstacle (the boost of an answer).
const easeIn = (x: number) => x * x;

/** One frame of a lane (dt in ms; 0 while paused). Returns the new lane and what happened in it. */
export function stepLane(lane: Lane, input: LaneInput, dt: number): { lane: Lane; events: LaneEvent[] } {
    const events: LaneEvent[] = [];
    let l = { ...lane };
    const s = dt / 1000;
    l.nose += (input.nose - l.nose) * Math.min(1, s * 4);

    // A new sum: its obstacle appears past the band's right edge.
    if (input.key && input.key !== l.key && input.open) {
        l = { ...l, key: input.key, at: l.dist + input.spawn, outcome: null, rush: null };
        events.push({ kind: 'spawn', key: input.key, at: l.at! });
    }
    // The answer (or the time-out) came: rush into the obstacle.
    if (l.key && l.key === input.key && !input.open && l.outcome === null && l.at !== null) {
        const to = l.at - COURSE.contactGap;
        l = { ...l, outcome: input.correct ? 'clear' : 'crash', rush: { from: l.dist, to: Math.max(l.dist, to), ms: rushMsOf(to - l.dist), t: 0 } };
    }

    if (l.rush) {
        const r = { ...l.rush, t: l.rush.t + dt };
        const x = Math.min(1, r.t / r.ms);
        const d = r.from + (r.to - r.from) * easeIn(x);
        l.speed = s > 0 ? Math.max(0, (d - l.dist) / s) : l.speed;
        l.dist = d;
        if (x >= 1) {
            events.push({ kind: 'contact', key: l.key!, outcome: l.outcome! });
            l.rush = null;
            const hold = l.outcome === 'clear' ? input.holdMs?.clear ?? 0 : input.holdMs?.crash ?? COURSE.stopMs;
            l.after = l.outcome === 'clear' ? COURSE.boost : 0;
            l.speed = hold > 0 ? 0 : l.after;
            l.stop = hold;
        } else l.rush = r;
        return { lane: l, events };
    }

    if (l.stop > 0) {
        l.stop = Math.max(0, l.stop - dt);
        l.speed = 0;
        if (l.stop === 0) { events.push({ kind: 'go' }); l.speed = l.after; }
        return { lane: l, events };
    }

    const ahead = l.at !== null && l.outcome === null && l.key === input.key && input.open;
    let target: number = COURSE.cruise;
    if (typeof input.goal === 'number') {
        // On to the finish, rolling to a stop a little past it.
        target = Math.min(COURSE.boost, Math.max(0, input.goal + COURSE.goalOver - l.dist) * 2.4);
        if (!l.goal && l.dist >= input.goal - COURSE.contactGap) { l.goal = true; events.push({ kind: 'goal' }); }
    } else if (input.halt) target = 0;
    else if (ahead) {
        const room = l.at! - COURSE.contactGap - l.dist;
        target = input.leftMs === null
            ? Math.min(COURSE.waitTop, Math.max(0, room - COURSE.waitGap) * COURSE.waitGain)
            : input.leftMs > 40 ? Math.max(0, room) / (input.leftMs / 1000) : COURSE.boost;
    }
    // On the clock the speed is set to arrive on time (no lag); otherwise it eases like a heavy vehicle.
    l.speed = ahead && input.leftMs !== null ? target : l.speed + (target - l.speed) * Math.min(1, s * COURSE.accel);
    l.dist += l.speed * s;
    // Never through an obstacle that is still waiting for its answer.
    if (ahead) l.dist = Math.min(l.dist, l.at! - COURSE.contactGap);
    return { lane: l, events };
}

/** The lane is standing (near enough) still: the Makkelijk wait in front of the obstacle, or a halt. */
export const isWaiting = (lane: Lane) => lane.speed < 12 && lane.stop === 0 && !lane.rush;
