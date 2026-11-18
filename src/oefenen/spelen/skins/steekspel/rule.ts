import type { DuelConfig, DuelRoundView, DuelRule, DuelSideView, Side } from '../../duel/types';

// Steekspel on the duel engine: two knights charge at each other along the barrier. A right answer = a gallop step
// (+1); 3 right in a row lower the lance, and it stays down until that knight's next mistake. When the knights meet
// (the steps of both add up to the list's length, 10 each on the default 20) the tilt happens: more steps wins, a
// lowered lance wins a tie, else both lances break and nobody falls (a draw). One tilt = one duel round.
// The tilt does not use lives: the levens row is the list's length ("Hoe lang is de baan?"), so config.lives = it.

export const JOUST = {
    // Steps until the knights meet (the levens row): owner brief 10 each, so 20.
    baan: { label: 'Hoe lang is de baan?', choices: [10, 15, 20, 25, 30] as readonly number[], default: 20 },
    // Right answers in a row that lower the lance.
    lanceAt: 3,
    // The tilt, the fall into the hay and the winner's salute before the scoreboard card.
    cardMs: 4200,
} as const;

/** The list's length: the levens pick (the Hoe lang is de baan? row). */
export const baanOf = (config: Pick<DuelConfig, 'lives'>) => config.lives;

/** The knight's lance is down (its flag). */
export const lanceDown = (v: Pick<DuelSideView, 'flags'>) => (v.flags.lance ?? 0) > 0;

/** How far a knight has come towards the meeting, 0..1 of the list (both together reach 1 at the tilt). */
export const shareOf = (points: number, baan: number) => Math.max(0, Math.min(1, points / Math.max(1, baan)));

/** The tilt once the knights meet: more steps wins, then a lowered lance, else a draw; null while they still ride. */
export function tiltOf(view: DuelRoundView): Side | 'draw' | null {
    const { left, right } = view.sides;
    if (left.points + right.points < baanOf(view.config)) return null;
    if (left.points !== right.points) return left.points > right.points ? 'left' : 'right';
    const l = lanceDown(left), r = lanceDown(right);
    if (l !== r) return l ? 'left' : 'right';
    return 'draw';
}

/** Why the tilt went this way, for the scene's call: on steps, on the lance, or a draw. */
export function tiltReason(view: DuelRoundView): 'steps' | 'lance' | 'draw' | null {
    const w = tiltOf(view);
    if (!w) return null;
    if (w === 'draw') return 'draw';
    return view.sides.left.points === view.sides.right.points ? 'lance' : 'steps';
}

export const JOUST_RULE: DuelRule = {
    right: ({ side, streak, me }) => ({
        points: { [side]: 1 },
        ...(streak >= JOUST.lanceAt && !lanceDown(me) && { flags: { [side]: { lance: 1 } }, tag: 'lance' }),
    }),
    // A mistake lifts a lowered lance again (the engine breaks the streak); without one it only costs the step.
    wrong: ({ side, me }) => (lanceDown(me) ? { flags: { [side]: { lance: 0 } }, tag: 'lanceUp' } : {}),
    roundOver: view => tiltOf(view),
    cardMs: JOUST.cardMs,
};
