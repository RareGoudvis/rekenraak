import type { StoreApi } from 'zustand';
import { saveAutosave } from '../services/persistence';
import type { WorksheetState } from './types';

// Auto-save: debounced 1.5 s after the worksheet payload (blocks/header/footer/docSettings)
// changes. UI-only state (activeBlockId, showSolutions, history) is excluded — those
// shouldn't trigger a write nor should they pollute the saved snapshot.
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

// One write + status update, shared by the debounced subscription and the immediate write
// after the sheet is linked to a Mijn bladen entry (a reload right after must keep the link).
export function writeAutosaveNow(store: StoreApi<WorksheetState>): void {
    const state = store.getState();
    const ok = saveAutosave({ blocks: state.blocks, header: state.header, footer: state.footer, docSettings: state.docSettings, baseSettings: state.baseSettings, selectedGrade: state.selectedGrade }, state.curriculum, state.savedPresetId);
    // lastSavedAt stays put on failure — it dates the last snapshot that really is on disk.
    store.setState(ok ? { saveState: 'saved', lastSavedAt: Date.now() } : { saveState: 'error' });
}

// Called once from useWorksheetStore.tsx right after the store is created.
export function installAutosave(store: StoreApi<WorksheetState>): void {
    // A second subscription would double every write and race the saveState flag.
    if (installed) return;
    installed = true;
    store.subscribe((state, prev) => {
        const changed =
            state.blocks !== prev.blocks ||
            state.header !== prev.header ||
            state.footer !== prev.footer ||
            state.docSettings !== prev.docSettings ||
            state.baseSettings !== prev.baseSettings ||
            state.selectedGrade !== prev.selectedGrade;
        if (!changed) return;
        // Don't overwrite a populated autosave with an empty fresh-tab state.
        if (state.blocks.length === 0) return;
        // Flag 'saving' for the top-bar tracker. This set() re-fires this subscription, but
        // the watched-ref check above is false for a saveState-only change → no loop.
        if (state.saveState !== 'saving') store.setState({ saveState: 'saving' });
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => writeAutosaveNow(store), 1500);
    });
}
