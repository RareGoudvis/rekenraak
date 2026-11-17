import type { SpelBoard } from '../board';

// Voetbalkaartjes' scoreboard, pure: every pair found is a goal for Wij; Zij never scores (decoration only).

export const ZIJ_GOALS = 0;

// The boards played so far this round: the one on screen (key, its pairs) and the goals of every board before it.
export interface BoardsSeen { key: string | null; cells: number; before: number }

export const NO_BOARDS: BoardsSeen = { key: null, cells: 0, before: 0 };

/** A new board on screen adds the last one's pairs (a board only goes once every pair is found); the same board changes nothing. */
export function followBoards(seen: BoardsSeen, board: SpelBoard | null | undefined): BoardsSeen {
    if (!board || board.key === seen.key) return seen;
    return { key: board.key, cells: board.cells.length, before: seen.before + (seen.key === null ? 0 : seen.cells) };
}

/** Wij's goals: the boards before plus the pairs found on this one. */
export const wijGoals = (seen: BoardsSeen, board: SpelBoard | null | undefined): number =>
    seen.before + (board && board.key === seen.key ? board.cells.filter(c => c.state === 'solved').length : 0);
