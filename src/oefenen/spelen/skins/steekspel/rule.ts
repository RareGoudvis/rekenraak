import { duelOptions } from '../../duel/options';
import type { DuelRoundView, DuelRule, Side } from '../../duel/types';

// Steekspel on the duel engine (owner 2026-11-18): every joust is one minute of sums. Both knights wait at their end
// of the list and gear up: each right answer is a point, and every few points add a piece (a plume, a shining lance,
// the horse's armour, a banner, a crown). When the minute is up they gallop at each other and tilt: the knight with
// the most right answers wins the tilt and the other lands in the hay; the same number = both lances break, nobody
// falls (a draw). One joust = one duel round; no lives, so the levens row is left out of the options.

export const JOUST = {
    // One joust, in seconds of play (the engine's round clock; a pause does not count).
    seconds: 60,
    // Right answers that add the next piece of gear: owner brief "each right answer visibly gears up that knight";
    // a pupil at about one sum per 5 s reaches the plume early and the crown near the end of a good minute.
    gearAt: [2, 4, 6, 9, 12] as readonly number[],
    // The last seconds before the charge: the lances go down and the horses paw the ground.
    readySeconds: 5,
    // The charge, the crash, the fall into the hay and the winner's salute before the scoreboard card.
    cardMs: 5600,
} as const;

// The gear, in the order it comes (art.tsx draws each piece; the call names it).
export const GEAR = ['pluim', 'lans', 'harnas', 'vaandel', 'kroon'] as const;
export type GearPiece = typeof GEAR[number];
export const GEAR_CALL: Record<GearPiece, string> = { pluim: 'Een pluim!', lans: 'Glimmende lans!', harnas: 'Een harnas!', vaandel: 'Een vaandel!', kroon: 'Een kroon!' };

/** Steekspel's options: the shared duel options without the levens row (a joust has none). */
export const JOUST_OPTIONS = duelOptions().filter(o => o.id !== 'levens');

/** How many pieces of gear a knight has after this many right answers. */
export const gearOf = (rights: number) => JOUST.gearAt.filter(n => rights >= n).length;

/** The piece a right answer just added (the rights after it), or null. */
export function gearGained(rights: number): GearPiece | null {
    const i = JOUST.gearAt.indexOf(rights);
    return i < 0 ? null : GEAR[i];
}

/** The tilt when the minute is up: more right answers wins, the same = a draw; null while the minute runs. */
export function tiltOf(view: DuelRoundView, timeUp: boolean): Side | 'draw' | null {
    if (!timeUp) return null;
    const { left, right } = view.sides;
    if (left.points === right.points) return 'draw';
    return left.points > right.points ? 'left' : 'right';
}

export const JOUST_RULE: DuelRule = {
    right: ({ side }) => ({ points: { [side]: 1 } }),
    // A mistake costs only the time of the flash (and the horse sneezes).
    roundOver: tiltOf,
    cardMs: JOUST.cardMs,
};
