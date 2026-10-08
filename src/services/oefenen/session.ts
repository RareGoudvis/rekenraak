import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { OEFEN_VERSION, type OefenMode, type OefenSessie, type OefenType } from './types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { DEFAULT_BASE, seedConstraints } from '../../config/baseSettings';
import { LEAF_BY_ID, flattenLeaves } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../math/constraintTypes';
import { KIOSK_KEY_TABLE_V1, KIOSK_LEAF_TABLE_V1 } from './kiosk';

// Oefensessie ↔ URL hash (#oefen=…): the share-link trick of persistence.ts. Only settings
// travel; the pupil's device generates the exercises. The link is also a classroom QR, so the
// payload is the compact OefenWire below, not the session object: everything the kiosk can
// re-derive (seeded constraints, leaf label, default opdracht, equal weights) is left out.

// SYNC: persistence.ts MAX_SHARE_BYTES — long URLs break in chat apps and QR scanners.
export const MAX_SESSIE_BYTES = 30000;
export const OEFEN_HASH_PREFIX = '#oefen=';
export const OEFEN_PAGE = '/oefenen.html';

const MODES: readonly OefenMode[] = ['afwisselen', 'willekeurig'];
const ID_RE = /^[a-z0-9_-]{1,40}$/;

// 8 base36 chars (~2.8e12 values): only has to be unique among one pupil device's sessions.
export function newSessieId(): string {
    let id = '';
    while (id.length < 8) id += Math.random().toString(36).slice(2);
    return id.slice(0, 8);
}

// ── OefenWire v1 ─────────────────────────────────────────────────────────────
// Positional arrays, trailing defaults trimmed, null = "default" in a middle slot:
//   session: [v, id, created, flags, rows, title?, timerMin?, total?]
//   row:     [leaf, diff?, weight?, limit?, label?, instruction?, removed?, typeId?]
// created: whole minutes when createdAt falls on a minute (the builder floors it), else ms.
// flags:   bit 0 willekeurig · 1 allowRepeatType · 2 testMode · 3 statsLocked.
// leaf:    index into KIOSK_LEAF_TABLE_V1, else the leafId string.
// diff:    flat [key, value, key, value…] of the constraints that differ from the leaf's seed
//          (key = index into KIOSK_KEY_TABLE_V1, else the key string); removed: seed keys absent.
// weight:  omitted when it equals the equal split; instruction: omitted when it equals the
//          leaf's default, 0 when the session has none; typeId: only when it is not the leaf's.
type WireKey = number | string;
type WireRow = unknown[];
type OefenWire = unknown[];

const FLAG_RANDOM = 1, FLAG_REPEAT = 2, FLAG_TEST = 4, FLAG_LOCKED = 8;
const MINUTE = 60_000;
// Below this a `created` is minutes: 1e10 minutes is the year ~21000, 1e10 ms is 1970.
const MINUTES_BELOW = 1e10;

const LEAF_DEFAULTS: Record<string, Record<string, unknown> | undefined> =
    Object.fromEntries(flattenLeaves().map(l => [l.id, l.defaultConstraints]));

// What a sidebar click on this leaf seeds on an untouched base: the baseline the diff is against.
function seedOf(typeId: string, leafId: string): Record<string, unknown> {
    const override = LEAF_BY_ID[leafId]?.typeId === typeId ? LEAF_DEFAULTS[leafId] : undefined;
    // Cloned: the overlay below must never write into a registry default's nested object.
    return JSON.parse(JSON.stringify(seedConstraints({ typeId, leafId, base: DEFAULT_BASE, grade: null, override }))) as Record<string, unknown>;
}

const defaultLabelOf = (leafId: string): string | undefined => LEAF_BY_ID[leafId]?.label;

function defaultInstructionOf(typeId: string, leafId: string, label: string, constraints: Record<string, unknown>): string {
    const leaf = LEAF_BY_ID[leafId];
    return resolveInstruction(leaf?.typeId === typeId ? leaf.instruction : undefined, typeId, label, constraints as BlockConstraints);
}

// Largest-remainder equal split, like normaliseWeights on equal sliders: the first slots get the +1s.
const equalWeight = (n: number, slot: number) => Math.floor(100 / n) + (slot < 100 % n ? 1 : 0);

// JSON identity: key order ignored, undefined = absent (what the old full-JSON link did).
function canon(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(x => (x === undefined ? 'null' : canon(x))).join(',')}]`;
    if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return `{${Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
    }
    return JSON.stringify(v) ?? 'null';
}

const keyOut = (k: string): WireKey => { const i = KIOSK_KEY_TABLE_V1.indexOf(k); return i >= 0 ? i : k; };
const trim = (a: unknown[]) => { while (a.length > 0 && a[a.length - 1] === null) a.pop(); return a; };

function rowOut(t: OefenType, slot: number, n: number): WireRow {
    const leafIdx = KIOSK_LEAF_TABLE_V1.indexOf(t.leafId);
    const leafTypeId = LEAF_BY_ID[t.leafId]?.typeId;
    const seed = seedOf(t.typeId, t.leafId);
    const diff: unknown[] = [];
    const removed: WireKey[] = [];
    for (const [k, v] of Object.entries(t.constraints)) {
        if (v !== undefined && (seed[k] === undefined || canon(v) !== canon(seed[k]))) diff.push(keyOut(k), v);
    }
    for (const k of Object.keys(seed)) {
        if (seed[k] !== undefined && t.constraints[k] === undefined) removed.push(keyOut(k));
    }
    const label = defaultLabelOf(t.leafId);
    const instruction = t.instruction === undefined ? 0
        : t.instruction === defaultInstructionOf(t.typeId, t.leafId, t.label, t.constraints) ? null : t.instruction;
    return trim([
        leafIdx >= 0 ? leafIdx : t.leafId,
        diff.length ? diff : null,
        t.weight === equalWeight(n, slot) ? null : t.weight,
        t.limit ?? null,
        t.label === label ? null : t.label,
        instruction,
        removed.length ? removed : null,
        t.typeId === leafTypeId ? null : t.typeId,
    ]);
}

/** The positional wire form (exported for the size tests). */
export function toWire(s: OefenSessie): OefenWire {
    const flags = (s.mode === 'willekeurig' ? FLAG_RANDOM : 0) | (s.allowRepeatType ? FLAG_REPEAT : 0)
        | (s.testMode ? FLAG_TEST : 0) | (s.statsLocked ? FLAG_LOCKED : 0);
    return trim([
        OEFEN_VERSION, s.id,
        s.createdAt % MINUTE === 0 && s.createdAt / MINUTE < MINUTES_BELOW ? s.createdAt / MINUTE : s.createdAt,
        flags,
        s.types.map((t, i) => rowOut(t, i, s.types.length)),
        s.title ?? null, s.timerMin ?? null, s.total ?? null,
    ]);
}

// ── Base32 transport ─────────────────────────────────────────────────────────
// Raw DEFLATE bytes as RFC 4648 base32 (A-Z 2-7, no padding): upper-case only, so the QR can
// code the payload in alphanumeric mode (5.5 bits/char) instead of byte mode (8 bits/char),
// and still URL-safe and immune to chat apps that eat a trailing '.' or ':'. DEFLATE, not
// lz-string: on a 20-type wire it came out at a third of lz-string's size.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(bytes: Uint8Array): string {
    let out = '', acc = 0, bits = 0;
    for (const b of bytes) {
        acc = (acc << 8) | b; bits += 8;
        while (bits >= 5) { out += B32[(acc >>> (bits - 5)) & 31]; bits -= 5; }
        acc &= (1 << bits) - 1;
    }
    if (bits > 0) out += B32[(acc << (5 - bits)) & 31];
    return out;
}

function fromBase32(text: string): Uint8Array | null {
    const out: number[] = [];
    let acc = 0, bits = 0;
    for (const ch of text.toUpperCase()) {
        const v = B32.indexOf(ch);
        if (v < 0) return null;
        acc = (acc << 5) | v; bits += 5;
        if (bits >= 8) { out.push((acc >>> (bits - 8)) & 255); bits -= 8; }
        acc &= (1 << bits) - 1;
    }
    return Uint8Array.from(out);
}

/** Any JSON value → the link payload (deflate + base32); encodeSessie and the tests use it. */
export function packWire(wire: unknown): string {
    return toBase32(deflateSync(strToU8(JSON.stringify(wire)), { level: 9 }));
}

/** The compact payload, or null when it would exceed MAX_SESSIE_BYTES. */
export function encodeSessie(s: OefenSessie): string | null {
    try {
        const data = packWire(toWire(s));
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

// ── Wire → session object (shape checks only; parseSessie validates the result) ──

function keyIn(k: unknown, what: string): string {
    if (typeof k === 'string') return k;
    if (typeof k === 'number' && KIOSK_KEY_TABLE_V1[k] !== undefined) return KIOSK_KEY_TABLE_V1[k];
    return bad(what);
}
const opt = <T>(v: unknown): T | undefined => (v === null || v === undefined ? undefined : v as T);

function rowIn(raw: unknown, slot: number, n: number): Record<string, unknown> {
    const what = `oefening ${slot + 1}`;
    if (!Array.isArray(raw)) return bad(what);
    const [leaf, diff, weight, limit, label, instruction, removed, typeId] = raw;
    const leafId = typeof leaf === 'number' ? KIOSK_LEAF_TABLE_V1[leaf] : leaf;
    if (typeof leafId !== 'string') return bad(what);
    const tId = opt<unknown>(typeId) ?? LEAF_BY_ID[leafId]?.typeId;
    if (typeof tId !== 'string') return bad(what);
    if (!REGISTRY[tId]?.kiosk) throw new Error(`Deze oefenlink bevat een oefening die deze versie niet kent (${tId}). Werk de app bij.`);
    const constraints = seedOf(tId, leafId);
    if (removed != null) {
        if (!Array.isArray(removed)) return bad(`instellingen van ${what}`);
        for (const k of removed) delete constraints[keyIn(k, `instellingen van ${what}`)];
    }
    if (diff != null) {
        if (!Array.isArray(diff) || diff.length % 2 !== 0) return bad(`instellingen van ${what}`);
        for (let i = 0; i < diff.length; i += 2) constraints[keyIn(diff[i], `instellingen van ${what}`)] = diff[i + 1];
    }
    const lbl = opt<unknown>(label) ?? defaultLabelOf(leafId);
    if (typeof lbl !== 'string') return bad(what);
    return {
        typeId: tId, leafId, label: lbl, constraints,
        weight: opt<unknown>(weight) ?? equalWeight(n, slot),
        ...(instruction !== 0 && {
            instruction: opt<unknown>(instruction) ?? defaultInstructionOf(tId, leafId, lbl, constraints),
        }),
        ...(limit != null && { limit }),
    };
}

function fromWire(w: unknown): Record<string, unknown> {
    if (!Array.isArray(w)) return bad('geen sessie');
    const [v, id, created, flags = 0, rows, title, timerMin, total] = w;
    if (typeof v !== 'number') return bad('versie ontbreekt');
    if (v > OEFEN_VERSION) throw new Error(`Deze oefenlink komt uit een nieuwere versie (v${v}). Werk de app bij om ze te openen.`);
    if (v !== OEFEN_VERSION) return bad(`versie ${v}`);
    if (typeof created !== 'number') return bad('datum');
    if (typeof flags !== 'number' || !Number.isInteger(flags)) return bad('instellingen');
    if (!Array.isArray(rows) || rows.length === 0) return bad('geen oefeningen');
    return {
        v, id,
        createdAt: created < MINUTES_BELOW ? created * MINUTE : created,
        mode: flags & FLAG_RANDOM ? 'willekeurig' : 'afwisselen',
        allowRepeatType: !!(flags & FLAG_REPEAT),
        testMode: !!(flags & FLAG_TEST),
        statsLocked: !!(flags & FLAG_LOCKED),
        types: rows.map((r, i) => rowIn(r, i, rows.length)),
        ...(title != null && { title }),
        ...(timerMin != null && { timerMin }),
        ...(total != null && { total }),
    };
}

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
    const bytes = fromBase32(data);
    let json: string | null = null;
    if (bytes && bytes.length > 0) { try { json = strFromU8(inflateSync(bytes)); } catch { json = null; } }
    if (!json) return bad('kan niet gelezen worden');
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { return bad('geen geldige JSON'); }
    return parseSessie(fromWire(parsed));
}
