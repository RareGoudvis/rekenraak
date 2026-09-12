import { describe, test, expect } from 'vitest';
import type { Equation } from '../services/math/types';
import type { MixedConstraints, MixedVariantId } from '../services/math/constraintTypes';
import { effectiveBlockFor, generateMixedOne, mixedKey } from '../services/math/mixedGenerator';
import { makeBlock, generateFor } from './helpers/makeBlock';

// 'Gemengd' is the only family whose exercises come from four different generators, so
// these checks are about the mixing itself: which variant each exercise came from, that
// the shared bag reaches every variant, and that a tab override reaches only its own.

const SCALE = 1_000_000;
const scaled = (x: number) => Math.round(x * SCALE);

function mixedBlock(constraints: Partial<MixedConstraints>, count = 10) {
    return makeBlock('hr-std-gemengd', {
        constraints: constraints as Record<string, unknown>,
        block: { numberOfExercises: count },
    });
}

const run = (constraints: Partial<MixedConstraints>, count = 10): Equation[] =>
    generateFor(mixedBlock(constraints, count)) as Equation[];

describe('gemengd: variant selection', () => {
    test('cycle walks the chosen variants in turn', () => {
        const variants: MixedVariantId[] = ['+', '-', 'x', ':'];
        const items = run({ variants, mix: 'cycle', maxGetal: 100 }, 8);
        expect(items).toHaveLength(8);
        expect(items.map(e => e.operator)).toEqual(['+', '-', 'x', ':', '+', '-', 'x', ':']);
    });

    test('random covers every chosen variant when there is room', () => {
        for (let run_ = 0; run_ < 5; run_++) {
            const items = run({ variants: ['+', '-', 'x', ':'], mix: 'random', maxGetal: 100 }, 10);
            expect(items).toHaveLength(10);
            expect(new Set(items.map(e => e.operator))).toEqual(new Set(['+', '-', 'x', ':']));
        }
    });

    test('a preset variant and its plain operator coexist in one block', () => {
        const items = run({ variants: ['+', '+:compenseren'], mix: 'cycle', maxGetal: 100 }, 6);
        expect(items).toHaveLength(6);
        expect(items.every(e => e.operator === '+')).toBe(true);
        // Compenseren's second term sits 1 or 2 below a tienvoud; plain addition does not
        // have to, so the block must contain at least one of each shape.
        const nearTen = items.filter(e => [1, 2].includes(10 - (Number(e.operands[1]) % 10)));
        expect(nearTen.length).toBeGreaterThan(0);
    });

    test('ids are unique and nothing is manually edited', () => {
        const items = run({ variants: ['+', '-', 'x', ':'], mix: 'random' }, 12);
        expect(new Set(items.map(e => e.id)).size).toBe(items.length);
        expect(items.every(e => e.isManuallyEdited === false)).toBe(true);
    });

    test('no two exercises repeat the same operands under the same operator', () => {
        const items = run({ variants: ['+'], mix: 'cycle', maxGetal: 20 }, 10);
        expect(new Set(items.map(mixedKey)).size).toBe(items.length);
    });
});

describe('gemengd: shared settings and per-variant overrides', () => {
    test('effectiveBlockFor merges shared → preset defaults → tab override', () => {
        const block = mixedBlock({
            variants: ['x:tienvoud'], mix: 'cycle', maxGetal: 100,
            perVariant: { 'x:tienvoud': { presetFactors: [10] } },
        });
        const effective = effectiveBlockFor(block, 'x:tienvoud');
        const c = effective.constraints as Record<string, unknown>;
        expect(effective.typeId).toBe('hr-std-vermenigvuldigen');
        expect(effective.numberOfExercises).toBe(1);
        expect(c.maxGetal).toBe(100);           // shared
        expect(c.preset).toBe('tienvoud');      // from the variant
        expect(c.presetFactors).toEqual([10]);  // tab override beats the preset default
        expect(c.variants).toBeUndefined();     // mix controls never reach a generator
        expect(c.perVariant).toBeUndefined();
    });

    test('an override on one variant leaves the others alone', () => {
        const block = mixedBlock({ variants: ['+', 'x'], mix: 'cycle', maxGetal: 1000, perVariant: { x: { maxGetal: 50 } } });
        expect((effectiveBlockFor(block, 'x').constraints as Record<string, unknown>).maxGetal).toBe(50);
        expect((effectiveBlockFor(block, '+').constraints as Record<string, unknown>).maxGetal).toBe(1000);
    });

    test('perVariant selectedTables is honoured by the × generator', () => {
        const items = run({ variants: ['x'], mix: 'cycle', perVariant: { x: { selectedTables: [7], tableLimit: 10 } } }, 8);
        expect(items.length).toBeGreaterThan(0);
        expect(items.every(e => e.operands.includes(7))).toBe(true);
    });

    test('the shared maximum applies to every variant', () => {
        const items = run({ variants: ['+', '-'], mix: 'cycle', maxGetal: 20 }, 8);
        expect(items.every(e => e.operands.every(o => Number(o) <= 20))).toBe(true);
    });
});

describe('gemengd: answers', () => {
    const check = (items: Equation[]) => {
        expect(items.length).toBeGreaterThan(0);
        for (const eq of items) {
            const [a, b] = eq.operands.map(Number);
            const expected = eq.operator === '+' ? a + b : eq.operator === '-' ? a - b : eq.operator === 'x' ? a * b : a / b;
            expect(scaled(Number(eq.answer))).toBe(scaled(expected));
        }
    };

    test('natural answers are exact', () => {
        check(run({ variants: ['+', '-', 'x', ':'], mix: 'cycle', numberType: 'natural', maxGetal: 1000 }, 12));
    });

    test('decimal answers are exact', () => {
        check(run({ variants: ['+', '-'], mix: 'cycle', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2 }, 10));
    });
});

describe('generateMixedOne', () => {
    test('skips the keys it is told to avoid', () => {
        const block = mixedBlock({ variants: ['+'], mix: 'cycle', maxGetal: 100 });
        const first = generateMixedOne(block, '+');
        expect(first).not.toBeNull();
        const avoid = new Set([mixedKey(first as Equation)]);
        for (let i = 0; i < 10; i++) {
            const next = generateMixedOne(block, '+', avoid);
            expect(next).not.toBeNull();
            expect(avoid.has(mixedKey(next as Equation))).toBe(false);
        }
    });

    test('returns an exercise for every variant', () => {
        const ids: MixedVariantId[] = ['+', '+:compenseren', '-', '-:compenseren', 'x', 'x:tienvoud', ':', ':tienvoud'];
        const block = mixedBlock({ variants: ids, mix: 'cycle', maxGetal: 1000 });
        for (const id of ids) {
            const eq = generateMixedOne(block, id);
            expect(eq, `variant ${id}`).not.toBeNull();
            expect((eq as Equation).operator).toBe(id.split(':')[0] === '' ? ':' : id.split(':')[0]);
        }
    });
});
