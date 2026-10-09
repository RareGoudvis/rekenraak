import type { WidgetKind } from '../boardTypes';
import { PROP_SCHEMAS } from './propSchemas';

// "Bewaar als mijn standaard": the teacher's own starting props per widget kind, applied by
// addWidget to every new widget of that kind (the caller's props still win, so a tool's own
// payload — an image, a typed note — is never replaced by a saved one).
export const BOARD_DEFAULTS_KEY = 'rekenraak_board_defaults_v1';

// Per-instance state, never part of a standaard: the current tick list, the picked names,
// a dealt group result, the time on the clock, an image payload, the active symbol.
export const TRANSIENT_PROP_KEYS: readonly string[] = [
    'checked', 'done', 'picked', 'result', 'locked', 'active',
    'hours', 'minutes', 'src', 'marks', 'd', 'h', 't', 'e',
    'laps', 'values', 'history', 'level', 'calibrateAt',
];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function readAll(): Record<string, Record<string, unknown>> {
    try {
        const v: unknown = JSON.parse(localStorage.getItem(BOARD_DEFAULTS_KEY) ?? '{}');
        return isObj(v) ? v as Record<string, Record<string, unknown>> : {};
    } catch {
        return {};
    }
}

export function loadWidgetDefaults(kind: WidgetKind): Record<string, unknown> | null {
    const v = readAll()[kind];
    return isObj(v) && Object.keys(v).length ? v : null;
}

export function stripTransient(props: Record<string, unknown> | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props ?? {})) if (!TRANSIENT_PROP_KEYS.includes(k)) out[k] = v;
    return out;
}

// false when the write is refused (quota), so the panel can say so instead of pretending.
export function saveWidgetDefaults(kind: WidgetKind, props: Record<string, unknown> | undefined): boolean {
    const all = readAll();
    all[kind] = stripTransient(props);
    try {
        localStorage.setItem(BOARD_DEFAULTS_KEY, JSON.stringify(all));
        return true;
    } catch {
        return false;
    }
}

export function clearWidgetDefaults(kind: WidgetKind): void {
    const all = readAll();
    delete all[kind];
    try { localStorage.setItem(BOARD_DEFAULTS_KEY, JSON.stringify(all)); } catch { /* nothing to undo */ }
}

// What "Standaard" resets a widget to: the teacher's saved standaard, else the factory look
// (empty props: every reader defaults a missing key to today's behaviour). An image payload
// is the widget itself, not a setting, so it survives.
export function resetProps(kind: WidgetKind, current?: Record<string, unknown>): Record<string, unknown> {
    // A kind's schema names its other content keys too (a note's text, the dice's last roll).
    const content = ['src', ...(PROP_SCHEMAS[kind]?.content ?? [])];
    const keep = Object.fromEntries(content.filter(k => current && k in current).map(k => [k, current![k]]));
    return { ...(loadWidgetDefaults(kind) ?? {}), ...keep };
}
