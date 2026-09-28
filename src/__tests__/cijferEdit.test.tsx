// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import { useWorksheetStore } from '../store/useWorksheetStore';
import CijferViewer from '../components/viewer/CijferViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { CijferExercise, MathBlock } from '../services/math/types';

// A teacher clicks a staartdeling header, types new operands and presses Enter: the stored
// key must be the long-division answer (quotient cut off after dp decimals, true rest),
// the same as a generated exercise — expected values are worked out by hand below.

afterEach(() => { cleanup(); useWorksheetStore.getState().clearBlocks(); });

function editDivision(dp: number, dividend: string, divisor: string): CijferExercise {
    const ex: CijferExercise = {
        id: 'ex1', operands: [100, 7], operator: ':', answer: 14.28, remainder: 0.04,
        isManuallyEdited: false, decimalPlaces: dp,
    };
    const block: MathBlock = {
        ...makeBlock('cijferen-delen-dec', { id: 'b1', constraints: { operator: ':', numberType: 'decimal', decimalPlaces: dp } }),
        numberOfExercises: 1,
        cijferExercises: [ex],
    };
    useWorksheetStore.setState({ blocks: [block] });

    render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <CijferViewer block={block} showSolutions />
        </BlockWidthProvider>,
    );
    fireEvent.click(screen.getByTitle('Klik om te bewerken'));
    const inputs = document.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(2);
    fireEvent.change(inputs[0], { target: { value: dividend } });
    fireEvent.change(inputs[1], { target: { value: divisor } });
    fireEvent.keyDown(inputs[1], { key: 'Enter' });

    const stored = useWorksheetStore.getState().blocks[0].cijferExercises![0];
    expect(stored.isManuallyEdited).toBe(true);
    return stored;
}

describe('an edited decimal division recomputes like the generator', () => {
    test('495 : 80 at dp 2 → q 6,18 r 0,60 (6,18 × 80 = 494,40)', () => {
        const ex = editDivision(2, '495', '80');
        expect(ex.operands).toEqual([495, 80]);
        expect(ex.answer).toBe(6.18);
        expect(ex.remainder).toBe(0.6);
    });

    test('394 : 55 at dp 1 → q 7,1 r 3,5 (7,1 × 55 = 390,5)', () => {
        const ex = editDivision(1, '394', '55');
        expect(ex.answer).toBe(7.1);
        expect(ex.remainder).toBe(3.5);
    });

    test('40 : 6 at dp 2 → q 6,66 r 0,04 (6,66 × 6 = 39,96), not rounded up to 6,67', () => {
        const ex = editDivision(2, '40', '6');
        expect(ex.answer).toBe(6.66);
        expect(ex.remainder).toBe(0.04);
    });
});
