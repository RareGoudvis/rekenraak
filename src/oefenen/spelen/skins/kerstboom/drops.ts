import { DECOR } from './tree';

// Two counted mistakes in a row knock a bauble off the tree; it rolls onto the floor and stays there.
// Fair rule (no progress lost): the climb is the session's (goalKeep), the bauble's spot stays empty only
// until the next right answer, which hangs a fresh bauble in the gap next to its own new decoration.

// Counted mistakes in a row that knock one off.
export const DROP_AFTER = 2;

export interface Fallen {
    // The DECOR spot it fell from.
    spot: number;
    // Its place on the floor (floorSpot), in the order they fell.
    n: number;
}

export interface DropState {
    // The session's counters this state has seen (progress.right, progress.mistakes).
    right: number;
    mistakes: number;
    // Counted mistakes since the last right answer or the last drop.
    run: number;
    // Spots whose bauble fell and that wait for the next right answer.
    gaps: number[];
    // Every bauble that fell this round, on the floor for good.
    fallen: Fallen[];
    // Spots the last right answer filled again (they pop back in).
    refilled: number[];
}

export const startDrops = (right = 0, mistakes = 0): DropState => ({ right, mistakes, run: 0, gaps: [], fallen: [], refilled: [] });

/** The spot that falls: the newest hung bauble still on the tree, or null when none hangs. */
export function droppable(hung: number, gaps: readonly number[]): number | null {
    for (let i = Math.min(hung, DECOR.length) - 1; i >= 0; i--) {
        if (DECOR[i].kind === 'bauble' && !gaps.includes(i)) return i;
    }
    return null;
}

/** The next state after the session's counters moved; the same object when nothing changed. */
export function stepDrops(s: DropState, now: { right: number; mistakes: number; hung: number }): DropState {
    // The counters went back: a new round on the same screen, an empty floor.
    if (now.right < s.right || now.mistakes < s.mistakes) return startDrops(now.right, now.mistakes);
    if (now.right > s.right) {
        return { ...s, right: now.right, mistakes: now.mistakes, run: 0, gaps: [], refilled: s.gaps };
    }
    if (now.mistakes > s.mistakes) {
        const run = s.run + (now.mistakes - s.mistakes);
        const base = { ...s, right: now.right, mistakes: now.mistakes, refilled: [] };
        if (run < DROP_AFTER) return { ...base, run };
        const spot = droppable(now.hung, s.gaps);
        // Nothing hangs yet: nothing falls, and the next two mistakes are a new run.
        if (spot === null) return { ...base, run: 0 };
        return { ...base, run: 0, gaps: [...s.gaps, spot], fallen: [...s.fallen, { spot, n: s.fallen.length }] };
    }
    return s;
}
