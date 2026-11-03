import { useEffect, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { saveBoardPreset, type BoardPreset } from './boardPersistence';

// Shared by the rail's Bordinstellingen and the top-right Bewaren: name the board, keep it in
// Mijn borden. Returns the new list, or null when cancelled or refused (the alert says why).
export function promptSaveBoard(): BoardPreset[] | null {
    const name = window.prompt('Naam voor dit bord:', 'Mijn bord');
    if (name === null) return null;
    const st = useBoardStore.getState();
    const saved = saveBoardPreset(name, st.pages, st.activePageIdx, st.boardSettings);
    // Same wording as the sheet's TopBar save error; Exporteren still works when storage is full.
    if (!saved) { window.alert('Kon het bord niet bewaren (opslag vol?) — bewaar het als bestand via Exporteren.'); return null; }
    return saved;
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
