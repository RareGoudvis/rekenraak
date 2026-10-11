import { create } from 'zustand';
import type { BoardPage, BoardSettings, BoardWidget, BoardTool, BoardBackground, DrawOptions, InkOp, InkSettings, Instrument, InstrumentKind, Stroke, StrokeTool } from './boardTypes';
import { DEFAULT_BOARD_SETTINGS, emptyPage, inkColor, rndId } from './boardTypes';
import { defaultInstrument } from './instrumentGeometry';
import { translateStroke } from './inkGeometry';
import { loadBoardAutosave, loadInkSettings, saveBoardAutosave, saveInkSettings } from './boardPersistence';
import { withFreshIds } from './boardBlocks';
import { loadWidgetDefaults } from './settings/widgetDefaults';

export type { InkSettings };

// Whiteboard app store — deliberately separate from useWorksheetStore so the
// worksheet editor and bordmodus can't corrupt each other's state. Everything
// whiteboard lives under src/board/.
interface BoardState {
    pages: BoardPage[];
    activePageIdx: number;
    selectedWidgetId: string | null;
    tool: BoardTool;
    gridSnap: boolean;
    gridSize: number;          // px between snap lines

    // widgets (always operate on the active page)
    addWidget: (w: Omit<BoardWidget, 'id' | 'z'>) => string;
    updateWidget: (id: string, patch: Partial<BoardWidget>) => void;
    removeWidget: (id: string) => void;
    duplicateWidget: (id: string) => void;
    bringToFront: (id: string) => void;
    selectWidget: (id: string | null) => void;
    // Inspector opens via the ⚙ in the widget's title bar, not on mere selection.
    inspectorOpen: boolean;
    setInspectorOpen: (open: boolean) => void;
    // Geld-sleeppalet dock (UI-only, not persisted).
    geldPaletOpen: boolean;
    setGeldPaletOpen: (open: boolean) => void;

    // pages
    addPage: () => void;
    duplicatePage: () => void;
    removePage: () => void;
    gotoPage: (idx: number) => void;
    clearActivePage: () => void;
    setBackground: (bg: BoardBackground) => void;

    // tools / settings
    setTool: (t: BoardTool) => void;
    setGridSnap: (on: boolean) => void;
    setGridSize: (px: number) => void;
    inkSettings: Record<StrokeTool, InkSettings>;
    setInkSetting: (tool: StrokeTool, patch: Partial<InkSettings>) => void;
    // Lijn / vormen options (arrowheads, dashed, shape kind, soft fill); UI-only.
    drawOptions: DrawOptions;
    setDrawOptions: (patch: Partial<DrawOptions>) => void;

    // ink (always the active page)
    addStroke: (s: Stroke) => void;
    // The eraser removes without history (as it always did); the Selecteren tool's Delete is undoable.
    removeStrokes: (ids: string[], opts?: { undoable?: boolean }) => void;
    moveStrokes: (ids: string[], dx: number, dy: number) => void;
    undoStroke: () => void;
    redoStroke: () => void;
    // In-memory ink history of the active page (cleared on page switch, load, reset, clear).
    _undoInk: InkOp[];
    _redoInk: InkOp[];
    // Selecteren tool: the selected strokes of the active page (UI-only; cleared on tool / page change).
    selectedStrokeIds: string[];
    selectStrokes: (ids: string[]) => void;

    // meetinstrumenten (active page; at most one per kind, so a toggle adds or removes it)
    selectedInstrumentId: string | null;
    toggleInstrument: (kind: InstrumentKind, boardW?: number, boardH?: number) => void;
    updateInstrument: (id: string, patch: Partial<Omit<Instrument, 'id' | 'kind'>>) => void;
    removeInstrument: (id: string) => void;
    hideAllInstruments: () => void;
    selectInstrument: (id: string | null) => void;

    // Page-independent settings, saved with the board ("Handvatten op het bord houden").
    boardSettings: BoardSettings;
    setKeepHandles: (on: boolean) => void;

    // persistence hooks (boardPersistence.ts); a board loaded with settings takes them over
    loadBoard: (pages: BoardPage[], activeIdx?: number, settings?: BoardSettings) => void;
    resetBoard: () => void;
}

// Immutable helper: apply fn to the active page only.
function withActivePage(state: BoardState, fn: (p: BoardPage) => BoardPage): Pick<BoardState, 'pages'> {
    return { pages: state.pages.map((p, i) => (i === state.activePageIdx ? fn(p) : p)) };
}

// A page change (or a load / reset / clear) starts a fresh ink history and selection: the
// history holds the stroke ids of one page.
const freshInk = { selectedStrokeIds: [] as string[], _undoInk: [] as InkOp[], _redoInk: [] as InkOp[] };

// One history step applied (forward) to a page's strokes.
function applyInk(p: BoardPage, op: InkOp): BoardPage {
    if (op.kind === 'add') return { ...p, strokes: [...p.strokes, op.stroke] };
    if (op.kind === 'move') return { ...p, strokes: p.strokes.map(s => (op.ids.includes(s.id) ? translateStroke(s, op.dx, op.dy) : s)) };
    const gone = op.removed.map(r => r.stroke.id);
    return { ...p, strokes: p.strokes.filter(s => !gone.includes(s.id)) };
}

// The page with op taken back, or null when the strokes it touched are gone (the eraser got them).
function revertInk(p: BoardPage, op: InkOp): BoardPage | null {
    const present = new Set(p.strokes.map(s => s.id));
    if (op.kind === 'add') return present.has(op.stroke.id) ? { ...p, strokes: p.strokes.filter(s => s.id !== op.stroke.id) } : null;
    if (op.kind === 'move') return op.ids.some(id => present.has(id)) ? applyInk(p, { ...op, dx: -op.dx, dy: -op.dy }) : null;
    if (op.removed.some(r => present.has(r.stroke.id))) return null;
    // Back in their old places: ascending indexes rebuild the original order.
    const strokes = [...p.strokes];
    for (const r of [...op.removed].sort((a, b) => a.index - b.index)) strokes.splice(Math.min(r.index, strokes.length), 0, r.stroke);
    return { ...p, strokes };
}

// Hydrate the last board from localStorage at module init so bordmodus reopens
// where the teacher left off (mid-lesson browser hiccups included).
const restored = loadBoardAutosave();

export const useBoardStore = create<BoardState>((set, get) => ({
    pages: restored?.pages ?? [emptyPage()],
    activePageIdx: Math.min(restored?.activePageIdx ?? 0, (restored?.pages.length ?? 1) - 1),
    selectedWidgetId: null,
    tool: 'select',
    gridSnap: false,
    gridSize: 40,

    addWidget: (w) => {
        const id = rndId();
        set((state) => {
            const page = state.pages[state.activePageIdx];
            // New widget always lands on top of the current stack.
            const z = page.widgets.length ? Math.max(...page.widgets.map(x => x.z)) + 1 : 1;
            // The teacher's "Bewaar als mijn standaard" for this kind; the caller's props win.
            const mine = w.kind === 'exercise' ? null : loadWidgetDefaults(w.kind);
            const added = mine ? { ...w, props: { ...mine, ...w.props } } : w;
            return {
                ...withActivePage(state, (p) => ({ ...p, widgets: [...p.widgets, { ...added, id, z }] })),
                selectedWidgetId: id,
            };
        });
        return id;
    },

    updateWidget: (id, patch) => set((state) =>
        withActivePage(state, (p) => ({ ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, ...patch } : w) }))),

    removeWidget: (id) => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, widgets: p.widgets.filter(w => w.id !== id) })),
        selectedWidgetId: state.selectedWidgetId === id ? null : state.selectedWidgetId,
    })),

    duplicateWidget: (id) => set((state) => {
        const page = state.pages[state.activePageIdx];
        const src = page.widgets.find(w => w.id === id);
        if (!src) return state;
        const copy: BoardWidget = JSON.parse(JSON.stringify(src));
        copy.id = rndId();
        copy.x += 28; copy.y += 28;
        copy.z = Math.max(...page.widgets.map(w => w.z)) + 1;
        if (copy.block) copy.block = withFreshIds(copy.block);
        return {
            ...withActivePage(state, (p) => ({ ...p, widgets: [...p.widgets, copy] })),
            selectedWidgetId: copy.id,
        };
    }),

    bringToFront: (id) => set((state) => withActivePage(state, (p) => {
        const top = p.widgets.length ? Math.max(...p.widgets.map(x => x.z)) : 0;
        return { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, z: top + 1 } : w) };
    })),

    selectWidget: (id) => set((state) => ({
        selectedWidgetId: id,
        inspectorOpen: id === null ? false : state.inspectorOpen && id === state.selectedWidgetId,
    })),
    inspectorOpen: false,
    setInspectorOpen: (open) => set({ inspectorOpen: open }),
    geldPaletOpen: false,
    setGeldPaletOpen: (open) => set({ geldPaletOpen: open }),

    addPage: () => set((state) => ({
        pages: [...state.pages, emptyPage()],
        activePageIdx: state.pages.length,
        selectedWidgetId: null,
        selectedInstrumentId: null,
        ...freshInk,
    })),

    duplicatePage: () => set((state) => {
        const src = state.pages[state.activePageIdx];
        // Deep copy incl. fresh ids so edits on the copy never alias the original.
        const copy: BoardPage = JSON.parse(JSON.stringify(src));
        copy.id = rndId();
        copy.widgets.forEach(w => { w.id = rndId(); if (w.block) w.block = withFreshIds(w.block); });
        copy.strokes.forEach(s => { s.id = rndId(); });
        copy.instruments?.forEach(i => { i.id = rndId(); });
        const pages = [...state.pages];
        pages.splice(state.activePageIdx + 1, 0, copy);
        return { pages, activePageIdx: state.activePageIdx + 1, selectedWidgetId: null, selectedInstrumentId: null, ...freshInk };
    }),

    removePage: () => set((state) => {
        if (state.pages.length <= 1) {
            // Last page: clear it instead of leaving a page-less board.
            return { pages: [emptyPage()], activePageIdx: 0, selectedWidgetId: null, selectedInstrumentId: null, ...freshInk };
        }
        const pages = state.pages.filter((_, i) => i !== state.activePageIdx);
        return { pages, activePageIdx: Math.min(state.activePageIdx, pages.length - 1), selectedWidgetId: null, selectedInstrumentId: null, ...freshInk };
    }),

    gotoPage: (idx) => {
        const n = get().pages.length;
        set({ activePageIdx: Math.max(0, Math.min(n - 1, idx)), selectedWidgetId: null, selectedInstrumentId: null, ...freshInk });
    },

    // Mass delete on the current page (background and instruments stay: they are tools, not content).
    clearActivePage: () => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, widgets: [], strokes: [] })),
        selectedWidgetId: null,
        ...freshInk,
    })),

    setBackground: (bg) => set((state) => withActivePage(state, (p) => ({ ...p, background: bg }))),

    setTool: (t) => set({ tool: t, selectedWidgetId: t === 'select' ? get().selectedWidgetId : null, selectedStrokeIds: [] }),
    setGridSnap: (on) => set({ gridSnap: on }),
    setGridSize: (px) => set({ gridSize: px }),

    inkSettings: loadInkSettings(),
    setInkSetting: (tool, patch) => set((state) => ({
        inkSettings: { ...state.inkSettings, [tool]: { ...state.inkSettings[tool], ...patch } },
    })),
    drawOptions: { arrow: 'none', dashed: false, shape: 'rect', fill: false },
    setDrawOptions: (patch) => set((state) => ({ drawOptions: { ...state.drawOptions, ...patch } })),

    _undoInk: [],
    _redoInk: [],
    selectedStrokeIds: [],
    selectStrokes: (ids) => set({ selectedStrokeIds: ids }),

    addStroke: (s) => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, strokes: [...p.strokes, s] })),
        _undoInk: [...state._undoInk, { kind: 'add', stroke: s }],
        _redoInk: [],
    })),
    // Any removal makes the redo history ambiguous, so it clears.
    removeStrokes: (ids, opts) => set((state) => {
        const page = state.pages[state.activePageIdx];
        const removed = page.strokes.flatMap((stroke, index) => (ids.includes(stroke.id) ? [{ stroke, index }] : []));
        return {
            ...withActivePage(state, (p) => ({ ...p, strokes: p.strokes.filter(st => !ids.includes(st.id)) })),
            ...(opts?.undoable && removed.length ? { _undoInk: [...state._undoInk, { kind: 'remove' as const, removed }] } : {}),
            _redoInk: [],
            selectedStrokeIds: state.selectedStrokeIds.filter(id => !ids.includes(id)),
        };
    }),
    moveStrokes: (ids, dx, dy) => set((state) => {
        if (!dx && !dy) return state;
        const op: InkOp = { kind: 'move', ids, dx, dy };
        return { ...withActivePage(state, (p) => applyInk(p, op)), _undoInk: [...state._undoInk, op], _redoInk: [] };
    }),
    // Walks the history back. An entry the eraser made stale (its strokes are gone) is skipped;
    // with no history left (a loaded board) the last stroke goes, as before the history existed.
    undoStroke: () => set((state) => {
        const page = state.pages[state.activePageIdx];
        const log = [...state._undoInk];
        while (log.length) {
            const op = log.pop()!;
            const back = revertInk(page, op);
            if (!back) continue;
            // An add is redone with the stroke as it is now (a later move was already taken back).
            const redo: InkOp = op.kind === 'add' ? { kind: 'add', stroke: page.strokes.find(s => s.id === op.stroke.id) ?? op.stroke } : op;
            return { ...withActivePage(state, () => back), _undoInk: log, _redoInk: [...state._redoInk, redo] };
        }
        if (!page.strokes.length) return state._undoInk.length ? { _undoInk: [] } : state;
        const last = page.strokes[page.strokes.length - 1];
        return {
            ...withActivePage(state, (p) => ({ ...p, strokes: p.strokes.slice(0, -1) })),
            _undoInk: [],
            _redoInk: [...state._redoInk, { kind: 'add', stroke: last }],
        };
    }),
    redoStroke: () => set((state) => {
        if (!state._redoInk.length) return state;
        const op = state._redoInk[state._redoInk.length - 1];
        return {
            ...withActivePage(state, (p) => applyInk(p, op)),
            _undoInk: [...state._undoInk, op],
            _redoInk: state._redoInk.slice(0, -1),
        };
    }),

    selectedInstrumentId: null,
    toggleInstrument: (kind, boardW = 0, boardH = 0) => set((state) => {
        const existing = (state.pages[state.activePageIdx].instruments ?? []).find(i => i.kind === kind);
        if (existing) {
            return {
                ...withActivePage(state, (p) => ({ ...p, instruments: (p.instruments ?? []).filter(i => i.id !== existing.id) })),
                selectedInstrumentId: state.selectedInstrumentId === existing.id ? null : state.selectedInstrumentId,
            };
        }
        const inst: Instrument = { id: rndId(), ...defaultInstrument(kind, boardW, boardH) };
        return {
            ...withActivePage(state, (p) => ({ ...p, instruments: [...(p.instruments ?? []), inst] })),
            selectedInstrumentId: inst.id,
        };
    }),
    updateInstrument: (id, patch) => set((state) => withActivePage(state, (p) => ({
        ...p, instruments: (p.instruments ?? []).map(i => (i.id === id ? { ...i, ...patch } : i)),
    }))),
    removeInstrument: (id) => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, instruments: (p.instruments ?? []).filter(i => i.id !== id) })),
        selectedInstrumentId: state.selectedInstrumentId === id ? null : state.selectedInstrumentId,
    })),
    hideAllInstruments: () => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, instruments: [] })),
        selectedInstrumentId: null,
    })),
    selectInstrument: (id) => set({ selectedInstrumentId: id }),

    boardSettings: restored?.settings ?? DEFAULT_BOARD_SETTINGS,
    setKeepHandles: (on) => set((state) => ({ boardSettings: { ...state.boardSettings, keepHandles: on } })),

    loadBoard: (pages, activeIdx = 0, settings) => set({
        pages: pages.length ? pages : [emptyPage()],
        activePageIdx: Math.max(0, Math.min(pages.length - 1, activeIdx)),
        selectedWidgetId: null,
        selectedInstrumentId: null,
        ...freshInk,
        ...(settings ? { boardSettings: settings } : {}),
    }),

    resetBoard: () => set({ pages: [emptyPage()], activePageIdx: 0, selectedWidgetId: null, selectedInstrumentId: null, ...freshInk }),
}));

// Debounced autosave — 1.5s after the last board mutation (same cadence as the
// worksheet autosave). Pages, activePageIdx and the board settings are persisted; tool state is not.
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
useBoardStore.subscribe((state, prev) => {
    if (state.pages === prev.pages && state.activePageIdx === prev.activePageIdx && state.boardSettings === prev.boardSettings) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        const s = useBoardStore.getState();
        saveBoardAutosave(s.pages, s.activePageIdx, s.boardSettings);
    }, 1500);
});

// The ink a tool draws with right now: a picked colour as is, the default one for the active
// page's board (white pen on a dark board).
export function effectiveInk(state: Pick<BoardState, 'inkSettings' | 'pages' | 'activePageIdx'>, tool: StrokeTool): { color: string; width: number } {
    const cfg = state.inkSettings[tool];
    return { color: inkColor(cfg, tool, !!state.pages[state.activePageIdx]?.background.dark), width: cfg.width };
}

useBoardStore.subscribe((state, prev) => {
    if (state.inkSettings !== prev.inkSettings) saveInkSettings(state.inkSettings);
});
