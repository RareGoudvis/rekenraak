import { SPOOK_THEMES, isSpookTheme, type SpookTheme } from './themes';

// Which haunted place a Spookhuis round plays in: a random one, never the same twice in a row on this device.

const THEME_KEY = 'rekenraak_spookhuis_plek_v1';

/** A random place other than `last`. */
export function pickTheme(last?: SpookTheme | null, rng: () => number = Math.random): SpookTheme {
    const pool = SPOOK_THEMES.filter(k => k !== last);
    // Math.min: an rng that returns exactly 1 must not index past the end.
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** The place this device played last (the end screen's picture shows it again). */
export function readLastTheme(): SpookTheme | null {
    try {
        const v = globalThis.localStorage?.getItem(THEME_KEY);
        return isSpookTheme(v) ? v : null;
    } catch { return null; }
}

export function saveLastTheme(k: SpookTheme): void {
    try { globalThis.localStorage?.setItem(THEME_KEY, k); } catch { /* private mode: this visit only */ }
}

/** The next round's place, remembered as the last one; dev builds take ?spook=klassiek|zombie|schip (screenshots). */
export function nextTheme(forced?: string | null, rng: () => number = Math.random): SpookTheme {
    const k = isSpookTheme(forced) ? forced : pickTheme(readLastTheme(), rng);
    saveLastTheme(k);
    return k;
}
