import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { OEFEN_VERSION, type OefenMode, type OefenSessie, type OefenType } from './types';
import { REGISTRY } from '../../config/exerciseRegistry';

// Oefensessie ↔ URL hash (#oefen=…): the share-link trick of persistence.ts. Only settings
// travel; the pupil's device generates the exercises.

// SYNC: persistence.ts MAX_SHARE_BYTES — long URLs break in chat apps and QR scanners.
export const MAX_SESSIE_BYTES = 30000;
export const OEFEN_HASH_PREFIX = '#oefen=';
export const OEFEN_PAGE = '/oefenen.html';

const MODES: readonly OefenMode[] = ['afwisselen', 'willekeurig'];
const ID_RE = /^[a-z0-9_-]{1,40}$/;

export function newSessieId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** The compressed payload, or null when it would exceed MAX_SESSIE_BYTES. */
export function encodeSessie(s: OefenSessie): string | null {
    try {
        const data = compressToEncodedURIComponent(JSON.stringify(s));
        return data.length > MAX_SESSIE_BYTES ? null : data;
    } catch { return null; }
}

export function sessieLink(s: OefenSessie, origin: string): string | null {
    const data = encodeSessie(s);
    return data === null ? null : `${origin.replace(/\/+$/, '')}${OEFEN_PAGE}${OEFEN_HASH_PREFIX}${data}`;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isPosInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0;
const bad = (what: string): never => { throw new Error(`Deze oefenlink is ongeldig (${what}).`); };

function parseType(raw: unknown, i: number): OefenType {
    if (!isObj(raw)) return bad(`oefening ${i + 1}`);
    const { typeId, leafId, label, instruction, constraints, limit, weight } = raw;
    if (typeof typeId !== 'string' || typeof leafId !== 'string' || typeof label !== 'string') return bad(`oefening ${i + 1}`);
    if (!REGISTRY[typeId]?.kiosk) throw new Error(`Deze oefenlink bevat een oefening die deze versie niet kent (${typeId}). Werk de app bij.`);
    if (instruction !== undefined && typeof instruction !== 'string') return bad(`opdracht van oefening ${i + 1}`);
    if (!isObj(constraints)) return bad(`instellingen van oefening ${i + 1}`);
    if (limit !== undefined && !isPosInt(limit)) return bad(`limiet van oefening ${i + 1}`);
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) return bad(`kans van oefening ${i + 1}`);
    return {
        typeId, leafId, label, constraints, weight,
        ...(instruction !== undefined && { instruction }),
        ...(limit !== undefined && { limit: limit as number }),
    };
}

/** Strict parse of a session object (version-gated); throws a Dutch message. */
export function parseSessie(raw: unknown): OefenSessie {
    if (!isObj(raw)) return bad('geen sessie');
    if (typeof raw.v !== 'number') return bad('versie ontbreekt');
    if (raw.v > OEFEN_VERSION) throw new Error(`Deze oefenlink komt uit een nieuwere versie (v${raw.v}). Werk de app bij om ze te openen.`);
    if (raw.v !== OEFEN_VERSION) return bad(`versie ${raw.v}`);
    const { id, title, createdAt, types, mode, allowRepeatType, timerMin, testMode, statsLocked, total } = raw;
    if (typeof id !== 'string' || !ID_RE.test(id)) return bad('id');
    if (title !== undefined && typeof title !== 'string') return bad('titel');
    if (typeof createdAt !== 'number') return bad('datum');
    if (!Array.isArray(types) || types.length === 0) return bad('geen oefeningen');
    if (!MODES.includes(mode as OefenMode)) return bad('volgorde');
    if (typeof allowRepeatType !== 'boolean' || typeof testMode !== 'boolean' || typeof statsLocked !== 'boolean') return bad('instellingen');
    if (timerMin !== undefined && (typeof timerMin !== 'number' || !(timerMin > 0))) return bad('timer');
    if (total !== undefined && !isPosInt(total)) return bad('totaal');
    return {
        v: OEFEN_VERSION, id, createdAt, mode: mode as OefenMode, allowRepeatType, testMode, statsLocked,
        types: types.map(parseType),
        ...(title !== undefined && { title }),
        ...(timerMin !== undefined && { timerMin }),
        ...(total !== undefined && { total: total as number }),
    };
}

/** A '#oefen=…' hash (or the bare payload) → the session; throws a Dutch message. */
export function decodeSessie(hash: string): OefenSessie {
    const data = hash.startsWith(OEFEN_HASH_PREFIX) ? hash.slice(OEFEN_HASH_PREFIX.length) : hash.replace(/^#/, '');
    if (!data) return bad('leeg');
    let json: string | null;
    try { json = decompressFromEncodedURIComponent(data); } catch { json = null; }
    if (!json) return bad('kan niet gelezen worden');
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { return bad('geen geldige JSON'); }
    return parseSessie(parsed);
}
