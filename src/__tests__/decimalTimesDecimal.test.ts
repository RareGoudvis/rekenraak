import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { LEAF_BY_ID } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import type { Equation } from '../services/math/types';

// Owner decision 2026-10-10 (minimumdoelen 2.2, "vermenigvuldigen met een natuurlijk getal", 3 × 0,4):
// decimal × is kommagetal × natuurlijk getal by default; "Kommagetal × kommagetal" (decimalTimesDecimal,
// off) lets both factors carry decimals. hr-std-vermenigvuldigen-dec and gemengd-dec read the one setting.

const SEEDS = 200;
const decimals = (v: number) => (String(v).split('.')[1] ?? '').length;

function timesRows(leafId: string, extra: Record<string, unknown>): Equation[] {
    const leaf = LEAF_BY_ID[leafId];
    const rows: Equation[] = [];
    for (let s = 0; s < SEEDS; s++) {
        const c = leafId === 'hr-std-gemengd-dec' ? { variants: ['x'], perVariant: { x: extra } } : extra;
        const block = makeBlock(leaf.typeId, { constraints: { numberType: 'decimal', ...c }, leafId, block: { numberOfExercises: 4 } });
        rows.push(...(generateFor(block) as Equation[]).filter(e => e.operator === 'x'));
    }
    return rows;
}

describe.each(['hr-std-vermenigvuldigen-dec', 'hr-std-gemengd-dec'])('%s ×', (leafId) => {
    const vrij = {};
    test('default: a kommagetal × a natural number', () => {
        const rows = timesRows(leafId, vrij);
        expect(rows.length).toBeGreaterThan(SEEDS);
        for (const e of rows) {
            const [a, b] = e.operands as number[];
            expect(Number.isInteger(b), `${a} × ${b}`).toBe(true);
            expect(b).toBeGreaterThanOrEqual(2);
            expect(Number.isInteger(a), `${a} × ${b}`).toBe(false);
        }
    });
    test('Kommagetal × kommagetal: both factors may carry decimals', () => {
        const rows = timesRows(leafId, { ...vrij, decimalTimesDecimal: true });
        expect(rows.some(e => (e.operands as number[]).every(v => decimals(v) > 0))).toBe(true);
    });
});

test('Zonder ×1 holds when a whole-only Factor 1 mask ({E}) draws a 1', () => {
    for (const e of timesRows('hr-std-vermenigvuldigen-dec', { operand1Mask: { E: true }, excludeOne: true })) {
        expect(e.operands, (e.operands as number[]).join(' × ')).not.toContain(1);
    }
});

test('constraintSpace sweeps the toggle on hoofdrekenen ×', () => {
    expect(constraintSpaceFor('hr-std-vermenigvuldigen').decimalTimesDecimal).toEqual([false, true]);
});
