import { describe, expect, it } from 'vitest';
import { TOPBAR_STAGE_COUNT, topBarStageFlags } from '../components/layout/topBarStages';

describe('topBarShed stages', () => {
    it('has shed stages 4 and 5 beyond the old last stage (7 stages in total)', () => {
        expect(TOPBAR_STAGE_COUNT).toBe(7);
    });
    it('sheds strictly more at every stage', () => {
        // nameInRow is the one flag that flips the other way (true = still in the row)
        const shed = (s: number) => {
            const f = topBarStageFlags(s);
            return +f.iconOnly + +!f.nameInRow + +f.quickFolded + +f.generateFolded + +f.historyFolded + +f.helpSaveFolded;
        };
        expect(shed(0)).toBe(0);
        for (let s = 1; s < TOPBAR_STAGE_COUNT; s++) expect(shed(s)).toBeGreaterThan(shed(s - 1));
    });
    it('folds "Genereer alles" at stage 4, after Toevoegen/Uitleg', () => {
        expect(topBarStageFlags(3)).toMatchObject({ quickFolded: true, generateFolded: false });
        expect(topBarStageFlags(4)).toMatchObject({ quickFolded: true, generateFolded: true, historyFolded: false });
    });
    it('folds undo/redo at 5 (Ctrl+Z / Ctrl+Y keep working), the ? and Bewaren last', () => {
        expect(topBarStageFlags(5)).toMatchObject({ generateFolded: true, historyFolded: true, helpSaveFolded: false });
        expect(topBarStageFlags(6)).toMatchObject({ historyFolded: true, helpSaveFolded: true });
    });
});
