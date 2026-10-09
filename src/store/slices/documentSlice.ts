import type { StateCreator } from 'zustand';
import { DEFAULT_BASE } from '../../config/baseSettings';
import { GRADE_PRESETS, NO_GRADE_PRESET } from '../../config/gradePresets';
import { NAT_CEILING } from '../../config/numberRanges';
import { floorMaxIntoList } from '../../config/exerciseRegistry';
import type { MathBlock } from '../../services/math/types';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type DocumentSlice, type WorksheetState } from '../types';

// Normalised here, once, so an old 1e10 sheet is right before anyone opens a block: the
// picker's own floor would otherwise fire on click, under a curriculum lock show "—", and
// cost a stale flag plus an undo step. withinCeiling and the picker floor stay as nets.
function withListedMax(b: MathBlock): MathBlock {
    const c = b.constraints as Record<string, unknown>;
    const floored = floorMaxIntoList(b.typeId, c);
    return floored === c ? b : { ...b, constraints: floored as MathBlock['constraints'] };
}

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
            const fixedWidth = (w === undefined || w === 1 || w === 2 || w === 4) ? b : { ...b, widthUnits: (w === 3 ? 2 : 4) as 1 | 2 | 4 };
            return withListedMax(fixedWidth);
        });
        const baseSettings = file.baseSettings ? { ...DEFAULT_BASE, ...file.baseSettings } : { ...DEFAULT_BASE };
        // Old leerjaar-6 saves carry a 1e10 seed, beyond what the scaled-integer engine holds exactly.
        if (baseSettings.baseMaxGetal > NAT_CEILING) baseSettings.baseMaxGetal = NAT_CEILING;
        return {
            blocks,
            header: file.header,
            footer: file.footer,
            docSettings: file.docSettings,
            baseSettings,
            curriculum: file.curriculum ? {
                ...file.curriculum,
                allowedTypes: file.curriculum.allowedTypes.map(t => t.lockedConstraints
                    ? { ...t, lockedConstraints: floorMaxIntoList(t.typeId, t.lockedConstraints) }
                    : t),
            } : null,
            // Set the grade value directly — base is already restored above, so we must
            // NOT re-run setSelectedGrade's preset seeding here.
            selectedGrade: file.selectedGrade ?? null,
            activeBlockId: null,
            staleBlocks: {},
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
        baseSettings: { ...state.baseSettings, ...(grade == null ? NO_GRADE_PRESET : GRADE_PRESETS[grade]) },
    })),
});
