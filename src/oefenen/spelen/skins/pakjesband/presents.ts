import { mulberry32, seedOf } from '../../distractors';

// How the Speelgoedfabriek's presents look, seeded per sum: four different shapes, four different wrapping colours,
// a pattern, a ribbon colour and a size each. Pure, so a sum always looks the same (tests, screenshots).

export const PRESENT_SHAPES = ['box', 'tall', 'tin', 'tube', 'star'] as const;
export type PresentShape = typeof PRESENT_SHAPES[number];
export const PRESENT_PATTERNS = ['plain', 'stripes', 'dots', 'zigzag', 'stars'] as const;
export type PresentPattern = typeof PRESENT_PATTERNS[number];
// The toys fed into the machine (and popping out of it when it sputters).
export const TOYS = ['teddy', 'ball', 'duck', 'rocket', 'car', 'block'] as const;
export type ToyKind = typeof TOYS[number];
// The six --spel-fill-N game colours.
export const PRESENT_FILLS = 6;

export interface PresentLook {
    shape: PresentShape;
    // --spel-fill-N for the paper, and for the ribbon (never the paper's own colour).
    fill: number;
    ribbon: number;
    pattern: PresentPattern;
    // The drawing's scale in its slot (the tap target stays the whole slot).
    size: number;
}

// Where each shape's label sits (its centre, % of the slot from the top): a calm front face, clear of the bow.
export const LABEL_Y: Record<PresentShape, number> = { box: 64, tall: 60, tin: 71, tube: 60, star: 60 };

function shuffled<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** The looks of a sum's presents (count ≤ 5: every shape at most once). */
export function presentLooks(key: string, count = 4): PresentLook[] {
    const rng = mulberry32(seedOf(`fabriek:${key}`));
    const shapes = shuffled(PRESENT_SHAPES, rng);
    const fills = shuffled(Array.from({ length: PRESENT_FILLS }, (_, i) => i), rng);
    return Array.from({ length: count }, (_, i) => {
        const fill = fills[i % PRESENT_FILLS];
        // The ribbon: two to four steps round the colour wheel, so never the paper's own colour.
        const ribbon = (fill + 2 + Math.floor(rng() * 3)) % PRESENT_FILLS;
        return {
            shape: shapes[i % shapes.length],
            fill,
            ribbon,
            pattern: PRESENT_PATTERNS[Math.floor(rng() * PRESENT_PATTERNS.length)],
            size: Math.round((0.86 + 0.14 * rng()) * 100) / 100,
        };
    });
}
