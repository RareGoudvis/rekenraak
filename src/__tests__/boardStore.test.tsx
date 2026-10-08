// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { BOARD_AUTOSAVE_KEY, BOARD_FORMAT_VERSION, loadBoardAutosave } from '../board/boardPersistence';
import { makeBoardBlock } from '../board/boardBlocks';
import { emptyPage, type BoardWidget, type Stroke } from '../board/boardTypes';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
import BoardInspector from '../board/components/BoardInspector';
import BoardPageCanvas from '../board/components/BoardPageCanvas';
import InkLayer from '../board/components/InkLayer';
import type { MathBlock } from '../services/math/types';

// The board store: widgets, z-order, pages, selection/inspector, ink undo/redo, hydration
// and autosave, plus the draftBlocks mirror that lets the sheet's config plugins edit a
// board block without it ever entering the worksheet. The board has no widget history:
// only ink has undo/redo (ARCHITECTURE §14).
const st = () => useBoardStore.getState();
const page = (i = st().activePageIdx) => st().pages[i];
const find = (id: string) => st().pages.flatMap((p) => p.widgets).find((w) => w.id === id)!;
const tekst = (x = 0, y = 0): Omit<BoardWidget, 'id' | 'z'> => ({ kind: 'tekst', x, y, w: 360, props: { text: 'hoi' } });
const stroke = (id: string, pts = [0, 0, 10, 10]): Stroke => ({ id, tool: 'pen', color: '#000', width: 4, path: 'M 0 0', pts });
const cijferBlock = () => makeBoardBlock('cijferen-optellen-nat', { override: { operator: '+', numberType: 'natural' }, leafId: 'cijferen-optellen-nat', base: DEFAULT_BASE, grade: null })!;
const exercisesOf = (b: MathBlock) => (b as unknown as Record<string, unknown[]>)[REGISTRY[b.typeId].exerciseField];

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'select', inspectorOpen: false, geldPaletOpen: false, _redoStrokes: [], gridSnap: false, gridSize: 40 });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useWorksheetStore.getState().clearDraftBlocks();
    localStorage.clear();
});

describe('widgets', () => {
    test('add: fresh id, z on top, selected', () => {
        const a = st().addWidget(tekst());
        const b = st().addWidget(tekst());
        expect(a).not.toBe(b);
        expect(find(a).z).toBe(1);
        expect(find(b).z).toBe(2);
        expect(st().selectedWidgetId).toBe(b);
    });

    test('update patches one widget on the active page only', () => {
        const a = st().addWidget(tekst());
        const b = st().addWidget(tekst());
        st().updateWidget(a, { x: 99, props: { text: 'nieuw' } });
        expect(find(a)).toMatchObject({ x: 99, props: { text: 'nieuw' } });
        expect(find(b).x).toBe(0);
        st().addPage();
        st().updateWidget(a, { x: 1 });
        expect(find(a).x).toBe(99);
    });

    test('remove deselects only the removed widget', () => {
        const a = st().addWidget(tekst());
        const b = st().addWidget(tekst());
        st().removeWidget(a);
        expect(st().selectedWidgetId).toBe(b);
        st().removeWidget(b);
        expect(st().selectedWidgetId).toBeNull();
        expect(page().widgets).toHaveLength(0);
    });

    test('duplicate: +28/+28, on top, selected, a deep copy', () => {
        const a = st().addWidget({ ...tekst(10, 20), props: { text: 'x', nested: { k: 1 } } });
        st().addWidget(tekst());
        st().duplicateWidget(a);
        const copy = page().widgets[2];
        expect(copy.id).not.toBe(a);
        expect({ x: copy.x, y: copy.y, z: copy.z }).toEqual({ x: 38, y: 48, z: 3 });
        expect(st().selectedWidgetId).toBe(copy.id);
        (copy.props!.nested as { k: number }).k = 2;
        expect((find(a).props!.nested as { k: number }).k).toBe(1);
    });

    test('duplicate of an unknown id is a no-op', () => {
        st().addWidget(tekst());
        const before = st().pages;
        st().duplicateWidget('nope');
        expect(st().pages).toBe(before);
    });

    test('duplicate of an exercise widget copies showAnswer and gives the block a fresh id, same exercises', () => {
        const a = st().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block: cijferBlock(), showAnswer: true });
        st().duplicateWidget(a);
        const copy = page().widgets[1];
        expect(copy.block!.id).toMatch(/^bw-/);
        expect(copy.block!.id).not.toBe(find(a).block!.id);
        expect(copy.showAnswer).toBe(true);
        expect(exercisesOf(copy.block!)).toEqual(exercisesOf(find(a).block!));
    });

    test('bring to front puts a card above every other, repeatedly', () => {
        const ids = [0, 1, 2].map(() => st().addWidget(tekst()));
        st().bringToFront(ids[0]);
        expect(find(ids[0]).z).toBe(4);
        st().bringToFront(ids[1]);
        st().bringToFront(ids[0]);
        const zs = page().widgets.map((w) => w.z);
        expect(find(ids[0]).z).toBe(Math.max(...zs));
        expect(new Set(zs).size).toBe(3);
    });
});

describe('selection and inspector', () => {
    test('the inspector stays open while the same widget stays selected, closes on another or on none', () => {
        const a = st().addWidget(tekst());
        const b = st().addWidget(tekst());
        st().selectWidget(a);
        st().setInspectorOpen(true);
        st().selectWidget(a);
        expect(st().inspectorOpen).toBe(true);
        st().selectWidget(b);
        expect(st().inspectorOpen).toBe(false);
        st().setInspectorOpen(true);
        st().selectWidget(null);
        expect(st().inspectorOpen).toBe(false);
        expect(st().selectedWidgetId).toBeNull();
    });

    test('any tool but select drops the selection', () => {
        const a = st().addWidget(tekst());
        st().setTool('select');
        expect(st().selectedWidgetId).toBe(a);
        for (const t of ['hand', 'text', 'pen', 'marker', 'eraser'] as const) {
            st().selectWidget(a);
            st().setTool(t);
            expect(st().tool).toBe(t);
            expect(st().selectedWidgetId).toBeNull();
        }
    });

    test('grid, ink settings, geld dock', () => {
        st().setGridSnap(true);
        st().setGridSize(20);
        st().setInkSetting('pen', { color: '#ff0000' });
        st().setInkSetting('marker', { width: 30 });
        st().setGeldPaletOpen(true);
        expect(st()).toMatchObject({
            gridSnap: true, gridSize: 20, geldPaletOpen: true,
            inkSettings: { pen: { color: '#ff0000', width: 4 }, marker: { color: '#fde047', width: 30 } },
        });
    });
});

describe('pages', () => {
    test('add switches to the new page and deselects', () => {
        st().addWidget(tekst());
        st().addPage();
        expect(st().pages).toHaveLength(2);
        expect(st().activePageIdx).toBe(1);
        expect(st().selectedWidgetId).toBeNull();
        expect(page().widgets).toHaveLength(0);
    });

    test('widgets and strokes belong to their page', () => {
        st().addWidget(tekst());
        st().addStroke(stroke('s0'));
        st().addPage();
        st().addWidget(tekst());
        st().addWidget(tekst());
        expect(page(0).widgets).toHaveLength(1);
        expect(page(0).strokes).toHaveLength(1);
        expect(page(1).widgets).toHaveLength(2);
        expect(page(1).strokes).toHaveLength(0);
    });

    test('goto clamps, deselects and forgets ink redo', () => {
        st().addPage();
        st().addPage();
        st().addStroke(stroke('s'));
        st().undoStroke();
        expect(st()._redoStrokes).toHaveLength(1);
        st().gotoPage(-4);
        expect(st().activePageIdx).toBe(0);
        expect(st()._redoStrokes).toHaveLength(0);
        st().gotoPage(99);
        expect(st().activePageIdx).toBe(2);
    });

    test('duplicate inserts a deep copy right after the active page with fresh ids', () => {
        const a = st().addWidget(tekst(5, 5));
        st().addStroke(stroke('s1'));
        st().setBackground({ pattern: 'lijnen', dark: true });
        st().addPage();
        st().gotoPage(0);
        st().duplicatePage();
        expect(st().pages).toHaveLength(3);
        expect(st().activePageIdx).toBe(1);
        const [src, copy, last] = st().pages;
        expect(last.widgets).toHaveLength(0);
        expect(copy.id).not.toBe(src.id);
        expect(copy.widgets[0].id).not.toBe(a);
        expect(copy.strokes[0].id).not.toBe('s1');
        expect(copy.background).toEqual({ pattern: 'lijnen', dark: true });
        st().updateWidget(copy.widgets[0].id, { x: 500 });
        expect(find(a).x).toBe(5);
    });

    test('remove: a middle page goes, the index clamps; the last page is cleared, never removed', () => {
        st().addPage();
        st().addPage();
        st().removePage();
        expect(st().pages).toHaveLength(2);
        expect(st().activePageIdx).toBe(1);
        st().gotoPage(0);
        st().removePage();
        expect(st().pages).toHaveLength(1);
        expect(st().activePageIdx).toBe(0);
        st().addWidget(tekst());
        st().removePage();
        expect(st().pages).toHaveLength(1);
        expect(page().widgets).toHaveLength(0);
    });

    test('clear empties widgets and ink but keeps the background', () => {
        st().addWidget(tekst());
        st().addStroke(stroke('s'));
        st().setBackground({ pattern: 'cornell', dark: false, scale: 0.75 });
        st().clearActivePage();
        expect(page()).toMatchObject({ widgets: [], strokes: [], background: { pattern: 'cornell', dark: false, scale: 0.75 } });
        expect(st().selectedWidgetId).toBeNull();
    });

    test('the background is per page', () => {
        st().setBackground({ pattern: 'raster', dark: true });
        st().addPage();
        expect(page().background).toEqual({ pattern: 'blanco', dark: false });
        expect(page(0).background.pattern).toBe('raster');
    });

    test('loadBoard clamps the index and never leaves the board page-less; reset gives one empty page', () => {
        const pages = [emptyPage(), emptyPage()];
        st().loadBoard(pages, 7);
        expect(st().activePageIdx).toBe(1);
        st().loadBoard(pages, -3);
        expect(st().activePageIdx).toBe(0);
        st().loadBoard([]);
        expect(st().pages).toHaveLength(1);
        expect(st().activePageIdx).toBe(0);
        st().addPage();
        st().resetBoard();
        expect(st().pages).toHaveLength(1);
        expect(page().widgets).toEqual([]);
    });
});

describe('ink undo/redo', () => {
    test('undo/redo walk the stroke stack of the active page', () => {
        st().addStroke(stroke('a'));
        st().addStroke(stroke('b'));
        st().undoStroke();
        expect(page().strokes.map((s) => s.id)).toEqual(['a']);
        st().undoStroke();
        expect(page().strokes).toEqual([]);
        const empty = st();
        st().undoStroke();
        expect(st()).toBe(empty);
        st().redoStroke();
        st().redoStroke();
        expect(page().strokes.map((s) => s.id)).toEqual(['a', 'b']);
        const full = st();
        st().redoStroke();
        expect(st()).toBe(full);
    });

    test('a new stroke or an erase clears redo', () => {
        st().addStroke(stroke('a'));
        st().addStroke(stroke('b'));
        st().undoStroke();
        st().addStroke(stroke('c'));
        expect(st()._redoStrokes).toEqual([]);
        st().undoStroke();
        st().removeStrokes(['a']);
        expect(st()._redoStrokes).toEqual([]);
        expect(page().strokes).toEqual([]);
    });
});

describe('the ink layer', () => {
    test('a pen drag commits one stroke with the pen settings and its sample points', () => {
        st().setTool('pen');
        st().setInkSetting('pen', { color: '#123456', width: 6 });
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 10, clientY: 10, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 20, clientY: 15, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(svg, { clientX: 30, clientY: 25, pointerId: 1 }); });
        // The in-progress draft is drawn before it is committed.
        expect(svg.querySelectorAll('path')).toHaveLength(1);
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        const s = page().strokes;
        expect(s).toHaveLength(1);
        expect(s[0]).toMatchObject({ tool: 'pen', color: '#123456', width: 6, opacity: 1, pts: [10, 10, 20, 15, 30, 25] });
        expect(s[0].path).toMatch(/^M 10 10 Q 20 15 25\.0 20\.0 L 30 25$/);
        expect(svg.querySelectorAll('path')).toHaveLength(1);
    });

    test('a marker tap leaves a dot at 0.45 opacity', () => {
        st().setTool('marker');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 5, clientY: 6, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes[0]).toMatchObject({ tool: 'marker', opacity: 0.45, path: 'M 5 6 l 0.01 0', pts: [5, 6] });
    });

    test('the eraser removes strokes within reach, leaves the rest', () => {
        st().addStroke(stroke('near', [100, 100, 110, 100]));
        st().addStroke(stroke('far', [400, 400]));
        st().addStroke({ ...stroke('old'), pts: undefined as unknown as number[] });
        st().setTool('eraser');
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        act(() => { fireEvent.pointerDown(svg, { clientX: 112, clientY: 112, pointerId: 1 }); });
        expect(page().strokes.map((s) => s.id)).toEqual(['far', 'old']);
        act(() => { fireEvent.pointerMove(svg, { clientX: 400, clientY: 400, buttons: 0, pointerId: 1 }); });
        expect(page().strokes).toHaveLength(2);
        act(() => { fireEvent.pointerMove(svg, { clientX: 400, clientY: 400, buttons: 1, pointerId: 1 }); });
        expect(page().strokes.map((s) => s.id)).toEqual(['old']);
    });

    test('inactive, the layer ignores pointers', () => {
        st().setTool('pen');
        const { container } = render(<InkLayer active={false} />);
        const svg = container.querySelector('svg')!;
        expect(svg.style.pointerEvents).toBe('none');
        act(() => { fireEvent.pointerDown(svg, { clientX: 1, clientY: 1, pointerId: 1 }); });
        act(() => { fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(page().strokes).toHaveLength(0);
    });
});

describe('the canvas: answers, text tool, deselect', () => {
    test('the eye toggles showAnswer on that widget only', () => {
        const a = st().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block: cijferBlock(), showAnswer: false });
        const b = st().addWidget({ kind: 'exercise', x: 0, y: 400, w: 660, block: cijferBlock(), showAnswer: false });
        render(<BoardPageCanvas />);
        const eyes = screen.getAllByLabelText('Oplossing tonen/verbergen');
        act(() => { fireEvent.click(eyes[0]); });
        expect(find(a).showAnswer).toBe(true);
        expect(find(b).showAnswer).toBe(false);
        act(() => { fireEvent.click(screen.getAllByLabelText('Oplossing tonen/verbergen')[0]); });
        expect(find(a).showAnswer).toBe(false);
    });

    test('🔄 rerolls the block; the open inspector\'s draft follows', () => {
        const id = st().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block: cijferBlock(), showAnswer: false });
        useWorksheetStore.getState().setDraftBlocks([find(id).block!]);
        render(<BoardPageCanvas />);
        const before = find(id).block!;
        let changed = false;
        for (let i = 0; i < 5 && !changed; i++) {
            act(() => { fireEvent.click(screen.getByLabelText('Nieuwe oefeningen')); });
            changed = JSON.stringify(exercisesOf(find(id).block!)) !== JSON.stringify(exercisesOf(before));
        }
        expect(changed).toBe(true);
        expect(find(id).block!.id).toBe(before.id);
        expect(useWorksheetStore.getState().draftBlocks[0]).toBe(find(id).block);
    });

    test('the text tool places a tekst widget at the tap and hops back to select', () => {
        st().setTool('text');
        const { container } = render(<BoardPageCanvas />);
        const canvas = container.querySelector('[data-board-canvas]')!;
        act(() => { fireEvent.pointerDown(canvas, { clientX: 120, clientY: 80 }); });
        expect(page().widgets[0]).toMatchObject({ kind: 'tekst', x: 120, y: 80, w: 360, props: { text: '' } });
        expect(st().tool).toBe('select');
    });

    test('a tap on the empty board deselects', () => {
        st().addWidget(tekst());
        const { container } = render(<BoardPageCanvas />);
        act(() => { fireEvent.pointerDown(container.querySelector('[data-board-canvas]')!, { clientX: 900, clientY: 900 }); });
        expect(st().selectedWidgetId).toBeNull();
    });
});

describe('the draftBlocks mirror', () => {
    function openInspector() {
        const id = st().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block: cijferBlock(), showAnswer: false });
        st().selectWidget(id);
        st().setInspectorOpen(true);
        const utils = render(<BoardInspector widget={find(id)} />);
        return { ...utils, id };
    }
    const ws = () => useWorksheetStore.getState();

    test('seeds the mirror with the widget block on open', () => {
        const { id } = openInspector();
        expect(ws().draftBlocks).toHaveLength(1);
        expect(ws().draftBlocks[0]).toBe(find(id).block);
    });

    test('a plugin edit on the draft is copied back into the widget', () => {
        const { id } = openInspector();
        const blockId = find(id).block!.id;
        act(() => { ws().updateBlockSettings(blockId, { constraints: { ...find(id).block!.constraints, scaffolding: 2 } as MathBlock['constraints'] }); });
        expect((find(id).block!.constraints as Record<string, unknown>).scaffolding).toBe(2);
        expect(find(id).block).toBe(ws().draftBlocks[0]);
    });

    test('the board-only sliders write through the same path (witruimte) or the widget (tekstgrootte)', () => {
        const { id, container } = openInspector();
        const [, spacing, textSize] = container.querySelectorAll('input[type="range"]');
        act(() => { fireEvent.change(spacing, { target: { value: '30' } }); });
        expect(find(id).block!.verticalSpacing).toBe(30);
        act(() => { fireEvent.change(textSize, { target: { value: '1.5' } }); });
        expect(find(id).scale).toBe(1.5);
    });

    test('Genereer rerolls the widget and the mirror together', () => {
        const { id } = openInspector();
        act(() => { fireEvent.click(screen.getByText('Genereer nieuwe oefeningen')); });
        expect(ws().draftBlocks[0]).toBe(find(id).block);
    });

    test('teardown leaves the worksheet store clean: no draft, no sheet block, no history entry', () => {
        const before = { blocks: ws().blocks, idx: ws()._historyIndex, len: ws()._history.length };
        const { id, unmount } = openInspector();
        act(() => { ws().updateBlockSettings(find(id).block!.id, { verticalSpacing: 22 }); });
        unmount();
        expect(ws().draftBlocks).toEqual([]);
        expect(ws().blocks).toBe(before.blocks);
        expect({ idx: ws()._historyIndex, len: ws()._history.length }).toEqual({ idx: before.idx, len: before.len });
        // After teardown, a stray sheet edit with the board id goes nowhere near the widget.
        ws().updateBlockSettings(find(id).block!.id, { verticalSpacing: 4 });
        expect(find(id).block!.verticalSpacing).toBe(22);
    });

    test('the close button clears the mirror and deselects', () => {
        openInspector();
        act(() => { fireEvent.click(screen.getByLabelText('Sluiten')); });
        expect(ws().draftBlocks).toEqual([]);
        expect(st().selectedWidgetId).toBeNull();
    });

    // BUGS.md › Bordmodus: "Aantal oefeningen" changes the count but not the card until Genereer.
    test.fails('the Aantal slider changes the number of exercises on the card', () => {
        const { id, container } = openInspector();
        const count = container.querySelector('input[type="range"]')!;
        act(() => { fireEvent.change(count, { target: { value: '2' } }); });
        expect(find(id).block!.numberOfExercises).toBe(2);
        expect(exercisesOf(find(id).block!)).toHaveLength(2);
    });
});

describe('autosave and hydration', () => {
    test('a board mutation autosaves 1.5 s after the last change; tool changes do not', () => {
        vi.useFakeTimers();
        st().setTool('pen');
        vi.advanceTimersByTime(5000);
        expect(localStorage.getItem(BOARD_AUTOSAVE_KEY)).toBeNull();
        st().addWidget(tekst());
        vi.advanceTimersByTime(1000);
        st().addPage();
        vi.advanceTimersByTime(1000);
        expect(localStorage.getItem(BOARD_AUTOSAVE_KEY)).toBeNull();
        vi.advanceTimersByTime(600);
        const f = loadBoardAutosave()!;
        expect(f.pages).toHaveLength(2);
        expect(f.activePageIdx).toBe(1);
        expect(f.pages[0].widgets).toHaveLength(1);
    });

    async function hydrate(activePageIdx: number) {
        const pages = [emptyPage(), { ...emptyPage(), widgets: [{ id: 'w', kind: 'klok' as const, x: 1, y: 2, w: 300, z: 1 }] }];
        localStorage.setItem(BOARD_AUTOSAVE_KEY, JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages, activePageIdx }));
        vi.resetModules();
        const mod = await import('../board/useBoardStore');
        return { s: mod.useBoardStore.getState(), pages };
    }

    test('the store reopens on the autosaved board and page', async () => {
        const { s, pages } = await hydrate(1);
        expect(s.pages).toEqual(pages);
        expect(s.activePageIdx).toBe(1);
    });

    test('an autosaved index past the end lands on the last page', async () => {
        expect((await hydrate(9)).s.activePageIdx).toBe(1);
    });

    test('a garbage autosave starts an empty board', async () => {
        localStorage.setItem(BOARD_AUTOSAVE_KEY, '{"version":1,"pages":"x"}');
        vi.resetModules();
        const s = (await import('../board/useBoardStore')).useBoardStore.getState();
        expect(s.pages).toHaveLength(1);
        expect(s.pages[0].widgets).toEqual([]);
    });

    // loadBoard clamps at 0, the module-init hydration does not: pages[-1] is undefined and
    // every selector on the active page throws (BUGS.md › Bordmodus, parseBoardFile line).
    test.fails('a negative autosaved index lands on page 0', async () => {
        expect((await hydrate(-1)).s.activePageIdx).toBe(0);
    });
});
