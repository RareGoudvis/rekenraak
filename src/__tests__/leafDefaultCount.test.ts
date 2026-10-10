// @vitest-environment jsdom
import { test, expect } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';

// A leaf's own defaultCount wins over its row's; every other leaf keeps the row default.
// Kalender: the row's 1 is one maandrooster; a date-rekenen or notatie block lists 4 exercises.
const LEAF_COUNTS: Record<string, number> = { 'oppervlakte-rooster': 2, 'kalender-datum-rekenen': 4, 'kalender-notatie': 4, 'kalender-maandrooster': 1 };
test('block count per leaf = leaf.defaultCount ?? row.defaultCount', () => {
    const store = useWorksheetStore.getState();
    for (const leaf of flattenLeaves()) {
        store.clearBlocks();
        useWorksheetStore.getState().addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction });
        const block = useWorksheetStore.getState().blocks.at(-1)!;
        const want = LEAF_COUNTS[leaf.id] ?? REGISTRY[leaf.typeId].defaultCount;
        expect(block.numberOfExercises, leaf.id).toBe(want);
    }
});

test('the berekenen leaf stays at 4', () => {
    useWorksheetStore.getState().clearBlocks();
    useWorksheetStore.getState().addBlockFromType('oppervlakte', 'Berekenen', undefined, { leafId: 'oppervlakte-berekenen' });
    expect(useWorksheetStore.getState().blocks.at(-1)!.numberOfExercises).toBe(4);
});
