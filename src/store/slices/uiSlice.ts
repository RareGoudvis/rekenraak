import type { StateCreator } from 'zustand';
import type { UiSlice, WorksheetState } from '../types';
import { initialView, isBordPage, leaveBordPage } from '../../bootEntry';

// Sidebar hover-preview toggle persists across sessions (default on).
// Absent/unavailable → true.
const SIDEBAR_PREVIEW_KEY = 'rekenraak_sidebar_preview';
function loadInitialSidebarPreview(): boolean {
    try { return localStorage.getItem(SIDEBAR_PREVIEW_KEY) !== '0'; } catch { return true; }
}
const INITIAL_SIDEBAR_PREVIEW = loadInitialSidebarPreview();

export const createUiSlice: StateCreator<WorksheetState, [], [], UiSlice> = (set, get) => ({
    activeBlockId: null,
    sidebarTab: 'oefeningen',
    eenvoudigPanel: null,
    inspectorScope: 'block',
    inspectorSections: { block: null, blad: 'koptekst' },
    oefenInitial: null,
    oefenReturn: 'editor',
    oefenOpenSeq: 0,
    showSolutions: false,
    view: initialView(),
    sidebarPreview: INITIAL_SIDEBAR_PREVIEW,
    saveState: 'idle',
    lastSavedAt: null,
    blockPages: {},
    debugIgnoreMinWidth: false,

    // Selecting a real block opens its scope. Picking a block while the panel sat on
    // Heel het blad used to leave you there, so every selection cost an extra click.
    // 'document'/null keep the scope, since the block scope is disabled without a selection.
    setActiveSelection: (id) => set(id && id !== 'document'
        ? { activeBlockId: id, inspectorScope: 'block' }
        : { activeBlockId: id }),
    // Pure view state, like the other UI toggles: never pushed to history.
    setSidebarTab: (t) => set({ sidebarTab: t }),
    setEenvoudigPanel: (panel) => set({ eenvoudigPanel: panel }),
    setInspectorScope: (scope) => set({ inspectorScope: scope }),
    setInspectorSection: (scope, section) => set((st) => ({ inspectorScope: scope, inspectorSections: { ...st.inspectorSections, [scope]: section } })),
    // Opened from Mijn bladen, "terug" goes back there; from anywhere else to the editor.
    openOefenmodus: (initial) => set((st) => ({
        view: 'oefenmodus', oefenInitial: initial ?? null, oefenOpenSeq: st.oefenOpenSeq + 1,
        oefenReturn: st.view === 'mijn-bladen' ? 'mijn-bladen' : 'editor',
    })),
    closeOefenmodus: () => { get().setView(get().oefenReturn); set({ oefenInitial: null }); },
    setShowSolutions: (show) => set({ showSolutions: show }),
    setView: (view) => {
        // On bord.html the board IS the page, so leaving it leaves the page too.
        if (view !== 'whiteboard' && isBordPage()) { leaveBordPage(); return; }
        set({ view });
    },
    setBlockPages: (pages) => set({ blockPages: pages }),
    setIgnoreMinWidth: (on) => set({ debugIgnoreMinWidth: on }),
    setSidebarPreview: (on) => {
        try { localStorage.setItem(SIDEBAR_PREVIEW_KEY, on ? '1' : '0'); } catch { /* ignore */ }
        set({ sidebarPreview: on });
    },
});
