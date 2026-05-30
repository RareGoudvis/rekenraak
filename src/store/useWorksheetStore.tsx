import { create } from 'zustand';
import type { MathBlock, Equation, CijferExercise, FooterData, LayoutPreset } from '../services/math/types';
import { regenerateBlock } from '../services/generateDispatch';
import { REGISTRY } from '../config/exerciseRegistry';
import { saveAutosave } from '../services/persistence';

export type HeaderField = 'naam' | 'klas' | 'nummer' | 'datum';

export interface HeaderData {
    naam: boolean;
    klas: boolean;
    nummer: boolean;
    datum: boolean;
    titel: string;
    fieldOrder?: HeaderField[];
    fieldWidths?: Record<HeaderField, number>;
    repeatHeader?: boolean;   // print only: repeat the name fields strip at the top of every page
}

export const DEFAULT_FIELD_ORDER: HeaderField[] = ['naam', 'klas', 'nummer', 'datum'];
export const DEFAULT_FIELD_WIDTHS: Record<HeaderField, number> = { naam: 240, klas: 90, nummer: 80, datum: 140 };

export interface DocSettings {
    showScores: boolean;
    opdrachtTitelStyle: 'regular' | 'boxed' | 'underlined';
    showDividers: boolean;
    headerStyle: 'geen' | 'kader';
    titlePosition: 'left' | 'center' | 'right';
    titleFieldsGap: number;
    headerContentGap: number;
    blockSpacing: number;   // vertical gap between exercise sets (blocks)
    numberBlocks: boolean;
}

export type ThemeName = 'dark' | 'light' | 'colorblind';

interface WorksheetState {
    blocks: MathBlock[];
    activeBlockId: string | 'document' | null;
    header: HeaderData;
    footer: FooterData;
    docSettings: DocSettings;
    showSolutions: boolean;
    theme: ThemeName;
    _history: MathBlock[][];
    _historyIndex: number;
    addBlockFromType: (typeId: string, label: string, overrideConstraints?: Record<string, unknown>) => void;
    removeBlock: (id: string) => void;
    moveBlockUp: (id: string) => void;
    moveBlockDown: (id: string) => void;
    updateBlockInstruction: (id: string, text: string) => void;
    updateBlockLayout: (id: string, layout: LayoutPreset, steppedLines?: number) => void;
    updateBlockSettings: (id: string, updates: Partial<MathBlock>) => void;
    // Generic exercise setter: writes a generated array to the given MathBlock
    // field (e.g. 'exercises', 'mabExercises'). Replaces the old per-type setters.
    setExercises: (id: string, field: keyof MathBlock, data: unknown[]) => void;
    updateExercise: (blockId: string, exerciseId: string, updates: Partial<Equation>) => void;
    updateCijferExercise: (blockId: string, exerciseId: string, updates: Partial<CijferExercise>) => void;
    setActiveSelection: (id: string | 'document' | null) => void;
    toggleBlockLock: (id: string) => void;
    duplicateBlock: (id: string) => void;
    generateAllBlocks: () => void;
    loadWorksheet: (file: { blocks: MathBlock[]; header: HeaderData; footer: FooterData; docSettings: DocSettings }) => void;
    updateHeader: (updates: Partial<HeaderData>) => void;
    updateFooter: (updates: Partial<FooterData>) => void;
    updateDocSettings: (updates: Partial<DocSettings>) => void;
    setShowSolutions: (show: boolean) => void;
    setTheme: (theme: ThemeName) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

const MAX_HISTORY = 50;

// Read persisted theme once at module load. Default 'dark' for first-time users
// or when localStorage is unavailable (SSR / privacy modes).
function loadInitialTheme(): ThemeName {
    try {
        const v = localStorage.getItem('theme');
        if (v === 'light' || v === 'dark' || v === 'colorblind') return v;
    } catch { /* ignore */ }
    return 'dark';
}

// Apply theme attribute to <html> so CSS variables switch immediately. Called
// at store init and from setTheme.
function applyTheme(theme: ThemeName): void {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
}

function pushHistory(history: MathBlock[][], index: number, blocks: MathBlock[]): { _history: MathBlock[][], _historyIndex: number } {
    const sliced = history.slice(0, index + 1);
    const next = [...sliced, blocks].slice(-MAX_HISTORY);
    return { _history: next, _historyIndex: next.length - 1 };
}

const INITIAL_THEME = loadInitialTheme();
applyTheme(INITIAL_THEME);

export const useWorksheetStore = create<WorksheetState>((set, get) => ({
    blocks: [],
    activeBlockId: null,
    header: { naam: true, klas: true, nummer: false, datum: false, titel: '', fieldOrder: [...DEFAULT_FIELD_ORDER], fieldWidths: { ...DEFAULT_FIELD_WIDTHS }, repeatHeader: false },
    footer: { school: '', klas: '', leerkracht: '', showSchool: true, showKlas: true, showLeerkracht: true, showPagina: true, centerText: '', showCenterText: false },
    docSettings: { showScores: true, opdrachtTitelStyle: 'regular', showDividers: true, headerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16, headerContentGap: 12, blockSpacing: 12, numberBlocks: false },
    showSolutions: false,
    theme: INITIAL_THEME,
    _history: [[]],
    _historyIndex: 0,

    undo: () => set((state) => {
        const idx = state._historyIndex - 1;
        if (idx < 0) return state;
        return { blocks: state._history[idx], _historyIndex: idx };
    }),
    redo: () => set((state) => {
        const idx = state._historyIndex + 1;
        if (idx >= state._history.length) return state;
        return { blocks: state._history[idx], _historyIndex: idx };
    }),
    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,

    setExercises: (id, field, data) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, [field]: data } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),

    addBlockFromType: (typeId, label, overrideConstraints) => set((state) => {
        // All per-type defaults live in the registry. The appstructure leaf's
        // defaultConstraints (e.g. { numberType:'decimal' }) arrive as
        // overrideConstraints and are merged on top.
        const def = REGISTRY[typeId];
        const defaultConstraints = def ? def.defaultConstraints(typeId) : {};

        const newBlock: MathBlock = {
            id: Math.random().toString(36).substring(2, 9),
            typeId,
            instructionText: `${label}:`,
            instructionMode: 'geen',
            layoutPreset: 'inline-short',
            steppedLines: 3,
            numberOfExercises: def ? def.defaultCount : 10,
            totalPoints: 5,
            verticalSpacing: 14,
            constraints: { ...defaultConstraints, ...overrideConstraints },
            exercises: []
        };

        const newBlocks = [...state.blocks, newBlock];
        return { blocks: newBlocks, activeBlockId: newBlock.id, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    removeBlock: (id) => set((state) => {
        const newBlocks = state.blocks.filter(b => b.id !== id);
        return { blocks: newBlocks, activeBlockId: state.activeBlockId === id ? null : state.activeBlockId, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    moveBlockUp: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index <= 0) return state;
        const newBlocks = [...state.blocks];
        [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
        return { blocks: newBlocks, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    moveBlockDown: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1 || index === state.blocks.length - 1) return state;
        const newBlocks = [...state.blocks];
        [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        return { blocks: newBlocks, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    updateBlockInstruction: (id, text) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, instructionText: text } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateBlockLayout: (id, layout, steppedLines) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, layoutPreset: layout, steppedLines: steppedLines ?? b.steppedLines } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateBlockSettings: (id, updates) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, ...updates } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateCijferExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, cijferExercises: (b.cijferExercises || []).map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    setActiveSelection: (id) => set({ activeBlockId: id }),
    toggleBlockLock: (id) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, locked: !b.locked } : b) })),
    loadWorksheet: (file) => set(() => ({
        blocks: file.blocks,
        header: file.header,
        footer: file.footer,
        docSettings: file.docSettings,
        activeBlockId: null,
        _history: [file.blocks],
        _historyIndex: 0,
    })),
    generateAllBlocks: () => {
        // Loop over the current snapshot. Each setExercises call inside
        // regenerateBlock schedules a set() that pushes history individually, so
        // iterating the pre-call snapshot is safe — we don't read state mid-loop.
        const state = get();
        for (const block of state.blocks) {
            if (block.locked) continue;
            regenerateBlock(block, state.setExercises);
        }
    },
    updateHeader: (updates) => set((state) => ({ header: { ...state.header, ...updates } })),
    updateFooter: (updates) => set((state) => ({ footer: { ...state.footer, ...updates } })),
    updateDocSettings: (updates) => set((state) => ({ docSettings: { ...state.docSettings, ...updates } })),
    setShowSolutions: (show) => set({ showSolutions: show }),
    setTheme: (theme) => {
        applyTheme(theme);
        try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
        set({ theme });
    },
    duplicateBlock: (id) => set((state) => {
        const index = state.blocks.findIndex(b => b.id === id);
        if (index === -1) return state;
        const src = state.blocks[index];
        const clone: MathBlock = JSON.parse(JSON.stringify(src));
        clone.id = Math.random().toString(36).substring(2, 9);
        clone.locked = false;
        const newBlocks = [...state.blocks.slice(0, index + 1), clone, ...state.blocks.slice(index + 1)];
        return { blocks: newBlocks, activeBlockId: clone.id, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),
}));

// Auto-save: debounced 1.5 s after the worksheet payload (blocks/header/footer/docSettings)
// changes. UI-only state (activeBlockId, showSolutions, theme, history) is excluded — those
// shouldn't trigger a write nor should they pollute the saved snapshot.
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useWorksheetStore.subscribe((state, prev) => {
    const changed =
        state.blocks !== prev.blocks ||
        state.header !== prev.header ||
        state.footer !== prev.footer ||
        state.docSettings !== prev.docSettings;
    if (!changed) return;
    // Don't overwrite a populated autosave with an empty fresh-tab state.
    if (state.blocks.length === 0) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveAutosave({ blocks: state.blocks, header: state.header, footer: state.footer, docSettings: state.docSettings });
    }, 1500);
});