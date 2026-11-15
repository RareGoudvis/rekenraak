import { formatSpelNumber, signChunks } from './spelFormat';
import type { SpelChoiceView, SpelVisual } from './content/pack';

// The non-component helpers of SpelVisual.tsx: how a choice is named and sized, and the sign's layout class.

/** How a choice's face looks, for the skin's own sizing class: a number, a short text ("08:15"), a phrase, a picture. */
export function faceKind(view: SpelChoiceView | undefined): 'number' | 'short' | 'words' | 'picture' {
    if (!view) return 'number';
    if (view.visual) return 'picture';
    return (view.text ?? '').length <= 5 ? 'short' : 'words';
}

/** The view of a choice value, or undefined for a plain number choice. */
export const viewFor = (choices: readonly string[] | null, views: readonly SpelChoiceView[] | null | undefined, value: string) =>
    views?.[choices?.indexOf(value) ?? -1];

/** The accessible name of a choice. */
export const choiceLabel = (value: string, view?: SpelChoiceView) => view?.label ?? formatSpelNumber(value);

/** The skin root's extra class when breuk pictures stand on the targets: they get bigger targets (≥ 120 px pictures). */
export const pictureClass = (views: readonly SpelChoiceView[] | null | undefined) => (views?.some(v => v.visual?.kind === 'breuk') ? ' has-breuk' : '');

/** A sign line too long for the big one-line sign (the tekst pack, leerjaar 6 sums): spelen.css shrinks and wraps it. */
export const signSize = (text: string | undefined): 'long' | undefined => ((text?.length ?? 0) > 18 ? 'long' : undefined);

/** The sign's extra class: a picture question lays out as a row; a rij of tiles is the whole question. */
export const signClass = (question: { visual?: SpelVisual } | null) => (question?.visual?.kind === 'rij' ? ' spel-sign-has-rij' : question?.visual ? ' spel-sign-has-pic' : '');

// Where a long Dutch number word may break on a small target: "honderd-tallen", "hoeveel-heid" (a soft hyphen, shown only when it breaks).
const MORPHEME = /(?<=\p{L}{4})(?=duizend|honderd(?!$)|tallen$|heid$)/gu;

/** A phrase face's text with soft hyphens in its long compound words. */
export const faceText = (text: string) => text.split(' ').map(w => (w.length >= 10 ? w.replace(MORPHEME, '\u00AD') : w)).join(' ');

/** The longest piece of a phrase face that never wraps (a word part, "2 u 15 min"), in characters: the skin's CSS fits the font to it. */
export function faceChars(view: SpelChoiceView | undefined): number {
    const pieces = signChunks(faceText(view?.text ?? '')).flatMap(c => (c.includes('\u00A0') ? [c] : c.split('\u00AD').map((p, i, all) => p + (i < all.length - 1 ? '-' : ''))));
    return Math.max(1, ...pieces.map(p => p.length));
}
