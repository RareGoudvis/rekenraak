// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import InkLayer from '../board/components/InkLayer';
import BoardBottomBar from '../board/components/BoardBottomBar';
import BoardPageCanvas from '../board/components/BoardPageCanvas';
import WhiteboardView from '../board/components/WhiteboardView';
import type { Stroke } from '../board/boardTypes';

// The Selecteren tool on screen: the InkLayer under pointer events (jsdom: the svg sits at 0,0,
// so clientX/Y = board px), the selection outline and lasso box, the keys, the bottom-bar button
// and the routing (widgets and instruments are out of reach).
const st = () => useBoardStore.getState();
const strokes = () => st().pages[st().activePageIdx].strokes;
const line = (id: string, x0: number, y0: number, x1: number, y1: number): Stroke =>
    ({ id, tool: 'line', color: '#000', width: 4, path: `M ${x0} ${y0} L ${x1} ${y1}`, pts: [x0, y0, x1, y1] });

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'lasso', gridSnap: false, gridSize: 40 });
    st().addStroke(line('a', 100, 100, 200, 100));
    st().addStroke(line('b', 100, 300, 200, 300));
});
afterEach(() => { cleanup(); localStorage.clear(); });

function press(svg: Element, from: [number, number], to: [number, number] = from, opts: { shiftKey?: boolean } = {}) {
    act(() => { fireEvent.pointerDown(svg, { clientX: from[0], clientY: from[1], pointerId: 1, ...opts }); });
    act(() => { fireEvent.pointerMove(svg, { clientX: to[0], clientY: to[1], pointerId: 1, buttons: 1, ...opts }); });
    act(() => { fireEvent.pointerUp(svg, { clientX: to[0], clientY: to[1], pointerId: 1, ...opts }); });
}
const mount = () => {
    const { container } = render(<InkLayer active />);
    return { container, svg: container.querySelector('svg')! };
};

describe('the ink layer with Selecteren', () => {
    test('a tap on a stroke selects it and draws the dashed outline 8 px outside the ink', () => {
        const { container, svg } = mount();
        expect(container.querySelector('[data-ink-selection]')).toBeNull();
        press(svg, [150, 106]);
        expect(st().selectedStrokeIds).toEqual(['a']);
        const box = container.querySelector('[data-ink-selection]')!;
        expect(box.getAttribute('stroke-dasharray')).toBeTruthy();
        expect(box.getAttribute('stroke')).toMatch(/^var\(--/);
        expect([box.getAttribute('x'), box.getAttribute('y'), box.getAttribute('width'), box.getAttribute('height')]).toEqual(['90', '90', '120', '20']);
        expect(strokes()).toHaveLength(2);
    });

    test('a drag on empty board shows a lasso box and selects what is inside', () => {
        const { container, svg } = mount();
        act(() => { fireEvent.pointerDown(svg, { clientX: 50, clientY: 50, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 250, clientY: 350, pointerId: 1, buttons: 1 }); });
        expect(container.querySelector('[data-ink-marquee]')).not.toBeNull();
        act(() => { fireEvent.pointerUp(svg, { clientX: 250, clientY: 350, pointerId: 1 }); });
        expect(container.querySelector('[data-ink-marquee]')).toBeNull();
        expect(st().selectedStrokeIds).toEqual(['a', 'b']);
    });

    test('Shift-tap adds a stroke to the selection', () => {
        const { svg } = mount();
        press(svg, [150, 100]);
        press(svg, [150, 300], [150, 300], { shiftKey: true });
        expect(st().selectedStrokeIds).toEqual(['a', 'b']);
    });

    test('dragging inside the selection moves every selected stroke once; Ctrl+Z puts them back', () => {
        const { container, svg } = mount();
        press(svg, [50, 50], [250, 350]);
        act(() => { fireEvent.pointerDown(svg, { clientX: 150, clientY: 200, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 250, clientY: 200, pointerId: 1, buttons: 1 }); });
        // While dragging the strokes ride along as a transform; the store only changes on release.
        expect(strokes()[0].pts).toEqual([100, 100, 200, 100]);
        expect(container.querySelector('[data-ink-moving]')!.getAttribute('transform')).toBe('translate(100 0)');
        act(() => { fireEvent.pointerUp(svg, { clientX: 250, clientY: 200, pointerId: 1 }); });
        expect(strokes().map(s => s.pts)).toEqual([[200, 100, 300, 100], [200, 300, 300, 300]]);
        expect(container.querySelector('[data-ink-moving]')).toBeNull();
        act(() => { st().undoStroke(); });
        expect(strokes().map(s => s.pts)).toEqual([[100, 100, 200, 100], [100, 300, 200, 300]]);
        // The outline follows the strokes back.
        expect(container.querySelector('[data-ink-selection]')!.getAttribute('x')).toBe('90');
    });

    test('a pointercancel (palm) drops a move', () => {
        const { svg } = mount();
        press(svg, [150, 100]);
        act(() => { fireEvent.pointerDown(svg, { clientX: 150, clientY: 100, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 400, clientY: 100, pointerId: 1, buttons: 1 }); });
        act(() => { fireEvent.pointerCancel(svg, { clientX: 400, clientY: 100, pointerId: 1 }); });
        expect(strokes()[0].pts).toEqual([100, 100, 200, 100]);
    });

    test('Delete and Backspace remove the selection (undoable); Escape clears it; not while typing', () => {
        const { container, svg } = mount();
        press(svg, [150, 100]);
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => { fireEvent.keyDown(input, { key: 'Delete' }); });
        expect(strokes()).toHaveLength(2);
        input.remove();
        act(() => { fireEvent.keyDown(document.body, { key: 'Delete' }); });
        expect(strokes().map(s => s.id)).toEqual(['b']);
        expect(container.querySelector('[data-ink-selection]')).toBeNull();
        act(() => { st().undoStroke(); });
        expect(strokes().map(s => s.id)).toEqual(['a', 'b']);
        press(svg, [150, 300]);
        act(() => { fireEvent.keyDown(document.body, { key: 'Backspace' }); });
        expect(strokes().map(s => s.id)).toEqual(['a']);
        press(svg, [150, 100]);
        act(() => { fireEvent.keyDown(document.body, { key: 'Escape' }); });
        expect(st().selectedStrokeIds).toEqual([]);
        expect(container.querySelector('[data-ink-selection]')).toBeNull();
    });

    test('the pen keeps drawing over a stroke: it never selects', () => {
        act(() => { st().setTool('pen'); });
        const { svg } = mount();
        press(svg, [150, 100], [180, 140]);
        expect(strokes()).toHaveLength(3);
        expect(st().selectedStrokeIds).toEqual([]);
    });
});

describe('bottom bar and routing', () => {
    test('the Selecteren (S) button and the S key pick the tool; another tool clears the selection', () => {
        act(() => { st().setTool('select'); });
        const { getByLabelText } = render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        fireEvent.click(getByLabelText('Selecteren (S)'));
        expect(st().tool).toBe('lasso');
        act(() => { st().setTool('pen'); });
        act(() => { fireEvent.keyDown(document.body, { key: 's' }); });
        expect(st().tool).toBe('lasso');
        act(() => { st().selectStrokes(['a']); });
        fireEvent.click(getByLabelText('Pen'));
        expect(st().selectedStrokeIds).toEqual([]);
    });

    test('widgets and instruments are out of reach while selecting ink', () => {
        st().addWidget({ kind: 'tekst', x: 0, y: 0, w: 360, props: { text: 'hoi' } });
        act(() => { st().setTool('lasso'); });
        st().toggleInstrument('lat', 1280, 720);
        const { container } = render(<BoardPageCanvas />);
        expect((container.querySelector('[data-widget-layer]') as HTMLElement).style.pointerEvents).toBe('none');
        expect(container.querySelector('[data-instrument="lat"]')!.hasAttribute('data-instrument-inert')).toBe(true);
    });

    test('no ink settings strip for Selecteren (it draws nothing)', () => {
        const { container } = render(<WhiteboardView />);
        expect(container.querySelector('[aria-label="Kleur bewaren"]')).toBeNull();
    });
});
