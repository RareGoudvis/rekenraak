// The Kerstboom room, in SVG viewBox units: the tree's decorations in hanging order (the star last),
// the presents that pile up, and the floor spots where fallen baubles come to rest.

export const VIEW_X = -20;
export const VIEW_W = 360;
export const VIEW_H = 360;
// The wall's bottom edge (the floor starts here).
export const FLOOR = 296;
// Where a fallen bauble's centre rests on the floor.
export const FLOOR_BALL_Y = 336;

export type Pt = readonly [number, number];
export type BaubleShape = 'round' | 'drop' | 'onion';
export type BaublePattern = 'plain' | 'stripes' | 'dots' | 'zigzag';

export type Decor =
    | { kind: 'bauble'; x: number; y: number; c: number; shape: BaubleShape; pattern: BaublePattern }
    // A swag of fairy lights or tinsel along a curve (from, control, to).
    | { kind: 'lights'; from: Pt; via: Pt; to: Pt; bulbs: number }
    | { kind: 'tinsel'; from: Pt; via: Pt; to: Pt }
    | { kind: 'cane'; x: number; y: number; flip: boolean }
    | { kind: 'starlet'; x: number; y: number };

// 14 decorations before the star, spread over the three tiers so the tree fills evenly, the kinds mixed so every few answers bring something new.
// Bauble colours c: 0 red, 1 gold, 2 blue, 3 purple, 4 silver.
export const DECOR: readonly Decor[] = [
    { kind: 'bauble', x: 90, y: 276, c: 0, shape: 'round', pattern: 'stripes' },
    { kind: 'tinsel', from: [100, 170], via: [160, 206], to: [220, 170] },
    { kind: 'bauble', x: 190, y: 140, c: 2, shape: 'round', pattern: 'plain' },
    { kind: 'cane', x: 162, y: 262, flip: false },
    { kind: 'lights', from: [80, 236], via: [160, 278], to: [240, 236], bulbs: 7 },
    { kind: 'bauble', x: 108, y: 208, c: 4, shape: 'round', pattern: 'dots' },
    { kind: 'bauble', x: 128, y: 278, c: 1, shape: 'drop', pattern: 'plain' },
    { kind: 'lights', from: [122, 104], via: [160, 132], to: [198, 104], bulbs: 5 },
    { kind: 'starlet', x: 160, y: 210 },
    { kind: 'bauble', x: 232, y: 274, c: 3, shape: 'round', pattern: 'zigzag' },
    { kind: 'bauble', x: 132, y: 142, c: 1, shape: 'onion', pattern: 'stripes' },
    { kind: 'cane', x: 190, y: 196, flip: true },
    { kind: 'bauble', x: 196, y: 280, c: 2, shape: 'onion', pattern: 'dots' },
    { kind: 'bauble', x: 216, y: 208, c: 0, shape: 'drop', pattern: 'stripes' },
];

// The decorations in all, the star included.
export const DECOR_ALL = DECOR.length + 1;

/** How many decorations hang at this climb (the last one is the star); a goal other than 15 is scaled onto the spots. */
export function hungFor(count: number, target: number): number {
    if (target <= 0 || count <= 0) return 0;
    if (count >= target) return DECOR_ALL;
    return Math.min(DECOR_ALL - 1, Math.round((count * DECOR_ALL) / target));
}

/** A point on the quadratic curve from → via → to at t (0..1). */
export function onCurve(from: Pt, via: Pt, to: Pt, t: number): Pt {
    const u = 1 - t;
    return [u * u * from[0] + 2 * u * t * via[0] + t * t * to[0], u * u * from[1] + 2 * u * t * via[1] + t * t * to[1]];
}

/** The bulbs of a light string, evenly along its curve, the ends left free. */
export function bulbsOf(d: Extract<Decor, { kind: 'lights' }>): Pt[] {
    return Array.from({ length: d.bulbs }, (_, i) => onCurve(d.from, d.via, d.to, (i + 0.5) / d.bulbs));
}

/** Where a decoration sits (the burst of sparkles when it goes up). */
export function decorAt(d: Decor): Pt {
    if (d.kind === 'lights' || d.kind === 'tinsel') return onCurve(d.from, d.via, d.to, 0.5);
    return [d.x, d.y];
}

// The topper's centre.
export const STAR_AT: Pt = [160, 36];

// Presents under the tree: each shows from `at` decorations hung, so the pile grows through the round.
// x = left edge, base = the box's bottom, c = paper colour (0 red, 1 gold, 2 blue, 3 purple, 4 green).
export interface Present { x: number; base: number; w: number; h: number; c: number; at: number }
export const PRESENTS: readonly Present[] = [
    { x: 236, base: 328, w: 34, h: 40, c: 3, at: 2 },
    { x: 62, base: 326, w: 32, h: 24, c: 2, at: 4 },
    { x: 90, base: 342, w: 42, h: 30, c: 0, at: 6 },
    { x: 196, base: 344, w: 38, h: 26, c: 1, at: 8 },
    { x: 266, base: 340, w: 30, h: 22, c: 4, at: 11 },
    { x: 138, base: 352, w: 26, h: 18, c: 2, at: 13 },
    { x: 226, base: 356, w: 28, h: 16, c: 0, at: DECOR_ALL },
];

export const presentsFor = (hung: number) => PRESENTS.filter(p => hung >= p.at);

// The floor spots for fallen baubles, the first in plain view in front of the tree; after these they pile up beside the first ones.
const FLOOR_XS = [176, 306, 214, 330, 120, 270, 150, 84];

/** The x where the n-th fallen bauble comes to rest. */
export function floorSpot(n: number): number {
    const x = FLOOR_XS[n % FLOOR_XS.length];
    // Later ones roll up against the earlier ones, on the side towards the tree (never out of the room).
    return x + Math.floor(n / FLOOR_XS.length) * (x < 160 ? 13 : -13);
}

// A bauble's radius on the floor: how far it turns per unit rolled.
const BALL_R = 11;

/** The turn (deg) a fallen bauble ends on after rolling dx back to its spot: round ones just roll, a drop or onion lies on its side. */
export function rollSpin(dx: number, shape: BaubleShape): number {
    const raw = (-dx / (2 * Math.PI * BALL_R)) * 360;
    if (shape === 'round') return Math.round(raw) || 0;
    return Math.round((raw - 90) / 180) * 180 + 90;
}
