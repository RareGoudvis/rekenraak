import type { CijferExercise } from '../math/types';
import type { InteractionState } from '../../components/viewer/ViewerInteractionContext';
import { addSubMaxInt, computeAddCarries, decimalsOf, getDigitCols, intLen, mulLayout } from './cijferLayout';
import { PLACE_VALUES } from '../math/mathEngine';

// Oefenmodus (Phase C2): the ruitjes of a cijfer grid the pupil fills on the kiosk card.
// CijferViewer draws a KioskCell at every cell's (row, col); the kiosk descriptor checks them.
// Rows and columns are the KIOSK grid's: the card draws one free row above a subtraction (the
// sheet two), none above a multiplication (its carries stand right of each product row), no
// empty partial-product row under a one-digit multiplier, and in a staartdeling exactly the
// product and difference rows of its steps, so the grid is as large as the card allows.

export type CijferCellRole = 'digit' | 'carry' | 'borrow' | 'pp' | 'quotient' | 'product' | 'diff' | 'down' | 'rest';

export interface CijferCell {
    key: string;
    role: CijferCellRole;
    // Grid row and column (column 0 holds the operator; digits start at 1; a staartdeling has no operator column). Unused for 'rest'.
    row: number;
    col: number;
    // What a screen reader calls the cell: role + column, e.g. "Onthouden tientallen".
    label: string;
}

const ROLE_NAME: Record<CijferCellRole, string> = {
    digit: 'Antwoord', carry: 'Onthouden', borrow: 'Lenen', pp: 'Deelproduct', quotient: 'Quotiënt',
    product: 'Product', diff: 'Verschil', down: 'Bijhalen', rest: 'Rest',
};
const UNITS_AT = PLACE_VALUES.findIndex(p => p.key === 'E');

// place = power of ten of the column (0 = eenheden, -1 = tienden); n = the row's number (partial product, carry row, step).
function cellLabel(role: CijferCellRole, place: number, n?: number): string {
    if (role === 'rest') return ROLE_NAME.rest;
    const column = PLACE_VALUES[UNITS_AT - place]?.label.toLowerCase() ?? `kolom ${place}`;
    return [ROLE_NAME[role], n === undefined ? '' : String(n + 1), column].filter(Boolean).join(' ');
}

// SYNC: CijferViewer draws these rows in its kiosk branch.
export const KIOSK_CARRY_ROW = 1;
export const KIOSK_FIRST_OPERAND_ROW = 2;
export const KIOSK_QUOTIENT_ROW = 1;

/** The kiosk multiplication grid's rows: no free row above the multiplicand, partial products only
 *  for a multi-digit multiplier (a one-digit product is the answer row). */
// SYNC: CijferViewer MultiplicationGrid draws these rows in its kiosk branch.
export function kioskMulRows(ex: CijferExercise, dp: number) {
    const { n } = mulLayout(ex, dp);
    const ppRows = n >= 2 ? n : 0;
    return { multiplicand: 1, multiplier: 2, ppStart: 3, ppRows, answer: 3 + ppRows };
}

/** The onthoudcijfers of the product by multiplier digit r (units first), in the order they happen:
 *  `from` = the multiplicand place whose step makes it. Only real carries: the last step's carry is
 *  written straight into the product, so it is none. */
export function mulCarries(ex: CijferExercise, dp: number, r: number): Array<{ from: number; value: number }> {
    const { scaledMultiplicand, multiplierDigits } = mulLayout(ex, dp);
    const m = Number(multiplierDigits[r]);
    const mc = String(scaledMultiplicand).split('').reverse().map(Number);
    const out: Array<{ from: number; value: number }> = [];
    let carry = 0;
    mc.forEach((d, p) => {
        carry = Math.floor((d * m + carry) / 10);
        if (p < mc.length - 1 && carry > 0) out.push({ from: p, value: carry });
    });
    return out;
}

// Owner's class method (2026-11-15): a row's onthoudcijfers stand to the RIGHT of the grid on that
// row's own line, first carry first, half a ruitje clear of the E column.
export const MUL_CARRY_GAP = 0.5;

export interface CijferKioskGrid {
    cells: CijferCell[];
    // The row the answer digits sit in (add / sub / mul).
    answerRow: number;
}

/** Whole places the quotient may need: a decimal divisor is worked after the komma shift
 *  (742,4 : 0,7 = 7424 : 7), so they are the SHIFTED dividend's (1060,57 needs four, not three). */
// SYNC: CijferViewer DivisionGrid quotientIntCols and divGridCols size the quotient row from this.
export function divQuotientInt(ex: CijferExercise): number {
    return intLen(Number((ex.operands[0] * 10 ** decimalsOf(ex.operands[1])).toFixed(9)));
}

// ── Staartdeling (the card's working rows) ───────────────────────────────────

export interface DivStep {
    // The dividend column this step ends on (its quotient digit's column) and the leftmost column of its partial dividend.
    end: number;
    lo: number;
    partial: number;
    q: number;
    // Product and difference rows (grid rows) when q > 0; a 0 step only brings the next digit down.
    productRow?: number;
    diffRow?: number;
}

export interface DivPlan {
    // The dividend's digits as worked: after the komma shift, to dp decimals (742,4 : 0,7 → 742400).
    digits: number[];
    divisor: number;
    // Digits before the quotient's comma.
    intEnd: number;
    steps: DivStep[];
    // First quotient column the pupil writes (a 0 before the comma, or 0,0… before the first step).
    qStart: number;
    // Working rows under the dividend: a product and a difference row per step that subtracts.
    workRows: number;
}

/** The staartdeling a pupil writes, step by step: take digits until the divisor fits, write the
 *  quotient digit, the product under the partial dividend and the difference under that, bring the
 *  next digit down beside it. A step whose digit is 0 writes no rows: the next digit comes down too. */
export function divPlan(ex: CijferExercise, dp: number): DivPlan {
    const [dividend, divisorRaw] = ex.operands;
    const mdp = decimalsOf(divisorRaw);
    const divisor = Math.round(divisorRaw * 10 ** mdp);
    const [intPart, dec = ''] = Math.abs(dividend).toFixed(dp + mdp).split('.');
    const digits = (intPart + dec).split('').map(Number);
    const intEnd = intPart.length + mdp;
    let first = 0;
    let partial = digits[0];
    while (partial < divisor && first < digits.length - 1) partial = partial * 10 + digits[++first];
    const steps: DivStep[] = [];
    let rows = 0;
    for (let end = first; end < digits.length; end++) {
        if (end > first) partial = partial * 10 + digits[end];
        const q = Math.floor(partial / divisor);
        const step: DivStep = { end, lo: end - String(partial).length + 1, partial, q };
        if (q > 0) { step.productRow = 1 + rows; step.diffRow = 2 + rows; rows += 2; }
        steps.push(step);
        partial -= q * divisor;
    }
    return { digits, divisor, intEnd, steps, qStart: Math.min(first, intEnd - 1), workRows: rows };
}

// The left part of the card's staartdeling: the sheet's columns, wider when the worked digits need more.
// SYNC: CijferViewer DivisionGrid leftCols (the sheet's) and its kiosk branch.
export function divLeftCols(ex: CijferExercise, dp: number): number {
    const sheet = intLen(ex.operands[0]) + (dp > 0 ? Math.max(dp, 3) : 0);
    return Math.max(sheet, divPlan(ex, dp).digits.length);
}

/** The card's staartdeling geometry: working rows, quotient cells, the subtraction lines and the quotient's comma (null = none). */
export function divKioskLayout(ex: CijferExercise, dp: number) {
    const plan = divPlan(ex, dp);
    return {
        leftCols: divLeftCols(ex, dp),
        workRows: plan.workRows,
        qCells: plan.digits.length - plan.qStart,
        // Under every product: the line a pupil draws before subtracting.
        lines: plan.steps.flatMap(st => (st.productRow === undefined ? [] : [{ row: st.productRow, from: st.lo, to: st.end }])),
        qCommaAfter: plan.intEnd < plan.digits.length ? plan.intEnd - 1 - plan.qStart : null,
    };
}

type AddCell = (key: string, role: CijferCellRole, row: number, col: number, place: number, n?: number) => void;

// The staartdeling's cells in the order a pupil works, with what each must hold: per step the
// quotient digit, the product and the difference right to left, then the next digit brought down.
function divCells(ex: CijferExercise, dp: number, add: AddCell): Map<string, string> {
    const { digits, divisor, intEnd, steps, qStart } = divPlan(ex, dp);
    const left = divLeftCols(ex, dp);
    const wants = new Map<string, string>();
    const first = steps[0].end;
    const qDigits = Array.from({ length: digits.length - qStart }, (_, i) => (qStart + i < first ? 0 : steps[qStart + i - first].q));
    // A trailing 0 decimal may stay blank: 2,5 and 2,50 are the same quotient.
    let lastSignificant = qDigits.length - 1;
    while (lastSignificant > 0 && qDigits[lastSignificant] === 0 && qStart + lastSignificant >= intEnd) lastSignificant--;
    const quotient = (e: number) => {
        const i = e - qStart;
        add(`q${i}`, 'quotient', KIOSK_QUOTIENT_ROW, left + i, intEnd - 1 - e);
        wants.set(`q${i}`, i > lastSignificant ? '0|' : String(qDigits[i]));
    };
    // Every column the partial dividend covers, right to left; columns left of the number may stay blank (or 0).
    const row = (prefix: string, role: CijferCellRole, gridRow: number, st: DivStep, value: number, k: number, zeroMayBeBlank: boolean) => {
        const s = String(value);
        for (let col = st.end; col >= st.lo; col--) {
            const ch = s[s.length - 1 - (st.end - col)];
            add(`${prefix}${k}_${col}`, role, gridRow, col, intEnd - 1 - col, k);
            wants.set(`${prefix}${k}_${col}`, ch === undefined || (zeroMayBeBlank && value === 0) ? '|0' : ch);
        }
    };
    for (let e = qStart; e < first; e++) quotient(e);
    let diffRow: number | undefined;
    let k = 0;
    steps.forEach((st, s) => {
        if (s > 0 && diffRow !== undefined) {
            add(`n${st.end}`, 'down', diffRow, st.end, intEnd - 1 - st.end);
            wants.set(`n${st.end}`, String(digits[st.end]));
        }
        quotient(st.end);
        if (st.productRow === undefined || st.diffRow === undefined) return;
        const product = st.q * divisor;
        row('m', 'product', st.productRow, st, product, k, false);
        // A 0 difference before the next digit comes down may stay blank ("05" or " 5"); the last one is the rest.
        row('v', 'diff', st.diffRow, st, st.partial - product, k, s < steps.length - 1);
        diffRow = st.diffRow;
        k++;
    });
    return wants;
}

/** Every fillable ruitje of the kiosk grid, in key order (Tab order; the keypad starts at the first digit). */
export function cijferKioskGrid(ex: CijferExercise, dp: number): CijferKioskGrid {
    const cells: CijferCell[] = [];
    // unitsCol: the grid column of the eenheden, so a cell's place is unitsCol - col.
    const add = (key: string, role: CijferCellRole, row: number, col: number, unitsCol: number, pp?: number) =>
        cells.push({ key, role, row, col, label: cellLabel(role, unitsCol - col, pp) });
    if (ex.operator === ':') {
        divCells(ex, dp, (key, role, row, col, place, n) => cells.push({ key, role, row, col, label: cellLabel(role, place, n) }));
        add('r', 'rest', 0, 0, 0);
        return { cells, answerRow: KIOSK_QUOTIENT_ROW };
    }
    if (ex.operator === 'x') {
        const { digitCols, tdp, n } = mulLayout(ex, dp);
        const unitsCol = digitCols - tdp;
        const { ppStart, ppRows: pp, answer: answerRow } = kioskMulRows(ex, dp);
        // A product row right to left; after the digit of a step that carries, that carry in the row's
        // own carry cells right of the grid (the digit of multiplicand place p sits in column digitCols - 1 - r - p).
        // SYNC: CijferViewer MultiplicationGrid's key draws partialProducts[r] in row ppStart + r.
        const productRow = (r: number, key: (col: number) => string, role: CijferCellRole, row: number) => {
            const carries = mulCarries(ex, dp, r);
            for (let col = digitCols - 1; col >= 0; col--) {
                add(key(col), role, row, col + 1, unitsCol, role === 'pp' ? r : undefined);
                const i = carries.findIndex(c => c.from === digitCols - 1 - r - col);
                if (i >= 0) cells.push({ key: `c${r}_${i}`, role: 'carry', row, col: digitCols + 1 + MUL_CARRY_GAP + i, label: n === 1 ? `Onthouden ${i + 1}` : `Onthouden rij ${r + 1}, ${i + 1}` });
            }
        };
        // Row r holds the product by multiplier digit r from the units (checked in any order).
        for (let r = 0; r < pp; r++) productRow(r, col => `p${r}_${col}`, 'pp', ppStart + r);
        if (n === 1) productRow(0, col => `a${col}`, 'digit', answerRow);
        else for (let col = digitCols - 1; col >= 0; col--) add(`a${col}`, 'digit', answerRow, col + 1, unitsCol);
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

/** Whether a cell is off the keypad's path (tapped, skipped by Enter and auto-advance): an addition's
 *  carries and a subtraction's exchanged digits. A multiplication's carries are ON the path: the
 *  pupil writes the product digit, then the carry that step makes (right of the row). */
export function cijferScratch(ex: CijferExercise, key: string): boolean {
    return key[0] === 'b' || (key[0] === 'c' && ex.operator !== 'x');
}

/** The order the keypad and Enter walk the card's cells (the key order without the scratch cells). */
export function cijferFocusOrder(ex: CijferExercise, dp: number): string[] {
    return cijferKioskGrid(ex, dp).cells.map(c => c.key).filter(k => !cijferScratch(ex, k));
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
    // Which cells make up each part: one cell, or a whole partial-product row read as a number.
    parts: Array<{ cell: string } | { row: string[]; kind: 'pp' } | { rest: true }>;
    // The answer-row cells left to right and where its comma sits (stats text).
    answerCells: string[];
    answerInt: number;
}

/** What each part of a cijfer answer must hold. Add / sub: one part per cell in key order. Mul:
 *  the carries, then every partial product as a number (in any row order), then the answer digits.
 *  Div: every working cell in key order (quotient digits, products, differences, digits brought
 *  down), then the rest. */
export function cijferCheck(ex: CijferExercise, dp: number, strictCarries: boolean): CijferCheck {
    const { cells } = cijferKioskGrid(ex, dp);
    if (ex.operator === ':') {
        const wants = divCells(ex, dp, () => {});
        const work = cells.filter(c => c.role !== 'rest');
        const q = cells.filter(c => c.role === 'quotient').map(c => c.key);
        const { intEnd, qStart } = divPlan(ex, dp);
        return {
            wants: [...work.map(c => wants.get(c.key) ?? ''), plain(ex.remainder ?? 0)],
            parts: [...work.map(c => ({ cell: c.key })), { rest: true }],
            answerCells: q, answerInt: intEnd - qStart,
        };
    }
    if (ex.operator === 'x') {
        const { digitCols, tdp, partialProducts } = mulLayout(ex, dp);
        const maxInt = digitCols - tdp;
        const answer = digitWants(ex.answer, tdp, maxInt);
        const { ppRows: ppCount } = kioskMulRows(ex, dp);
        // c<r>_<i>: the i-th carry of multiplier digit r.
        const carryOf = (key: string) => {
            const [r, i] = key.slice(1).split('_').map(Number);
            return mulCarries(ex, dp, r)[i]?.value ?? 0;
        };
        const carryCells = cells.filter(c => c.role === 'carry');
        const ppRows = Array.from({ length: ppCount }, (_, r) => cells.filter(c => c.key.startsWith(`p${r}_`)).map(c => c.key).reverse());
        const answerCells = Array.from({ length: digitCols }, (_, col) => `a${col}`);
        return {
            wants: [
                ...carryCells.map(c => carryWant(carryOf(c.key), strictCarries)),
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

// A partial-product row of one-digit cells as the number it spells. Blanks may lead; trailing
// blanks are its shift zeros. A gap is no number ('?').
function readRow(values: string[]): string {
    const first = values.findIndex(v => v !== '');
    if (first < 0) return '';
    let last = values.length - 1;
    while (values[last] === '') last--;
    const body = values.slice(first, last + 1);
    if (body.some(v => !/^\d$/.test(v))) return '?';
    return body.join('') + '0'.repeat(values.length - 1 - last);
}

/** The pupil's parts from the filled cells (same order as wants); '' while no answer digit is written. */
export function cijferGiven(chk: CijferCheck, cellsOf: Record<string, string>): string[] | null {
    const v = (k: string) => (cellsOf[k] ?? '').trim();
    if (!chk.answerCells.some(k => v(k) !== '')) return null;
    const parts = chk.parts.map(p => {
        if ('cell' in p) return v(p.cell);
        if ('rest' in p) return v('r');
        // A blank partial-product row is a 0 (a multiplier digit 0 needs no row).
        return readRow(p.row.map(v)) || '0';
    });
    if (chk.parts.some(p => 'rest' in p) && v('r') === '') return null;
    // Partial products count in any row order, like the sorted wants.
    const pp = chk.parts.flatMap((p, i) => ('kind' in p ? [i] : []));
    const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : Infinity);
    const sorted = pp.map(i => parts[i]).sort((a, b) => (num(a) - num(b)) || 0);
    pp.forEach((i, j) => { parts[i] = sorted[j]; });
    return parts;
}
