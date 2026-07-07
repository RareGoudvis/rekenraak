import type { BoardPage } from './boardTypes';
import { emptyPage } from './boardTypes';

// Board persistence — mirrors the worksheet persistence patterns (strict version
// check, debounced autosave, capped preset list) but fully separate keys/format.
// No share-link for boards in P1: stroke/image payloads can exceed URL limits.
export const BOARD_FORMAT_VERSION = 1;
export const BOARD_AUTOSAVE_KEY = 'rekenraak_board_autosave_v1';
export const BOARD_PRESETS_KEY = 'rekenraak_board_presets_v1';
export const MAX_BOARD_PRESETS = 30;

export interface BoardFile {
    version: number;
    exportedAt: string;
    pages: BoardPage[];
    activePageIdx?: number;
}

export interface BoardPreset {
    id: string;
    name: string;
    savedAt: string;
    pageCount: number;
    payload: BoardFile;
}

function makeFile(pages: BoardPage[], activePageIdx: number): BoardFile {
    return { version: BOARD_FORMAT_VERSION, exportedAt: new Date().toISOString(), pages, activePageIdx };
}

// Strict on read: wrong/missing version or malformed pages → null, never half-load.
export function parseBoardFile(json: string): BoardFile | null {
    try {
        const data = JSON.parse(json) as BoardFile;
        if (data.version !== BOARD_FORMAT_VERSION) return null;
        if (!Array.isArray(data.pages) || data.pages.length === 0) return null;
        if (!data.pages.every(p => p && Array.isArray(p.widgets) && Array.isArray(p.strokes) && p.background)) return null;
        return data;
    } catch {
        return null;
    }
}

// ── Autosave ──────────────────────────────────────────────────────────────────
export function saveBoardAutosave(pages: BoardPage[], activePageIdx: number): void {
    try {
        localStorage.setItem(BOARD_AUTOSAVE_KEY, JSON.stringify(makeFile(pages, activePageIdx)));
    } catch {
        // Quota exceeded (large images) — autosave silently skips; export still works.
    }
}

export function loadBoardAutosave(): BoardFile | null {
    const raw = localStorage.getItem(BOARD_AUTOSAVE_KEY);
    return raw ? parseBoardFile(raw) : null;
}

export function clearBoardAutosave(): void {
    localStorage.removeItem(BOARD_AUTOSAVE_KEY);
}

// ── Presets ("Mijn borden") ──────────────────────────────────────────────────
export function loadBoardPresets(): BoardPreset[] {
    try {
        const raw = localStorage.getItem(BOARD_PRESETS_KEY);
        const list = raw ? (JSON.parse(raw) as BoardPreset[]) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

export function saveBoardPreset(name: string, pages: BoardPage[], activePageIdx: number): BoardPreset[] {
    const list = loadBoardPresets();
    const preset: BoardPreset = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim() || 'Naamloos bord',
        savedAt: new Date().toISOString(),
        pageCount: pages.length,
        payload: makeFile(pages, activePageIdx),
    };
    const next = [preset, ...list].slice(0, MAX_BOARD_PRESETS);
    localStorage.setItem(BOARD_PRESETS_KEY, JSON.stringify(next));
    return next;
}

export function deleteBoardPreset(id: string): BoardPreset[] {
    const next = loadBoardPresets().filter(p => p.id !== id);
    localStorage.setItem(BOARD_PRESETS_KEY, JSON.stringify(next));
    return next;
}

// ── File export / import ─────────────────────────────────────────────────────
export function exportBoardFile(pages: BoardPage[], activePageIdx: number): void {
    const blob = new Blob([JSON.stringify(makeFile(pages, activePageIdx), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rekenraak-bord.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Fresh default board (used for "Leegmaken").
export function emptyBoard(): BoardPage[] {
    return [emptyPage()];
}
