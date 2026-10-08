// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import InkLayer from '../board/components/InkLayer';
import InkSettingsBar from '../board/components/InkSettingsBar';
import BoardBottomBar from '../board/components/BoardBottomBar';
import { createLineTool } from '../board/drawTools';
import { headLength, linePath, snapAngle, snapToGrid, splitSubpaths, strokeHit } from '../board/inkGeometry';
import type { Stroke, ToolContext } from '../board/boardTypes';

// The P3 drag-to-draw tools: pure geometry, the ToolEngine handlers, and the InkLayer
// driving them with pointer events (jsdom: the svg rect is 0,0 so clientX/Y = board px).
const st = () => useBoardStore.getState();
const strokes = () => st().pages[st().activePageIdx].strokes;
const free: ToolContext = { gridSnap: false, gridSize: 40 };
const grid: ToolContext = { gridSnap: true, gridSize: 40 };
const lineOpts = { color: '#123456', width: 4, arrow: 'none' as const, dashed: false };

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({
        tool: 'select', _redoStrokes: [], gridSnap: false, gridSize: 40,
        drawOptions: { arrow: 'none', dashed: false, shape: 'rect', fill: false },
    });
    st().setInkSetting('line', { color: '#111827', width: 4 });
});

afterEach(() => cleanup());

function drag(svg: Element, from: [number, number], to: [number, number], opts: { shiftKey?: boolean } = {}) {
    act(() => { fireEvent.pointerDown(svg, { clientX: from[0], clientY: from[1], pointerId: 1, ...opts }); });
    act(() => { fireEvent.pointerMove(svg, { clientX: (from[0] + to[0]) / 2, clientY: (from[1] + to[1]) / 2, pointerId: 1, ...opts }); });
    act(() => { fireEvent.pointerMove(svg, { clientX: to[0], clientY: to[1], pointerId: 1, ...opts }); });
    act(() => { fireEvent.pointerUp(svg, { clientX: to[0], clientY: to[1], pointerId: 1, ...opts }); });
}

describe('geometry', () => {
    test('grid snapping rounds to the nearest line, off = untouched', () => {
        expect(snapToGrid(59, true, 40)).toBe(40);
        expect(snapToGrid(61, true, 40)).toBe(80);
        expect(snapToGrid(61, false, 40)).toBe(61);
    });

    test('Shift snaps the end onto the nearest 0 / 45 / 90° ray', () => {
        expect(snapAngle(0, 0, 100, 7, 0)).toEqual([100, 0]);
        expect(snapAngle(0, 0, -6, 100, 0)).toEqual([0, 100]);
        expect(snapAngle(0, 0, 90, 110, 0)).toEqual([100, 100]);
        expect(snapAngle(0, 0, -90, -110, 0)).toEqual([-100, -100]);
        expect(snapAngle(0, 0, 90, -110, 0)).toEqual([100, -100]);
        // On a grid the length along the ray lands on a grid multiple as well.
        expect(snapAngle(40, 40, 135, 52, 40)).toEqual([120, 40]);
        expect(snapAngle(40, 40, 130, 150, 40)).toEqual([160, 160]);
    });

    test('a plain line is exactly M x y L x y', () => {
        expect(linePath(10, 20, 110, 20, 4, 'none')).toBe('M 10 20 L 110 20');
    });

    test('arrowheads are closed triangles after the shaft; the shaft stops at the head', () => {
        const end = splitSubpaths(linePath(0, 0, 200, 0, 4, 'end'));
        expect(end).toHaveLength(2);
        expect(end[0]).toMatch(/^M 0 0 L 1\d\d(\.\d)? 0$/);
        expect(end[1]).toMatch(/^M 200 0 L .* Z$/);
        const both = splitSubpaths(linePath(0, 0, 200, 0, 4, 'both'));
        expect(both).toHaveLength(3);
        expect(both[1]).toMatch(/^M 0 0 L/);
        expect(both[2]).toMatch(/^M 200 0 L/);
        // A short arrow keeps its two heads apart.
        expect(headLength(7, 30)).toBeCloseTo(12);
        expect(headLength(4, 1000)).toBe(20);
    });

    test('the hit-test covers the whole segment, not just the sample points', () => {
        const s: Stroke = { id: 'l', tool: 'line', color: '#000', width: 4, path: '', pts: [0, 0, 400, 0] };
        expect(strokeHit(s, 200, 10, 14)).toBe(true);
        expect(strokeHit(s, 200, 17, 14)).toBe(false);
        expect(strokeHit(s, 410, 0, 14)).toBe(true);
        expect(strokeHit(s, 430, 0, 14)).toBe(false);
        expect(strokeHit({ ...s, pts: [5, 5] }, 10, 10, 14)).toBe(true);
        expect(strokeHit({ ...s, pts: undefined as unknown as number[] }, 0, 0, 14)).toBe(false);
    });
});

describe('the line ToolEngine', () => {
    test('a drag emits one line stroke with its two ends as pts', () => {
        const t = createLineTool(lineOpts);
        t.onPointerDown(10, 10, free);
        t.onPointerMove(80, 40, free);
        const s = t.onPointerUp(110, 60, free)!;
        expect(s).toMatchObject({ tool: 'line', color: '#123456', width: 4, path: 'M 10 10 L 110 60', pts: [10, 10, 110, 60] });
        expect(s.fill).toBeUndefined();
        expect(s.dash).toBeUndefined();
        expect(s.id).not.toBe('preview');
    });

    test('under 4 px is a tap: nothing is emitted, and no preview', () => {
        const t = createLineTool(lineOpts);
        t.onPointerDown(10, 10, free);
        t.onPointerMove(12, 12, free);
        expect(t.preview!()).toBeNull();
        expect(t.onPointerUp(13, 11, free)).toBeNull();
    });

    test('the preview follows the pointer, cancel drops the drag', () => {
        const t = createLineTool(lineOpts);
        expect(t.preview!()).toBeNull();
        t.onPointerDown(0, 0, free);
        t.onPointerMove(50, 0, free);
        expect(t.preview!()!.path).toBe('M 0 0 L 50 0');
        t.onPointerMove(90, 0, free);
        expect(t.preview!()!.path).toBe('M 0 0 L 90 0');
        t.cancel!();
        expect(t.preview!()).toBeNull();
        expect(t.onPointerUp(90, 0, free)).toBeNull();
    });

    test('grid on: both ends snap; a drag that folds onto its start is dropped', () => {
        const t = createLineTool(lineOpts);
        t.onPointerDown(43, 38, grid);
        expect(t.onPointerUp(158, 77, grid)!.pts).toEqual([40, 40, 160, 80]);
        t.onPointerDown(43, 38, grid);
        expect(t.onPointerUp(55, 45, grid)).toBeNull();
    });

    test('Shift: 45° steps, also combined with the grid', () => {
        const t = createLineTool(lineOpts);
        t.onPointerDown(0, 0, { ...free, shift: true });
        expect(t.onPointerUp(100, 9, { ...free, shift: true })!.pts).toEqual([0, 0, 100, 0]);
        t.onPointerDown(41, 39, { ...grid, shift: true });
        expect(t.onPointerUp(130, 150, { ...grid, shift: true })!.pts).toEqual([40, 40, 160, 160]);
    });

    test('arrow and dashed options land on the stroke', () => {
        const t = createLineTool({ ...lineOpts, arrow: 'both', dashed: true });
        t.onPointerDown(0, 0, free);
        const s = t.onPointerUp(300, 0, free)!;
        expect(s.fill).toBe('#123456');
        expect(s.dash).toBe(true);
        expect(splitSubpaths(s.path)).toHaveLength(3);
        expect(s.pts).toEqual([0, 0, 300, 0]);
    });
});

describe('the ink layer with the line tool', () => {
    test('a drag shows a preview (not a stroke) and commits one stroke on release', () => {
        st().setTool('line');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 20, clientY: 30, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 200, clientY: 30, pointerId: 1 }); });
        expect(svg.querySelector('[data-ink-preview]')).not.toBeNull();
        expect(svg.querySelector('[data-ink-preview]')!.getAttribute('d')).toBe('M 20 30 L 200 30');
        expect(strokes()).toHaveLength(0);
        act(() => { fireEvent.pointerUp(svg, { clientX: 220, clientY: 30, pointerId: 1 }); });
        expect(svg.querySelector('[data-ink-preview]')).toBeNull();
        expect(strokes()).toHaveLength(1);
        expect(strokes()[0]).toMatchObject({ tool: 'line', color: '#111827', width: 4, path: 'M 20 30 L 220 30', pts: [20, 30, 220, 30] });
    });

    test('Escape cancels the drag; a tap under 4 px leaves nothing', () => {
        st().setTool('line');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 20, clientY: 30, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 200, clientY: 30, pointerId: 1 }); });
        act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
        expect(svg.querySelector('[data-ink-preview]')).toBeNull();
        act(() => { fireEvent.pointerUp(svg, { clientX: 220, clientY: 30, pointerId: 1 }); });
        expect(strokes()).toHaveLength(0);
        drag(svg, [50, 50], [52, 52]);
        expect(strokes()).toHaveLength(0);
    });

    test('Shift on the pointer events snaps the angle; the store grid snaps the ends', () => {
        st().setTool('line');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        drag(svg, [0, 0], [200, 14], { shiftKey: true });
        expect(strokes()[0].pts).toEqual([0, 0, 200, 0]);
        act(() => useBoardStore.setState({ gridSnap: true, gridSize: 40 }));
        drag(svg, [43, 38], [158, 77]);
        expect(strokes()[1].pts).toEqual([40, 40, 160, 80]);
    });

    test('pressing Shift mid-drag re-shapes the preview at once', () => {
        st().setTool('line');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 0, clientY: 0, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 200, clientY: 14, pointerId: 1 }); });
        expect(svg.querySelector('[data-ink-preview]')!.getAttribute('d')).toBe('M 0 0 L 200 14');
        act(() => { fireEvent.keyDown(document, { key: 'Shift' }); });
        expect(svg.querySelector('[data-ink-preview]')!.getAttribute('d')).toBe('M 0 0 L 200 0');
        act(() => { fireEvent.keyUp(document, { key: 'Shift' }); });
        expect(svg.querySelector('[data-ink-preview]')!.getAttribute('d')).toBe('M 0 0 L 200 14');
    });

    test('lines are ordinary strokes: undo / redo / eraser along the middle', () => {
        st().setTool('line');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        drag(svg, [100, 100], [500, 100]);
        act(() => st().undoStroke());
        expect(strokes()).toHaveLength(0);
        act(() => st().redoStroke());
        expect(strokes()).toHaveLength(1);
        act(() => st().setTool('eraser'));
        act(() => { fireEvent.pointerDown(svg, { clientX: 300, clientY: 108, pointerId: 1 }); });
        expect(strokes()).toHaveLength(0);
    });

    test('a dashed arrow dashes the shaft only; the heads stay solid and filled', () => {
        st().setTool('line');
        st().setDrawOptions({ arrow: 'end', dashed: true });
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        drag(svg, [0, 50], [300, 50]);
        const g = svg.querySelector('g')!;
        const [shaft, heads] = [...g.querySelectorAll('path')];
        expect(shaft.getAttribute('stroke-dasharray')).toBe('8 10');
        expect(shaft.getAttribute('fill')).toBe('none');
        expect(heads.getAttribute('stroke-dasharray')).toBeNull();
        expect(heads.getAttribute('fill')).toBe('#111827');
    });
});

describe('line options and shortcut', () => {
    test('the settings bar shows the arrow + dashed options for the line tool only', () => {
        const { getByLabelText, queryByLabelText, rerender } = render(<InkSettingsBar tool="line" />);
        fireEvent.click(getByLabelText('Dubbele pijl'));
        expect(st().drawOptions.arrow).toBe('both');
        fireEvent.click(getByLabelText('Stippellijn'));
        expect(st().drawOptions.dashed).toBe(true);
        fireEvent.click(getByLabelText('Dikte 7'));
        expect(st().inkSettings.line.width).toBe(7);
        expect(st().inkSettings.pen.width).toBe(4);
        rerender(<InkSettingsBar tool="pen" />);
        expect(queryByLabelText('Stippellijn')).toBeNull();
    });

    test('L picks the line tool, not while typing or with Ctrl', () => {
        const { getByLabelText } = render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        expect((getByLabelText(/^Lijn \/ pijl \(L\)/) as HTMLButtonElement).disabled).toBe(false);
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => { fireEvent.keyDown(input, { key: 'l' }); });
        expect(st().tool).toBe('select');
        act(() => { fireEvent.keyDown(document.body, { key: 'l', ctrlKey: true }); });
        expect(st().tool).toBe('select');
        act(() => { fireEvent.keyDown(document.body, { key: 'L' }); });
        expect(st().tool).toBe('line');
        input.remove();
    });
});
