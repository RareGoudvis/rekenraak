// Spookhuis' rules, pure: the flashlight's size and place, when the card-flipper comes by, and the moments' timing.
// Hartjes koppelen's memory rules hold (board/session.ts, board/hartjes/hearts.ts): this only adds the dark and its visitors.

// The light's radius in card widths: one card fully lit, its neighbours only at the soft edge.
export const BEAM_CARDS = .68;
// Never smaller than a finger's reach on a phone, never a floodlight on a whiteboard.
export const BEAM_MIN_PX = 96;
export const BEAM_MAX_PX = 190;
// Touch: the light sits this many radii above the finger, so the finger never covers the card it lights.
export const TOUCH_LIFT = .85;
// A touch that moves this far is a sweep of the light, not a tap on a card.
export const SWEEP_PX = 14;
// How dark the floor with the cards is (1 = black): the cards stay findable at about 10 %.
export const FLOOR_DARK = .92;
// The room around them: dimmer, so the walls and their life stay visible.
export const ROOM_DARK = .5;

// The card-flipper (a friendly ghost, a zombie, a ghost pirate) is due this long after its last visit (play time only).
export const FLIPPER_EVERY_MS = 20_000;
// Once due, it turns back a card that has lain open alone this long (the pupil had time to read it).
export const FLIPPER_LONE_MS = 1_800;
// Due and no lone card for this long: it only floats by and waves, and the clock starts again.
export const FLIPPER_PASS_MS = 9_000;
// The flight across the room; the card turns back this far into it (the flipper is right above it then).
export const FLIPPER_FLIGHT_MS = 2_800;
export const FLIPPER_TURN_MS = 1_250;

// Two cards up that are no pair turn back after this long (as Hartjes); after a logged mistake a little longer,
// so the mistake picture and then the card's own face can both be seen.
export const FLIP_BACK_MS = 1_200;
export const MISTAKE_FLIP_BACK_MS = 2_000;
// The mistake picture (a pumpkin, a brain jelly, a rusty anchor) stands on the card this long.
export const MISTAKE_MS = 1_250;

// A found pair's moment, never blocking: the second card shows (0–20 %), both fly together (to 40 %), a puff (the
// hit), then the theme's visitor pops out and plays (a ghost waves, a zombie dances, a chest opens) until the end.
export const PAIR_MOMENT_MS = 2_000;
export const PAIR_HIT_MS = 820;
// It stays mounted a little longer so the last sparkles fly out (scene BURST_MS).
export const PAIR_TAIL_MS = PAIR_MOMENT_MS + 600;

export interface Pt { x: number; y: number }

/** The light's radius in px for this card width. */
export const beamRadius = (cardW: number): number => Math.round(Math.max(BEAM_MIN_PX, Math.min(BEAM_MAX_PX, cardW * BEAM_CARDS)));

/** Where the light shines for a pointer at p: on a mouse or pen right there, on a finger a little above it (never above the stage's top). */
export function beamAt(p: Pt, pointer: string, radius: number): Pt {
    if (pointer !== 'touch') return p;
    return { x: p.x, y: Math.max(radius * .35, p.y - radius * TOUCH_LIFT) };
}

/** Whether a point is inside the light (fully lit or at its soft edge). */
export const inBeam = (p: Pt, beam: Pt, radius: number): boolean => Math.hypot(p.x - beam.x, p.y - beam.y) <= radius * .8;

/** Which way a pair of eyes at `eye` looks towards the light: a unit-ish step (each axis -1..1), short when the light is close. */
export function lookAt(eye: Pt, beam: Pt, reach = 120): Pt {
    const dx = beam.x - eye.x, dy = beam.y - eye.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return { x: 0, y: 0 };
    const k = Math.min(1, d / reach) / d;
    return { x: dx * k, y: dy * k };
}

export type FlipperVisit = 'none' | 'trick' | 'pass';

/** The flipper's call this tick: `since` = play time since its last visit, `lone` = how long one card has lain open alone (0 = none). */
export function flipperVisit(since: number, lone: number): FlipperVisit {
    if (since < FLIPPER_EVERY_MS) return 'none';
    if (lone >= FLIPPER_LONE_MS) return 'trick';
    return since >= FLIPPER_EVERY_MS + FLIPPER_PASS_MS ? 'pass' : 'none';
}

/** The one card turned up and waiting for its partner, or null (none, or two up). */
export const loneCard = (up: readonly number[]): number | null => (up.length === 1 ? up[0] : null);

/** Where the flipper's flight starts and ends: from the far side of the card, across it, out the other side (in stage px). */
export function flightOf(card: Pt, stage: { w: number; h: number }, size: number): { from: Pt; at: Pt; to: Pt } {
    const fromLeft = card.x > stage.w / 2;
    const off = size * .9;
    const y = Math.max(size * .55, card.y - size * .55);
    return {
        from: { x: fromLeft ? -off : stage.w + off, y: Math.max(size * .5, y - stage.h * .18) },
        at: { x: card.x, y },
        to: { x: fromLeft ? stage.w + off : -off, y: Math.max(size * .5, y - stage.h * .12) },
    };
}

/** Each card's small tilt on the floor (degrees), the same every time for this board. */
export const tiltOf = (seed: number, id: number): number => (((seed + id * 2654435761) >>> 0) % 900) / 100 - 4.5;

// The free room beside the cards (px each side) that fits the tall furniture (a clock, a window), or only a slim piece.
export const ROOM_WIDE_PX = 150;
export const ROOM_NARROW_PX = 64;

/** How much of the room shows beside the cards: wide (window, clock, portrait), narrow (slim pieces), none (only the strip above). */
export const roomOf = (side: number): 'wide' | 'narrow' | 'none' => (side >= ROOM_WIDE_PX ? 'wide' : side >= ROOM_NARROW_PX ? 'narrow' : 'none');
