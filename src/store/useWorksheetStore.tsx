import { create } from 'zustand';
import type { MathBlock, Equation, CijferExercise, FooterData, LayoutPreset } from '../services/math/types';
import { regenerateBlock } from '../services/generateDispatch';
import { REGISTRY } from '../config/exerciseRegistry';
import { saveAutosave, type CurriculumLock } from '../services/persistence';
import { baseApply, DEFAULT_BASE, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { defaultInstructionFor } from '../config/instructionPresets';

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

// Power-user style overrides for one chrome region (header / opdracht-titel / footer).
// All optional; absent keys fall back to the region's default look. Deliberately has
// NO width/margin/position — those would break the dialog-proof A4 print layout.
export interface RegionStyle {
    fontSize?: number;
    bold?: boolean;
    color?: string;         // text color (from the curated print palette)
    background?: string;    // fill color ('' / undefined = none)
    align?: 'left' | 'center' | 'right';
    borderTop?: boolean;
    borderBottom?: boolean;
    borderBox?: boolean;
    borderWidth?: number;
    borderColor?: string;
    padX?: number;
    padY?: number;
}

export interface DocSettings {
    showScores: boolean;
    opdrachtTitelStyle: 'regular' | 'boxed' | 'underlined';
    showDividers: boolean;
    // Vertical rule in the gutter between blocks that share a row. showDividers is the
    // horizontal twin (a rule under each block); this one only ever draws where two
    // blocks actually sit side by side, so it is a no-op on a single-column sheet.
    showColumnDividers?: boolean;
    headerStyle: 'geen' | 'onderstreept' | 'kader';
    // Mirrors headerStyle for the footer. Defaults to 'geen': a rule above the footer
    // competes with the exercises for attention on a busy sheet.
    footerStyle?: 'geen' | 'lijn' | 'kader';
    titlePosition: 'left' | 'center' | 'right';
    titleFieldsGap: number;
    headerContentGap: number;
    blockSpacing: number;   // vertical gap between exercise sets (blocks)
    numberBlocks: boolean;
    // Style-builder overrides (custom wins over the enum presets above). Optional → back-compat.
    headerCustom?: RegionStyle;
    titelCustom?: RegionStyle;
    footerCustom?: RegionStyle;
    // Global content zoom for block bodies (exercise + opdracht-titel); 1 = 100%.
    // A per-block override lives in block.constraints.bodyFontScale. Optional → back-compat.
    bodyFontScale?: number;
}

// Which full-screen view is active. 'editor' = normal 3-panel editor; the others are
// full-screen library overlays. UI-only — never persisted/serialised.
export type WorksheetView = 'editor' | 'mijn-bladen' | 'bibliotheek';
// Autosave status surfaced in the top bar. UI-only.
export type SaveState = 'idle' | 'saving' | 'saved';

interface WorksheetState {
    blocks: MathBlock[];
    activeBlockId: string | 'document' | null;
    header: HeaderData;
    footer: FooterData;
    docSettings: DocSettings;
    baseSettings: BaseSettings;
    selectedGrade: Leerjaar | null;      // soft leerjaar starting point (seeds base + filters sidebar)
    curriculum: CurriculumLock | null;   // non-null + locked = restricted parent mode
    // Off-sheet scratch blocks edited by the curriculum builder so the real config
    // plugins can run unchanged (they target updateBlockSettings(block.id)). Not
    // rendered, not autosaved, no history.
    draftBlocks: MathBlock[];
    showSolutions: boolean;
    view: WorksheetView;             // active full-screen view (UI-only, not persisted)
    sidebarPreview: boolean;         // show a live example card when hovering a sidebar leaf (localStorage-backed)
    saveState: SaveState;            // autosave status for the top-bar tracker (UI-only)
    lastSavedAt: number | null;      // epoch ms of last successful autosave (UI-only)
    blockPages: Record<string, number>;  // measured page index per block (for Overzicht page-break markers; UI-only)
    _history: MathBlock[][];
    _historyIndex: number;
    addBlockFromType: (typeId: string, label: string, overrideConstraints?: Record<string, unknown>) => void;
    removeBlock: (id: string) => void;
    clearBlocks: () => void;
    moveBlockUp: (id: string) => void;
    moveBlockDown: (id: string) => void;
    reorderBlocks: (fromIndex: number, toIndex: number) => void;
    updateBlockInstruction: (id: string, text: string) => void;
    updateBlockLayout: (id: string, layout: LayoutPreset, steppedLines?: number) => void;
    updateBlockSettings: (id: string, updates: Partial<MathBlock>) => void;
    // Generic exercise setter: writes a generated array to the given MathBlock
    // field (e.g. 'exercises', 'mabExercises'). Replaces the old per-type setters.
    setExercises: (id: string, field: keyof MathBlock, data: unknown[]) => void;
    updateExercise: (blockId: string, exerciseId: string, updates: Partial<Equation>) => void;
    updateCijferExercise: (blockId: string, exerciseId: string, updates: Partial<CijferExercise>) => void;
    // Generic single-exercise patch for any array field (ordenen/getallenas/…), keyed by exercise id.
    patchExercise: (blockId: string, field: keyof MathBlock, exerciseId: string, patch: Record<string, unknown>) => void;
    setActiveSelection: (id: string | 'document' | null) => void;
    setDraftBlocks: (blocks: MathBlock[]) => void;
    clearDraftBlocks: () => void;
    toggleBlockLock: (id: string) => void;
    duplicateBlock: (id: string) => void;
    generateAllBlocks: () => void;
    loadWorksheet: (file: { blocks: MathBlock[]; header: HeaderData; footer: FooterData; docSettings: DocSettings; baseSettings?: BaseSettings; curriculum?: CurriculumLock; selectedGrade?: Leerjaar | null }) => void;
    updateHeader: (updates: Partial<HeaderData>) => void;
    updateFooter: (updates: Partial<FooterData>) => void;
    updateDocSettings: (updates: Partial<DocSettings>) => void;
    updateBaseSettings: (updates: Partial<BaseSettings>) => void;
    setSelectedGrade: (grade: Leerjaar | null) => void;
    // Panel tabs live in the store because their strips render in the TopBar, above the
    // column each belongs to, while the panels themselves render the content.
    // Blocks whose settings changed since their last generation. Not persisted and not
    // historied: it is a hint about the sheet, not part of it.
    staleBlocks: Record<string, boolean>;
    sidebarTab: 'oefeningen' | 'overzicht';
    setSidebarTab: (t: 'oefeningen' | 'overzicht') => void;
    inspectorTab: 'blad' | 'weergave' | 'oefening';
    setInspectorTab: (t: 'blad' | 'weergave' | 'oefening') => void;
    // Which sub-tab the Blad panel shows. Set by its own tab strip and by clicking the
    // header or footer ON the sheet, so both routes land in the same place. Transient UI
    // state: no history, never persisted or shared.
    bladSection: 'koptekst' | 'opdrachten' | 'voettekst';
    setBladSection: (s: 'koptekst' | 'opdrachten' | 'voettekst') => void;
    setShowSolutions: (show: boolean) => void;
    setView: (view: WorksheetView) => void;
    setSidebarPreview: (on: boolean) => void;
    setBlockPages: (pages: Record<string, number>) => void;
    /** Both return the id of the block the step changed, so the caller can scroll to it. */
    undo: () => string | null;
    redo: () => string | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

const MAX_HISTORY = 50;

// Which block a history step actually changed, preferring one that still exists in the
// restored array so the caller has something to scroll to. Undo is invisible when the
// affected block is off-screen, which reads as "nothing happened".
function changedBlockId(next: MathBlock[], prev: MathBlock[]): string | null {
    const prevById = new Map(prev.map((b) => [b.id, b]));
    for (const b of next) {
        const before = prevById.get(b.id);
        if (!before || JSON.stringify(before) !== JSON.stringify(b)) return b.id;
    }
    return null;
}

function pushHistory(history: MathBlock[][], index: number, blocks: MathBlock[]): { _history: MathBlock[][], _historyIndex: number } {
    const sliced = history.slice(0, index + 1);
    const next = [...sliced, blocks].slice(-MAX_HISTORY);
    return { _history: next, _historyIndex: next.length - 1 };
}

// Sidebar hover-preview toggle persists across sessions (default on).
// Absent/unavailable → true.
const SIDEBAR_PREVIEW_KEY = 'rekenraak_sidebar_preview';
function loadInitialSidebarPreview(): boolean {
    try { return localStorage.getItem(SIDEBAR_PREVIEW_KEY) !== '0'; } catch { return true; }
}
const INITIAL_SIDEBAR_PREVIEW = loadInitialSidebarPreview();

export const useWorksheetStore = create<WorksheetState>((set, get) => ({
    blocks: [],
    activeBlockId: null,
    header: { naam: true, klas: true, nummer: false, datum: false, titel: '', fieldOrder: [...DEFAULT_FIELD_ORDER], fieldWidths: { ...DEFAULT_FIELD_WIDTHS }, repeatHeader: false },
    footer: { school: '', klas: '', leerkracht: '', showSchool: false, showKlas: false, showLeerkracht: false, showPagina: false, centerText: '', showCenterText: false },
    docSettings: { showScores: false, opdrachtTitelStyle: 'regular', showDividers: false, showColumnDividers: false, headerStyle: 'geen', footerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16, headerContentGap: 12, blockSpacing: 12, numberBlocks: true, bodyFontScale: 1 },
    baseSettings: { ...DEFAULT_BASE },
    selectedGrade: null,
    staleBlocks: {},
    sidebarTab: 'oefeningen',
    inspectorTab: 'oefening',
    bladSection: 'koptekst',
    curriculum: null,
    draftBlocks: [],
    showSolutions: false,
    view: 'editor',
    sidebarPreview: INITIAL_SIDEBAR_PREVIEW,
    saveState: 'idle',
    lastSavedAt: null,
    blockPages: {},
    _history: [[]],
    _historyIndex: 0,

    undo: () => {
        const state = get();
        const idx = state._historyIndex - 1;
        if (idx < 0) return null;
        const restored = state._history[idx];
        set({ blocks: restored, _historyIndex: idx });
        return changedBlockId(restored, state.blocks);
    },
    redo: () => {
        const state = get();
        const idx = state._historyIndex + 1;
        if (idx >= state._history.length) return null;
        const restored = state._history[idx];
        set({ blocks: restored, _historyIndex: idx });
        return changedBlockId(restored, state.blocks);
    },
    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,

    setExercises: (id, field, data) => set((state) => { const nb = state.blocks.map(b => b.id === id ? { ...b, [field]: data } : b); const { [id]: _drop, ...stale } = state.staleBlocks; void _drop; return { blocks: nb, staleBlocks: stale, ...pushHistory(state._history, state._historyIndex, nb) }; }),

    addBlockFromType: (typeId, label, overrideConstraints) => set((state) => {
        // All per-type defaults live in the registry. The appstructure leaf's
        // defaultConstraints (e.g. { numberType:'decimal' }) arrive as
        // overrideConstraints and are merged on top.
        const def = REGISTRY[typeId];
        const defaultConstraints = def ? def.defaultConstraints(typeId) : {};
        // Snapshot the global base difficulty onto this block's constraints.
        // Order matters: registry defaults → base snapshot → leaf override, so a
        // leaf that pins a value (e.g. splitsen-basis maxGetal:10) always wins.
        const baseSnapshot = def ? baseApply(state.baseSettings, defaultConstraints) : {};

        const newBlock: MathBlock = {
            id: Math.random().toString(36).substring(2, 9),
            typeId,
            instructionText: defaultInstructionFor(typeId, label),
            instructionMode: 'geen',
            layoutPreset: 'inline-short',
            steppedLines: 3,
            numberOfExercises: def ? def.defaultCount : 10,
            totalPoints: 5,
            // Writing room between exercises. 14 was tight for a 7-year-old's handwriting;
            // teachers can still dial it 8-40 per block under Opmaak.
            verticalSpacing: 18,
            constraints: { ...defaultConstraints, ...baseSnapshot, ...overrideConstraints },
            exercises: []
        };

        // Generate straight away: an empty block tells the teacher nothing about the
        // exercise they just picked, and every add was followed by a Genereer click anyway.
        // A generator that throws must not take the whole add down with it.
        if (def) {
            try {
                const data = def.generate(newBlock);
                (newBlock as unknown as Record<string, unknown>)[def.exerciseField] = data;
            } catch { /* leave the block empty; the viewer shows its own placeholder */ }
        }

        const newBlocks = [...state.blocks, newBlock];
        return { blocks: newBlocks, activeBlockId: newBlock.id, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    removeBlock: (id) => set((state) => {
        const newBlocks = state.blocks.filter(b => b.id !== id);
        return { blocks: newBlocks, activeBlockId: state.activeBlockId === id ? null : state.activeBlockId, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    // Wipe all blocks at once. Pushes history so Ctrl+Z restores them (guarded by a confirm in the UI).
    clearBlocks: () => set((state) => ({ blocks: [], activeBlockId: null, ...pushHistory(state._history, state._historyIndex, []) })),

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

    // Drag-reorder from the Overzicht outline: move one block to an arbitrary index.
    // Order isn't frozen by curriculum lock (move-up/down already work locked).
    reorderBlocks: (fromIndex, toIndex) => set((state) => {
        const n = state.blocks.length;
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= n || toIndex >= n) return state;
        const newBlocks = [...state.blocks];
        const [moved] = newBlocks.splice(fromIndex, 1);
        newBlocks.splice(toIndex, 0, moved);
        return { blocks: newBlocks, ...pushHistory(state._history, state._historyIndex, newBlocks) };
    }),

    // Curriculum lock is enforced at the store — the single choke point all ~12
    // config plugins + Inspector route through. Wording/layout edits are frozen;
    // only block count + page-break survive (parent can adjust amount + regenerate).
    updateBlockInstruction: (id, text) => set((state) => { if (state.curriculum?.locked) return state; const nb = state.blocks.map(b => b.id === id ? { ...b, instructionText: text } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateBlockLayout: (id, layout, steppedLines) => set((state) => { if (state.curriculum?.locked) return state; const nb = state.blocks.map(b => b.id === id ? { ...b, layoutPreset: layout, steppedLines: steppedLines ?? b.steppedLines } : b); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateBlockSettings: (id, updates) => set((state) => {
        // Curriculum-builder draft blocks live off-sheet — edit them directly, no
        // history, no lock gate (authoring runs unlocked).
        if (state.draftBlocks.some(b => b.id === id)) {
            return { draftBlocks: state.draftBlocks.map(b => b.id === id ? { ...b, ...updates } : b) };
        }
        let next = updates;
        if (state.curriculum?.locked) {
            const allowed: Partial<MathBlock> = {};
            if ('numberOfExercises' in updates) allowed.numberOfExercises = updates.numberOfExercises;
            if ('pageBreakBefore' in updates) allowed.pageBreakBefore = updates.pageBreakBefore;
            if (Object.keys(allowed).length === 0) return state;   // drop difficulty/wording/points edits
            next = allowed;
        }
        // The exercise COUNT is the one setting people drag back and forth, and the only
        // one that does not invalidate the exercises already on the sheet: shrinking drops
        // the tail, growing appends fresh ones. Everything the teacher already liked stays.
        // The count slider also clamps the score, so it sends two keys. totalPoints is a
        // clamp rather than a content setting, so it does not make the exercises stale.
        const COUNT_SAFE = new Set(['numberOfExercises', 'totalPoints']);
        const countOnly = 'numberOfExercises' in next
            && Object.keys(next).every(k => COUNT_SAFE.has(k));
        const nb = state.blocks.map(b => {
            if (b.id !== id) return b;
            const merged = { ...b, ...next } as MathBlock;
            if (!countOnly) return merged;
            const def = REGISTRY[b.typeId];
            if (!def) return merged;
            const field = def.exerciseField as keyof MathBlock;
            const current = (b[field] as unknown as Array<unknown>) ?? [];
            const want = merged.numberOfExercises || 0;
            if (current.length === 0 || want === current.length) return merged;
            if (want < current.length) {
                return { ...merged, [field]: current.slice(0, want) } as MathBlock;
            }
            try {
                const extra = def.generate(merged) as unknown as Array<unknown>;
                const tail = extra.slice(0, want - current.length);
                return { ...merged, [field]: [...current, ...tail] } as MathBlock;
            } catch { return merged; }
        });
        // Any other setting means the exercises no longer match the settings — say so
        // rather than leaving the teacher to notice.
        const stale = countOnly ? state.staleBlocks : { ...state.staleBlocks, [id]: true };
        return { blocks: nb, staleBlocks: stale, ...pushHistory(state._history, state._historyIndex, nb) };
    }),
    updateExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, exercises: b.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    updateCijferExercise: (blockId, exerciseId, updates) => set((state) => { const nb = state.blocks.map(b => b.id !== blockId ? b : { ...b, cijferExercises: (b.cijferExercises || []).map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex) }); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    patchExercise: (blockId, field, exerciseId, patch) => set((state) => { const nb = state.blocks.map(b => { if (b.id !== blockId) return b; const arr = b[field] as Array<{ id: string }> | undefined; if (!Array.isArray(arr)) return b; return { ...b, [field]: arr.map(ex => ex.id === exerciseId ? { ...ex, ...patch } : ex) }; }); return { blocks: nb, ...pushHistory(state._history, state._historyIndex, nb) }; }),
    // Selecting a real block opens its content. Picking a block while the panel sat on
    // Blad used to leave you on Blad, so every selection cost an extra click to get to
    // what you actually came for. 'document'/null keep whatever tab was open, since the
    // block tabs are disabled without a selection anyway.
    setActiveSelection: (id) => set(id && id !== 'document'
        ? { activeBlockId: id, inspectorTab: 'oefening' }
        : { activeBlockId: id }),
    setDraftBlocks: (blocks) => set({ draftBlocks: blocks }),
    clearDraftBlocks: () => set({ draftBlocks: [] }),
    toggleBlockLock: (id) => set((state) => ({ blocks: state.blocks.map(b => b.id === id ? { ...b, locked: !b.locked } : b) })),
    loadWorksheet: (file) => set(() => ({
        blocks: file.blocks,
        header: file.header,
        footer: file.footer,
        docSettings: file.docSettings,
        baseSettings: file.baseSettings ? { ...DEFAULT_BASE, ...file.baseSettings } : { ...DEFAULT_BASE },
        curriculum: file.curriculum ?? null,
        // Set the grade value directly — base is already restored above, so we must
        // NOT re-run setSelectedGrade's preset seeding here.
        selectedGrade: file.selectedGrade ?? null,
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
    updateBaseSettings: (updates) => set((state) => ({ baseSettings: { ...state.baseSettings, ...updates } })),

    // Soft leerjaar pick: seed the base difficulty (only affects new blocks) and
    // remember the grade so the sidebar can hide later-grade leaves. Not a lock.
    setSelectedGrade: (grade) => set((state) => ({
        selectedGrade: grade,
        baseSettings: grade == null ? state.baseSettings : { ...state.baseSettings, ...GRADE_PRESETS[grade] },
    })),
    // Pure view state, like the other UI toggles: never pushed to history.
    setSidebarTab: (t) => set({ sidebarTab: t }),
    setInspectorTab: (t) => set({ inspectorTab: t }),
    setBladSection: (s) => set({ bladSection: s }),
    setShowSolutions: (show) => set({ showSolutions: show }),
    setView: (view) => set({ view }),
    setBlockPages: (pages) => set({ blockPages: pages }),
    setSidebarPreview: (on) => {
        try { localStorage.setItem(SIDEBAR_PREVIEW_KEY, on ? '1' : '0'); } catch { /* ignore */ }
        set({ sidebarPreview: on });
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
// changes. UI-only state (activeBlockId, showSolutions, history) is excluded — those
// shouldn't trigger a write nor should they pollute the saved snapshot.
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useWorksheetStore.subscribe((state, prev) => {
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
    if (state.saveState !== 'saving') useWorksheetStore.setState({ saveState: 'saving' });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveAutosave({ blocks: state.blocks, header: state.header, footer: state.footer, docSettings: state.docSettings, baseSettings: state.baseSettings, selectedGrade: state.selectedGrade }, state.curriculum);
        useWorksheetStore.setState({ saveState: 'saved', lastSavedAt: Date.now() });
    }, 1500);
});