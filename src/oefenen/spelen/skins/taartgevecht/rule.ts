import type { DuelRule } from '../../duel/types';

// Taartgevecht on the duel engine: one shared sum, both type at once (stream 'shared'). The first right answer
// throws a cream pie at the other contestant; it costs a life when it lands. A wrong answer locks that keypad
// for 2 s (the engine's wrongLockMs). The last pie of a round flies slower (the slow-motion moment).
// A Moeilijk time-out throws nothing: that side is out for this sum, nobody loses a life (the clock is pressure).

export const TAART = {
    // A pie's flight, the arm's swing included. Both stay under DUEL_TIMING.sharedNext, so a pie always lands
    // before the next shared sum shows: two pies can never cross, a round never ends in a double knock-out.
    flightMs: 640,
    finalMs: 960,
    // The arm's wind-up before the pie leaves the hand (part of the flight).
    releaseMs: 120,
    wrongLockMs: 2000,
    // The round's end: the slow splat, the winner's bow, the loser licks the cream; then the scoreboard card.
    endMs: 2800,
    // Cream blobs a face can carry before the last pie covers it whole.
    blobs: 6,
} as const;

/** The pie at `livesBefore` is the round's last one (the target has one life left). */
export const isFinalPie = (livesBefore: number) => livesBefore <= 1;

export const TAART_RULE: DuelRule = {
    right: ({ other, them }) => {
        const final = isFinalPie(them.lives);
        return {
            launch: {
                ms: final ? TAART.finalMs : TAART.flightMs, tag: 'pie', data: { final },
                effect: { damage: { [other]: 1 }, ...(final && { tag: 'final' }) },
            },
        };
    },
    cardMs: TAART.endMs,
};

/** Cream blobs on a face after `hits` this round out of `lives`: more per hit, all of them one hit before the end. */
export function creamBlobs(hits: number, lives: number): number {
    if (hits <= 0) return 0;
    if (hits >= lives) return TAART.blobs;
    if (lives <= 1) return TAART.blobs;
    return Math.max(1, Math.min(TAART.blobs, Math.round((hits / (lives - 1)) * TAART.blobs)));
}

