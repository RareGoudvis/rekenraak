import type { AnswerKind, SkinAccepts, SkinMeta } from './skins/types';

// Which games fit the chosen content. Pure: the picker shows only the skins that accept it, the rest stay
// out of sight (never "binnenkort"). Today every playable card is whole-number + and −, so nothing is hidden.

// What a Zelf oefenen choice asks of a game.
export interface SpelContent {
    kind: AnswerKind;
    // The longest answer it can have, in characters ("100" = 3); absent = unknown, taken as fitting.
    answerChars?: number;
    // Every answer is plain digits (no comma, fraction or sign): a digit-by-digit skin can play it.
    digitsOnly?: boolean;
}

// Whole-number + and − (SPEL_LEAVES): the only content games have today.
export const NUMBER_CONTENT: SpelContent = { kind: 'number', digitsOnly: true };

/** Whether a skin can play this content: its answer kind, short enough answers, digits where the skin needs them. */
export function skinAccepts(accepts: SkinAccepts, content: SpelContent): boolean {
    if (!accepts.kinds.includes(content.kind)) return false;
    if (accepts.maxAnswerChars !== undefined && content.answerChars !== undefined && content.answerChars > accepts.maxAnswerChars) return false;
    if (accepts.digits && !content.digitsOnly) return false;
    return true;
}

/** The skins (registry order) that can play this content. */
export const skinsFor = <T extends { meta: SkinMeta }>(skins: readonly T[], content: SpelContent): T[] =>
    skins.filter(s => skinAccepts(s.meta.accepts, content));
