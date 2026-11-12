// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { Equation, MathBlock } from '../services/math/types';

// The answer key's worked steps (Part B): only with solutions on and the block's setting on;
// the pupil's sheet and a key with the setting off render exactly as before.

afterEach(cleanup);

const eq = (id: string, a: number, b: number): Equation =>
    ({ id, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false } as Equation);

const block = (solutionSteps?: string): MathBlock => ({
    ...makeBlock('hr-std-optellen', { id: 'opt', constraints: { maxGetal: 1000, ...(solutionSteps ? { solutionSteps } : {}) } }),
    exercises: [eq('a', 475, 368), eq('b', 47, 8)],
});
const html = (b: MathBlock, showSolutions: boolean) => render(
    <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
        <MathBlockRenderer block={b} showSolutions={showSolutions} />
    </BlockWidthProvider>,
).container;
const text = (c: HTMLElement) => (c.textContent ?? '').replace(/\s+/g, ' ');

describe('answer key with worked steps', () => {
    test('Basis prints the owner\'s kept lines under 475 + 368', () => {
        const t = text(html(block('basis'), true));
        expect(t).toContain('=(475 + 300) + 60 + 8');
        expect(t).toContain('=(775 + 30) + 30 + 8');
        expect(t).toContain('=(835 + 5) + 3');
        expect(t).not.toContain('805 + 30 + 8');
    });

    test('Alle adds the optional lines', () => {
        const t = text(html(block('alle'), true));
        expect(t).toContain('=805 + 30 + 8');
        expect(t).toContain('=840 + 3');
    });

    test('a sum without a strategy keeps its plain answer', () => {
        expect(text(html(block('basis'), true))).toContain('=55');
    });

    test('the pupil sheet and a key with the setting off are unchanged', () => {
        const plainSheet = html(block(), false).innerHTML;
        cleanup();
        expect(html(block('alle'), false).innerHTML).toBe(plainSheet);
        cleanup();
        const plainKey = html(block(), true).innerHTML;
        cleanup();
        expect(html(block('uit'), true).innerHTML).toBe(plainKey);
    });
});
