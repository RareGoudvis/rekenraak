// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { effectiveInk, useBoardStore } from '../board/useBoardStore';
import { BOARD_INK_KEY, loadInkSettings } from '../board/boardPersistence';
import { DEFAULT_INK } from '../board/boardTypes';
import InkLayer from '../board/components/InkLayer';
import InkSettingsBar from '../board/components/InkSettingsBar';

// Owner call: the pen's default colour follows the board (black on a light board, white on a
// dark one) until the teacher picks a colour; a picked colour, black included, never changes.
const st = () => useBoardStore.getState();
const page = () => st().pages[st().activePageIdx];
const BLACK = DEFAULT_INK.pen.light, WHITE = DEFAULT_INK.pen.dark;
const setDark = (dark: boolean) => act(() => { st().setBackground({ pattern: 'blanco', dark }); });

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'pen', _redoStrokes: [], inkSettings: loadInkSettings() });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
});

function drawPen(container: HTMLElement, y = 20) {
    const svg = container.querySelector('svg')!;
    act(() => { fireEvent.pointerDown(svg, { clientX: 10, clientY: y, pointerId: 1 }); });
    act(() => { fireEvent.pointerMove(svg, { clientX: 40, clientY: y + 5, pointerId: 1 }); });
    act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
}

describe('store', () => {
    test('an untouched pen is "default", black on a light board and white on a dark one; lijn too', () => {
        expect(st().inkSettings.pen.color).toBeNull();
        expect(effectiveInk(st(), 'pen').color).toBe(BLACK);
        expect(effectiveInk(st(), 'line').color).toBe(BLACK);
        setDark(true);
        expect(effectiveInk(st(), 'pen').color).toBe(WHITE);
        expect(effectiveInk(st(), 'line').color).toBe(WHITE);
        // the highlighter's yellow and the vormen blue read on both boards: they stay
        expect(effectiveInk(st(), 'marker').color).toBe(DEFAULT_INK.marker.light);
        setDark(false);
        expect(effectiveInk(st(), 'pen').color).toBe(BLACK);
    });

    test('a picked colour is never touched by a board switch, chosen black included', () => {
        st().setInkSetting('pen', { color: '#dc2626' });
        setDark(true);
        expect(effectiveInk(st(), 'pen').color).toBe('#dc2626');
        setDark(false);
        expect(effectiveInk(st(), 'pen').color).toBe('#dc2626');
        st().setInkSetting('pen', { color: BLACK });
        setDark(true);
        expect(effectiveInk(st(), 'pen').color).toBe(BLACK);
        // back to Standaard: follows the board again
        st().setInkSetting('pen', { color: null });
        expect(effectiveInk(st(), 'pen').color).toBe(WHITE);
    });

    test('the default follows the page: a dark page and a light page each get their own', () => {
        setDark(true);
        act(() => { st().addPage(); });
        expect(effectiveInk(st(), 'pen').color).toBe(BLACK);
        act(() => { st().gotoPage(0); });
        expect(effectiveInk(st(), 'pen').color).toBe(WHITE);
    });
});

describe('ink layer', () => {
    test('on a dark board the default pen draws white; existing strokes keep their colour', () => {
        setDark(true);
        const { container } = render(<InkLayer active />);
        drawPen(container);
        expect(page().strokes[0].color).toBe(WHITE);
        setDark(false);
        drawPen(container, 60);
        expect(page().strokes.map(s => s.color)).toEqual([WHITE, BLACK]);
    });

    test('after picking red a dark / light switch keeps drawing red', () => {
        st().setInkSetting('pen', { color: '#dc2626' });
        setDark(true);
        const { container } = render(<InkLayer active />);
        drawPen(container);
        setDark(false);
        drawPen(container, 60);
        expect(page().strokes.map(s => s.color)).toEqual(['#dc2626', '#dc2626']);
    });

    test('the lijn tool on a dark board draws white by default', () => {
        setDark(true);
        act(() => { st().setTool('line'); });
        const { container } = render(<InkLayer active />);
        drawPen(container);
        expect(page().strokes[0]).toMatchObject({ tool: 'line', color: WHITE });
    });
});

describe('settings bar', () => {
    test('Standaard swatch shows the effective default and is pressed while un-customised', () => {
        setDark(true);
        render(<InkSettingsBar tool="pen" />);
        const std = screen.getByRole('button', { name: 'Standaardkleur (volgt het bord)' });
        expect(std.getAttribute('aria-pressed')).toBe('true');
        expect(std.style.background).toBe('rgb(255, 255, 255)');
        // the width dots show the ink the pen will draw with
        expect((screen.getByRole('button', { name: 'Dikte 4' }).firstChild as HTMLElement).style.background).toBe('rgb(255, 255, 255)');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Kleur #dc2626' })); });
        expect(st().inkSettings.pen.color).toBe('#dc2626');
        expect(std.getAttribute('aria-pressed')).toBe('false');
        act(() => { fireEvent.click(std); });
        expect(st().inkSettings.pen.color).toBeNull();
    });

    test('the marker has no Standaard swatch: its yellow is ringed as before', () => {
        render(<InkSettingsBar tool="marker" />);
        expect(screen.queryByRole('button', { name: 'Standaardkleur (volgt het bord)' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Kleur #fde047' }).style.outline).toContain('solid');
    });
});

describe('persistence', () => {
    test('"customised" survives a reload: a picked colour and a default each come back as they were', async () => {
        st().setInkSetting('pen', { color: '#dc2626', width: 7 });
        st().setInkSetting('line', { width: 2 });
        const saved = JSON.parse(localStorage.getItem(BOARD_INK_KEY)!);
        expect(saved.pen).toEqual({ color: '#dc2626', width: 7 });
        expect(saved.line).toEqual({ color: null, width: 2 });
        // a fresh module = a page reload
        vi.resetModules();
        const fresh = (await import('../board/useBoardStore')).useBoardStore.getState();
        expect(fresh.inkSettings.pen).toEqual({ color: '#dc2626', width: 7 });
        expect(fresh.inkSettings.line).toEqual({ color: null, width: 2 });
    });

    test('junk in storage reads as the defaults, tool by tool', () => {
        localStorage.setItem(BOARD_INK_KEY, JSON.stringify({ pen: { color: 'rood', width: -3 }, marker: { color: '#00ff00', width: 'dik' }, line: 7 }));
        const ink = loadInkSettings();
        expect(ink.pen).toEqual({ color: null, width: DEFAULT_INK.pen.width });
        expect(ink.marker).toEqual({ color: '#00ff00', width: DEFAULT_INK.marker.width });
        expect(ink.line).toEqual({ color: null, width: DEFAULT_INK.line.width });
        localStorage.setItem(BOARD_INK_KEY, '{nope');
        expect(loadInkSettings().shape).toEqual({ color: null, width: DEFAULT_INK.shape.width });
    });
});
