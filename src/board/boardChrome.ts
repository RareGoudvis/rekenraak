import { useEffect, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { loadBoardPresets, saveBoardPreset, updateBoardPreset, type BoardPreset } from './boardPersistence';

export type BoardSaveOutcome = 'updated' | 'saved' | 'cancelled' | 'failed';

// Same wording as the sheet's TopBar save error; Exporteren still works when storage is full.
const BOARD_FULL_TEXT = 'Kon het bord niet bewaren (opslag vol?) — bewaar het als bestand via Exporteren.';

// "Bewaren" for Mijn borden (twin of the sheet's saveToLibrary.ts): a board opened from or saved
// to Mijn borden updates that entry, any other board (or asNew: Bewaren als…) asks a name once.
export function promptSaveBoard(asNew = false): { outcome: BoardSaveOutcome; presets: BoardPreset[] } {
    const st = useBoardStore.getState();
    if (st.savedBoardId && !asNew) {
        const result = updateBoardPreset(st.savedBoardId, st.pages, st.activePageIdx, st.boardSettings);
        if (result === 'ok') return { outcome: 'updated', presets: loadBoardPresets() };
        if (result === 'failed') { window.alert(BOARD_FULL_TEXT); return { outcome: 'failed', presets: loadBoardPresets() }; }
        // 'missing': deleted meanwhile, so it becomes a new entry below.
    }
    const current = st.savedBoardId ? loadBoardPresets().find(p => p.id === st.savedBoardId)?.name : undefined;
    const name = window.prompt('Naam voor dit bord:', current ? `${current} (kopie)` : 'Mijn bord');
    if (name === null) return { outcome: 'cancelled', presets: loadBoardPresets() };
    const saved = saveBoardPreset(name, st.pages, st.activePageIdx, st.boardSettings);
    if (!saved) { window.alert(BOARD_FULL_TEXT); return { outcome: 'failed', presets: loadBoardPresets() }; }
    st.setSavedBoardId(saved[0].id);
    return { outcome: 'saved', presets: saved };
}

// Volledig scherm on the board root (not the document), so the editor underneath never shows.
// Browsers without the Fullscreen API (older iPad Safari) get `supported: false`.
export function useBoardFullscreen(): { on: boolean; supported: boolean; toggle: () => void } {
    const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
    useEffect(() => {
        const sync = () => setOn(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', sync);
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);
    const supported = typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';
    const toggle = () => {
        if (document.fullscreenElement) { void document.exitFullscreen?.().catch(() => {}); return; }
        const root = document.querySelector<HTMLElement>('[data-whiteboard]');
        // A refused request (no user gesture, iframe policy) leaves the board as it is.
        void root?.requestFullscreen?.().catch(() => {});
    };
    return { on, supported, toggle };
}
