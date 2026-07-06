import type { MathBlock, Equation, Fraction } from './types';

// ============================================================================
// 1. CONSTANTEN & GLOBALE INSTELLINGEN
// ============================================================================

export const PLACE_VALUES = [
    { key: 'M', label: 'Miljoenen', weight: 1000000 },
    { key: 'HD', label: 'Honderdduizendtallen', weight: 100000 },
    { key: 'TD', label: 'Tienduizendtallen', weight: 10000 },
    { key: 'D', label: 'Duizendtallen', weight: 1000 },
    { key: 'H', label: 'Honderdtallen', weight: 100 },
    { key: 'T', label: 'Tientallen', weight: 10 },
    { key: 'E', label: 'Eenheden', weight: 1 },
    { key: 't', label: 'Tienden', weight: 0.1 },
    { key: 'h', label: 'Honderdsten', weight: 0.01 },
    { key: 'd', label: 'Duizendsten', weight: 0.001 },
    { key: 'td', label: 'Tienduizendsten', weight: 0.0001 } // Maximaal 4 cijfers na de komma
];

// JavaScript afrondingsfouten vermijden door intern alles met integers te berekenen
const INTERNAL_SCALE = 1000000;
const MAX_ATTEMPTS = 20000;

// ============================================================================
// 2. ALGEMENE HULPFUNCTIES (HELPERS)
// ============================================================================

const randInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

export const simplifyFraction = (n: number, d: number): Fraction => {
    const common = gcd(n, d);
    return { n: n / common, d: d / common };
};

export const toMixedNumber = (n: number, d: number): Fraction => {
    const common = gcd(n, d);
    const simpN = n / common;
    const simpD = d / common;

    const whole = Math.floor(simpN / simpD);
    const remainder = simpN % simpD;

    return { whole, n: remainder, d: simpD };
};

const generateMaskedInt = (mask: Record<string, boolean>): number | null => {
    let intNum = 0;
    let hasMask = false;
    for (const place of PLACE_VALUES) {
        if (mask[place.key]) {
            hasMask = true;
            const digit = randInt(1, 9);
            intNum += digit * Math.round(place.weight * INTERNAL_SCALE);
        }
    }
    return hasMask ? intNum : null;
};

// ============================================================================
// 2b. MULTI-TERM HELPERS (2-4 operands per equation)
// ============================================================================

// termCount: 2-4 operands; presets (compenseren / tienvoud) pin it to 2.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const termCountOf = (c: any): number => {
    if (c.preset === 'compenseren' || c.preset === 'tienvoud') return 2;
    return Math.min(4, Math.max(2, c.termCount ?? 2));
};

// Mask for operand i: new operandMasks[] wins; legacy operand1Mask/operand2Mask cover i 0/1.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const maskFor = (c: any, i: number): Record<string, boolean> =>
    c.operandMasks?.[i] ?? (i === 0 ? c.operand1Mask : i === 1 ? c.operand2Mask : undefined) ?? {};

// Optional per-operand ceiling (geavanceerde opties), in display units; null = free.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const maxOpFor = (c: any, i: number): number | null => {
    const v = c.operandMax?.[i];
    return typeof v === 'number' && v > 0 ? v : null;
};

const digitAtScaled = (intVal: number, placeWeightScaled: number): number =>
    Math.floor(intVal / placeWeightScaled) % 10;

// Places (keys) where base-10 addition of the whole CHAIN carries — column addition
// with running carry, so the pairwise 2-term test generalizes exactly.
function additionCarryPlaces(ints: number[]): Set<string> {
    const out = new Set<string>();
    let carry = 0;
    // ascending place weight (PLACE_VALUES is descending)
    for (let p = PLACE_VALUES.length - 1; p >= 0; p--) {
        const w = Math.round(PLACE_VALUES[p].weight * INTERNAL_SCALE);
        const s = ints.reduce((acc, v) => acc + digitAtScaled(v, w), 0) + carry;
        carry = Math.floor(s / 10);
        if (carry > 0) out.add(PLACE_VALUES[p].key);
    }
    return out;
}

// Places where ANY step of the sequential subtraction chain (a − b − c …) borrows.
function subtractionBorrowPlaces(ints: number[]): Set<string> {
    const out = new Set<string>();
    let running = ints[0];
    for (let i = 1; i < ints.length; i++) {
        for (const place of PLACE_VALUES) {
            const divisor = Math.round(place.weight * INTERNAL_SCALE) * 10;
            if ((running % divisor) < (ints[i] % divisor)) out.add(place.key);
        }
        running -= ints[i];
    }
    return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bridgesSatisfied(bridges: any, hits: Set<string>): boolean {
    for (const place of PLACE_VALUES) {
        const constraint = bridges?.[place.key] ?? 'FREE';
        if (constraint === 'FREE') continue;
        if (constraint === 'REQUIRED' && !hits.has(place.key)) return false;
        if (constraint === 'FORBIDDEN' && hits.has(place.key)) return false;
    }
    return true;
}

// Compenseren preset: an operand just under a round number (29 = 30 − 1), scaled units.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compenserenOperand(c: any, maxGetal: number): number {
    const unit = maxGetal > 100 ? 100 : 10;
    const distance = Math.max(1, Math.min(2, c.presetDistance ?? 1));
    const tens = randInt(2, Math.max(2, Math.floor(maxGetal / unit) - 1)) * unit;
    return tens - randInt(1, distance);
}

// ============================================================================
// 3. UI HELPERS VOOR CONFIGURATOR PANELEN
// ============================================================================

export const getMaskPlaces = (maxGetal: number, numberType: 'natural' | 'decimal' | 'rational' = 'natural', decimalPlaces: number = 0) => {
    return PLACE_VALUES.filter(p => {
        if (numberType === 'decimal') {
            const minWeight = Math.pow(10, -decimalPlaces);
            return p.weight <= maxGetal && p.weight >= minWeight;
        }
        return p.weight >= 1 && p.weight <= maxGetal;
    });
};

export const getBridgePlaces = (maxGetal: number, numberType: 'natural' | 'decimal' | 'rational' = 'natural') => {
    return getMaskPlaces(maxGetal, numberType).filter(p => p.weight < maxGetal);
};

// Digit (0-9) at a given place weight. Scales to integers first so decimals
// (e.g. extracting the thousandths of 12.345) don't suffer float drift.
export const digitAtPlace = (num: number, weight: number): number => {
    const S = 1e6;   // covers PLACE_VALUES down to 0.0001 and numbers up to ~1e6
    const intNum = Math.round(Math.abs(num) * S);
    const intWeight = Math.round(weight * S);
    if (intWeight <= 0) return 0;
    return Math.floor(intNum / intWeight) % 10;
};

// 'Specifieke getalopbouw': a number matches the mask when its nonzero places are
// EXACTLY the masked places (same semantics as generateMaskedInt). Empty mask = no
// restriction. Used to filter candidates in generators that don't build from a mask.
export const numberMatchesMask = (
    num: number,
    mask: Record<string, boolean>,
    maxGetal: number,
    numberType: 'natural' | 'decimal' | 'rational' = 'natural',
    decimalPlaces: number = 0,
): boolean => {
    const trueKeys = Object.keys(mask || {}).filter(k => mask[k]);
    if (trueKeys.length === 0) return true;
    for (const p of getMaskPlaces(maxGetal, numberType, decimalPlaces)) {
        const present = digitAtPlace(num, p.weight) > 0;
        if (present !== !!mask[p.key]) return false;
    }
    return true;
};

// ============================================================================
// 4. OPTELLEN (ADDITION)
// ============================================================================

// 2-4 fraction chains for + and −. 'same' difficulty shares one denominator; anything
// else accumulates the common denominator pairwise (answers stay exact integers).
const generateFractionChain = (block: MathBlock, op: '+' | '-'): Equation[] => {
    const { numberOfExercises, constraints } = block;
    const {
        fractionDifficulty = 'same',
        maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10,
    } = constraints;
    const N = termCountOf(constraints);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        const sameD = fractionDifficulty === 'same';
        const d0 = randInt(2, Math.max(2, sameD ? Math.min(maxDenominator1, maxDenominator2) : maxDenominator1));
        const fracs: Fraction[] = Array.from({ length: N }, (_, i) => ({
            n: randInt(1, i === 0 ? maxNumerator1 : maxNumerator2),
            d: sameD ? d0 : (i === 0 ? d0 : randInt(2, Math.max(2, maxDenominator2))),
        }));
        // Accumulate: ansN/ansD ± n_i/d_i.
        let ansN = fracs[0].n, ansD = fracs[0].d;
        let ok = true;
        for (let i = 1; i < N; i++) {
            const next = op === '+' ? ansN * fracs[i].d + fracs[i].n * ansD : ansN * fracs[i].d - fracs[i].n * ansD;
            ansD = ansD * fracs[i].d;
            ansN = next;
            if (op === '-' && ansN <= 0) { ok = false; break; }
            if (ansD > 100000) { ok = false; break; }   // keep denominators leerplan-sized
        }
        if (!ok) continue;
        const comboId = fracs.map(f => `${f.n}/${f.d}`).join(op);
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);
        const eqType = constraints.equationType || 'normal';
        const missingIndex = eqType === 'puntoefening' ? randInt(0, N - 1) : undefined;
        exercises.push({
            id: Math.random().toString(36).substring(2, 9), operands: fracs, operator: op,
            answer: simplifyFraction(ansN, ansD), isManuallyEdited: false,
            missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
            missingIndex,
        });
    }
    return exercises;
};

// 3-4 fraction ×/: chains — all-fraction terms (the natural/decimal mixed modes stay
// 2-term). Division works via reciprocals; answers simplified like the 2-term path.
const generateFractionMulDivChain = (block: MathBlock, op: 'x' | ':'): Equation[] => {
    const { numberOfExercises, constraints } = block;
    const { maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10 } = constraints;
    const N = termCountOf(constraints);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        const fracs: Fraction[] = Array.from({ length: N }, (_, i) => ({
            n: randInt(1, i === 0 ? maxNumerator1 : maxNumerator2),
            d: randInt(2, Math.max(2, i === 0 ? maxDenominator1 : maxDenominator2)),
        }));
        let ansN = fracs[0].n, ansD = fracs[0].d;
        for (let i = 1; i < N; i++) {
            // ÷ (n/d) = × (d/n)
            ansN *= op === 'x' ? fracs[i].n : fracs[i].d;
            ansD *= op === 'x' ? fracs[i].d : fracs[i].n;
        }
        if (ansD > 100000 || ansN > 100000) continue;
        const comboId = fracs.map(f => `${f.n}/${f.d}`).join(op);
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);
        const eqType = constraints.equationType || 'normal';
        const missingIndex = eqType === 'puntoefening' ? randInt(0, N - 1) : undefined;
        exercises.push({
            id: Math.random().toString(36).substring(2, 9), operands: fracs, operator: op,
            answer: simplifyFraction(ansN, ansD), isManuallyEdited: false,
            missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
            missingIndex,
        });
    }
    return exercises;
};

const generateFractionAddition = (block: MathBlock): Equation[] => {
    if (termCountOf(block.constraints) > 2) return generateFractionChain(block, '+');
    const { numberOfExercises, constraints } = block;
    const {
        fractionDifficulty = 'same', mixedNumber1 = false, mixedNumber2 = false,
        maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10
    } = constraints;

    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;

    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        let d1: number, d2: number, n1: number, n2: number;

        if (fractionDifficulty === 'same') {
            const maxD = Math.min(maxDenominator1, maxDenominator2);
            d1 = randInt(2, Math.max(2, maxD)); d2 = d1;
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        } else if (fractionDifficulty === 'one_step') {
            d1 = randInt(2, Math.max(2, Math.floor(maxDenominator1 / 2)));
            const maxMultiplier = Math.floor(maxDenominator2 / d1);
            d2 = d1 * randInt(2, Math.max(2, maxMultiplier));
            if (Math.random() > 0.5 && d2 <= maxDenominator1 && d1 <= maxDenominator2) {
                const temp = d1; d1 = d2; d2 = temp;
            }
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        } else {
            d1 = randInt(2, maxDenominator1);
            do { d2 = randInt(2, maxDenominator2); } while (d1 === d2 || d2 % d1 === 0 || d1 % d2 === 0);
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        }

        const w1 = mixedNumber1 ? randInt(1, 3) : 0;
        const w2 = mixedNumber2 ? randInt(1, 3) : 0;
        const totalN1 = (w1 * d1) + n1;
        const totalN2 = (w2 * d2) + n2;

        const ansN = (totalN1 * d2) + (totalN2 * d1);
        const ansD = d1 * d2;

        const answer = (mixedNumber1 || mixedNumber2) ? toMixedNumber(ansN, ansD) : simplifyFraction(ansN, ansD);
        const op1 = mixedNumber1 ? { whole: w1, n: n1, d: d1 } : { n: n1, d: d1 };
        const op2 = mixedNumber2 ? { whole: w2, n: n2, d: d2 } : { n: n2, d: d2 };

        const comboId = `${w1}-${n1}/${d1}+${w2}-${n2}/${d2}`;
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const eqType = constraints.equationType || 'normal';
        const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';

        exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [op1, op2], operator: '+', answer, isManuallyEdited: false, missingTerm });
    }
    return exercises;
};

export const generateAdditionExercises = (block: MathBlock): Equation[] => {
    if (block.constraints.numberType === 'rational') return generateFractionAddition(block);

    const { numberOfExercises, constraints } = block;
    const { maxGetal = 1000, bridges, numberType, decimalPlaces = 2 } = constraints;
    const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
    const intMaxGetal = Math.round(maxGetal * INTERNAL_SCALE);
    const N = termCountOf(constraints);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();

    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        // Build N operands on the display grid (whole numbers, or the smallest decimal
        // step) — off-grid scaled ints would round to 0 and desync the carry check.
        const step = Math.max(1, Math.round(INTERNAL_SCALE / displayScale));
        const ints: number[] = [];
        let remaining = intMaxGetal;
        let bad = false;
        for (let i = 0; i < N; i++) {
            const masked = generateMaskedInt(maskFor(constraints, i));
            const opCeil = maxOpFor(constraints, i);
            const ceil = Math.min(remaining - (N - 1 - i) * step, opCeil !== null ? Math.round(opCeil * INTERNAL_SCALE) : Infinity);
            let v: number;
            if (constraints.preset === 'compenseren' && i === 1) {
                v = Math.round(compenserenOperand(constraints, maxGetal) * INTERNAL_SCALE);
            } else if (masked !== null) {
                v = masked;
            } else {
                const hi = Math.floor(ceil / step);
                if (hi < 1) { bad = true; break; }
                v = randInt(1, hi) * step;
            }
            if (v < step || v > ceil + 0.5) { bad = true; break; }
            ints.push(v);
            remaining -= v;
        }
        if (bad || ints.length !== N || ints.reduce((a, b) => a + b, 0) > intMaxGetal) continue;
        // Compenseren is pointless when the first term is itself round.
        if (constraints.preset === 'compenseren' && ints[0] % Math.round((maxGetal > 100 ? 100 : 10) * INTERNAL_SCALE) === 0) continue;

        // Brugcontrole — column addition with running carry (exact for any N).
        if (!bridgesSatisfied(bridges, additionCarryPlaces(ints))) continue;

        const vals = ints.map(v => Math.round((v / INTERNAL_SCALE) * displayScale) / displayScale);
        const comboId = vals.join('+');
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const eqType = constraints.equationType || 'normal';
        const missingIndex = eqType === 'puntoefening' ? randInt(0, N - 1) : undefined;
        exercises.push({
            id: Math.random().toString(36).substring(2, 9), operands: vals, operator: '+',
            answer: Math.round(vals.reduce((a, b) => a + b, 0) * displayScale) / displayScale,
            isManuallyEdited: false,
            missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
            missingIndex,
        });
    }
    return exercises;
};

// ============================================================================
// 5. AFTREKKEN (SUBTRACTION)
// ============================================================================

const generateFractionSubtraction = (block: MathBlock): Equation[] => {
    if (termCountOf(block.constraints) > 2) return generateFractionChain(block, '-');
    const { numberOfExercises, constraints } = block;
    const {
        fractionDifficulty = 'same', mixedNumber1 = false, mixedNumber2 = false,
        maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10
    } = constraints;

    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;

    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        let d1: number, d2: number, n1: number, n2: number;

        if (fractionDifficulty === 'same') {
            const maxD = Math.min(maxDenominator1, maxDenominator2);
            d1 = randInt(2, Math.max(2, maxD)); d2 = d1;
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        } else if (fractionDifficulty === 'one_step') {
            d1 = randInt(2, Math.max(2, Math.floor(maxDenominator1 / 2)));
            const multiplier = randInt(2, Math.max(2, Math.floor(maxDenominator2 / d1)));
            d2 = d1 * multiplier;
            if (Math.random() > 0.5 && d2 <= maxDenominator1 && d1 <= maxDenominator2) {
                const temp = d1; d1 = d2; d2 = temp;
            }
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        } else {
            d1 = randInt(2, maxDenominator1);
            do { d2 = randInt(2, maxDenominator2); } while (d1 === d2 || d2 % d1 === 0 || d1 % d2 === 0);
            n1 = randInt(1, maxNumerator1); n2 = randInt(1, maxNumerator2);
        }

        let w1 = mixedNumber1 ? randInt(1, 3) : 0;
        let w2 = mixedNumber2 ? randInt(1, 3) : 0;
        const val1 = ((w1 * d1) + n1) / d1;
        const val2 = ((w2 * d2) + n2) / d2;

        // Aftrekregel: Term 1 moet groter zijn. Omruilen indien nodig.
        if (val1 <= val2) {
            if (attempts > 3000) {
                const tempW = w1; w1 = w2; w2 = tempW;
                const tempN = n1; n1 = n2; n2 = tempN;
                const tempD = d1; d1 = d2; d2 = tempD;
            } else { continue; }
        }

        const ansN = (((w1 * d1) + n1) * d2) - (((w2 * d2) + n2) * d1);
        const ansD = d1 * d2;

        const answer = (mixedNumber1 || mixedNumber2) ? toMixedNumber(ansN, ansD) : simplifyFraction(ansN, ansD);
        const op1 = mixedNumber1 ? { whole: w1, n: n1, d: d1 } : { n: n1, d: d1 };
        const op2 = mixedNumber2 ? { whole: w2, n: n2, d: d2 } : { n: n2, d: d2 };

        const comboId = `${w1}-${n1}/${d1}-${w2}-${n2}/${d2}`;
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const eqType = constraints.equationType || 'normal';
        const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
        exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [op1, op2], operator: '-', answer, isManuallyEdited: false, missingTerm });
    }
    return exercises;
};

export const generateSubtractionExercises = (block: MathBlock): Equation[] => {
    if (block.constraints.numberType === 'rational') return generateFractionSubtraction(block);

    const { numberOfExercises, constraints } = block;
    const { maxGetal = 1000, bridges, numberType, decimalPlaces = 2 } = constraints;
    const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
    const intMaxGetal = Math.round(maxGetal * INTERNAL_SCALE);
    const N = termCountOf(constraints);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();

    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        // Minuend first, then N−1 subtrahends; everything on the display grid and the
        // running result stays > 0.
        const step = Math.max(1, Math.round(INTERNAL_SCALE / displayScale));
        const maskedA = generateMaskedInt(maskFor(constraints, 0));
        const ceilA = maxOpFor(constraints, 0);
        let intA = maskedA ?? randInt(2, Math.floor(intMaxGetal / step)) * step;
        if (ceilA !== null) intA = Math.min(intA, Math.round(ceilA * INTERNAL_SCALE));
        if (intA < 2 * step || intA > intMaxGetal) continue;

        const ints = [intA];
        let running = intA;
        let bad = false;
        for (let i = 1; i < N; i++) {
            const masked = generateMaskedInt(maskFor(constraints, i));
            const opCeil = maxOpFor(constraints, i);
            const ceil = Math.min(running - step, opCeil !== null ? Math.round(opCeil * INTERNAL_SCALE) : Infinity);
            let v: number;
            if (constraints.preset === 'compenseren' && i === 1) {
                v = Math.round(compenserenOperand(constraints, maxGetal) * INTERNAL_SCALE);
            } else if (masked !== null) {
                v = masked;
            } else {
                const hi = Math.floor(ceil / step);
                if (hi < 1) { bad = true; break; }
                v = randInt(1, hi) * step;
            }
            if (v < step || v >= running) { bad = true; break; }
            ints.push(v);
            running -= v;
        }
        if (bad || ints.length !== N || running <= 0) continue;
        if (constraints.preset === 'compenseren' && ints[0] % Math.round((maxGetal > 100 ? 100 : 10) * INTERNAL_SCALE) === 0) continue;

        // Brugcontrole (lenen) — any borrow in the sequential chain counts.
        if (!bridgesSatisfied(bridges, subtractionBorrowPlaces(ints))) continue;

        const vals = ints.map(v => Math.round((v / INTERNAL_SCALE) * displayScale) / displayScale);
        const comboId = vals.join('-');
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const answer = Math.round(vals.reduce((a, b, i) => (i === 0 ? b : a - b), 0) * displayScale) / displayScale;
        const eqType = constraints.equationType || 'normal';
        const missingIndex = eqType === 'puntoefening' ? randInt(0, N - 1) : undefined;
        exercises.push({
            id: Math.random().toString(36).substring(2, 9), operands: vals, operator: '-', answer,
            isManuallyEdited: false,
            missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
            missingIndex,
        });
    }
    return exercises;
};

// ============================================================================
// 6. VERMENIGVULDIGEN (MULTIPLICATION)
// ============================================================================


export const generateMultiplicationExercises = (block: MathBlock): Equation[] => {
    const { numberOfExercises, constraints } = block;

    // A. RATIONALE GETALLEN (Breuken, eventueel in combinatie met natuurlijke/decimale getallen)
    if (constraints.numberType === 'rational') {
        if (termCountOf(constraints) > 2) return generateFractionMulDivChain(block, 'x');
        const {
            fractionMultMode = 'fraction_fraction',
            fractionOrderMode = 'AB',
            maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10,
            maxGetal = 100, decimalPlaces = 2, operand1Mask = {},
            simplifyMaxDenominatorChecked = false, simplifyMaxDenominator = 10
        } = constraints;

        const exercises: Equation[] = [];
        const usedCombinations = new Set<string>();
        let attempts = 0;

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS * 2) {
            attempts++;
            let op1: number | Fraction = 0;
            let ansN = 0, ansD = 1;

            // Factor 2 is altijd een breuk
            const n2 = randInt(1, maxNumerator2);
            const d2 = randInt(2, maxDenominator2);
            const op2: Fraction = { n: n2, d: d2 };

            if (fractionMultMode === 'fraction_fraction') {
                const n1 = randInt(1, maxNumerator1);
                const d1 = randInt(2, maxDenominator1);
                op1 = { n: n1, d: d1 };
                ansN = n1 * n2; ansD = d1 * d2;

            } else if (fractionMultMode === 'natural_fraction') {
                const useSpecificStructure = Object.values(operand1Mask).some(v => v);
                let intVal: number;
                if (useSpecificStructure) {
                    const maskA = generateMaskedInt(operand1Mask);
                    intVal = maskA !== null ? (maskA / INTERNAL_SCALE) : randInt(1, maxGetal);
                } else {
                    intVal = randInt(1, maxGetal);
                }
                op1 = intVal;
                ansN = intVal * n2; ansD = d2;

            } else if (fractionMultMode === 'decimal_fraction') {
                const scale = Math.pow(10, decimalPlaces);
                const useSpecificStructure = Object.values(operand1Mask).some(v => v);
                let intVal: number;
                if (useSpecificStructure) {
                    const maskA = generateMaskedInt(operand1Mask);
                    intVal = maskA !== null ? maskA : randInt(1, maxGetal * scale);
                } else {
                    intVal = randInt(1, maxGetal * scale);
                }

                const decVal = Math.round((intVal / INTERNAL_SCALE) * scale) / scale;
                op1 = decVal;

                const decFractionN = decVal * scale;
                const decFractionD = scale;
                ansN = decFractionN * n2; ansD = decFractionD * d2;
            }

            const simplifiedAnswer = simplifyFraction(ansN, ansD);

            // Validatie tegen de ingestelde maximale noemer voor vereenvoudiging
            if (simplifyMaxDenominatorChecked && simplifiedAnswer.d > simplifyMaxDenominator) {
                continue;
            }

            // excludeOne: drop a whole-number factor of 1 (e.g. 1 × ⅔) when toggled on
            if (constraints.excludeOne && op1 === 1) continue;

            const comboId = typeof op1 === 'object' ? `${op1.n}/${op1.d}*${op2.n}/${op2.d}` : `${op1}*${op2.n}/${op2.d}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            const useBA_mult = fractionMultMode !== 'fraction_fraction' && (fractionOrderMode === 'BA' || (fractionOrderMode === 'beide' && Math.random() < 0.5));
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: useBA_mult ? [op2, op1] : [op1, op2], operator: 'x', answer: simplifiedAnswer, isManuallyEdited: false, missingTerm });
        }
        return exercises;
    }

    // B. NATUURLIJKE EN DECIMALE GETALLEN
    const {
        multiplicationMode = 'tafels', selectedTables = [], tableLimit = 10,
        maxGetal = 1000, operand1Mask = {}, operand2Mask = {}, numberType = 'natural', decimalPlaces = 2,
        excludeOne = false   // skip ×1 exercises (trivially easy) when set
    } = constraints;

    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;

    // Preset '× met 10/100/1000': base × tienvoud (comma shift). Decimal bases allowed.
    if (constraints.preset === 'tienvoud') {
        const factors: number[] = (constraints.presetFactors ?? [10, 100, 1000]).filter((f: number) => [10, 100, 1000].includes(f));
        const pool = factors.length ? factors : [10, 100, 1000];
        const scale = Math.pow(10, decimalPlaces);
        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const factor = pool[randInt(0, pool.length - 1)];
            const base = numberType === 'decimal'
                ? Number((randInt(1, Math.max(2, maxGetal * scale - 1)) / scale).toFixed(decimalPlaces))
                : randInt(2, Math.max(2, maxGetal));
            const answer = Number((base * factor).toFixed(6));
            const comboId = `${base}*${factor}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);
            const eqType = constraints.equationType || 'normal';
            const missingIndex = eqType === 'puntoefening' ? randInt(0, 1) : undefined;
            exercises.push({
                id: Math.random().toString(36).substring(2, 9), operands: [base, factor], operator: 'x', answer,
                isManuallyEdited: false,
                missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
                missingIndex,
            });
        }
        return exercises;
    }

    // Multi-term chains (3-4 factors): small factors so the product stays hoofdrekenbaar.
    const N_MUL = termCountOf(constraints);
    if (N_MUL > 2 && numberType === 'natural') {
        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const factors: number[] = [];
            let product = 1;
            let bad = false;
            for (let i = 0; i < N_MUL; i++) {
                const fromTables = multiplicationMode === 'tafels' && selectedTables.length > 0 && i === 0;
                const opCeil = maxOpFor(constraints, i);
                const budget = Math.floor(maxGetal / product);
                const hi = Math.min(opCeil ?? tableLimit, budget);
                if (hi < 2) { bad = true; break; }
                const f = fromTables ? selectedTables[randInt(0, selectedTables.length - 1)] : randInt(2, Math.max(2, Math.min(hi, 12)));
                if (f * product > maxGetal) { bad = true; break; }
                factors.push(f);
                product *= f;
            }
            if (bad || factors.length !== N_MUL) continue;
            if (excludeOne && factors.includes(1)) continue;
            const comboId = factors.join('*');
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);
            const eqType = constraints.equationType || 'normal';
            const missingIndex = eqType === 'puntoefening' ? randInt(0, N_MUL - 1) : undefined;
            exercises.push({
                id: Math.random().toString(36).substring(2, 9), operands: factors, operator: 'x', answer: product,
                isManuallyEdited: false,
                missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
                missingIndex,
            });
        }
        return exercises;
    }

    // Sub-scenario B1: Tafels automatiseren
    if (multiplicationMode === 'tafels' && numberType === 'natural') {
        if (selectedTables.length === 0) return [];

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const baseTable = selectedTables[randInt(0, selectedTables.length - 1)];
            const multiplier = randInt(1, tableLimit);

            let a = baseTable, b = multiplier;
            if (Math.random() > 0.5) { a = multiplier; b = baseTable; }

            if (excludeOne && (a === 1 || b === 1)) continue;

            const comboId = `${a}*${b}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [a, b], operator: 'x', answer: a * b, isManuallyEdited: false, missingTerm });
        }
    }
    // Sub-scenario B2: Willekeurige getallen (met of zonder maskers)
    else {
        const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
        const intMaxGetal = Math.round(maxGetal * INTERNAL_SCALE);
        const useSpecificStructure = Object.values(operand1Mask).some(v => v) || Object.values(operand2Mask).some(v => v);

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            let intA: number, intB: number;

            if (useSpecificStructure) {
                const maskA = generateMaskedInt(operand1Mask);
                const maskB = generateMaskedInt(operand2Mask);
                const rootMax = Math.floor(Math.sqrt(intMaxGetal * INTERNAL_SCALE));

                intA = maskA !== null ? maskA : randInt(1, rootMax);
                intB = maskB !== null ? maskB : randInt(1, Math.floor((intMaxGetal * INTERNAL_SCALE) / intA));
            } else {
                const rootMax = Math.floor(Math.sqrt(intMaxGetal * INTERNAL_SCALE));
                intA = randInt(1, rootMax);
                intB = randInt(1, Math.floor((intMaxGetal * INTERNAL_SCALE) / intA));
            }

            const a = Math.round((intA / INTERNAL_SCALE) * displayScale) / displayScale;
            const b = Math.round((intB / INTERNAL_SCALE) * displayScale) / displayScale;

            if (a * b > maxGetal || a <= 0 || b <= 0) continue;
            if (excludeOne && (a === 1 || b === 1)) continue;

            const comboId = `${a}*${b}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const answerScale = displayScale * displayScale;
            const answer = Math.round((a * b) * answerScale) / answerScale;

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [a, b], operator: 'x', answer, isManuallyEdited: false, missingTerm });
        }
    }

    return exercises;
};

// ============================================================================
// 7. DELEN (DIVISION)
// ============================================================================

export const generateDivisionExercises = (block: MathBlock): Equation[] => {
    const { numberOfExercises, constraints } = block;

    // A. RATIONALE GETALLEN (Breuken)
    if (constraints.numberType === 'rational') {
        if (termCountOf(constraints) > 2) return generateFractionMulDivChain(block, ':');
        const {
            fractionMultMode = 'fraction_fraction',
            fractionOrderMode = 'AB',
            maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10,
            maxGetal = 100, decimalPlaces = 2, operand1Mask = {},
            simplifyMaxDenominatorChecked = false, simplifyMaxDenominator = 10
        } = constraints;

        const exercises: Equation[] = [];
        const usedCombinations = new Set<string>();
        let attempts = 0;

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS * 2) {
            attempts++;
            let op1: number | Fraction = 0;
            let ansN = 0, ansD = 1;

            // Deler (factor 2) is altijd een breuk
            const n2 = randInt(1, maxNumerator2);
            const d2 = randInt(2, maxDenominator2);
            const op2: Fraction = { n: n2, d: d2 };

            if (fractionMultMode === 'fraction_fraction') {
                // (n1/d1) ÷ (n2/d2) = (n1*d2) / (d1*n2)
                const n1 = randInt(1, maxNumerator1);
                const d1 = randInt(2, maxDenominator1);
                op1 = { n: n1, d: d1 };
                ansN = n1 * d2; ansD = d1 * n2;

            } else if (fractionMultMode === 'natural_fraction') {
                // n ÷ (n2/d2) = (n*d2) / n2
                const useSpecificStructure = Object.values(operand1Mask).some(v => v);
                let intVal: number;
                if (useSpecificStructure) {
                    const maskA = generateMaskedInt(operand1Mask);
                    intVal = maskA !== null ? (maskA / INTERNAL_SCALE) : randInt(1, maxGetal);
                } else {
                    intVal = randInt(1, maxGetal);
                }
                op1 = intVal;
                ansN = intVal * d2; ansD = n2;

            } else if (fractionMultMode === 'decimal_fraction') {
                // dec ÷ (n2/d2) = (dec*d2) / n2
                const scale = Math.pow(10, decimalPlaces);
                const useSpecificStructure = Object.values(operand1Mask).some(v => v);
                let intVal: number;
                if (useSpecificStructure) {
                    const maskA = generateMaskedInt(operand1Mask);
                    intVal = maskA !== null ? maskA : randInt(1, maxGetal * scale);
                } else {
                    intVal = randInt(1, maxGetal * scale);
                }
                const decVal = Math.round((intVal / INTERNAL_SCALE) * scale) / scale;
                op1 = decVal;
                const decFractionN = decVal * scale;
                const decFractionD = scale;
                ansN = decFractionN * d2; ansD = decFractionD * n2;
            }

            // Apply fractionOrderMode for non-fraction_fraction modes (BA swaps deeltal/deler)
            const useBA_div = fractionMultMode !== 'fraction_fraction' &&
                (fractionOrderMode === 'BA' || (fractionOrderMode === 'beide' && Math.random() < 0.5));

            if (useBA_div) {
                if (fractionMultMode === 'natural_fraction') {
                    // (n2/d2) ÷ intVal = n2 / (d2 * intVal)
                    ansN = n2; ansD = d2 * (op1 as number);
                } else if (fractionMultMode === 'decimal_fraction') {
                    // (n2/d2) ÷ decVal = (n2 * scale) / (d2 * round(decVal * scale))
                    const scale = Math.pow(10, decimalPlaces);
                    ansN = n2 * scale; ansD = d2 * Math.round((op1 as number) * scale);
                }
            }

            if (ansD === 0) continue;
            const simplifiedAnswer = simplifyFraction(ansN, ansD);

            if (simplifyMaxDenominatorChecked && simplifiedAnswer.d > simplifyMaxDenominator) continue;

            const finalOp1 = useBA_div ? op2 : op1;
            const finalOp2 = useBA_div ? op1 : op2;
            const comboId = typeof finalOp1 === 'object'
                ? `${(finalOp1 as Fraction).n}/${(finalOp1 as Fraction).d}:${(finalOp2 as Fraction).n}/${(finalOp2 as Fraction).d}`
                : `${finalOp1}:${(finalOp2 as Fraction).n}/${(finalOp2 as Fraction).d}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [finalOp1, finalOp2], operator: ':', answer: simplifiedAnswer, isManuallyEdited: false, missingTerm });
        }
        return exercises;
    }

    // B. NATUURLIJKE EN DECIMALE GETALLEN
    const {
        multiplicationMode = 'tafels', selectedTables = [], tableLimit = 10,
        maxGetal = 1000, operand1Mask = {}, operand2Mask = {}, numberType = 'natural', decimalPlaces = 2
    } = constraints;

    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;

    // Preset ': met 10/100/1000' — answer-first so the quotient stays clean; dividends
    // legitimately exceed maxGetal (that's the point of ": 1000").
    if (constraints.preset === 'tienvoud') {
        const factors: number[] = (constraints.presetFactors ?? [10, 100, 1000]).filter((f: number) => [10, 100, 1000].includes(f));
        const pool = factors.length ? factors : [10, 100, 1000];
        const scale = Math.pow(10, decimalPlaces);
        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const factor = pool[randInt(0, pool.length - 1)];
            const quotient = numberType === 'decimal'
                ? Number((randInt(1, Math.max(2, maxGetal * scale - 1)) / scale).toFixed(decimalPlaces))
                : randInt(2, Math.max(2, maxGetal));
            const dividend = Number((quotient * factor).toFixed(6));
            const comboId = `${dividend}:${factor}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);
            const eqType = constraints.equationType || 'normal';
            const missingIndex = eqType === 'puntoefening' ? randInt(0, 1) : undefined;
            exercises.push({
                id: Math.random().toString(36).substring(2, 9), operands: [dividend, factor], operator: ':', answer: quotient,
                isManuallyEdited: false,
                missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
                missingIndex,
            });
        }
        return exercises;
    }

    // Multi-term chains (a : b : c): answer-first, every intermediate step exact.
    const N_DIV = termCountOf(constraints);
    if (N_DIV > 2 && numberType === 'natural' && multiplicationMode !== 'met_rest') {
        const divisorPool = selectedTables.length ? selectedTables.filter((t: number) => t > 1) : null;
        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const divisors = Array.from({ length: N_DIV - 1 }, (_, i) => {
                const opCeil = maxOpFor(constraints, i + 1);
                const hi = Math.min(opCeil ?? tableLimit, 12);
                return divisorPool ? divisorPool[randInt(0, divisorPool.length - 1)] : randInt(2, Math.max(2, hi));
            });
            const divProduct = divisors.reduce((a, b) => a * b, 1);
            const maxQ = Math.floor(maxGetal / divProduct);
            if (maxQ < 1) continue;
            const quotient = randInt(1, Math.max(1, Math.min(maxQ, tableLimit * 2)));
            const dividend = quotient * divProduct;
            if (dividend > maxGetal) continue;
            const operands = [dividend, ...divisors];
            const comboId = operands.join(':');
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);
            const eqType = constraints.equationType || 'normal';
            const missingIndex = eqType === 'puntoefening' ? randInt(0, N_DIV - 1) : undefined;
            exercises.push({
                id: Math.random().toString(36).substring(2, 9), operands, operator: ':', answer: quotient,
                isManuallyEdited: false,
                missingTerm: eqType === 'puntoefening' ? (missingIndex === 0 ? 'operand1' : 'operand2') : 'result',
                missingIndex,
            });
        }
        return exercises;
    }

    // Sub-scenario B1: Deeltafels
    if (multiplicationMode === 'tafels' && numberType === 'natural') {
        if (selectedTables.length === 0) return [];

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const divisor = selectedTables[randInt(0, selectedTables.length - 1)];
            if (divisor === 0) continue;
            const quotient = randInt(1, tableLimit);
            const dividend = divisor * quotient;

            const comboId = `${dividend}:${divisor}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [dividend, divisor], operator: ':', answer: quotient, isManuallyEdited: false, missingTerm });
        }
    }
    // Sub-scenario B1b: Delen met rest
    else if (multiplicationMode === 'met_rest' && numberType === 'natural') {
        const { metRestLevel = 1 } = constraints;
        if (selectedTables.length === 0) return [];

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const divisor = selectedTables[randInt(0, selectedTables.length - 1)];
            if (divisor <= 1) continue;

            const remainder = randInt(1, divisor - 1);
            let quotient: number, dividend: number;

            if (metRestLevel === 1) {
                // TE ≤ 10*y: enkelvoudig quotiënt (1-9)
                quotient = randInt(1, 9);
                dividend = quotient * divisor + remainder;
                if (dividend < 10 || dividend > 99) continue;
            } else if (metRestLevel === 2) {
                // TE > 10*y: meervoudig quotiënt (≥ 10), deeltal ≤ 99
                const maxQ = Math.floor(98 / divisor);
                if (maxQ < 10) continue;
                quotient = randInt(10, maxQ);
                dividend = quotient * divisor + remainder;
                if (dividend < 10 || dividend > 99) continue;
            } else {
                // Niveau 3: HTE (3-cijferig deeltal, 100-999)
                const minQ = Math.ceil(100 / divisor);
                const maxQ = Math.floor(998 / divisor);
                if (minQ > maxQ) continue;
                quotient = randInt(minQ, maxQ);
                dividend = quotient * divisor + remainder;
                if (dividend < 100 || dividend > 999) continue;
            }

            const comboId = `${dividend}:${divisor}r${remainder}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            exercises.push({
                id: Math.random().toString(36).substring(2, 9),
                operands: [dividend, divisor],
                operator: ':',
                answer: quotient,
                remainder,
                isManuallyEdited: false,
                missingTerm: 'result'
            });
        }
    }
    // Sub-scenario B2: Willekeurig / met maskers / niveau-presets
    // operand1Mask → deeltal (Factor 1, linkerkant), operand2Mask → deler (Factor 2, rechterkant)
    // maxGetal is het maximum van het deeltal
    else {
        const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
        // Niveau-presets (deler = 1 cijfer). `divisionLevels` = multi-select array (combine niveaus);
        // falls back to the single `divisionLevel`. Empty → masker/vrij mode.
        const { divisionLevel = 0, divisionLevels } = constraints;
        const activeLevels: number[] = Array.isArray(divisionLevels) && divisionLevels.length
            ? divisionLevels
            : (divisionLevel >= 1 ? [divisionLevel] : []);
        const useDividendMask = Object.values(operand1Mask).some(v => v);
        const useDivisorMask = Object.values(operand2Mask).some(v => v);

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            let dividendVal: number, divisorVal: number, quotientVal: number;

            if (activeLevels.length && numberType === 'natural') {
                // Pick one of the selected niveaus per exercise so combined levels interleave.
                const lvl = activeLevels[randInt(0, activeLevels.length - 1)];
                divisorVal = randInt(2, 9);
                if (lvl === 6) {
                    // N6: voorwaarts, quotiënt met max 1 decimaal (bv. 711:6=118,5)
                    dividendVal = randInt(Math.max(10, Math.ceil(maxGetal * 0.1)), maxGetal);
                    if (dividendVal % divisorVal === 0) continue;
                    if ((dividendVal * 10) % divisorVal !== 0) continue;
                    quotientVal = Math.round((dividendVal / divisorVal) * 10) / 10;
                } else if (lvl === 2) {
                    // N2 (NIEUW): TE : E — 2-cijferig deeltal (≤99), 2-cijferig non-rond quotiënt (bv. 84:7=12)
                    const maxQ = Math.floor(99 / divisorVal);
                    if (maxQ < 11) continue;
                    quotientVal = randInt(10, maxQ);
                    if (quotientVal % 10 === 0) continue; // round quotients zijn N1-achtig
                    dividendVal = quotientVal * divisorVal; // ≤ 99 by construction → geen maxGetal-check
                } else {
                    // Achterwaarts vanuit quotiëntstructuur
                    if (lvl === 1) {
                        quotientVal = randInt(1, 9) * 10; // T
                    } else if (lvl === 3) {
                        quotientVal = randInt(1, 9) * 100 + randInt(1, 9); // H+E
                    } else if (lvl === 4) {
                        quotientVal = randInt(1, 9) * 100 + randInt(1, 9) * 10 + randInt(1, 9); // H+T+E
                    } else {
                        quotientVal = randInt(1, 9) * 10 + randInt(1, 9); // N5: T+E
                    }
                    dividendVal = quotientVal * divisorVal;
                    if (dividendVal > maxGetal || dividendVal <= 0) continue;
                }
            } else if (useDividendMask || useDivisorMask) {
                // Gebruik maskers om deeltal en/of deler te bepalen, controleer op exacte deling
                const rawA = useDividendMask ? generateMaskedInt(operand1Mask) : null;
                const rawB = useDivisorMask ? generateMaskedInt(operand2Mask) : null;

                dividendVal = rawA !== null
                    ? Math.round((rawA / INTERNAL_SCALE) * displayScale) / displayScale
                    : randInt(1, maxGetal * displayScale) / displayScale;

                divisorVal = rawB !== null
                    ? Math.round((rawB / INTERNAL_SCALE) * displayScale) / displayScale
                    : randInt(1, Math.max(1, Math.round(dividendVal * displayScale))) / displayScale;

                if (dividendVal <= 0 || divisorVal <= 0 || dividendVal > maxGetal) continue;

                const rawQuotient = dividendVal / divisorVal;
                // Quotiënt moet schoon zijn (geen rest): voor natuurlijke getallen = integer, voor decimalen = max decimalPlaces decimalen
                const scaledQ = rawQuotient * displayScale;
                if (rawQuotient <= 0 || Math.abs(scaledQ - Math.round(scaledQ)) > 1e-9) continue;
                quotientVal = Math.round(scaledQ) / displayScale;

            } else {
                // Geen maskers: bouw clean oefening (deler × geheel quotiënt = deeltal)
                const intDivisorScaled = randInt(1, (maxGetal - 1) * displayScale);
                divisorVal = intDivisorScaled / displayScale;
                if (divisorVal <= 0) continue;
                const maxQ = Math.floor((maxGetal * displayScale) / intDivisorScaled);
                if (maxQ < 1) continue;
                quotientVal = randInt(1, maxQ);
                dividendVal = Math.round(divisorVal * quotientVal * displayScale) / displayScale;
                if (dividendVal > maxGetal || dividendVal <= 0) continue;
            }

            const comboId = `${dividendVal}:${divisorVal}`;
            if (usedCombinations.has(comboId)) continue;
            usedCombinations.add(comboId);

            const eqType = constraints.equationType || 'normal';
            const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [dividendVal, divisorVal], operator: ':', answer: quotientVal, isManuallyEdited: false, missingTerm });
        }
    }

    return exercises;
};