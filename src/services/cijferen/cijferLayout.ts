import type { CijferExercise } from '../math/types';

// The column geometry of a cijfer grid, shared by CijferViewer (what the sheet and the kiosk
// card draw) and the kiosk descriptor (which ruitje holds which digit). Pure: no React.

/** Decimal columns this exercise was generated with; the constraints are the old-sheet fallback. */
export function cijferDp(ex: CijferExercise, c: { numberType?: string; decimalPlaces?: number }): number {
    return ex.decimalPlaces ?? (c.numberType === 'decimal' ? (c.decimalPlaces || 2) : 0);
}

// Decimals a number really has (0,7 → 1); generators keep floats, so 9 places strip the tail.
export const decimalsOf = (x: number) => (String(Number(x.toFixed(9))).split('.')[1] ?? '').length;

export function intLen(n: number): number {
    const abs = Math.abs(Math.floor(n));
    return abs === 0 ? 1 : String(abs).length;
}

// Decimal cols at intCols+i (no comma column).
export function getDigitCols(num: number, dp: number, intCols: number): { col: number; char: string }[] {
    const s = dp > 0 ? Math.abs(num).toFixed(dp) : String(Math.abs(Math.round(num)));
    const [intPart = '0', decPart = ''] = s.split('.');
    const result: { col: number; char: string }[] = [];
    const padded = intPart.padStart(intCols, '0');
    let found = false;
    for (let i = 0; i < intCols; i++) {
        if (padded[i] !== '0') found = true;
        if (found) result.push({ col: i, char: padded[i] });
    }
    if (!found) result.push({ col: intCols - 1, char: '0' });
    if (dp > 0) {
        const padDec = decPart.padEnd(dp, '0');
        for (let i = 0; i < dp; i++) result.push({ col: intCols + i, char: padDec[i] });
    }
    return result;
}

export function ppDigitCols(value: number, intCols: number): { col: number; char: string }[] {
    if (value === 0) return [{ col: intCols - 1, char: '0' }];
    const s = String(Math.round(value));
    const offset = intCols - s.length;
    const result: { col: number; char: string }[] = [];
    let found = false;
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '0') found = true;
        if (found) result.push({ col: offset + i, char: s[i] });
    }
    return result;
}

// Keyed by the column that MADE the carry; it is written over col − 1 (CijferViewer, cijferCells).
export function computeAddCarries(operands: number[], dp: number, intCols: number): { col: number; carry: number }[] {
    const totalPositions = intCols + dp;
    const carries: { col: number; carry: number }[] = [];
    let carry = 0;
    for (let pos = 0; pos < totalPositions + 1; pos++) {
        let sum = carry;
        for (const op of operands) {
            const scaled = Math.round(Math.abs(op) * Math.pow(10, dp));
            sum += Math.floor(scaled / Math.pow(10, pos)) % 10;
        }
        carry = Math.floor(sum / 10);
        if (carry > 0) {
            const correctedCol = pos < dp
                ? intCols + (dp - 1 - pos)     // decimal positions (no comma col offset)
                : intCols - 1 - (pos - dp);     // integer positions
            carries.push({ col: correctedCol, carry });
        }
    }
    return carries;
}

// Multiply as whole numbers, then place the comma by the total decimal count (how a child does it):
// every row is right-aligned across the digit columns and only the comma edges differ per row.
export function mulLayout(ex: CijferExercise, dp: number) {
    const multiplier = ex.operands[1];
    // Decimals the multiplier really uses (trailing zeros of its dp padding don't count)
    let mdp = 0;
    while (mdp < dp && Math.abs(Math.round(multiplier * Math.pow(10, mdp)) / Math.pow(10, mdp) - multiplier) > 1e-9) mdp++;
    const tdp = dp + mdp;
    const scaledMultiplicand = Math.round(ex.operands[0] * Math.pow(10, dp));
    const multiplierDigits = String(Math.round(multiplier * Math.pow(10, mdp))).split('').reverse();
    const partialProducts = multiplierDigits.map((d, shift) => scaledMultiplicand * Number(d) * Math.pow(10, shift));
    const ppLen = (pp: number) => (pp === 0 ? 1 : String(Math.round(pp)).length);
    const digitCols = Math.max(
        intLen(ex.operands[0]) + dp,
        intLen(multiplier) + mdp,
        intLen(ex.answer) + tdp,
        ...partialProducts.map(ppLen),
    );
    return { mdp, tdp, partialProducts, digitCols, n: multiplierDigits.length, scaledMultiplicand, multiplierDigits };
}

// The add/sub grid's integer columns: wide enough for every operand and the answer.
export const addSubMaxInt = (ex: CijferExercise) => Math.max(...[...ex.operands, ex.answer].map(intLen));
