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
    const valid = [2, 3, 4, 5, 6, 8, 9, 10, 12].filter(d => d >= minDenominator && d <= maxDenominator);
    const denominator = valid.length ? valid[randInt(0, valid.length - 1)] : 4;
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
    const denominator = randInt(minDenominator, maxDenominator);
    const numerator = randInt(1, denominator - 1);
    const maxMult = Math.floor(maxTotal / denominator);
    const multiplier = Math.max(2, randInt(2, maxMult));
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

function makeVeelhoekExercise(block: MathBlock): FractionExercise {
    const { minDenominator = 2, maxDenominator = 9, maxWidth = 6, maxHeight = 6, maxDimension = 6 } = block.constraints;
    const mW = maxWidth ?? maxDimension;
    const mH = maxHeight ?? maxDimension;
    const denominator = randInt(minDenominator, maxDenominator);
    const numerator = randInt(1, denominator - 1);

    // Find w×h pairs where w*h is divisible by denominator, w ≤ mW and h ≤ mH
    const maxMult = Math.floor((mW * mH) / denominator);
    const multiplier = Math.max(1, randInt(1, Math.max(1, maxMult)));
    const total = denominator * multiplier;

    const factors: [number, number][] = [];
    for (let w = 1; w <= Math.min(total, mW); w++) {
        if (total % w === 0) {
            const h = total / w;
            if (h <= mH) factors.push([w, h]);
        }
    }
    const [width, height] = factors.length
        ? factors[randInt(0, factors.length - 1)]
        : [denominator, multiplier];

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
