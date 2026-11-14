// Mollen meppen: when which mole pops up where, with which number. Pure: game time in ms (it only runs
// while the sum waits, so help and the flashes freeze it), a seeded or real rng.
// The skin never knows the answer, so every option comes round in a shuffled bag: the answer shows up at
// least once every few pop-ups, and two moles never carry the same number at once.

export const MOLE = {
    holes: 6,
    // How long a mole stays up at streak 0, and the time between two pop-ups (ms).
    upMs: 2500,
    everyMs: 850,
    // At most this many up at once.
    maxUp: 3,
    // A new sum: the first mole after this long.
    firstMs: 350,
    // A hole rests this long after its mole went down.
    restMs: 300,
    // Faster with the streak: +6 % per right answer in a row, up to 8 (about half as fast again).
    perStreak: 0.06,
    maxStreak: 8,
} as const;

export type Rng = () => number;

export interface Mole { id: number; hole: number; value: string; upAt: number; downAt: number }

export interface MoleField {
    // The latest mole per hole (up or already down): what the hole shows.
    moles: (Mole | null)[];
    nextAt: number;
    // Options still to come in this round of the bag.
    bag: string[];
    nextId: number;
}

/** The pace for a streak: 1 at no streak, a little faster per right answer in a row. */
export const molePace = (streak: number) => 1 + MOLE.perStreak * Math.min(Math.max(streak, 0), MOLE.maxStreak);

/** A fresh field for a new sum at game time t: every hole empty, the first mole soon. */
export function newField(t: number, nextId = 0): MoleField {
    return { moles: Array.from({ length: MOLE.holes }, () => null), nextAt: t + MOLE.firstMs, bag: [], nextId };
}

export const isUp = (m: Mole | null, t: number): m is Mole => !!m && t >= m.upAt && t < m.downAt;

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** The field at game time t: moles whose time is up go down, new ones pop up on free holes. */
export function stepField(f: MoleField, t: number, options: readonly string[], rng: Rng, pace = 1): MoleField {
    if (!options.length) return f;
    let { nextAt, bag, nextId } = f;
    const moles = [...f.moles];
    while (t >= nextAt) {
        const at = nextAt;
        nextAt += MOLE.everyMs / pace;
        const up = moles.filter(m => isUp(m, at));
        if (up.length >= MOLE.maxUp) continue;
        const free = moles.map((_, h) => h).filter(h => !moles[h] || at >= moles[h]!.downAt + MOLE.restMs);
        if (!free.length) continue;
        if (!bag.length) bag = shuffled(options, rng);
        // The first number in the bag that no mole carries now.
        const k = bag.findIndex(v => !up.some(m => m.value === v));
        if (k < 0) continue;
        const value = bag[k];
        bag = bag.filter((_, i) => i !== k);
        const hole = free[Math.floor(rng() * free.length)];
        moles[hole] = { id: nextId++, hole, value, upAt: at, downAt: at + MOLE.upMs / pace };
    }
    return { moles, nextAt, bag, nextId };
}

/** What each hole shows at t: the mole's id, number and whether it is up (the skin re-renders only on a change). */
export const viewOf = (f: MoleField, t: number) => f.moles.map(m => (m ? { id: m.id, value: m.value, up: isUp(m, t) } : null));
