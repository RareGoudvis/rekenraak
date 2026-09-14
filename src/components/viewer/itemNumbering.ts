import type { MathBlock } from '../../services/math/types';

export type ItemNumberingMode = MathBlock['itemNumbering'];

// Spreadsheet-style letters: a) … z) then aa), ab) … — a block of 30 exercises must not
// run out of labels, and repeating 'a)' halfway down would break the teacher's key.
function letters(index: number): string {
    let n = index;
    let out = '';
    do {
        out = String.fromCharCode(97 + (n % 26)) + out;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return out;
}

/** The printed label for exercise `index` (0-based), or null when numbering is off. */
export function itemLabel(mode: ItemNumberingMode, index: number): string | null {
    if (mode === 'cijfer') return `${index + 1})`;
    if (mode === 'letter') return `${letters(index)})`;
    return null;
}

// The label column is ONE width for the whole block (the longest label), so "1)" and "10)"
// still put the "=" of every row on the same x.
export function itemLabelChars(mode: ItemNumberingMode, count: number): number {
    if (count <= 0) return 0;
    const last = itemLabel(mode, count - 1);
    return last ? last.length : 0;
}
