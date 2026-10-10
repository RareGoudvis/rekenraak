// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BlockWidthProvider, cellWidthPx } from '../components/viewer/BlockWidthContext';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
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

