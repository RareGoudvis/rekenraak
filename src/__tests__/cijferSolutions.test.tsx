// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import CijferViewer from '../components/viewer/CijferViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { CijferExercise, MathBlock } from '../services/math/types';

// The answer key must fill the grid at every scaffolding level: the default "Lege ruitjes" (3)
// and "Structuur zonder getallen" (2) used to print a blank key. Expected digits worked out by hand.

afterEach(cleanup);

interface Case {
    typeId: string; operator: '+' | '-' | 'x' | ':'; numberType: 'natural' | 'decimal';
    operands: number[]; answer: number; remainder?: number; dp: number;
    // The red digits in the grid, in DOM order (answer, then carries / partial products, then answer).
    gridKey: string;
}

const CASES: Case[] = [
    // 116 + 325: answer 441, one carry out of the units
    { typeId: 'cijferen-optellen-nat', operator: '+', numberType: 'natural', operands: [116, 325], answer: 441, dp: 0, gridKey: '4411' },
    // 12,50 + 3,75: answer 16,25, one carry out of the tenths (5 + 7)
    { typeId: 'cijferen-optellen-dec', operator: '+', numberType: 'decimal', operands: [12.5, 3.75], answer: 16.25, dp: 2, gridKey: '16251' },
    { typeId: 'cijferen-aftrekken-nat', operator: '-', numberType: 'natural', operands: [865, 497], answer: 368, dp: 0, gridKey: '368' },
    { typeId: 'cijferen-aftrekken-dec', operator: '-', numberType: 'decimal', operands: [86.5, 49.7], answer: 36.8, dp: 1, gridKey: '368' },
    // 23 × 45: partial products 115 and 920, answer 1035
    { typeId: 'cijferen-vermenigvuldigen-nat', operator: 'x', numberType: 'natural', operands: [23, 45], answer: 1035, dp: 0, gridKey: '1159201035' },
    // 2,3 × 4,5 (scaled 23 × 45): same partial products, answer 10,35
    { typeId: 'cijferen-vermenigvuldigen-dec', operator: 'x', numberType: 'decimal', operands: [2.3, 4.5], answer: 10.35, dp: 1, gridKey: '1159201035' },
    // 863 : 7 = 123 r 2; the quotient sits right-aligned under the divisor box
    { typeId: 'cijferen-delen-nat', operator: ':', numberType: 'natural', operands: [863, 7], answer: 123, remainder: 2, dp: 0, gridKey: '123' },
    { typeId: 'cijferen-delen-dec', operator: ':', numberType: 'decimal', operands: [100, 7], answer: 14.28, remainder: 0.04, dp: 2, gridKey: '1428' },
];

function renderCase(cs: Case, scaffolding: number, showSolutions: boolean) {
    const ex: CijferExercise = {
        id: 'ex1', operands: cs.operands, operator: cs.operator, answer: cs.answer,
        remainder: cs.remainder ?? 0, isManuallyEdited: false, decimalPlaces: cs.dp,
    };
    const block: MathBlock = {
        ...makeBlock(cs.typeId, { id: 'b1', constraints: { operator: cs.operator, numberType: cs.numberType, decimalPlaces: cs.dp, scaffolding } }),
        numberOfExercises: 1,
        cijferExercises: [ex],
    };
    const { container } = render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <CijferViewer block={block} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    );
    return container;
}

// Grid digits are absolutely placed divs; the q/r box and the header are spans / plain text.
function redGridDigits(container: HTMLElement): string {
    return Array.from(container.querySelectorAll<HTMLElement>('div[style*="--ink-solution"]'))
        .filter(el => el.style.position === 'absolute')
        .map(el => el.textContent)
        .join('');
}

describe('cijferen answer key in the grid', () => {
    for (const cs of CASES) {
        for (const scaffolding of [1, 2, 3]) {
            test(`${cs.typeId} scaffolding ${scaffolding}: red digits with Oplossingen, none without`, () => {
                expect(redGridDigits(renderCase(cs, scaffolding, true))).toBe(cs.gridKey);
                cleanup();
                expect(redGridDigits(renderCase(cs, scaffolding, false))).toBe('');
            });
        }
    }
});
