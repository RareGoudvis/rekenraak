import type { WordList, WordPair } from './woorden';

// French numbers 0 to 100 as word lists (woorden.ts), in the traditional spelling (no 1990 reform): hyphens between
// tens and units, "et" only before un and onze (vingt et un … soixante et onze), never a hyphen around "et";
// quatre-vingts takes its s only when it ends the number. 70 and 90 come in two forms (owner 2026-11-18): France
// (soixante-dix, quatre-vingt-dix) and Belgium (septante, nonante); 80 is quatre-vingts in both.
// frans.getallen.test.ts checks every number against a hand-written table.

const UNITS = [
    'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS: Readonly<Record<number, string>> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante', 7: 'septante', 9: 'nonante' };

// A regular tens word plus its units: trente, trente et un, trente-deux.
const regular = (tens: string, u: number) => (u === 0 ? tens : u === 1 ? `${tens} et un` : `${tens}-${UNITS[u]}`);

export type NumberForm = 'fr' | 'be';

/** A number 0 to 100 in French words; `form` matters only from 70 to 79 and 90 to 99. */
export function frenchNumber(n: number, form: NumberForm = 'fr'): string {
    if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error(`Frans: no number word for ${n}`);
    if (n < 20) return UNITS[n];
    if (n === 100) return 'cent';
    const t = Math.floor(n / 10), u = n % 10;
    if (t <= 6) return regular(TENS[t], u);
    if (t === 7) return form === 'be' ? regular(TENS[7], u) : n === 71 ? 'soixante et onze' : `soixante-${UNITS[n - 60]}`;
    if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u]}`;
    return form === 'be' ? regular(TENS[9], u) : `quatre-vingt-${UNITS[n - 80]}`;
}

const pairOf = (n: number): WordPair => {
    const fr = frenchNumber(n, 'fr');
    const be = frenchNumber(n, 'be');
    return { fr, nl: String(n), ...(be !== fr && { alt: be }) };
};

// The distractors closest to n, in tiers: first the traps (ten more or less; 17 beside 70 and 77, the tens 60 to 90
// among each other; 27 beside 72), then the neighbours and the rest of its tens.
function nearValues(n: number): number[][] {
    const traps = [n - 10, n + 10];
    const t = Math.floor(n / 10), u = n % 10;
    // dix-sept hides in soixante-dix-sept and quatre-vingt-dix-sept; soixante-dix says dix.
    if (n >= 16 && n <= 19) traps.push(n * 10 - 100, n + 60, n + 80);
    if (u === 0 && t >= 6 && t <= 9) traps.push(10 + t, 60, 70, 80, 90);
    if (t === 7) traps.push(n - 60);
    if (t === 9) traps.push(n - 80);
    if (n >= 12 && n <= 99 && u !== 0 && u !== t) traps.push(u * 10 + t);
    const close = [n - 1, n + 1, n - 2, n + 2, ...Array.from({ length: 10 }, (_, i) => t * 10 + i)];
    return [traps, close];
}

function numberList(id: string, values: readonly number[], allHelp = false): WordList {
    const at = (v: number) => values.indexOf(v);
    return {
        id,
        pairs: values.map(pairOf),
        near: i => nearValues(values[i]).map(tier => tier.map(at).filter(x => x >= 0)),
        // The help: the question's own tens, the list's last round number with the tens before it (20 with the
        // teens, 100 with the nineties); the tientallen all ten.
        helpRows: i => {
            if (allHelp) return values.map((_, j) => j);
            const last = Math.floor((values[values.length - 1] - 1) / 10);
            const rowOf = (v: number) => Math.min(last, Math.floor(v / 10));
            return values.map((v, j) => ({ v, j })).filter(x => rowOf(x.v) === rowOf(values[i])).map(x => x.j);
        },
        texts: {
            'fr-nl': { instruction: 'Welk getal is dit?', ask: 'Getal:' },
            'nl-fr': { instruction: 'Hoe schrijf je dit getal in het Frans?', ask: 'Frans:' },
        },
        nlFirst: true,
    };
}

const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

export const GETALLEN_20 = numberList('getallen20', range(0, 20));
export const TIENTALLEN = numberList('tientallen', range(10, 100, 10), true);
export const GETALLEN_100 = numberList('getallen100', range(0, 100));
