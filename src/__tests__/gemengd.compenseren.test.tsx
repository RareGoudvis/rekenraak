// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { Equation, MathBlock } from '../services/math/types';

// BUGS (S2 2026-10-10): hr-std-gemengd has no top-level `preset`, so its compenseren variants
// never drew the tussenstap. The variant carries the preset; only its own rows get the hint.

afterEach(cleanup);

const eq = (id: string, a: number, b: number, operator: '+' | '-' | 'x', variant: string): Equation => ({
    id, operands: [a, b], operator, variant, isManuallyEdited: false,
    answer: operator === '+' ? a + b : operator === '-' ? a - b : a * b,
} as Equation);

// The tussenstap row is the one that starts "= <first operand> −/+" (SYNC: sheetRenderer.sweep.test).
const tussenstappen = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll<HTMLElement>('div'))
        .filter(d => d.style.whiteSpace === 'nowrap' && d.children.length === 6)
        .map(d => (d.textContent ?? '').replace(/\s+/g, ' ').trim());

const block = (exercises: Equation[], extra: Record<string, unknown> = {}): MathBlock => ({
    ...makeBlock('hr-std-gemengd', { id: 'mix', constraints: { variants: ['-:compenseren', '-', 'x'], maxGetal: 1000, ...extra } }),
    exercises,
});
const renderHr = (b: MathBlock) => render(
    <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
        <MathBlockRenderer block={b} showSolutions />
    </BlockWidthProvider>,
).container;

// Every row is compenseren-SHAPED (second operand 1-2 under a round number); the variant decides.
const ROWS = [
    eq('a', 385, 29, '-', '-:compenseren'),
    eq('b', 512, 98, '-', '-'),
    eq('c', 6, 19, 'x', 'x'),
    eq('d', 47, 18, '-', '-:compenseren'),
];

describe('gemengd: the compenseren tussenstap on its own rows only', () => {
    test('a compenseren − variant draws it; the plain − and the × rows do not', () => {
        expect(tussenstappen(renderHr(block(ROWS)))).toEqual(['=385−30+1', '=47−20+2']);
    });
    test('the variant tab set to "Enkel antwoord" hides it', () => {
        const c = renderHr(block(ROWS, { perVariant: { '-:compenseren': { compenserenScaffold: 'geen' } } }));
        expect(tussenstappen(c)).toEqual([]);
    });
    test('no compenseren variant chosen: none, whatever the shapes', () => {
        const c = renderHr(block(ROWS.map(r => ({ ...r, variant: r.operator })), { variants: ['-', 'x'] }));
        expect(tussenstappen(c)).toEqual([]);
    });
});
