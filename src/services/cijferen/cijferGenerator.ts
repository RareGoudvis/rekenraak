import { PLACE_VALUES } from '../math/mathEngine';
import type { MathBlock } from '../math/types';
import type { CijferExercise, CijferConstraints, ConstraintType } from '../math/types';

const MAX_ATTEMPTS = 500;

const randInt = (min: number, max: number): number => {
    if (min > max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const genId = (): string => Math.random().toString(36).substring(2, 9);

function scaleOf(dp: number): number {
    return Math.pow(10, dp);
}

const BRIDGE_KEYS = ['E', 'T', 'H', 'D', 'TD', 'HD'];

function checkAdditionBridges(operands: number[], dp: number, bridges: Record<string, ConstraintType>): boolean {
    const scale = Math.pow(10, dp);
    let carry = 0;
    for (let pos = 0; pos <= 7; pos++) {
        let sum = carry;
        for (const op of operands) {
            const scaled = Math.round(Math.abs(op) * scale);
            sum += Math.floor(scaled / Math.pow(10, pos)) % 10;
        }
        carry = Math.floor(sum / 10);
        const intPos = pos - dp;
        if (intPos >= 0 && intPos < BRIDGE_KEYS.length) {
            const constraint = bridges[BRIDGE_KEYS[intPos]];
            if (constraint === 'REQUIRED' && carry === 0) return false;
            if (constraint === 'FORBIDDEN' && carry > 0) return false;
        }
    }
    return true;
}

function checkSubtractionBridges(a: number, b: number, dp: number, bridges: Record<string, ConstraintType>): boolean {
    const scale = Math.pow(10, dp);
    const aScaled = Math.round(a * scale);
    const bScaled = Math.round(b * scale);
    let borrow = 0;
    for (let pos = 0; pos <= 7; pos++) {
        const aDigit = Math.floor(aScaled / Math.pow(10, pos)) % 10;
        const bDigit = Math.floor(bScaled / Math.pow(10, pos)) % 10;
        const diff = aDigit - borrow - bDigit;
        const newBorrow = diff < 0 ? 1 : 0;
        const intPos = pos - dp;
        if (intPos >= 0 && intPos < BRIDGE_KEYS.length) {
            const constraint = bridges[BRIDGE_KEYS[intPos]];
            if (constraint === 'REQUIRED' && newBorrow === 0) return false;
            if (constraint === 'FORBIDDEN' && newBorrow > 0) return false;
        }
        borrow = newBorrow;
    }
    return true;
}

function applyMask(
    mask: Record<string, boolean>,
    maxVal: number,
    dp: number,
): number | null {
    let result = 0;
    let hasMask = false;
    const s = scaleOf(dp);

    for (const place of PLACE_VALUES) {
        if (mask[place.key]) {
            hasMask = true;
            const digit = randInt(1, 9);
            result += digit * place.weight;
        }
    }
    if (!hasMask) return null;

    const rounded = parseFloat(result.toFixed(dp));
    if (rounded <= 0 || rounded > maxVal) return null;

    // Round to dp decimal places
    return Math.round(rounded * s) / s;
}

export function generateCijferExercises(block: MathBlock): CijferExercise[] {
    const c = block.constraints as CijferConstraints;
    const count = block.numberOfExercises || 2;
    const results: CijferExercise[] = [];
    for (let i = 0; i < count; i++) {
        results.push(generateOne(c));
    }
    return results;
}

function getMask(c: CijferConstraints, i: number): Record<string, boolean> {
    const keys = ['operand0Mask', 'operand1Mask', 'operand2Mask', 'operand3Mask'] as const;
    return (c[keys[Math.min(i, 3)]] || {}) as Record<string, boolean>;
}

function generateOne(c: CijferConstraints): CijferExercise {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const ex = tryGenerate(c);
        if (ex) return ex;
    }
    // Fallback: simple guaranteed valid exercise
    const dp = c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0;
    const s = scaleOf(dp);
    const half = Math.round((c.maxRange / 2) * s) / s;
    const quarter = Math.round((c.maxRange / 4) * s) / s;
    if (c.operator === '+') return { id: genId(), operands: [half, quarter], operator: '+', answer: parseFloat((half + quarter).toFixed(dp)), remainder: 0, isManuallyEdited: false };
    if (c.operator === '-') return { id: genId(), operands: [half, quarter], operator: '-', answer: parseFloat((half - quarter).toFixed(dp)), remainder: 0, isManuallyEdited: false };
    if (c.operator === 'x') return { id: genId(), operands: [half, 3], operator: 'x', answer: parseFloat((half * 3).toFixed(dp)), remainder: 0, isManuallyEdited: false };
    return { id: genId(), operands: [c.maxRange, 4], operator: ':', answer: Math.floor(c.maxRange / 4), remainder: c.maxRange % 4, isManuallyEdited: false };
}

function tryGenerate(c: CijferConstraints): CijferExercise | null {
    const isDecimal = c.numberType === 'decimal';
    const dp = isDecimal ? (c.decimalPlaces || 2) : 0;
    const s = scaleOf(dp);
    const maxVal = c.maxRange || 1000;

    if (c.operator === '+') {
        const n = Math.min(Math.max(2, c.numberOfTerms || 2), 4);
        const operands: number[] = [];
        let remainingScaled = Math.round(maxVal * s);

        for (let i = 0; i < n; i++) {
            const isLast = i === n - 1;
            const minScaled = s;
            const maxOpScaled = isLast ? remainingScaled : Math.floor(remainingScaled * (i === 0 ? 0.6 : 0.7));
            if (minScaled > maxOpScaled) return null;

            const opMask = getMask(c, i);
            const hasMask = Object.values(opMask).some(v => v);
            const masked = applyMask(opMask, maxOpScaled / s, dp);
            if (hasMask && masked === null) return null;
            const val = masked !== null
                ? masked
                : Math.round(randInt(minScaled, maxOpScaled)) / s;

            operands.push(parseFloat(val.toFixed(dp)));
            remainingScaled -= Math.round(val * s);
            if (!isLast && remainingScaled < s) return null;
        }

        const answer = parseFloat(operands.reduce((a, b) => a + b, 0).toFixed(dp));
        if (answer > maxVal || answer <= 0) return null;
        if (c.bridges && Object.keys(c.bridges).length > 0 && !checkAdditionBridges(operands, dp, c.bridges)) return null;
        return { id: genId(), operands, operator: '+', answer, remainder: 0, isManuallyEdited: false };
    }

    if (c.operator === '-') {
        const maskedA = applyMask(getMask(c, 0), maxVal, dp);
        const a = maskedA !== null
            ? maskedA
            : parseFloat((randInt(Math.ceil(maxVal * s * 0.1), Math.round(maxVal * s)) / s).toFixed(dp));

        const bMaxScaled = Math.round(a * s) - s;
        if (bMaxScaled <= 0) return null;

        const maskB = getMask(c, 1);
        const hasMaskB = Object.values(maskB).some(v => v);
        const maskedB = applyMask(maskB, bMaxScaled / s, dp);
        let b: number;
        if (maskedB !== null) {
            if (Math.round(maskedB * s) >= Math.round(a * s)) return null;
            b = maskedB;
        } else if (hasMaskB) {
            return null;
        } else {
            const bScaled = randInt(s, bMaxScaled);
            if (bScaled <= 0) return null;
            b = parseFloat((bScaled / s).toFixed(dp));
        }

        const answer = parseFloat((a - b).toFixed(dp));
        if (answer <= 0) return null;
        if (c.bridges && Object.keys(c.bridges).length > 0 && !checkSubtractionBridges(a, b, dp, c.bridges)) return null;
        return { id: genId(), operands: [a, b], operator: '-', answer, remainder: 0, isManuallyEdited: false };
    }

    if (c.operator === 'x') {
        const maxMultiplier = maxVal <= 100 ? 9 : maxVal <= 10000 ? 99 : maxVal <= 1_000_000 ? 999 : 9999;
        const minMultiplier = maxVal <= 100 ? 2 : 10;

        const maskedMultiplier = applyMask(getMask(c, 1), maxMultiplier, 0);
        const multiplier = maskedMultiplier !== null
            ? Math.max(minMultiplier, Math.round(maskedMultiplier))
            : randInt(minMultiplier, maxMultiplier);
        if (multiplier < minMultiplier || multiplier > maxMultiplier) return null;

        const maxMultiplicandScaled = Math.floor((maxVal * s) / multiplier);
        if (maxMultiplicandScaled < s) return null;

        const masked = applyMask(getMask(c, 0), maxMultiplicandScaled / s, dp);
        const multiplicand = masked !== null
            ? masked
            : parseFloat((randInt(s, maxMultiplicandScaled) / s).toFixed(dp));

        const answer = parseFloat((multiplicand * multiplier).toFixed(dp));
        const mcLen = String(Math.round(multiplicand)).replace('.', '').length;
        const mlLen = String(multiplier).length;
        if (!isDecimal && mcLen < mlLen) {
            return { id: genId(), operands: [multiplier, Math.round(multiplicand)], operator: 'x', answer, remainder: 0, isManuallyEdited: false };
        }
        return { id: genId(), operands: [multiplicand, multiplier], operator: 'x', answer, remainder: 0, isManuallyEdited: false };
    }

    // Division ':'
    const maxDivisor = maxVal <= 100 ? 9 : maxVal <= 10_000 ? 99 : 999;

    // Resolve divisor (operand1 mask or random)
    const maskedDivisor = applyMask(getMask(c, 1), maxDivisor, 0);
    const divisor = maskedDivisor !== null
        ? Math.max(2, Math.min(maxDivisor, Math.round(maskedDivisor)))
        : randInt(2, maxDivisor);
    if (divisor < 2) return null;

    if (isDecimal) {
        const maskDiv = getMask(c, 0);
        const hasMaskDiv = Object.values(maskDiv).some(v => v);
        const decimalKeys = ['t', 'h', 'd', 'td'];
        const maskHasDecimal = decimalKeys.some(k => (maskDiv as Record<string, boolean>)[k]);
        const dividendDp = maskHasDecimal ? dp : 0;
        const maskedDiv = applyMask(maskDiv, maxVal, dividendDp);
        let dividend: number;
        if (maskedDiv !== null) {
            const scale = Math.pow(10, dividendDp);
            const base = Math.round(maskedDiv * scale) / scale;
            if (base < (dividendDp > 0 ? 0.1 : divisor) || base > maxVal) return null;
            dividend = base;
        } else if (hasMaskDiv) {
            return null;
        } else {
            if (divisor * 2 > maxVal) return null;
            dividend = randInt(divisor * 2, maxVal);
        }
        const exactQuotient = dividend / divisor;
        const quotient = parseFloat(exactQuotient.toFixed(dp));
        const remainder = parseFloat(Math.abs(dividend - quotient * divisor).toFixed(dp));
        return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder, isManuallyEdited: false };
    }

    // Resolve dividend (operand0 mask or random)
    const maskedDividend = applyMask(getMask(c, 0), maxVal, 0);
    if (maskedDividend !== null) {
        const base = Math.round(maskedDividend);
        if (base < divisor * 2 || base > maxVal) return null;
        if (c.withRemainder) {
            const rem = randInt(1, divisor - 1);
            const adjustedBase = base - (base % divisor) + rem;
            const dividend = adjustedBase <= maxVal ? adjustedBase : base - (base % divisor) - divisor + rem;
            if (dividend < divisor + rem || dividend > maxVal) return null;
            const quotient = Math.floor(dividend / divisor);
            if (quotient < 1) return null;
            return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder: rem, isManuallyEdited: false };
        }
        const quotient = Math.floor(base / divisor);
        if (quotient < 2) return null;
        const dividend = quotient * divisor;
        if (dividend > maxVal || dividend < 2) return null;
        return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder: 0, isManuallyEdited: false };
    }

    if (c.withRemainder) {
        const quotient = randInt(2, Math.floor(maxVal / divisor));
        const remainder = randInt(1, divisor - 1);
        const dividend = quotient * divisor + remainder;
        if (dividend > maxVal) return null;
        return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder, isManuallyEdited: false };
    }

    const quotient = randInt(2, Math.floor(maxVal / divisor));
    const dividend = quotient * divisor;
    if (dividend > maxVal || dividend < 2) return null;
    return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder: 0, isManuallyEdited: false };
}
