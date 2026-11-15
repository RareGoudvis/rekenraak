import { OEFEN_VERSION } from './types';
import { OEFEN_HASH_PREFIX, OEFEN_PAGE, fnv1a, packText } from './packText';

// "Nog meer van deze oefening" on the stappenhulp: the QR carries a block's settings as one
// OefenWire row (session.ts sessieRowWire); this wraps that row into a whole oefenlink on the
// pupil's phone. Light on purpose: the stappenhulp bundle never loads REGISTRY or session.ts.

// zelf- so the kiosk treats the run as the pupil's own (Nakijken, Andere oefening, Terug naar begin); -qr marks the stappenhulp.
// Never a hex digit after "zelf-", so it cannot collide with a Zelf oefenen id (zelf- + 8 hex).
export const TUTOR_SESSIE_PREFIX = 'zelf-qr';
// Like the longest Zelf oefenen count: enough to practise, short enough to finish on a phone.
export const TUTOR_OEFEN_COUNT = 10;
// SYNC: session.ts GRADE_SHIFT (leerjaar in flag bits 5–7).
const GRADE_SHIFT = 5;
const MINUTE = 60_000;

// The stappenhulp page on this deploy; the kiosk's end screen goes back to it.
export const TUTOR_PAGE = '/tutor.html';

export const isTutorSessie = (s: { id: string } | null): boolean => !!s && s.id.startsWith(TUTOR_SESSIE_PREFIX);

/** A wire row from a decoded QR, or null when it is not even shaped like one (the kiosk validates the rest). */
export function tutorOefenRowIn(raw: unknown): unknown[] | null {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 9) return null;
    return typeof raw[0] === 'number' || typeof raw[0] === 'string' ? raw : null;
}

/** The '#oefen=' hash for one block's row: that one type, 10 oefeningen, steps after a fout on, the sheet's leerjaar.
 *  The id follows the row, so the same block brings the pupil's earlier runs back. SYNC: session.ts toWire. */
export function tutorOefenHash(row: unknown[], grade?: number, now = Date.now()): string {
    const flags = grade && Number.isInteger(grade) && grade >= 1 && grade <= 6 ? grade << GRADE_SHIFT : 0;
    // session: [v, id, created (minutes), flags, rows, title?, timerMin?, total?]
    const wire = [OEFEN_VERSION, `${TUTOR_SESSIE_PREFIX}${fnv1a(JSON.stringify(row))}`, Math.floor(now / MINUTE), flags, [row], null, null, TUTOR_OEFEN_COUNT];
    return OEFEN_HASH_PREFIX + packText(JSON.stringify(wire));
}

/** The kiosk next to this stappenhulp (same deploy), opened on that hash. */
export const tutorOefenHref = (row: unknown[], grade?: number, now?: number): string => OEFEN_PAGE + tutorOefenHash(row, grade, now);
