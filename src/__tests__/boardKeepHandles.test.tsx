// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { BOARD_FORMAT_VERSION, loadBoardAutosave, parseBoardFile, saveBoardAutosave } from '../board/boardPersistence';
import {
    BOARD_CM_PX, HANDLE_MARGIN_PX, PASSER, placePasserHinge, placeRotateHandle, passerPoints, rotateHandleSpots, toWorld,
} from '../board/instrumentGeometry';
import type { Instrument } from '../board/boardTypes';
import InstrumentLayer from '../board/components/InstrumentLayer';
import BoardBottomBar from '../board/components/BoardBottomBar';

// "Handvatten op het bord houden" (ARCHITECTURE §14 Meetinstrumenten): a board-level setting,
// default on, that keeps every instrument's grab handles on the board.
const st = () => useBoardStore.getState();
const page = () => st().pages[st().activePageIdx];
const one = (kind: Instrument['kind']) => (page().instruments ?? []).find(i => i.kind === kind)!;
// The board canvas at a 1280 × 720 window (the bottom bar takes the rest).
const BOARD = { w: 1280, h: 659 };
const inside = ([x, y]: [number, number], m = HANDLE_MARGIN_PX) => x >= m - 0.01 && x <= BOARD.w - m + 0.01 && y >= m - 0.01 && y <= BOARD.h - m + 0.01;
const lat45: Instrument = { id: 'l', kind: 'lat', x: 700, y: 250, rotation: 45 };

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'select', gridSnap: false, gridSize: 40, _redoStrokes: [], boardSettings: { keepHandles: true } });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('geometry', () => {
    test('a lat at 45° at 1280 keeps its rotate handle inside: it moves to the 0 end', () => {
        const def = rotateHandleSpots('lat')[0];
        expect(inside(toWorld(lat45, def[0], def[1]))).toBe(false);
        const got = placeRotateHandle(lat45, BOARD, true);
        expect(got.chip).toBe(false);
        expect(got.at).toEqual(rotateHandleSpots('lat')[1]);
        expect(inside(toWorld(lat45, got.at[0], got.at[1]))).toBe(true);
    });

    test('toggle off (or no measured board) = today: always the default spot', () => {
        expect(placeRotateHandle(lat45, BOARD, false)).toEqual({ at: rotateHandleSpots('lat')[0], chip: false });
        expect(placeRotateHandle(lat45, null, true)).toEqual({ at: rotateHandleSpots('lat')[0], chip: false });
        expect(placePasserHinge({ id: 'p', kind: 'passer', x: 600, y: 60, rotation: 0, radius: 20 * BOARD_CM_PX }, BOARD, false))
            .toEqual({ side: -1, chip: null });
    });

    test('a geodriehoek turned upside down by the bottom edge finds a spot on the board', () => {
        const geo: Instrument = { id: 'g', kind: 'geodriehoek', x: 640, y: 560, rotation: 0 };
        const got = placeRotateHandle(geo, BOARD, true);
        expect(inside(toWorld(geo, got.at[0], got.at[1]))).toBe(true);
    });

    test('nothing on the board: the handle becomes a chip at the nearest edge', () => {
        // the whole lat hangs off the right edge
        const off: Instrument = { id: 'l', kind: 'lat', x: 1400, y: 300, rotation: 0 };
        const got = placeRotateHandle(off, BOARD, true);
        expect(got.chip).toBe(true);
        const [wx, wy] = toWorld(off, got.at[0], got.at[1]);
        expect(wx).toBeCloseTo(BOARD.w - HANDLE_MARGIN_PX, 6);
        expect(inside([wx, wy])).toBe(true);
    });

    test('passer with a wide opening by the top edge: the hinge mirrors below the chord', () => {
        const p: Instrument = { id: 'p', kind: 'passer', x: 400, y: 120, rotation: 0, radius: 20 * BOARD_CM_PX };
        expect(inside(passerPoints(p, -1).hinge)).toBe(false);
        const got = placePasserHinge(p, BOARD, true);
        expect(got).toEqual({ side: 1, chip: null });
        expect(inside(passerPoints(p, 1).hinge)).toBe(true);
    });

    test('passer hinge off on both sides: a chip at the nearest edge keeps a reachable grab', () => {
        // nearly closed: the legs stand ~12 cm off the chord, more than the board has above or below
        const p: Instrument = { id: 'p', kind: 'passer', x: 600, y: 330, rotation: 0, radius: PASSER.minR };
        expect(inside(passerPoints(p, -1).hinge)).toBe(false);
        expect(inside(passerPoints(p, 1).hinge)).toBe(false);
        const got = placePasserHinge(p, BOARD, true);
        expect(got.side).toBe(-1);
        expect(got.chip).not.toBeNull();
        const w = toWorld(p, got.chip![0], got.chip![1]);
        expect(inside(w)).toBe(true);
        expect(w[1]).toBeCloseTo(HANDLE_MARGIN_PX, 6);
    });
});

describe('layer', () => {
    beforeEach(() => {
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
            { x: 0, y: 0, left: 0, top: 0, width: BOARD.w, height: BOARD.h, right: BOARD.w, bottom: BOARD.h, toJSON: () => ({}) } as DOMRect);
    });
    const handleWorld = (c: HTMLElement, kind: string): [number, number] => {
        const g = c.querySelector(`[data-instrument="${kind}"]`)!;
        const [, x, y, rot] = g.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/)!.map(Number);
        const h = g.querySelector('[data-instrument-grip="rotate"]')!;
        const [, hx, hy] = h.getAttribute('transform')!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!.map(Number);
        return toWorld({ x, y, rotation: rot }, hx, hy);
    };

    test('lat at 45° at 1280: the rendered rotate handle is on the board; off = the old spot past the edge', () => {
        st().toggleInstrument('lat');
        st().updateInstrument(one('lat').id, { x: lat45.x, y: lat45.y, rotation: 45 });
        const { container, rerender } = render(<InstrumentLayer />);
        expect(inside(handleWorld(container, 'lat'))).toBe(true);
        act(() => { st().setKeepHandles(false); });
        rerender(<InstrumentLayer />);
        expect(inside(handleWorld(container, 'lat'))).toBe(false);
    });

    test('the moved handle still turns the lat about its zero', () => {
        st().toggleInstrument('lat');
        st().updateInstrument(one('lat').id, { x: lat45.x, y: lat45.y, rotation: 45 });
        const { container } = render(<InstrumentLayer />);
        const h = container.querySelector('[data-instrument="lat"] [data-instrument-grip="rotate"]')!;
        const [hx, hy] = handleWorld(container, 'lat');
        act(() => { fireEvent.pointerDown(h, { clientX: hx, clientY: hy, pointerId: 1 }); });
        // swing the handle 30° further round the zero (700, 250)
        const a = Math.atan2(hy - 250, hx - 700) + Math.PI / 6, d = Math.hypot(hx - 700, hy - 250);
        act(() => { fireEvent.pointerMove(h, { clientX: 700 + d * Math.cos(a), clientY: 250 + d * Math.sin(a), pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(h, { pointerId: 1 }); });
        expect(one('lat').rotation).toBeCloseTo(75, 0);
        expect(one('lat')).toMatchObject({ x: 700, y: 250 });
    });

    test('passer with its hinge off on both sides: an on-board chip that moves it; off = no chip', () => {
        st().toggleInstrument('passer');
        st().updateInstrument(one('passer').id, { x: 600, y: 330, rotation: 0, radius: PASSER.minR });
        const { container, rerender } = render(<InstrumentLayer />);
        const chip = container.querySelector('[data-passer-part="hinge-chip"]')!;
        expect(chip).not.toBeNull();
        act(() => { fireEvent.pointerDown(chip, { clientX: 609, clientY: HANDLE_MARGIN_PX, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(chip, { clientX: 509, clientY: HANDLE_MARGIN_PX + 40, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(chip, { pointerId: 1 }); });
        expect(one('passer')).toMatchObject({ x: 500, y: 370 });
        act(() => { st().setKeepHandles(false); });
        rerender(<InstrumentLayer />);
        expect(container.querySelector('[data-passer-part="hinge-chip"]')).toBeNull();
    });
});

describe('setting: popover, store, persistence', () => {
    test('the Meetinstrumenten popover toggles "Handvatten op het bord houden" (default on)', () => {
        render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        act(() => { fireEvent.click(screen.getByLabelText('Meetinstrumenten')); });
        const box = screen.getByRole('checkbox', { name: 'Handvatten op het bord houden' }) as HTMLInputElement;
        expect(box.checked).toBe(true);
        act(() => { fireEvent.click(box); });
        expect(st().boardSettings.keepHandles).toBe(false);
        expect(box.checked).toBe(false);
    });

    test('saved with the board and page-independent; absent or junk reads as on', () => {
        const bare = { id: 'p', widgets: [], strokes: [], background: { pattern: 'blanco', dark: false } };
        const file = (settings?: unknown) => JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [bare, { ...bare, id: 'q' }], settings });
        expect(parseBoardFile(file())!.settings).toEqual({ keepHandles: true });
        expect(parseBoardFile(file({ keepHandles: 'nee' }))!.settings).toEqual({ keepHandles: true });
        expect(parseBoardFile(file({ keepHandles: false }))!.settings).toEqual({ keepHandles: false });
        st().setKeepHandles(false);
        saveBoardAutosave(st().pages, 0, st().boardSettings);
        expect(loadBoardAutosave()!.settings).toEqual({ keepHandles: false });
        // a loaded board brings its setting; switching pages does not touch it
        const f = parseBoardFile(file({ keepHandles: true }))!;
        st().loadBoard(f.pages, 0, f.settings);
        expect(st().boardSettings.keepHandles).toBe(true);
        st().setKeepHandles(false);
        st().gotoPage(1);
        expect(st().boardSettings.keepHandles).toBe(false);
    });
});
