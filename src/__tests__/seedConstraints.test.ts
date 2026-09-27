// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves } from '../config/appstructure';
import { DEFAULT_BASE, seedConstraints, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS } from '../config/gradePresets';
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

function addedConstraints(leaf: (typeof leaves)[number], base: BaseSettings) {
    useWorksheetStore.setState({ baseSettings: base, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
    useWorksheetStore.getState().addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction });
    const blocks = useWorksheetStore.getState().blocks;
    return blocks[blocks.length - 1].constraints;
}

describe.each([
    ['default base', DEFAULT_BASE],
    ['leerjaar 5 + mask + bridges', busyBase],
] as const)('preview == added block (%s)', (_name, base) => {
    beforeEach(() => useWorksheetStore.setState({ selectedGrade: null }));

    test.each(leaves.map((l) => [l.id, l] as const))('%s', (_id, leaf) => {
        const preview = seedConstraints({ typeId: leaf.typeId, base, override: leaf.defaultConstraints });
        expect(addedConstraints(leaf, base)).toEqual(preview);
        expect(makeBlock(leaf.typeId, { base, constraints: leaf.defaultConstraints }).constraints).toEqual(preview);
    });
});
