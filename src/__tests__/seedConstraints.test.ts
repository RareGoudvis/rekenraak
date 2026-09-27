// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves, LEAF_BY_ID } from '../config/appstructure';
import { DEFAULT_BASE, seedConstraints, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { makeBlock } from './helpers/makeBlock';

// The sidebar hover card and the MassAdd preview render seedConstraints() for a leaf; the
// store's add must store exactly that, or a preview shows a block the click never makes.
const leaves = flattenLeaves();

// A base that touches every seeded key: a grade max, a mask, bridges and a number type.
const busyBase: BaseSettings = {
    ...DEFAULT_BASE,
    ...GRADE_PRESETS[5],
    baseOperand1Mask: { H: true, T: true },
    baseBridges: { E: 'REQUIRED' },
};

function addLeaf(leafId: string) {
    const leaf = leaves.find((l) => l.id === leafId)!;
    useWorksheetStore.getState().addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction });
    const blocks = useWorksheetStore.getState().blocks;
    return blocks[blocks.length - 1];
}

afterEach(() => {
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe.each([
    ['default base', DEFAULT_BASE, null],
    ['leerjaar 5 + mask + bridges', busyBase, 5],
] as const)('preview == added block (%s)', (_name, base, grade) => {
    beforeEach(() => useWorksheetStore.setState({ baseSettings: base, selectedGrade: grade, curriculum: null }));

    test.each(leaves.map((l) => [l.id, l] as const))('%s', (_id, leaf) => {
        const preview = seedConstraints({ typeId: leaf.typeId, base, override: leaf.defaultConstraints, grade, leafId: leaf.id });
        expect(addLeaf(leaf.id).constraints).toEqual(preview);
        expect(makeBlock(leaf.typeId, { base, constraints: leaf.defaultConstraints, grade, leafId: leaf.id }).constraints).toEqual(preview);
    });
});

describe('a picked leerjaar sets the max where a leaf pins one (gradeSetsMax)', () => {
    const growing = ['afronden-nat-rooster', 'afronden-nat-simpel', 'splitsen-positietabel', 'splitsen-benen', 'splitsen-plaatswaarden'];
    const want: Record<number, number> = { 4: 10_000, 5: 1_000_000, 6: 1_000_000_000 };

    test('exactly these leaves carry the flag', () => {
        expect(Object.keys(LEAF_BY_ID).filter((id) => LEAF_BY_ID[id].gradeSetsMax).sort()).toEqual([...growing].sort());
    });

    test.each([4, 5, 6] as Leerjaar[])('leerjaar %d', (grade) => {
        useWorksheetStore.getState().setSelectedGrade(grade);
        for (const id of growing) {
            const c = addLeaf(id).constraints as Record<string, unknown>;
            expect(c.maxGetal, id).toBe(want[grade]);
            // Every other pinned key still wins.
            for (const [k, v] of Object.entries(leaves.find((l) => l.id === id)!.defaultConstraints!)) {
                if (k !== 'maxGetal') expect(c[k], `${id}.${k}`).toEqual(v);
            }
        }
    });

    test('splitsen-benen titles itself after the grade max', () => {
        useWorksheetStore.getState().setSelectedGrade(4);
        expect(addLeaf('splitsen-benen').instructionText).toBe('Splits in D, H, T en E.');
    });

    test('no leerjaar: the pins stand (1 000)', () => {
        for (const id of growing) expect((addLeaf(id).constraints as Record<string, unknown>).maxGetal, id).toBe(1000);
    });

    test.each([4, 5, 6] as Leerjaar[])('leerjaar %d: pins that define the exercise stay', (grade) => {
        useWorksheetStore.getState().setSelectedGrade(grade);
        expect((addLeaf('splitsen-basis').constraints as Record<string, unknown>).maxGetal).toBe(10);
        expect((addLeaf('splitsen-harten').constraints as Record<string, unknown>).maxGetal).toBe(10);
        expect((addLeaf('splitsen-boom').constraints as Record<string, unknown>).maxGetal).toBe(100);
    });

    test('a locked curriculum keeps its author\'s max', () => {
        useWorksheetStore.getState().setSelectedGrade(6);
        const lockedConstraints = { subType: 'rooster', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] };
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'afronden', label: 'Rooster', leafId: 'afronden-nat-rooster', lockedConstraints }] } });
        useWorksheetStore.getState().addBlockFromType('afronden', 'Rooster', lockedConstraints, { leafId: 'afronden-nat-rooster' });
        const blocks = useWorksheetStore.getState().blocks;
        expect((blocks[blocks.length - 1].constraints as Record<string, unknown>).maxGetal).toBe(1000);
    });
});
