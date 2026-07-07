import { create } from 'zustand';
import type { BoardPage, BoardWidget, BoardTool, BoardBackground, Stroke, StrokeTool } from './boardTypes';
import { emptyPage, rndId } from './boardTypes';
import { loadBoardAutosave, saveBoardAutosave } from './boardPersistence';

export interface InkSettings { color: string; width: number; }

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
    bringToFront: (id: string) => void;
    selectWidget: (id: string | null) => void;

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

    // ink (always the active page)
    addStroke: (s: Stroke) => void;
    removeStrokes: (ids: string[]) => void;
    undoStroke: () => void;
    redoStroke: () => void;
    _redoStrokes: Stroke[];    // in-memory only (cleared on page switch / erase)

    // persistence hooks (boardPersistence.ts)
    loadBoard: (pages: BoardPage[], activeIdx?: number) => void;
    resetBoard: () => void;
}

// Immutable helper: apply fn to the active page only.
function withActivePage(state: BoardState, fn: (p: BoardPage) => BoardPage): Pick<BoardState, 'pages'> {
    return { pages: state.pages.map((p, i) => (i === state.activePageIdx ? fn(p) : p)) };
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
            return {
                ...withActivePage(state, (p) => ({ ...p, widgets: [...p.widgets, { ...w, id, z }] })),
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

    bringToFront: (id) => set((state) => withActivePage(state, (p) => {
        const top = p.widgets.length ? Math.max(...p.widgets.map(x => x.z)) : 0;
        return { ...p, widgets: p.widgets.map(w => w.id === id ? { ...w, z: top + 1 } : w) };
    })),

    selectWidget: (id) => set({ selectedWidgetId: id }),

    addPage: () => set((state) => ({
        pages: [...state.pages, emptyPage()],
        activePageIdx: state.pages.length,
        selectedWidgetId: null,
    })),

    duplicatePage: () => set((state) => {
        const src = state.pages[state.activePageIdx];
        // Deep copy incl. fresh ids so edits on the copy never alias the original.
        const copy: BoardPage = JSON.parse(JSON.stringify(src));
        copy.id = rndId();
        copy.widgets.forEach(w => { w.id = rndId(); });
        copy.strokes.forEach(s => { s.id = rndId(); });
        const pages = [...state.pages];
        pages.splice(state.activePageIdx + 1, 0, copy);
        return { pages, activePageIdx: state.activePageIdx + 1, selectedWidgetId: null };
    }),

    removePage: () => set((state) => {
        if (state.pages.length <= 1) {
            // Last page: clear it instead of leaving a page-less board.
            return { pages: [emptyPage()], activePageIdx: 0, selectedWidgetId: null };
        }
        const pages = state.pages.filter((_, i) => i !== state.activePageIdx);
        return { pages, activePageIdx: Math.min(state.activePageIdx, pages.length - 1), selectedWidgetId: null };
    }),

    gotoPage: (idx) => {
        const n = get().pages.length;
        set({ activePageIdx: Math.max(0, Math.min(n - 1, idx)), selectedWidgetId: null, _redoStrokes: [] });
    },

    // Mass delete on the current page (background stays).
    clearActivePage: () => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, widgets: [], strokes: [] })),
        selectedWidgetId: null,
    })),

    setBackground: (bg) => set((state) => withActivePage(state, (p) => ({ ...p, background: bg }))),

    setTool: (t) => set({ tool: t, selectedWidgetId: t === 'select' ? get().selectedWidgetId : null }),
    setGridSnap: (on) => set({ gridSnap: on }),
    setGridSize: (px) => set({ gridSize: px }),

    inkSettings: {
        pen: { color: '#111827', width: 4 },
        marker: { color: '#fde047', width: 18 },
    },
    setInkSetting: (tool, patch) => set((state) => ({
        inkSettings: { ...state.inkSettings, [tool]: { ...state.inkSettings[tool], ...patch } },
    })),

    _redoStrokes: [],
    addStroke: (s) => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, strokes: [...p.strokes, s] })),
        _redoStrokes: [],
    })),
    // Eraser delete: redo history becomes ambiguous, so it clears.
    removeStrokes: (ids) => set((state) => ({
        ...withActivePage(state, (p) => ({ ...p, strokes: p.strokes.filter(st => !ids.includes(st.id)) })),
        _redoStrokes: [],
    })),
    undoStroke: () => set((state) => {
        const page = state.pages[state.activePageIdx];
        if (!page.strokes.length) return state;
        const last = page.strokes[page.strokes.length - 1];
        return {
            ...withActivePage(state, (p) => ({ ...p, strokes: p.strokes.slice(0, -1) })),
            _redoStrokes: [...state._redoStrokes, last],
        };
    }),
    redoStroke: () => set((state) => {
        if (!state._redoStrokes.length) return state;
        const s = state._redoStrokes[state._redoStrokes.length - 1];
        return {
            ...withActivePage(state, (p) => ({ ...p, strokes: [...p.strokes, s] })),
            _redoStrokes: state._redoStrokes.slice(0, -1),
        };
    }),

    loadBoard: (pages, activeIdx = 0) => set({
        pages: pages.length ? pages : [emptyPage()],
        activePageIdx: Math.max(0, Math.min(pages.length - 1, activeIdx)),
        selectedWidgetId: null,
    }),

    resetBoard: () => set({ pages: [emptyPage()], activePageIdx: 0, selectedWidgetId: null }),
}));

// Debounced autosave — 1.5s after the last board mutation (same cadence as the
// worksheet autosave). Only pages/activePageIdx are persisted; tool state is not.
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
useBoardStore.subscribe((state, prev) => {
    if (state.pages === prev.pages && state.activePageIdx === prev.activePageIdx) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveBoardAutosave(useBoardStore.getState().pages, useBoardStore.getState().activePageIdx), 1500);
});
