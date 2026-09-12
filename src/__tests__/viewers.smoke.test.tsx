// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';

// Every viewer, with real generated data, at the three cell widths a block can occupy,
// with and without the solution overlay. Viewers read their column count from
// BlockWidthContext, so a viewer that hardcodes 681px only shows up at the narrow widths.
//
// The bar is deliberately low — it renders, it produces DOM, and React logs nothing. That
// is enough to catch the crashes and key/prop warnings that a manual click-through misses.

// Full width (681px), half and quarter of it, matching the 6/3/2-unit cells minus gaps.
const WIDTHS = [FULL_BLOCK_WIDTH_PX, 338, 163];

const typeIds = Object.keys(EXERCISE_UI);

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    cleanup();
    consoleError.mockRestore();
});

test('every registry type has a UI row, and vice versa', () => {
    expect(Object.keys(EXERCISE_UI).sort()).toEqual(Object.keys(REGISTRY).sort());
});

describe.each(typeIds)('%s', (typeId) => {
    test.each(WIDTHS.flatMap(w => [false, true].map(s => [w, s] as const)))('renders at %ipx, showSolutions=%s', (width, showSolutions) => {
        const { Viewer } = EXERCISE_UI[typeId];
        const def = REGISTRY[typeId];
        const block = makeBlock(typeId);
        (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);

        const { container } = render(
            <BlockWidthProvider value={width}>
                <Viewer block={block} showSolutions={showSolutions} />
            </BlockWidthProvider>,
        );

        expect(container.childElementCount, `${typeId} rendered nothing at ${width}px`).toBeGreaterThan(0);

        const errors = consoleError.mock.calls.map((args: unknown[]) => String(args[0]));
        expect(errors, `${typeId} logged a React error at ${width}px`).toEqual([]);
    });
});
