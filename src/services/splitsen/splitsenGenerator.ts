import type { MathBlock, SplitsenExercise } from '../math/types';
import { PLACE_VALUES, digitAtPlace } from '../math/mathEngine';
import { numberToDutchWords } from './dutchWords';

const randInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const rndId = () => Math.random().toString(36).substring(2, 9);

// Integer place values, high→low, up to one billion (PLACE_VALUES only reaches M).
const INT_PLACES = [
    { key: 'Mrd', label: 'Miljardtallen', weight: 1_000_000_000 },
    { key: 'HM', label: 'Honderdmiljoentallen', weight: 100_000_000 },
    { key: 'TM', label: 'Tienmiljoentallen', weight: 10_000_000 },
    { key: 'M', label: 'Miljoentallen', weight: 1_000_000 },
    { key: 'HD', label: 'Honderdduizendtallen', weight: 100_000 },
    { key: 'TD', label: 'Tienduizendtallen', weight: 10_000 },
    { key: 'D', label: 'Duizendtallen', weight: 1_000 },
    { key: 'H', label: 'Honderdtallen', weight: 100 },
    { key: 'T', label: 'Tientallen', weight: 10 },
    { key: 'E', label: 'Eenheden', weight: 1 },
];
// Decimal place values (tienden / honderdsten / duizendsten).
const DEC_PLACES = [
    { key: 't', label: 'Tienden', weight: 0.1 },
    { key: 'h', label: 'Honderdsten', weight: 0.01 },
    { key: 'd', label: 'Duizendsten', weight: 0.001 },
];

type Place = { key: string; label: string; digit: number; weight: number };

// Columns shown for a layout: integer places ≤ maxGetal, plus dp decimal places.
function placesFor(maxGetal: number, dp: number) {
    return [...INT_PLACES.filter(p => p.weight <= Math.max(1, maxGetal)), ...DEC_PLACES.slice(0, dp)];
}

// All columns (down to E + dp decimals) carrying this number's digit.
function fullColumns(num: number, maxGetal: number, dp: number): Place[] {
    return placesFor(maxGetal, dp).map(p => ({ ...p, digit: digitAtPlace(num, p.weight) }));
}

// Only the non-zero places (high→low), for legs / equation forms.
function nonZeroPlaces(num: number, dp: number): Place[] {
    return [...INT_PLACES, ...DEC_PLACES.slice(0, dp)]
        .map(p => ({ ...p, digit: digitAtPlace(num, p.weight) }))
        .filter(p => p.digit !== 0);
}

// A number whose nonzero places match the mask (else a random one), in [min, maxGetal].
function numFromMask(maxGetal: number, mask: Record<string, boolean>, dp: number): number {
    const scale = Math.pow(10, dp);
    const scaledCap = Math.round(maxGetal * scale);
    const hasMask = PLACE_VALUES.some(p => mask[p.key]);
    if (!hasMask) return randInt(Math.min(scaledCap, dp > 0 ? 1 : 11), scaledCap) / scale;
    let s = 0;
    for (const p of PLACE_VALUES) {
        if (mask[p.key]) {
            const w = Math.round(p.weight * scale);
            const maxd = Math.floor(scaledCap / Math.max(1, w));
            if (maxd >= 1) s += randInt(1, Math.min(9, maxd)) * w;
        }
    }
    return Math.max(1, Math.min(s, scaledCap)) / scale;
}

function generatePlaceValueExercises(block: MathBlock): SplitsenExercise[] {
    const {
        layout,
        maxGetal = 1000,
        mathDirection = 'decompose',
        operand1Mask = {},
    } = block.constraints;
    const dp = Math.min(3, Math.max(0, block.constraints.decimalPlaces ?? 0));
    const scale = Math.pow(10, dp);
    const benenCombos = parseBenenCombos(block.constraints);
    const mathFormList: string[] = Array.isArray(block.constraints.mathForms) && block.constraints.mathForms.length
        ? block.constraints.mathForms
        : [block.constraints.mathForm === 'expanded' ? 'expanded' : 'letters'];
    const n = block.numberOfExercises;
    const results: SplitsenExercise[] = [];
    const used = new Set<number>();

    for (let i = 0; i < n; i++) {
        const cap = layout === 'positie-tabel' ? Math.min(maxGetal, 1_000_000) : maxGetal;
        let num = numFromMask(cap, operand1Mask, dp);
        let attempts = 0;
        while (used.has(Math.round(num * scale)) && attempts < 200) { num = numFromMask(cap, operand1Mask, dp); attempts++; }
        used.add(Math.round(num * scale));

        const base: SplitsenExercise = { id: rndId(), total: num, pairs: [], isManuallyEdited: false };

        if (layout === 'positie-tabel') {
            results.push({ ...base, placeBreakdown: fullColumns(num, maxGetal, dp), words: numberToDutchWords(num) });
        } else if (layout === 'positie-benen') {
            const combo = benenCombos[randInt(0, benenCombos.length - 1)];
            results.push({ ...base, placeBreakdown: nonZeroPlaces(num, dp), blankSide: combo.blankSide, notation: combo.notation });
        } else {
            const form = mathFormList[randInt(0, mathFormList.length - 1)] === 'expanded' ? 'expanded' : 'letters';
            const dir = mathDirection === 'beide' ? (Math.random() < 0.5 ? 'decompose' : 'compose') : mathDirection;
            results.push({ ...base, placeBreakdown: nonZeroPlaces(num, dp), mathForm: form, mathDirection: dir });
        }
    }
    return results;
}

// Splitsbenen variant = a (blankSide, notation) combo, e.g. 'legs-letters'.
type BenenCombo = { blankSide: 'legs' | 'top'; notation: 'value' | 'letters' };
function parseBenenCombos(c: Record<string, unknown>): BenenCombo[] {
    const list = Array.isArray(c.benenVariants) ? (c.benenVariants as string[]) : [];
    const combos = list.map(s => {
        const [side, notation] = s.split('-');
        return { blankSide: side === 'top' ? 'top' : 'legs', notation: notation === 'value' ? 'value' : 'letters' } as BenenCombo;
    });
    if (combos.length) return combos;
    return [{ blankSide: (c.blankSide === 'top' ? 'top' : 'legs'), notation: (c.notation === 'value' ? 'value' : 'letters') }];
}

// Build a total from a place mask (integer + decimal places), in scaled-int space.
function generateTotal(maxGetal: number, mask: Record<string, boolean>, fixedTotal: number | null, dp: number): number {
    const scale = Math.pow(10, dp);
    if (fixedTotal && fixedTotal >= 2 && fixedTotal <= maxGetal) return fixedTotal;

    // PLACE_VALUES already includes the decimal places (t/h/d) — don't re-append.
    const places = PLACE_VALUES;
    const hasMask = places.some(p => mask[p.key]);
    if (!hasMask) {
        const minScaled = dp > 0 ? 1 : 2;
        return randInt(minScaled, Math.round(maxGetal * scale)) / scale;
    }

    let totalScaled = 0;
    for (const place of places) {
        if (mask[place.key]) {
            const wScaled = Math.round(place.weight * scale);
            const maxForPlace = Math.floor((maxGetal * scale) / Math.max(1, wScaled));
            if (maxForPlace >= 1) totalScaled += randInt(1, Math.min(9, maxForPlace)) * wScaled;
        }
    }
    return Math.max(dp > 0 ? 1 : 2, Math.min(totalScaled, Math.round(maxGetal * scale))) / scale;
}

function generateGiven(total: number, mask: Record<string, boolean>, dp: number): number {
    const scale = Math.pow(10, dp);
    const totalScaled = Math.round(total * scale);
    const places = PLACE_VALUES;   // already includes decimal places
    const hasMask = places.some(p => mask[p.key]);
    if (!hasMask) return randInt(0, totalScaled) / scale;

    let givenScaled = 0;
    for (const place of places) {
        if (mask[place.key]) {
            const wScaled = Math.round(place.weight * scale);
            const maxForPlace = Math.floor(totalScaled / Math.max(1, wScaled));
            if (maxForPlace >= 1) givenScaled += randInt(1, Math.min(9, maxForPlace)) * wScaled;
        }
    }
    return Math.max(0, Math.min(givenScaled, totalScaled)) / scale;
}

// Recompute one exercise's derived fields when a teacher types a new top number
// (manual edit in the inspector). Keeps layout-specific extras (blankSide, etc.).
export function recomputeSplitsenExercise(block: MathBlock, ex: SplitsenExercise, newTotal: number): Partial<SplitsenExercise> {
    const c = block.constraints;
    const layout: string = c.layout || 'basic';
    const dpAllowed = layout === 'basic' || (typeof layout === 'string' && layout.startsWith('positie'));
    const dp = dpAllowed ? Math.min(3, Math.max(0, c.decimalPlaces ?? 0)) : 0;
    const scale = Math.pow(10, dp);
    const maxGetal: number = c.maxGetal ?? 1000;

    if (layout === 'positie-tabel') {
        return { total: newTotal, placeBreakdown: fullColumns(newTotal, maxGetal, dp), words: numberToDutchWords(newTotal), isManuallyEdited: true };
    }
    if (layout === 'positie-benen' || layout === 'positie-math') {
        return { total: newTotal, placeBreakdown: nonZeroPlaces(newTotal, dp), isManuallyEdited: true };
    }
    // basic / mathematic: regenerate the given/answer pairs against the new total.
    const totalScaled = Math.round(newTotal * scale);
    const pairsPerItem = ex.pairs.length || (c.rowsPerBox || 4);
    const usedGivens = new Set<number>();
    const pairs: Array<{ given: number; answer: number }> = [];
    for (let j = 0; j < pairsPerItem; j++) {
        let given: number; let attempts = 0;
        do { given = generateGiven(newTotal, c.operand2Mask || {}, dp); attempts++; }
        while (usedGivens.has(Math.round(given * scale)) && attempts < 100);
        usedGivens.add(Math.round(given * scale));
        pairs.push({ given, answer: (totalScaled - Math.round(given * scale)) / scale });
    }
    return { total: newTotal, pairs, isManuallyEdited: true };
}

export function generateSplitsenExercises(block: MathBlock): SplitsenExercise[] {
    const {
        maxGetal = 10,
        operand1Mask = {},
        operand2Mask = {},
        fixedTotal = null,
        layout = 'basic',
        rowsPerBox = 4,
    } = block.constraints;

    if (layout === 'positie-tabel' || layout === 'positie-benen' || layout === 'positie-math') {
        return generatePlaceValueExercises(block);
    }

    // Decimals only for Rooster (basic); verliefde-harten + mathematic stay integer.
    const dp = layout === 'basic' ? Math.min(3, Math.max(0, block.constraints.decimalPlaces ?? 0)) : 0;
    const scale = Math.pow(10, dp);
    const n = block.numberOfExercises;
    const pairsPerItem = layout === 'basic' ? (rowsPerBox || 4) : 1;
    const results: SplitsenExercise[] = [];

    for (let i = 0; i < n; i++) {
        const total = generateTotal(maxGetal, operand1Mask, fixedTotal, dp);
        const totalScaled = Math.round(total * scale);

        const usedGivens = new Set<number>();
        const pairs: Array<{ given: number; answer: number }> = [];

        for (let j = 0; j < pairsPerItem; j++) {
            let given: number;
            let attempts = 0;
            do {
                given = generateGiven(total, operand2Mask, dp);
                attempts++;
            } while (usedGivens.has(Math.round(given * scale)) && attempts < 100);

            usedGivens.add(Math.round(given * scale));
            const answerScaled = totalScaled - Math.round(given * scale);
            pairs.push({ given, answer: answerScaled / scale });
        }

        results.push({ id: rndId(), total, pairs, isManuallyEdited: false });
    }

    return results;
}
