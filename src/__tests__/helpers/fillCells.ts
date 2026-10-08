import type { CijferExercise } from '../../services/math/types';
import { INTERACT_SEP, type KioskDescriptor } from '../../services/oefenen/types';

// Phase C2 (fill-cells): what a pupil types into the card's cells, written from the exercise
// itself and not from the descriptor's answerOf, so the suites check the descriptor against it.
// Cell keys follow each viewer's convention (cijferCells.ts for cijferen).

export type Cells = Record<string, string>;

const scaledDigits = (x: number, dp: number, width: number) =>
    String(Math.round(Math.abs(x) * 10 ** dp)).padStart(width, '0').split('').map(Number);

// Decimals a number really has (0,30 → 1).
const decimalsOf = (x: number) => (String(Number(x.toFixed(9))).split('.')[1] ?? '').length;

// Right-aligns `digits` into the cells `keys` (left to right); the cells before stay blank.
function rightAlign(keys: string[], digits: string): Cells {
    const out: Cells = {};
    keys.forEach((k, i) => { out[k] = digits[i - (keys.length - digits.length)] ?? ''; });
    return out;
}

// The digits of a column answer as written: no leading zeros before the units, decimals in full.
function writtenDigits(x: number, dp: number): string {
    const [int, dec = ''] = Math.abs(x).toFixed(dp).split('.');
    return String(Number(int)) + dec;
}

const keysOf = (keys: string[], prefix: string) => keys.filter(k => k.startsWith(prefix))
    .sort((a, b) => Number(a.slice(prefix.length).split('_').pop()) - Number(b.slice(prefix.length).split('_').pop()));

export interface CijferFill {
    // Answer digits only (carries blank).
    answer: Cells;
    // The carries / exchanged digits a pupil writes (right values; blank where none).
    scratch: Cells;
    // Another right way to write it (partial products in the other row order, a left-aligned quotient).
    alt?: Cells;
}

/** The right cells of a cijfer exercise, from its own numbers. */
export function cijferFill(ex: CijferExercise, keys: string[]): CijferFill {
    const dp = ex.decimalPlaces ?? 0;
    const [a, b] = ex.operands;
    if (ex.operator === ':') {
        const q = keysOf(keys, 'q');
        const qInt = q.length - dp;
        const [int, dec = ''] = ex.answer.toFixed(dp).split('.');
        const intDigits = String(Number(int));
        const right = { ...rightAlign(q.slice(0, qInt), intDigits), ...Object.fromEntries(q.slice(qInt).map((k, i) => [k, dec[i] ?? ''])) };
        const left = { ...Object.fromEntries(q.slice(0, qInt).map((k, i) => [k, intDigits[i] ?? ''])), ...Object.fromEntries(q.slice(qInt).map((k, i) => [k, dec[i] ?? ''])) };
        const r = String(Number(ex.remainder.toFixed(9))).replace('.', ',');
        return { answer: { ...right, r }, scratch: {}, alt: { ...left, r } };
    }
    const ans = keysOf(keys, 'a');
    const D = ans.length;
    if (ex.operator === 'x') {
        const mdp = decimalsOf(b);
        const answer = rightAlign(ans, writtenDigits(ex.answer, dp + mdp));
        const mc = Math.round(a * 10 ** dp);
        const mDigits = String(Math.round(b * 10 ** mdp)).split('').reverse().map(Number);
        const rows = [...new Set(keys.filter(k => k.startsWith('p')).map(k => k.split('_')[0]))].sort();
        const pps = mDigits.map((d, shift) => String(mc * d * 10 ** shift));
        const ppCells = (order: string[]) => Object.assign({}, ...rows.map((row, r) => rightAlign(keysOf(keys, `${row}_`), order[r])));
        const scratch: Cells = {};
        if (mDigits.length === 1) {
            // Carry into each multiplicand digit, units first; the cell sits above that digit.
            let carry = 0;
            String(mc).split('').reverse().map(Number).forEach((d, p) => {
                if (p > 0 && keys.includes(`c${D - 1 - p}`)) scratch[`c${D - 1 - p}`] = carry ? String(carry) : '';
                carry = Math.floor((d * mDigits[0] + carry) / 10);
            });
        }
        return rows.length
            ? { answer: { ...answer, ...ppCells(pps) }, scratch, alt: { ...answer, ...ppCells([...pps].reverse()) } }
            : { answer, scratch };
    }
    const answer = rightAlign(ans, writtenDigits(ex.answer, dp));
    const tops = ex.operands.map(o => scaledDigits(o, dp, D));
    const scratch: Cells = {};
    if (ex.operator === '+') {
        let carry = 0;
        for (let col = D - 1; col > 0; col--) {
            carry = Math.floor((tops.reduce((s, t) => s + t[col], 0) + carry) / 10);
            scratch[`c${col - 1}`] = carry ? String(carry) : '';
        }
    } else {
        // Exchange a ten from the left whenever the top digit is too small; zeros pass it on as 9.
        const top = [...tops[0]], bottom = tops[1];
        const changed = top.map(() => false);
        for (let col = D - 1; col >= 0; col--) {
            if (top[col] >= bottom[col]) continue;
            let j = col - 1;
            while (top[j] === 0) j--;
            top[j]--; changed[j] = true;
            for (let k = j + 1; k < col; k++) { top[k] = 9; changed[k] = true; }
            top[col] += 10; changed[col] = true;
        }
        top.forEach((v, col) => { scratch[`b${col}`] = changed[col] ? String(v) : ''; });
    }
    return { answer, scratch };
}

/** One part per cell in key order (most viewers): the cells are the answer's first spellings. */
export function cellsFromParts(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): Cells {
    const ia = d.interact!;
    const keys = ia.keys!(ex, c);
    const parts = ia.answerOf(ex, c).split(INTERACT_SEP);
    return Object.fromEntries(keys.map((k, i) => [k, (parts[i] ?? '').split('|')[0]]));
}

/** The right cells for the exercise on a card: cijferen from its numbers, the rest part by part. */
export function rightCells(typeId: string, d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): Cells {
    if (typeId.startsWith('cijferen-')) return cijferFill(ex as CijferExercise, d.interact!.keys!(ex, c)).answer;
    return cellsFromParts(d, ex, c);
}
