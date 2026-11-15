import { GEO, netSpot, project, type Geo, type Spot, type XY } from './pitch';

// Voetbal's match, pure for the tests. Possession decides what an answer does. While the polar bears have the
// ball, a right answer is a pass up their chain and a wrong one lets the black bears take it where it is. While the
// black bears have it, a wrong answer is their pass (the same chain, mirrored) and a right one wins it back on the
// spot. After PASSES passes a team is at its shooting point: our next sum is the shot, on its own clock (onMiss):
// right = a goal, wrong or too late = their keeper's catch. Their next wrong answer is their shot, and it goes in.
// The match clock is the session's (round.seconds); at its half the skin holds it for the "Rust!" break. The beats
// below turn each play into a short timeline of scenes (where every bear and the ball stand), drawn by Voetbal.tsx.

export const VOETBAL = {
    // Passes before the shot (pass dots 1–4): keeper → defender → midfielder → the other midfielder → striker.
    passes: 4,
    // The shot's own countdown.
    shotMs: 10_000,
    // The half-time break: the match clock stands still meanwhile.
    rustMs: 2_000,
    // A hidden question cap, so a round always ends (the clock ends it first in practice).
    cap: 200,
    // The beats of a play (ms after the answer): the passer's kick pose, the tackle before the new team plays the
    // ball on, the shot's flight, the save's high five and the restart after a goal or a save.
    kickMs: 380,
    tapMs: 650,
    flightMs: 460,
    fiveMs: 1_000,
    kickoffMs: 2_100,
} as const;

export type Side = 'ijs' | 'zwart';
export const otherSide = (s: Side): Side => (s === 'ijs' ? 'zwart' : 'ijs');

// What the last answer did, for the scene: our pass / their pass, a turnover either way, a goal either way, a save.
export type Play = 'pass' | 'zpass' | 'lose' | 'win' | 'goal' | 'zgoal' | 'save' | null;

export interface Match {
    // Who has the ball and how far along their chain (0..PASSES; PASSES = at the shooting point).
    side: Side;
    passes: number;
    // Polar bears' goals, black bears' goals, and our shots their keeper caught.
    goals: number;
    against: number;
    saves: number;
    half: 1 | 2;
    last: Play;
    // Counts plays, so the same play twice in a row restarts its animation.
    n: number;
}

export const newMatch = (): Match => ({ side: 'ijs', passes: 0, goals: 0, against: 0, saves: 0, half: 1, last: null, n: 0 });

/** The sum on screen is our shot (our striker has the ball). */
export const isShot = (m: Match) => m.side === 'ijs' && m.passes >= VOETBAL.passes;

// A turnover keeps the ball where it was: the new team carries on from the step of its own chain nearest that spot
// (mirrored, so the same table serves both ways). Never straight to the shooting point: one pass is always needed.
export const TURNOVER = [3, 3, 2, 2, 1] as const;
// After a goal the team that let it in restarts from midfield (step 2 of its chain).
export const RESTART = 2;

/** After a right or wrong answer (a missed shot is a wrong one). */
export function playOf(m: Match, correct: boolean): Match {
    const n = m.n + 1;
    const p = Math.min(m.passes, VOETBAL.passes);
    if (m.side === 'ijs') {
        if (isShot(m)) return correct
            ? { ...m, side: 'zwart', passes: RESTART, goals: m.goals + 1, last: 'goal', n }
            : { ...m, side: 'zwart', passes: 0, saves: m.saves + 1, last: 'save', n };
        return correct ? { ...m, passes: p + 1, last: 'pass', n } : { ...m, side: 'zwart', passes: TURNOVER[p], last: 'lose', n };
    }
    if (correct) return { ...m, side: 'ijs', passes: TURNOVER[p], last: 'win', n };
    return p >= VOETBAL.passes
        ? { ...m, side: 'ijs', passes: RESTART, against: m.against + 1, last: 'zgoal', n }
        : { ...m, passes: p + 1, last: 'zpass', n };
}

/** The first half is over: half the match clock gone. */
export const halfTimeDue = (m: Match, msLeft: number | null, msTotal: number | null) =>
    m.half === 1 && msLeft !== null && !!msTotal && msLeft > 0 && msLeft <= msTotal / 2;

/** Shot clock: what is left after dt of play (never below 0). */
export const shotStep = (left: number, dt: number) => Math.max(0, left - Math.max(0, dt));

/** The score in words, for the end screen and screen readers: "IJsberen 3, zwarte beren 1". */
export const scoreLine = (goals: number, against: number) => `IJsberen ${goals}, zwarte beren ${against}`;

/** The end screen's title by the score: a win, a draw, or a friendly "what a match". */
export const endTitle = (goals: number, against: number) =>
    goals > against ? 'Gewonnen!' : goals === against ? 'Gelijkspel!' : 'Wat een wedstrijd!';

// ── The scene: who stands where, per beat ─────────────────────────────────────────────────────────────────

// Each team plays 1-1-2-1 (the Voetbal Vlaanderen 5 v 5 shape): 0 keeper, 1 defender, 2 far midfielder,
// 3 near midfielder (both wide), 4 striker. "Far" = toward the far touchline.
export const SLOTS = 5;
type Row = readonly [number, number];
type Shape = readonly [Row, Row, Row, Row, Row];

// The attacking team per step of its chain, in its own direction (its goal at u 0): the team moves up with the ball.
const ATTACK: readonly Shape[] = [
    [[0.06, 0.5], [0.22, 0.5], [0.36, 0.24], [0.36, 0.76], [0.44, 0.52]],
    [[0.07, 0.5], [0.26, 0.5], [0.42, 0.22], [0.42, 0.78], [0.54, 0.46]],
    [[0.09, 0.5], [0.34, 0.5], [0.5, 0.24], [0.5, 0.76], [0.64, 0.44]],
    [[0.1, 0.5], [0.38, 0.5], [0.6, 0.26], [0.56, 0.78], [0.74, 0.42]],
    [[0.12, 0.5], [0.42, 0.5], [0.62, 0.24], [0.64, 0.76], [0.8, 0.48]],
];
// The defending team at the same moment (same direction): it drops back and leans toward the ball. At step 0 it is
// the attackers' mirror image, so a kick-off is two identical teams facing each other.
const DEFEND: readonly Shape[] = [
    [[0.94, 0.5], [0.78, 0.5], [0.64, 0.24], [0.64, 0.76], [0.56, 0.52]],
    [[0.94, 0.5], [0.8, 0.46], [0.66, 0.28], [0.66, 0.72], [0.38, 0.54]],
    [[0.94, 0.52], [0.82, 0.48], [0.72, 0.2], [0.6, 0.66], [0.42, 0.48]],
    [[0.94, 0.48], [0.84, 0.44], [0.71, 0.18], [0.66, 0.68], [0.48, 0.5]],
    [[0.94, 0.47], [0.86, 0.22], [0.74, 0.16], [0.75, 0.72], [0.52, 0.5]],
];
// Who has the ball at each step: keeper → defender → near midfielder → far midfielder → striker (the shooter).
export const HOLDER = [0, 1, 3, 2, 4] as const;
// The defender nearest the ball at each step: the one who wins it on a turnover.
export const PRESSER = [4, 4, 3, 2, 3] as const;

// The shot goes to the far or the near half of the goal (alternating); the keeper leaps or dives.
export type Aim = 'far' | 'near';
export const aimOf = (n: number): Aim => (n % 2 ? 'far' : 'near');
const AIM_V: Record<Aim, number> = { far: 0.45, near: 0.55 };
// The keeper's dive per side: where he goes across the goal, how high he leaps (scene units), his lean toward his
// goal line in the air and after a goal (far: a stretch up to the far corner; near: a dive that ends lying down).
const DIVE: Record<Aim, { v: number; lift: number; rot: number; down: number }> = {
    far: { v: 0.42, lift: 16, rot: 22, down: -8 },
    near: { v: 0.61, lift: 8, rot: 46, down: 78 },
};
const otherAim = (a: Aim): Aim => (a === 'far' ? 'near' : 'far');

// How the ball got where it is: a lifted pass, a roll, a shot, a nudge, a drop, or the restart (it pops up).
export type Move = 'arc' | 'roll' | 'shot' | 'nudge' | 'drop' | 'reset' | 'still';

// side = the team with the ball (hold), that loses it (steal) or that shoots (shot, goal); save and five are ours.
export type Beat =
    | { kind: 'hold'; side: Side; p: number; kicker: number | null; move: Move }
    | { kind: 'steal'; side: Side; p: number }
    | { kind: 'shot'; side: Side; aim: Aim; save: boolean }
    | { kind: 'goal'; side: Side; aim: Aim }
    | { kind: 'save'; aim: Aim }
    | { kind: 'five'; aim: Aim };

export const KICKOFF: Beat = { kind: 'hold', side: 'ijs', p: 0, kicker: null, move: 'still' };

export interface Step { at: number; beat: Beat }

/** The timeline of one play: the scenes after the answer, each at its time (ms). */
export function beatsOf(before: Match, after: Match): Step[] {
    const p = Math.min(before.passes, VOETBAL.passes);
    const side = before.side;
    const hold = (kicker: number | null, move: Move): Beat => ({ kind: 'hold', side: after.side, p: after.passes, kicker, move });
    switch (after.last) {
        case 'pass':
        case 'zpass':
            return [{ at: 0, beat: hold(HOLDER[p], 'arc') }, { at: VOETBAL.kickMs, beat: hold(null, 'arc') }];
        case 'lose':
        case 'win':
            return [{ at: 0, beat: { kind: 'steal', side, p } }, { at: VOETBAL.tapMs, beat: hold(null, 'arc') }];
        case 'goal':
        case 'zgoal': {
            const aim = aimOf(after.n);
            return [
                { at: 0, beat: { kind: 'shot', side, aim, save: false } },
                { at: VOETBAL.flightMs, beat: { kind: 'goal', side, aim } },
                { at: VOETBAL.kickoffMs, beat: hold(null, 'reset') },
            ];
        }
        case 'save': {
            const aim = aimOf(after.n);
            return [
                { at: 0, beat: { kind: 'shot', side: 'ijs', aim, save: true } },
                { at: VOETBAL.flightMs, beat: { kind: 'save', aim } },
                { at: VOETBAL.fiveMs, beat: { kind: 'five', aim } },
                { at: VOETBAL.kickoffMs, beat: hold(null, 'still') },
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
    team: Side;
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
    // The high five's star; the turnover's bubble ("Oeps!" when they take it, "Hebbes!" when we win it back);
    // the stand cheering; which net puffs out (0 ours, 1 theirs).
    star: XY | null;
    bubble: (XY & { text: string }) | null;
    crowd: 'calm' | 'goal';
    bulge: 0 | 1 | null;
}

// The bears' size on the near touchline (the art is ~62 units tall).
export const BEAR_K = 0.9;
const BALL_R = 6;
// Bear-art points (facing right, feet at 0 0): the ball ahead of the feet, the keeper's gloves per pose, raised paws.
const FEET_U = 0.032;
const GLOVES_UP = { x: 0, y: -74 };
const GLOVES_HOLD = { x: 13, y: -27 };
const PAWS_UP = -66;

const mirror = (s: Spot): Spot => ({ u: 1 - s.u, v: s.v });
const spotOf = (r: Row): Spot => ({ u: r[0], v: r[1] });
/** Both teams' spots at step p of the attacking side's chain. */
function homes(attacker: Side, p: number): Record<Side, Spot[]> {
    const flip = (s: Spot) => (attacker === 'ijs' ? s : mirror(s));
    const att = ATTACK[p].map(spotOf).map(flip), def = DEFEND[p].map(spotOf).map(flip);
    return attacker === 'ijs' ? { ijs: att, zwart: def } : { ijs: def, zwart: att };
}

// The draw order: back to front by the kick-off depth (v).
const ORDER: readonly { team: Side; slot: number }[] = (() => {
    const h = homes('ijs', 0);
    return (['ijs', 'zwart'] as const)
        .flatMap(team => [0, 1, 2, 3, 4].map(slot => ({ team, slot })))
        .sort((a, b) => h[a.team][a.slot].v - h[b.team][b.slot].v);
})();

function figAt(team: Side, slot: number, at: Spot, extra: Partial<Fig> = {}, g: Geo = GEO): Fig {
    const p = project(at.u, at.v, g);
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

const ballAt = (f: Fig, lx: number, ly: number, r: number) => { const g = figPoint(f, lx, ly); return { x: g.x, y: f.y, lift: f.y - g.y, r }; };

/** The arc of the ball's flight (scene units): longer passes are lifted higher, a shot rises, a roll stays down. */
export function passArc(from: XY, to: XY, move: Move): number {
    if (move === 'shot') return 16;
    if (move !== 'arc') return 0;
    return Math.round(Math.max(6, Math.min(22, Math.hypot(to.x - from.x, to.y - from.y) * 0.12)));
}

/** Where everybody stands in a beat, on a pitch of geometry g (its depth follows the scene's shape). */
export function sceneOf(beat: Beat, g: Geo = GEO): Scene {
    const ballOn = (u: number, v: number, lift = 0) => { const p = project(u, v, g); return { x: p.x, y: p.y, lift: lift * p.s, r: BALL_R * p.s }; };
    const side: Side = beat.kind === 'save' || beat.kind === 'five' ? 'ijs' : beat.side;
    const def = otherSide(side);
    // +1 when the attackers play toward the right-hand goal (ours do), -1 for the black bears.
    const dir = side === 'ijs' ? 1 : -1;
    const p = beat.kind === 'hold' || beat.kind === 'steal' ? Math.max(0, Math.min(VOETBAL.passes, beat.p)) : VOETBAL.passes;
    const home = homes(side, p);
    const at: Record<string, Spot> = {};
    const over: Record<string, Partial<Fig>> = {};
    const holder = home[side][HOLDER[p]];
    let ball = ballOn(holder.u + dir * FEET_U, holder.v + 0.025);
    let move: Move = 'still';
    let star: XY | null = null;
    let bubble: Scene['bubble'] = null;
    let crowd: Scene['crowd'] = 'calm';
    let bulge: Scene['bulge'] = null;
    const make = (team: Side, slot: number) => figAt(team, slot, at[`${team}${slot}`] ?? home[team][slot], over[`${team}${slot}`], g);

    if (beat.kind === 'hold') {
        move = beat.move;
        if (beat.kicker !== null && beat.kicker !== HOLDER[p]) over[`${side}${beat.kicker}`] = { pose: 'kick' };
    } else if (beat.kind === 'steal') {
        // The nearest defender steps in front of the ball and takes it; the ball moves a touch toward him.
        const s = PRESSER[p];
        at[`${def}${s}`] = { u: holder.u + dir * 0.065, v: holder.v - 0.05 };
        over[`${def}${s}`] = { pose: 'kick' };
        ball = ballOn(holder.u + dir * 0.046, holder.v + 0.03);
        move = 'nudge';
        const t = make(def, s);
        bubble = { x: t.x, y: t.y - 74 * t.k, text: def === 'zwart' ? 'Oeps!' : 'Hebbes!' };
    } else {
        const aim = beat.aim;
        const save = beat.kind === 'save' || beat.kind === 'five' || (beat.kind === 'shot' && beat.save);
        const striker = `${side}${HOLDER[VOETBAL.passes]}`;
        const keeperId = `${def}0`;
        const keeper = home[def][0];
        const net = side === 'ijs' ? 1 : 0;
        if (beat.kind === 'shot' || beat.kind === 'goal') {
            // A goal: the keeper goes the other way; a save: he goes the ball's way. He leans toward his goal line
            // and lands a step out in front, so a keeper lying toward his post stays inside the scene.
            const d = DIVE[save ? aim : otherAim(aim)];
            at[keeperId] = { u: keeper.u + dir * (beat.kind === 'goal' ? -0.035 : 0.01), v: d.v };
            over[keeperId] = beat.kind === 'goal' ? { pose: 'dive', rot: dir * d.down } : { pose: 'dive', lift: d.lift, rot: dir * d.rot };
        }
        if (beat.kind === 'shot') {
            over[striker] = { pose: 'kick' };
            move = 'shot';
            if (save) ball = ballAt(make(def, 0), GLOVES_UP.x, GLOVES_UP.y, ballOn(at[keeperId].u, at[keeperId].v).r);
            else { const n = netSpot(net, AIM_V[aim]); ball = ballOn(n.u, n.v, 30); }
        } else if (beat.kind === 'goal') {
            const n = netSpot(net, AIM_V[aim]);
            ball = ballOn(n.u, n.v, 3);
            move = 'drop';
            crowd = 'goal';
            bulge = net;
            for (let i = 1; i < SLOTS; i++) over[`${side}${i}`] = { pose: 'cheer', jump: true };
        } else {
            over.zwart0 = { pose: beat.kind === 'save' ? 'hold' : 'cheer' };
            const k = make('zwart', 0);
            const r = ballOn(keeper.u, keeper.v).r;
            if (beat.kind === 'save') {
                ball = ballAt(k, GLOVES_HOLD.x, GLOVES_HOLD.y, r);
            } else {
                // The striker jogs up to the keeper (the defender steps aside); the star sits where their paws meet.
                at[striker] = { u: keeper.u - 0.085, v: keeper.v + 0.02 };
                over[striker] = { pose: 'cheer' };
                at.zwart1 = { u: 0.84, v: 0.12 };
                const a = figPoint(make('ijs', HOLDER[VOETBAL.passes]), 14, PAWS_UP), b = figPoint(k, 14, PAWS_UP);
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
