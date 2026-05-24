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
        let d1 = 1, d2 = 1, n1 = 1, n2 = 1;

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
        let intA = 0, intB = 0;

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
        let d1 = 1, d2 = 1, n1 = 1, n2 = 1;

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
        let intA = 0, intB = 0;

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
            maxNumerator1 = 10, maxDenominator1 = 10, maxNumerator2 = 10, maxDenominator2 = 10,
            maxGetal = 100, decimalPlaces = 2, operand1Mask = {},
            simplifyMaxDenominatorChecked = false, simplifyMaxDenominator = 10
        } = constraints;

        const exercises: Equation[] = [];
        const usedCombinations = new Set<string>();
        let attempts = 0;

        while (exercises.length < numberOfExercises && attempts < MAX_ATTEMPTS * 2) {
            attempts++;
            let op1: any, op2: Fraction;
            let ansN = 0, ansD = 1;

            // Factor 2 is altijd een breuk
            const n2 = randInt(1, maxNumerator2);
            const d2 = randInt(2, maxDenominator2);
            op2 = { n: n2, d: d2 };

            if (fractionMultMode === 'fraction_fraction') {
                const n1 = randInt(1, maxNumerator1);
                const d1 = randInt(2, maxDenominator1);
                op1 = { n: n1, d: d1 };
                ansN = n1 * n2; ansD = d1 * d2;

            } else if (fractionMultMode === 'natural_fraction') {
                const useSpecificStructure = Object.values(operand1Mask).some(v => v);
                let intVal = 1;
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
                let intVal = 1;
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
            exercises.push({ id: Math.random().toString(36).substring(2, 9), operands: [op1, op2], operator: 'x', answer: simplifiedAnswer, isManuallyEdited: false, missingTerm });
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
            let intA = 0, intB = 0;

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