import type { Equation } from '../../services/math/types';
import type { OefenType } from '../../services/oefenen/types';
import type { OefenExercise } from '../../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import type { ZelfChoice } from '../zelf/zelfSessie';
import { choicesOf, mulberry32, seedOf, type SumFacts } from './distractors';
import { NUMBER_CONTENT, PICTURE_CONTENT, type SpelContent } from './accepts';
import type { AnswerKind } from './skins/types';
import type { KioskAnswer } from '../../services/oefenen/types';
import type { SpelChoiceView, SpelHelp, SpelVisual } from './content/pack';
import { packFor } from './content/packs';
import { answerCharsOf } from './answerChars';

// What a game may ask (owner 2026-11-14): hoofdrekenen + − (leerjaar 1–3) and × : (leerjaar 1–4) with natural numbers.
// Keyed by leaf: the same typeId also serves decimals and breuken, which have no game yet.
export const SPEL_LEAVES: Readonly<Record<string, SumFacts['op']>> = {
    'hr-std-optellen-nat': '+',
    'hr-std-aftrekken-nat': '-',
    'hr-std-vermenigvuldigen-nat': 'x',
    'hr-std-delen-nat': ':',
};

// Deling met rest has two answers (quotiënt and rest): no game takes a pair yet.
const playableNumber = (v: ZelfChoice['vars'][number]) => v.leafId in SPEL_LEAVES && v.ov?.multiplicationMode !== 'met_rest';
// Or a content pack's leaf (content/packs.ts: the klok).
const playableVariant = (v: ZelfChoice['vars'][number]) => playableNumber(v) || !!packFor(v.leafId);

export const SPEL_MAX_GRADE = 3;
// × and : also play in leerjaar 4 (owner 2026-11-14: × / : 1000, E × DHTE); + and − stay at 3 until their leerjaar-4 cards are reviewed.
export const SPEL_MAX_GRADE_MULDIV = 4;

const isMulDiv = (v: ZelfChoice['vars'][number]) => SPEL_LEAVES[v.leafId] === 'x' || SPEL_LEAVES[v.leafId] === ':';

/** Whether a Zelf oefenen choice can be played as a game: every variant a leaf above (no met rest), at leerjaar 1–3 (× and : alone: 1–4). */
export function choiceCanPlay(choice: ZelfChoice, grade: number): boolean {
    if (!choice.vars.length || !choice.vars.every(playableVariant)) return false;
    return grade <= (choice.vars.every(isMulDiv) ? SPEL_MAX_GRADE_MULDIV : SPEL_MAX_GRADE);
}

/** What a playable choice asks of a game (the picker filters on it): whole numbers with their operations and answer length, or picture choices once a pack plays a variant. */
export const spelContentOf = (choice: ZelfChoice, grade: number): SpelContent | null =>
    (!choiceCanPlay(choice, grade) ? null
        : choice.vars.every(playableNumber) ? {
            ...NUMBER_CONTENT,
            ops: [...new Set(choice.vars.map(v => SPEL_LEAVES[v.leafId]))],
            answerChars: answerCharsOf(choice.vars, v => SPEL_LEAVES[v.leafId]),
        }
        : PICTURE_CONTENT);

// One question of a game: the exercise exactly as the kiosk made it, plus what the skins show.
export interface SpelQuestion {
    slot: number;
    exercise: unknown;
    constraints: Record<string, unknown>;
    key: string;
    // The answer kind (accepts.ts): what a skin must be able to take.
    kind: AnswerKind;
    // "7 + 5 = ?", the kiosk's own display line.
    text: string;
    // The right answer as typed ("12"): skins never check, the session does.
    answer: string;
    // Number sums only (the help's counting tip); absent on pack questions.
    facts?: SumFacts;
    // Choice skins: the answer and its distractors (choiceCount in all, default 4), seeded by the exercise.
    choices: string[];
    // Pack questions (content/pack.ts): the sign's picture, how each choice looks, what the kiosk check gets per choice, the help tip.
    visual?: SpelVisual;
    views?: SpelChoiceView[];
    kioskAnswers?: KioskAnswer[];
    help?: SpelHelp;
}

/** The game question for a made exercise (a pack's, or a plain whole-number + − × : sum), or null when it has none (the session draws again). */
export function spelQuestionOf(type: OefenType, slot: number, made: OefenExercise, choiceCount = 4): SpelQuestion | null {
    const pack = packFor(type.leafId);
    if (pack) {
        const q = pack.question(type, made, choiceCount);
        return q && { slot, exercise: made.exercise, constraints: made.constraints, key: made.key, kind: 'choice', ...q };
    }
    const op = SPEL_LEAVES[type.leafId];
    const d = kioskFor(type.typeId);
    if (!op || !d || kioskInputOf(d, made.exercise, made.constraints) !== 'number') return null;
    const eq = made.exercise as Equation;
    if (eq.operands.length !== 2 || !eq.operands.every(o => typeof o === 'number')) return null;
    const answer = Number(d.answerOf(made.exercise, made.constraints)[0]);
    if (!Number.isInteger(answer) || answer < 0) return null;
    const facts: SumFacts = { answer, operands: eq.operands as number[], op };
    return {
        slot, exercise: made.exercise, constraints: made.constraints, key: made.key, kind: 'number',
        text: d.display(made.exercise, made.constraints), answer: String(answer), facts,
        choices: choicesOf(facts, mulberry32(seedOf(made.key)), choiceCount).map(String),
    };
}
