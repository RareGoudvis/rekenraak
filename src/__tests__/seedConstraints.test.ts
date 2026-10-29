// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves, LEAF_BY_ID } from '../config/appstructure';
import { DEFAULT_BASE, seedConstraints, seedLeafConstraints, type BaseSettings } from '../config/baseSettings';
import { seedRowConstraints } from '../components/oefenen/oefenBuild';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { makeBlock } from './helpers/makeBlock';
import { breukenFigureCeiling } from '../config/numberRanges';

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

describe('gelijknamig maken: leerjaar 4 and below seed the multiple noemers', () => {
    const want: Record<string, string | undefined> = { null: undefined, 1: 'multiple', 2: 'multiple', 3: 'multiple', 4: 'multiple', 5: 'any', 6: 'any' };
    const grades: Array<Leerjaar | null> = [null, 1, 2, 3, 4, 5, 6];

    test.each(grades)('leerjaar %s: sidebar click, seedLeafConstraints and the Oefenmodus row agree', (grade) => {
        useWorksheetStore.getState().setSelectedGrade(grade);
        const leaf = leaves.find((l) => l.id === 'breuken-gelijknamig')!;
        expect((addLeaf(leaf.id).constraints as Record<string, unknown>).denominatorRelation).toBe(want[String(grade)]);
        expect(seedLeafConstraints(leaf.id, grade)!.constraints.denominatorRelation).toBe(want[String(grade)]);
        expect(seedRowConstraints({ id: leaf.id, constraints: leaf.defaultConstraints ?? {} }, grade).denominatorRelation).toBe(want[String(grade)]);
    });

    test('only gelijknamig: gemengd and vereenvoudigen stay without the key', () => {
        useWorksheetStore.getState().setSelectedGrade(4);
        for (const id of ['breuken-gemengd', 'breuken-vereenvoudigen']) {
            expect('denominatorRelation' in (addLeaf(id).constraints as Record<string, unknown>), id).toBe(false);
        }
    });

    test('an author\'s pick wins over the leerjaar', () => {
        expect(seedLeafConstraints('breuken-gelijknamig', 4, { denominatorRelation: 'any' })!.constraints.denominatorRelation).toBe('any');
        expect(seedLeafConstraints('breuken-gelijknamig', 6, { denominatorRelation: 'multiple' })!.constraints.denominatorRelation).toBe('multiple');
    });
});

describe('Basisinstellingen › Breuken reaches only the fraction leaves', () => {
    const breukBase: BaseSettings = { ...DEFAULT_BASE, baseBreuken: { minDenominator: 3, maxDenominator: 12, improper: true, mixed: 'some' } };
    const seed = (leafId: string, base: BaseSettings) => {
        const leaf = leaves.find((l) => l.id === leafId)!;
        return seedConstraints({ typeId: leaf.typeId, base, override: leaf.defaultConstraints, grade: null, leafId }) as Record<string, unknown>;
    };

    test('an untouched section ({} or absent) changes no leaf', () => {
        for (const l of leaves) expect(seed(l.id, { ...DEFAULT_BASE, baseBreuken: {} }), l.id).toEqual(seed(l.id, DEFAULT_BASE));
    });

    test('noemer range, onechte and gemengd land on each leaf\'s own keys', () => {
        expect(seed('breuken-kleuren', breukBase)).toMatchObject({ minDenominator: 3, maxDenominator: 12, allowImproper: true });
        expect(seed('breuken-gelijknamig', breukBase)).toMatchObject({ minDenominator: 3, maxDenominator: 12, allowImproper: true });
        expect(seed('breuken-gemengd', breukBase)).toMatchObject({ maxDenominator: 12 });
        expect(seed('breuken-gemengd', breukBase).allowImproper).toBeUndefined();
        expect(seed('breuken-rangschikken', breukBase)).toMatchObject({ minDenominator: 3, maxDenominator: 12, allowImproper: true });
        expect(seed('getalbegrip-ordenen-rat', breukBase)).toMatchObject({ minDenominator: 3, maxDenominator: 12, mixedMode: 'some', allowMixed: false });
        expect(seed('hr-std-optellen-rat', breukBase)).toMatchObject({ maxDenominator1: 12, maxDenominator2: 12, mixedNumber1: false });
        expect(seed('hr-std-delen-rat', breukBase)).toMatchObject({ maxDenominator1: 12, maxDenominator2: 12 });
        expect(seed('getalbegrip-getallenassen-rat', breukBase)).toMatchObject({ fractionStep: 10 });
        expect(seed('vergelijken-representaties', breukBase)).toMatchObject({ leftFracD: 12, rightFracD: 12 });
    });

    test('a leaf\'s own ceiling and pinned noemer win', () => {
        // hoeveelheid pins a max on the leaf: the base range leaves both halves alone.
        const id = 'breuken-hoeveelheid';
        expect(seed(id, breukBase).minDenominator).toBe(seed(id, DEFAULT_BASE).minDenominator);
        expect(seed(id, breukBase).maxDenominator).toBe(seed(id, DEFAULT_BASE).maxDenominator);
        // No figure is handed more parts than its own ceiling.
        const wide: BaseSettings = { ...DEFAULT_BASE, baseBreuken: { minDenominator: 2, maxDenominator: 20 } };
        for (const l of leaves.filter((x) => x.typeId === 'breuken')) {
            const c = seed(l.id, wide);
            expect(c.maxDenominator as number, l.id).toBeLessThanOrEqual(breukenFigureCeiling(c.subType as string));
        }
        expect(seed('breuken-herkennen', { ...DEFAULT_BASE, baseBreuken: { minDenominator: 2, maxDenominator: 20 } }).maxDenominator).toBe(16);
    });

    test('the rest of the base never touches a fraction key, the Breuken section never a non-fraction key', () => {
        const FRACTION_KEYS = ['minDenominator', 'maxDenominator', 'allowImproper', 'unitFractionsOnly', 'allowMixed', 'mixedMode',
            'maxDenominator1', 'maxDenominator2', 'mixedNumber1', 'mixedNumber2', 'fractionStep', 'leftFracD', 'rightFracD'];
        const busyNoBreuken = { ...busyBase, baseBreuken: {} };
        for (const l of leaves) {
            const plain = seed(l.id, DEFAULT_BASE);
            const busy = seed(l.id, busyNoBreuken);
            for (const k of FRACTION_KEYS) expect(busy[k], `${l.id}.${k}`).toEqual(plain[k]);
            const withBreuken = seed(l.id, breukBase);
            for (const k of Object.keys({ ...plain, ...withBreuken })) {
                if (!FRACTION_KEYS.includes(k)) expect(withBreuken[k], `${l.id}.${k}`).toEqual(plain[k]);
            }
        }
    });

    test('the old stambreuken / gemengd checkboxes still reach ordenen, the section wins where set', () => {
        const legacy: BaseSettings = { ...DEFAULT_BASE, baseUnitFractionsOnly: true, baseAllowMixed: true };
        expect(seed('getalbegrip-ordenen-rat', legacy)).toMatchObject({ unitFractionsOnly: true, allowMixed: true });
        expect(seed('getalbegrip-ordenen-rat', { ...legacy, baseBreuken: { unitOnly: false, mixed: 'none' } })).toMatchObject({ unitFractionsOnly: false, allowMixed: false, mixedMode: 'none' });
        expect(seed('hr-std-optellen-rat', legacy).mixedNumber1).toBe(false);
    });
});
