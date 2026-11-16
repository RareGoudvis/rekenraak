// Which arena a Tovenaarsduel match is fought in (a random one, never the same twice in a row), and what an
// arena's art gets from the Arena wrapper.

export type ArenaKind = 'lab' | 'kerker' | 'school';
export type ArenaSide = 'left' | 'right' | null;

export const ARENA_KINDS: readonly ArenaKind[] = ['lab', 'kerker', 'school'];

// n = the big hits seen since this arena mounted (0 = none yet; one-shot effects are keyed on it), side = the
// side the latest one hit.
export interface ArenaArtProps { n: number; side: ArenaSide }

const ARENA_KEY = 'rekenraak_tovenaar_arena_v1';

const isArena = (v: unknown): v is ArenaKind => typeof v === 'string' && (ARENA_KINDS as readonly string[]).includes(v);

export function pickArena(last?: ArenaKind | null, rng: () => number = Math.random): ArenaKind {
    const pool = ARENA_KINDS.filter(k => k !== last);
    // Math.min: an rng that returns exactly 1 must not index past the end.
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function readLastArena(): ArenaKind | null {
    try {
        const v = globalThis.localStorage?.getItem(ARENA_KEY);
        return isArena(v) ? v : null;
    } catch { return null; }
}

export function saveLastArena(k: ArenaKind): void {
    try { globalThis.localStorage?.setItem(ARENA_KEY, k); } catch { /* private mode: this visit only */ }
}

// A small seeded generator so the stone walls and crowds look random but render the same every time.
export function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// How many one-shot pieces a hit throws on each half: more on the side that was hit.
export function burst(side: ArenaSide, half: 'left' | 'right', strong: number, weak: number): number {
    return side === null ? Math.round((strong + weak) / 2) : side === half ? strong : weak;
}
