// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import TopBar from '../components/layout/TopBar';
import WhiteboardView from '../board/components/WhiteboardView';
import { useBoardStore } from '../board/useBoardStore';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { addBasicWidget } from '../board/addWidgets';
import type { Stroke } from '../board/boardTypes';

// Why: TopBar stays mounted under the board overlay, so its window Ctrl+Z used to undo the
// worksheet invisibly. The board owns Ctrl+Z / Ctrl+Y for ink strokes instead.
const ws = () => useWorksheetStore.getState();
const bd = () => useBoardStore.getState();
const stroke = (id: string): Stroke => ({ id, tool: 'pen', color: '#000', width: 4, path: 'M 0 0 L 9 9', pts: [0, 0, 9, 9] });
const ctrl = (target: Element | Window, key: string, shiftKey = false) =>
    act(() => { fireEvent.keyDown(target, { key, ctrlKey: true, shiftKey }); });

beforeEach(() => {
    bd().resetBoard();
    ws().clearBlocks();
    ws().addBlockFromType('hr-std-delen', 'Natuurlijke getallen', { numberType: 'natural' }, { leafId: 'hr-std-delen-nat' });
    bd().addStroke(stroke('a'));
    bd().addStroke(stroke('b'));
});
afterEach(() => { cleanup(); useWorksheetStore.setState({ view: 'editor' }); });

describe('undo shortcut vs Bordmodus', () => {
    test('board open: Ctrl+Z pops an ink stroke and leaves the worksheet history alone', () => {
        useWorksheetStore.setState({ view: 'whiteboard' });
        render(<><TopBar onPrint={() => {}} onOpenHelp={() => {}} /><WhiteboardView /></>);
        const histIdx = ws()._historyIndex;
        ctrl(window, 'z');
        expect(bd().pages[0].strokes.map(s => s.id)).toEqual(['a']);
        expect(ws()._historyIndex).toBe(histIdx);
        expect(ws().blocks).toHaveLength(1);
        ctrl(window, 'y');
        expect(bd().pages[0].strokes).toHaveLength(2);
        ctrl(window, 'z');
        ctrl(window, 'z', true);
        expect(bd().pages[0].strokes).toHaveLength(2);
        expect(ws()._historyIndex).toBe(histIdx);
    });

    test('editor: Ctrl+Z still undoes the sheet and never touches ink', () => {
        render(<TopBar onPrint={() => {}} onOpenHelp={() => {}} />);
        ctrl(window, 'z');
        expect(ws().blocks).toHaveLength(0);
        expect(bd().pages[0].strokes).toHaveLength(2);
    });

    test('typing in a board text widget: Ctrl+Z does not pop a stroke', () => {
        useWorksheetStore.setState({ view: 'whiteboard' });
        addBasicWidget('tekst', { text: 'hallo' }, 360);
        const { container } = render(<WhiteboardView />);
        const field = container.querySelector('textarea, input, [contenteditable="true"]');
        expect(field).toBeTruthy();
        ctrl(field!, 'z');
        expect(bd().pages[0].strokes).toHaveLength(2);
    });
});
