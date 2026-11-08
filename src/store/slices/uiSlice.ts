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

export const createUiSlice: StateCreator<WorksheetState, [], [], UiSlice> = (set) => ({
    activeBlockId: null,
    sidebarTab: 'oefeningen',
    eenvoudigPanel: null,
    inspectorTab: 'oefening',
    bladSection: 'koptekst',
    oefenBuilderOpen: false,
    showSolutions: false,
    view: initialView(),
    sidebarPreview: INITIAL_SIDEBAR_PREVIEW,
    saveState: 'idle',
    lastSavedAt: null,
    blockPages: {},
    debugIgnoreMinWidth: false,

    // Selecting a real block opens its content. Picking a block while the panel sat on
    // Blad used to leave you on Blad, so every selection cost an extra click to get to
    // what you actually came for. 'document'/null keep whatever tab was open, since the
    // block tabs are disabled without a selection anyway.
    setActiveSelection: (id) => set(id && id !== 'document'
        ? { activeBlockId: id, inspectorTab: 'oefening' }
        : { activeBlockId: id }),
    // Pure view state, like the other UI toggles: never pushed to history.
    setSidebarTab: (t) => set({ sidebarTab: t }),
    setEenvoudigPanel: (panel) => set({ eenvoudigPanel: panel }),
    setInspectorTab: (t) => set({ inspectorTab: t }),
    setBladSection: (s) => set({ bladSection: s }),
    setOefenBuilderOpen: (open) => set({ oefenBuilderOpen: open }),
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
