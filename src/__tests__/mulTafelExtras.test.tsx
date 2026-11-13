// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';
import { REGISTRY } from '../config/exerciseRegistry';
import { EXERCISE_UI } from '../config/exerciseUI';
import { RANGES, TAFEL_FROM } from '../config/numberRanges';
import { constraintSpaceFor } from '../config/constraintSpace';
import { generateForBlock } from '../services/generateDispatch';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import type { Equation } from '../services/math/types';

// Owner request 2026-11-13, hoofdrekenen ×: "Factoren wisselen", tafels "Vanaf" and "Uitkomst tot",
// and 100 on the 'andere' max list. Every key is optional: absent = the very same draws as before.

const realRandom = Math.random;
afterEach(() => {
    Math.random = realRandom;
    cleanup();
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
});
const seeded = <T,>(seed: number, fn: () => T): T => {
    Math.random = mulberry32(seed);
    try { return fn(); } finally { Math.random = realRandom; }
};

const TAFELS = { multiplicationMode: 'tafels', selectedTables: [6, 7], tableLimit: 20 };
const ANDERE = { multiplicationMode: 'andere', maxGetal: 1000 };
const mul = (constraints: Record<string, unknown>, count = 12) =>
    makeBlock('hr-std-vermenigvuldigen', { constraints, block: { numberOfExercises: count } });
const gemengdX = (x: Record<string, unknown>, count = 12) =>
    makeBlock('hr-std-gemengd', { constraints: { variants: ['x'], perVariant: { x } }, block: { numberOfExercises: count } });
const fmt = (eqs: unknown[]) => (eqs as Equation[]).map(e => `${(e.operands as number[]).join('x')}=${e.answer as number}`);
const draw = (block: ReturnType<typeof mul>, seed = 42) => seeded(seed, () => fmt(generateFor(block)));
const pairs = (block: ReturnType<typeof mul>, seeds = 40): [number, number][] =>
    Array.from({ length: seeds }, (_, s) => seeded(s + 1, () => (generateFor(block) as Equation[]).map(e => e.operands as [number, number]))).flat();

// Captured from the generator before the options existed (seed 42).
const GOLDEN = {
    tafels: ['9x7=63', '6x11=66', '7x10=70', '7x7=49', '7x13=91', '2x7=14', '6x2=12', '7x1=7', '6x17=102', '2x6=12', '6x13=78', '18x7=126'],
    andere: ['19x24=456', '21x8=168', '9x72=648', '15x17=255', '24x13=312', '16x43=688', '26x2=52', '1x268=268', '6x133=798', '1x202=202', '15x52=780', '14x3=42'],
    gemengd: ['8x1=8', '8x3=24', '3x9=27', '3x5=15', '8x6=48', '4x3=12', '7x3=21', '1x8=8', '8x2=16', '5x3=15', '2x8=16', '10x3=30'],
};

describe('absent keys keep the old draws', () => {
    test('tafels, andere and the gemengd × tab match the pre-option golden', () => {
        expect(draw(mul(TAFELS))).toEqual(GOLDEN.tafels);
        expect(draw(mul(ANDERE))).toEqual(GOLDEN.andere);
        expect(draw(gemengdX({ selectedTables: [3, 8], tableLimit: 10 }))).toEqual(GOLDEN.gemengd);
    });

    test('the values that mean "as before" draw the same too', () => {
        expect(draw(mul({ ...TAFELS, swapFactors: true, tableFrom: 1, tableProductMax: 0 }))).toEqual(GOLDEN.tafels);
        expect(draw(mul({ ...ANDERE, swapFactors: false }))).toEqual(GOLDEN.andere);
        // A Vanaf at or past the "tot" is ignored (a lowered "tot" left it behind).
        expect(draw(mul({ ...TAFELS, tableFrom: 21 }))).toEqual(GOLDEN.tafels);
    });
});

describe('Factoren wisselen', () => {
    test('tafels UIT: always multiplier × tafel', () => {
        const ps = pairs(mul({ multiplicationMode: 'tafels', selectedTables: [7], tableLimit: 10, swapFactors: false }));
        expect(ps.length).toBeGreaterThan(100);
        for (const [a, b] of ps) expect(b, `${a} × ${b}`).toBe(7);
    });

    test('tafels AAN (and absent): the tafel lands on both sides', () => {
        const ps = pairs(mul({ multiplicationMode: 'tafels', selectedTables: [7], tableLimit: 10, swapFactors: true }));
        expect(ps.some(([a, b]) => a === 7 && b !== 7)).toBe(true);
        expect(ps.some(([a, b]) => b === 7 && a !== 7)).toBe(true);
    });

    test('andere AAN: either factor first; absent keeps the drawn order', () => {
        const masks = { operand1Mask: { T: true, E: true }, operand2Mask: { E: true } };
        const off = pairs(mul({ ...ANDERE, ...masks }));
        expect(off.every(([a]) => a >= 10)).toBe(true);
        const on = pairs(mul({ ...ANDERE, ...masks, swapFactors: true }));
        expect(on.some(([a]) => a < 10)).toBe(true);
        expect(on.some(([a]) => a >= 10)).toBe(true);
    });
});

describe('Vanaf and Uitkomst tot', () => {
    test('Vanaf 11, tot 20: the multiplier stays in 11..20, no plain tafel facts', () => {
        for (const [a, b] of pairs(mul({ ...TAFELS, tableFrom: 11, swapFactors: false }))) {
            expect([6, 7]).toContain(b);
            expect(a).toBeGreaterThanOrEqual(11);
            expect(a).toBeLessThanOrEqual(20);
        }
    });

    test('Uitkomst tot 100 drops 9 × 16 = 144 and every product above 100', () => {
        const ps = pairs(mul({ multiplicationMode: 'tafels', selectedTables: [9], tableLimit: 20, tableProductMax: 100 }));
        expect(ps.length).toBeGreaterThan(0);
        for (const [a, b] of ps) expect(a * b, `${a} × ${b}`).toBeLessThanOrEqual(100);
    });

    test('the gemengd × tab honours them as well', () => {
        const eqs = seeded(3, () => generateFor(gemengdX({ ...TAFELS, tableFrom: 11, tableProductMax: 100, swapFactors: false }, 8)) as Equation[]);
        expect(eqs.length).toBe(8);
        for (const e of eqs) {
            const [a, b] = e.operands as number[];
            expect([6, 7]).toContain(b);
            expect(a).toBeGreaterThanOrEqual(11);
            expect(a * b).toBeLessThanOrEqual(100);
        }
    });

    test('a pool smaller than the count says so instead of a silent shortfall', () => {
        // 6 × 11..16 and 7 × 11..14 are the only facts: 10 of the 15 asked.
        const { items, note } = generateForBlock(mul({ ...TAFELS, tableFrom: 11, tableProductMax: 100, swapFactors: false }, 15));
        expect(items).toHaveLength(10);
        expect(note).toMatch(/Slechts 10 oefeningen mogelijk/);
        const none = generateForBlock(mul({ multiplicationMode: 'tafels', selectedTables: [75], tableLimit: 20, tableFrom: 11, tableProductMax: 500 }));
        expect(none.items).toHaveLength(0);
        expect(none.note).toMatch(/Geen oefeningen mogelijk/);
    });
});

describe('lists', () => {
    test('× andere offers 100, delen andere keeps its 1000 floor', () => {
        expect(REGISTRY['hr-std-vermenigvuldigen'].maxPresets!({ numberType: 'natural', multiplicationMode: 'andere' })?.presets).toEqual(RANGES.hrAndereMul);
        expect(RANGES.hrAndereMul[0]).toBe(100);
        expect(REGISTRY['hr-std-delen'].maxPresets!({ numberType: 'natural', multiplicationMode: 'andere' })?.presets).toEqual(RANGES.hrAndere);
    });

    test('andere at max 100 stays within 100', () => {
        for (const [a, b] of pairs(mul({ multiplicationMode: 'andere', maxGetal: 100 }), 20)) expect(a * b).toBeLessThanOrEqual(100);
    });

    test('constraintSpace sweeps the new keys on × only', () => {
        const space = constraintSpaceFor('hr-std-vermenigvuldigen');
        expect(space.tableFrom).toEqual([...TAFEL_FROM]);
        expect(space.tableProductMax).toEqual([0, 100, 200, 500, 1000]);
        expect(space.swapFactors).toEqual([false, true]);
        expect(space.maxGetal).toContain(100);
        expect(constraintSpaceFor('hr-std-delen').tableFrom).toBeUndefined();
    });
});

function LiveConfig({ id }: { id: string }) {
    const block = useWorksheetStore((s) => s.blocks.find(b => b.id === id))!;
    const { Config } = EXERCISE_UI[block.typeId];
    return <Config block={block} />;
}
function addBlock(typeId: string, constraints: Record<string, unknown>) {
    useWorksheetStore.getState().addBlockFromType(typeId, 'Natuurlijke getallen', { numberType: 'natural', ...constraints });
    const blocks = useWorksheetStore.getState().blocks;
    const id = blocks[blocks.length - 1].id;
    render(<LiveConfig id={id} />);
    return () => useWorksheetStore.getState().blocks.find(b => b.id === id)!.constraints as Record<string, unknown>;
}
const swapButton = () => {
    const row = screen.getByText('Factoren wisselen').parentElement!.parentElement!;
    const btns = row.querySelectorAll<HTMLButtonElement>('button[aria-pressed]');
    return btns[btns.length - 1];
};
const pick = (picker: string, option: string) => {
    fireEvent.click(screen.getByRole('button', { name: picker }));
    fireEvent.click(screen.getByRole('option', { name: option }));
};

describe('the × config', () => {
    test('tafels: Vanaf, Uitkomst tot and Factoren wisselen (AAN when absent)', () => {
        const c = addBlock('hr-std-vermenigvuldigen', { multiplicationMode: 'tafels', tableLimit: 20 });
        expect(swapButton().textContent).toBe('AAN');
        fireEvent.click(swapButton());
        expect(c().swapFactors).toBe(false);
        expect(swapButton().textContent).toBe('UIT');

        // Vanaf offers only values below the "tot".
        fireEvent.click(screen.getByRole('button', { name: 'Vanaf' }));
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Vanaf 1×', 'Vanaf 6×', 'Vanaf 11×']);
        fireEvent.click(screen.getByRole('option', { name: 'Vanaf 11×' }));
        expect(c().tableFrom).toBe(11);

        pick('Uitkomst tot', 'Tot 100');
        expect(c().tableProductMax).toBe(100);
        pick('Uitkomst tot', 'Geen');
        expect(c().tableProductMax).toBe(0);

        // Lowering the "tot" under the Vanaf resets it.
        pick('Vermenigvuldig tot', 'Tot 10×');
        expect(c().tableLimit).toBe(10);
        expect(c().tableFrom).toBe(1);
    });

    test('andere: only Factoren wisselen, UIT when absent, and 100 in the max list', () => {
        const c = addBlock('hr-std-vermenigvuldigen', { multiplicationMode: 'andere' });
        expect(screen.queryByRole('button', { name: 'Vanaf' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Uitkomst tot' })).toBeNull();
        expect(swapButton().textContent).toBe('UIT');
        fireEvent.click(swapButton());
        expect(c().swapFactors).toBe(true);
        pick('Maximum uitkomst', 'Tot 100');
        expect(c().maxGetal).toBe(100);
    });

    test('delen shows none of the × extras', () => {
        addBlock('hr-std-delen', { multiplicationMode: 'tafels' });
        expect(screen.queryByText('Factoren wisselen')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Vanaf' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Uitkomst tot' })).toBeNull();
    });
});
