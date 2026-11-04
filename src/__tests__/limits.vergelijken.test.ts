import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';

// L5: a Getalopbouw mask on the top place (weight = max) offered digits 1-9 → up to 9 × max.
describe('vergelijken representaties mask stays within max', () => {
    const cases: Array<[number, Record<string, boolean>]> = [
        [10, { T: true }], [10, { T: true, E: true }], [100, { H: true }], [100, { H: true, T: true }],
    ];
    test.each(cases)('max %i mask %j', (maxGetal, mask) => {
        for (let i = 0; i < 20; i++) {
            const block = makeBlock('vergelijken', {
                constraints: { subType: 'representaties', maxGetal, leftRep: 'kommagetal', rightRep: 'kommagetal', leftMask: mask, rightMask: mask, decimalPlaces: 2 },
                block: { numberOfExercises: 10 },
            });
            for (const ex of generateFor(block) as Array<{ a: number; b: number }>) {
                expect(ex.a).toBeLessThanOrEqual(maxGetal);
                expect(ex.b).toBeLessThanOrEqual(maxGetal);
            }
        }
    });
});
