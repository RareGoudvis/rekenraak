// The Kerstboom room, in SVG viewBox units: the tree's decoration spots, bottom tier first, the star last.

export const VIEW_W = 320;
export const VIEW_H = 360;
// The floor's top edge.
export const FLOOR = 318;

export type Decor =
    | { kind: 'bauble'; x: number; y: number; c: number }
    | { kind: 'tinsel'; d: string };

// 14 spots before the star: five baubles and a garland on the bottom tier, four and one in the middle, two and one on top.
export const DECOR: readonly Decor[] = [
    { kind: 'bauble', x: 88, y: 272, c: 0 },
    { kind: 'bauble', x: 124, y: 262, c: 1 },
    { kind: 'bauble', x: 160, y: 276, c: 2 },
    { kind: 'bauble', x: 196, y: 262, c: 3 },
    { kind: 'bauble', x: 232, y: 272, c: 0 },
    { kind: 'tinsel', d: 'M100 236 Q160 260 220 236' },
    { kind: 'bauble', x: 104, y: 206, c: 1 },
    { kind: 'bauble', x: 140, y: 198, c: 2 },
    { kind: 'bauble', x: 180, y: 206, c: 3 },
    { kind: 'bauble', x: 216, y: 198, c: 0 },
    { kind: 'tinsel', d: 'M116 170 Q160 190 204 170' },
    { kind: 'bauble', x: 134, y: 132, c: 1 },
    { kind: 'bauble', x: 186, y: 132, c: 2 },
    { kind: 'tinsel', d: 'M130 98 Q160 114 190 98' },
];

// The decorations in all, the star included.
export const DECOR_ALL = DECOR.length + 1;

/** How many decorations hang at this climb (the last one is the star); a goal other than 15 is scaled onto the spots. */
export function hungFor(count: number, target: number): number {
    if (target <= 0 || count <= 0) return 0;
    if (count >= target) return DECOR_ALL;
    return Math.min(DECOR_ALL - 1, Math.round((count * DECOR_ALL) / target));
}

// Fairy lights that switch on when the tree is finished, spread over the three tiers.
export const LIGHTS: readonly [number, number][] = [
    [160, 70], [146, 88], [176, 86], [124, 118], [160, 124], [198, 116], [112, 146],
    [100, 160], [130, 178], [192, 182], [222, 162], [90, 192], [160, 210], [234, 214],
    [76, 236], [124, 244], [196, 246], [246, 240], [66, 282], [142, 288], [180, 286], [256, 284],
];
