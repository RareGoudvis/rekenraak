// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { MathBlock } from '../services/math/types';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { MONO_ADVANCE_EM } from '../services/layout/blockLayout';
import SplitsenViewer from '../components/viewer/SplitsenViewer';

// Every mono width a viewer reserves is chars × MONO_ADVANCE_EM (0.65, measured) × its font
// factor, one formula at every size: the older 0.62 / 0.64 estimates and their
// "small numbers use the guess, big ones the real advance" switches jumped at the switch.

afterEach(cleanup);

const em = (chars: number, factor: number) => (chars * MONO_ADVANCE_EM * factor).toFixed(3);

const block = (constraints: Record<string, unknown>, fields: Record<string, unknown>): MathBlock =>
    ({ id: 'b', typeId: 'test', constraints, verticalSpacing: 14, ...fields } as unknown as MathBlock);

const at = (el: React.ReactElement) => render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>{el}</BlockWidthProvider>).container;

describe('splitsen', () => {
    const place = (digit: number, key: string, weight: number) => ({ key, label: key, digit, weight });

    test.each([345, 1_234_567])('positie-math: the left column is the widest number at 1.04 × 0.65em (%i)', (total) => {
        const text = total.toLocaleString('nl-BE').replace(/\./g, ' ');
        const c = at(<SplitsenViewer showSolutions={false} block={block({ layout: 'positie-math' }, {
            splitsenExercises: [{ id: 'e', total, pairs: [], placeBreakdown: [place(3, 'H', 100)], mathDirection: 'decompose', isManuallyEdited: false }],
        })} />);
        const col = [...c.querySelectorAll<HTMLElement>('span')].find(s => s.style.minWidth);
        expect(col?.style.minWidth).toBe(`calc(${em(text.length, 1.04)} * var(--sheet-size-math))`);
    });

    test('splitsboom: boxes keep 46px until the value at 1.04 + 15px of padding/border needs more', () => {
        const tree = (total: number) => at(<SplitsenViewer showSolutions={false} block={block({ layout: 'splitsboom' }, {
            splitsenExercises: [{ id: 'e', total, pairs: [{ given: 1, answer: total - 1 }], blankPos: 'right', isManuallyEdited: false }],
        })} />).querySelector<HTMLElement>('.print-exercise div')!.style.minWidth;
        expect(tree(10)).toBe('46px');
        expect(tree(1_000_000)).toBe(`calc(var(--sheet-size-math) * ${em(9, 1.04)} + 15px)`);
    });
});
