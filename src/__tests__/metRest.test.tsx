// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY, floorMaxIntoList } from '../config/exerciseRegistry';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { GRADE_PRESETS, LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { RANGES, clipMetRestLevel, metRestLevelFits } from '../config/numberRanges';
import { makeBlock } from './helpers/makeBlock';

// [L19] Delen met rest follows the leerjaar: its deeltal max is a list (100 / 1000) that the
// grade seeds, the config shows it as "Maximum deeltal", and N2/N3 grey out under a max
// that cannot hold them. The generator side (deeltal ≤ maxGetal) lives in mathEngine.ts.

const METREST = { numberType: 'natural', multiplicationMode: 'met_rest' } as const;
const WANT: Record<Leerjaar, number> = { 1: 100, 2: 100, 3: 1000, 4: 1000, 5: 1000, 6: 1000 };
const gradeBase = (g: Leerjaar) => ({ ...DEFAULT_BASE, ...GRADE_PRESETS[g] });

afterEach(() => {
    cleanup();
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});

describe('the met-rest list', () => {
    test('100 / 1000, the registry hands it out for natural met rest division only', () => {
        expect(RANGES.hrMetRest).toEqual([100, 1000]);
        const fn = REGISTRY['hr-std-delen'].maxPresets!;
        expect(fn({ ...METREST })).toEqual({ key: 'maxGetal', presets: RANGES.hrMetRest });
        expect(fn({ numberType: 'natural', multiplicationMode: 'tafels' })).toBeNull();
        expect(fn({ numberType: 'natural', multiplicationMode: 'andere' })?.presets).toEqual(RANGES.hrAndere);
        expect(fn({ ...METREST, preset: 'tienvoud' })?.presets).toEqual(RANGES.hrTienvoud);
        expect(fn({ numberType: 'decimal', multiplicationMode: 'met_rest' })?.presets).toEqual(RANGES.decimal);
        expect(fn({ numberType: 'rational', multiplicationMode: 'met_rest' })).toBeNull();
        // Met rest is a division mode: × keeps its own lists.
        expect(REGISTRY['hr-std-vermenigvuldigen'].maxPresets!({ ...METREST })).toBeNull();
    });

    test('niveaus: N1 always fits, N2 from 100, N3 from 1000', () => {
        expect([10, 20, 100, 1000].map(m => [1, 2, 3].filter(l => metRestLevelFits(l, m)))).toEqual([[1], [1], [1, 2], [1, 2, 3]]);
        expect(clipMetRestLevel(3, 100)).toBe(2);
        expect(clipMetRestLevel(3, 20)).toBe(1);
        expect(clipMetRestLevel(2, 1000)).toBe(2);
    });
});

describe('grade seeding', () => {
    test.each(LEERJAREN)('leerjaar %d: a met-rest block seeds its deeltal max from the grade', (g) => {
        expect(seedConstraints({ typeId: 'hr-std-delen', base: gradeBase(g), override: { ...METREST }, grade: g }).maxGetal).toBe(WANT[g]);
    });

    test('no leerjaar: the default base gives today\'s 1000', () => {
        expect(seedConstraints({ typeId: 'hr-std-delen', base: DEFAULT_BASE, override: { ...METREST } }).maxGetal).toBe(1000);
    });

    test('tafels (no picker) keeps the registry default, as before', () => {
        for (const g of LEERJAREN) {
            expect(seedConstraints({ typeId: 'hr-std-delen', base: gradeBase(g), override: { numberType: 'natural' }, grade: g }).maxGetal).toBe(1000);
        }
    });
});

// The store's live block, re-rendered on every patch the way the Inspector does.
function LiveConfig({ id }: { id: string }) {
    const block = useWorksheetStore((s) => s.blocks.find(b => b.id === id))!;
    const { Config } = EXERCISE_UI[block.typeId];
    return <Config block={block} />;
}

function addDelen(grade: Leerjaar | null) {
    const s = useWorksheetStore.getState();
    if (grade != null) s.setSelectedGrade(grade);
    s.addBlockFromType('hr-std-delen', 'Natuurlijke getallen', { numberType: 'natural' }, { leafId: 'hr-std-delen-nat' });
    const blocks = useWorksheetStore.getState().blocks;
    const id = blocks[blocks.length - 1].id;
    render(<LiveConfig id={id} />);
    return () => useWorksheetStore.getState().blocks.find(b => b.id === id)!.constraints as Record<string, unknown>;
}

const levelRow = (n: number) => screen.getByText(`N${n}`, { selector: 'span' }).parentElement!;

describe('the Met rest config', () => {
    test.each(LEERJAREN)('leerjaar %d: entering met rest seeds the deeltal max from the grade', (g) => {
        const c = addDelen(g);
        expect(c().maxGetal).toBe(1000);   // tafels: no picker, untouched default
        fireEvent.click(screen.getByText('Met rest'));
        expect(c().multiplicationMode).toBe('met_rest');
        expect(c().maxGetal).toBe(WANT[g]);
        expect(screen.getByRole('button', { name: 'Maximum deeltal' }).textContent).toContain(WANT[g] === 100 ? 'Tot 100' : 'Tot 1.000');
    });

    test('at 100 N3 is disabled and a stored N3 drops to N2; at 1000 it comes back', () => {
        const c = addDelen(3);
        fireEvent.click(screen.getByText('Met rest'));
        fireEvent.click(levelRow(3));
        expect(c().metRestLevel).toBe(3);

        const picker = screen.getByRole('button', { name: 'Maximum deeltal' });
        fireEvent.click(picker);
        fireEvent.click(screen.getByRole('option', { name: 'Tot 100' }));
        expect(c().maxGetal).toBe(100);
        expect(c().metRestLevel).toBe(2);
        expect(levelRow(3).getAttribute('aria-disabled')).toBe('true');
        expect(screen.getByText(/N3 past niet onder het maximum deeltal/)).toBeTruthy();
        fireEvent.click(levelRow(3));
        expect(c().metRestLevel).toBe(2);

        fireEvent.click(picker);
        fireEvent.click(screen.getByRole('option', { name: 'Tot 1.000' }));
        expect(levelRow(3).getAttribute('aria-disabled')).toBe('false');
        fireEvent.click(levelRow(3));
        expect(c().metRestLevel).toBe(3);
    });

    test('clicking Met rest again keeps the teacher\'s pick', () => {
        const c = addDelen(2);
        fireEvent.click(screen.getByText('Met rest'));
        fireEvent.click(screen.getByRole('button', { name: 'Maximum deeltal' }));
        fireEvent.click(screen.getByRole('option', { name: 'Tot 1.000' }));
        fireEvent.click(screen.getByText('Met rest'));
        expect(c().maxGetal).toBe(1000);
    });

    test('leaving to andere: its own list takes over (100 clamps up to 1000)', () => {
        const c = addDelen(2);
        fireEvent.click(screen.getByText('Met rest'));
        fireEvent.click(screen.getByText('Andere'));
        expect(c().maxGetal).toBe(1000);
    });
});

describe('old saves', () => {
    test('a met-rest block from before the list keeps working', () => {
        // Every met-rest block used to carry the untouched default 1000: it stays.
        expect(floorMaxIntoList('hr-std-delen', { ...METREST, maxGetal: 1000, metRestLevel: 3 }).maxGetal).toBe(1000);
        // Without a maxGetal nothing is invented (the config and generator default to 1000).
        expect('maxGetal' in floorMaxIntoList('hr-std-delen', { ...METREST, metRestLevel: 3 })).toBe(false);
        // An 'andere' max carried into met rest floors once at load, as the picker would.
        expect(floorMaxIntoList('hr-std-delen', { ...METREST, maxGetal: 1_000_000 }).maxGetal).toBe(1000);
    });

    test('the loaded block opens with N3 still selectable at 1000', () => {
        const block = makeBlock('hr-std-delen', { id: 'old', constraints: { ...METREST, maxGetal: 1000, metRestLevel: 3, selectedTables: [3, 7] } });
        const s = useWorksheetStore.getState();
        s.loadWorksheet({ blocks: [block], header: s.header, footer: s.footer, docSettings: s.docSettings });
        render(<LiveConfig id="old" />);
        expect(levelRow(3).getAttribute('aria-disabled')).toBe('false');
        const c = useWorksheetStore.getState().blocks[0].constraints as Record<string, unknown>;
        expect([c.maxGetal, c.metRestLevel]).toEqual([1000, 3]);
    });
});
