// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX, ScaffoldProvider, cellWidthPx } from '../components/viewer/BlockWidthContext';
import { hrRowLayout, hrRowStats, metRestKladLayout } from '../services/layout/hrRowLayout';
import type { Equation, MathBlock } from '../services/math/types';

// Delen met rest: the kladlijn for the deler's multiples (off unless asked, red on the key, inside every
// cell width), the key's worked steps under a rest row.

afterEach(cleanup);

const rest = (id: string, a: number, d: number): Equation =>
    ({ id, operands: [a, d], operator: ':', answer: Math.floor(a / d), remainder: a % d, isManuallyEdited: false });
const block = (extra: Record<string, unknown> = {}): MathBlock => ({
    ...makeBlock('hr-std-delen', { id: 'del', constraints: { multiplicationMode: 'met_rest', selectedTables: [6, 3], ...extra } }),
    exercises: [rest('a', 55, 6), rest('b', 235, 3)],
});
const html = (b: MathBlock, showSolutions: boolean, width = FULL_BLOCK_WIDTH_PX, scaffold = true) => render(
    <ScaffoldProvider value={scaffold}>
        <BlockWidthProvider value={width}>
            <MathBlockRenderer block={b} showSolutions={showSolutions} />
        </BlockWidthProvider>
    </ScaffoldProvider>,
).container;
const text = (c: HTMLElement) => (c.textContent ?? '').replace(/\s+/g, ' ');

describe('kladlijn', () => {
    test('off by default and off explicitly render the same sheet', () => {
        expect(html(block({ metRestKladlijn: false }), false).innerHTML).toBe(html(block(), false).innerHTML);
        expect(html(block({ metRestKladlijn: false }), true).innerHTML).toBe(html(block(), true).innerHTML);
    });

    test('the key counts in jumps of the deler in red, the sheet only a line; no kladlijn above a quotient of 10', () => {
        expect(text(html(block({ metRestKladlijn: true }), true))).toContain('0 6 12 18 24 30 36 42 48 54');
        expect(text(html(block({ metRestKladlijn: true }), true))).not.toContain('0 3 6 9');
        expect(text(html(block({ metRestKladlijn: true }), false))).not.toContain('0 6 12');
        expect(html(block({ metRestKladlijn: true }), false).innerHTML).not.toBe(html(block(), false).innerHTML);
    });

    test('Oefenmodus (no scaffold) never shows it', () => {
        expect(html(block({ metRestKladlijn: true }), true, FULL_BLOCK_WIDTH_PX, false).innerHTML)
            .toBe(html(block(), true, FULL_BLOCK_WIDTH_PX, false).innerHTML);
    });

    test('gemengd reads it from the : tab', () => {
        const mixed: MathBlock = {
            ...makeBlock('hr-std-gemengd', { id: 'mix', constraints: { variants: [':'], perVariant: { ':': { multiplicationMode: 'met_rest', metRestKladlijn: true } } } }),
            exercises: [{ ...rest('a', 55, 6), variant: ':' }],
        };
        expect(text(html(mixed, true))).toContain('0 6 12 18 24 30 36 42 48 54');
    });

    test.each([4, 2, 1])('fits a %i-unit cell: room for ten jumps goes under the sum and always stays inside', (units) => {
        const widthPx = units === 4 ? FULL_BLOCK_WIDTH_PX : cellWidthPx(units, 12);
        const at = (exercises: Equation[], kladChars: number, multipleChars: number) => {
            const l = hrRowLayout({ ...hrRowStats(exercises, 17.33), widthPx, mathPx: 17.33, layout: 'inline-short', compScaffoldOn: false, labelChars: 3 });
            return { l, k: metRestKladLayout(l, { widthPx, helpOn: !l.tight, kladChars, multipleChars }) };
        };
        const n1 = at([rest('b', 55, 6), rest('c', 47, 5)], '0  6  12  18  24  30  36  42  48  54  60'.length, '36  42  48  54  60'.length);
        expect(n1.k.place).toBe('below');
        expect(n1.k.minPx).toBeLessThanOrEqual(widthPx - n1.l.labelColPx);
        const n3 = at([rest('a', 99, 12)], '0  12  24  36  48  60  72  84  96  108  120'.length, '72  84  96  108  120'.length);
        expect(n3.k.minPx).toBeLessThanOrEqual(widthPx - n3.l.labelColPx);
    });
});

describe('the key\'s worked steps under a rest row', () => {
    test('the multiples and the split, without repeating the row\'s answer', () => {
        const t = text(html(block({ solutionSteps: 'basis' }), true));
        expect(t).toContain('0, 6, 12, 18, 24, 30, 36, 42, 48, 54');
        expect(t).toContain('55 = 54 + 1');
        expect(t).toContain('= (210 : 3) + (24 : 3) rest 1');
        expect(t).not.toContain('= 9 rest 1');
    });
    test('no steps without the setting', () => {
        expect(text(html(block(), true))).not.toContain(' en ');
    });
});
