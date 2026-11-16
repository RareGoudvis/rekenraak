import type { Leerjaar } from '../../config/gradePresets';

// The pupil's own picks on the Keuze screen, remembered per device per leerjaar: "Tot hoeveel?" and "Welke tafels?".

export const RANGE_KEY = 'rekenraak_zelf_tot_v1';
export const TAFELS_KEY = 'rekenraak_zelf_tafels_v1';

function readMap(key: string): Record<string, unknown> {
    try {
        const raw = JSON.parse(globalThis.localStorage?.getItem(key) ?? '{}');
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    } catch { return {}; }
}

function writeEntry(key: string, grade: Leerjaar, value: unknown) {
    try { globalThis.localStorage?.setItem(key, JSON.stringify({ ...readMap(key), [grade]: value })); } catch { /* private mode: this visit only */ }
}

/** The remembered range for this leerjaar when it is one of its options, else the first (smallest) option. */
export function readRange(grade: Leerjaar, options: readonly number[]): number {
    const v = readMap(RANGE_KEY)[grade];
    return typeof v === 'number' && options.includes(v) ? v : options[0];
}

export const saveRange = (grade: Leerjaar, max: number) => writeEntry(RANGE_KEY, grade, max);

/** The remembered tafels for this leerjaar (only those on offer, at least one), else the default set. */
export function readTafels(grade: Leerjaar, offer: readonly number[], fallback: readonly number[]): number[] {
    const v = readMap(TAFELS_KEY)[grade];
    const list = Array.isArray(v) ? offer.filter(t => v.includes(t)) : [];
    return list.length ? list : [...fallback];
}

export const saveTafels = (grade: Leerjaar, tables: readonly number[]) => writeEntry(TAFELS_KEY, grade, [...tables]);

// Oefenen or Spelen on the Keuze screen: the pupil's last pick, one per device (not per leerjaar).
export const WAY_KEY = 'rekenraak_zelf_weg_v1';
export type ZelfWay = 'oefenen' | 'spelen';

/** The remembered way, or null on a first visit (both tiles shown, neither open). */
export function readWay(): ZelfWay | null {
    try {
        const v = globalThis.localStorage?.getItem(WAY_KEY);
        return v === 'oefenen' || v === 'spelen' ? v : null;
    } catch { return null; }
}

export function saveWay(way: ZelfWay) {
    try { globalThis.localStorage?.setItem(WAY_KEY, way); } catch { /* private mode: this visit only */ }
}
