import { describe, test, expect } from 'vitest';
import { generateWithRelaxation, relaxationNote } from '../services/math/relax';
import { generateAdditionExercises, generateSubtractionExercises } from '../services/math/mathEngine';
import { REGISTRY } from '../config/exerciseRegistry';
import { makeBlock } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// The six constraint sets the pairwise matrix reported as 0/10 before the relaxation
// ladder existed (BUGS.md "hr-std-* over-restrictive combos", 2026-09-12).
const OVER_RESTRICTIVE: Array<[string, Record<string, unknown>]> = [
    ['hr-std-optellen', { numberType: 'natural', maxGetal: 100000, bridges: { E: 'FORBIDDEN', T: 'FORBIDDEN' }, operand2Mask: { E: true }, termCount: 4, preset: 'compenseren', presetDistance: 1 }],
    ['hr-std-aftrekken', { numberType: 'natural', maxGetal: 20, operand1Mask: { E: true }, operand2Mask: { E: true }, termCount: 3, preset: 'compenseren', presetDistance: 2 }],
    ['hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: 20, decimalPlaces: 1, operand1Mask: { T: true, E: true }, operand2Mask: { T: true, E: true }, termCount: 4, multiplicationMode: 'andere', selectedTables: [7] }],
    ['hr-std-delen', { numberType: 'geheel', maxGetal: 10, bridges: { E: 'FORBIDDEN' }, operand1Mask: { T: true, E: true }, operand2Mask: { E: true }, multiplicationMode: 'met_rest', selectedTables: [7] }],
];

describe('generateWithRelaxation', () => {
    test('leaves workable settings alone', () => {
        const block = makeBlock('hr-std-optellen', { constraints: { maxGetal: 100 } });
        const result = generateWithRelaxation(block, generateAdditionExercises);
        expect(result.items.length).toBe(block.numberOfExercises);
        expect(result.relaxed).toEqual([]);
        expect(result.shortfall).toBe(false);
        expect(relaxationNote(result)).toBeNull();
    });

    // Through the registry row, which is where the wrapper actually sits.
    test.each(OVER_RESTRICTIVE)('%s: an impossible set still yields exercises', (typeId, constraints) => {
        const block = makeBlock(typeId, { constraints });
        const { items, note } = REGISTRY[typeId].generateNoted!(block);
        expect(items.length).toBeGreaterThan(0);
        expect(note).not.toBeNull();
    });

    test('never mutates the stored settings', () => {
        const constraints = { maxGetal: 20, operand1Mask: { E: true }, operand2Mask: { E: true }, termCount: 3, preset: 'compenseren', presetDistance: 2 };
        const block = makeBlock('hr-std-aftrekken', { constraints });
        const before = JSON.stringify(block.constraints);
        generateWithRelaxation(block, generateSubtractionExercises);
        expect(JSON.stringify(block.constraints)).toBe(before);
    });

    test('reports the rungs it dropped, weakest first', () => {
        const block = makeBlock('hr-std-optellen', {
            constraints: { maxGetal: 100000, bridges: { E: 'FORBIDDEN', T: 'FORBIDDEN' }, operand2Mask: { E: true }, termCount: 4, preset: 'compenseren', presetDistance: 1 },
        });
        const result = generateWithRelaxation(block, generateAdditionExercises);
        expect(result.relaxed[0]).toBe('preset');
        // Ladder order: preset → operand2Mask → operand1Mask → bridges → termCount.
        const order = ['preset', 'operand2Mask', 'operand1Mask', 'bridges', 'termCount'];
        const indices = result.relaxed.map(s => order.indexOf(s));
        expect([...indices].sort((a, b) => a - b)).toEqual(indices);
    });

    test('a rung that is already at its default is never reported', () => {
        // No preset, no masks, no bridges → nothing relaxable, so a shortfall says so plainly.
        const block = makeBlock('hr-std-optellen', { constraints: { maxGetal: 100 }, block: { numberOfExercises: 5000 } });
        const result = generateWithRelaxation(block, generateAdditionExercises);
        expect(result.relaxed).toEqual([]);
        expect(result.shortfall).toBe(true);
        expect(relaxationNote(result)).toBe(`Slechts ${result.items.length} oefeningen mogelijk bij deze instellingen.`);
    });
});

describe('relaxationNote', () => {
    test('names the relaxed steps in Dutch', () => {
        const note = relaxationNote({ items: [], relaxed: ['bridges', 'termCount'], shortfall: false });
        expect(note).toBe('Instellingen versoepeld om genoeg oefeningen te maken: brug, aantal termen.');
    });

    test('a shortfall says how many were possible', () => {
        const note = relaxationNote({ items: [1, 2, 3], relaxed: ['preset'], shortfall: true });
        expect(note).toBe('Slechts 3 oefeningen mogelijk bij deze instellingen.');
    });
});

describe('registry wiring', () => {
    test.each(['hr-std-optellen', 'hr-std-aftrekken', 'hr-std-vermenigvuldigen', 'hr-std-delen'])('%s exposes generateNoted', (typeId) => {
        expect(REGISTRY[typeId].generateNoted).toBeTypeOf('function');
        const block: MathBlock = makeBlock(typeId);
        const { items, note } = REGISTRY[typeId].generateNoted!(block);
        expect(items.length).toBe(block.numberOfExercises);
        expect(note).toBeNull();
    });
});
