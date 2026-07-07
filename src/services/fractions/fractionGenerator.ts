import type { FractionExercise, FractionSubType, FractionShape, MathBlock } from '../math/types';

function getGridLayout(denominator: number): { rows: number; cols: number } {
    const layouts: Record<number, [number, number]> = {
        2: [1, 2], 3: [1, 3], 4: [2, 2], 5: [1, 5],
        6: [2, 3], 7: [1, 7], 8: [2, 4], 9: [3, 3],
        10: [2, 5], 12: [3, 4],
    };
    const entry = layouts[denominator];
    return entry ? { rows: entry[0], cols: entry[1] } : { rows: 1, cols: denominator };
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeShapeExercise(subType: FractionSubType, block: MathBlock): FractionExercise {
    const { shape = 'rectangle', shapes, minDenominator = 2, maxDenominator = 8 } = block.constraints;
    // Teacher may enable several shapes; pick one per exercise (back-compat: fall back to single `shape`).
    const shapeOptions: FractionShape[] = Array.isArray(shapes) && shapes.length ? shapes : [shape as FractionShape];
    const chosenShape = shapeOptions[randInt(0, shapeOptions.length - 1)];
    // Any denominator in range renders: getGridLayout gives a nice grid for composite
    // values and falls back to a 1×d strip otherwise. (Was restricted to a 9-value list
    // that silently substituted 4 for ranges like 7-7 or 13-16 — outside the range.)
    const lo = Math.max(2, minDenominator), hi = Math.max(lo, maxDenominator);
    const denominator = randInt(lo, hi);
    const numerator = randInt(1, denominator - 1);
    // Square = single row of `denominator` vertical strips; rectangle uses the per-denominator grid.
    const { rows, cols } = chosenShape === 'square' ? { rows: 1, cols: denominator } : getGridLayout(denominator);
    const coloredIndices = shuffle(Array.from({ length: denominator }, (_, i) => i))
        .slice(0, numerator).sort((a, b) => a - b);
    return {
        id: Math.random().toString(36).substring(2, 9),
        subType,
        numerator, denominator,
        shape: chosenShape,
        coloredIndices, gridRows: rows, gridCols: cols,
        isManuallyEdited: false,
    };
}

function makeAmountExercise(subType: FractionSubType, block: MathBlock): FractionExercise {
    const { objectShape = 'circle', maxTotal = 20, minDenominator = 2, maxDenominator = 5 } = block.constraints;
    // Total = denominator × multiplier must stay ≤ maxTotal, so the denominator can't
    // exceed maxTotal and the multiplier is bounded (was forced ≥2 → total up to 2×den
    // overshot maxTotal when maxTotal < 2×denominator).
    const lo = Math.max(2, minDenominator);
    const hi = Math.max(lo, Math.min(maxDenominator, maxTotal));
    const denominator = randInt(lo, hi);
    const numerator = randInt(1, denominator - 1);
    const maxMult = Math.max(1, Math.floor(maxTotal / denominator));
    const multiplier = randInt(Math.min(2, maxMult), maxMult);
    return {
        id: Math.random().toString(36).substring(2, 9),
        subType,
        numerator, denominator,
        total: denominator * multiplier,
        objectShape: objectShape as 'circle' | 'square',
        isManuallyEdited: false,
    };
}

function makeLijnstukExercise(block: MathBlock): FractionExercise {
    const { minDenominator = 2, maxDenominator = 6, minLineLength = 1, maxLineLength = 15 } = block.constraints;
    // Swap-safe length window; line = denominator × multiplier keeps each of the
    // `denominator` segments a whole number of cm.
    const loLen = Math.max(1, Math.min(minLineLength, maxLineLength));
    const hiLen = Math.max(loLen, maxLineLength);
    // Only pick denominators that fit at least once within the max length (mult=1 → length=d ≤ hiLen);
    // otherwise a line of d cm would already blow the ceiling.
    const denChoices: number[] = [];
    for (let d = Math.max(2, minDenominator); d <= maxDenominator; d++) if (d <= hiLen) denChoices.push(d);
    const denominator = denChoices.length ? denChoices[randInt(0, denChoices.length - 1)] : Math.max(2, minDenominator);
    const numerator = randInt(1, denominator - 1);
    const minMult = Math.max(1, Math.ceil(loLen / denominator));
    const maxMult = Math.max(minMult, Math.floor(hiLen / denominator));
    const multiplier = randInt(minMult, maxMult);
    // Degenerate settings (denominator > hiLen) can still overshoot — clamp to the ceiling.
    const lineLength = Math.min(hiLen, denominator * multiplier);
    return {
        id: Math.random().toString(36).substring(2, 9),
        subType: 'lijnstuk',
        numerator, denominator,
        lineLength,
        isManuallyEdited: false,
    };
}

// All w×h rectangles fitting the box whose area is a whole multiple of `d`
// (so numerator/d shades whole cells — the viewer needs d | w*h).
function veelhoekRects(d: number, mW: number, mH: number): [number, number][] {
    const rects: [number, number][] = [];
    for (let w = 1; w <= mW; w++)
        for (let h = 1; h <= mH; h++)
            if (w * h >= d && (w * h) % d === 0) rects.push([w, h]);
    return rects;
}

function makeVeelhoekExercise(block: MathBlock): FractionExercise {
    const { minDenominator = 2, maxDenominator = 9, maxWidth = 6, maxHeight = 6, maxDimension = 6 } = block.constraints;
    const mW = maxWidth ?? maxDimension;
    const mH = maxHeight ?? maxDimension;

    // Only offer denominators that can actually be tiled with whole cells inside mW×mH.
    // (e.g. 7 has no rectangle ≤6×6 with area divisible by 7 → it would otherwise force
    //  an out-of-bounds fallback rectangle.)
    const denChoices: number[] = [];
    for (let d = Math.max(2, minDenominator); d <= maxDenominator; d++)
        if (veelhoekRects(d, mW, mH).length) denChoices.push(d);
    const denominator = denChoices.length ? denChoices[randInt(0, denChoices.length - 1)] : Math.max(2, minDenominator);
    const numerator = randInt(1, denominator - 1);

    const rects = veelhoekRects(denominator, mW, mH);
    // Fallback (impossible box, e.g. 1×1) fills the box — still within bounds.
    const [width, height] = rects.length
        ? rects[randInt(0, rects.length - 1)]
        : [Math.max(1, Math.min(denominator, mW)), Math.min(denominator, mH)];

    return {
        id: Math.random().toString(36).substring(2, 9),
        subType: 'veelhoek',
        numerator, denominator,
        rectangleWidth: width,
        rectangleHeight: height,
        isManuallyEdited: false,
    };
}

function makeAbstractExercise(block: MathBlock): FractionExercise {
    const { minDenominator = 2, maxDenominator = 9, level = 1, maxAbstractN3 = 1000 } = block.constraints;
    const denominator = randInt(minDenominator, maxDenominator);
    const numerator = randInt(1, denominator - 1);
    let total: number;
    if (level === 1) {
        total = denominator * randInt(1, 10);
    } else if (level === 2) {
        total = denominator * randInt(1, 10) * 10;
    } else {
        const maxMult = Math.floor(maxAbstractN3 / denominator);
        total = denominator * Math.max(1, randInt(1, maxMult));
    }
    return {
        id: Math.random().toString(36).substring(2, 9),
        subType: 'hoeveelheid-abstract',
        numerator, denominator,
        total,
        isManuallyEdited: false,
    };
}

export function generateFractionExercises(block: MathBlock): FractionExercise[] {
    const subType = (block.constraints.subType || 'kleuren') as FractionSubType;
    const count = block.numberOfExercises || 6;

    return Array.from({ length: count }, (): FractionExercise => {
        switch (subType) {
            case 'kleuren':
            case 'herkennen':
                return makeShapeExercise(subType, block);
            case 'hoeveelheid':
            case 'hoeveelheid-rechthoek':
                return makeAmountExercise(subType, block);
            case 'hoeveelheid-abstract':
                return makeAbstractExercise(block);
            case 'lijnstuk':
                return makeLijnstukExercise(block);
            case 'veelhoek':
                return makeVeelhoekExercise(block);
        }
    });
}
