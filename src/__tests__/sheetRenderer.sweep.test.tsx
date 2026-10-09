// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { Equation, MathBlock } from '../services/math/types';

// Clean sweep S2: sheet-renderer fixes, each one a repro from BUGS.md.

afterEach(cleanup);

const eq = (id: string, a: number, b: number, operator: '+' | '-'): Equation => ({
    id, operands: [a, b], operator, answer: operator === '+' ? a + b : a - b, isManuallyEdited: false,
});

function renderHr(block: MathBlock, showSolutions: boolean) {
    return render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <MathBlockRenderer block={block} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    ).container;
}

// The tussenstap row is the one that starts "= <first operand> −/+".
const tussenstappen = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll<HTMLElement>('div'))
        .filter(d => d.style.whiteSpace === 'nowrap' && d.children.length === 6)
        .map(d => (d.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('compenseren tussenstap follows the exercise, not the stored preset', () => {
    // The relax ladder dropped the preset ("versoepeld: strategie"): the block still says
    // compenseren, but these exercises were drawn plain.
    const block = (exercises: Equation[]): MathBlock => ({
        ...makeBlock('hr-std-aftrekken', { id: 'comp', constraints: { numberType: 'natural', preset: 'compenseren', maxGetal: 1000 } }),
        exercises,
    });

    test('a plain exercise under a dropped preset gets no scaffold (385 − 30, 230 − 14)', () => {
        const c = renderHr(block([eq('a', 385, 30, '-'), eq('b', 230, 14, '-')]), true);
        expect(tussenstappen(c)).toEqual([]);
    });

    test('a compenseren-shaped exercise keeps its tussenstap (385 − 29 = 385 − 30 + 1)', () => {
        const c = renderHr(block([eq('a', 385, 29, '-'), eq('b', 512, 98, '-'), eq('c', 47, 18, '+')]), true);
        expect(tussenstappen(c)).toEqual(['=385−30+1', '=512−100+2', '=47+20−2']);
    });

    test('the scaffold hides with the setting off', () => {
        const b = block([eq('a', 385, 29, '-')]);
        const c = renderHr({ ...b, constraints: { ...b.constraints, compenserenScaffold: 'geen' } }, true);
        expect(tussenstappen(c)).toEqual([]);
    });
});
