// Verborgen prent: which picture, and in what order the tiles come off. Pure apart from the device memory.

export const GRID = 4;
export const TILES = GRID * GRID;
// The last picture on this device, so the next round never shows the same one.
export const PRENT_KEY = 'rekenraak_spelen_prent_v1';

export function lastPrent(): string | null {
    try { return globalThis.localStorage?.getItem(PRENT_KEY) ?? null; } catch { return null; }
}

export function rememberPrent(id: string): void {
    try { globalThis.localStorage?.setItem(PRENT_KEY, id); } catch { /* private mode: this visit only */ }
}

/** A random picture, never the one shown last (unless there is only one). */
export function pickPrent(ids: readonly string[], last: string | null, rand: () => number = Math.random): string {
    const pool = ids.length > 1 ? ids.filter(id => id !== last) : ids;
    return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** The tiles in the order they flip away (a shuffle of 0 … TILES − 1). */
export function tileOrder(rand: () => number = Math.random): number[] {
    const order = Array.from({ length: TILES }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

/** How many tiles are off at this climb: one per right answer, all of them at the goal (another goal is scaled). */
export function flippedFor(count: number, target: number): number {
    if (target <= 0 || count <= 0) return 0;
    if (count >= target) return TILES;
    return Math.min(TILES - 1, Math.round((count * TILES) / target));
}

/** The drawn picture shown when a photo cannot load: the one it names, else one chosen steadily by the photo's id. */
export function fallbackFor(photo: { id: string; fallback?: string }, drawn: readonly string[]): string {
    if (photo.fallback && drawn.includes(photo.fallback)) return photo.fallback;
    let h = 0;
    for (const c of photo.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return drawn[h % drawn.length];
}
