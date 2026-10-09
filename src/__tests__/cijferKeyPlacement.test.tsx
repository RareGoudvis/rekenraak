// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import CijferViewer from '../components/viewer/CijferViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { cijferCheck, cijferKioskGrid } from '../services/cijferen/cijferCells';
import type { CijferExercise, MathBlock } from '../services/math/types';

// WHERE the answer key's red digits sit, not just which: a carry over the column it goes INTO
// (where a pupil writes it), and the partial products units-first, both as the kiosk reads them.

afterEach(cleanup);

function exOf(operator: CijferExercise['operator'], operands: number[], answer: number, dp = 0): CijferExercise {
    return { id: 'ex1', operands, operator, answer, remainder: 0, isManuallyEdited: false, decimalPlaces: dp };
}

function renderKey(typeId: string, ex: CijferExercise, scaffolding: number): HTMLElement {
    const block: MathBlock = {
        ...makeBlock(typeId, { id: 'b1', constraints: { operator: ex.operator, numberType: ex.decimalPlaces ? 'decimal' : 'natural', decimalPlaces: ex.decimalPlaces || 2, scaffolding } }),
        numberOfExercises: 1,
        cijferExercises: [ex],
    };
    return render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <CijferViewer block={block} showSolutions />
        </BlockWidthProvider>,
    ).container;
}

interface RedDigit { char: string; col: number; row: number; small: boolean }

// The red grid digits with their grid column / row (one DC is one cell wide and tall).
function redDigits(container: HTMLElement): RedDigit[] {
    const els = Array.from(container.querySelectorAll<HTMLElement>('div[style*="--ink-solution"]')).filter(el => el.style.position === 'absolute');
    const cell = Math.max(...els.map(el => parseFloat(el.style.width)));
    return els.map(el => ({
        char: el.textContent ?? '',
        col: Math.round(parseFloat(el.style.left) / cell),
        row: Math.round(parseFloat(el.style.top) / cell),
        small: parseFloat(el.style.fontSize) < cell * 0.6,
    }));
}

const ADD_CASES: Array<[string, CijferExercise]> = [
    ['525 + 445', exOf('+', [525, 445], 970)],
    ['999 + 1', exOf('+', [999, 1], 1000)],
    ['486 + 275 + 139', exOf('+', [486, 275, 139], 900)],
    ['12,50 + 3,75', exOf('+', [12.5, 3.75], 16.25, 2)],
    ['7,8 + 5,46', exOf('+', [7.8, 5.46], 13.26, 2)],
];

describe('cijferen optellen key: the carry sits over the column it goes into', () => {
    for (const scaffolding of [1, 2, 3]) {
        test(`525 + 445, scaffolding ${scaffolding}: the 1 is over the T (grid col 2), not the E`, () => {
            const carries = redDigits(renderKey('cijferen-optellen-nat', ADD_CASES[0][1], scaffolding)).filter(d => d.small);
            expect(carries.map(d => [d.char, d.col])).toEqual([['1', 2]]);
        });
    }

    for (const [name, ex] of ADD_CASES) {
        test(`${name}: the sheet's carries are the kiosk's carry cells`, () => {
            const dp = ex.decimalPlaces ?? 0;
            const sheet = redDigits(renderKey(ex.decimalPlaces ? 'cijferen-optellen-dec' : 'cijferen-optellen-nat', ex, 1))
                .filter(d => d.small).map(d => `${d.col}:${d.char}`).sort();
            const { cells } = cijferKioskGrid(ex, dp);
            const { wants } = cijferCheck(ex, dp, true);
            const kiosk = cells.map((c, i) => ({ c, want: wants[i] }))
                .filter(({ c, want }) => c.role === 'carry' && !want.startsWith('|'))
                .map(({ c, want }) => `${c.col}:${want}`).sort();
            expect(sheet).toEqual(kiosk);
        });
    }
});
