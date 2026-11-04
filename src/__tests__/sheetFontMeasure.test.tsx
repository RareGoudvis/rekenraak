// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useMeasuredHeights, intrinsicEntries } from '../hooks/useMeasuredHeights';
import { makeBlock } from './helpers/makeBlock';

afterEach(cleanup);

// A sheet-wide font or size switch changes every block's content width without changing the
// block, so the width measurements of the old face must not outlive it (they hold the clamp).
describe('measurements follow the sheet fonts', () => {
    const flush = () => act(async () => { await Promise.resolve(); });

    test('a sheetKey change drops the intrinsic widths taken under the previous face', async () => {
        const blocks = [makeBlock('hr-std-optellen', { id: 'f1', block: { widthUnits: 2 } })];
        const { result, rerender } = renderHook(({ k }) => useMeasuredHeights(blocks, '', k), { initialProps: { k: 'azeret' } });
        act(() => { result.current.onCellMeasure('f1', 1, 300, 260); result.current.onCellMeasure('f1', 2, 300, 250); });
        await flush();
        expect(intrinsicEntries('f1').map(e => e.atWidth).sort()).toEqual([1, 2]);
        rerender({ k: 'azeret' });
        await flush();
        expect(intrinsicEntries('f1')).toHaveLength(2);
        rerender({ k: 'courier' });
        await flush();
        expect(intrinsicEntries('f1')).toHaveLength(0);
        // The remeasure under the new face is accepted as usual.
        act(() => { result.current.onCellMeasure('f1', 2, 300, 220); });
        await flush();
        expect(intrinsicEntries('f1')).toEqual([{ px: 220, atWidth: 2, reflows: undefined }]);
    });

    test('heights at the current width are kept across the switch (no estimate frame)', async () => {
        const blocks = [makeBlock('hr-std-optellen', { id: 'f2', block: { widthUnits: 2 } })];
        const { result, rerender } = renderHook(({ k }) => useMeasuredHeights(blocks, '', k), { initialProps: { k: 'a' } });
        act(() => { result.current.onCellMeasure('f2', 2, 310, 200); });
        await flush();
        rerender({ k: 'b' });
        await flush();
        expect(result.current.heightPxOf(blocks[0], 2)).toBe(310);
    });
});
