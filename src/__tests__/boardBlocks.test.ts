// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves } from '../config/appstructure';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
import type { Leerjaar } from '../config/gradePresets';
import { makeBoardBlock, sheetSeedContext } from '../board/boardBlocks';

// A board widget must start from the block a sidebar click would make: same Basisinstellingen,
// same leerjaar, same gradeSetsMax / SEED_FIT handling (seedConstraints.test.ts's approach).
const leaves = flattenLeaves().filter((l) => REGISTRY[l.typeId]);

function sidebarBlock(leafId: string) {
    const leaf = leaves.find((l) => l.id === leafId)!;
    useWorksheetStore.getState().addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction });
    const blocks = useWorksheetStore.getState().blocks;
    return blocks[blocks.length - 1];
}

afterEach(() => {
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe.each([null, 1, 6] as Array<Leerjaar | null>)('board block == sidebar block (leerjaar %s)', (grade) => {
    beforeEach(() => {
        useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
        if (grade != null) useWorksheetStore.getState().setSelectedGrade(grade);
    });

    test.each(leaves.map((l) => [l.id, l] as const))('%s', (_id, leaf) => {
        const board = makeBoardBlock(leaf.typeId, { override: leaf.defaultConstraints, leafId: leaf.id, ...sheetSeedContext() });
        expect(board).not.toBeNull();
        expect(board!.leafId).toBe(leaf.id);
        expect(board!.constraints).toEqual(sidebarBlock(leaf.id).constraints);
    });
});
