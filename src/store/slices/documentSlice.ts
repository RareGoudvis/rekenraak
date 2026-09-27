import type { StateCreator } from 'zustand';
import { DEFAULT_BASE } from '../../config/baseSettings';
import { GRADE_PRESETS } from '../../config/gradePresets';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type DocumentSlice, type WorksheetState } from '../types';

export const createDocumentSlice: StateCreator<WorksheetState, [], [], DocumentSlice> = (set) => ({
    header: { naam: true, klas: true, nummer: false, datum: false, titel: '', fieldOrder: [...DEFAULT_FIELD_ORDER], fieldWidths: { ...DEFAULT_FIELD_WIDTHS }, repeatHeader: false },
    footer: { school: '', klas: '', leerkracht: '', showSchool: false, showKlas: false, showLeerkracht: false, showPagina: false, centerText: '', showCenterText: false },
    docSettings: { showScores: false, opdrachtTitelStyle: 'regular', showDividers: false, showColumnDividers: false, headerStyle: 'geen', footerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16, headerContentGap: 12, blockSpacing: 12, numberBlocks: true, bodyFontScale: 1, fontSizeMath: 13, fontSizeText: 15, answerSpace: 18 },
    baseSettings: { ...DEFAULT_BASE },
    selectedGrade: null,
    curriculum: null,
    draftBlocks: [],

    setDraftBlocks: (blocks) => set({ draftBlocks: blocks }),
    clearDraftBlocks: () => set({ draftBlocks: [] }),
    loadWorksheet: (file) => set(() => {
        // Some callers (library cards, templates) hand over a payload that never passed the
        // versioned migration, so widths from the old 6-unit grid can still arrive here.
        const blocks = file.blocks.map(b => {
            const w = b.widthUnits as number | undefined;
            if (w === undefined || w === 1 || w === 2 || w === 4) return b;
            return { ...b, widthUnits: (w === 3 ? 2 : 4) as 1 | 2 | 4 };
        });
        return {
            blocks,
            header: file.header,
            footer: file.footer,
            docSettings: file.docSettings,
            baseSettings: file.baseSettings ? { ...DEFAULT_BASE, ...file.baseSettings } : { ...DEFAULT_BASE },
            curriculum: file.curriculum ?? null,
            // Set the grade value directly — base is already restored above, so we must
            // NOT re-run setSelectedGrade's preset seeding here.
            selectedGrade: file.selectedGrade ?? null,
            activeBlockId: null,
            _history: [blocks],
            _historyIndex: 0,
        };
    }),
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
});
