import { describe, expect, it } from 'vitest';
import { TOPBAR_STAGE_COUNT, topBarStageFlags } from '../components/layout/topBarStages';

describe('topBarShed stages', () => {
    it('has 6 stages since "Oefeningen toevoegen" moved into the Menu for good', () => {
        expect(TOPBAR_STAGE_COUNT).toBe(6);
    });
    it('sheds strictly more at every stage', () => {
        // nameInRow is the one flag that flips the other way (true = still in the row)
        const shed = (s: number) => {
            const f = topBarStageFlags(s);
            return +f.iconOnly + +!f.nameInRow + +f.generateFolded + +f.historyFolded + +f.helpSaveFolded;
        };
        expect(shed(0)).toBe(0);
        for (let s = 1; s < TOPBAR_STAGE_COUNT; s++) expect(shed(s)).toBeGreaterThan(shed(s - 1));
    });
    it('folds "Genereer alles" at stage 3, right after the name leaves the row', () => {
        expect(topBarStageFlags(2)).toMatchObject({ nameInRow: false, generateFolded: false });
        expect(topBarStageFlags(3)).toMatchObject({ generateFolded: true, historyFolded: false });
    });
    it('folds undo/redo at 4 (Ctrl+Z / Ctrl+Y keep working), the ? and Bewaren last', () => {
        expect(topBarStageFlags(4)).toMatchObject({ generateFolded: true, historyFolded: true, helpSaveFolded: false });
        expect(topBarStageFlags(5)).toMatchObject({ historyFolded: true, helpSaveFolded: true });
    });
});
