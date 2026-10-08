// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { flattenLeaves } from '../config/appstructure';
import { REGISTRY } from '../config/exerciseRegistry';
import { DEFAULT_BASE } from '../config/baseSettings';
import { makeBoardBlock, regenerateBoardBlock } from '../board/boardBlocks';
import { useBoardStore } from '../board/useBoardStore';
import BoardPageCanvas from '../board/components/BoardPageCanvas';
import type { MathBlock } from '../services/math/types';

// Every sidebar leaf as a board card: makeBoardBlock + a regenerate, mounted through the
// board canvas (WidgetFrame + ExerciseWidget), with and without answers. The card mounts the
// SHEET viewer (no kiosk variant attributes), has exercises (layout furniture excepted),
// logs no console.error and prints no "undefined"/"NaN". Crash-level only: jsdom has no layout.
const leaves = flattenLeaves().filter((l) => REGISTRY[l.typeId]);
const exercisesOf = (b: MathBlock) => (b as unknown as Record<string, unknown[] | undefined>)[REGISTRY[b.typeId].exerciseField] ?? [];

let errorSpy: MockInstance;

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
});

beforeEach(() => {
    useBoardStore.getState().resetBoard();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test('the leaf list is the whole sidebar', () => {
    expect(leaves.length).toBeGreaterThan(100);
});

describe.each(leaves.map((l) => [l.id, l] as const))('%s', (_id, leaf) => {
    test('renders as a board card with the sheet viewer', () => {
        const made = makeBoardBlock(leaf.typeId, { override: leaf.defaultConstraints, leafId: leaf.id, base: DEFAULT_BASE, grade: null })!;
        expect(made).not.toBeNull();
        const block = regenerateBoardBlock(made);
        expect(block.id).toBe(made.id);
        expect(block.instructionMode).toBe('geen');
        expect(block.totalPoints).toBe(0);
        expect(block.numberOfExercises).toBeLessThanOrEqual(6);
        const furniture = !!REGISTRY[leaf.typeId].isFurniture;
        if (furniture) expect(exercisesOf(block)).toEqual([]);
        else expect(exercisesOf(block).length).toBeGreaterThan(0);

        for (const showAnswer of [false, true]) {
            useBoardStore.getState().resetBoard();
            useBoardStore.getState().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block, showAnswer, props: { title: leaf.label } });
            const { container, unmount } = render(<BoardPageCanvas />);
            const card = container.querySelector('[data-widget-body]')!;
            expect(card).not.toBeNull();
            expect(card.textContent).not.toContain('Onbekend oefeningtype');
            expect(card.textContent).not.toMatch(/Widget \(exercise\)/);
            const kiosk = [...card.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => a.name)).filter((n) => n.startsWith('data-kiosk'));
            expect(kiosk).toEqual([]);
            if (!furniture) expect(card.textContent!.trim().length).toBeGreaterThan(0);
            expect(card.textContent).not.toMatch(/undefined|NaN/);
            unmount();
        }
        expect(errorSpy.mock.calls.map((c) => c.map(String).join(' '))).toEqual([]);
    });
});
