// @vitest-environment jsdom
import { test, expect } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves, LEAF_BY_ID } from '../config/appstructure';

// A leaf's own defaultCount wins over its row's; every other leaf keeps the row default.
test('block count per leaf = leaf.defaultCount ?? row.defaultCount', () => {
    const store = useWorksheetStore.getState();
    for (const leaf of flattenLeaves()) {
        store.clearBlocks();
        useWorksheetStore.getState().addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction });
        const block = useWorksheetStore.getState().blocks.at(-1)!;
        const want = LEAF_BY_ID[leaf.id].defaultCount ?? REGISTRY[leaf.typeId].defaultCount;
        expect(block.numberOfExercises, leaf.id).toBe(want);
    }
});

// Sweep S5: the real-size defaults are sized to fit one A4 page (height audit proves it).
test.each([['oppervlakte-berekenen', 2], ['oppervlakte-rooster', 2], ['omtrek', 2], ['breuken-lijnstuk', 4], ['cijferen-delen-dec', 2]])('%s starts at %i exercises', (leafId, n) => {
    useWorksheetStore.getState().clearBlocks();
    useWorksheetStore.getState().addBlockFromType(LEAF_BY_ID[leafId].typeId, LEAF_BY_ID[leafId].label, undefined, { leafId });
    expect(useWorksheetStore.getState().blocks.at(-1)!.numberOfExercises).toBe(n);
});
