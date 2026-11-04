// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { MathBlock } from '../services/math/types';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX, cellWidthPx } from '../components/viewer/BlockWidthContext';
import AfrondenViewer from '../components/viewer/AfrondenViewer';

// Viewer rule 1: the simpel column count follows the cell it is given (it was a fixed 2,
// which overflowed a half cell and pinned every simpel block to the full page).

afterEach(cleanup);

const simpel = (numbers: number[]): MathBlock => ({
    id: 'b', typeId: 'afronden', verticalSpacing: 14,
    constraints: { subType: 'simpel', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] },
    afrondenExercises: numbers.map((n, i) => ({ id: `e${i}`, number: n, targetKey: i % 2 ? 'T' : 'H', isManuallyEdited: false })),
} as unknown as MathBlock);

const gridAt = (width: number, block: MathBlock) =>
    render(<BlockWidthProvider value={width}>{<AfrondenViewer block={block} showSolutions={false} />}</BlockWidthProvider>)
        .container.querySelector<HTMLElement>('[data-cols]')!;

describe('afronden simpel columns', () => {
    const block = simpel([704, 41, 803, 545, 544, 497]);

    test('two per row at full width, marked as shrinking', () => {
        const grid = gridAt(FULL_BLOCK_WIDTH_PX, block);
        expect(grid.dataset.cols).toBe('2');
        expect(grid.dataset.shrinks).toBe('1');
    });

    test.each([2, 1])('one per row in a %i/4 cell', (units) => {
        const grid = gridAt(cellWidthPx(units, 16), block);
        expect(grid.dataset.cols).toBe('1');
        expect(grid.dataset.shrinks).toBeUndefined();
    });
});

// A whole rounded result in a decimal column keeps the column's decimals: 55,97 op t is
// "56,0", not "56" (the 97,05 wrong-key fix only fixed the rounding, not the printing).
describe('afronden decimal keys keep the target decimals', () => {
    const dec = (subType: string, numbers: number[], targets: string[]): MathBlock => ({
        id: 'b', typeId: 'afronden', verticalSpacing: 14,
        constraints: { subType, numberType: 'decimal', maxGetal: 100, decimalPlaces: 3, roundTargets: targets },
        afrondenExercises: subType === 'rooster'
            ? [{ id: 'e0', numbers, isManuallyEdited: false }]
            : numbers.map((n, i) => ({ id: `e${i}`, number: n, targetKey: targets[i % targets.length], isManuallyEdited: false })),
    } as unknown as MathBlock);
    const text = (block: MathBlock) =>
        render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>{<AfrondenViewer block={block} showSolutions />}</BlockWidthProvider>).container.textContent ?? '';

    test('rooster: t prints 56,0 and h prints 56,00; E stays 56', () => {
        const t = text(dec('rooster', [55.97, 55.999], ['E', 't', 'h']));
        expect(t).toContain('56,0');
        expect(t).toContain('56,00');
    });

    test('simpel: t prints 56,0', () => {
        expect(text(dec('simpel', [55.97], ['t']))).toContain('56,0');
    });
});
