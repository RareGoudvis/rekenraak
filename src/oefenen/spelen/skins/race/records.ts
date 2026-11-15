import type { SkinResult } from '../types';
import { RACE, formatGap, formatRaceTime } from './track';
import { formatKm } from './benzine';

// The pupil's own best race per card on this device, for the ghost car. Never shared, never compared
// with other pupils. Storage can be missing or full (a private window): every access is try/catch.

export const RACE_RECORDS_KEY = 'rekenraak_spel_race';
// Benzine: the farthest run per card, in metres.
export const RACE_KM_KEY = 'rekenraak_spel_race_km';

export interface RaceRecord { ms: number; trace: number[] }

const isRecord = (v: unknown): v is RaceRecord =>
    !!v && typeof v === 'object' && Number.isFinite((v as RaceRecord).ms) && (v as RaceRecord).ms > 0
    && Array.isArray((v as RaceRecord).trace) && (v as RaceRecord).trace.every(n => Number.isFinite(n));

function readAll(): Record<string, RaceRecord> {
    try {
        const raw = window.localStorage.getItem(RACE_RECORDS_KEY);
        const all = raw ? JSON.parse(raw) : null;
        return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
    } catch {
        return {};
    }
}

/** The best run for this card, or null (none yet, or storage unreadable). */
export function loadBest(key: string): RaceRecord | null {
    const rec = readAll()[key];
    return isRecord(rec) ? rec : null;
}

/** Keeps this run when it beats the best (or is the first); returns the best before it. */
export function saveIfBest(key: string, run: RaceRecord): { isNew: boolean; before: RaceRecord | null } {
    const before = loadBest(key);
    const isNew = !before || run.ms < before.ms;
    if (isNew) {
        try {
            const all = readAll();
            all[key] = { ms: Math.round(run.ms), trace: run.trace.slice(0, RACE.maxSamples).map(Math.round) };
            window.localStorage.setItem(RACE_RECORDS_KEY, JSON.stringify(all));
        } catch { /* storage full or blocked: the race still counts, only the ghost is not kept */ }
    }
    return { isNew, before };
}

/** "Wis mijn scores": every race record on this device, Tijdrit and Benzine. */
export function wipeRecords(): void {
    try { window.localStorage.removeItem(RACE_RECORDS_KEY); } catch { /* nothing to wipe */ }
    try { window.localStorage.removeItem(RACE_KM_KEY); } catch { /* nothing to wipe */ }
}

function readKm(): Record<string, unknown> {
    try {
        const all = JSON.parse(window.localStorage.getItem(RACE_KM_KEY) ?? 'null');
        return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
    } catch {
        return {};
    }
}

/** Benzine: the farthest run (metres) for this card, or null. */
export function loadBestKm(key: string): number | null {
    const m = readKm()[key];
    return typeof m === 'number' && Number.isFinite(m) && m > 0 ? m : null;
}

/** Keeps this distance when it is farther than the best; safe to call again and again during a run. */
export function saveIfFarther(key: string, metres: number): void {
    const best = loadBestKm(key);
    if (best !== null && metres <= best) return;
    try { window.localStorage.setItem(RACE_KM_KEY, JSON.stringify({ ...readKm(), [key]: Math.round(metres) })); } catch { /* storage blocked: only the record is lost */ }
}

/** Benzine's end lines: the distance and the record before this run (empty tank or the hidden cap). */
export function benzineResult(metres: number, before: number | null, empty: boolean): SkinResult {
    const far = formatKm(metres);
    const detail = before === null ? 'Nieuw record!'
        : metres > before ? `Nieuw record! ${formatKm(metres - before)} verder dan je vorige record.`
        : `Je record is ${formatKm(before)}.`;
    return { title: empty ? 'De tank is leeg!' : 'Wat een rit!', lead: `Je reed ${far}`, detail, wipe: wipeRecords };
}

/** The run's end line for the end screen: the time, and the gap to the best run before it. */
export function raceResult(ms: number, best: { isNew: boolean; before: RaceRecord | null }): SkinResult {
    const detail = best.isNew
        ? best.before ? `Nieuw record! ${formatGap(best.before.ms - ms)} s sneller dan je vorige record.` : 'Nieuw record!'
        : `Je record is ${formatRaceTime(best.before!.ms)}. Nu ${formatGap(ms - best.before!.ms)} s trager.`;
    return { title: 'Finish!', lead: `Je tijd: ${formatRaceTime(ms)}`, detail, wipe: wipeRecords };
}
