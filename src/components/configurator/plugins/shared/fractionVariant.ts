import type { FractionSubType } from '../../../../services/math/types';

// Per-variant starting constraints (also the list of keys a variant understands).
export function variantDefaults(subType: FractionSubType): Record<string, unknown> {
    switch (subType) {
        case 'kleuren':               return { shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8 };
        case 'herkennen':             return { shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8, answerFormat: 'fraction-questions' };
        case 'hoeveelheid':           return { objectShape: 'circle', minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-hulp' };
        case 'hoeveelheid-rechthoek': return { minDenominator: 2, maxDenominator: 5, maxTotal: 20, answerFormat: 'met-berekening' };
        case 'hoeveelheid-abstract':  return { minDenominator: 2, maxDenominator: 9, level: 1, answerMode: 'berekeningslijnen', maxAbstractN3: 1000 };
        // maxLineLength 12 -> 8 (C1 step 11): past 8cm the to-scale line eats more than
        // half of even a full-width column, so the default now stays inside that budget.
        case 'lijnstuk':              return { minDenominator: 2, maxDenominator: 6, minLineLength: 4, maxLineLength: 8, answerMode: 'berekeningslijnen' };
        case 'veelhoek':              return { minDenominator: 2, maxDenominator: 9, maxWidth: 6, maxHeight: 6 };
    }
}

// Answer keys hold per-variant enum values ('met-hulp' vs 'met-berekening'), so they never carry over.
const VARIANT_VALUED_KEYS = new Set(['answerFormat', 'answerMode']);

// A variant switch keeps every teacher setting the new variant also understands, defaults fill the rest.
export function constraintsForVariant(current: Record<string, unknown>, next: FractionSubType): Record<string, unknown> {
    const defaults = variantDefaults(next);
    const kept: Record<string, unknown> = {};
    for (const key of Object.keys(defaults)) {
        if (VARIANT_VALUED_KEYS.has(key)) continue;
        if (current[key] !== undefined) kept[key] = current[key];
    }
    return { ...defaults, ...kept, subType: next };
}
