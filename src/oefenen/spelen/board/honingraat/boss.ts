import type { Rng } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import { boardCleared, type BoardCell, type SpelBoard } from '../board';
import type { Level } from '../../levels/levels';
import { waspSums } from './hive';
import { BOSS, hasBoss } from './hiveLevels';

// The Wespenkoningin (Moeilijk and Onmogelijk): after the last board she comes for the honey. Every sum is a wasp
// battle's three honey drops; right = the bees sting her (her bar drops), wrong = she grabs a honey pot. Her bar
// empty: she flees; the last pot taken: she flies off with the honey (the friendly early end). Pure: QueenFight draws.

export { BOSS } from './hiveLevels';

export interface BossRule {
    // Right answers to empty her bar, and pots she may take before she wins.
    hits: number;
    pots: number;
}

/** The queen's fight on this level; null = no queen (Makkelijk, Normaal). */
export function bossRule(level: Level): BossRule | null {
    return hasBoss(level) ? { hits: BOSS.hits[level], pots: BOSS.pots[level] } : null;
}

/** The longest the fight can run: every hit but one and every pot but one, then the deciding answer. */
export const bossLength = (rule: BossRule) => rule.hits + rule.pots - 1;

/** She comes when the round's last board is full (the session waits for her: BoardRound.finale). */
export const bossDue = (board: SpelBoard | null | undefined, total: number): board is SpelBoard =>
    !!board && board.index === total - 1 && boardCleared(board);

/**
 * Her sums, from every board played (waspSums' order: untapped near misses, wrong taps, finds). A short pool
 * (a breuken comb repeats its answers) goes round again, so the fight never runs out.
 */
export function bossSums(cells: readonly BoardCell[], rng: Rng, rule: BossRule): SpelQuestion[] {
    const n = bossLength(rule);
    const pool = waspSums(cells, rng, n);
    if (pool.length === 0) return [];
    return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}

export type BossVerdict = 'fled' | 'robbed';

/** The fight's outcome as soon as it is sure: her bar empty, or her last pot taken. */
export function bossVerdict(results: readonly boolean[], rule: BossRule): BossVerdict | null {
    const right = results.filter(Boolean).length;
    if (right >= rule.hits) return 'fled';
    if (results.length - right >= rule.pots) return 'robbed';
    return null;
}

/** What is left: her health (bar segments) and the pots still on the shelf. */
export function bossLeft(results: readonly boolean[], rule: BossRule): { health: number; pots: number } {
    const right = results.filter(Boolean).length;
    return { health: Math.max(0, rule.hits - right), pots: Math.max(0, rule.pots - (results.length - right)) };
}
