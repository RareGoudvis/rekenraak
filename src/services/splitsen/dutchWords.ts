// Bounded Dutch number-to-words for the positietabel splitsen variant (0 … 1 000 000).
// Refine later for edge cases / larger ranges.

const ONES = [
    'nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
    'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien',
];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

function underHundred(n: number): string {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10), u = n % 10;
    if (u === 0) return TENS[t];
    // 'en' join; twee/drie take a trema to avoid the ee/ie+e vowel collision.
    const joiner = u === 2 || u === 3 ? 'ën' : 'en';
    return ONES[u] + joiner + TENS[t];
}

function underThousand(n: number): string {
    if (n < 100) return underHundred(n);
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? '' : ONES[h]) + 'honderd' + (r ? underHundred(r) : '');
}

export function numberToDutchWords(n: number): string {
    if (n === 0) return 'nul';
    if (n === 1000000) return 'een miljoen';
    let out = '';
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    if (th) out += (th === 1 ? '' : underThousand(th)) + 'duizend';
    if (rest) out += underThousand(rest);
    return out || underThousand(n);
}
