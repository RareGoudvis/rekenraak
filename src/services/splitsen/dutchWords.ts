// Dutch number-to-words for the positietabel splitsen variant (0 … 1 000 000 000 and beyond).
// Spelling: everything below a million is one word ("vijfhonderdduizenddrieëntwintig", the
// file's long-standing convention); "miljoen" / "miljard" stand apart with their own "een".

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

// 1 … 999 999 as one word; "duizend" and "honderd" drop their "een".
function underMillion(n: number): string {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    let out = '';
    if (th) out += (th === 1 ? '' : underThousand(th)) + 'duizend';
    if (rest) out += underThousand(rest);
    return out;
}

function intToDutchWords(n: number): string {
    if (n < 0) return 'min ' + intToDutchWords(-n);
    if (n === 0) return 'nul';
    const mrd = Math.floor(n / 1_000_000_000);
    const mln = Math.floor(n / 1_000_000) % 1000;
    const low = n % 1_000_000;
    const groups: string[] = [];
    // Recursion keeps a thousand-plus miljard count spelled ("duizend miljard") instead of undefined.
    if (mrd) groups.push(intToDutchWords(mrd) + ' miljard');
    if (mln) groups.push(underThousand(mln) + ' miljoen');
    if (low) groups.push(underMillion(low));
    return groups.join(' ');
}

export function numberToDutchWords(n: number): string {
    if (!Number.isFinite(n)) return '';
    if (Number.isInteger(n)) return intToDutchWords(n);
    // Decimal: "<int> komma <digit> <digit> …" (e.g. 3,45 → "drie komma vier vijf").
    const neg = n < 0;
    const trimmed = Math.abs(n).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    const [ip, dp = ''] = trimmed.split('.');
    const intWords = intToDutchWords(Number(ip));
    const decWords = dp.split('').map(d => ONES[Number(d)]).join(' ');
    return (neg ? 'min ' : '') + intWords + (decWords ? ' komma ' + decWords : '');
}
