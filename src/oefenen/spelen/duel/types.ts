import type { OefenHistoryEntry } from '../../../services/oefenen/types';
import type { Level } from '../levels/levels';
import type { SpelQuestion } from '../spelQuestion';

// The duel engine's contract (DUEL.md): two sides, their question streams, lives, points, rounds and the
// game's rule. A duel game supplies a DuelRule and draws a scene; the engine does everything else.

export type Side = 'left' | 'right';
export const SIDES: readonly Side[] = ['left', 'right'];
export const otherSide = (s: Side): Side => (s === 'left' ? 'right' : 'left');

// The four levels (levels/levels.ts): Makkelijk = no clock (and a gentle bot), the others the shared clock per sum.
export type DuelLevel = Level;
// own = each side its own sums; shared = one sum for both, typed at once, the first right answer takes it.
export type DuelStream = 'own' | 'shared';
export type DuelBestOf = 1 | 3 | 5;

export type SidePart<T> = Partial<Record<Side, T>>;
// A game's own memory per side (a guard down, shields up): small numbers, reset every round.
export type DuelFlags = Record<string, number>;

export interface DuelConfig {
    // 1 = the human on the left against the bot on the right.
    players: 1 | 2;
    level: DuelLevel;
    // Lives per side at the start of each round.
    lives: number;
    bestOf: DuelBestOf;
    stream: DuelStream;
    // A round clock; at 0 the rule's roundOver(timeUp) decides. Absent = no clock.
    roundSeconds?: number;
    // Shared stream: a wrong answer locks that keypad this long (then it may try again).
    wrongLockMs?: number;
    // The "Ronde 2" banner before the sums show; 0 in tests.
    readyMs?: number;
    // Injected randomness for the bot (tests); absent = Math.random.
    rng?: () => number;
}

// What a side looks like to a rule and to the HUD.
export interface DuelSideView {
    lives: number;
    points: number;
    // Right answers in a row this round (0 after a wrong answer or a time-out).
    streak: number;
    // This round's right and wrong answers (time-outs count as wrong).
    right: number;
    wrong: number;
    flags: DuelFlags;
}

export interface DuelCtx {
    // Who answered (or, for land, who launched).
    side: Side;
    other: Side;
    me: DuelSideView;
    them: DuelSideView;
    // = me.streak, after this answer.
    streak: number;
    level: DuelLevel;
    round: number;
    config: DuelConfig;
}

// Something in the air (a stone, a pie, a meteor): it lands on `to` at landsAt and then its effect applies.
export interface DuelFlight {
    id: number;
    from: Side;
    to: Side;
    tag: string;
    startedAt: number;
    landsAt: number;
    // The game's own details for drawing (a big stone, which bug).
    data: Record<string, string | number | boolean>;
    // Applied on landing, through rule.land when the rule has it.
    effect: DuelEffect;
}

export interface DuelEffect {
    // Lives off per side (negative = back on). Lives never go below 0 (nor above rule.maxLives).
    damage?: SidePart<number>;
    points?: SidePart<number>;
    // Merged into the side's flags (a value of 0 clears one).
    flags?: SidePart<DuelFlags>;
    // Something flies to the other side (or `to`) first; `effect` (or rule.land) applies when it lands.
    launch?: { ms: number; to?: Side; tag?: string; data?: DuelFlight['data']; effect?: DuelEffect };
    // A name for what happened ('special', 'blocked'), carried on the damage / effect events.
    tag?: string;
}

// The view a round-end check gets.
export interface DuelRoundView {
    sides: Record<Side, DuelSideView>;
    config: DuelConfig;
}

export interface DuelRule {
    // A right answer. Absent = the other side loses 1 life.
    right?(ctx: DuelCtx): DuelEffect;
    // A wrong answer. Absent = nothing (the flash or the lock is the cost).
    wrong?(ctx: DuelCtx): DuelEffect;
    // A sum's time ran out (every level but Makkelijk). Absent = rule.wrong.
    timeout?(ctx: DuelCtx): DuelEffect;
    // A flight arrives (ctx.side = who launched it). Absent = flight.effect as it is.
    land?(ctx: DuelCtx, flight: DuelFlight): DuelEffect;
    // Who won the round, checked after every effect and at the round clock. Absent = defaultRoundOver.
    roundOver?(view: DuelRoundView, timeUp: boolean): Side | 'draw' | null;
    // The most lives a side can have (Touwtrekken's rope: twice the start). Absent = no ceiling.
    maxLives?(config: DuelConfig): number;
    // How long the round's win moment plays before the scoreboard card. Absent = DUEL_TIMING.cardMs.
    cardMs?: number;
}

export interface DuelFeedback { given: string; expected: string; correct: boolean }

export interface DuelSide extends DuelSideView {
    question: SpelQuestion | null;
    // This side's own stream (own); in a shared stream both read the shared history.
    history: OefenHistoryEntry[];
    // The flash after an answer, or the shared sum closed; null = waiting for an answer.
    feedback: DuelFeedback | null;
    // The keypad is locked (shared: after a wrong answer for wrongLockMs, or out of tries on this sum).
    locked: boolean;
    // Shared stream: wrong tries on the current sum; at SHARED_TRIES (or a time-out) this side is out for it.
    tries: number;
    out: boolean;
    shownAt: number;
    // When this sum times out, and its full time (the ring; levels/clock.ts). null = no clock (Makkelijk).
    deadline: number | null;
    limitMs: number | null;
    // How long this side takes per sum lately (bot.ts nextPace; the bot follows the pupil's pace); null = no answer yet.
    paceMs: number | null;
    // Rounds won this match; right answers this match (the end card).
    wins: number;
    totalRight: number;
}

export interface DuelEventMap {
    // A round begins (the "Ronde N" banner), then its sums show (play).
    roundStart: { round: number };
    play: { round: number };
    right: { side: Side; given: string; streak: number; ms: number };
    wrong: { side: Side; given: string; expected: string };
    timeout: { side: Side; expected: string };
    // Every effect the engine applied: cause = what triggered it.
    effect: { by: Side; cause: 'right' | 'wrong' | 'timeout' | 'land' | 'game'; effect: DuelEffect };
    // A side's lives changed (amount > 0 = lost); by = whose action did it.
    damage: { side: Side; by: Side; amount: number; lives: number; tag?: string };
    points: { side: Side; amount: number; points: number; tag?: string };
    launch: { flight: DuelFlight };
    land: { flight: DuelFlight };
    roundEnd: { winner: Side | 'draw'; round: number; wins: Record<Side, number> };
    matchEnd: { winner: Side; wins: Record<Side, number> };
}
