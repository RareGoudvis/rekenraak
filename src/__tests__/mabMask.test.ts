import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { MabExercise } from '../services/math/types';

// "Specifieke getalopbouw": a ticked place holds 1-9, an unticked one is 0. The reference reads
// the digits off the numeral string, not the generator's own decompose().

function digitAt(value: number, place: 'D' | 'H' | 'T' | 'E'): number {
    const s = String(value).padStart(4, '0');
    return Number(s['DHTE'.indexOf(place)]);
}

const MASKS: [number, Record<string, boolean>][] = [
    [1000, { H: true, T: true }],
    [1000, { H: true, E: true }],
    [1000, { T: true }],
    [1000, { D: true }],
    [100, { T: true, E: true }],
    [100, { E: true }],
    [20, { T: true }],
    [10, { E: true }],
];

describe('mab getalopbouw mask', () => {
    for (const typeId of ['mab-herkennen', 'mab-tekenen']) {
        for (const [maxNumber, mask] of MASKS) {
            test(`${typeId} max ${maxNumber} ${Object.keys(mask).join('+')}`, () => {
                for (let run = 0; run < 30; run++) {
                    const block = makeBlock(typeId, { constraints: { maxNumber, operand1Mask: mask }, block: { numberOfExercises: 12 } });
                    const ex = generateFor(block) as MabExercise[];
                    expect(ex).toHaveLength(12);
                    for (const e of ex) {
                        expect(e.value).toBeGreaterThanOrEqual(1);
                        expect(e.value).toBeLessThanOrEqual(maxNumber);
                        for (const place of ['D', 'H', 'T', 'E'] as const) {
                            const d = digitAt(e.value, place);
                            if (mask[place]) expect(d, `${e.value} ${place}`).toBeGreaterThanOrEqual(1);
                            else expect(d, `${e.value} ${place}`).toBe(0);
                        }
                    }
                }
            });
        }
    }

    test('H+T at 1000 has no repeats while the 81 values last', () => {
        const block = makeBlock('mab-herkennen', { constraints: { maxNumber: 1000, operand1Mask: { H: true, T: true } }, block: { numberOfExercises: 40 } });
        const values = (generateFor(block) as MabExercise[]).map(e => e.value);
        expect(new Set(values).size).toBe(40);
    });

    test('an impossible mask (T+E at 10) still fills the block', () => {
        const block = makeBlock('mab-herkennen', { constraints: { maxNumber: 10, operand1Mask: { T: true, E: true } }, block: { numberOfExercises: 6 } });
        expect(generateFor(block)).toHaveLength(6);
    });
});
