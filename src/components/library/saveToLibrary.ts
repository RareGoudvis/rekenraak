import { useWorksheetStore } from '../../store/useWorksheetStore';
import { savePreset, updatePreset } from '../../services/persistence';

export type LibrarySaveOutcome = 'updated' | 'saved' | 'cancelled' | 'empty' | 'failed';

export const LIBRARY_FULL_TEXT = 'Bewaren mislukt: de opslag van deze browser is vol. Bewaar het blad als bestand.';

// "Bewaren" for Mijn bladen, shared by the top-bar menu and the library view: a sheet opened
// from the library updates that entry (like Word), any other sheet asks a name once.
export function saveCurrentToLibrary(): LibrarySaveOutcome {
    const st = useWorksheetStore.getState();
    if (st.blocks.length === 0) { window.alert('Het huidige blad is leeg.'); return 'empty'; }
    if (st.savedPresetId) {
        const result = updatePreset(st.savedPresetId, st);
        if (result === 'ok') return 'updated';
        if (result === 'failed') { window.alert(LIBRARY_FULL_TEXT); return 'failed'; }
        // 'missing': the entry was deleted meanwhile (another tab), so save it as a new one.
    }
    const name = window.prompt('Naam voor dit blad:', st.header.titel || 'Mijn blad');
    if (name === null) return 'cancelled';
    const saved = savePreset(name, st);
    if (!saved) { window.alert(LIBRARY_FULL_TEXT); return 'failed'; }
    st.setSavedPresetId(saved.id);
    return 'saved';
}
