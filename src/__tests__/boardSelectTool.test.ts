// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useBoardStore } from '../board/useBoardStore';
import { strokeBounds, translatePath, translateStroke } from '../board/inkGeometry';
import { createSelectTool, selectionBox, snapMove, strokesInBox, topStrokeAt, SELECTION_PAD_PX } from '../board/selectTool';
import type { Stroke } from '../board/boardTypes';
import type { SelectContext } from '../board/selectTool';

// The Selecteren (ink select) tool, pure half: path translation, the selection box, the
// engine's tap / lasso / Shift / move decisions, and the store's undoable move and delete.
const st = () => useBoardStore.getState();
const strokes = () => st().pages[st().activePageIdx].strokes;
const line = (id: string, x0: number, y0: number, x1: number, y1: number, width = 4): Stroke =>
    ({ id, tool: 'line', color: '#000', width, path: `M ${x0} ${y0} L ${x1} ${y1}`, pts: [x0, y0, x1, y1] });
const ctx = (over: Partial<SelectContext> = {}): SelectContext =>
    ({ strokes: strokes(), selected: st().selectedStrokeIds, shift: false, gridSnap: false, gridSize: 40, ...over });

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'lasso', gridSnap: false, gridSize: 40 });
});
afterEach(() => { localStorage.clear(); });

describe('geometry', () => {
    test('translatePath moves every absolute coordinate, leaves relative ones and arc radii', () => {
        expect(translatePath('M 0 0 L 10 20', 5, -5)).toBe('M 5 -5 L 15 15');
        expect(translatePath('M 1 1 Q 2 2 3 3 L 4 4', 10, 10)).toBe('M 11 11 Q 12 12 13 13 L 14 14');
        // A rx ry rot large sweep x y: only the end point moves.
        expect(translatePath('M 0 50 A 50 25 0 1 0 100 50 Z', 10, 0)).toBe('M 10 50 A 50 25 0 1 0 110 50 Z');
        // A pen dot is `M x y l 0.01 0`: the relative nudge stays as is.
        expect(translatePath('M 3 4 l 0.01 0', 1, 1)).toBe('M 4 5 l 0.01 0');
        expect(translatePath('M 0 0 H 10 V 20 C 1 2 3 4 5 6', 1, 2)).toBe('M 1 2 H 11 V 22 C 2 4 4 6 6 8');
        // Rounded to 0.1 px like every emitted path.
        expect(translatePath('M 0.15 0 L 1 1', 0.1, 0)).toBe('M 0.3 0 L 1.1 1');
    });

    test('translateStroke moves pts and path together', () => {
        const s = translateStroke(line('a', 0, 0, 100, 0), 100, 20);
        expect(s.pts).toEqual([100, 20, 200, 20]);
        expect(s.path).toBe('M 100 20 L 200 20');
        expect(s.id).toBe('a');
    });

    test('strokeBounds is the pts box; a stroke without pts has none', () => {
        expect(strokeBounds(line('a', 50, 10, 0, 30))).toEqual({ x: 0, y: 10, w: 50, h: 20 });
        expect(strokeBounds({ ...line('b', 0, 0, 1, 1), pts: [] })).toBeNull();
    });
});

describe('selection helpers', () => {
    const a = line('a', 100, 100, 200, 100);
    const b = line('b', 100, 300, 200, 300);

    test('topStrokeAt: within 14 px of the ink, the last drawn wins', () => {
        const over = line('c', 150, 50, 150, 150);
        expect(topStrokeAt([a, b], 150, 112)?.id).toBe('a');
        expect(topStrokeAt([a, b], 150, 130)).toBeNull();
        expect(topStrokeAt([a, over], 150, 100)?.id).toBe('c');
    });

    test('strokesInBox: only strokes whose whole box is inside', () => {
        expect(strokesInBox([a, b], { x: 90, y: 90, w: 120, h: 20 })).toEqual(['a']);
        expect(strokesInBox([a, b], { x: 90, y: 90, w: 120, h: 220 })).toEqual(['a', 'b']);
        expect(strokesInBox([a, b], { x: 120, y: 90, w: 120, h: 220 })).toEqual([]);
    });

    test('selectionBox: the union, out by half the width plus the 8 px padding', () => {
        const pad = 2 + SELECTION_PAD_PX;
        expect(selectionBox([a, b], ['a', 'b'])).toEqual({ x: 100 - pad, y: 100 - pad, w: 100 + 2 * pad, h: 200 + 2 * pad });
        expect(selectionBox([a, b], [])).toBeNull();
        expect(selectionBox([a, b], ['gone'])).toBeNull();
    });

    test('snapMove: free = as dragged; grid on = the box corner lands on a grid point', () => {
        const off = line('o', 105, 98, 205, 98);
        expect(snapMove([off], ['o'], 33, 7, false, 40)).toEqual([33, 7]);
        expect(snapMove([off], ['o'], 33, 7, true, 40)).toEqual([15, 22]);
    });
});

describe('the engine', () => {
    beforeEach(() => {
        st().addStroke(line('a', 100, 100, 200, 100));
        st().addStroke(line('b', 100, 300, 200, 300));
    });

    test('a tap on a stroke selects it; a tap on empty board clears', () => {
        const eng = createSelectTool();
        eng.onPointerDown(150, 108, ctx());
        expect(eng.onPointerUp(151, 108, ctx())).toEqual({ kind: 'select', ids: ['a'] });
        st().selectStrokes(['a']);
        eng.onPointerDown(600, 600, ctx());
        expect(eng.onPointerUp(600, 600, ctx())).toEqual({ kind: 'select', ids: [] });
    });

    test('a drag on empty board lassos every stroke inside, with a marquee preview', () => {
        const eng = createSelectTool();
        eng.onPointerDown(50, 50, ctx());
        eng.onPointerMove(250, 350, ctx());
        expect(eng.preview()).toEqual({ marquee: { x: 50, y: 50, w: 200, h: 300 } });
        expect(eng.onPointerUp(250, 350, ctx())).toEqual({ kind: 'select', ids: ['a', 'b'] });
        expect(eng.preview()).toBeNull();
        // Dragged up-left works the same way.
        eng.onPointerDown(250, 150, ctx());
        expect(eng.onPointerUp(50, 50, ctx())).toEqual({ kind: 'select', ids: ['a'] });
    });

    test('a drag that starts on an unselected stroke lassos, it does not move', () => {
        st().selectStrokes(['b']);
        const eng = createSelectTool();
        eng.onPointerDown(100, 100, ctx());
        expect(eng.onPointerUp(300, 200, ctx())).toEqual({ kind: 'select', ids: ['a'] });
    });

    test('Shift-tap adds (and a second Shift-tap takes it out again); Shift-lasso adds', () => {
        st().selectStrokes(['a']);
        const eng = createSelectTool();
        eng.onPointerDown(150, 300, ctx({ shift: true }));
        expect(eng.onPointerUp(150, 300, ctx({ shift: true }))).toEqual({ kind: 'select', ids: ['a', 'b'] });
        st().selectStrokes(['a', 'b']);
        eng.onPointerDown(150, 300, ctx({ shift: true }));
        expect(eng.onPointerUp(150, 300, ctx({ shift: true }))).toEqual({ kind: 'select', ids: ['a'] });
        st().selectStrokes(['a']);
        eng.onPointerDown(50, 250, ctx({ shift: true }));
        expect(eng.onPointerUp(250, 350, ctx({ shift: true }))).toEqual({ kind: 'select', ids: ['a', 'b'] });
        // Shift-tap on empty board keeps the selection.
        eng.onPointerDown(700, 700, ctx({ shift: true }));
        expect(eng.onPointerUp(700, 700, ctx({ shift: true }))).toEqual({ kind: 'select', ids: ['a'] });
    });

    test('a drag inside the selection box moves every selected stroke (offset preview)', () => {
        st().selectStrokes(['a', 'b']);
        const eng = createSelectTool();
        // (150, 200) is empty board between the two lines but inside their selection box.
        eng.onPointerDown(150, 200, ctx());
        eng.onPointerMove(250, 210, ctx());
        expect(eng.preview()).toEqual({ offset: [100, 10], ids: ['a', 'b'] });
        expect(eng.onPointerUp(250, 210, ctx())).toEqual({ kind: 'move', ids: ['a', 'b'], dx: 100, dy: 10 });
    });

    test('grid snap applies to a move', () => {
        st().selectStrokes(['a']);
        const eng = createSelectTool();
        // The box corner (100, 100) + the drag (53, 0) lands on the grid point (160, 120).
        eng.onPointerDown(150, 100, ctx({ gridSnap: true }));
        expect(eng.onPointerUp(203, 100, ctx({ gridSnap: true }))).toEqual({ kind: 'move', ids: ['a'], dx: 60, dy: 20 });
    });

    test('cancel drops the drag: nothing is emitted', () => {
        st().selectStrokes(['a']);
        const eng = createSelectTool();
        eng.onPointerDown(150, 100, ctx());
        eng.onPointerMove(250, 100, ctx());
        eng.cancel();
        expect(eng.preview()).toBeNull();
        expect(eng.onPointerUp(250, 100, ctx())).toBeNull();
    });
});

describe('store: move / delete through the ink undo stack', () => {
    beforeEach(() => {
        st().addStroke(line('a', 100, 100, 200, 100));
        st().addStroke(line('b', 100, 300, 200, 300));
    });

    test('moveStrokes translates points and path; undo puts them back, redo moves again', () => {
        st().moveStrokes(['a', 'b'], 100, 0);
        expect(strokes().map(s => s.pts)).toEqual([[200, 100, 300, 100], [200, 300, 300, 300]]);
        expect(strokes()[0].path).toBe('M 200 100 L 300 100');
        st().undoStroke();
        expect(strokes().map(s => s.pts)).toEqual([[100, 100, 200, 100], [100, 300, 200, 300]]);
        expect(strokes()).toHaveLength(2);
        st().redoStroke();
        expect(strokes()[1].pts).toEqual([200, 300, 300, 300]);
    });

    test('a removing delete is undoable: the strokes come back in their place', () => {
        st().addStroke(line('c', 0, 0, 10, 10));
        st().selectStrokes(['b']);
        st().removeStrokes(['b'], { undoable: true });
        expect(strokes().map(s => s.id)).toEqual(['a', 'c']);
        expect(st().selectedStrokeIds).toEqual([]);
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a', 'b', 'c']);
        st().redoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a', 'c']);
        // Undo walks back in order: the delete first, then c's add.
        st().undoStroke();
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a', 'b']);
    });

    test('undo interleaves adds and moves in the order they happened', () => {
        st().moveStrokes(['a'], 0, 50);
        st().addStroke(line('c', 0, 0, 10, 10));
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a', 'b']);
        expect(strokes()[0].pts).toEqual([100, 150, 200, 150]);
        st().undoStroke();
        expect(strokes()[0].pts).toEqual([100, 100, 200, 100]);
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a']);
    });

    test('the eraser stays as it was: not undoable, redo cleared, undo pops the next stroke', () => {
        st().removeStrokes(['b']);
        expect(st()._redoInk).toEqual([]);
        st().undoStroke();
        expect(strokes()).toEqual([]);
    });

    test('strokes without a history (a loaded board) still undo last-first', () => {
        st().loadBoard([{ ...st().pages[0], strokes: [line('x', 0, 0, 1, 1), line('y', 0, 0, 2, 2)] }]);
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['x']);
        st().redoStroke();
        expect(strokes().map(s => s.id)).toEqual(['x', 'y']);
    });

    test('a new action clears redo; switching page or tool clears the selection', () => {
        st().moveStrokes(['a'], 10, 0);
        st().undoStroke();
        expect(st()._redoInk).toHaveLength(1);
        st().moveStrokes(['b'], 10, 0);
        expect(st()._redoInk).toEqual([]);
        st().selectStrokes(['a']);
        st().setTool('pen');
        expect(st().selectedStrokeIds).toEqual([]);
        st().setTool('lasso');
        st().selectStrokes(['a']);
        st().addPage();
        expect(st().selectedStrokeIds).toEqual([]);
    });

    test('a zero move is no history entry', () => {
        st().moveStrokes(['a'], 0, 0);
        st().undoStroke();
        expect(strokes().map(s => s.id)).toEqual(['a']);
    });
});
