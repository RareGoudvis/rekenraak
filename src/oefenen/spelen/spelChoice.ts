import { formatMathNumber } from '../../services/math/formatters';
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
export const choiceLabel = (value: string, view?: SpelChoiceView) => view?.label ?? formatMathNumber(Number(value));

/** The skin root's extra class when breuk pictures stand on the targets: they get bigger targets (≥ 120 px pictures). */
export const pictureClass = (views: readonly SpelChoiceView[] | null | undefined) => (views?.some(v => v.visual?.kind === 'breuk') ? ' has-breuk' : '');

/** A sign line too long for the big one-line sign (the tekst pack, leerjaar 6 sums): spelen.css shrinks and wraps it. */
export const signSize = (text: string | undefined): 'long' | undefined => ((text?.length ?? 0) > 18 ? 'long' : undefined);

/** The sign's extra class: a picture question lays out as a row. */
export const signClass = (question: { visual?: SpelVisual } | null) => (question?.visual ? ' spel-sign-has-pic' : '');
