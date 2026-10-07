import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { MeetExercise } from '../services/math/types';

const gen = (typeId: string, constraints: Record<string, unknown>, n = 40) =>
    Array.from({ length: 10 }, () => generateFor(makeBlock(typeId, { constraints, block: { numberOfExercises: n } })) as MeetExercise[]).flat();

describe('meten limits', () => {
    // L12
    test.each(['omtrek', 'oppervlakte'])('%s rechthoek never exceeds max when w = h = max', (typeId) => {
        for (const [minLength, maxLength] of [[10, 10], [9, 10], [3, 4], [1, 2]]) {
            for (const ex of gen(typeId, { subType: 'berekenen', shapes: ['rechthoek'], minLength, maxLength })) {
                for (const s of ex.sides ?? []) { expect(s).toBeLessThanOrEqual(maxLength); expect(s).toBeGreaterThanOrEqual(1); }
            }
        }
    });
    // L13
    test('oppervlakte rooster respects minLength', () => {
        for (const ex of gen('oppervlakte', { subType: 'rooster', shapes: ['rechthoek', 'vierkant'], minLength: 3, maxLength: 4 })) {
            for (const s of ex.sides ?? []) { expect(s).toBeGreaterThanOrEqual(3); expect(s).toBeLessThanOrEqual(4); }
        }
    });
    test('oppervlakte rooster l-figuur at maxLength 3 stays an L', () => {
        for (const ex of gen('oppervlakte', { subType: 'rooster', shapes: ['l-figuur'], minLength: 2, maxLength: 3 })) {
            expect(ex.shape).toBe('l-figuur');
        }
    });
    // L16
    test('omtrek at max 1-3: trapezium and cirkel stay within the max', () => {
        for (const maxLength of [3, 2]) {
            for (const ex of gen('omtrek', { shapes: ['trapezium'], minLength: 1, maxLength })) {
                for (const s of ex.sides ?? []) expect(s).toBeLessThanOrEqual(maxLength);
            }
        }
        for (const maxLength of [2, 3]) {
            for (const ex of gen('omtrek', { shapes: ['cirkel'], minLength: 1, maxLength })) expect((ex.radius ?? 0) * 2).toBeLessThanOrEqual(maxLength);
        }
    });
});
