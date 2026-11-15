import type { Rng } from '../../distractors';
import type { SpelQuestion } from '../../spelQuestion';
import { answerFace, type BoardCell, type BoardFace } from '../board';

// Honingraat's own rules beside the session's (board/session.ts): which scene a board plays in, when the
// wasp comes (Moeilijk) and how its challenge is scored. Pure: Honingraat.tsx draws, this decides.

// Board 1, 3, 5 … are a honeycomb, 2, 4 … a flower meadow (owner 2026-11-15): the same cells as flowers.
export type HiveView = 'comb' | 'meadow';
export const viewAt = (index: number): HiveView => (index % 2 === 0 ? 'comb' : 'meadow');

// Moeilijk: a round of five boards (the registry's option), a wasp of 5 sums, 4 right chases it off.
export const MOEILIJK_BOARDS = 5;
export const WASP = { sums: 5, need: 4, chance: 0.5 } as const;
// How long a pick shows before the next sum, and the verdict before the comb comes back or the round ends.
export const WASP_MS = { right: 700, wrong: 1400, chased: 2000, claimed: 2600 } as const;

/**
 * After how many filled boards a wasp attacks (it greets the next board): after the second always, later now and
 * then. Only before a comb (the nest), never two in a row, never after the last board (the round ends there).
 */
export function waspSchedule(boards: number, rng: Rng): number[] {
    const out: number[] = [];
    // Before board index `filled`; even = a comb, and a step of two leaves a calm board between two wasps.
    for (let filled = 2; filled < boards; filled += 2) {
        if (filled === 2 || rng() < WASP.chance) out.push(filled);
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

/**
 * The wasp's five sums, from the boards already played: first the cells nobody tapped (their answer was never
 * shown), then the wrong taps, then the filled ones (their answer is the old target). No sum twice.
 */
export function waspSums(cells: readonly BoardCell[], rng: Rng, count: number = WASP.sums): SpelQuestion[] {
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

/** The challenge's outcome as soon as it is sure: 4 right chases the wasp off, a second wrong one lets it claim the nest. */
export function waspVerdict(results: readonly boolean[]): WaspVerdict | null {
    const right = results.filter(Boolean).length;
    const wrong = results.length - right;
    if (right >= WASP.need) return 'chased';
    if (wrong > WASP.sums - WASP.need) return 'claimed';
    return null;
}
