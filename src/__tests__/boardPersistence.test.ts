// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    BOARD_AUTOSAVE_KEY, BOARD_FORMAT_VERSION, BOARD_PRESETS_KEY, MAX_BOARD_PRESETS,
    parseBoardFile, saveBoardAutosave, loadBoardAutosave, clearBoardAutosave,
    loadBoardPresets, saveBoardPreset, deleteBoardPreset, exportBoardFile, emptyBoard,
} from '../board/boardPersistence';
import { NATURAL_W } from '../board/widgetSizing';
import { makeBoardBlock } from '../board/boardBlocks';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
import { useBoardStore } from '../board/useBoardStore';
import type { BoardPage, BoardWidget, WidgetKind } from '../board/boardTypes';

// Board persistence is strict on read (never half-load a board) and forgiving on write
// (a full localStorage must not take the lesson down). jsdom for localStorage.
const ALL_KINDS = Object.keys(NATURAL_W) as WidgetKind[];

function widgetOf(kind: WidgetKind, i: number): Omit<BoardWidget, 'id' | 'z'> {
    const base = { kind, x: 20 + i * 10, y: 30 + i * 10, w: NATURAL_W[kind] };
    if (kind === 'exercise') {
        const block = makeBoardBlock('cijferen-optellen-nat', { override: { operator: '+', numberType: 'natural' }, leafId: 'cijferen-optellen-nat', base: DEFAULT_BASE, grade: null })!;
        return { ...base, block, showAnswer: true, scale: 1.2, props: { title: 'Sommen' } };
    }
    return { ...base, props: { title: `T-${kind}`, n: i } };
}

// A two-page board with every widget kind and some ink, built through the store like a teacher would.
function buildFullBoard() {
    const s = useBoardStore.getState();
    s.resetBoard();
    ALL_KINDS.slice(0, 11).forEach((k, i) => s.addWidget(widgetOf(k, i)));
    s.addStroke({ id: 'st1', tool: 'pen', color: '#111827', width: 4, path: 'M 0 0 L 10 10', pts: [0, 0, 10, 10] });
    s.setBackground({ pattern: 'raster', dark: true, scale: 1.5 });
    s.addPage();
    ALL_KINDS.slice(11).forEach((k, i) => useBoardStore.getState().addWidget(widgetOf(k, i)));
    useBoardStore.getState().addStroke({ id: 'st2', tool: 'marker', color: '#fde047', width: 18, opacity: 0.45, path: 'M 1 1', pts: [1, 1] });
    return useBoardStore.getState();
}

const validFile = (pages: unknown = emptyBoard()) => JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages });

beforeEach(() => localStorage.clear());
afterEach(() => {
    vi.restoreAllMocks();
    useBoardStore.getState().resetBoard();
});

describe('parseBoardFile: strict on read', () => {
    test('a valid minimal file parses', () => {
        const f = parseBoardFile(validFile());
        expect(f).not.toBeNull();
        expect(f!.pages).toHaveLength(1);
    });

    test.each([
        ['not JSON', '{nope'],
        ['empty string', ''],
        ['JSON null', 'null'],
        ['a bare array', '[]'],
        ['a number', '42'],
        ['no version', JSON.stringify({ pages: emptyBoard() })],
        ['version 0', JSON.stringify({ version: 0, pages: emptyBoard() })],
        ['a newer version', JSON.stringify({ version: BOARD_FORMAT_VERSION + 1, pages: emptyBoard() })],
        ['version as a string', JSON.stringify({ version: String(BOARD_FORMAT_VERSION), pages: emptyBoard() })],
        ['pages missing', JSON.stringify({ version: BOARD_FORMAT_VERSION })],
        ['pages not an array', JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: {} })],
        ['zero pages', validFile([])],
        ['a null page', validFile([null])],
        ['a page without widgets', validFile([{ id: 'p', strokes: [], background: { pattern: 'blanco', dark: false } }])],
        ['a page without strokes', validFile([{ id: 'p', widgets: [], background: { pattern: 'blanco', dark: false } }])],
        ['a page without background', validFile([{ id: 'p', widgets: [], strokes: [] }])],
        ['widgets as an object', validFile([{ id: 'p', widgets: {}, strokes: [], background: {} }])],
        ['one good page and one partial page', validFile([...emptyBoard(), { id: 'p2', widgets: [] }])],
        ['a null stroke', validFile([{ id: 'p', widgets: [], strokes: [null], background: {} }])],
    ])('rejects %s', (_label, json) => {
        expect(parseBoardFile(json)).toBeNull();
    });

    test('an early-build stroke without sample points loads with pts = []', () => {
        const pages = [{ id: 'p', widgets: [], strokes: [{ id: 's', tool: 'pen', color: '#000', width: 4, path: 'M 0 0' }], background: { pattern: 'blanco', dark: false } }];
        const f = parseBoardFile(validFile(pages))!;
        expect(f.pages[0].strokes[0].pts).toEqual([]);
    });

    test('a worksheet save file is not a board', () => {
        expect(parseBoardFile(JSON.stringify({ version: 4, blocks: [], title: 'Blad' }))).toBeNull();
    });

    // A hand-edited or foreign file passes the page-level check with junk inside; loading it
    // crashes BoardPageCanvas (reads .id of a null widget) outside any error boundary.
    test.fails('rejects a page whose widgets list holds a non-object', () => {
        expect(parseBoardFile(validFile([{ id: 'p', widgets: [null], strokes: [], background: { pattern: 'blanco', dark: false } }]))).toBeNull();
    });
});

describe('autosave', () => {
    test('save → load round-trips a 2-page board with every widget kind', () => {
        const st = buildFullBoard();
        saveBoardAutosave(st.pages, st.activePageIdx);
        const f = loadBoardAutosave()!;
        expect(f).not.toBeNull();
        expect(f.version).toBe(BOARD_FORMAT_VERSION);
        expect(f.activePageIdx).toBe(1);
        expect(f.pages).toEqual(st.pages);
        const kinds = f.pages.flatMap((p) => p.widgets.map((w) => w.kind));
        expect(new Set(kinds)).toEqual(new Set(ALL_KINDS));
        // The exercise block survives whole: exercises, constraints and the answer toggle.
        const ex = f.pages.flatMap((p) => p.widgets).find((w) => w.kind === 'exercise')!;
        const field = REGISTRY[ex.block!.typeId].exerciseField;
        expect((ex.block as unknown as Record<string, unknown[]>)[field].length).toBeGreaterThan(0);
        expect(ex.showAnswer).toBe(true);
        expect(f.pages[0].background).toEqual({ pattern: 'raster', dark: true, scale: 1.5 });
    });

    test('a loaded file restores the store exactly', () => {
        const st = buildFullBoard();
        const pages = st.pages;
        saveBoardAutosave(pages, 0);
        useBoardStore.getState().resetBoard();
        const f = loadBoardAutosave()!;
        useBoardStore.getState().loadBoard(f.pages, f.activePageIdx);
        expect(useBoardStore.getState().pages).toEqual(pages);
        expect(useBoardStore.getState().activePageIdx).toBe(0);
    });

    test('nothing saved → null; garbage in the key → null, not a throw', () => {
        expect(loadBoardAutosave()).toBeNull();
        localStorage.setItem(BOARD_AUTOSAVE_KEY, '{"version":1,"pages":[{"widgets":[]');
        expect(loadBoardAutosave()).toBeNull();
        localStorage.setItem(BOARD_AUTOSAVE_KEY, JSON.stringify({ version: 0, pages: emptyBoard() }));
        expect(loadBoardAutosave()).toBeNull();
    });

    test('clear removes the key', () => {
        saveBoardAutosave(emptyBoard(), 0);
        expect(localStorage.getItem(BOARD_AUTOSAVE_KEY)).not.toBeNull();
        clearBoardAutosave();
        expect(localStorage.getItem(BOARD_AUTOSAVE_KEY)).toBeNull();
    });

    test('a quota failure skips the autosave silently and keeps the previous one', () => {
        saveBoardAutosave(emptyBoard(), 0);
        const before = localStorage.getItem(BOARD_AUTOSAVE_KEY);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        expect(() => saveBoardAutosave(buildFullBoard().pages, 1)).not.toThrow();
        vi.restoreAllMocks();
        expect(localStorage.getItem(BOARD_AUTOSAVE_KEY)).toBe(before);
    });
});

describe('presets (Mijn borden)', () => {
    test('save, list newest first, delete', () => {
        const st = buildFullBoard();
        saveBoardPreset('  Les 1  ', st.pages, 1);
        const list = saveBoardPreset('', emptyBoard(), 0);
        expect(list.map((p) => p.name)).toEqual(['Naamloos bord', 'Les 1']);
        expect(list[1].pageCount).toBe(2);
        expect(list[1].payload.pages).toEqual(st.pages);
        expect(list[1].payload.activePageIdx).toBe(1);
        expect(loadBoardPresets()).toEqual(list);
        // The stored payload is a valid board file on its own.
        expect(parseBoardFile(JSON.stringify(list[1].payload))).not.toBeNull();
        const after = deleteBoardPreset(list[0].id);
        expect(after.map((p) => p.name)).toEqual(['Les 1']);
        expect(loadBoardPresets()).toEqual(after);
    });

    test(`the list is capped at ${MAX_BOARD_PRESETS}, dropping the oldest`, () => {
        for (let i = 0; i < MAX_BOARD_PRESETS + 3; i++) saveBoardPreset(`b${i}`, emptyBoard(), 0);
        const list = loadBoardPresets();
        expect(list).toHaveLength(MAX_BOARD_PRESETS);
        expect(list[0].name).toBe(`b${MAX_BOARD_PRESETS + 2}`);
        expect(list.some((p) => p.name === 'b0')).toBe(false);
    });

    test('garbage or a non-array under the presets key reads as an empty list', () => {
        localStorage.setItem(BOARD_PRESETS_KEY, '{oops');
        expect(loadBoardPresets()).toEqual([]);
        localStorage.setItem(BOARD_PRESETS_KEY, JSON.stringify({ a: 1 }));
        expect(loadBoardPresets()).toEqual([]);
    });

    // BoardBottomBar calls saveBoardPreset straight from a click handler: a board with a big
    // image fills the quota, the throw escapes, nothing is saved and the teacher gets no message.
    test.fails('a quota failure on preset save does not throw', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        expect(() => saveBoardPreset('Groot', emptyBoard(), 0)).not.toThrow();
    });
});

describe('file export', () => {
    test('downloads a pretty-printed, parseable board file', async () => {
        let blob: Blob | null = null;
        const create = vi.fn((b: Blob) => { blob = b; return 'blob:x'; });
        const revoke = vi.fn();
        vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke });
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        const st = buildFullBoard();
        exportBoardFile(st.pages, 1);
        vi.unstubAllGlobals();
        expect(click).toHaveBeenCalledOnce();
        expect(revoke).toHaveBeenCalledWith('blob:x');
        const text = await blob!.text();
        expect(text).toContain('\n  "version"');
        const f = parseBoardFile(text)!;
        expect(f.pages).toEqual(st.pages);
        expect(f.activePageIdx).toBe(1);
    });
});

describe('ids', () => {
    const allIds = (pages: BoardPage[]) => ({
        pages: pages.map((p) => p.id),
        widgets: pages.flatMap((p) => p.widgets.map((w) => w.id)),
        strokes: pages.flatMap((p) => p.strokes.map((s) => s.id)),
        blocks: pages.flatMap((p) => p.widgets.flatMap((w) => (w.block ? [w.block.id] : []))),
    });
    const unique = (xs: string[]) => new Set(xs).size === xs.length;

    test('page, widget and stroke ids stay unique after duplicating widgets and pages, and survive a round-trip', () => {
        buildFullBoard();
        const s = useBoardStore.getState();
        for (const w of [...s.pages[1].widgets]) useBoardStore.getState().duplicateWidget(w.id);
        useBoardStore.getState().duplicatePage();
        useBoardStore.getState().gotoPage(0);
        useBoardStore.getState().duplicatePage();
        const pages = useBoardStore.getState().pages;
        expect(pages).toHaveLength(4);
        const ids = allIds(pages);
        expect(unique(ids.pages)).toBe(true);
        expect(unique(ids.widgets)).toBe(true);
        expect(unique(ids.strokes)).toBe(true);
        saveBoardAutosave(pages, 0);
        expect(allIds(loadBoardAutosave()!.pages)).toEqual(ids);
    });

    test('duplicating an exercise widget gives its block a fresh id', () => {
        buildFullBoard();
        const ex = useBoardStore.getState().pages[1].widgets.find((w) => w.kind === 'exercise')
            ?? useBoardStore.getState().pages[0].widgets.find((w) => w.kind === 'exercise')!;
        useBoardStore.getState().gotoPage(useBoardStore.getState().pages.findIndex((p) => p.widgets.includes(ex)));
        useBoardStore.getState().duplicateWidget(ex.id);
        expect(unique(allIds(useBoardStore.getState().pages).blocks)).toBe(true);
    });

    // duplicateWidget refreshes block.id ("the inspector's draft mirror keys on it"), but
    // duplicatePage copies exercise blocks with the same id, so two widgets share one.
    test.fails('duplicating a page gives its exercise blocks fresh ids', () => {
        buildFullBoard();
        const exPage = useBoardStore.getState().pages.findIndex((p) => p.widgets.some((w) => w.kind === 'exercise'));
        useBoardStore.getState().gotoPage(exPage);
        useBoardStore.getState().duplicatePage();
        expect(unique(allIds(useBoardStore.getState().pages).blocks)).toBe(true);
    });
});
