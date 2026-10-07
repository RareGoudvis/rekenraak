// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves } from '../config/appstructure';
import { REGISTRY, maskShortfallNote } from '../config/exerciseRegistry';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import { makeBlock, generateFor } from './helpers/makeBlock';

// [L20] Leerjaar 1 (tot 20) used to floor to 100 on every list that starts at 100. Owner
// sign-off: vergelijken (getallen / kiezen), plaatswaarde and the deelbaarheid kleurraster
// list 20 now, so leerjaar 1 seeds 20 there. Every other list keeps its floor (the gap below).

const leaves = flattenLeaves();
const gradeBase = (g: Leerjaar) => ({ ...DEFAULT_BASE, ...GRADE_PRESETS[g] });
const seedOf = (leafId: string, g: Leerjaar | null) => {
    const leaf = leaves.find(l => l.id === leafId)!;
    return seedConstraints({ typeId: leaf.typeId, base: g == null ? DEFAULT_BASE : gradeBase(g), override: leaf.defaultConstraints, grade: g, leafId });
};

const TWENTY = ['plaatswaarde-waarde', 'plaatswaarde-plaats', 'plaatswaarde-omcirkelen', 'plaatswaarde-tabel', 'vergelijken-getallen', 'vergelijken-kiezen', 'deelbaarheid-kleurraster'];

// Leaves with a visible max picker whose list starts above 20: leerjaar 1 floors to the
// list's lowest value. Deliberate (owner rule "add 20 only where it makes sense").
const L1_FLOOR_GAP: Record<string, number> = {
    'afronden-dec-rooster': 100, 'afronden-dec-simpel': 100, 'afronden-nat-rooster': 100, 'afronden-nat-simpel': 100,
    'controleren-negenproef': 1000, 'controleren-omgekeerde': 1000,
    'deelbaarheid-tabel': 100, 'handig-rekenvolgorde': 100, 'patronen-dec': 100, 'patronen-geh': 100,
    'procenten-nemen': 100, 'procenten-welk': 100, 'schattend-dec': 100, 'schattend-nat': 100, 'splitsen-boom': 100,
};

afterEach(() => {
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe('leerjaar 1 seeds 20 on the signed-off lists', () => {
    test.each(TWENTY)('%s', (id) => {
        expect(seedOf(id, 1).maxGetal).toBe(20);
        expect(seedOf(id, 2).maxGetal).toBe(100);
        expect(seedOf(id, null).maxGetal).toBe(1000);
    });

    test('representaties keeps its own list (leerjaar 1 floors to 10)', () => {
        expect(seedOf('vergelijken-representaties', 1).maxGetal).toBe(10);
    });

    test('the deelbaarheid strook list already had 20', () => {
        const strook = leaves.filter(l => l.typeId === 'deelbaarheid-kleuren' && l.id !== 'deelbaarheid-kleurraster');
        expect(strook.length).toBeGreaterThan(0);
        for (const l of strook) expect(seedOf(l.id, 1).maxGetal, l.id).toBe(20);
    });

    test('the remaining leerjaar-1 gap: lists that start above 20 keep their floor', () => {
        const gap: Record<string, number> = {};
        for (const leaf of leaves) {
            const c = seedOf(leaf.id, 1);
            const range = REGISTRY[leaf.typeId]?.maxPresets?.(c);
            if (!range) continue;
            const v = c[range.key];
            if (typeof v === 'number' && v > 20) gap[leaf.id] = v;
        }
        expect(gap).toEqual(L1_FLOOR_GAP);
    });
});

describe('switching leerjaar back and forth', () => {
    test.each([[1, 3, 1], [1, 6, 1], [3, 1, 3], [6, 1, 2]] as Leerjaar[][])('%d → %d → %d seeds like a fresh pick', (...path) => {
        const s = useWorksheetStore.getState();
        for (const g of path) s.setSelectedGrade(g);
        const last = path[path.length - 1];
        for (const leaf of leaves) {
            s.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id });
            const blocks = useWorksheetStore.getState().blocks;
            expect(blocks[blocks.length - 1].constraints, `${leaf.id} after ${path.join('→')}`).toEqual(seedOf(leaf.id, last));
        }
    });
});

describe('generators at 20', () => {
    const numbersOf = (typeId: string, e: Record<string, unknown>): number[] =>
        typeId === 'plaatswaarde' ? [e.number as number]
            : typeId === 'vergelijken' ? ((e.numbers as number[] | undefined) ?? [e.a as number, e.b as number])
                : e.numbers as number[];

    const cases: Array<[string, Record<string, unknown>]> = [
        ...['waarde', 'plaats', 'omcirkelen', 'tabel'].flatMap(subType => [0, 1, 2, 3].map(dp => ['plaatswaarde', { subType, decimalPlaces: dp }] as [string, Record<string, unknown>])),
        ...[0, 1, 2].flatMap(dp => [['vergelijken', { subType: 'getallen', decimalPlaces: dp }], ...[2, 4, 6].map(setSize => ['vergelijken', { subType: 'kiezen', decimalPlaces: dp, setSize }])] as Array<[string, Record<string, unknown>]>),
        ...[5, 10, 12].map(rasterCols => ['deelbaarheid-kleuren', { viewMode: 'strip', rasterVorm: 'rechthoek', rasterCols, divisors: [2, 3, 5, 7, 10, 11, 12] }] as [string, Record<string, unknown>]),
    ];

    test.each(cases)('%s %j: full block, nothing above 20', (typeId, c) => {
        for (let run = 0; run < 5; run++) {
            const block = makeBlock(typeId, { constraints: { ...c, maxGetal: 20 } });
            const exs = generateFor(block) as Record<string, unknown>[];
            expect(exs.length).toBe(block.numberOfExercises);
            for (const e of exs) for (const n of numbersOf(typeId, e)) {
                expect(Number.isFinite(n)).toBe(true);
                expect(n).toBeGreaterThan(0);
                expect(n).toBeLessThanOrEqual(20);
            }
        }
    });

    test('the kleurraster at 20 is 1-20, two rows of ten', () => {
        const block = makeBlock('deelbaarheid-kleuren', { constraints: { viewMode: 'strip', rasterVorm: 'rechthoek', maxGetal: 20 } });
        for (const e of generateFor(block) as Array<{ numbers: number[]; cols: number }>) {
            expect([...e.numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
            expect(e.cols).toBe(10);
        }
    });
});

describe('a mask that cannot fill the block says so', () => {
    const noted = (typeId: string, c: Record<string, unknown>) => REGISTRY[typeId].generateNoted!(makeBlock(typeId, { constraints: c }));

    test('the wording counts right', () => {
        expect(maskShortfallNote(6, 6)).toBeNull();
        expect(maskShortfallNote(0, 6)).toBe('Met deze getalopbouw en dit maximum past geen enkele oefening.');
        expect(maskShortfallNote(1, 6)).toBe('Met deze getalopbouw en dit maximum past maar 1 van de 6 oefeningen.');
        expect(maskShortfallNote(2, 6)).toBe('Met deze getalopbouw en dit maximum passen maar 2 van de 6 oefeningen.');
    });

    test('plaatswaarde, tientallen only at 20: 10 and 20', () => {
        const { items, note } = noted('plaatswaarde', { subType: 'tabel', maxGetal: 20, numberMask: { T: true } });
        expect(items).toHaveLength(2);
        expect(note).toBe(maskShortfallNote(2, 6));
    });

    test('plaatswaarde, honderdtallen only at 100: just 100', () => {
        const { items, note } = noted('plaatswaarde', { subType: 'tabel', maxGetal: 100, numberMask: { H: true } });
        expect(items).toHaveLength(1);
        expect(note).toBe(maskShortfallNote(1, 6));
    });

    test('vergelijken kiezen, four numbers out of {10, 20}: none', () => {
        const { items, note } = noted('vergelijken', { subType: 'kiezen', setSize: 4, maxGetal: 20, numberMask: { T: true } });
        expect(items).toHaveLength(0);
        expect(note).toBe(maskShortfallNote(0, 6));
    });

    test('vergelijken representaties, a tientallen-only side at 10: the note covers it too', () => {
        const { items, note } = noted('vergelijken', { subType: 'representaties', leftRep: 'plaatswaarde', rightRep: 'plaatswaarde', leftMask: { T: true }, rightMask: { T: true }, maxGetal: 10, decimalPlaces: 1 });
        expect(items.length).toBeLessThan(6);
        expect(note).toBe(maskShortfallNote(items.length, 6));
    });

    test('afronden, duizendtallen only at 1000: one number, so the block says so', () => {
        const { items, note } = noted('afronden', { subType: 'simpel', numberType: 'natural', maxGetal: 1000, numberMask: { D: true }, roundTargets: ['T', 'H'] });
        expect(items.length).toBeLessThan(6);
        expect(note).toBe(maskShortfallNote(items.length, 6));
    });

    test('a full block carries no note', () => {
        expect(noted('vergelijken', { subType: 'getallen', maxGetal: 20 }).note).toBeNull();
        expect(noted('plaatswaarde', { subType: 'waarde', maxGetal: 20 }).note).toBeNull();
        expect(noted('afronden', { subType: 'simpel', numberType: 'natural', maxGetal: 1000 }).note).toBeNull();
    });
});
