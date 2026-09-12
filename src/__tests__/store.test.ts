// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';

// The store touches localStorage (autosave, sidebar-preview) on import, hence jsdom.
//
// Order is the one thing sheet drag-and-drop changes, so this suite pins exactly what a
// drop does: the top half INSERTS before the target, the bottom half SWAPS the two, and
// both are one undoable step.
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

    // What the sheet's "Hier invoegen" zone computes: to > from ? to - 1 : to.
    const insertBefore = (from: number, to: number) =>
        useWorksheetStore.getState().reorderBlocks(from, to > from ? to - 1 : to);

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
});
