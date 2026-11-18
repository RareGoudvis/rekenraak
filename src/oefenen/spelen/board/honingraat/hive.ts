import type { Rng } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import { answerFace, type BoardCell, type BoardFace } from '../board';
import type { Level } from '../../levels/levels';

// Honingraat's own rules beside the session's (board/session.ts): which scene a board plays in, when the
// wasp comes (Normaal and up) and how its battle is scored. Pure: Honingraat.tsx draws, this decides.

// Board 1, 3, 5 … are a honeycomb, 2, 4 … a flower meadow (owner 2026-11-15): the same cells as flowers.
export type HiveView = 'comb' | 'meadow';
export const viewAt = (index: number): HiveView => (index % 2 === 0 ? 'comb' : 'meadow');

// Boards per level (owner 2026-11-17): hiveLevels.ts.
export { HIVE_BOARDS } from './hiveLevels';
// A battle: per wasp this many sums, and how many of them must be right to chase it (Makkelijk has no wasp).
// Onmogelijk: every one right, and the battles grow: one wasp, then two, then three (perWasp sums each).
export const WASP = { perWasp: 3, need: { normaal: 1, moeilijk: 2, onmogelijk: 3 } } as const;

export interface WaspRule {
    // Wasps in this battle, the sums they bring and how many must be right.
    wasps: number;
    sums: number;
    need: number;
}

/** The battle number `n` (0-based) of this level; null = this level has no wasp. */
export function waspRule(level: Level, n: number): WaspRule | null {
    if (level === 'makkelijk') return null;
    const wasps = level === 'onmogelijk' ? n + 1 : 1;
    const sums = WASP.perWasp * wasps;
    return { wasps, sums, need: WASP.need[level] * wasps };
}
// How long a pick shows before the next sum, and the verdict before the comb comes back or the round ends.
export const WASP_MS = { right: 700, wrong: 1400, chased: 2000, claimed: 2600 } as const;

/** Before which boards a wasp attacks: after every flower meadow, so before every comb but the first; never after the last board. */
export function waspSchedule(boards: number): number[] {
    const out: number[] = [];
    // Before board index `filled`; even = a comb, odd = a meadow just played.
    for (let filled = 2; filled < boards; filled += 2) out.push(filled);
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

/**
 * A battle's sums, from the boards already played: first the cells nobody tapped (their answer was never
 * shown), then the wrong taps, then the filled ones (their answer is the old target). No sum twice.
 */
export function waspSums(cells: readonly BoardCell[], rng: Rng, count: number): SpelQuestion[] {
    const rank = (c: BoardCell) => (c.state === 'open' && !c.match ? 0 : c.state === 'missed' ? 1 : 2);
    const keys = new Set<string>();
    const out: SpelQuestion[] = [];
    for (const r of [0, 1, 2]) {
        for (const c of shuffle(cells.filter(x => rank(x) === r), rng)) {
            if (out.length >= count) return out;
            if (keys.has(c.question.key)) continue;
            keys.add(c.question.key);
            out.push(c.question);
        }
    }
    return out;
}

export interface WaspChoice {
    // What makes two answers one (a breuk's lowest form, a plain number's digits).
    value: string;
    text: string;
}

const faceText = (f: BoardFace) => (f.kind === 'text' ? f.text : f.label);
const valueOf = (q: SpelQuestion) => q.same ?? q.answer;
const choiceOf = (q: SpelQuestion): WaspChoice => ({ value: valueOf(q), text: faceText(answerFace(q)) });

/**
 * Three honey drops for one wasp sum: its answer and two others, shuffled. The others are the sum's own slips
 * (number content) or else the answers of the other sums played (a breuken comb has no slips of its own).
 */
export function waspChoices(q: SpelQuestion, others: readonly SpelQuestion[], rng: Rng, count = 3): WaspChoice[] {
    const right = choiceOf(q);
    const seen = new Set([right.value]);
    const out: WaspChoice[] = [right];
    const add = (c: WaspChoice) => { if (out.length < count && !seen.has(c.value)) { seen.add(c.value); out.push(c); } };
    for (const c of q.choices) if (/^\d+$/.test(c)) add(choiceOf({ ...q, answer: c, same: undefined, pair: undefined }));
    for (const o of shuffle(others, rng)) add(choiceOf(o));
    return shuffle(out, rng);
}

export type WaspVerdict = 'chased' | 'claimed';

/** The battle's outcome as soon as it is sure: `need` right chases the wasps off, one wrong too many lets them claim the nest. */
export function waspVerdict(results: readonly boolean[], rule: Pick<WaspRule, 'sums' | 'need'>): WaspVerdict | null {
    const right = results.filter(Boolean).length;
    const wrong = results.length - right;
    if (right >= rule.need) return 'chased';
    if (wrong > rule.sums - rule.need) return 'claimed';
    return null;
}

/** How many wasps have flown off so far: one per `perWasp` right in a battle of several (Onmogelijk). */
export const waspsGone = (results: readonly boolean[], rule: WaspRule) =>
    (rule.wasps > 1 ? Math.min(rule.wasps, Math.floor(results.filter(Boolean).length / WASP.perWasp)) : 0);
