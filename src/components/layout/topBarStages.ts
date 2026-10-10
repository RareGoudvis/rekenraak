// Pure shed-stage table of the top bar; TopBar renders from it, topBarShed.test pins it.
// 0 = every label + centred name; 1 = icon-only; 2 = name leaves the row for a line under
// the bar; 3 = Toevoegen + Uitleg fold into Meer; 4 = "Genereer alles" folds too; 5 = undo/redo
// fold too (the shortcuts stay). Below ~915 px the bar overlapped while stage 3 was the last
// stage; the middle column is ~170 px at 820 px, so stage 4 alone is not enough there.
export const TOPBAR_STAGE_COUNT = 6;

export interface TopBarStageFlags {
    iconOnly: boolean;
    nameInRow: boolean;
    quickFolded: boolean;
    generateFolded: boolean;
    historyFolded: boolean;
}

export function topBarStageFlags(stage: number): TopBarStageFlags {
    return {
        iconOnly: stage >= 1,
        nameInRow: stage < 2,
        quickFolded: stage >= 3,
        generateFolded: stage >= 4,
        historyFolded: stage >= 5,
    };
}
