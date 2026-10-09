import type { CijferExercise } from '../math/types';
import type { InteractionState } from '../../components/viewer/ViewerInteractionContext';
import { addSubMaxInt, computeAddCarries, getDigitCols, intLen, mulLayout } from './cijferLayout';
import { PLACE_VALUES } from '../math/mathEngine';

// Oefenmodus (Phase C2): the ruitjes of a cijfer grid the pupil fills on the kiosk card.
// CijferViewer draws a KioskCell at every cell's (row, col); the kiosk descriptor checks them.
// Rows and columns are the KIOSK grid's: the card draws one free row above a subtraction (the
// sheet two), no carry row over a multi-digit multiplier (its carries change per digit), no
// empty partial-product row under a one-digit multiplier and one working row in a staartdeling,
// so the grid is as large as the card allows.

export type CijferCellRole = 'digit' | 'carry' | 'borrow' | 'pp' | 'quotient' | 'rest';

export interface CijferCell {
    key: string;
    role: CijferCellRole;
    // Grid row and column (column 0 holds the operator; digits start at 1). Unused for 'rest'.
    row: number;
    col: number;
    // What a screen reader calls the cell: role + column, e.g. "Onthouden tientallen".
    label: string;
}

const ROLE_NAME: Record<CijferCellRole, string> = { digit: 'Antwoord', carry: 'Onthouden', borrow: 'Lenen', pp: 'Deelproduct', quotient: 'Quotiënt', rest: 'Rest' };
const UNITS_AT = PLACE_VALUES.findIndex(p => p.key === 'E');

// place = power of ten of the column (0 = eenheden, -1 = tienden); pp = the partial product's row.
function cellLabel(role: CijferCellRole, place: number, pp?: number): string {
    if (role === 'rest') return ROLE_NAME.rest;
    const column = PLACE_VALUES[UNITS_AT - place]?.label.toLowerCase() ?? `kolom ${place}`;
    return [ROLE_NAME[role], pp === undefined ? '' : String(pp + 1), column].filter(Boolean).join(' ');
}

// SYNC: CijferViewer draws these rows in its kiosk branch.
export const KIOSK_CARRY_ROW = 1;
export const KIOSK_FIRST_OPERAND_ROW = 2;
export const KIOSK_QUOTIENT_ROW = 1;

/** The kiosk multiplication grid's rows for an n-digit multiplier: a carry row and no partial
 *  products for n = 1 (the product is the answer row), partial products and no carry row else. */
export function kioskMulRows(n: number) {
    const carry = n === 1 ? 1 : 0;
    const ppRows = n >= 2 ? n : 0;
    const ppStart = 3 + carry;
    return { multiplicand: 1 + carry, multiplier: 2 + carry, ppStart, ppRows, answer: ppStart + ppRows };
}

export interface CijferKioskGrid {
    cells: CijferCell[];
    // The row the answer digits sit in (add / sub / mul).
    answerRow: number;
}

// Division: the quotient spans the dividend's integer columns plus dp, right of the bar.
function divGeometry(ex: CijferExercise, dp: number) {
    const dividendIntCols = intLen(ex.operands[0]);
    const workingDecCols = dp > 0 ? Math.max(dp, 3) : 0;
    return { qInt: dividendIntCols, leftCols: dividendIntCols + workingDecCols };
}

/** Every fillable ruitje of the kiosk grid, in key order (Tab order; the keypad starts at the first digit). */
export function cijferKioskGrid(ex: CijferExercise, dp: number): CijferKioskGrid {
    const cells: CijferCell[] = [];
    // unitsCol: the grid column of the eenheden, so a cell's place is unitsCol - col.
    const add = (key: string, role: CijferCellRole, row: number, col: number, unitsCol: number, pp?: number) =>
        cells.push({ key, role, row, col, label: cellLabel(role, unitsCol - col, pp) });
    if (ex.operator === ':') {
        // A staartdeling is written left to right, so the quotient is too.
        const { qInt, leftCols } = divGeometry(ex, dp);
        for (let i = 0; i < qInt + dp; i++) add(`q${i}`, 'quotient', KIOSK_QUOTIENT_ROW, leftCols + i, leftCols + qInt - 1);
        add('r', 'rest', 0, 0, 0);
        return { cells, answerRow: KIOSK_QUOTIENT_ROW };
    }
    if (ex.operator === 'x') {
        const { digitCols, tdp, n, scaledMultiplicand } = mulLayout(ex, dp);
        const unitsCol = digitCols - tdp;
        const { ppStart, ppRows: pp, answer: answerRow } = kioskMulRows(n);
        const mcLen = String(scaledMultiplicand).length;
        // One-digit multiplier: a carry above every multiplicand digit but the units.
        const carryAt = (col: number) => n === 1 && digitCols - 1 - col >= 1 && digitCols - 1 - col < mcLen;
        // Row r holds the product by multiplier digit r from the units (checked in any order).
        // SYNC: CijferViewer MultiplicationGrid's key draws partialProducts[r] in row ppStart + r.
        for (let r = 0; r < pp; r++) for (let col = digitCols - 1; col >= 0; col--) add(`p${r}_${col}`, 'pp', ppStart + r, col + 1, unitsCol, r);
        for (let col = digitCols - 1; col >= 0; col--) {
            add(`a${col}`, 'digit', answerRow, col + 1, unitsCol);
            if (col > 0 && carryAt(col - 1)) add(`c${col - 1}`, 'carry', KIOSK_CARRY_ROW, col, unitsCol);
        }
        return { cells, answerRow };
    }
    const unitsCol = addSubMaxInt(ex);
    const D = unitsCol + dp;
    const answerRow = KIOSK_FIRST_OPERAND_ROW + ex.operands.length;
    // Right to left as the pupil works: a subtraction exchanges above a column before its digit,
    // an addition carries into the next column after it.
    for (let col = D - 1; col >= 0; col--) {
        if (ex.operator === '-') add(`b${col}`, 'borrow', KIOSK_CARRY_ROW, col + 1, unitsCol);
        add(`a${col}`, 'digit', answerRow, col + 1, unitsCol);
        if (ex.operator === '+' && col > 0) add(`c${col - 1}`, 'carry', KIOSK_CARRY_ROW, col, unitsCol);
    }
    return { cells, answerRow };
}

// ── Checking ─────────────────────────────────────────────────────────────────

// Generators keep decimals as floats: 9 places strips the tail.
const plain = (x: number): string => String(Number(x.toFixed(9)));

// One digit per column of `value` over intCols + dp columns. A column left of the number and a
// trailing decimal zero may stay blank ('|0'): 2,5 and 2,50 are the same number.
function digitWants(value: number, dp: number, intCols: number): string[] {
    const at = new Map(getDigitCols(value, dp, intCols).map(d => [d.col, d.char]));
    const wants = Array.from({ length: intCols + dp }, (_, col) => at.get(col) ?? '|0');
    for (let col = intCols + dp - 1; col >= intCols && wants[col] === '0'; col--) wants[col] = '|0';
    return wants;
}

// The digits of a subtraction operand, one per grid column (left-padded with 0).
const columnDigits = (x: number, dp: number, D: number) => String(Math.round(Math.abs(x) * 10 ** dp)).padStart(D, '0').split('').map(Number);

// Subtraction by exchanging ('inwisselen'): the value every top digit ends at after the pupil
// exchanged a ten from the left. Untouched columns keep their digit (null).
function exchanged(ex: CijferExercise, dp: number, D: number): Array<number | null> {
    const top = columnDigits(ex.operands[0], dp, D);
    const bottom = columnDigits(ex.operands[1], dp, D);
    const after: Array<number | null> = top.map(() => null);
    const value = (i: number) => after[i] ?? top[i];
    for (let i = D - 1; i >= 0; i--) {
        if (value(i) >= bottom[i]) continue;
        let j = i - 1;
        while (j >= 0 && value(j) === 0) j--;
        if (j < 0) break;
        after[j] = value(j) - 1;
        // Every 0 on the way became 10 and lent one on: 9.
        for (let k = j + 1; k < i; k++) after[k] = 9;
        after[i] = value(i) + 10;
    }
    return after;
}

/** The kiosk's Lenen key on the active cell's column (its answer digit or exchange cell): the
 *  column left of it gives one (a 0 on the way becomes 9) and this column gets ten more, written
 *  in the exchange cells and marked so the card strikes the old digits. It always exchanges, needed
 *  or not, so the key never tells the pupil whether a column needs it. null = nothing changes:
 *  no subtraction, no column cell, this column was already given ten, or nothing left of it to lend. */
export function cijferLenen(ex: CijferExercise, dp: number, state: InteractionState, activeCell: string | null): InteractionState | null {
    const m = ex.operator === '-' && activeCell ? /^[ab](\d+)$/.exec(activeCell) : null;
    if (!m) return null;
    const k = Number(m[1]);
    const D = addSubMaxInt(ex) + dp;
    const marks = state.marks ?? {};
    if (k >= D || marks[`b${k}`] === 'got') return null;
    const top = columnDigits(ex.operands[0], dp, D);
    // A column's value now: what the pupil (or an earlier Lenen) wrote above it, else its top digit.
    const now = (i: number) => {
        const w = (state.cells[`b${i}`] ?? '').trim();
        return /^\d+$/.test(w) ? Number(w) : top[i];
    };
    let j = k - 1;
    while (j >= 0 && now(j) === 0) j--;
    if (j < 0) return null;
    const cells = { ...state.cells, [`b${j}`]: String(now(j) - 1), [`b${k}`]: String(now(k) + 10) };
    const next = { ...marks, [`b${k}`]: 'got' };
    // A column that already got ten keeps that mark when it lends on.
    if (next[`b${j}`] !== 'got') next[`b${j}`] = 'lent';
    for (let i = j + 1; i < k; i++) { cells[`b${i}`] = '9'; next[`b${i}`] = 'got'; }
    return { ...state, cells, marks: next };
}

// A carry the pupil may leave blank ('|1'), or must write when strict; no carry = blank or 0.
const carryWant = (v: number, strict: boolean) => (v > 0 ? (strict ? String(v) : `|${v}`) : '|0');

export interface CijferCheck {
    // One entry per answer part, in part order (see partKeys).
    wants: string[];
    // Which cells make up each part: one cell, or a whole row read as a number.
    parts: Array<{ cell: string } | { row: string[]; kind: 'pp' | 'quotient'; intCells?: number } | { rest: true }>;
    // The answer-row cells left to right and where its comma sits (stats text).
    answerCells: string[];
    answerInt: number;
}

/** What each part of a cijfer answer must hold. Add / sub: one part per cell in key order. Mul:
 *  the carries, then every partial product as a number (in any row order), then the answer digits.
 *  Div: the quotient as a number (written left- or right-aligned), then the rest. */
export function cijferCheck(ex: CijferExercise, dp: number, strictCarries: boolean): CijferCheck {
    const { cells } = cijferKioskGrid(ex, dp);
    if (ex.operator === ':') {
        const { qInt } = divGeometry(ex, dp);
        const q = cells.filter(c => c.role === 'quotient').map(c => c.key);
        return {
            wants: [plain(ex.answer), plain(ex.remainder ?? 0)],
            parts: [{ row: q, kind: 'quotient', intCells: qInt }, { rest: true }],
            answerCells: q, answerInt: qInt,
        };
    }
    if (ex.operator === 'x') {
        const { digitCols, tdp, partialProducts, n, scaledMultiplicand, multiplierDigits } = mulLayout(ex, dp);
        const maxInt = digitCols - tdp;
        const answer = digitWants(ex.answer, tdp, maxInt);
        // Carries of the one multiplication by a one-digit multiplier, units first.
        const m = Number(multiplierDigits[0]);
        const mc = String(scaledMultiplicand).split('').reverse().map(Number);
        const carryInto: number[] = [0];
        mc.forEach((d, p) => carryInto.push(Math.floor((d * m + carryInto[p]) / 10)));
        const carryCells = cells.filter(c => c.role === 'carry');
        const ppRows = Array.from({ length: kioskMulRows(n).ppRows }, (_, r) => cells.filter(c => c.key.startsWith(`p${r}_`)).map(c => c.key).reverse());
        const answerCells = Array.from({ length: digitCols }, (_, col) => `a${col}`);
        return {
            wants: [
                ...carryCells.map(c => carryWant(carryInto[digitCols - c.col] ?? 0, strictCarries)),
                ...(ppRows.length ? partialProducts.map(Number).sort((a, b) => a - b).map(String) : []),
                ...answerCells.map((_, col) => answer[col]),
            ],
            parts: [...carryCells.map(c => ({ cell: c.key })), ...ppRows.map(row => ({ row, kind: 'pp' as const })), ...answerCells.map(cell => ({ cell }))],
            answerCells, answerInt: maxInt,
        };
    }
    const maxInt = addSubMaxInt(ex);
    const D = maxInt + dp;
    const answer = digitWants(ex.answer, dp, maxInt);
    const carries = new Map(computeAddCarries(ex.operands, dp, maxInt).map(c => [c.col, c.carry]));
    const after = ex.operator === '-' ? exchanged(ex, dp, D) : [];
    const top = getDigitCols(ex.operands[0], dp, maxInt);
    const topAt = (col: number) => top.find(d => d.col === col)?.char ?? '0';
    const want = (cell: CijferCell): string => {
        const col = cell.col - 1;
        if (cell.role === 'digit') return answer[col];
        // computeAddCarries keys a carry by the column that MADE it; this cell holds the one coming in.
        // SYNC: CijferViewer AddSubGrid draws the sheet's red carry at that same col − 1.
        if (cell.role === 'carry') return carryWant(carries.get(col + 1) ?? 0, strictCarries);
        // An exchanged column ends at its new value; an untouched one may be copied or left blank.
        const v = after[col];
        return v === null ? `|${topAt(col)}` : strictCarries ? String(v) : `|${v}`;
    };
    return {
        wants: cells.map(want),
        parts: cells.map(c => ({ cell: c.key })),
        answerCells: Array.from({ length: D }, (_, col) => `a${col}`),
        answerInt: maxInt,
    };
}

// A row of one-digit cells as the number it spells. Blanks may lead; trailing blanks of a
// partial product are its shift zeros, of a quotient's decimals nothing. A gap is no number ('?').
function readRow(values: string[], trailingZeros: boolean): string {
    const first = values.findIndex(v => v !== '');
    if (first < 0) return '';
    let last = values.length - 1;
    while (values[last] === '') last--;
    const body = values.slice(first, last + 1);
    if (body.some(v => !/^\d$/.test(v))) return '?';
    return body.join('') + (trailingZeros ? '0'.repeat(values.length - 1 - last) : '');
}

/** The quotient cells as a number: the integer part may sit anywhere in its columns, the decimals after the comma. */
function readQuotient(values: string[], intCells: number): string {
    const int = readRow(values.slice(0, intCells), false);
    const dec = readRow([...values.slice(intCells)].reverse(), false).split('').reverse().join('');
    // A blank before the first decimal digit is a gap, not a leading blank.
    if (dec && values[intCells] === '') return '?';
    if (int === '?' || dec === '?') return '?';
    if (!dec) return int;
    return `${int || '0'},${dec}`;
}

/** The pupil's parts from the filled cells (same order as wants); '' while no answer digit is written. */
export function cijferGiven(chk: CijferCheck, cellsOf: Record<string, string>): string[] | null {
    const v = (k: string) => (cellsOf[k] ?? '').trim();
    if (!chk.answerCells.some(k => v(k) !== '')) return null;
    const parts = chk.parts.map(p => {
        if ('cell' in p) return v(p.cell);
        if ('rest' in p) return v('r');
        if (p.kind === 'quotient') return readQuotient(p.row.map(v), p.intCells ?? p.row.length);
        // A blank partial-product row is a 0 (a multiplier digit 0 needs no row).
        return readRow(p.row.map(v), true) || '0';
    });
    if (chk.parts.some(p => 'rest' in p) && v('r') === '') return null;
    // Partial products count in any row order, like the sorted wants.
    const pp = chk.parts.flatMap((p, i) => ('kind' in p && p.kind === 'pp' ? [i] : []));
    const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : Infinity);
    const sorted = pp.map(i => parts[i]).sort((a, b) => (num(a) - num(b)) || 0);
    pp.forEach((i, j) => { parts[i] = sorted[j]; });
    return parts;
}
