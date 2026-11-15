// How the Bever scene acts out the race between dam and water. Pure, so the moods are testable; the
// component only maps them to classes (the water model itself lives in water.ts).

// The margin in sticks (the dam's top minus the water) under which the family stops playing to watch, and
// under which it gets nervous. The splash over the top (Bever.tsx) starts a little lower still.
export const FAMILY = { watch: 4, nervous: 2 } as const;

export type FamilyMood = 'play' | 'watch' | 'nervous';

export function familyMood(dam: number, water: number): FamilyMood {
    const margin = dam - water;
    return margin < FAMILY.nervous ? 'nervous' : margin < FAMILY.watch ? 'watch' : 'play';
}

// What the beaver does with the stick he just placed: every third right answer in a row he cheers (the
// family with him), every fourth stick he wipes his brow, otherwise he just puts it down.
export type BeaverAct = 'place' | 'wipe' | 'cheer';

export function actOf(placed: number, streak: number): BeaverAct {
    if (streak >= 3 && streak % 3 === 0) return 'cheer';
    return placed % 4 === 3 ? 'wipe' : 'place';
}

// His face: worried while a wave rolls in or the water is close, all smiles when he cheers.
export type BeaverFace = 'busy' | 'worried' | 'happy';

export function beaverFace(mood: FamilyMood, wrong: boolean, cheering: boolean): BeaverFace {
    if (cheering) return 'happy';
    return wrong || mood === 'nervous' ? 'worried' : 'busy';
}

// The light over the round: 0 = the fresh morning at the start, 1 = the warm evening at 0:00.
export function dayOf(msLeft: number | null, msTotal: number | null): number {
    if (msLeft === null || msTotal === null || msTotal <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - msLeft / msTotal));
}
