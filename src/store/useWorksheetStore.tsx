import { create } from 'zustand';
import type { WorksheetState } from './types';
import { createBlocksSlice } from './slices/blocksSlice';
import { createDocumentSlice } from './slices/documentSlice';
import { createUiSlice } from './slices/uiSlice';
import { createHistorySlice } from './slices/historySlice';
import { installAutosave } from './autosave';

// Public entry of the store: importers only ever reach for this file, the slices are internal.
export { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS } from './types';
export type { AddBlockOpts, HeaderField, HeaderData, RegionStyle, DocSettings, WorksheetView, SaveState } from './types';

// One store, sliced by concern: actions like addBlockFromType must set blocks, selection
// and the inspector tab in a single set(), which separate stores could not do atomically.
// eslint-disable-next-line react-refresh/only-export-components -- the rule reads the re-exported CAPS constants above as components; nothing here is one
export const useWorksheetStore = create<WorksheetState>()((...a) => ({
    ...createBlocksSlice(...a),
    ...createDocumentSlice(...a),
    ...createUiSlice(...a),
    ...createHistorySlice(...a),
}));

installAutosave(useWorksheetStore);
