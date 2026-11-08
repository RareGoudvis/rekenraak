// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { splittableCount, fittingSplitIndex } from '../services/layout/splitBlock';
import type { MathBlock } from '../services/math/types';

const block = (typeId: string, fields: Record<string, unknown> = {}) =>
    ({ id: 'b', typeId, constraints: {}, ...fields }) as unknown as MathBlock;

describe('splittableCount', () => {
    test('counts the registry exercise field', () => {
        expect(splittableCount(block('hr-std-optellen', { exercises: [1, 2, 3, 4] }))).toBe(4);
        expect(splittableCount(block('cijferen-optellen-nat', { cijferExercises: [1, 2] }))).toBe(2);
    });

    test('layout furniture, unknown types and missing arrays hold nothing', () => {
        expect(splittableCount(block('layout-sectie', { exercises: [1, 2, 3] }))).toBe(0);
        expect(splittableCount(block('does-not-exist', { exercises: [1, 2, 3] }))).toBe(0);
        expect(splittableCount(block('hr-std-optellen'))).toBe(0);
    });
});

// jsdom has no layout: rects are stubbed from a vertical stack (top offsets), so margins count.
function rect(el: HTMLElement, top: number, height: number) {
    el.getBoundingClientRect = () => ({ height, width: 0, top, left: 0, right: 0, bottom: top + height, x: 0, y: top, toJSON: () => ({}) });
}

// A cell of `rows` rows (`cls`), each `rowH` tall with `perRow` items and `gap` margin between
// them, below `chrome` px of title and padding.
function cell(rows: number, rowH: number, perRow: number, chrome: number, gap = 0, cls = 'print-row'): HTMLElement {
    const root = document.createElement('div');
    for (let r = 0; r < rows; r++) {
        const row = document.createElement('div');
        row.className = cls;
        for (let i = 0; i < perRow; i++) row.appendChild(document.createElement('span'));
        rect(row, chrome + r * (rowH + gap), rowH);
        root.appendChild(row);
    }
    rect(root, 0, chrome + rows * rowH + (rows - 1) * gap);
    return root;
}

describe('fittingSplitIndex', () => {
    test('counts the exercises of the whole rows that fit, chrome included', () => {
        // 40 chrome + 3 rows of 50 = 190 ≤ 200; the 4th row would need 240.
        expect(fittingSplitIndex(cell(5, 50, 2, 40), 200, 10, 1)).toBe(6);
    });

    test('divides rect heights back by the sheet zoom', () => {
        // Rects at zoom 0.5 are half size; divided back they match the unzoomed case.
        const c = cell(5, 25, 2, 20);
        expect(fittingSplitIndex(c, 200, 10, 0.5)).toBe(6);
    });

    test('a row with no children counts as one exercise', () => {
        expect(fittingSplitIndex(cell(4, 50, 0, 0), 120, 4, 1)).toBe(2);
    });

    test('row margins are not title height', () => {
        // 10 chrome, rows of 50 with 14 margin: bottoms at 60, 124, 188, 252. 200 fits three rows.
        expect(fittingSplitIndex(cell(5, 50, 1, 10, 14), 200, 10, 1)).toBe(3);
        // Margin-as-title would have read 10 + 4*14 = 66 chrome and fitted only 2 rows.
    });

    test('falls back to .print-exercise when there are no rows', () => {
        expect(fittingSplitIndex(cell(5, 50, 3, 10, 0, 'print-exercise'), 120, 5, 1)).toBe(2);
    });

    test('null when the DOM says nothing useful', () => {
        expect(fittingSplitIndex(cell(1, 50, 4, 0), 1000, 4, 1)).toBeNull();      // one row
        expect(fittingSplitIndex(cell(5, 50, 2, 0), 0, 10, 1)).toBeNull();        // no room measured
        expect(fittingSplitIndex(cell(5, 50, 2, 0), NaN, 10, 1)).toBeNull();
        expect(fittingSplitIndex(cell(5, 50, 2, 0), 1000, 10, 1)).toBeNull();     // everything fits
        expect(fittingSplitIndex(cell(5, 50, 2, 100), 120, 10, 1)).toBeNull();    // not even one row
    });
});
