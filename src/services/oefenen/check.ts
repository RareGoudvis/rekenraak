import { INTERACT_SEP, type KioskAnswer, type KioskDescriptor } from './types';
import type { InteractionKind } from '../../components/viewer/ViewerInteractionContext';
import { kioskInputOf, kioskInteractOf } from './kiosk';

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
function sameInteraction(kind: InteractionKind, given: string, want: string, tol = 0): boolean {
    const g = partsOf(given), w = partsOf(want);
    if (g.length !== w.length) return false;
    if (kind === 'drag') return g.length > 0 && g.every((x, i) => nearPart(x, w[i], tol));
    // tap-multi is a set of taps: the order the pupil tapped them in does not count.
    if (kind === 'tap-multi') {
        const ws = [...w].sort();
        return [...g].sort().every((x, i) => x === ws[i]);
    }
    // A blank cell is right only where an empty alternative allows it (a carry left out).
    if (kind === 'fill-cells') return g.every((x, i) => (x === '' ? w[i].split('|').includes('') : sameValue(x, w[i].split('|'))));
    // build: the laid value (total cents, the number) as a number; how it was made up does not count.
    if (kind === 'build') return g.every((x, i) => sameValue(x, [w[i]]));
    return g.every((x, i) => x === w[i]);
}

export function checkAnswer(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, given: KioskAnswer): boolean {
    const input = kioskInputOf(d, ex, c);
    if (input === 'interactive') {
        const ia = kioskInteractOf(d, c);
        if (!ia) return false;
        const one = Array.isArray(given) ? given.join(INTERACT_SEP) : given;
        return sameInteraction(ia.kind, one, ia.answerOf(ex, c), ia.tolerance?.(ex, c) ?? 0);
    }
    const accepted = d.answerOf(ex, c);
    if (input === 'number+rest') {
        // Quotiënt and rest are separate fields and both must match.
        if (!Array.isArray(given) || given.length !== 2 || accepted.length !== 2) return false;
        return sameValue(given[0], [accepted[0]]) && sameValue(given[1], [accepted[1]]);
    }
    if (input === 'time') return Array.isArray(given) && given.length === 2 && sameTime(given, accepted);
    if (input === 'multi-number') {
        // Every field must hold its own blank's value, in order.
        const parts = Array.isArray(given) ? given : [given];
        return parts.length === accepted.length && parts.every((g, i) => sameValue(g, accepted[i].split('|')));
    }
    const one = Array.isArray(given) ? (given.length === 1 ? given[0] : null) : given;
    if (one === null) return false;
    if (input === 'choice') return accepted.includes(one.trim());
    if (input === 'text') return one.trim() !== '' && accepted.some(a => normaliseText(a) === normaliseText(one));
    return sameValue(one, accepted);
}
