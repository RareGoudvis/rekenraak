// Pure shed-stage table of the top bar; TopBar renders from it, topBarShed.test pins it.
// 0 = every label + centred name; 1 = icon-only; 2 = name leaves the row for a line under
// the bar; 3 = "Genereer alles" folds into the Menu; 4 = undo/redo fold too (the shortcuts
// stay); 5 = the "?" and Bewaren buttons fold as well (with them in the row, 820 px overlapped).
// "Oefeningen toevoegen" is a Menu row at every stage, so its old fold stage is gone.
export const TOPBAR_STAGE_COUNT = 6;

export interface TopBarStageFlags {
    iconOnly: boolean;
    nameInRow: boolean;
    generateFolded: boolean;
    historyFolded: boolean;
    helpSaveFolded: boolean;
}

export function topBarStageFlags(stage: number): TopBarStageFlags {
    return {
        iconOnly: stage >= 1,
        nameInRow: stage < 2,
        generateFolded: stage >= 3,
        historyFolded: stage >= 4,
        helpSaveFolded: stage >= 5,
    };
}
