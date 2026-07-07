import { create } from 'zustand';
import type { BoardPage, BoardWidget, BoardTool, BoardBackground } from './boardTypes';
import { emptyPage, rndId } from './boardTypes';

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
    setBackground: (bg: BoardBackground) => void;

    // tools / settings
    setTool: (t: BoardTool) => void;
    setGridSnap: (on: boolean) => void;
    setGridSize: (px: number) => void;

    // persistence hooks (boardPersistence.ts)
    loadBoard: (pages: BoardPage[], activeIdx?: number) => void;
    resetBoard: () => void;
}

// Immutable helper: apply fn to the active page only.
function withActivePage(state: BoardState, fn: (p: BoardPage) => BoardPage): Pick<BoardState, 'pages'> {
    return { pages: state.pages.map((p, i) => (i === state.activePageIdx ? fn(p) : p)) };
}

export const useBoardStore = create<BoardState>((set, get) => ({
    pages: [emptyPage()],
    activePageIdx: 0,
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
        set({ activePageIdx: Math.max(0, Math.min(n - 1, idx)), selectedWidgetId: null });
    },

    setBackground: (bg) => set((state) => withActivePage(state, (p) => ({ ...p, background: bg }))),

    setTool: (t) => set({ tool: t, selectedWidgetId: t === 'select' ? get().selectedWidgetId : null }),
    setGridSnap: (on) => set({ gridSnap: on }),
    setGridSize: (px) => set({ gridSize: px }),

    loadBoard: (pages, activeIdx = 0) => set({
        pages: pages.length ? pages : [emptyPage()],
        activePageIdx: Math.max(0, Math.min(pages.length - 1, activeIdx)),
        selectedWidgetId: null,
    }),

    resetBoard: () => set({ pages: [emptyPage()], activePageIdx: 0, selectedWidgetId: null }),
}));
