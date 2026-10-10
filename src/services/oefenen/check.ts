import { INTERACT_SEP, type KioskAnswer, type KioskDescriptor } from './types';
import type { InteractionKind } from '../../components/viewer/ViewerInteractionContext';
import { kioskInputOf, kioskInteractOf } from './kiosk';

// Is the pupil's answer right? Typed answers are normalised (spaces, comma/dot, leading and
// trailing zeros, minus glyphs) and compared with every spelling the descriptor accepts; a breuk
// answer also by value unless the row asks the exact form (exactFormOf).

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

/** A typed breuk or whole number as exact [teller, noemer]; null for a decimal with a fraction part. */
export function rationalOf(raw: string): [bigint, bigint] | null {
    if (!raw.includes('/')) {
        const v = normaliseNumber(raw);
        // Owner 2026-10-09: a breuk answer does not take a kommagetal ('3,25' for 13/4), not now.
        return v === null || v.includes('.') ? null : [BigInt(v), 1n];
    }
    const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(normaliseFraction(raw) ?? '');
    if (!m) return null;
    const n = BigInt(m[3]), d = BigInt(m[4]);
    // A gemengd getal needs a proper breuk part: '2 5/4' is not a way to write 3 1/4.
    if (m[2] !== undefined && n >= d) return null;
    const total = BigInt(m[2] ?? 0) * d + n;
    return [m[1] ? -total : total, d];
}

// BigInt: cross products of 1e9-sized tellers pass 2^53.
const equalRatio = (a: [bigint, bigint], b: [bigint, bigint]) => a[0] * b[1] === b[0] * a[1];

// exact = the given text must be one of the accepted spellings; else a breuk or whole number of
// the same value counts too (26/8 for 3 1/4), as long as the accepted answer is one as well.
const sameValue = (given: string, accepted: readonly string[], exact = true) => {
    const g = canonical(given);
    if (g === null) return false;
    if (accepted.some(a => canonical(a) === g)) return true;
    if (exact) return false;
    const gv = rationalOf(given);
    return gv !== null && accepted.some(a => {
        const av = rationalOf(a);
        return av !== null && equalRatio(gv, av);
    });
};

/** Whether this row wants the asked spelling: the row's choice, else the descriptor's default; always where no breuk is asked. */
export function exactFormOf(d: KioskDescriptor, c: Record<string, unknown>, rowExactForm?: boolean): boolean {
    const byDefault = d.exactFormDefault?.(c);
    return byDefault === undefined ? true : rowExactForm ?? byDefault;
}

/** Canonical text of a typed word: case and spacing do not count ('mmxiv ' = 'MMXIV'). */
export const normaliseText = (raw: string) => raw.trim().replace(SPACES, ' ').toLowerCase();

// Hours and minutes as typed ('08', '5'): whole numbers only.
const clockPart = (raw: string) => (/^\s*\d{1,2}\s*$/.test(raw) ? Number(raw) : null);

/** A typed time [uur, minuten] matches one of the accepted 'h:mm' spellings. */
function sameTime(given: readonly string[], accepted: readonly string[]): boolean {
    const h = clockPart(given[0] ?? ''), m = clockPart(given[1] ?? '');
    if (h === null || m === null) return false;
    return accepted.some(a => {
        const [ah, am] = a.split(':').map(Number);
        return ah === h && am === m;
    });
}

// A typed amount of a unit as an exact decimal in the smallest unit: [digits × factor, decimals]
// ('2,35' m at factor 1000 → [2350000n, 2] = 2350 mm). null: no number, a negative or no factor.
function quantityOf(raw: string, factor: number | undefined): [bigint, number] | null {
    const v = factor === undefined ? null : normaliseNumber(raw);
    if (v === null || v.startsWith('-')) return null;
    const [int, frac = ''] = v.split('.');
    return [BigInt(int + frac) * BigInt(factor!), frac.length];
}

/** number+unit: the given [number, unit] is the same quantity as the accepted one (1,2 m = 120 cm). */
function sameQuantity(given: readonly string[], accepted: readonly string[], factors: Record<string, number>): boolean {
    const g = quantityOf(given[0] ?? '', factors[(given[1] ?? '').trim()]);
    const a = quantityOf(accepted[0] ?? '', factors[accepted[1] ?? '']);
    return g !== null && a !== null && g[0] * 10n ** BigInt(a[1]) === a[0] * 10n ** BigInt(g[1]);
}

// An empty middle part stays ('5 ·  · 3' = three cells, the second blank).
const partsOf = (s: string) => (s.trim() === '' ? [] : s.split(INTERACT_SEP.trim()).map(p => p.trim()));

// A 12-hour clock face: '3:15' and '15:15' are one position, as minutes past 12:00.
const FACE_MIN = 12 * 60;
const faceMinutes = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    return m ? (Number(m[1]) * 60 + Number(m[2])) % FACE_MIN : null;
};

/** One dragged part ('h:mm' or a number) within `tol` of the wanted one. */
function nearPart(given: string, want: string, tol: number): boolean {
    const gt = faceMinutes(given), wt = faceMinutes(want);
    if (gt !== null || wt !== null) {
        if (gt === null || wt === null) return false;
        const d = Math.abs(gt - wt);
        return Math.min(d, FACE_MIN - d) <= tol;
    }
    const g = normaliseNumber(given), w = normaliseNumber(want);
    // The float slack keeps a snapped 0,1-step value on its edge inside.
    return g !== null && w !== null && Math.abs(Number(g) - Number(w)) <= tol + 1e-9;
}

/** An interactive answer (fromState) against the descriptor's canonical one, by its kind. */
function sameInteraction(kind: InteractionKind, given: string, want: string, tol: number, exact: boolean): boolean {
    const g = partsOf(given), w = partsOf(want);
    if (g.length !== w.length) return false;
    if (kind === 'drag') return g.length > 0 && g.every((x, i) => nearPart(x, w[i], tol));
    // tap-multi is a set of taps: the order the pupil tapped them in does not count.
    if (kind === 'tap-multi') {
        const ws = [...w].sort();
        return [...g].sort().every((x, i) => x === ws[i]);
    }
    // A blank cell is right only where an empty alternative allows it (a carry left out).
    if (kind === 'fill-cells') return g.every((x, i) => (x === '' ? w[i].split('|').includes('') : sameValue(x, w[i].split('|'), exact)));
    // build: the laid value (total cents, the number) as a number; how it was made up does not count.
    if (kind === 'build') return g.every((x, i) => sameValue(x, [w[i]]));
    return g.every((x, i) => x === w[i]);
}

// rowExactForm = the session row's exactForm (OefenType); absent = the descriptor's default.
export function checkAnswer(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, given: KioskAnswer, rowExactForm?: boolean): boolean {
    const input = kioskInputOf(d, ex, c);
    const exact = exactFormOf(d, c, rowExactForm);
    if (input === 'interactive') {
        const ia = kioskInteractOf(d, c);
        if (!ia) return false;
        const one = Array.isArray(given) ? given.join(INTERACT_SEP) : given;
        return sameInteraction(ia.kind, one, ia.answerOf(ex, c), ia.tolerance?.(ex, c) ?? 0, exact);
    }
    const accepted = d.answerOf(ex, c);
    if (input === 'number+rest') {
        // Quotiënt and rest are separate fields and both must match.
        if (!Array.isArray(given) || given.length !== 2 || accepted.length !== 2) return false;
        return sameValue(given[0], [accepted[0]]) && sameValue(given[1], [accepted[1]]);
    }
    if (input === 'time') return Array.isArray(given) && given.length === 2 && sameTime(given, accepted);
    if (input === 'number+unit') return Array.isArray(given) && given.length === 2 && accepted.length === 2 && sameQuantity(given, accepted, d.unitFactors?.(ex, c) ?? {});
    if (input === 'multi-number') {
        // Every field must hold its own blank's value, in order; an empty field only where '' is accepted.
        const parts = Array.isArray(given) ? given : [given];
        return parts.length === accepted.length && parts.some(g => g.trim() !== '')
            && parts.every((g, i) => (g.trim() === '' ? accepted[i].split('|').includes('') : sameValue(g, accepted[i].split('|'), exact)));
    }
    const one = Array.isArray(given) ? (given.length === 1 ? given[0] : null) : given;
    if (one === null) return false;
    if (input === 'choice') return accepted.includes(one.trim());
    if (input === 'text') return one.trim() !== '' && accepted.some(a => normaliseText(a) === normaliseText(one));
    return sameValue(one, accepted, exact);
}
