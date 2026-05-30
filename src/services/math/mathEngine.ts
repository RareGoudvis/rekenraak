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

const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

const simplifyFraction = (n: number, d: number): Fraction => {
    const common = gcd(n, d);
    return { n: n / common, d: d / common };
};

const toMixedNumber = (n: number, d: number): Fraction => {
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

// ============================================================================
// 4. OPTELLEN (ADDITION)
// ============================================================================

const generateFractionAddition = (block: MathBlock): Equation[] => {
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
    const { maxGetal = 1000, bridges, operand1Mask = {}, operand2Mask = {}, numberType, decimalPlaces = 2 } = constraints;
    const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
    const intMaxGetal = Math.round(maxGetal * INTERNAL_SCALE);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    const useSpecificStructure = Object.values(operand1Mask).some(v => v) || Object.values(operand2Mask).some(v => v);

    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        let intA: number, intB: number;

        if (useSpecificStructure) {
            const maskA = generateMaskedInt(operand1Mask);
            const maskB = generateMaskedInt(operand2Mask);
            intA = maskA !== null ? maskA : randInt(1, intMaxGetal - 1);
            const maxB = intMaxGetal - intA;
            if (maxB <= 0) continue;
            intB = maskB !== null ? maskB : randInt(1, maxB);
        } else {
            intA = randInt(1, intMaxGetal - 1);
            intB = randInt(1, intMaxGetal - intA);
        }

        if (intA + intB > intMaxGetal || intA <= 0 || intB <= 0) continue;

        // Brugcontrole
        let bridgesOk = true;
        for (const place of PLACE_VALUES) {
            const constraint = (bridges && bridges[place.key]) ? bridges[place.key] : 'FREE';
            if (constraint === 'FREE') continue;
            const divisor = Math.round(place.weight * INTERNAL_SCALE) * 10;
            const hasBridge = ((intA % divisor) + (intB % divisor)) >= divisor;
            if (constraint === 'REQUIRED' && !hasBridge) { bridgesOk = false; break; }
            if (constraint === 'FORBIDDEN' && hasBridge) { bridgesOk = false; break; }
        }
        if (!bridgesOk) continue;

        const a = Math.round((intA / INTERNAL_SCALE) * displayScale) / displayScale;
        const b = Math.round((intB / INTERNAL_SCALE) * displayScale) / displayScale;
        const comboId = `${a}+${b}`;
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const eqType = constraints.equationType || 'normal';
        const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
        exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [a, b], operator: '+', answer: Math.round((a + b) * displayScale) / displayScale, isManuallyEdited: false, missingTerm });
    }
    return exercises;
};

// ============================================================================
// 5. AFTREKKEN (SUBTRACTION)
// ============================================================================

const generateFractionSubtraction = (block: MathBlock): Equation[] => {
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
    const { maxGetal = 1000, bridges, operand1Mask = {}, operand2Mask = {}, numberType, decimalPlaces = 2 } = constraints;
    const displayScale = numberType === 'decimal' ? Math.pow(10, decimalPlaces) : 1;
    const intMaxGetal = Math.round(maxGetal * INTERNAL_SCALE);
    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    const useSpecificStructure = Object.values(operand1Mask).some(v => v) || Object.values(operand2Mask).some(v => v);

    let attempts = 0;
    while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
        attempts++;
        let intA: number, intB: number;

        if (useSpecificStructure) {
            const maskA = generateMaskedInt(operand1Mask);
            const maskB = generateMaskedInt(operand2Mask);
            intA = maskA !== null ? maskA : randInt(1, intMaxGetal - 1);
            intB = maskB !== null ? maskB : randInt(1, intA);
        } else {
            intA = randInt(1, intMaxGetal);
            intB = randInt(1, intA);
        }

        if (intA < intB) { const temp = intA; intA = intB; intB = temp; }
        if (intA <= 0 || intB <= 0 || intA === intB) continue;

        // Brugcontrole (Lenen)
        let bridgesOk = true;
        for (const place of PLACE_VALUES) {
            const constraint = (bridges && bridges[place.key]) ? bridges[place.key] : 'FREE';
            if (constraint === 'FREE') continue;
            const divisor = Math.round(place.weight * INTERNAL_SCALE) * 10;
            const hasBridge = (intA % divisor) < (intB % divisor);
            if (constraint === 'REQUIRED' && !hasBridge) { bridgesOk = false; break; }
            if (constraint === 'FORBIDDEN' && hasBridge) { bridgesOk = false; break; }
        }
        if (!bridgesOk) continue;

        const a = Math.round((intA / INTERNAL_SCALE) * displayScale) / displayScale;
        const b = Math.round((intB / INTERNAL_SCALE) * displayScale) / displayScale;
        const comboId = `${a}-${b}`;
        if (usedCombinations.has(comboId)) continue;
        usedCombinations.add(comboId);

        const eqType = constraints.equationType || 'normal';
        const missingTerm = eqType === 'puntoefening' ? (Math.random() < 0.5 ? 'operand1' : 'operand2') : 'result';
        exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [a, b], operator: '-', answer: Math.round((a - b) * displayScale) / displayScale, isManuallyEdited: false, missingTerm });
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
        maxGetal = 1000, operand1Mask = {}, operand2Mask = {}, numberType = 'natural', decimalPlaces = 2
    } = constraints;

    const exercises: Equation[] = [];
    const usedCombinations = new Set<string>();
    let attempts = 0;

    // Sub-scenario B1: Tafels automatiseren
    if (multiplicationMode === 'tafels' && numberType === 'natural') {
        if (selectedTables.length === 0) return [];

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            const baseTable = selectedTables[randInt(0, selectedTables.length - 1)];
            const multiplier = randInt(1, tableLimit);

            let a = baseTable, b = multiplier;
            if (Math.random() > 0.5) { a = multiplier; b = baseTable; }

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
        const { divisionLevel = 0 } = constraints;
        const useDividendMask = Object.values(operand1Mask).some(v => v);
        const useDivisorMask = Object.values(operand2Mask).some(v => v);

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS) {
            attempts++;
            let dividendVal: number, divisorVal: number, quotientVal: number;

            if (divisionLevel >= 1 && divisionLevel <= 5 && numberType === 'natural') {
                // Niveau-presets: achterwaarts genereren (quotiënt × deler = deeltal)
                if (divisionLevel === 5) {
                    // Niveau 5: voorwaarts, quotiënt met max 1 decimaal
                    divisorVal = randInt(2, 9);
                    dividendVal = randInt(Math.max(10, Math.ceil(maxGetal * 0.1)), maxGetal);
                    if (dividendVal % divisorVal === 0) continue;
                    if ((dividendVal * 10) % divisorVal !== 0) continue;
                    quotientVal = Math.round((dividendVal / divisorVal) * 10) / 10;
                } else {
                    // Niveau 1-4: achterwaarts vanuit quotiëntstructuur
                    divisorVal = randInt(2, 9);
                    if (divisionLevel === 1) {
                        quotientVal = randInt(1, 9) * 10; // T
                    } else if (divisionLevel === 2) {
                        quotientVal = randInt(1, 9) * 100 + randInt(1, 9); // H+E
                    } else if (divisionLevel === 3) {
                        quotientVal = randInt(1, 9) * 100 + randInt(1, 9) * 10 + randInt(1, 9); // H+T+E
                    } else {
                        quotientVal = randInt(1, 9) * 10 + randInt(1, 9); // T+E
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