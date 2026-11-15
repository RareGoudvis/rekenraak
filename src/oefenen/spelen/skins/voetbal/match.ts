import { project, netSpot, type Spot, type XY } from './pitch';

// Voetbal's match, pure for the tests. The build-up is untimed: each right answer is a pass to the next polar
// bear, a wrong one lets a black bear nip in and the ball rolls back one bear. After PASSES passes the next sum
// is the shot, on its own clock (onMiss): right = a goal, wrong or too late = the keeper's catch. The match
// clock is the session's (round.seconds); at its half the skin holds it for the "Rust!" break. The beats below
// turn each play into a short timeline of scenes (where every bear and the ball stand), drawn by Voetbal.tsx.

export const VOETBAL = {
    // Passes before the shot (pass dots 1–4); the polar bears stand at spots 0..PASSES.
    passes: 4,
    // The shot's own countdown.
    shotMs: 10_000,
    // The half-time break: the match clock stands still meanwhile.
    rustMs: 2_000,
    // A hidden question cap, so a round always ends (the clock ends it first in practice).
    cap: 200,
    // The beats of a play (ms after the answer): the passer's kick pose, the black bear's nip before the ball
    // rolls back, the shot's flight, the save's high five and the kick-off after a goal or a save.
    kickMs: 380,
    tapMs: 650,
    flightMs: 460,
    fiveMs: 1_000,
    kickoffMs: 2_100,
} as const;

// What the last answer did, for the scene.
export type Play = 'pass' | 'tap' | 'goal' | 'save' | null;

export interface Match {
    // Passes in this attack (0..PASSES); PASSES = the striker has the ball and the sum on screen is the shot.
    passes: number;
    goals: number;
    saves: number;
    half: 1 | 2;
    last: Play;
    // Counts plays, so the same play twice in a row restarts its animation.
    n: number;
}

export const newMatch = (): Match => ({ passes: 0, goals: 0, saves: 0, half: 1, last: null, n: 0 });

/** The sum on screen is the shot (the striker has the ball). */
export const isShot = (m: Match) => m.passes >= VOETBAL.passes;

/** After a right or wrong answer (a missed shot is a wrong one). */
export function playOf(m: Match, correct: boolean): Match {
    const n = m.n + 1;
    if (isShot(m)) return correct
        ? { ...m, passes: 0, goals: m.goals + 1, last: 'goal', n }
        : { ...m, passes: 0, saves: m.saves + 1, last: 'save', n };
    return correct ? { ...m, passes: m.passes + 1, last: 'pass', n } : { ...m, passes: Math.max(0, m.passes - 1), last: 'tap', n };
}

/** The first half is over: half the match clock gone. */
export const halfTimeDue = (m: Match, msLeft: number | null, msTotal: number | null) =>
    m.half === 1 && msLeft !== null && !!msTotal && msLeft > 0 && msLeft <= msTotal / 2;

/** Shot clock: what is left after dt of play (never below 0). */
export const shotStep = (left: number, dt: number) => Math.max(0, left - Math.max(0, dt));

/** The end screen's lead: "IJsberen 4 doelpunten". */
export const goalsLine = (goals: number) => `IJsberen ${goals} ${goals === 1 ? 'doelpunt' : 'doelpunten'}`;

// ── The scene: who stands where, per beat ─────────────────────────────────────────────────────────────────

// Each team: 0 keeper, 1 far defender, 2 near defender, 3 far forward, 4 near forward ("far" = the far touchline).
export const SLOTS = 5;
type Row = readonly [number, number];
type Shape = readonly [Row, Row, Row, Row, Row];

// The polar bears per pass count (0 = kick-off: the keeper has the ball). The team moves up as the attack goes on.
const IJS_FORM: readonly Shape[] = [
    [[0.06, 0.5], [0.2, 0.28], [0.2, 0.72], [0.4, 0.3], [0.4, 0.7]],
    [[0.07, 0.5], [0.27, 0.28], [0.25, 0.7], [0.48, 0.28], [0.47, 0.73]],
    [[0.08, 0.5], [0.4, 0.33], [0.33, 0.73], [0.58, 0.25], [0.57, 0.73]],
    [[0.1, 0.5], [0.45, 0.32], [0.42, 0.74], [0.7, 0.28], [0.63, 0.68]],
    [[0.12, 0.5], [0.48, 0.32], [0.46, 0.72], [0.8, 0.42], [0.72, 0.72]],
];
// The black bears in their own mirrored shape: they drop back toward their goal and lean toward the ball.
const ZW_FORM: readonly Shape[] = [
    [[0.94, 0.5], [0.8, 0.28], [0.8, 0.72], [0.6, 0.3], [0.6, 0.7]],
    [[0.94, 0.51], [0.79, 0.32], [0.77, 0.68], [0.58, 0.44], [0.36, 0.6]],
    [[0.94, 0.48], [0.8, 0.32], [0.8, 0.66], [0.49, 0.43], [0.66, 0.56]],
    [[0.94, 0.53], [0.84, 0.34], [0.74, 0.6], [0.58, 0.4], [0.5, 0.6]],
    [[0.94, 0.47], [0.9, 0.26], [0.82, 0.73], [0.62, 0.4], [0.56, 0.6]],
];
// Who has the ball after p passes: keeper → near defender → far defender → near forward → far forward (shoots).
export const HOLDER = [0, 2, 1, 4, 3] as const;
// The black bear nearest the ball per pass count: the one who nips in on a wrong answer.
export const PRESSER = [3, 4, 3, 2, 1] as const;

// The shot goes to the far or the near half of the goal (alternating); the keeper leaps or dives.
export type Aim = 'far' | 'near';
export const aimOf = (n: number): Aim => (n % 2 ? 'far' : 'near');
const AIM_V: Record<Aim, number> = { far: 0.46, near: 0.54 };
// The keeper's dive per side: where he goes across the goal, how high he leaps (scene units), his lean in the air
// and after a goal (far: a stretch up to the far corner; near: a dive toward the near post that ends lying down).
const DIVE: Record<Aim, { v: number; lift: number; rot: number; down: number }> = {
    far: { v: 0.42, lift: 16, rot: 22, down: -8 },
    near: { v: 0.61, lift: 8, rot: 46, down: 78 },
};
const other = (a: Aim): Aim => (a === 'far' ? 'near' : 'far');

// How the ball got where it is: a lifted pass, a roll, a shot, a nudge, a drop, or the restart (it pops up at the keeper).
export type Move = 'arc' | 'roll' | 'shot' | 'nudge' | 'drop' | 'reset' | 'still';

export type Beat =
    | { kind: 'hold'; p: number; kicker: number | null; move: Move }
    | { kind: 'steal'; p: number }
    | { kind: 'shot'; aim: Aim; save: boolean }
    | { kind: 'goal'; aim: Aim }
    | { kind: 'save'; aim: Aim }
    | { kind: 'five'; aim: Aim };

export const KICKOFF: Beat = { kind: 'hold', p: 0, kicker: null, move: 'still' };

export interface Step { at: number; beat: Beat }

/** The timeline of one play: the scenes after the answer, each at its time (ms). */
export function beatsOf(before: Match, after: Match): Step[] {
    const p = Math.min(before.passes, VOETBAL.passes);
    switch (after.last) {
        case 'pass':
            return [
                { at: 0, beat: { kind: 'hold', p: after.passes, kicker: HOLDER[p], move: 'arc' } },
                { at: VOETBAL.kickMs, beat: { kind: 'hold', p: after.passes, kicker: null, move: 'arc' } },
            ];
        case 'tap':
            return [
                { at: 0, beat: { kind: 'steal', p } },
                { at: VOETBAL.tapMs, beat: { kind: 'hold', p: after.passes, kicker: null, move: 'roll' } },
            ];
        case 'goal': {
            const aim = aimOf(after.n);
            return [
                { at: 0, beat: { kind: 'shot', aim, save: false } },
                { at: VOETBAL.flightMs, beat: { kind: 'goal', aim } },
                { at: VOETBAL.kickoffMs, beat: { kind: 'hold', p: 0, kicker: null, move: 'reset' } },
            ];
        }
        case 'save': {
            const aim = aimOf(after.n);
            return [
                { at: 0, beat: { kind: 'shot', aim, save: true } },
                { at: VOETBAL.flightMs, beat: { kind: 'save', aim } },
                { at: VOETBAL.fiveMs, beat: { kind: 'five', aim } },
                { at: VOETBAL.kickoffMs, beat: { kind: 'hold', p: 0, kicker: null, move: 'reset' } },
            ];
        }
        default:
            return [];
    }
}

export type Pose = 'stand' | 'cheer' | 'keeper' | 'drink' | 'kick' | 'dive' | 'hold';

// One bear on screen: feet at x y (viewBox), lifted lift units, leaning rot degrees, drawn at scale k.
export interface Fig {
    id: string;
    team: 'ijs' | 'zwart';
    slot: number;
    x: number; y: number; k: number; lift: number; rot: number;
    pose: Pose;
    face: 1 | -1;
    gloves: boolean;
    jump: boolean;
}

export interface Scene {
    // In drawing order (back to front), the same order every beat so the bears glide instead of jumping.
    figs: Fig[];
    // The ball's spot on the grass, its height above it and its radius.
    ball: { x: number; y: number; lift: number; r: number };
    move: Move;
    // The high five's star, the "Oeps!" bubble (above the black bear who nipped in), the net puffing out.
    star: XY | null;
    bubble: XY | null;
    crowd: 'calm' | 'goal';
    bulge: boolean;
}

// The bears' size on the near touchline (the art is ~62 units tall).
export const BEAR_K = 0.8;
const BALL_R = 6;
// Bear-art points (facing right, feet at 0 0): the ball ahead of the feet, the keeper's gloves per pose, raised paws.
const FEET_U = 0.032;
const GLOVES_UP = { x: 0, y: -74 };
const GLOVES_HOLD = { x: 13, y: -27 };
const PAWS_UP = -66;

const formOf = (team: 'ijs' | 'zwart') => (team === 'ijs' ? IJS_FORM : ZW_FORM);
// The draw order: back to front by the kick-off depth (v).
const ORDER: readonly { team: 'ijs' | 'zwart'; slot: number }[] = (['ijs', 'zwart'] as const)
    .flatMap(team => [0, 1, 2, 3, 4].map(slot => ({ team, slot })))
    .sort((a, b) => formOf(a.team)[0][a.slot][1] - formOf(b.team)[0][b.slot][1]);

const spotOf = (r: Row): Spot => ({ u: r[0], v: r[1] });

function figAt(team: 'ijs' | 'zwart', slot: number, at: Spot, extra: Partial<Fig> = {}): Fig {
    const p = project(at.u, at.v);
    return {
        id: `${team}${slot}`, team, slot, x: p.x, y: p.y, k: BEAR_K * p.s, lift: 0, rot: 0,
        pose: slot === 0 ? 'keeper' : 'stand', face: team === 'ijs' ? 1 : -1, gloves: slot === 0, jump: false,
        ...extra,
    };
}

/** A point of a bear's art (facing right, feet at 0 0) in the viewBox, through its facing, lean and lift. */
export function figPoint(f: Fig, lx: number, ly: number): XY {
    const a = (f.rot * Math.PI) / 180;
    const x = lx * f.face;
    return { x: f.x + f.k * (x * Math.cos(a) - ly * Math.sin(a)), y: f.y - f.lift + f.k * (x * Math.sin(a) + ly * Math.cos(a)) };
}

const ballOn = (u: number, v: number, lift = 0) => { const p = project(u, v); return { x: p.x, y: p.y, lift: lift * p.s, r: BALL_R * p.s }; };
const ballAt = (f: Fig, lx: number, ly: number, r: number) => { const g = figPoint(f, lx, ly); return { x: g.x, y: f.y, lift: f.y - g.y, r }; };

/** The arc of the ball's flight (scene units): longer passes are lifted higher, a shot rises, a roll stays down. */
export function passArc(from: XY, to: XY, move: Move): number {
    if (move === 'shot') return 16;
    if (move !== 'arc') return 0;
    return Math.round(Math.max(6, Math.min(22, Math.hypot(to.x - from.x, to.y - from.y) * 0.12)));
}

/** Where everybody stands in a beat. */
export function sceneOf(beat: Beat): Scene {
    const p = beat.kind === 'hold' || beat.kind === 'steal' ? Math.max(0, Math.min(VOETBAL.passes, beat.p)) : VOETBAL.passes;
    const home = { ijs: IJS_FORM[p].map(spotOf), zwart: ZW_FORM[p].map(spotOf) };
    const at: Record<string, Spot> = {};
    const over: Record<string, Partial<Fig>> = {};
    const holder = home.ijs[HOLDER[p]];
    let ball = ballOn(holder.u + FEET_U, holder.v + 0.025);
    let move: Move = 'still';
    let star: XY | null = null;
    let bubble: XY | null = null;
    let crowd: Scene['crowd'] = 'calm';
    let bulge = false;
    const make = (team: 'ijs' | 'zwart', slot: number) => figAt(team, slot, at[`${team}${slot}`] ?? home[team][slot], over[`${team}${slot}`]);

    if (beat.kind === 'hold') {
        move = beat.move;
        if (beat.kicker !== null && beat.kicker !== HOLDER[p]) over[`ijs${beat.kicker}`] = { pose: 'kick' };
    } else if (beat.kind === 'steal') {
        // The black bear steps in front of the ball and toes it; the ball moves a touch toward him.
        const s = PRESSER[p];
        at[`zwart${s}`] = { u: holder.u + 0.08, v: holder.v + 0.02 };
        over[`zwart${s}`] = { pose: 'kick' };
        ball = ballOn(holder.u + 0.046, holder.v + 0.03);
        move = 'nudge';
        const t = make('zwart', s);
        bubble = { x: t.x, y: t.y - 74 * t.k };
    } else {
        const aim = beat.aim;
        const save = beat.kind === 'save' || beat.kind === 'five' || (beat.kind === 'shot' && beat.save);
        const striker = HOLDER[VOETBAL.passes];
        const keeper = home.zwart[0];
        if (beat.kind === 'shot' || beat.kind === 'goal') {
            // A goal: the keeper goes the other way; a save: he goes the ball's way.
            const d = DIVE[save ? aim : other(aim)];
            // He lands a step out in front, so a keeper lying toward his post stays inside the scene.
            at.zwart0 = { u: keeper.u + (beat.kind === 'goal' ? -0.035 : 0.01), v: d.v };
            over.zwart0 = beat.kind === 'goal' ? { pose: 'dive', rot: d.down } : { pose: 'dive', lift: d.lift, rot: d.rot };
        }
        if (beat.kind === 'shot') {
            over[`ijs${striker}`] = { pose: 'kick' };
            move = 'shot';
            if (save) ball = ballAt(make('zwart', 0), GLOVES_UP.x, GLOVES_UP.y, ballOn(at.zwart0.u, at.zwart0.v).r);
            else { const n = netSpot(1, AIM_V[aim]); ball = ballOn(n.u, n.v, 30); }
        } else if (beat.kind === 'goal') {
            const n = netSpot(1, AIM_V[aim]);
            ball = ballOn(n.u, n.v, 3);
            move = 'drop';
            crowd = 'goal';
            bulge = true;
            for (let i = 0; i < SLOTS; i++) over[`ijs${i}`] = { pose: 'cheer', jump: true };
        } else {
            over.zwart0 = { pose: beat.kind === 'save' ? 'hold' : 'cheer' };
            const k = make('zwart', 0);
            const r = ballOn(keeper.u, keeper.v).r;
            if (beat.kind === 'save') {
                ball = ballAt(k, GLOVES_HOLD.x, GLOVES_HOLD.y, r);
            } else {
                // The striker jogs up to the keeper (the defenders step aside); the star sits where their paws meet.
                at[`ijs${striker}`] = { u: keeper.u - 0.085, v: keeper.v + 0.02 };
                over[`ijs${striker}`] = { pose: 'cheer' };
                at.zwart1 = { u: 0.8, v: 0.2 };
                at.zwart2 = { u: 0.8, v: 0.8 };
                const a = figPoint(make('ijs', striker), 14, PAWS_UP), b = figPoint(k, 14, PAWS_UP);
                star = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 4 };
                ball = { ...ballAt(k, GLOVES_HOLD.x + 8, -2, r) };
                move = 'drop';
            }
        }
    }

    const figs = ORDER.map(({ team, slot }) => make(team, slot));
    return { figs, ball, move, star, bubble, crowd, bulge };
}

// The pupil's best match per card and length on this device (never shared). Storage may be blocked: try/catch.
export const VOETBAL_BEST_KEY = 'rekenraak_spel_voetbal';

function readAll(): Record<string, number> {
    try {
        const v: unknown = JSON.parse(globalThis.localStorage?.getItem(VOETBAL_BEST_KEY) ?? '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, number> : {};
    } catch { return {}; }
}

/** The most goals in one match for this key, 0 when none (or unreadable). */
export function loadBest(key: string): number {
    const n = readAll()[key];
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Keeps goals when it beats the best on this device. */
export function saveBest(key: string, goals: number): void {
    if (goals <= loadBest(key)) return;
    try { globalThis.localStorage?.setItem(VOETBAL_BEST_KEY, JSON.stringify({ ...readAll(), [key]: goals })); } catch { /* blocked: this match only */ }
}

export function wipeBest(key: string): void {
    try {
        const all = readAll();
        delete all[key];
        globalThis.localStorage?.setItem(VOETBAL_BEST_KEY, JSON.stringify(all));
    } catch { /* blocked: nothing kept anyway */ }
}
