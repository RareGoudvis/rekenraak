import type { AnswerKind, SkinAccepts, SkinMeta } from './skins/types';
import type { SpelPackBoard } from './content/pack';

// Which games fit the chosen content. Pure: the picker shows only the skins that accept it, the rest stay
// out of sight (never "binnenkort").

// The extra keys a game keypad can show beside the digits: the comma of a kommagetal, a minus.
export type SpelKey = ',' | '-';
const KEY_ORDER: readonly SpelKey[] = [',', '-'];

// What a Zelf oefenen choice asks of a game.
export interface SpelContent {
    kind: AnswerKind;
    // The longest answer it can have, in characters ("100" = 3); absent = unknown, taken as fitting.
    answerChars?: number;
    // Every answer is plain digits (no comma, fraction or sign): a digit-by-digit skin can play it.
    digitsOnly?: boolean;
    // A number content's keypad keys beside the digits (some answer has a comma, some a minus); absent = digits only.
    keys?: readonly SpelKey[];
    // The operations its sums use; absent = unknown, taken as fitting.
    ops?: readonly ('+' | '-' | 'x' | ':')[];
    // The question and its choices are pictures or phrases (a content pack: the klok): only a skin that draws <SpelVisual>.
    pictures?: boolean;
    // The board rounds its cards fill (the breuken: memory pairs, the equivalence comb). Absent = none for pictures, every board for number sums.
    boards?: readonly SpelPackBoard[];
    // The longest word on a target (Frans: "choisissez" = 10); absent = unknown, taken as fitting.
    wordChars?: number;
}

// Whole-number + − × : sums (SPEL_LEAVES).
export const NUMBER_CONTENT: SpelContent = { kind: 'number', digitsOnly: true };

// A content pack's choices (content/packs.ts): a clock face asks, faces / times / phrases answer.
export const PICTURE_CONTENT: SpelContent = { kind: 'choice', pictures: true };

// The choice pad (SpelChoicePad): a keypad game shows the exercise's own choices as big word buttons, 2 × 3.
export const PAD_CHOICES = 6;
// The longest word a pad button keeps on one line at 844×390 in a duel half (measured 2026-11-18: Frans "réussissent" = 11).
export const PAD_MAX_WORD_CHARS = 13;

/** Whether a pad skin plays this content through the pad: words only (no pictures, no numbers to type), short enough. */
export const padPlays = (accepts: SkinAccepts, content: SpelContent): boolean =>
    !!accepts.pad && content.kind === 'choice' && !content.pictures && content.answerChars === undefined && (content.wordChars ?? 0) <= PAD_MAX_WORD_CHARS;

/** Whether a skin can play this content: its answer kind, short enough answers, digits where the skin needs them. */
export function skinAccepts(accepts: SkinAccepts, content: SpelContent): boolean {
    if (!accepts.kinds.includes(content.kind) && !padPlays(accepts, content)) return false;
    if (accepts.maxAnswerChars !== undefined && content.answerChars !== undefined && content.answerChars > accepts.maxAnswerChars) return false;
    if (accepts.digits && !content.digitsOnly) return false;
    if (accepts.maxWordChars !== undefined && content.wordChars !== undefined && content.wordChars > accepts.maxWordChars) return false;
    if (accepts.ops && content.ops && !content.ops.every(op => accepts.ops!.includes(op))) return false;
    if (content.pictures && !accepts.pictures) return false;
    // A board skin plays picture content only when its cards fill that board (the klok fills none).
    if (content.pictures && accepts.board && !content.boards?.includes(accepts.board)) return false;
    // Other content that names its boards (the tekst pack: none) fills only those.
    if (accepts.board && content.boards && !content.boards.includes(accepts.board)) return false;
    return true;
}

/** The keys several contents need together, in keypad order. */
export const keysOfAll = (parts: readonly SpelContent[]): SpelKey[] => KEY_ORDER.filter(k => parts.some(p => p.keys?.includes(k)));

/** The skins (registry order) that can play this content. */
export const skinsFor = <T extends { meta: SkinMeta }>(skins: readonly T[], content: SpelContent): T[] =>
    skins.filter(s => skinAccepts(s.meta.accepts, content));
