// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { flattenLeaves } from '../config/appstructure';
import { DEFAULT_BASE, seedConstraints, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS, LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { migrateWorksheetFile, loadAutosave, WORKSHEET_FORMAT_VERSION, type WorksheetFile } from '../services/persistence';
import { makeBlock, generateFor } from './helpers/makeBlock';

// [S1] Kommagetallen are a leerjaar-4 topic: the base starts on 0 decimals, only leerjaar 4-6
// seed 2, and leerjaar 1-3 or "Alle leerjaren" set them back to 0. Before, a fresh profile
// already had 2, so every plaatswaarde / vergelijken leaf opened on "703,41".

const leaves = flattenLeaves();
// Leaves whose decimalPlaces is the decimal switch itself (no numberType) and not pinned.
const SWITCH_LEAVES = ['plaatswaarde-waarde', 'plaatswaarde-plaats', 'plaatswaarde-omcirkelen', 'plaatswaarde-tabel', 'vergelijken-getallen', 'vergelijken-kiezen'];
const baseFor = (g: Leerjaar | null) => (g == null ? DEFAULT_BASE : { ...DEFAULT_BASE, ...GRADE_PRESETS[g] });
const seedOf = (id: string, g: Leerjaar | null) => {
    const leaf = leaves.find(l => l.id === id)!;
    return seedConstraints({ typeId: leaf.typeId, base: baseFor(g), override: leaf.defaultConstraints, grade: g, leafId: id });
};

afterEach(() => {
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe('the base decimals', () => {
    test('default 0; leerjaar 1-3 → 0, leerjaar 4-6 → 2', () => {
        expect(DEFAULT_BASE.baseDecimalPlaces).toBe(0);
        expect(LEERJAREN.map(g => baseFor(g).baseDecimalPlaces)).toEqual([0, 0, 0, 2, 2, 2]);
    });

    test.each(SWITCH_LEAVES)('%s: whole numbers without a leerjaar and at 1-3, decimals at 4-6', (id) => {
        expect(([null, 1, 2, 3, 4, 5, 6] as Array<Leerjaar | null>).map(g => seedOf(id, g).decimalPlaces)).toEqual([0, 0, 0, 0, 2, 2, 2]);
        const leaf = leaves.find(l => l.id === id)!;
        const block = makeBlock(leaf.typeId, { constraints: leaf.defaultConstraints, leafId: id });
        for (const e of generateFor(block) as Array<Record<string, unknown>>) {
            const nums = (e.numbers as number[] | undefined) ?? [e.number, e.a, e.b].filter(v => v !== undefined) as number[];
            for (const n of nums) expect(Number.isInteger(n), `${id}: ${n}`).toBe(true);
        }
    });

    test('a numberType type keeps its own precision when the base has none', () => {
        expect(seedOf('hr-std-optellen-dec', null).decimalPlaces).toBe(2);
        expect(seedOf('getalbegrip-ordenen-dec', null).decimalPlaces).toBe(1);
        expect(seedOf('getalbegrip-ordenen-dec', 4).decimalPlaces).toBe(2);
        // A teacher's own Decimalen pick still reaches every type.
        const base: BaseSettings = { ...DEFAULT_BASE, baseNumberType: 'decimal', baseDecimalPlaces: 3 };
        expect(seedConstraints({ typeId: 'hr-std-optellen', base }).decimalPlaces).toBe(3);
        expect(seedConstraints({ typeId: 'plaatswaarde', base }).decimalPlaces).toBe(3);
    });
});

describe('picking a leerjaar', () => {
    const dp = () => useWorksheetStore.getState().baseSettings.baseDecimalPlaces;
    test.each([[4, null], [5, 2], [6, 1], [4, 3]] as Array<[Leerjaar, Leerjaar | null]>)('%s then %s resets the decimals to 0', (from, to) => {
        const s = useWorksheetStore.getState();
        s.setSelectedGrade(from);
        expect(dp()).toBe(2);
        s.setSelectedGrade(to);
        expect(dp()).toBe(0);
        s.addBlockFromType('plaatswaarde', 'Tabel invullen', { subType: 'tabel' }, { leafId: 'plaatswaarde-tabel' });
        expect(useWorksheetStore.getState().blocks.at(-1)!.constraints.decimalPlaces).toBe(0);
    });
});

describe('v3 → v4: the old default 2 becomes 0, a value the teacher meant stays', () => {
    const v3 = (base: Partial<BaseSettings> | undefined, selectedGrade?: Leerjaar | null): WorksheetFile => {
        const s = useWorksheetStore.getState();
        return {
            version: 3, exportedAt: '2026-10-01T00:00:00.000Z',
            blocks: [makeBlock('plaatswaarde', { id: 'p', constraints: { decimalPlaces: 2 } })],
            header: s.header, footer: s.footer, docSettings: s.docSettings,
            ...(base ? { baseSettings: { ...DEFAULT_BASE, ...base } as BaseSettings } : {}),
            ...(selectedGrade !== undefined ? { selectedGrade } : {}),
        };
    };
    const migratedDp = (f: WorksheetFile) => migrateWorksheetFile(f).baseSettings?.baseDecimalPlaces;

    test('a natural base with 2 and no leerjaar (the old default) → 0', () => {
        expect(migratedDp(v3({ baseDecimalPlaces: 2 }))).toBe(0);
        expect(migratedDp(v3({ baseDecimalPlaces: 2 }, 2))).toBe(0);
        expect(migratedDp(v3({ baseDecimalPlaces: 2, baseNumberType: 'rational' }, null))).toBe(0);
    });

    test('kept: a leerjaar 4-6 sheet, a decimal base, a 1 or 3, a file without a base', () => {
        expect(migratedDp(v3({ baseDecimalPlaces: 2 }, 4))).toBe(2);
        expect(migratedDp(v3({ baseDecimalPlaces: 2, baseNumberType: 'decimal' }))).toBe(2);
        expect(migratedDp(v3({ baseDecimalPlaces: 3 }))).toBe(3);
        expect(migratedDp(v3({ baseDecimalPlaces: 1 }))).toBe(1);
        expect(migrateWorksheetFile(v3(undefined)).baseSettings).toBeUndefined();
    });

    test('blocks are never touched, the version lands on 4, a v4 file is left alone', () => {
        const out = migrateWorksheetFile(v3({ baseDecimalPlaces: 2 }));
        expect(out.version).toBe(WORKSHEET_FORMAT_VERSION);
        expect(out.version).toBe(4);
        expect(out.blocks[0].constraints.decimalPlaces).toBe(2);
        const v4 = { ...v3({ baseDecimalPlaces: 2 }), version: 4 };
        expect(migrateWorksheetFile(v4)).toBe(v4);
    });

    test('a returning teacher\'s autosave comes back on whole numbers', () => {
        localStorage.setItem('rekenraak_autosave_v1', JSON.stringify({ savedAt: '2026-10-01T00:00:00.000Z', payload: v3({ baseDecimalPlaces: 2 }) }));
        try {
            const rec = loadAutosave()!;
            useWorksheetStore.getState().loadWorksheet(rec.payload);
            expect(useWorksheetStore.getState().baseSettings.baseDecimalPlaces).toBe(0);
        } finally {
            localStorage.removeItem('rekenraak_autosave_v1');
        }
    });
});
