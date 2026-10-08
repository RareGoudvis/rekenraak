// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { makeBoardBlock } from '../board/boardBlocks';
import { useBoardStore } from '../board/useBoardStore';
import WhiteboardView from '../board/components/WhiteboardView';

// The board inspector mounts the family's StyleConfig / AdvancedConfig the way the sheet
// Inspector does (registry lookup); cijferen's scaffolding is the visible case.
afterEach(() => {
    cleanup();
    useWorksheetStore.getState().clearDraftBlocks();
    useBoardStore.getState().resetBoard();
});

function openCijferWidget() {
    const block = makeBoardBlock('cijferen-optellen-nat', { override: { operator: '+', numberType: 'natural' }, leafId: 'cijferen-optellen-nat', base: DEFAULT_BASE, grade: null })!;
    const board = useBoardStore.getState();
    const id = board.addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block, showAnswer: false });
    board.selectWidget(id);
    board.setInspectorOpen(true);
    const utils = render(<WhiteboardView />);
    const live = () => useBoardStore.getState().pages[0].widgets.find((w) => w.id === id)!;
    return { ...utils, live };
}

const solutionCells = (root: Element) => root.querySelectorAll('[style*="--ink-solution"]').length;

describe('board inspector: family sections', () => {
    test('cijferen shows the scaffolding control; the eye then shows the answers', () => {
        const { container, live } = openCijferWidget();
        expect(screen.getByText('Scaffolding')).toBeTruthy();
        act(() => { fireEvent.click(screen.getByText('Structuur en ingevulde getallen')); });
        expect((live().block!.constraints as Record<string, unknown>).scaffolding).toBe(1);

        expect(solutionCells(container)).toBe(0);
        act(() => { fireEvent.click(screen.getByLabelText('Oplossing tonen/verbergen')); });
        expect(live().showAnswer).toBe(true);
        expect(solutionCells(container)).toBeGreaterThan(0);
    });

    test('the Geavanceerd body opens on demand', () => {
        openCijferWidget();
        expect(screen.queryByText(/Ruitjesgrootte/)).toBeNull();
        act(() => { fireEvent.click(screen.getByText('Geavanceerd')); });
        expect(screen.getByText(/Ruitjesgrootte/)).toBeTruthy();
    });
});
