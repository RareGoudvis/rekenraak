// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BlockWidthProvider, cellWidthPx } from '../components/viewer/BlockWidthContext';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
import EvenOnevenViewer from '../components/viewer/EvenOnevenViewer';
import { monoTextPx } from '../services/layout/blockLayout';
import type { MathBlock, GetallenasExercise } from '../services/math/types';

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
