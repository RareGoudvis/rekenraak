import type { Equation } from '../../services/math/types';
import type { OefenType } from '../../services/oefenen/types';
import type { OefenExercise } from '../../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import type { ZelfChoice } from '../zelf/zelfSessie';
import { choicesOf, mulberry32, seedOf, type SumFacts } from './distractors';
import { NUMBER_CONTENT, PICTURE_CONTENT, type SpelContent } from './accepts';
import type { AnswerKind } from './skins/types';
import type { KioskAnswer } from '../../services/oefenen/types';
import type { SpelChoiceView, SpelHelp, SpelPackBoard, SpelVisual } from './content/pack';
import { packFor } from './content/packs';
import { answerCharsOf } from './answerChars';

// What a game may ask (owner 2026-11-14): hoofdrekenen + − (leerjaar 1–3) and × : (leerjaar 1–4) with natural numbers;
// content packs (the klok, the breuken to leerjaar 4) beside them.
// Keyed by leaf: the same typeId also serves decimals and breuken, which have no game yet.
export const SPEL_LEAVES: Readonly<Record<string, SumFacts['op']>> = {
    'hr-std-optellen-nat': '+',
    'hr-std-aftrekken-nat': '-',
    'hr-std-vermenigvuldigen-nat': 'x',
    'hr-std-delen-nat': ':',
};

// Deling met rest has two answers (quotiënt and rest): no game takes a pair yet.
const playableNumber = (v: ZelfChoice['vars'][number]) => v.leafId in SPEL_LEAVES && v.ov?.multiplicationMode !== 'met_rest';
// Or a content pack's leaf whose card settings the pack plays (content/packs.ts: the klok, the breuken).
const packPlays = (v: ZelfChoice['vars'][number]) => { const p = packFor(v.leafId); return !!p && (p.plays?.(v) ?? true); };
const playableVariant = (v: ZelfChoice['vars'][number]) => playableNumber(v) || packPlays(v);

export const SPEL_MAX_GRADE = 3;
// × and : also play in leerjaar 4 (owner 2026-11-14: × / : 1000, E × DHTE); + and − stay at 3 until their leerjaar-4 cards are reviewed.
export const SPEL_MAX_GRADE_MULDIV = 4;

const isMulDiv = (v: ZelfChoice['vars'][number]) => SPEL_LEAVES[v.leafId] === 'x' || SPEL_LEAVES[v.leafId] === ':';
// How far a variant plays: a pack its own maxGrade (the breuken: 4), × and : to 4, + and − to 3.
const maxGradeOf = (v: ZelfChoice['vars'][number]) => packFor(v.leafId)?.maxGrade ?? (isMulDiv(v) ? SPEL_MAX_GRADE_MULDIV : SPEL_MAX_GRADE);
const playsAt = (v: ZelfChoice['vars'][number], grade: number) => playableVariant(v) && grade <= maxGradeOf(v);

/**
 * The variants a game plays of a Zelf oefenen choice: all of them when every one plays at this leerjaar, else
 * the part a `partial` pack plays (Breuken vergelijken without its getallenas card); board = only those that fill
 * that board round (numbers fill every board). [] = no game.
 */
export function spelVarsOf(choice: ZelfChoice, grade: number, board?: SpelPackBoard): ZelfChoice['vars'] {
    let vars = choice.vars.length > 0 && choice.vars.every(v => playsAt(v, grade)) ? choice.vars : [];
    if (!vars.length) {
        const part = choice.vars.filter(v => packFor(v.leafId)?.partial && playsAt(v, grade));
        if (new Set(part.map(v => packFor(v.leafId))).size === 1) vars = part;
    }
    if (board) vars = vars.filter(v => playableNumber(v) || (packFor(v.leafId)?.boardsOf?.(v) ?? []).includes(board));
    return vars;
}

/** The choice as a game plays it (spelVarsOf). */
export const spelChoiceOf = (choice: ZelfChoice, grade: number, board?: SpelPackBoard): ZelfChoice => ({ ...choice, vars: spelVarsOf(choice, grade, board) });

/** Whether a Zelf oefenen choice can be played as a game: + − to leerjaar 3, × : to 4 (no met rest), or a pack's part (spelVarsOf). */
export function choiceCanPlay(choice: ZelfChoice, grade: number): boolean {
    return spelVarsOf(choice, grade).length > 0;
}

/** What a playable choice asks of a game (the picker filters on it): whole numbers with their operations and answer length, or picture choices once a pack plays a variant (with the board rounds it fills). */
export function spelContentOf(choice: ZelfChoice, grade: number): SpelContent | null {
    const vars = spelVarsOf(choice, grade);
    if (!vars.length) return null;
    if (vars.every(playableNumber)) {
        return { ...NUMBER_CONTENT, ops: [...new Set(vars.map(v => SPEL_LEAVES[v.leafId]))], answerChars: answerCharsOf(vars, v => SPEL_LEAVES[v.leafId]) };
    }
    const boards = [...new Set(vars.flatMap(v => packFor(v.leafId)?.boardsOf?.(v) ?? []))];
    return boards.length ? { ...PICTURE_CONTENT, boards } : PICTURE_CONTENT;
}

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
    // Board rounds (content/pack.ts): a memory pair's two cards, and the value that makes two answers one.
    pair?: { sum: SpelChoiceView; answer: SpelChoiceView };
    same?: string;
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
