// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import { flattenLeaves } from '../config/appstructure';

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

// The 1) / a) labels are an extra first child in the row, at the widths where a block is
// tightest — a label that pushed the sum off the cell would only show up here.
describe.each(['hr-std-optellen', 'rekenvolgorde'])('%s with per-exercise numbering', (typeId) => {
    test.each(WIDTHS.flatMap(w => [false, true].flatMap(sol =>
        (['cijfer', 'letter'] as const).map(mode => [w, sol, mode] as const))))(
        'renders at %ipx, showSolutions=%s, itemNumbering=%s', (width, showSolutions, itemNumbering) => {
            const { Viewer } = EXERCISE_UI[typeId];
            const def = REGISTRY[typeId];
            const block = makeBlock(typeId, { block: { itemNumbering } });
            (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);

            const { container } = render(
                <BlockWidthProvider value={width}>
                    <Viewer block={block} showSolutions={showSolutions} />
                </BlockWidthProvider>,
            );

            expect(container.textContent).toContain(itemNumbering === 'cijfer' ? '1)' : 'a)');
            const errors = consoleError.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(errors, `${typeId} logged a React error at ${width}px`).toEqual([]);
        });
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

// The 1e9 line: every sidebar leaf whose type has a max-number list, at the top of that
// list (force=true reaches the grown lists before BIG_NUMBERS_ENABLED flips). Crash-only —
// jsdom has no layout, so fit and overflow belong to `npm run bignum:audit`.
const ceilingLeaves = flattenLeaves().flatMap((leaf) => {
    const def = REGISTRY[leaf.typeId];
    const merged = { ...def.defaultConstraints(leaf.typeId), ...(leaf.defaultConstraints ?? {}) };
    const range = def.maxPresets?.(merged, true);
    if (!range || range.presets.length === 0) return [];
    const top = Math.max(...range.presets);
    return [[`${leaf.id} @${top}`, leaf.typeId, { ...(leaf.defaultConstraints ?? {}), [range.key]: top }] as const];
});

describe.each(ceilingLeaves)('ceiling %s', (_name, typeId, constraints) => {
    test.each(WIDTHS.flatMap(w => [false, true].map(s => [w, s] as const)))('renders at %ipx, showSolutions=%s', (width, showSolutions) => {
        const { Viewer } = EXERCISE_UI[typeId];
        const def = REGISTRY[typeId];
        const block = makeBlock(typeId, { constraints });
        (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);

        const { container } = render(
            <BlockWidthProvider value={width}>
                <Viewer block={block} showSolutions={showSolutions} />
            </BlockWidthProvider>,
        );

        expect(container.childElementCount, `${typeId} rendered nothing at ${width}px`).toBeGreaterThan(0);
        expect(/undefined|NaN/.test(container.textContent ?? ''), `${typeId} printed undefined/NaN at ${width}px`).toBe(false);
        const errors = consoleError.mock.calls.map((args: unknown[]) => String(args[0]));
        expect(errors, `${typeId} logged a React error at ${width}px`).toEqual([]);
    });
});
