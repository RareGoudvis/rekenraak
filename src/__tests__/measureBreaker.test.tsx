// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { useLayoutEffect } from 'react';
import { renderHook, render, act, cleanup } from '@testing-library/react';
import { useMeasuredHeights, type MeasuredHeights } from '../hooks/useMeasuredHeights';
import { makeBlock } from './helpers/makeBlock';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const tick = () => act(async () => { await Promise.resolve(); });
const WIDTHS = [1, 2, 4] as const;
const tripped = (warn: { mock: { calls: unknown[][] } }) => warn.mock.calls.some((c) => String(c[0]).includes('repack loop broken'));

// The repack breaker is there for a measurement that feeds back into itself. The visual gate
// walks a new cell every ~65 ms (each one a fresh, converging measurement), and a time-window
// count of ALL bumps read that cadence as a loop and froze the next cell's numbers.
describe('repack breaker', () => {
    test('a burst of independent, converging inputs is not a loop', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const blocks = [makeBlock('breuken', { id: 'g1', block: { widthUnits: 2 } })];
        const { result } = renderHook(() => useMeasuredHeights(blocks));
        // 20 inputs well inside one second, each settling at once (solutions on/off, a new width).
        for (let i = 0; i < 20; i++) {
            act(() => { result.current.onCellMeasure('g1', WIDTHS[i % 3], 300 + (i % 2) * 100, 250 + i * 10); });
            await tick();
        }
        expect(tripped(warn)).toBe(false);
        // The last input was accepted, not dropped by a cooldown.
        expect(result.current.heightPxOf(blocks[0], WIDTHS[19 % 3])).toBe(400);
    });

    test('a measurement that flips with every repack still trips it', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const blocks = [makeBlock('breuken', { id: 'g2', block: { widthUnits: 2 } })];
        let passes = 0;
        // Measures in the commit the hook's own bump caused, like PageSheet's layout effect,
        // and reports a height that depends on that bump: the measure→pack→measure loop.
        function Probe({ m }: { m: MeasuredHeights }) {
            useLayoutEffect(() => { passes++; m.onCellMeasure('g2', 2, m.version % 2 ? 300 : 500); });
            return null;
        }
        function Host() {
            const m = useMeasuredHeights(blocks);
            return <Probe m={m} />;
        }
        render(<Host />);
        for (let i = 0; i < 40; i++) await tick();
        expect(tripped(warn)).toBe(true);
        const after = passes;
        for (let i = 0; i < 10; i++) await tick();
        expect(passes).toBe(after);
    });
});
