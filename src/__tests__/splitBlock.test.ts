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

// jsdom has no layout: every element gets a stubbed rect height instead.
function sized<T extends HTMLElement>(el: T, height: number): T {
    el.getBoundingClientRect = () => ({ height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) });
    return el;
}

// A cell of `rows` .print-row rows, each `rowH` tall with `perRow` items, plus `chrome` px
// of title and padding around them.
function cell(rows: number, rowH: number, perRow: number, chrome: number): HTMLElement {
    const root = document.createElement('div');
    for (let r = 0; r < rows; r++) {
        const row = sized(document.createElement('div'), rowH);
        row.className = 'print-row';
        for (let i = 0; i < perRow; i++) row.appendChild(document.createElement('span'));
        root.appendChild(row);
    }
    return sized(root, rows * rowH + chrome);
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

    test('null when the DOM says nothing useful', () => {
        expect(fittingSplitIndex(cell(1, 50, 4, 0), 1000, 4, 1)).toBeNull();      // one row
        expect(fittingSplitIndex(cell(5, 50, 2, 0), 0, 10, 1)).toBeNull();        // no room measured
        expect(fittingSplitIndex(cell(5, 50, 2, 0), NaN, 10, 1)).toBeNull();
        expect(fittingSplitIndex(cell(5, 50, 2, 0), 1000, 10, 1)).toBeNull();     // everything fits
        expect(fittingSplitIndex(cell(5, 50, 2, 100), 120, 10, 1)).toBeNull();    // not even one row
    });
});
