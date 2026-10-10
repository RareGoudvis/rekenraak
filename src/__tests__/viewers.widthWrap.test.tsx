// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BlockWidthProvider, cellWidthPx } from '../components/viewer/BlockWidthContext';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
import EvenOnevenViewer from '../components/viewer/EvenOnevenViewer';
import PatroonViewer from '../components/viewer/PatroonViewer';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import { monoTextPx } from '../services/layout/blockLayout';
import { formatMathNumber } from '../services/math/formatters';
import type { MathBlock, GetallenasExercise, HerleidingExercise } from '../services/math/types';

// Sweep S5 (width & wrap): jsdom has no layout, so these read the px the viewers put in
// their inline styles and check them against the glyph-advance estimate the viewers share.

afterEach(cleanup);

const W = { full: 688, half: cellWidthPx(2, 28), quarter: cellWidthPx(1, 28) };
const at = (width: number, el: ReactElement) => render(<BlockWidthProvider value={width}>{el}</BlockWidthProvider>);
const px = (v: string | undefined) => Number.parseFloat(v ?? '0');

describe('getallenas: the outer tick labels stay inside the axis box', () => {
    const ex = (values: number[]): GetallenasExercise => ({
        id: 'g1', start: values[0], step: values[1] - values[0], tickCount: values.length,
        blankMask: values.map(() => false), direction: 'right', values, numberType: 'natural', isManuallyEdited: false,
    });
    test.each([
        ['six ticks at 1e5', [99_000, 99_200, 99_400, 99_600, 99_800, 100_000]],
        ['ten ticks at 1e5', Array.from({ length: 10 }, (_, i) => 90_000 + i * 1_000)],
    ])('%s', (_n, values) => {
        const block = { id: 'b', typeId: 'getallenas', getallenasExercises: [ex(values)] } as unknown as MathBlock;
        const { container } = at(W.full, <GetallenasViewer block={block} showSolutions={false} />);
        const box = container.querySelector('.print-exercise > div') as HTMLElement;
        const boxW = px(box.style.width);
        expect(boxW).toBeLessThanOrEqual(W.full);
        const labels = [...box.querySelectorAll(':scope > div')] as HTMLElement[];
        for (const l of labels) {
            const span = l.querySelector('span') as HTMLElement;
            const half = monoTextPx(span.textContent!.length, 1, px(span.style.fontSize)) / 2;
            expect(px(l.style.left) - half).toBeGreaterThanOrEqual(0);
            expect(px(l.style.left) + half).toBeLessThanOrEqual(boxW);
        }
    });
});

// `calc(var(--sheet-size-math) * f [- 1px])` at the 13pt default; jsdom does not resolve calc.
const MATH_PX = 17.333;
const mathCalcPx = (css: string) => {
    const m = /^calc\(var\(--sheet-size-math\) \* ([\d.]+)(?: - (\d+)px)?\)$/.exec(css.trim());
    if (!m) throw new Error(`not a math-token length: ${css}`);
    return Number(m[1]) * MATH_PX - Number(m[2] ?? 0);
};

describe('even-oneven rooster: cells hold their number on one line and share borders', () => {
    test.each([[[7, 42, 365]], [[1_234, 9_029, 10_000]]])('%j', (numbers) => {
        const block = { id: 'b', typeId: 'even-oneven', constraints: { subType: 'rooster', perRow: 10 }, evenOnevenExercises: [{ id: 'e', numbers }] } as unknown as MathBlock;
        const { container } = at(W.full, <EvenOnevenViewer block={block} showSolutions={false} />);
        const grid = container.querySelector('.print-exercise') as HTMLElement;
        const cells = [...grid.children] as HTMLElement[];
        const chars = Math.max(...cells.map(c => c.textContent!.length));
        for (const cell of cells) {
            expect(cell.style.whiteSpace).toBe('nowrap');
            // border 2 + a little air around the widest number at the cell's 0.81 factor
            expect(mathCalcPx(cell.style.width)).toBeGreaterThanOrEqual(monoTextPx(chars, 0.81, MATH_PX) + 2);
            expect(cell.style.marginLeft === '' || cell.style.marginLeft === '0px').toBe(true);
        }
        // One track per cell, one px narrower than the cell: neighbours overlap on the shared border.
        const track = /repeat\(\d+, (.+)\)$/.exec(grid.style.gridTemplateColumns)![1];
        expect(mathCalcPx(track)).toBeCloseTo(mathCalcPx(cells[0].style.width) - 1, 3);
    });
});

describe('getalpatronen: terms never break and the row fits its column', () => {
    const block = (values: number[][], c: Record<string, unknown> = {}) => ({
        id: 'b', typeId: 'getalpatronen', constraints: c,
        patroonExercises: values.map((v, i) => ({ id: `p${i}`, values: v, blankMask: v.map((_, j) => j >= v.length - 2), cycle: [{ op: '+', operand: 10 }], isManuallyEdited: false })),
    }) as unknown as MathBlock;
    // The row's own font factor, from the grid's `calc(var(--sheet-size-math) * f)`.
    const factorOf = (el: HTMLElement) => Number(/\* ([\d.]+)\)/.exec(el.style.fontSize)![1]);
    test.each([
        ['five-digit terms, 6 ticks', [[97_055, 97_065, 97_075, 97_085, 97_095, 97_105]], W.full],
        ['four-digit terms, 6 ticks, half', [[9_055, 9_065, 9_075, 9_085, 9_095, 9_105]], W.half],
        ['five-digit terms, 10 ticks', [Array.from({ length: 10 }, (_, i) => 90_005 + 1_000 * i)], W.full],
    ])('%s', (_n, values, width) => {
        const { container } = at(width, <PatroonViewer block={block(values)} showSolutions />);
        const row = container.querySelector('.print-exercise') as HTMLElement;
        const f = factorOf(row);
        const chars = Math.max(...values.flat().map(v => formatMathNumber(v).length));
        const numberCells = [...row.children].filter((_, i) => i % 2 === 0) as HTMLElement[];
        for (const cell of numberCells) expect(cell.style.whiteSpace).toBe('nowrap');
        // Track minimums: every number track holds the widest term at the row's factor ...
        const mins = [...row.style.gridTemplateColumns.matchAll(/minmax\(([\d.]+)px/g)].map(m => Number(m[1]));
        expect(mins.length).toBe(values[0].length * 2 - 1);
        expect(mins[0]).toBeGreaterThanOrEqual(monoTextPx(chars, f, MATH_PX));
        // ... and the whole row, gaps included, fits the column.
        const gaps = (mins.length - 1) * px(row.style.columnGap);
        expect(mins.reduce((a, b) => a + b, 0) + gaps).toBeLessThanOrEqual(width);
    });
    test('negative terms are separated by a semicolon, with a true minus', () => {
        const { container } = at(W.full, <PatroonViewer block={block([[-53, -43, -33, -23]])} showSolutions />);
        const text = container.textContent!;
        expect(text).not.toContain('–');
        expect(text).toContain('−53;');
        expect(text).not.toMatch(/-\d/);
    });
    test('a block without negatives keeps the dash (the plain-dash default)', () => {
        const { container } = at(W.full, <PatroonViewer block={block([[3, 13, 23]])} showSolutions />);
        expect(container.textContent).toContain('–');
    });
});

describe('herleidingen: a number never breaks, the row steps its font to fit', () => {
    const block = (ex: Partial<HerleidingExercise>, c: Record<string, unknown> = {}) => ({
        id: 'b', typeId: 'herleidingen', constraints: { measure: 'oppervlakte', ...c },
        herleidingExercises: [{ id: 'h1', format: 'enkel-getal', isManuallyEdited: false, ...ex }],
    }) as unknown as MathBlock;
    const factorOf = (el: HTMLElement) => Number(/\* ([\d.]+)\)/.exec(el.style.fontSize)![1]);
    // Every number/unit pair sits in one nowrap span; the row wraps between pairs only.
    const pairsNowrap = (root: HTMLElement) => {
        const nums = [...root.querySelectorAll('span')].filter(s => s.children.length === 0 && /^\d{1,3}( \d{3})+$/.test(s.textContent ?? ''));
        expect(nums.length).toBeGreaterThan(0);
        for (const n of nums) expect(n.closest('span[style*="nowrap"]')).not.toBeNull();
    };
    test('the red answer "977 000 445" stays whole', () => {
        const { container } = at(W.full, <HerleidingenViewer block={block({ fromParts: [{ key: 'a', value: 977 }, { key: 'cm²', value: 445 }], toParts: [{ key: 'cm²', value: 977_000_445 }], blank: 'number' })} showSolutions />);
        pairsNowrap(container);
    });
    test.each([[W.full, 0.92], [340, 0.85]])('a long given number on the answer side at %ipx', (width, maxFactor) => {
        const { container } = at(width, <HerleidingenViewer block={block({ fromParts: [{ key: 'ha', value: 24 }], toParts: [{ key: 'dm²', value: 24_000_000_000 }], blank: 'unit' })} showSolutions={false} />);
        pairsNowrap(container);
        const row = container.querySelector('.print-exercise') as HTMLElement;
        expect(factorOf(row)).toBeLessThanOrEqual(maxFactor);
        if (width === W.full) expect(factorOf(row)).toBe(0.92);
    });
});
