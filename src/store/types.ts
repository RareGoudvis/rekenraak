import type { MathBlock, Equation, CijferExercise, FooterData, LayoutPreset } from '../services/math/types';
import type { CurriculumLock } from '../services/persistence';
import type { BaseSettings } from '../config/baseSettings';
import type { Leerjaar } from '../config/gradePresets';
import type { InstructionFn } from '../config/appstructure';
import type { MixedVariantId } from '../services/math/constraintTypes';

// The leaf's own default opdracht-titel, passed down from wherever a block is added
// (sidebar click, mass-add, a curriculum lock, the dev hook) — see appstructure.ts's
// LeafExercise.instruction and instructionPresets.ts's resolveInstruction.
export interface AddBlockOpts {
    leafId?: string;
    instruction?: string | InstructionFn;
}

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
    // How the packer places blocks on a page: 'aansluitend' lets a block fill the space
    // under a shorter neighbour (skyline), 'rijen' keeps whole rows aligned across the
    // page the way the sheet worked before. Optional → back-compat: absent = aansluitend.
    packMode?: 'aansluitend' | 'rijen';
    // Sheet-wide "no duplicate exercises" toggle, read by regenerateBlock (generateDispatch.ts).
    // Optional → back-compat: absent = true (old/shared sheets keep the safer default).
    uniqueExercises?: boolean;
    numberBlocks: boolean;
    // Style-builder overrides (custom wins over the enum presets above). Optional → back-compat.
    headerCustom?: RegionStyle;
    titelCustom?: RegionStyle;
    footerCustom?: RegionStyle;
    // Global content zoom for block bodies (exercise + opdracht-titel); 1 = 100%.
    // A per-block override lives in block.constraints.bodyFontScale. Optional → back-compat.
    bodyFontScale?: number;
    // Sheet-wide font-size tokens (pt), fed onto .print-area-shell as --sheet-size-math /
    // --sheet-size-text (theme.css). Optional → back-compat; undefined falls back to the
    // token's own CSS default (13pt / 15pt). No per-block override — bodyFontScale already
    // does that job as a multiplier on top of these.
    fontSizeMath?: number;   // pt, 11-16, default 13
    fontSizeText?: number;   // pt, 12-18, default 15
    // Sheet-wide writing space: the height of ONE answer line, in px at the 13pt default.
    // Fed onto .print-area-shell as --sheet-answer-h (theme.css) scaled by fontSizeMath, so
    // it follows the Cijfers slider. Optional → back-compat; absent = 18 (what the viewers
    // hardcoded before the token). Per-block override: constraints.answerSpace.
    // NOT verticalSpacing, which is the gap BETWEEN exercises.
    answerSpace?: number;    // px at 13pt, 14-32, default 18
}

// Which full-screen view is active. 'editor' = normal 3-panel editor; the others are
// full-screen overlays (libraries + whiteboard/bordmodus). UI-only — never persisted/serialised.
export type WorksheetView = 'editor' | 'mijn-bladen' | 'bibliotheek' | 'whiteboard';
// Autosave status surfaced in the top bar. UI-only.
// 'error' = the last write was refused (quota full / storage unavailable): the sheet is
// only in memory, so the top bar must stop claiming it is safe.
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface BlocksSlice {
    blocks: MathBlock[];
    // Blocks whose settings changed since their last generation. Not persisted and not
    // historied: it is a hint about the sheet, not part of it.
    staleBlocks: Record<string, boolean>;
    addBlockFromType: (typeId: string, label: string, overrideConstraints?: Record<string, unknown>, opts?: AddBlockOpts) => void;
    removeBlock: (id: string) => void;
    clearBlocks: () => void;
    moveBlockUp: (id: string) => void;
    moveBlockDown: (id: string) => void;
    reorderBlocks: (fromIndex: number, toIndex: number) => void;
    swapBlocks: (idA: string, idB: string) => void;
    updateBlockInstruction: (id: string, text: string) => void;
    updateBlockLayout: (id: string, layout: LayoutPreset, steppedLines?: number) => void;
    updateBlockSettings: (id: string, updates: Partial<MathBlock>) => void;
    // Generic exercise setter: writes a generated array to the given MathBlock
    // field (e.g. 'exercises', 'mabExercises'). Replaces the old per-type setters.
    setExercises: (id: string, field: keyof MathBlock, data: unknown[]) => void;
    // Teacher-facing feedback about the last generate (relaxed settings, shortfall,
    // failure). UI-only: no history push, stripped on save.
    setGenerationNote: (id: string, note: string | null) => void;
    updateExercise: (blockId: string, exerciseId: string, updates: Partial<Equation>) => void;
    updateCijferExercise: (blockId: string, exerciseId: string, updates: Partial<CijferExercise>) => void;
    // Generic single-exercise patch for any array field (ordenen/getallenas/…), keyed by exercise id.
    patchExercise: (blockId: string, field: keyof MathBlock, exerciseId: string, patch: Record<string, unknown>) => void;
    // 'Gemengd' (mixed operators) per-exercise switch: regenerate ONE equation for a
    // different variant, keeping every other exercise in the block untouched. The id is
    // kept stable so the selection/undo highlight doesn't jump to a "new" row.
    regenerateExercise: (blockId: string, exerciseId: string, variant: MixedVariantId) => void;
    toggleBlockLock: (id: string) => void;
    duplicateBlock: (id: string) => void;
    // Cut one block in two after the atIndex-th exercise. Layout, not difficulty: it
    // survives the curriculum lock, exactly like reorder/swap.
    splitBlock: (id: string, atIndex: number) => void;
    generateAllBlocks: () => void;
}

export interface DocumentSlice {
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
    setDraftBlocks: (blocks: MathBlock[]) => void;
    clearDraftBlocks: () => void;
    loadWorksheet: (file: { blocks: MathBlock[]; header: HeaderData; footer: FooterData; docSettings: DocSettings; baseSettings?: BaseSettings; curriculum?: CurriculumLock; selectedGrade?: Leerjaar | null }) => void;
    updateHeader: (updates: Partial<HeaderData>) => void;
    updateFooter: (updates: Partial<FooterData>) => void;
    updateDocSettings: (updates: Partial<DocSettings>) => void;
    updateBaseSettings: (updates: Partial<BaseSettings>) => void;
    setSelectedGrade: (grade: Leerjaar | null) => void;
}

export interface UiSlice {
    activeBlockId: string | 'document' | null;
    showSolutions: boolean;
    view: WorksheetView;             // active full-screen view (UI-only, not persisted)
    sidebarPreview: boolean;         // show a live example card when hovering a sidebar leaf (localStorage-backed)
    saveState: SaveState;            // autosave status for the top-bar tracker (UI-only)
    lastSavedAt: number | null;      // epoch ms of last successful autosave (UI-only)
    blockPages: Record<string, number>;  // measured page index per block (for Overzicht page-break markers; UI-only)
    // Width-matrix harness only (window.__rekenraak.setIgnoreMinWidth): place blocks at the
    // width they ask for instead of clamping to minWidthUnits. Measuring the tiers with the
    // clamp on would only measure the clamp. UI-only: no history, never autosaved.
    debugIgnoreMinWidth: boolean;
    setActiveSelection: (id: string | 'document' | null) => void;
    // Panel tabs live in the store because their strips render in the TopBar, above the
    // column each belongs to, while the panels themselves render the content.
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
    setIgnoreMinWidth: (on: boolean) => void;
}

export interface HistorySlice {
    _history: MathBlock[][];
    _historyIndex: number;
    /** Both return the id of the block the step changed, so the caller can scroll to it. */
    undo: () => string | null;
    redo: () => string | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export type WorksheetState = BlocksSlice & DocumentSlice & UiSlice & HistorySlice;
