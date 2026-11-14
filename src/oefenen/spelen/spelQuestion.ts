import type { Equation } from '../../services/math/types';
import type { OefenType } from '../../services/oefenen/types';
import type { OefenExercise } from '../../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import type { ZelfChoice } from '../zelf/zelfSessie';
import { choicesOf, mulberry32, seedOf, type SumFacts } from './distractors';

// What a game may ask (prototype, owner 2026-11-14): hoofdrekenen + and − with natural numbers, leerjaar 1–3.
// Keyed by leaf: the same typeId also serves decimals and breuken, which have no game yet.
export const SPEL_LEAVES: Readonly<Record<string, SumFacts['op']>> = {
    'hr-std-optellen-nat': '+',
    'hr-std-aftrekken-nat': '-',
};

export const SPEL_MAX_GRADE = 3;

/** Whether a Zelf oefenen choice can be played as a game: every variant a + / − leaf above, at leerjaar 1–3. */
export function choiceCanPlay(choice: ZelfChoice, grade: number): boolean {
    return grade <= SPEL_MAX_GRADE && choice.vars.length > 0 && choice.vars.every(v => v.leafId in SPEL_LEAVES);
}

// One question of a game: the exercise exactly as the kiosk made it, plus what the skins show.
export interface SpelQuestion {
    slot: number;
    exercise: unknown;
    constraints: Record<string, unknown>;
    key: string;
    // "7 + 5 = ?", the kiosk's own display line.
    text: string;
    // The right answer as typed ("12"): skins never check, the session does.
    answer: string;
    facts: SumFacts;
    // Choice skins: the answer and three distractors, seeded by the exercise.
    choices: string[];
}

/** The game question for a made exercise, or null when it is not a plain whole-number + / − sum (the session draws again). */
export function spelQuestionOf(type: OefenType, slot: number, made: OefenExercise): SpelQuestion | null {
    const op = SPEL_LEAVES[type.leafId];
    const d = kioskFor(type.typeId);
    if (!op || !d || kioskInputOf(d, made.exercise, made.constraints) !== 'number') return null;
    const eq = made.exercise as Equation;
    if (eq.operands.length !== 2 || !eq.operands.every(o => typeof o === 'number')) return null;
    const answer = Number(d.answerOf(made.exercise, made.constraints)[0]);
    if (!Number.isInteger(answer) || answer < 0) return null;
    const facts: SumFacts = { answer, operands: eq.operands as number[], op };
    return {
        slot, exercise: made.exercise, constraints: made.constraints, key: made.key,
        text: d.display(made.exercise, made.constraints), answer: String(answer), facts,
        choices: choicesOf(facts, mulberry32(seedOf(made.key))).map(String),
    };
}
