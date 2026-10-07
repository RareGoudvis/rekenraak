import { PLACE_VALUES } from '../math/mathEngine';
import type { MathBlock } from '../math/types';
import type { CijferExercise, CijferConstraints, ConstraintType } from '../math/types';

const MAX_ATTEMPTS = 500;

const randInt = (min: number, max: number): number => {
    if (min > max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const genId = (): string => Math.random().toString(36).substring(2, 9);

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

function scaleOf(dp: number): number {
    return Math.pow(10, dp);
}

// Integer place keys from the units up (E, T, H, … M, TM, HM, Mrd): index = column above the comma.
// Derived so a bridge the config offers at M or above is actually enforced.
const BRIDGE_KEYS = PLACE_VALUES.filter(p => p.weight >= 1).map(p => p.key).reverse();

// Every column that can hold a bridge key, decimals included — a fixed 8-column scan never
// reached HD with three decimals (or anything above HM on whole numbers).
const scanColumns = (dp: number): number => dp + BRIDGE_KEYS.length;

function checkAdditionBridges(operands: number[], dp: number, bridges: Record<string, ConstraintType>): boolean {
    const scale = Math.pow(10, dp);
    let carry = 0;
    for (let pos = 0; pos < scanColumns(dp); pos++) {
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
    for (let pos = 0; pos < scanColumns(dp); pos++) {
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

// Check whether an integer satisfies a place-value mask: masked positions
// must be non-zero, unmasked integer positions must be zero. Used after the
// generator adjusts a mask-conforming `base` for divisibility — the rounding
// can introduce non-zero digits where the mask said "must be zero".
function matchesIntegerMask(value: number, mask: Record<string, boolean>): boolean {
    const hasAny = Object.values(mask).some(v => v);
    if (!hasAny) return true;
    const abs = Math.abs(Math.round(value));
    for (const place of PLACE_VALUES) {
        if (place.weight < 1) continue;
        const digit = Math.floor(abs / place.weight) % 10;
        if (mask[place.key] && digit === 0) return false;
        if (!mask[place.key] && digit !== 0) return false;
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

// A staartdeling stops after `dp` decimals: the quotient is truncated there (not rounded) and
// dividend = q·divisor + r with 0 ≤ r < divisor·10^-dp, in scaled integers so no float drift.
// SYNC: CijferViewer's confirmEdit recomputes a teacher-edited division with this helper too.
export function divideToDecimals(dividend: number, divisor: number, dp: number): { quotient: number; remainder: number } {
    const s = scaleOf(dp);
    const d = Math.round(dividend * s);
    const v = Math.round(divisor * s);
    // Both operands carry ≤ dp decimals, so q·10^dp = d·10^dp / v and r counts 10^-2dp units.
    const num = d * s;
    let q = Math.floor(num / v);
    if (q * v > num) q -= 1;
    if (num - q * v >= v) q += 1;
    const r = num - q * v;
    return { quotient: q / s, remainder: r / (s * s) };
}

export function generateCijferExercisesNoted(block: MathBlock): { items: CijferExercise[]; note: string | null } {
    const c = block.constraints as CijferConstraints;
    const count = block.numberOfExercises || 4;
    // Stamp the decimal-place count on every exercise: the grid draws the columns the
    // exercise was made with, not the ones the settings happen to say now.
    const dp = c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0;
    const results: CijferExercise[] = [];
    let fallbacks = 0;
    for (let i = 0; i < count; i++) {
        const { ex, fellBack } = generateOne(c);
        if (fellBack) fallbacks++;
        results.push({ ...ex, decimalPlaces: dp });
    }
    const note = fallbacks === 0 ? null
        : fallbacks === 1
            ? '1 oefening past niet bij de gekozen getalopbouw en het maximum; daarvoor staat er een eenvoudige oefening binnen het maximum.'
            : `${fallbacks === count ? 'Alle' : fallbacks} oefeningen passen niet bij de gekozen getalopbouw en het maximum; daarvoor staan er eenvoudige oefeningen binnen het maximum.`;
    return { items: results, note };
}

export function generateCijferExercises(block: MathBlock): CijferExercise[] {
    return generateCijferExercisesNoted(block).items;
}

function getMask(c: CijferConstraints, i: number): Record<string, boolean> {
    const keys = ['operand0Mask', 'operand1Mask', 'operand2Mask', 'operand3Mask'] as const;
    return (c[keys[Math.min(i, 3)]] || {}) as Record<string, boolean>;
}

function generateOne(c: CijferConstraints): { ex: CijferExercise; fellBack: boolean } {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const ex = tryGenerate(c);
        if (ex) return { ex, fellBack: false };
    }
    // Fallback ignores masks and numberOfTerms but must stay inside the max (operands and answer)
    const dp = c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0;
    const s = scaleOf(dp);
    const half = Math.round((c.maxRange / 2) * s) / s;
    const quarter = Math.round((c.maxRange / 4) * s) / s;
    const mk = (operands: number[], operator: CijferExercise['operator'], answer: number, remainder = 0): { ex: CijferExercise; fellBack: boolean } =>
        ({ ex: { id: genId(), operands, operator, answer, remainder, isManuallyEdited: false }, fellBack: true });
    if (c.operator === '+') return mk([half, quarter], '+', parseFloat((half + quarter).toFixed(dp)));
    if (c.operator === '-') return mk([half, quarter], '-', parseFloat((half - quarter).toFixed(dp)));
    if (c.operator === 'x') {
        // multiplicand ≤ max/multiplier so the product stays ≤ max
        const mult = c.maxRange >= 3 ? 3 : 2;
        const multiplicand = Math.max(1, Math.floor((c.maxRange * s) / mult)) / s;
        return mk([multiplicand, mult], 'x', parseFloat((multiplicand * mult).toFixed(dp)));
    }
    // With a remainder requested, pick the first divisor that leaves one (max % 4 is often 0)
    const divisor = (c.withRemainder && c.numberType !== 'decimal' && [4, 3, 7, 9, 6, 5].find(d => c.maxRange % d !== 0)) || 4;
    return mk([c.maxRange, divisor], ':', Math.floor(c.maxRange / divisor), c.maxRange % divisor);
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
        const maskA = getMask(c, 0);
        const maskedA = applyMask(maskA, maxVal, dp);
        // a mask that doesn't fit used to be dropped silently; retry, then fall back with a note
        if (maskedA === null && Object.values(maskA).some(v => v)) return null;
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
        // Tiers past a million: 3-digit multipliers up to 1e7, 4-digit ones up to 1e9.
        const maxMultiplier = maxVal <= 100 ? 9 : maxVal <= 10000 ? 99 : maxVal <= 10_000_000 ? 999 : 9999;
        const minMultiplier = maxVal <= 100 ? 2 : 10;

        // pass dp so decimal place keys (t, h) generate proper fractional multipliers
        const mask1 = getMask(c, 1);
        const hasMask1 = Object.values(mask1).some(v => v);
        const maskedMultiplier = applyMask(mask1, maxMultiplier, dp);
        const hasMaskedMultiplier = maskedMultiplier !== null;
        if (hasMask1 && !hasMaskedMultiplier) return null;
        const multiplier = hasMaskedMultiplier ? maskedMultiplier : randInt(minMultiplier, maxMultiplier);
        if (multiplier <= 0 || multiplier > maxMultiplier) return null;

        // A fractional multiplier shrinks the product, so the multiplicand itself is what the max bounds
        const maxMultiplicandScaled = Math.floor((maxVal * s) / Math.max(multiplier, 1));
        if (maxMultiplicandScaled < s) return null;

        // Scaled integers keep the key exact: the product needs dp decimals only when
        // multiplicandScaled × multiplierScaled is a multiple of s, so step to such multiplicands
        const multiplierScaled = Math.round(multiplier * s);
        const step = s / gcd(multiplierScaled, s);
        const mask0 = getMask(c, 0);
        const hasMask0 = Object.values(mask0).some(v => v);
        const masked = applyMask(mask0, maxMultiplicandScaled / s, dp);
        // if mask was set but generated value is out of range, retry instead of falling back to random
        if (hasMask0 && masked === null) return null;
        let multiplicandScaled: number;
        if (masked !== null) {
            multiplicandScaled = Math.round(masked * s);
            if (multiplicandScaled % step !== 0) return null;
        } else {
            const lo = Math.ceil(s / step);
            const hi = Math.floor(maxMultiplicandScaled / step);
            if (lo > hi) return null;
            multiplicandScaled = randInt(lo, hi) * step;
        }
        const multiplicand = parseFloat((multiplicandScaled / s).toFixed(dp));

        const answer = Math.round((multiplicandScaled * multiplierScaled) / s) / s;
        const mcLen = String(Math.round(multiplicand)).replace('.', '').length;
        const mlLen = String(multiplier).length;
        if (!isDecimal && mcLen < mlLen) {
            return { id: genId(), operands: [multiplier, Math.round(multiplicand)], operator: 'x', answer, remainder: 0, isManuallyEdited: false };
        }
        return { id: genId(), operands: [multiplicand, multiplier], operator: 'x', answer, remainder: 0, isManuallyEdited: false };
    }

    // Division ':'
    // Past 1e7 a 3-digit divisor leaves a 7-digit quotient, so natural numbers grow to 4 digits —
    // not under a dividend mask (its exact-match retry starves once the divisor outgrows the
    // dividend) and not for decimals, whose lists stay as they were.
    const dividendMasked = Object.values(getMask(c, 0)).some(v => v);
    const bigDivisor = maxVal > 10_000_000 && !isDecimal && !dividendMasked;
    const maxDivisor = maxVal <= 100 ? 9 : maxVal <= 10_000 ? 99 : bigDivisor ? 9999 : 999;

    // pass dp so decimal mask keys (t, h) produce fractional divisors
    const mask1d = getMask(c, 1);
    const hasMask1d = Object.values(mask1d).some(v => v);
    const maskedDivisor = applyMask(mask1d, maxDivisor, dp);
    const hasMaskedDivisor = maskedDivisor !== null;
    if (hasMask1d && !hasMaskedDivisor) return null;
    const divisor = hasMaskedDivisor ? maskedDivisor : randInt(2, maxDivisor);
    if (divisor <= 0) return null;
    // for unmasked integer divisors enforce minimum of 2
    if (!hasMaskedDivisor && divisor < 2) return null;
    // A divisor of 1 leaves no room for a remainder (a mask digit can still roll a 1)
    if (!isDecimal && c.withRemainder && divisor < 2) return null;

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
        // a fractional divisor makes randInt's offset overshoot the max; a quotient that truncates to 0 is no sum
        if (dividend > maxVal) return null;
        const { quotient, remainder } = divideToDecimals(dividend, divisor, dp);
        if (quotient <= 0) return null;
        return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder, isManuallyEdited: false };
    }

    // Resolve dividend (operand0 mask or random)
    const mask0 = getMask(c, 0);
    const hasMask0 = Object.values(mask0).some(v => v);
    const maskedDividend = applyMask(mask0, maxVal, 0);
    // If a mask was requested but applyMask couldn't satisfy it on this roll, bail
    // so the retry loop tries again — otherwise we'd silently fall through to the
    // unmasked random path below.
    if (hasMask0 && maskedDividend === null) return null;
    if (maskedDividend !== null) {
        const base = Math.round(maskedDividend);
        if (base < divisor * 2 || base > maxVal) return null;
        if (c.withRemainder) {
            const rem = randInt(1, divisor - 1);
            const adjustedBase = base - (base % divisor) + rem;
            const dividend = adjustedBase <= maxVal ? adjustedBase : base - (base % divisor) - divisor + rem;
            if (dividend < divisor + rem || dividend > maxVal) return null;
            // Rounding to a multiple of `divisor` (± `rem`) can re-introduce digits
            // at positions the mask said must be zero. Re-check and retry on a miss.
            if (!matchesIntegerMask(dividend, mask0)) return null;
            const quotient = Math.floor(dividend / divisor);
            if (quotient < 1) return null;
            return { id: genId(), operands: [dividend, divisor], operator: ':', answer: quotient, remainder: rem, isManuallyEdited: false };
        }
        const quotient = Math.floor(base / divisor);
        if (quotient < 2) return null;
        const dividend = quotient * divisor;
        if (dividend > maxVal || dividend < 2) return null;
        if (!matchesIntegerMask(dividend, mask0)) return null;
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
