// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { TOOL_CATALOG, runTool } from '../board/toolCatalog';
import { addBasicWidget } from '../board/addWidgets';
import { makeBoardBlock } from '../board/boardBlocks';
import { NATURAL_W, KINDS_WITH_SETTINGS, NAMES_KEY } from '../board/widgetSizing';
import { DEFAULT_BASE } from '../config/baseSettings';
import WhiteboardView from '../board/components/WhiteboardView';
import type { WidgetKind } from '../board/boardTypes';

// Smoke: the whole board overlay with one of every widget the add panel offers (plus tekst,
// afbeelding, geld-item and an exercise card) mounts on a light and a dark board, opens
// every settings panel, logs no console.error and prints no "undefined" / "NaN".
const st = () => useBoardStore.getState();
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const WEATHER = {
    current: { temperature_2m: 12.4, weather_code: 3 },
    daily: { temperature_2m_min: [6.1], temperature_2m_max: [14.9], sunrise: ['2026-10-08T07:58'], sunset: ['2026-10-08T19:12'], precipitation_probability_max: [40], precipitation_sum: [1.2] },
};

let errorSpy: MockInstance;

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'select', inspectorOpen: false, geldPaletOpen: false });
    localStorage.setItem(NAMES_KEY, 'Ana\nBert\nCas\nDina\nEli\nFien');
    // Weer: geolocation denied → Brussels; the forecast comes from a stub, never the network.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(WEATHER) })));
    Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: { getCurrentPosition: (_ok: unknown, denied: () => void) => denied() },
    });
    // Silenced, not dropped: every test asserts on the captured calls.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
});

// One widget of every kind, each through the path the UI uses to add it.
function fillBoard() {
    for (const def of TOOL_CATALOG) runTool(def);
    addBasicWidget('afbeelding', { src: PNG_1PX }, 420);
    addBasicWidget('tekst', { text: 'Welkom in de klas' }, 360);
    st().addWidget({ kind: 'geld-item', x: 900, y: 40, w: 100, props: { showHeader: false } });
    const block = makeBoardBlock('cijferen-optellen-nat', { override: { operator: '+', numberType: 'natural' }, leafId: 'cijferen-optellen-nat', base: DEFAULT_BASE, grade: null })!;
    st().addWidget({ kind: 'exercise', x: 40, y: 400, w: 660, block, showAnswer: true, props: { title: 'Cijferen' } });
    st().selectWidget(null);
}

const kindsOnBoard = () => new Set(st().pages[0].widgets.map((w) => w.kind));
const errors = () => errorSpy.mock.calls.map((c) => c.map(String).join(' '));

async function settle() {
    // Let the stubbed weather promise chain resolve inside act.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

describe('the full board', () => {
    test('the add panel catalogue + the direct adds cover every widget kind', () => {
        fillBoard();
        expect(kindsOnBoard()).toEqual(new Set(Object.keys(NATURAL_W) as WidgetKind[]));
    });

    test.each([false, true])('every widget mounts clean (dark board: %s)', async (dark) => {
        fillBoard();
        st().setBackground({ pattern: 'raster', dark });
        const { container } = render(<WhiteboardView />);
        await settle();
        const overlay = container.firstElementChild as HTMLElement;
        expect(overlay.classList.contains('no-print')).toBe(true);
        expect(overlay.querySelectorAll('[data-widget-body]')).toHaveLength(st().pages[0].widgets.length);
        // The widget boundary renders its message instead of a widget that threw.
        expect(overlay.textContent).not.toMatch(/Widget \(/);
        expect(overlay.textContent).not.toMatch(/undefined|NaN/);
        expect(errors()).toEqual([]);
        // The stubbed forecast reached the weer widget.
        expect(overlay.textContent).toContain('12');
    });

    test('the geld dock opens over the board without errors', async () => {
        fillBoard();
        render(<WhiteboardView />);
        expect(st().geldPaletOpen).toBe(true);
        await settle();
        expect(document.body.textContent).not.toMatch(/undefined|NaN/);
        expect(errors()).toEqual([]);
    });

    test('the groepjesmaker deals the class list on a tap', async () => {
        fillBoard();
        render(<WhiteboardView />);
        act(() => { fireEvent.click(screen.getByText('Maak groepen')); });
        expect(screen.getByText('Groep 1')).toBeTruthy();
        expect(document.body.textContent).not.toMatch(/undefined|NaN/);
        expect(errors()).toEqual([]);
    });

    test('the ink settings strip mounts for pen and marker', () => {
        for (const tool of ['pen', 'marker'] as const) {
            st().setTool(tool);
            const { unmount } = render(<WhiteboardView />);
            expect(document.body.textContent).not.toMatch(/undefined|NaN/);
            unmount();
        }
        expect(errors()).toEqual([]);
    });
});

describe('every settings panel', () => {
    // Fixed 2026-10-08 (WB3): Werksymbolen rows have React keys.
    const panels = KINDS_WITH_SETTINGS.filter((k) => k !== 'werksymbolen');

    test.each(panels)('%s: the ⚙ panel opens clean', async (kind) => {
        fillBoard();
        const w = st().pages[0].widgets.find((x) => x.kind === kind)!;
        st().selectWidget(w.id);
        st().setInspectorOpen(true);
        const { container } = render(<WhiteboardView />);
        await settle();
        expect(container.textContent).not.toMatch(/undefined|NaN/);
        expect(errors()).toEqual([]);
    });

    test('werksymbolen: the ⚙ panel opens clean', async () => {
        fillBoard();
        const w = st().pages[0].widgets.find((x) => x.kind === 'werksymbolen')!;
        st().selectWidget(w.id);
        st().setInspectorOpen(true);
        render(<WhiteboardView />);
        await settle();
        expect(errors()).toEqual([]);
    });

    test('the ⚙ in a title bar opens the panel for that widget', () => {
        const id = addBasicWidget('klok', { hours: 9, minutes: 0 }, 300);
        st().selectWidget(null);
        render(<WhiteboardView />);
        act(() => { fireEvent.click(screen.getByLabelText('Widget-instellingen')); });
        expect(st().selectedWidgetId).toBe(id);
        expect(st().inspectorOpen).toBe(true);
    });
});
