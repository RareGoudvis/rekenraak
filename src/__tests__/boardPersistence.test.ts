// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    BOARD_AUTOSAVE_KEY, BOARD_FORMAT_VERSION, BOARD_PRESETS_KEY, MAX_BOARD_PRESETS,
    parseBoardFile, saveBoardAutosave, loadBoardAutosave, clearBoardAutosave,
    loadBoardPresets, saveBoardPreset, deleteBoardPreset, exportBoardFile, emptyBoard, type BoardPreset,
    updateBoardPreset, renameBoardPreset, duplicateBoardPreset, BOARD_INK_KEY, BOARD_SAVED_ID_KEY,
    saveInkSettings, loadInkSettings, loadEraserSize, loadSavedBoardId,
} from '../board/boardPersistence';
import { promptSaveBoard } from '../board/boardChrome';
import { NATURAL_W } from '../board/widgetSizing';
import { makeBoardBlock } from '../board/boardBlocks';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
import { useBoardStore } from '../board/useBoardStore';
import { isTransparent } from '../board/settings/baseProps';
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
        ['a page without an id', validFile([{ widgets: [], strokes: [], background: {} }])],
        ['a null background', validFile([{ id: 'p', widgets: [], strokes: [], background: null }])],
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

    // Junk inside a sound page (hand-edited or foreign file) used to load and crash BoardPageCanvas
    // outside any error boundary; it is dropped, the good widgets and strokes survive.
    test('drops junk widgets and strokes, keeps the sound ones', () => {
        const good = { id: 'w', kind: 'klok', x: 1, y: 2, w: 300, z: 1 };
        const stroke = { id: 's', tool: 'pen', color: '#000', width: 4, path: 'M 0 0', pts: [0, 0] };
        const widgets = [
            null, 7, 'x', [], good,
            { ...good, id: 1 }, { ...good, kind: 'onbekend' }, { ...good, x: '1' }, { ...good, z: null },
            { ...good, w: Infinity }, { ...good, kind: 'exercise' }, { ...good, kind: 'exercise', block: null },
        ];
        const f = parseBoardFile(validFile([{ id: 'p', widgets, strokes: [null, 3, { id: 's2' }, stroke], background: { pattern: 'blanco', dark: false } }]))!;
        expect(f).not.toBeNull();
        expect(f.pages[0].widgets).toEqual([good]);
        expect(f.pages[0].strokes).toEqual([stroke]);
    });

    test.each([
        [undefined, 0], [0, 0], [1, 1], [9, 1], [-1, 0], [1.5, 0], ['1', 0], [null, 0],
    ])('activePageIdx %s on a 2-page file is read as %s', (idx, expected) => {
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [...emptyBoard(), ...emptyBoard()], activePageIdx: idx });
        expect(parseBoardFile(json)!.activePageIdx).toBe(expected);
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
        const list = saveBoardPreset('', emptyBoard(), 0) as BoardPreset[];
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

    // A board with a big image fills the quota: the save reports false (promptSaveBoard alerts)
    // instead of throwing out of the click handler, and the stored list is untouched.
    test('a quota failure on preset save returns false and keeps the list', () => {
        saveBoardPreset('Klein', emptyBoard(), 0);
        const before = localStorage.getItem(BOARD_PRESETS_KEY);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        let result: ReturnType<typeof saveBoardPreset> = [];
        expect(() => { result = saveBoardPreset('Groot', emptyBoard(), 0); }).not.toThrow();
        expect(result).toBe(false);
        vi.restoreAllMocks();
        expect(localStorage.getItem(BOARD_PRESETS_KEY)).toBe(before);
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

    // The draftBlocks mirror and patchExercise key on block and exercise ids, so a page copy
    // must share none of them with its source (duplicateWidget already gave fresh block ids).
    const exerciseIds = (p: BoardPage) => p.widgets.flatMap((w) => {
        if (!w.block) return [];
        const items = (w.block as unknown as Record<string, { id?: string }[]>)[REGISTRY[w.block.typeId].exerciseField] ?? [];
        return items.map((it) => it.id).filter((id): id is string => typeof id === 'string');
    });

    test('duplicating a page shares no id with the source page', () => {
        buildFullBoard();
        const exPage = useBoardStore.getState().pages.findIndex((p) => p.widgets.some((w) => w.kind === 'exercise'));
        useBoardStore.getState().gotoPage(exPage);
        useBoardStore.getState().duplicatePage();
        const pages = useBoardStore.getState().pages;
        const [src, copy] = [pages[exPage], pages[exPage + 1]];
        const idsOf = (p: BoardPage) => [p.id, ...allIds([p]).widgets, ...allIds([p]).strokes, ...allIds([p]).blocks, ...exerciseIds(p)];
        expect(exerciseIds(src).length).toBeGreaterThan(0);
        expect(idsOf(copy)).toHaveLength(idsOf(src).length);
        expect(idsOf(copy).filter((id) => idsOf(src).includes(id))).toEqual([]);
        expect(unique(allIds(pages).blocks)).toBe(true);
    });

    test('duplicating an exercise widget gives its exercises fresh ids too', () => {
        buildFullBoard();
        const exPage = useBoardStore.getState().pages.findIndex((p) => p.widgets.some((w) => w.kind === 'exercise'));
        useBoardStore.getState().gotoPage(exPage);
        const before = exerciseIds(useBoardStore.getState().pages[exPage]);
        const ex = useBoardStore.getState().pages[exPage].widgets.find((w) => w.kind === 'exercise')!;
        useBoardStore.getState().duplicateWidget(ex.id);
        const after = exerciseIds(useBoardStore.getState().pages[exPage]);
        expect(after).toHaveLength(before.length * 2);
        expect(unique(after)).toBe(true);
    });
});

describe('transparent cards', () => {
    test('props.transparent round-trips for a widget and a math card; absent or junk reads as a normal card', () => {
        const s = useBoardStore.getState();
        s.resetBoard();
        s.addWidget({ ...widgetOf('tekst', 0), props: { text: 'hoi', transparent: true } });
        s.addWidget({ ...widgetOf('exercise', 1), props: { transparent: true } });
        s.addWidget({ ...widgetOf('klok', 2), props: { transparent: 'ja' } });
        s.addWidget(widgetOf('timer', 3));
        const st = useBoardStore.getState();
        const file = JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: st.pages, activePageIdx: 0 });
        const loaded = parseBoardFile(file)!;
        expect(loaded).not.toBeNull();
        const ws = loaded.pages[0].widgets;
        expect(ws.map(isTransparent)).toEqual([true, true, false, false]);
        // The format stays v2: the flag is an ordinary prop, absent on a card that never set it.
        expect(BOARD_FORMAT_VERSION).toBe(2);
        expect(ws[3].props && 'transparent' in ws[3].props).toBe(false);
    });
});

describe('Mijn borden as templates: update / rename / duplicate', () => {
    const save = (name: string) => (saveBoardPreset(name, emptyBoard(), 0) as BoardPreset[])[0];

    test('update overwrites the entry in place (pages, count, date), id and name stay', () => {
        const a = save('A');
        save('B');
        const st = buildFullBoard();
        expect(updateBoardPreset(a.id, st.pages, 1, st.boardSettings)).toBe('ok');
        const list = loadBoardPresets();
        expect(list.map(p => p.name)).toEqual(['B', 'A']);
        const got = list.find(p => p.id === a.id)!;
        expect(got.pageCount).toBe(2);
        expect(got.payload.activePageIdx).toBe(1);
        expect(got.payload.pages[0].strokes[0].id).toBe('st1');
        expect(updateBoardPreset('gone', st.pages, 0)).toBe('missing');
    });

    test('update reports a full storage instead of throwing', () => {
        const a = save('A');
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
        expect(updateBoardPreset(a.id, emptyBoard(), 0)).toBe('failed');
    });

    test('rename trims, falls back on an empty name, leaves the others alone', () => {
        const a = save('A');
        const b = save('B');
        expect(renameBoardPreset(a.id, '  Les 3  ').find(p => p.id === a.id)!.name).toBe('Les 3');
        expect(renameBoardPreset(a.id, '   ').find(p => p.id === a.id)!.name).toBe('Naamloos bord');
        expect(loadBoardPresets().find(p => p.id === b.id)!.name).toBe('B');
    });

    test('duplicate puts a deep copy with a fresh id right under its source, within the cap', () => {
        const a = save('A');
        save('B');
        const next = duplicateBoardPreset(a.id) as BoardPreset[];
        expect(next.map(p => p.name)).toEqual(['B', 'A', 'A (kopie)']);
        expect(next[2].id).not.toBe(a.id);
        expect(next[2].payload).not.toBe(next[1].payload);
        expect(duplicateBoardPreset('gone')).toBe(false);
        for (let i = 0; i < MAX_BOARD_PRESETS; i++) save(`P${i}`);
        expect(duplicateBoardPreset(loadBoardPresets()[0].id) as BoardPreset[]).toHaveLength(MAX_BOARD_PRESETS);
    });

    test('Bewaren saves once with a name, then updates; Bewaren als… always makes a new entry', () => {
        const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Les');
        useBoardStore.getState().resetBoard();
        expect(promptSaveBoard().outcome).toBe('saved');
        const id = useBoardStore.getState().savedBoardId!;
        expect(localStorage.getItem(BOARD_SAVED_ID_KEY)).toBe(id);
        expect(promptSaveBoard().outcome).toBe('updated');
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(promptSaveBoard(true).outcome).toBe('saved');
        expect(useBoardStore.getState().savedBoardId).not.toBe(id);
        expect(loadBoardPresets()).toHaveLength(2);
        // An entry deleted meanwhile (another tab): Bewaren asks a name again.
        deleteBoardPreset(useBoardStore.getState().savedBoardId!);
        expect(promptSaveBoard().outcome).toBe('saved');
        expect(prompt).toHaveBeenCalledTimes(3);
    });

    test('the link: loadBoard with an id sets it, an import (no id) and resetBoard drop it', () => {
        const s = useBoardStore.getState();
        s.loadBoard(emptyBoard(), 0, undefined, 'abc');
        expect(useBoardStore.getState().savedBoardId).toBe('abc');
        expect(loadSavedBoardId()).toBe('abc');
        s.loadBoard(emptyBoard(), 0);
        expect(useBoardStore.getState().savedBoardId).toBeNull();
        expect(loadSavedBoardId()).toBeNull();
        s.loadBoard(emptyBoard(), 0, undefined, 'abc');
        s.resetBoard();
        expect(useBoardStore.getState().savedBoardId).toBeNull();
    });
});

describe('eraser size (in the ink entry)', () => {
    test('round-trips next to the pens; the pens still read as before', () => {
        const ink = loadInkSettings();
        saveInkSettings({ ...ink, pen: { color: '#dc2626', width: 6 } }, 30);
        expect(JSON.parse(localStorage.getItem(BOARD_INK_KEY)!).eraserSize).toBe(30);
        expect(loadEraserSize()).toBe(30);
        expect(loadInkSettings().pen).toEqual({ color: '#dc2626', width: 6 });
    });

    test('the store saves it on change', () => {
        useBoardStore.getState().setEraserSize(22);
        expect(loadEraserSize()).toBe(22);
        // Out of range is clamped in the store, junk in storage reads as the default.
        useBoardStore.getState().setEraserSize(400);
        expect(useBoardStore.getState().eraserSize).toBe(40);
        localStorage.setItem(BOARD_INK_KEY, JSON.stringify({ eraserSize: 'groot' }));
        expect(loadEraserSize()).toBe(14);
        localStorage.setItem(BOARD_INK_KEY, '{nope');
        expect(loadEraserSize()).toBe(14);
    });
});
