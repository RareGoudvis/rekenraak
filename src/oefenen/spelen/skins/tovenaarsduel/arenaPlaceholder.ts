// TEMPORARY stand-in for ./arenas (built on r5/arenas, same contract): a plain backdrop and the arena pick.
// Replaced by `import Arena, { pickArena, readLastArena, saveLastArena, type ArenaKind } from './arenas'` on merge.

export type ArenaKind = 'lab' | 'kerker' | 'school';
const KINDS: ArenaKind[] = ['lab', 'kerker', 'school'];
const KEY = 'rekenraak_tovenaarsduel_arena';

export function pickArena(last: ArenaKind | null = null, rng: () => number = Math.random): ArenaKind {
    const pool = KINDS.filter(k => k !== last);
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
export function readLastArena(): ArenaKind | null {
    try { const v = localStorage.getItem(KEY); return KINDS.includes(v as ArenaKind) ? v as ArenaKind : null; } catch { return null; }
}
export function saveLastArena(k: ArenaKind): void {
    try { localStorage.setItem(KEY, k); } catch { /* private mode */ }
}

export { default } from './ArenaStub';
