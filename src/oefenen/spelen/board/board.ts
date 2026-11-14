import { madePerSlot, nextExercise, nextType } from '../../../services/oefenen/scheduler';
import type { OefenHistoryEntry, OefenSessie } from '../../../services/oefenen/types';
import { formatMathNumber } from '../../../services/math/formatters';
import { spelQuestionOf, type SpelQuestion } from '../spelQuestion';
import type { Rng } from '../distractors';

// Board rounds (Hartjes koppelen, Honingraat): several sums on screen at once. The session draws a board
// up front from the card's own generator, the pupil picks, the session checks each pick per sum, so a
// mistake is still one logged sum and Nakijken replays it. Pure: the store keeps the board, this builds it.

// pairs = memory: each sum and its answer as two face-down cards (answers unique on a board).
// target = find every sum with this answer (or above a round number) among near misses.
export type BoardKind = 'pairs' | 'target';

export interface BoardRound {
    kind: BoardKind;
    // Boards in the round.
    boards: number;
    // pairs: sums per board (two cards each); target: cells per board.
    size: number;
    // Counted wrong picks on one sum before it is logged as a mistake (once).
    strikes: number;
}

// What the pupil is looking for on a target board: answer = n, or answer > n (the fallback when a card's
// answers rarely repeat, as in tot 100 and tot 1000).
export interface BoardTarget { kind: 'eq' | 'gt'; n: number }

// What a card or cell shows: plain text today; a picture id (breuk "3/8", klok "08:15") for later packs,
// with its label as the readable fallback.
export type BoardFace = { kind: 'text'; text: string } | { kind: 'picture'; picture: string; label: string };

export type CellState = 'open' | 'solved' | 'missed';

export interface BoardCell {
    question: SpelQuestion;
    // target boards: this sum is one to find (set when the board is built).
    match: boolean;
    // Counted wrong picks so far.
    tries: number;
    state: CellState;
    // "Hoe los ik dit op?" was opened while this sum was open: no point, no mistake.
    helped: boolean;
    // A history entry was written for this sum (its mistake, or its right answer).
    logged: boolean;
}

export interface SpelBoard {
    // Changes per board: skins reset their own state on it.
    key: string;
    // 0-based board number in the round.
    index: number;
    cells: BoardCell[];
    target: BoardTarget | null;
    // The sum the pupil last picked: "Hoe los ik dit op?" explains it.
    focus: number | null;
}

// Pool sizes: enough draws to find six different answers, or a group of 3–5 with near misses.
export const POOL = { pairs: 40, target: 120 } as const;
export const TARGET_MATCHES = { min: 3, max: 5 } as const;

/** Up to `count` fresh sums of the session (none of `seen`), drawn as the game draws them. */
export function drawPool(s: OefenSessie, history: readonly OefenHistoryEntry[], seen: ReadonlySet<string>, count: number, choiceCount?: number): SpelQuestion[] {
    const hist = [...history];
    const keys = new Set(seen);
    const out: SpelQuestion[] = [];
    // A card with only a few sums runs dry: stop after a run of repeats.
    let dry = 0;
    while (out.length < count && dry < 12) {
        const pick = nextType(s, hist);
        if (!pick) break;
        const made = nextExercise(s, pick.type, keys, undefined, madePerSlot(s, hist)[pick.slot]);
        const q = made && !made.repeat && !keys.has(made.key) ? spelQuestionOf(pick.type, pick.slot, made, choiceCount) : null;
        if (!q) { dry++; continue; }
        dry = 0;
        keys.add(q.key);
        out.push(q);
        hist.push({ slot: q.slot, typeId: pick.type.typeId, exerciseKey: q.key, correct: true, ms: 0 });
    }
    return out;
}

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const cellOf = (question: SpelQuestion, match = false): BoardCell => ({ question, match, tries: 0, state: 'open', helped: false, logged: false });

/** A memory board: `size` sums whose answers all differ (fewer when the pool has fewer different answers). */
export function pairsBoard(pool: readonly SpelQuestion[], size: number, rng: Rng): BoardCell[] {
    const answers = new Set<string>();
    const out: BoardCell[] = [];
    for (const q of shuffle(pool, rng)) {
        if (out.length >= size) break;
        if (answers.has(q.answer)) continue;
        answers.add(q.answer);
        out.push(cellOf(q));
    }
    return out;
}

// Board rounds play number content only (a picture pack never reaches a board skin: accepts.pictures), so
// facts is there; the typed answer is the fallback.
const answerOf = (q: SpelQuestion): number => q.facts?.answer ?? Number(q.answer);

// How near a wrong answer is to the target, as a pupil slips: ±1 first, then ±10, ±2, then by distance.
function nearness(answer: number, target: number): number {
    const d = Math.abs(answer - target);
    return d === 1 ? 0 : d === 10 ? 1 : d === 2 ? 2 : 2 + d;
}

/** A target board: 3–5 sums with the target answer and the nearest other sums around them, shuffled; null when the pool has no such group. */
export function targetBoardEq(pool: readonly SpelQuestion[], size: number, rng: Rng): { cells: BoardCell[]; target: BoardTarget } | null {
    const groups = new Map<number, SpelQuestion[]>();
    for (const q of pool) groups.set(answerOf(q), [...(groups.get(answerOf(q)) ?? []), q]);
    const rest = size - TARGET_MATCHES.min;
    const fits = shuffle([...groups.keys()], rng).filter(n => groups.get(n)!.length >= TARGET_MATCHES.min && pool.length - groups.get(n)!.length >= rest);
    if (!fits.length) return null;
    // The biggest group, so a board can hold up to five; ties by the shuffle.
    const n = fits.reduce((best, k) => (groups.get(k)!.length > groups.get(best)!.length ? k : best), fits[0]);
    const k = Math.min(TARGET_MATCHES.max, groups.get(n)!.length, TARGET_MATCHES.min + Math.floor(rng() * (TARGET_MATCHES.max - TARGET_MATCHES.min + 1)));
    const hits = shuffle(groups.get(n)!, rng).slice(0, k);
    const near = shuffle(pool.filter(q => answerOf(q) !== n), rng)
        .sort((a, b) => nearness(answerOf(a), n) - nearness(answerOf(b), n))
        .slice(0, size - k);
    return { cells: shuffle([...hits.map(q => cellOf(q, true)), ...near.map(q => cellOf(q))], rng), target: { kind: 'eq', n } };
}

/** The fallback: "groter dan" a round number, 3–5 sums above it and the nearest ones below it (never on it). */
export function targetBoardGt(pool: readonly SpelQuestion[], size: number, rng: Rng): { cells: BoardCell[]; target: BoardTarget } | null {
    const answers = pool.map(q => answerOf(q));
    const top = Math.max(0, ...answers);
    // Round numbers: tens, hundreds on a big card.
    const step = top >= 400 ? 100 : top >= 40 ? 10 : 5;
    const options: number[] = [];
    for (let n = step; n < top; n += step) {
        const above = answers.filter(a => a > n).length;
        const below = answers.filter(a => a < n).length;
        if (above >= TARGET_MATCHES.min && below >= size - TARGET_MATCHES.min) options.push(n);
    }
    if (!options.length) return null;
    // Near the middle of the card's answers, so neither side is all tiny or all huge sums.
    const mid = options.sort((a, b) => Math.abs(a - top / 2) - Math.abs(b - top / 2)).slice(0, 3);
    const n = mid[Math.floor(rng() * mid.length)];
    const ups = shuffle(pool.filter(q => answerOf(q) > n), rng);
    const k = Math.min(ups.length, TARGET_MATCHES.min + Math.floor(rng() * (TARGET_MATCHES.max - TARGET_MATCHES.min + 1)));
    const lows = shuffle(pool.filter(q => answerOf(q) < n), rng).sort((a, b) => answerOf(b) - answerOf(a)).slice(0, size - k);
    if (lows.length < size - k) return null;
    return { cells: shuffle([...ups.slice(0, k).map(q => cellOf(q, true)), ...lows.map(q => cellOf(q))], rng), target: { kind: 'gt', n } };
}

/** One board of this round from a pool of drawn sums; null when the card cannot fill one. */
export function buildBoard(round: BoardRound, pool: readonly SpelQuestion[], index: number, rng: Rng): SpelBoard | null {
    const key = `b${index}-${pool[0]?.key ?? 'leeg'}`;
    if (round.kind === 'pairs') {
        const cells = pairsBoard(pool, round.size, rng);
        // Two pairs is no memory game.
        return cells.length >= 3 ? { key, index, cells, target: null, focus: null } : null;
    }
    const built = targetBoardEq(pool, round.size, rng) ?? targetBoardGt(pool, round.size, rng);
    return built ? { key, index, ...built, focus: null } : null;
}

/** Whether a picked cell is one to find on this target. */
export const meetsTarget = (answer: number, t: BoardTarget): boolean => (t.kind === 'eq' ? answer === t.n : answer > t.n);

/** The board is cleared: every sum paired (pairs), every sum to find filled (target). */
export const boardCleared = (b: SpelBoard): boolean => b.cells.every(c => c.state === 'solved' || (b.target !== null && !c.match));

/** What the pupil claims by tapping a target cell, as the end screen's "Jouw antwoord". */
export const targetClaim = (t: BoardTarget): string => (t.kind === 'eq' ? String(t.n) : `meer dan ${formatMathNumber(t.n)}`);

// "8 + 5 = ?" → "8 + 5": the sum alone on a card or cell.
const sumText = (q: SpelQuestion) => q.text.replace(/\s*=\s*\?\s*$/, '').trim();

/** The sum side of a cell. */
export const sumFace = (q: SpelQuestion): BoardFace => ({ kind: 'text', text: sumText(q) });

/** The answer side of a cell (memory's answer card). */
export const answerFace = (q: SpelQuestion): BoardFace => ({ kind: 'text', text: /^\d+$/.test(q.answer) ? formatMathNumber(Number(q.answer)) : q.answer });
