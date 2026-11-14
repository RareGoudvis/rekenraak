import { checkAnswer } from '../../../services/oefenen/check';
import { kioskFor } from '../../../services/oefenen/kiosk';
import type { OefenHistoryEntry, OefenSessie } from '../../../services/oefenen/types';
import type { SpelMistake } from '../useSpelStore';
import { boardCleared, buildBoard, drawPool, POOL, targetClaim, type BoardRound, type SpelBoard } from './board';

export type { SpelBoard } from './board';

// The board round's rules, pure, for useSpelStore: which board comes next, what one pick does to it.
//
// Mistakes (owner brief round 3C): a pick that only shows the pupil does not remember where a card lies is
// never a mistake. Memory: a sum card turned first and then a wrong answer card is a strike for that sum;
// the second strike logs the sum once as a mistake (it can still be paired after). An answer card turned
// first, or two sums, or two answers: never a strike. Honingraat: every wrong cell is a mistake at once
// (strikes 1), and the cell closes showing its own answer.

/** The next board of the round (new sums, none asked or shown before), or null when the round is over. */
export function nextBoardOf(s: OefenSessie, round: BoardRound, prev: SpelBoard | null, history: readonly OefenHistoryEntry[], choiceCount?: number, rng: () => number = Math.random): SpelBoard | null {
    const index = prev ? prev.index + 1 : 0;
    if (index >= round.boards) return null;
    const seen = new Set([...history.map(h => h.exerciseKey), ...(prev?.cells.map(c => c.question.key) ?? [])]);
    return buildBoard(round, drawPool(s, history, seen, POOL[round.kind], choiceCount), index, rng);
}

export interface BoardPickOut {
    board: SpelBoard;
    // The history line this pick wrote: a sum's right answer, or its mistake; null = nothing to log yet.
    entry: OefenHistoryEntry | null;
    // Logged for the end screen and Nakijken (never for a met hulp sum).
    mistake: SpelMistake | null;
    correct: boolean;
    // Every sum of the board is done: the next board comes.
    cleared: boolean;
}

/** One pick on one open sum: the session checks it (an answer card's value, or the board's target). Null = not a pick (a settled cell). */
export function boardPickIn(s: OefenSessie, board: SpelBoard, round: BoardRound, cell: number, given: string, strike: boolean, ms: number): BoardPickOut | null {
    const c = board.cells[cell];
    if (!c || c.state !== 'open') return null;
    const q = c.question;
    const type = s.types[q.slot];
    const d = type && kioskFor(type.typeId);
    if (!d) return null;
    if (!board.target && given === '') return null;
    // A target cell claims "this sum makes the target"; a memory pick claims the paired answer card.
    const correct = board.target ? c.match : checkAnswer(d, q.exercise, q.constraints, given, type.exactForm);
    const claim = board.target ? targetClaim(board.target) : given;
    const entryOf = (ok: boolean): OefenHistoryEntry => ({ slot: q.slot, typeId: type.typeId, exerciseKey: q.key, correct: ok, ms: Math.max(0, ms) });
    let next = c;
    let entry: OefenHistoryEntry | null = null;
    let mistake: SpelMistake | null = null;
    if (correct) {
        next = { ...c, state: 'solved', logged: true };
        // A sum already logged as a mistake is paired later without a second line.
        if (!c.logged) entry = entryOf(true);
    } else {
        const tries = c.tries + (strike ? 1 : 0);
        const hits = strike && tries >= round.strikes && !c.logged;
        next = { ...c, tries, logged: c.logged || hits, state: board.target ? 'missed' : 'open' };
        if (hits) {
            entry = entryOf(false);
            if (!c.helped) mistake = { question: q, given: claim };
        }
    }
    const cells = board.cells.map((x, i) => (i === cell ? next : x));
    const out: SpelBoard = { ...board, cells, focus: cell };
    return { board: out, entry, mistake, correct, cleared: boardCleared(out) };
}

/** "Hoe los ik dit op?" on a board: met hulp counts once per sum, only while that sum is still open. */
export function boardOpenHelp(board: SpelBoard): { board: SpelBoard; counts: boolean } {
    const at = board.focus;
    const c = at !== null ? board.cells[at] : null;
    const counts = !!c && c.state === 'open' && !c.helped;
    return { counts, board: counts ? { ...board, cells: board.cells.map((x, i) => (i === at ? { ...x, helped: true } : x)) } : board };
}
