import type { Equation } from '../../services/math/types';
import type { OefenType } from '../../services/oefenen/types';
import type { OefenExercise } from '../../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import type { ZelfChoice } from '../zelf/zelfSessie';
import { choicesOf, mulberry32, numberChoicesOf, seedOf, type SumFacts } from './distractors';
import { keysOfAll, NUMBER_CONTENT, PICTURE_CONTENT, skinsFor, type SpelContent, type SpelKey } from './accepts';
import { normaliseNumber } from '../../services/oefenen/check';
import { SKINS } from './skins/registry';
import type { AnswerKind } from './skins/types';
import type { KioskAnswer } from '../../services/oefenen/types';
import type { SpelChoiceView, SpelHelp, SpelPackBoard, SpelVisual } from './content/pack';
import { packFor } from './content/packs';
import { answerCharsOf } from './answerChars';

// What a game may ask: hoofdrekenen + − × : with natural numbers in every leerjaar (owner 2026-11-15; on 2026-11-14
// it was + − to leerjaar 3 and × : to 4), and the content packs beside them (the klok, the breuken, the tekst pack).
// Keyed by leaf: the same typeId also serves decimals (the tekst pack) and breuken, which play otherwise or not at all.
export const SPEL_LEAVES: Readonly<Record<string, SumFacts['op']>> = {
    'hr-std-optellen-nat': '+',
    'hr-std-aftrekken-nat': '-',
    'hr-std-vermenigvuldigen-nat': 'x',
    'hr-std-delen-nat': ':',
};

// Deling met rest has two answers (quotiënt and rest): no game takes a pair yet.
const playableNumber = (v: ZelfChoice['vars'][number]) => v.leafId in SPEL_LEAVES && v.ov?.multiplicationMode !== 'met_rest';
// Or a content pack's leaf whose card settings the pack plays (content/packs.ts: the klok, the breuken, the tekst pack).
const packPlays = (v: ZelfChoice['vars'][number]) => { const p = packFor(v.leafId); return !!p && (p.plays?.(v) ?? true); };
const playableVariant = (v: ZelfChoice['vars'][number]) => playableNumber(v) || packPlays(v);

// Whole-number sums play to leerjaar 6: answers up to 10 digits (SpelKeypad takes 12; answerChars hides the small targets).
export const SPEL_MAX_GRADE = 6;
// The 2026-11-14 split is gone: × and : reach as far as + and −.
export const SPEL_MAX_GRADE_MULDIV = SPEL_MAX_GRADE;
// A pack without its own maxGrade (the klok) plays to leerjaar 3, as it did before the sums went further.
export const PACK_MAX_GRADE = 3;

// How far a variant plays: a pack its own maxGrade (the breuken 4, the tekst pack 6) or PACK_MAX_GRADE; the sums SPEL_MAX_GRADE.
const maxGradeOf = (v: ZelfChoice['vars'][number]) => { const p = packFor(v.leafId); return p ? p.maxGrade ?? PACK_MAX_GRADE : SPEL_MAX_GRADE; };
const playsAt = (v: ZelfChoice['vars'][number], grade: number) => playableVariant(v) && grade <= maxGradeOf(v);
// A tekst pack variant (contentOf): numbers or words on the sign, which mix with plain sums in one content.
const isTekst = (v: ZelfChoice['vars'][number]) => !!packFor(v.leafId)?.contentOf;

/**
 * The variants a game plays of a Zelf oefenen choice: all of them when every one plays at this leerjaar, else
 * the part the `partial` packs play (Breuken vergelijken without its getallenas card; a tekst-only part takes the
 * choice's plain sums along); board = only those that fill that board round (numbers fill every board). [] = no game.
 */
export function spelVarsOf(choice: ZelfChoice, grade: number, board?: SpelPackBoard): ZelfChoice['vars'] {
    let vars = choice.vars.length > 0 && choice.vars.every(v => playsAt(v, grade)) ? choice.vars : [];
    if (!vars.length) {
        const part = choice.vars.filter(v => packFor(v.leafId)?.partial && playsAt(v, grade));
        // One picture pack at most (the tekst pack joins any: Breuken herkennen beside "2/3 van 18").
        const pictured = new Set(part.filter(v => !isTekst(v)).map(v => packFor(v.leafId)));
        if (part.length && pictured.size <= 1) {
            vars = part.every(isTekst) ? choice.vars.filter(v => part.includes(v) || (playableNumber(v) && playsAt(v, grade))) : part;
        }
    }
    // A mix no game holds (long numbers beside words, which only tap): the part a keypad game
    // takes, else the word part (< = > without the long numbers to tap), else the variants short enough to tap.
    if (vars.length && !fits(vars)) {
        const content = (v: ZelfChoice['vars'][number]) => (isTekst(v) ? packFor(v.leafId)!.contentOf!(v) : null);
        const typed = vars.filter(v => playableNumber(v) || content(v)?.kind === 'number');
        const words = vars.filter(v => content(v)?.kind === 'choice' && content(v)?.answerChars === undefined);
        const short = vars.filter(v => fits([v]));
        vars = [typed, words, short].find(part => part.length > 0 && fits(part)) ?? vars;
    }
    if (board) vars = vars.filter(v => playableNumber(v) || (packFor(v.leafId)?.boardsOf?.(v) ?? []).includes(board));
    return vars;
}

/** The choice as a game plays it (spelVarsOf). */
export const spelChoiceOf = (choice: ZelfChoice, grade: number, board?: SpelPackBoard): ZelfChoice => ({ ...choice, vars: spelVarsOf(choice, grade, board) });

/** Whether a Zelf oefenen choice can be played as a game: it has playable variants (spelVarsOf) and at least one game takes them. */
export function choiceCanPlay(choice: ZelfChoice, grade: number): boolean {
    const vars = spelVarsOf(choice, grade);
    // A mix of words and long numbers fits no game: then there is none to offer.
    return vars.length > 0 && fits(vars);
}

// Some game takes these variants' content.
const fits = (vars: ZelfChoice['vars']) => skinsFor(SKINS, contentOfVars(vars)).length > 0;

const numberContentOf = (vars: ZelfChoice['vars']): SpelContent =>
    ({ ...NUMBER_CONTENT, ops: [...new Set(vars.map(v => SPEL_LEAVES[v.leafId]))], answerChars: answerCharsOf(vars, v => SPEL_LEAVES[v.leafId]) });

// Several variants' content as one: numbers only when all are; the longest answer (unknown when one number's is);
// the boards every part fills (a part without boards fills all); the operations when every part is a plain sum.
function mergeContent(parts: readonly SpelContent[]): SpelContent {
    const kind = parts.every(p => p.kind === 'number') ? 'number' : 'choice';
    // A word answer has no length (its face sizes itself); a number without one is unknown.
    const numbers = parts.filter(p => p.kind === 'number' || p.answerChars !== undefined);
    const chars = numbers.some(p => p.answerChars === undefined) || !numbers.length ? undefined : Math.max(...numbers.map(p => p.answerChars!));
    const named = parts.filter(p => p.boards);
    const boards = named.length ? named.reduce<readonly SpelPackBoard[]>((acc, p) => acc.filter(b => p.boards!.includes(b)), named[0].boards!) : undefined;
    const ops = parts.every(p => p.ops) ? [...new Set(parts.flatMap(p => p.ops!))] : undefined;
    const keys = keysOfAll(parts);
    return {
        kind,
        ...(kind === 'number' && keys.length > 0 && { keys }),
        ...(chars !== undefined && { answerChars: chars }),
        ...(kind === 'number' && parts.every(p => p.digitsOnly) && { digitsOnly: true }),
        ...(ops && { ops }),
        ...(boards && { boards }),
    };
}

/**
 * What a playable choice asks of a game (the picker filters on it): whole-number sums with their operations and answer
 * length; numbers or words on the sign (the tekst pack, maybe beside sums); or picture choices once a pack plays a
 * variant (with the board rounds it fills).
 */
export function spelContentOf(choice: ZelfChoice, grade: number): SpelContent | null {
    const vars = spelVarsOf(choice, grade);
    return vars.length ? contentOfVars(vars) : null;
}

/** The keys a game keypad shows for this choice (a comma, a minus), the same for every question of the round. */
export function spelKeysOf(choice: ZelfChoice, grade: number): readonly SpelKey[] {
    const content = spelContentOf(choice, grade);
    return content?.kind === 'number' ? content.keys ?? [] : [];
}

function contentOfVars(vars: ZelfChoice['vars']): SpelContent {
    if (vars.every(playableNumber)) return numberContentOf(vars);
    if (vars.every(v => playableNumber(v) || isTekst(v))) {
        const sums = vars.filter(playableNumber);
        return mergeContent([...(sums.length ? [numberContentOf(sums)] : []), ...vars.filter(isTekst).map(v => packFor(v.leafId)!.contentOf!(v))]);
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
    // Plain two-term sums only (the help's counting tip); absent on pack questions.
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

/** What the kiosk check gets for a given answer: a pack choice's own kiosk form (a typed "1,50" is the choice 1.5), else the answer as given. */
export function kioskAnswerOf(q: Pick<SpelQuestion, 'kind' | 'choices' | 'kioskAnswers'>, given: string): KioskAnswer {
    const g = given.trim();
    let i = q.choices.indexOf(g);
    const n = i < 0 && q.kind === 'number' ? normaliseNumber(g) : null;
    if (n !== null) i = q.choices.findIndex(c => normaliseNumber(c) === n);
    return q.kioskAnswers?.[i] ?? g;
}

/** The game question for a made exercise (a pack's, or a whole-number + − × : sum), or null when it has none (the session draws again). */
export function spelQuestionOf(type: OefenType, slot: number, made: OefenExercise, choiceCount = 4): SpelQuestion | null {
    const pack = packFor(type.leafId);
    if (pack) {
        const q = pack.question(type, made, choiceCount);
        if (!q) return null;
        // A tekst number has no views: its targets show the plain number (a skin reads views as "pictures").
        const { views, kioskAnswers, ...own } = q;
        return { slot, exercise: made.exercise, constraints: made.constraints, key: made.key, kind: 'choice', ...own, ...(views.length > 0 && { views, kioskAnswers }) };
    }
    const op = SPEL_LEAVES[type.leafId];
    const d = kioskFor(type.typeId);
    if (!op || !d) return null;
    const input = kioskInputOf(d, made.exercise, made.constraints);
    if (input !== 'number' && input !== 'missing-operand') return null;
    const eq = made.exercise as Equation;
    if (eq.operands.length < 2 || !eq.operands.every(o => typeof o === 'number')) return null;
    const answer = Number(d.answerOf(made.exercise, made.constraints)[0]);
    if (!Number.isInteger(answer) || answer < 0) return null;
    const base = { slot, exercise: made.exercise, constraints: made.constraints, key: made.key, kind: 'number' as const, text: d.display(made.exercise, made.constraints), answer: String(answer) };
    const rng = mulberry32(seedOf(made.key));
    // A plain two-term sum keeps its own slips and the counting tip; a 3-term sum (Handig rekenen) or a puntoefening the number slips.
    if (input === 'missing-operand' || eq.operands.length > 2) return { ...base, choices: numberChoicesOf(answer, rng, choiceCount).map(String) };
    const facts: SumFacts = { answer, operands: eq.operands as number[], op };
    return { ...base, facts, choices: choicesOf(facts, rng, choiceCount).map(String) };
}
