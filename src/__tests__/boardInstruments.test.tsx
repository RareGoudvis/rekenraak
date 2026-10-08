// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { BOARD_FORMAT_VERSION, parseBoardFile } from '../board/boardPersistence';
import { BOARD_CM_PX, LAT, PASSER, round1 } from '../board/instrumentGeometry';
import type { Instrument, Stroke } from '../board/boardTypes';
import InstrumentLayer from '../board/components/InstrumentLayer';
import InkLayer from '../board/components/InkLayer';
import BoardBottomBar from '../board/components/BoardBottomBar';
import BoardPageCanvas from '../board/components/BoardPageCanvas';

// The meetinstrumenten mechanism (ARCHITECTURE §14): the per-page instruments in the store,
// format v2 in the strict parser, and the layer's drag / rotate / snap / keyboard under
// simulated pointers (jsdom: the layer's rect is 0,0 so clientX/Y are board coordinates).
const st = () => useBoardStore.getState();
const page = () => st().pages[st().activePageIdx];
const insts = () => page().instruments ?? [];
const one = (kind: Instrument['kind']) => insts().find(i => i.kind === kind)!;
const stroke = (id: string, path: string): Stroke => ({ id, tool: 'pen', color: '#000', width: 4, path, pts: [] });

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'select', gridSnap: false, gridSize: 40, _redoStrokes: [] });
});

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe('store', () => {
    test('a toggle adds one instrument of a kind and selects it; a second toggle removes it', () => {
        st().toggleInstrument('lat', 1920, 1000);
        expect(insts()).toHaveLength(1);
        expect(st().selectedInstrumentId).toBe(one('lat').id);
        st().toggleInstrument('geodriehoek');
        st().toggleInstrument('passer');
        expect(insts().map(i => i.kind)).toEqual(['lat', 'geodriehoek', 'passer']);
        const geo = one('geodriehoek').id;
        st().selectInstrument(geo);
        st().toggleInstrument('geodriehoek');
        expect(insts().map(i => i.kind)).toEqual(['lat', 'passer']);
        expect(st().selectedInstrumentId).toBeNull();
    });

    test('update patches one instrument; remove and hide-all deselect', () => {
        st().toggleInstrument('lat');
        st().toggleInstrument('passer');
        const id = one('lat').id;
        st().updateInstrument(id, { x: 5, rotation: 45 });
        expect(one('lat')).toMatchObject({ x: 5, rotation: 45 });
        st().selectInstrument(id);
        st().removeInstrument(id);
        expect(st().selectedInstrumentId).toBeNull();
        st().hideAllInstruments();
        expect(insts()).toEqual([]);
    });

    test('instruments are per page; clearing a page keeps them (tools, not content)', () => {
        st().toggleInstrument('lat');
        st().addStroke(stroke('s', 'M 0 0 L 1 1'));
        st().clearActivePage();
        expect(insts()).toHaveLength(1);
        expect(page().strokes).toHaveLength(0);
        st().addPage();
        expect(insts()).toEqual([]);
        expect(st().selectedInstrumentId).toBeNull();
        st().gotoPage(0);
        expect(insts()).toHaveLength(1);
    });

    test('a duplicated page copies the instruments with fresh ids', () => {
        st().toggleInstrument('lat');
        st().toggleInstrument('passer');
        const before = insts().map(i => i.id);
        st().duplicatePage();
        expect(insts().map(i => i.kind)).toEqual(['lat', 'passer']);
        expect(insts().some(i => before.includes(i.id))).toBe(false);
        st().updateInstrument(one('lat').id, { x: -1 });
        expect(st().pages[0].instruments!.find(i => i.kind === 'lat')!.x).not.toBe(-1);
    });
});

describe('persistence (format v2)', () => {
    const file = (pages: unknown[], version = BOARD_FORMAT_VERSION) => JSON.stringify({ version, exportedAt: 'x', pages });
    const bare = { id: 'p', widgets: [], strokes: [], background: { pattern: 'blanco', dark: false } };

    test('the format is v2 and a v1 board (no instruments field) still loads, unchanged', () => {
        expect(BOARD_FORMAT_VERSION).toBe(2);
        const f = parseBoardFile(file([bare], 1))!;
        expect(f.version).toBe(2);
        expect(f.pages[0]).toEqual(bare);
        expect('instruments' in f.pages[0]).toBe(false);
    });

    test('instruments round-trip', () => {
        const instruments: Instrument[] = [
            { id: 'a', kind: 'lat', x: 10, y: 20, rotation: 45 },
            { id: 'b', kind: 'geodriehoek', x: 1, y: 2, rotation: 0, scale: 1 },
            { id: 'c', kind: 'passer', x: 3, y: 4, rotation: 90, radius: 120 },
        ];
        expect(parseBoardFile(file([{ ...bare, instruments }]))!.pages[0].instruments).toEqual(instruments);
    });

    test('junk instruments are dropped, a second of a kind too; the passer opening is clamped or defaulted', () => {
        const instruments = [
            { id: 'a', kind: 'lat', x: 10, y: 20, rotation: 0 },
            { id: 'dup', kind: 'lat', x: 0, y: 0, rotation: 0 },
            { id: 'x', kind: 'kompas', x: 0, y: 0, rotation: 0 },
            { id: 'y', kind: 'geodriehoek', x: 'nan', y: 0, rotation: 0 },
            { kind: 'geodriehoek', x: 0, y: 0, rotation: 0 },
            { id: 'z', kind: 'geodriehoek', x: 0, y: 0 },
            { id: 'p', kind: 'passer', x: 0, y: 0, rotation: 0, radius: 1e9, scale: -1 },
            null, 7,
        ];
        const got = parseBoardFile(file([{ ...bare, instruments }]))!.pages[0].instruments!;
        expect(got.map(i => i.id)).toEqual(['a', 'p']);
        expect(got[1].radius).toBe(PASSER.maxR);
        expect(got[1].scale).toBeUndefined();
        const noR = parseBoardFile(file([{ ...bare, instruments: [{ id: 'p', kind: 'passer', x: 0, y: 0, rotation: 0 }] }]))!;
        expect(noR.pages[0].instruments![0].radius).toBeCloseTo(5 * BOARD_CM_PX);
        expect(parseBoardFile(file([{ ...bare, instruments: 'x' }]))!.pages[0].instruments).toEqual([]);
    });

    test('a newer format is still refused', () => {
        expect(parseBoardFile(file([bare], 3))).toBeNull();
    });
});

describe('layer: drag, rotate, snap, keyboard', () => {
    const grip = (c: HTMLElement, kind: string, g: string) => c.querySelector(`[data-instrument="${kind}"] [data-instrument-grip="${g}"]`)!;
    const place = (kind: Instrument['kind'], patch: Partial<Instrument> = {}) => {
        st().toggleInstrument(kind);
        st().updateInstrument(one(kind).id, { x: 200, y: 200, rotation: 0, ...patch });
    };
    const dragOn = (el: Element, from: [number, number], to: [number, number]) => {
        act(() => { fireEvent.pointerDown(el, { clientX: from[0], clientY: from[1], pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(el, { clientX: to[0], clientY: to[1], pointerId: 1 }); });
    };

    test('a body drag moves the reference point by the pointer delta', () => {
        place('lat');
        const { container } = render(<InstrumentLayer />);
        const g = grip(container, 'lat', 'body');
        dragOn(g, [300, 230], [333, 251]);
        expect(one('lat')).toMatchObject({ x: 233, y: 221 });
        expect(container.querySelector('[data-snap-dot]')).toBeNull();
        act(() => { fireEvent.pointerUp(g, { pointerId: 1 }); });
        expect(st().selectedInstrumentId).toBe(one('lat').id);
    });

    test('with the grid on the reference point snaps to a grid point within 8 px, with a snap dot', () => {
        useBoardStore.setState({ gridSnap: true, gridSize: 40 });
        place('geodriehoek');
        const { container } = render(<InstrumentLayer />);
        const g = grip(container, 'geodriehoek', 'body');
        dragOn(g, [200, 250], [245, 286]);   // raw 245,236 → grid 240,240
        expect(one('geodriehoek')).toMatchObject({ x: 240, y: 240 });
        const dot = container.querySelector('[data-snap-dot]')!;
        expect([dot.getAttribute('cx'), dot.getAttribute('cy')]).toEqual(['240', '240']);
        act(() => { fireEvent.pointerUp(g, { pointerId: 1 }); });
        expect(container.querySelector('[data-snap-dot]')).toBeNull();
    });

    test('stroke endpoints snap always (grid off), and the passer needle snaps too', () => {
        st().addStroke(stroke('l', 'M 500 300 L 700 300'));
        place('passer');
        const { container } = render(<InstrumentLayer />);
        const g = grip(container, 'passer', 'body');
        dragOn(g, [200, 200], [695, 305]);
        expect(one('passer')).toMatchObject({ x: 700, y: 300 });
        expect(container.querySelector('[data-snap-dot]')).not.toBeNull();
    });

    test('the rotate handle turns around the reference point and snaps to 45°', () => {
        place('lat');
        const { container } = render(<InstrumentLayer />);
        const h = grip(container, 'lat', 'rotate');
        // start straight right of the pivot, end at 44° → snaps to 45
        const a = (44 * Math.PI) / 180;
        dragOn(h, [300, 200], [200 + 100 * Math.cos(a), 200 + 100 * Math.sin(a)]);
        expect(one('lat').rotation).toBe(45);
        expect(container.querySelector('[data-instrument-readout]')!.textContent).toBe('45°');
        expect(container.querySelector('[data-snap-dot]')).not.toBeNull();
        expect(one('lat')).toMatchObject({ x: 200, y: 200 });
    });

    test('rotation snaps to 15° only with the grid on', () => {
        place('geodriehoek');
        const { container } = render(<InstrumentLayer />);
        const h = grip(container, 'geodriehoek', 'rotate');
        const a = (31 * Math.PI) / 180;
        dragOn(h, [300, 200], [200 + 100 * Math.cos(a), 200 + 100 * Math.sin(a)]);
        expect(one('geodriehoek').rotation).toBeCloseTo(31, 0);
        act(() => { fireEvent.pointerUp(h, { pointerId: 1 }); });
        act(() => {
            useBoardStore.setState({ gridSnap: true });
            st().updateInstrument(one('geodriehoek').id, { rotation: 0 });
        });
        dragOn(h, [300, 200], [200 + 100 * Math.cos(a), 200 + 100 * Math.sin(a)]);
        expect(one('geodriehoek').rotation).toBe(30);
    });

    test('keyboard on the selected instrument: arrows, Shift, [ ], R, Escape', () => {
        place('lat');
        st().selectInstrument(one('lat').id);
        render(<InstrumentLayer />);
        const key = (k: string, shiftKey = false) => act(() => { fireEvent.keyDown(document, { key: k, shiftKey }); });
        key('ArrowRight'); key('ArrowDown', true);
        expect(one('lat')).toMatchObject({ x: 201, y: 210 });
        key(']'); key(']', true);
        expect(one('lat').rotation).toBe(16);
        key('['); key('[');
        expect(one('lat').rotation).toBe(14);
        key('R');
        expect(one('lat').rotation).toBe(0);
        key('[');
        expect(one('lat').rotation).toBe(359);
        key('Escape');
        expect(st().selectedInstrumentId).toBeNull();
        key('ArrowLeft');
        expect(one('lat').x).toBe(201);
    });

    test('typing in a field never moves the instrument', () => {
        place('lat');
        st().selectInstrument(one('lat').id);
        render(<><InstrumentLayer /><input aria-label="veld" /></>);
        act(() => { fireEvent.keyDown(screen.getByLabelText('veld'), { key: 'ArrowRight' }); });
        expect(one('lat').x).toBe(200);
    });

    test('while an ink tool is active only the inset core grabs (the edge band draws)', () => {
        place('lat');
        const { container, rerender } = render(<InstrumentLayer />);
        const firstY = () => Number(grip(container, 'lat', 'body').getAttribute('points')!.split(' ')[0].split(',')[1]);
        expect(firstY()).toBe(0);
        act(() => { st().setTool('pen'); });
        rerender(<InstrumentLayer />);
        expect(firstY()).toBe(10);
    });

    test('a press on an instrument does not reach the canvas (no deselect, no text widget)', () => {
        place('lat');
        st().setTool('text');
        const { container } = render(<BoardPageCanvas />);
        act(() => { fireEvent.pointerDown(grip(container, 'lat', 'body'), { clientX: 300, clientY: 230, pointerId: 1 }); });
        expect(page().widgets).toHaveLength(0);
        expect(st().selectedInstrumentId).toBe(one('lat').id);
        act(() => { fireEvent.pointerUp(grip(container, 'lat', 'body'), { pointerId: 1 }); });
        act(() => { st().setTool('select'); });
        act(() => { fireEvent.pointerDown(container.querySelector('[data-board-canvas]')!, { clientX: 1500, clientY: 900 }); });
        expect(st().selectedInstrumentId).toBeNull();
    });
});

describe('lat: the pen follows its edge', () => {
    const placeLat = () => {
        st().toggleInstrument('lat');
        st().updateInstrument(one('lat').id, { x: 200, y: 200, rotation: 0 });
    };
    const inkSvg = (c: HTMLElement) => c.querySelector('svg:not([data-instrument-layer])')!;
    const end5 = round1(200 + 5 * BOARD_CM_PX);

    test('a wobbly pen drag started on the edge commits one straight stroke, readout while drawing', () => {
        placeLat();
        st().setTool('pen');
        st().setInkSetting('pen', { color: '#123456', width: 6 });
        const { container } = render(<InkLayer active />);
        const svg = inkSvg(container);
        act(() => { fireEvent.pointerDown(svg, { clientX: 200.5, clientY: 195, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 260, clientY: 207, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 200 + 5 * BOARD_CM_PX + 1, clientY: 193, pointerId: 1 }); });
        expect(container.querySelector('[data-instrument-readout]')!.textContent).toBe('5,0 cm');
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes).toHaveLength(1);
        expect(page().strokes[0]).toMatchObject({ tool: 'pen', color: '#123456', width: 6, opacity: 1, path: `M 200 200 L ${end5} 200` });
        expect(container.querySelector('[data-instrument-readout]')).toBeNull();
    });

    test('the marker follows the back edge too; away from the lat the pen is freehand', () => {
        placeLat();
        st().setTool('marker');
        const { container } = render(<InkLayer active />);
        const svg = inkSvg(container);
        const back = 200 + LAT.h;
        act(() => { fireEvent.pointerDown(svg, { clientX: 220, clientY: back + 6, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 300, clientY: back - 3, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes[0]).toMatchObject({ tool: 'marker', opacity: 0.45 });
        expect(page().strokes[0].path).toMatch(new RegExp(`^M [\\d.]+ ${round1(back)} L [\\d.]+ ${round1(back)}$`));
        act(() => { fireEvent.pointerDown(svg, { clientX: 300, clientY: 600, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 310, clientY: 610, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 330, clientY: 605, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes[1].path).toContain(' Q ');
    });

    test('the eraser removes a ruled line anywhere along it', () => {
        placeLat();
        st().setTool('pen');
        const { container, rerender } = render(<InkLayer active />);
        const svg = inkSvg(container);
        act(() => { fireEvent.pointerDown(svg, { clientX: 200, clientY: 198, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 600, clientY: 198, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes).toHaveLength(1);
        act(() => { st().setTool('eraser'); });
        rerender(<InkLayer active />);
        act(() => { fireEvent.pointerDown(svg, { clientX: 420, clientY: 190, pointerId: 1 }); });
        expect(page().strokes).toHaveLength(0);
    });
});

describe('bottom bar: Meetinstrumenten popover', () => {
    test('three toggles + Alles verbergen; the pen stays the active tool', () => {
        st().setTool('pen');
        render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        act(() => { fireEvent.click(screen.getByLabelText('Meetinstrumenten')); });
        for (const n of ['Lat', 'Geodriehoek', 'Passer']) act(() => { fireEvent.click(screen.getByRole('button', { name: n })); });
        expect(insts().map(i => i.kind)).toEqual(['lat', 'geodriehoek', 'passer']);
        expect(screen.getByRole('button', { name: 'Lat: aan' }).getAttribute('aria-pressed')).toBe('true');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lat: aan' })); });
        expect(insts().map(i => i.kind)).toEqual(['geodriehoek', 'passer']);
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Alles verbergen' })); });
        expect(insts()).toEqual([]);
        expect(st().tool).toBe('pen');
    });

    test('Escape closes the popover', () => {
        render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        act(() => { fireEvent.click(screen.getByLabelText('Meetinstrumenten')); });
        expect(screen.getByText('Alles verbergen')).toBeTruthy();
        act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
        expect(screen.queryByText('Alles verbergen')).toBeNull();
    });
});

