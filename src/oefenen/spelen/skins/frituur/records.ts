import type { SkinResult } from '../types';
import { CLOSED_TITLE, helpedTitle } from './rule';

// The most customers helped in one round, per card and length on this device: never shared, never compared with
// other pupils. Storage can be missing or full (a private window): every access is try/catch.

export const FRITUUR_BEST_KEY = 'rekenraak_spel_frituur';

function readAll(): Record<string, number> {
    try {
        const v: unknown = JSON.parse(globalThis.localStorage?.getItem(FRITUUR_BEST_KEY) ?? '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, number> : {};
    } catch { return {}; }
}

/** The best for this key, 0 when none (or unreadable). */
export function loadBest(key: string): number {
    const n = readAll()[key];
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Keeps n when it beats the best; safe to call on every customer. */
export function saveIfBest(key: string, n: number): void {
    if (n <= loadBest(key)) return;
    try { globalThis.localStorage?.setItem(FRITUUR_BEST_KEY, JSON.stringify({ ...readAll(), [key]: n })); } catch { /* blocked: this round only */ }
}

/** "Wis mijn scores": every Frituur best on this device. */
export function wipeBest(): void {
    try { globalThis.localStorage?.removeItem(FRITUUR_BEST_KEY); } catch { /* nothing kept anyway */ }
}

/** The end screen's lines: how many were helped, and the best before this round; closed = too many walked off. */
export function frituurResult(helped: number, before: number, closed = false): SkinResult {
    const record = helped > before && before > 0 ? `Nieuw record! Vorige keer ${before}.`
        : helped > before ? 'Nieuw record!'
        : before > 0 ? `Je record is ${before} ${before === 1 ? 'klant' : 'klanten'}.` : undefined;
    if (!closed) return { title: helpedTitle(helped), detail: record, wipe: wipeBest };
    // Closed early: the friendly fail title, the customers helped in the line under it.
    const helpedLine = helped === 0 ? 'Te veel boze klanten liepen weg.' : `Je hielp ${helped} ${helped === 1 ? 'klant' : 'klanten'}.`;
    return { title: CLOSED_TITLE, detail: record ? `${helpedLine} ${record}` : helpedLine, wipe: wipeBest };
}
