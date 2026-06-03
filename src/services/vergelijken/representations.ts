import { digitAtPlace } from '../math/mathEngine';
import { formatMathNumber } from '../math/formatters';

// Representation of a value when comparing breuken & kommagetallen:
//  breuk        → n/10 or n/100 (unreduced, e.g. 6/10, 23/10)
//  kommagetal   → 5,4
//  plaatswaarde → place letters, e.g. 5E4t  (5 eenheden, 4 tienden)
//  woorden      → Dutch place words, e.g. "5 eenheden 4 tienden"
export type RepKind = 'breuk' | 'kommagetal' | 'plaatswaarde' | 'woorden';

export const REP_OPTIONS: Array<{ key: RepKind; label: string }> = [
    { key: 'breuk', label: 'Breuk' },
    { key: 'kommagetal', label: 'Kommagetal' },
    { key: 'plaatswaarde', label: 'Plaatswaarde (5E4t)' },
    { key: 'woorden', label: 'Woorden (5 tienden)' },
];

// High→low places used to decompose a value for the letter/word forms.
const REP_PLACES = [
    { key: 'D', w: 1000, sg: 'duizendtal', pl: 'duizendtallen' },
    { key: 'H', w: 100, sg: 'honderdtal', pl: 'honderdtallen' },
    { key: 'T', w: 10, sg: 'tiental', pl: 'tientallen' },
    { key: 'E', w: 1, sg: 'eenheid', pl: 'eenheden' },
    { key: 't', w: 0.1, sg: 'tiende', pl: 'tienden' },
    { key: 'h', w: 0.01, sg: 'honderdste', pl: 'honderdsten' },
];

// n/d over 10 or 100 (kept unreduced — keeps 6/10, 23/10 as on the worksheet).
export function asFraction(value: number): { n: number; d: number } {
    const hundredths = Math.round(value * 100);
    return hundredths % 10 === 0 ? { n: hundredths / 10, d: 10 } : { n: hundredths, d: 100 };
}

function plaatswaardeText(value: number): string {
    const parts = REP_PLACES
        .map(p => ({ p, digit: digitAtPlace(value, p.w) }))
        .filter(x => x.digit > 0)
        .map(x => `${x.digit}${x.p.key}`);
    return parts.length ? parts.join('') : '0';
}

function woordenText(value: number): string {
    const parts = REP_PLACES
        .map(p => ({ p, digit: digitAtPlace(value, p.w) }))
        .filter(x => x.digit > 0)
        .map(x => `${x.digit} ${x.digit === 1 ? x.p.sg : x.p.pl}`);
    return parts.length ? parts.join(' ') : '0';
}

// Non-fraction representations as plain text (breuk is rendered by <RepValue/>).
export function repText(value: number, rep: Exclude<RepKind, 'breuk'>): string {
    if (rep === 'kommagetal') return formatMathNumber(value);
    if (rep === 'plaatswaarde') return plaatswaardeText(value);
    return woordenText(value);
}
