import { digitAtPlace, PLACE_VALUES } from '../math/mathEngine';
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

// Singular place names ("1 tiental"); the plural is PLACE_VALUES' own label ("3 tientallen").
const SINGULAR: Record<string, string> = {
    Mrd: 'miljard', HM: 'honderdmiljoen', TM: 'tienmiljoen', M: 'miljoen',
    HD: 'honderdduizendtal', TD: 'tienduizendtal', D: 'duizendtal', H: 'honderdtal',
    T: 'tiental', E: 'eenheid', t: 'tiende', h: 'honderdste',
};

// High→low places used to decompose a value for the letter/word forms: every natural place up
// to Mrd (the old D…E list dropped a TD+ digit) and the two decimals the representaties draw.
const REP_PLACES = PLACE_VALUES
    .filter(p => SINGULAR[p.key])
    .map(p => ({ key: p.key, w: p.weight, sg: SINGULAR[p.key], pl: p.label.toLowerCase() }));

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
