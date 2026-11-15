import { formatMathNumber } from '../../services/math/formatters';
import { normaliseNumber } from '../../services/oefenen/check';
import type { SpelChoiceView } from './content/pack';

// How a game writes its values and question lines (owner 2026-11-15: "a very critical look at the way things are
// presented"): Flemish notation everywhere a pupil reads one: a decimal comma, a narrow space between thousands,
// the true minus, € with its cents, and a sign line that wraps between words, never inside a sum.

const MINUS = '−';

/** A number as the sheet prints it ("-9" → "−9", "1.5" or "1,5" → "1,5", "12000" → "12 000"); anything else as it is. */
export function formatSpelNumber(value: string): string {
    const n = normaliseNumber(value);
    return n === null ? value : formatMathNumber(n).replace('-', MINUS);
}

/** An amount in euros with its cents ("7.5" → "7,50"), the way a price tag reads. */
export function formatEuro(value: string): string {
    const n = normaliseNumber(value);
    return n === null ? value : formatMathNumber(Number(n).toFixed(2)).replace('-', MINUS);
}

// What a shown answer needs from its question: the choices, how each looks, and the line (a € on it = an amount).
export interface AnswerContext {
    text: string;
    choices: readonly string[];
    views?: readonly SpelChoiceView[] | null;
}

/** The view of a value among a question's choices, also when it was typed in another spelling ("7,5" for the choice "7.5"). */
export function viewOfValue(q: AnswerContext, value: string): SpelChoiceView | undefined {
    if (!q.views?.length) return undefined;
    let i = q.choices.indexOf(value);
    const n = i < 0 ? normaliseNumber(value) : null;
    if (n !== null) i = q.choices.findIndex(c => normaliseNumber(c) === n);
    return i < 0 ? undefined : q.views[i];
}

/**
 * The one way a game writes an answer, the right one or the given one (the sign's flash, the end screen):
 * a choice's own text ("half drie", "€ 7,50"), an amount with its cents, else the number in sheet notation.
 * A picture choice gives its label; draw it with <SpelChoiceFace> instead where pictures fit.
 */
export function answerTextOf(q: AnswerContext | null | undefined, value: string): string {
    if (value === '') return '';
    const view = q ? viewOfValue(q, value) : undefined;
    if (view) return view.text ?? view.label;
    if (q?.text.includes('€')) return formatEuro(value);
    return formatSpelNumber(value);
}

// A word that only means something glued to the number before it (6 cm, 25 %, −4 °C).
const UNIT = /^(mm|cm|dm|m|dam|hm|km|mm²|cm²|dm²|m²|km²|a|ha|ca|mg|cg|dg|g|dag|hg|kg|t|ton|ml|cl|dl|l|dal|hl|kl|°C|°|%|u|min|s|sec|dag|dagen)[.,:;!?)]*$/;
// An operator or relation: a sum never breaks next to one. The answer slot ? sticks to what stands before it.
const OP = /^[+\-−×x:=≈<>≤≥…/]$/;
/** An operator or relation word ("+", "=", "≈"): its chunk is a sum, which never wraps. */
export const isOperator = (w: string) => OP.test(w);
const SLOT = /^\?[.,:;!)]*$/;
const NUMBERISH = /^[(−-]?[\d?][\d\u202F\u00A0,./]*[A-Za-z]?[.,:;)]*$/;

/**
 * A sign line cut where it may wrap: between words, never inside "7 + 5 = ?", between a number and its unit, or after
 * € (so "Je krijgt € ? terug." breaks before "terug", not after "€"), or inside "11 u 12 min". Join the parts with a space, each one nowrap.
 */
export function signChunks(text: string): string[] {
    const words = text.split(' ').filter(w => w !== '');
    const out: string[] = [];
    for (const w of words) {
        const prev = out.length ? out[out.length - 1].split(/[ \u00A0]/).pop()! : null;
        const glue = prev !== null && (OP.test(w) || SLOT.test(w) || OP.test(prev) || prev === '€' || (UNIT.test(w) && NUMBERISH.test(prev)) || (UNIT.test(prev) && NUMBERISH.test(w)));
        if (glue) out[out.length - 1] += `\u00A0${w}`;
        else out.push(w);
    }
    return out;
}

// A row of number tiles (getallenrij, patroon): how it folds. one = always one row; fold = two rows on a narrow screen;
// two = two rows everywhere (a leerjaar 6 row of big numbers never fits one line).
export type RijFold = 'one' | 'fold' | 'two';

/** How a row of tiles folds, from how much it holds (characters, plus a tile's own padding). */
export function rijFoldOf(items: readonly string[]): RijFold {
    const width = items.reduce((sum, s) => sum + s.length + 1.5, 0);
    return width <= 18 ? 'one' : width <= 34 ? 'fold' : 'two';
}

/** The plain line a row reads as where tiles cannot stand (a skin's own text sign, aria): "3, 4, ?, 6"; with kommagetallen "0,5; 1; ?". */
export const rijText = (items: readonly string[]) => items.join(items.some(s => s.includes(',')) ? '; ' : ', ');
