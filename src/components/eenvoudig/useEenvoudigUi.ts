import { create } from 'zustand';
import type { Leerjaar } from '../../config/gradePresets';
import type { CardKind } from '../../config/eenvoudig/cards';
import { useWorksheetStore } from '../../store/useWorksheetStore';

// The picks that belong to the card panel only (not the sheet, not saved): the leerjaar, the
// range button and the komma/breuk button. Kept outside the worksheet store so autosave and undo ignore them.
interface EenvoudigUi {
    grade: Leerjaar;
    max: number | null;
    kind: CardKind | null;
    setGrade: (g: Leerjaar) => void;
    setMax: (m: number) => void;
    setKind: (k: CardKind) => void;
    // A new topic starts on its natural list again.
    resetPicks: () => void;
}

export const useEenvoudigUi = create<EenvoudigUi>((set) => ({
    // Follows the leerjaar the teacher already picked in Uitgebreid; "Alle" starts at leerjaar 3.
    grade: useWorksheetStore.getState().selectedGrade ?? 3,
    max: null,
    kind: null,
    setGrade: (grade) => set({ grade, max: null }),
    setMax: (max) => set({ max, kind: null }),
    setKind: (kind) => set({ kind, max: null }),
    resetPicks: () => set({ max: null, kind: null }),
}));
