import type { SkinResult } from '../types';
import { formatMathNumber } from '../../../../services/math/formatters';

// The pupil's longest run per card on this device (metres), like Race's records: never shared, never compared
// with other pupils. Storage can be missing or full (a private window): every access is try/catch.

export const SLALOM_RECORDS_KEY = 'rekenraak_spel_slalom';

export const formatMetres = (m: number) => `${formatMathNumber(Math.max(0, Math.floor(m)))} m`;

function readAll(): Record<string, unknown> {
    try {
        const all = JSON.parse(window.localStorage.getItem(SLALOM_RECORDS_KEY) ?? 'null');
        return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
    } catch {
        return {};
    }
}

/** The longest run (metres) for this card, or null (none yet, or storage unreadable). */
export function loadBestM(key: string): number | null {
    const m = readAll()[key];
    return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : null;
}

/** Keeps this distance when it is longer than the best; safe to call again and again during a run. */
export function saveIfLonger(key: string, metres: number): void {
    const best = loadBestM(key);
    if (metres <= 0 || (best !== null && metres <= best)) return;
    try { window.localStorage.setItem(SLALOM_RECORDS_KEY, JSON.stringify({ ...readAll(), [key]: Math.floor(metres) })); } catch { /* storage blocked: only the record is lost */ }
}

/** "Wis mijn scores": every slalom record on this device. */
export function wipeSlalom(): void {
    try { window.localStorage.removeItem(SLALOM_RECORDS_KEY); } catch { /* nothing to wipe */ }
}

// The end screen's title when all his gear is gone (Moeilijk / Onmogelijk).
export const BANK_TITLE = 'Plof, in de sneeuw!';

/** The end screen's lines: the distance, and the record before this run; inBank = all gear gone (the friendly end). */
export function slalomResult(metres: number, before: number | null, inBank = false): SkinResult {
    const detail = before === null ? 'Nieuw record!'
        : Math.floor(metres) > before ? `Nieuw record! ${formatMetres(metres - before)} verder dan je vorige record.`
        : `Je record is ${formatMetres(before)}.`;
    return { title: inBank ? BANK_TITLE : 'Wat een afdaling!', lead: `Je skiede ${formatMetres(metres)}`, detail, wipe: wipeSlalom };
}
