import type { KioskAnswer, KioskDescriptor } from './types';
import { kioskInputOf } from './kiosk';

// Is the pupil's answer right? Typed answers are normalised (spaces, comma/dot, leading and
// trailing zeros, minus glyphs) and compared with every spelling the descriptor accepts.

// Spaces of any kind (\s covers no-break and thin spaces) are thousands separators ('1 234');
// U+2212 is the sheet's minus, U+2013 what some keyboards make of a hyphen.
const SPACES = /\s+/g;
const MINUS = /[\u2212\u2013]/g;

/** Canonical text of a typed number ('007,50' → '7.5'), or null when it is not one. */
export function normaliseNumber(raw: string): string | null {
    const s = raw.replace(MINUS, '-').replace(SPACES, '').replace(',', '.');
    const m = /^(-?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (m[2] === '' && !m[3])) return null;
    const int = m[2].replace(/^0+(?=\d)/, '') || '0';
    const frac = (m[3] ?? '').replace(/0+$/, '');
    const body = frac ? `${int}.${frac}` : int;
    return body === '0' ? '0' : `${m[1]}${body}`;
}

/** Canonical text of a typed fraction ('1  3 / 4' → '1 3/4'), or null when it is not one. */
export function normaliseFraction(raw: string): string | null {
    const s = raw.replace(MINUS, '-').trim().replace(/\s*\/\s*/, '/').replace(SPACES, ' ');
    const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(s);
    if (!m) return null;
    const strip = (d: string) => d.replace(/^0+(?=\d)/, '');
    if (Number(m[4]) === 0) return null;
    // '0 3/4' is just 3/4.
    const whole = m[2] !== undefined && strip(m[2]) !== '0' ? `${strip(m[2])} ` : '';
    return `${m[1]}${whole}${strip(m[3])}/${strip(m[4])}`;
}

// A fraction when it has a slash, else a plain number.
const canonical = (raw: string) => (raw.includes('/') ? normaliseFraction(raw) : normaliseNumber(raw));

const sameValue = (given: string, accepted: readonly string[]) => {
    const g = canonical(given);
    return g !== null && accepted.some(a => canonical(a) === g);
};

export function checkAnswer(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, given: KioskAnswer): boolean {
    const accepted = d.answerOf(ex, c);
    const input = kioskInputOf(d, ex, c);
    if (input === 'number+rest') {
        // Quotiënt and rest are separate fields and both must match.
        if (!Array.isArray(given) || given.length !== 2 || accepted.length !== 2) return false;
        return sameValue(given[0], [accepted[0]]) && sameValue(given[1], [accepted[1]]);
    }
    const one = Array.isArray(given) ? (given.length === 1 ? given[0] : null) : given;
    if (one === null) return false;
    if (input === 'choice') return accepted.includes(one.trim());
    return sameValue(one, accepted);
}
