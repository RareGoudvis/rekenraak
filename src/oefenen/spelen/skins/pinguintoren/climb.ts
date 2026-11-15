// What the Pinguïntoren tower shows for the session's climb. The session keeps its count as always (+1 per
// right answer, −1 per counted mistake, never below 0); the skin draws that count with a crack in between:
// a first mistake cracks the two lowest blocks (the block it owes), the next one breaks them (two blocks
// down at once), and a right answer while cracked freezes the cracks shut instead of adding a block.
// So shown blocks = count + (cracked ? 1 : 0), always.

export type TowerChange = 'up' | 'heal' | 'crack' | 'break' | 'shake' | null;

export interface TowerState {
    // The session's numbers this state was made from.
    count: number;
    mistakes: number;
    // Block ids, bottom first (an id keeps its look when the tower drops).
    blocks: number[];
    // The next new block's id.
    next: number;
    // The two lowest blocks have cracks: one mistake is owed.
    cracked: boolean;
    change: TowerChange;
    // Ids that just broke (change 'break'), bottom first.
    broken: number[];
    // Bumps on every change: the key that restarts its animations.
    n: number;
    // Breaks so far: the key of the tower settling down after one.
    breaks: number;
    // The question on screen when the last change came (a wrong flash with no change of its own was met hulp).
    at: string | null;
}

export function towerStart(count: number, mistakes: number): TowerState {
    const blocks = Array.from({ length: count }, (_, i) => i);
    return { count, mistakes, blocks, next: count, cracked: false, change: null, broken: [], n: 0, breaks: 0, at: null };
}

/** The tower after the session's climb or mistakes changed (the same state when nothing did). */
export function towerStep(s: TowerState, count: number, mistakes: number, at: string | null = null): TowerState {
    if (count === s.count && mistakes === s.mistakes) return s;
    const base = { ...s, count, mistakes, broken: [] as number[], n: s.n + 1, at };
    // A right answer (met hulp too): the cracks freeze shut, or a new block lands.
    if (count === s.count + 1 && mistakes === s.mistakes) {
        return s.cracked
            ? { ...base, cracked: false, change: 'heal' }
            : { ...base, blocks: [...s.blocks, s.next], next: s.next + 1, change: 'up' };
    }
    // A counted mistake: one off the climb (or none on an empty floe, the session's floor of 0).
    if (mistakes === s.mistakes + 1 && (count === s.count - 1 || (count === 0 && s.count === 0))) {
        if (s.cracked) {
            const drop = s.blocks.length - count;
            return { ...base, blocks: s.blocks.slice(drop), broken: s.blocks.slice(0, drop), cracked: false, change: 'break', breaks: s.breaks + 1 };
        }
        if (!s.blocks.length) return { ...base, change: 'shake' };
        return { ...base, cracked: true, change: 'crack' };
    }
    // Anything else (a new round, a jump): start over from the count, ids running on so nothing replays.
    const blocks = Array.from({ length: count }, (_, i) => s.next + i);
    return { ...base, blocks, next: s.next + count, cracked: false, change: null };
}

/** The blocks the cracks are in: the two lowest. */
export const crackedIds = (s: TowerState): number[] => (s.cracked ? s.blocks.slice(0, 2) : []);
