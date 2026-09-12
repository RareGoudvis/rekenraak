// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { REGISTRY } from '../config/exerciseRegistry';
import { regenerateBlock } from '../services/generateDispatch';

// The store touches localStorage (autosave, sidebar-preview) on import, hence jsdom.
//
// Order is the one thing sheet drag-and-drop changes, so this suite pins exactly what a
// drop does: the top third INSERTS before the target, the middle third SWAPS the two,
// the bottom third INSERTS after the target, and all three are one undoable step.
const ids = () => useWorksheetStore.getState().blocks.map(b => b.id);

function seed(n: number) {
    useWorksheetStore.getState().clearBlocks();
    for (let i = 0; i < n; i++) useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
}

describe('swapBlocks', () => {
    beforeEach(() => seed(3));

    test('trades two blocks and leaves the rest alone', () => {
        const [a, b, c] = ids();
        useWorksheetStore.getState().swapBlocks(a, c);
        expect(ids()).toEqual([c, b, a]);
    });

    test('is a no-op for the same block or an unknown id', () => {
        const before = ids();
        useWorksheetStore.getState().swapBlocks(before[0], before[0]);
        useWorksheetStore.getState().swapBlocks(before[0], 'nope');
        expect(ids()).toEqual(before);
    });

    test('pushes history, so undo restores the order', () => {
        const before = ids();
        useWorksheetStore.getState().swapBlocks(before[0], before[2]);
        expect(ids()).not.toEqual(before);
        useWorksheetStore.getState().undo();
        expect(ids()).toEqual(before);
    });

    test('survives the curriculum lock — order is presentation, not difficulty', () => {
        const before = ids();
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen' }] } });
        useWorksheetStore.getState().swapBlocks(before[0], before[1]);
        expect(ids()).toEqual([before[1], before[0], before[2]]);
        useWorksheetStore.setState({ curriculum: null });
    });
});

describe('reorderBlocks with the drop compensation', () => {
    beforeEach(() => seed(3));

    // What the sheet's "Hierboven invoegen" zone computes: to > from ? to - 1 : to.
    const insertBefore = (from: number, to: number) =>
        useWorksheetStore.getState().reorderBlocks(from, to > from ? to - 1 : to);

    // What the sheet's "Hieronder invoegen" zone computes: from < to ? to : to + 1.
    const insertAfter = (from: number, to: number) =>
        useWorksheetStore.getState().reorderBlocks(from, from < to ? to : to + 1);

    test('dragging the first block before the third leaves it in the middle', () => {
        const [a, b, c] = ids();
        insertBefore(0, 2);
        expect(ids()).toEqual([b, a, c]);
    });

    test('dragging the last block before the first puts it in front', () => {
        const [a, b, c] = ids();
        insertBefore(2, 0);
        expect(ids()).toEqual([c, a, b]);
    });

    test('dragging the first block after the third leaves it at the end', () => {
        const [a, b, c] = ids();
        insertAfter(0, 2);
        expect(ids()).toEqual([b, c, a]);
    });

    test('dragging the last block after the first puts it second', () => {
        const [a, b, c] = ids();
        insertAfter(2, 0);
        expect(ids()).toEqual([a, c, b]);
    });

    // The no-op guard lives in useSheetDnd (it skips the store call entirely), but the
    // compensation formula itself is also idempotent if that guard were ever missing:
    // "after" onto the block right before you, or "before" onto the block right after
    // you, both compute reorderBlocks(from, from), which the store already no-ops on.
    test('dragging the middle block after the block right before it is a no-op', () => {
        const before = ids();
        insertAfter(1, 0);
        expect(ids()).toEqual(before);
    });

    test('dragging the second block before the block right after it is a no-op', () => {
        const before = ids();
        insertBefore(1, 2);
        expect(ids()).toEqual(before);
    });
});

// A generator that throws used to leave a silently empty block (surfaced by the MAB crash).
describe('a generator that throws', () => {
    const THROWING = 'test-throwing-type';

    beforeEach(() => {
        REGISTRY[THROWING] = {
            exerciseField: 'exercises',
            generate: () => { throw new Error('boom'); },
            defaultConstraints: () => ({}),
            defaultCount: 4,
        };
        useWorksheetStore.getState().clearBlocks();
    });
    afterEach(() => { delete REGISTRY[THROWING]; });

    test('addBlockFromType still adds the block, and says why it is empty', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        useWorksheetStore.getState().addBlockFromType(THROWING, 'Stuk');
        const block = useWorksheetStore.getState().blocks[0];
        expect(block.exercises).toEqual([]);
        expect(block.generationNote).toBe('Kon geen oefeningen maken: boom');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });

    test('regenerateBlock reports the failure through the note action', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        useWorksheetStore.getState().addBlockFromType(THROWING, 'Stuk');
        const { id } = useWorksheetStore.getState().blocks[0];
        const setExercises = vi.fn();
        regenerateBlock(useWorksheetStore.getState().blocks[0], setExercises, useWorksheetStore.getState().setGenerationNote);
        expect(setExercises).not.toHaveBeenCalled();
        expect(useWorksheetStore.getState().blocks.find(b => b.id === id)!.generationNote).toBe('Kon geen oefeningen maken: boom');
        warn.mockRestore();
    });

    test('the note is not an undo step of its own', () => {
        useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
        const { id } = useWorksheetStore.getState().blocks[0];
        const before = useWorksheetStore.getState().blocks.length;
        useWorksheetStore.getState().setGenerationNote(id, 'Slechts 3 oefeningen mogelijk bij deze instellingen.');
        useWorksheetStore.getState().undo();
        // Undo walks past the note straight to "before the block was added".
        expect(useWorksheetStore.getState().blocks.length).toBe(before - 1);
    });
});

describe('updateBlockSettings under the curriculum lock', () => {
    beforeEach(() => {
        seed(1);
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen' }] } });
    });
    afterEach(() => useWorksheetStore.setState({ curriculum: null }));

    test('width is layout, not difficulty, so it goes through', () => {
        const { id } = useWorksheetStore.getState().blocks[0];
        useWorksheetStore.getState().updateBlockSettings(id, { widthUnits: 2 });
        expect(useWorksheetStore.getState().blocks[0].widthUnits).toBe(2);
    });

    test('the opdracht-title toggle is presentation, so it goes through', () => {
        const { id } = useWorksheetStore.getState().blocks[0];
        useWorksheetStore.getState().updateBlockSettings(id, { showInstruction: false });
        expect(useWorksheetStore.getState().blocks[0].showInstruction).toBe(false);
    });

    test('difficulty is still frozen', () => {
        const { id, constraints } = useWorksheetStore.getState().blocks[0];
        useWorksheetStore.getState().updateBlockSettings(id, { constraints: { ...constraints, maxGetal: 1000000 } });
        expect(useWorksheetStore.getState().blocks[0].constraints.maxGetal).toBe(constraints.maxGetal);
    });
});

// "Blok splitsen" is layout: the teacher cuts a block that does not fit the rest of a page.
describe('splitBlock', () => {
    const first = () => useWorksheetStore.getState().blocks[0];
    beforeEach(() => seed(1));

    test('moves the exercises after the cut into a second block', () => {
        const src = first();
        const count = src.exercises.length;
        expect(count).toBeGreaterThan(2);
        useWorksheetStore.getState().splitBlock(src.id, 2);
        const [head, tail] = useWorksheetStore.getState().blocks;
        expect(head.exercises.map(e => e.id)).toEqual(src.exercises.slice(0, 2).map(e => e.id));
        expect(tail.exercises.map(e => e.id)).toEqual(src.exercises.slice(2).map(e => e.id));
    });

    test('both halves carry the right numberOfExercises', () => {
        const src = first();
        const count = src.exercises.length;
        useWorksheetStore.getState().splitBlock(src.id, 2);
        const [head, tail] = useWorksheetStore.getState().blocks;
        expect(head.numberOfExercises).toBe(2);
        expect(tail.numberOfExercises).toBe(count - 2);
        expect(head.exercises.length + tail.exercises.length).toBe(count);
    });

    test('the new block gets its own id and keeps the settings and the instruction', () => {
        const src = first();
        useWorksheetStore.getState().splitBlock(src.id, 1);
        const [head, tail] = useWorksheetStore.getState().blocks;
        expect(head.id).toBe(src.id);
        expect(tail.id).not.toBe(src.id);
        expect(tail.typeId).toBe(src.typeId);
        expect(tail.instructionText).toBe(src.instructionText);
        expect(tail.constraints).toEqual(src.constraints);
        expect(tail.widthUnits).toBe(src.widthUnits);
    });

    test('the tail never inherits the page break — it has to be free to flow', () => {
        const src = first();
        useWorksheetStore.getState().updateBlockSettings(src.id, { pageBreakBefore: true });
        useWorksheetStore.getState().splitBlock(src.id, 2);
        const [head, tail] = useWorksheetStore.getState().blocks;
        expect(head.pageBreakBefore).toBe(true);
        expect(tail.pageBreakBefore).toBe(false);
    });

    test('refuses an index outside 1..count-1', () => {
        const src = first();
        const count = src.exercises.length;
        for (const bad of [0, -1, count, count + 5, 1.5]) {
            useWorksheetStore.getState().splitBlock(src.id, bad);
            expect(useWorksheetStore.getState().blocks).toHaveLength(1);
        }
    });

    test('refuses a block with fewer than two exercises', () => {
        const src = first();
        useWorksheetStore.getState().setExercises(src.id, 'exercises', src.exercises.slice(0, 1));
        useWorksheetStore.getState().splitBlock(src.id, 1);
        expect(useWorksheetStore.getState().blocks).toHaveLength(1);
    });

    test('refuses sheet furniture, which holds no exercises', () => {
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.getState().addBlockFromType('layout-schrijflijnen', 'Schrijflijnen');
        const { id } = first();
        useWorksheetStore.getState().splitBlock(id, 1);
        expect(useWorksheetStore.getState().blocks).toHaveLength(1);
    });

    test('pushes history, so undo puts the block back together', () => {
        const src = first();
        useWorksheetStore.getState().splitBlock(src.id, 2);
        expect(useWorksheetStore.getState().blocks).toHaveLength(2);
        useWorksheetStore.getState().undo();
        const back = useWorksheetStore.getState().blocks;
        expect(back).toHaveLength(1);
        expect(back[0].exercises).toHaveLength(src.exercises.length);
    });

    test('survives the curriculum lock — splitting is layout, not difficulty', () => {
        const src = first();
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen' }] } });
        useWorksheetStore.getState().splitBlock(src.id, 2);
        expect(useWorksheetStore.getState().blocks).toHaveLength(2);
        useWorksheetStore.setState({ curriculum: null });
    });

    test('splits a type whose exercises live in another registry field', () => {
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.getState().addBlockFromType('klok-kloklezen', 'Klok');
        const src = first();
        const count = (src.clockExercises ?? []).length;
        expect(count).toBeGreaterThan(1);
        useWorksheetStore.getState().splitBlock(src.id, 1);
        const [head, tail] = useWorksheetStore.getState().blocks;
        expect(head.clockExercises).toHaveLength(1);
        expect(tail.clockExercises).toHaveLength(count - 1);
    });
});
