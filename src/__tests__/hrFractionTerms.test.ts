import { describe, test, expect, afterEach } from 'vitest';
import { isFraction, type Equation } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { constraintSpaceFor } from '../config/constraintSpace';
import { seedLeafConstraints } from '../config/baseSettings';

// Hoofdrekenen + − with breuken: no term is a whole number written as a breuk (8/8, 8/4, 6/3); the kgv
// steps blew 8/8 up to 24/24 (BUGS 2026-11-13, hr-std-optellen-rat multi_step seed 7).

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; });

const LEAVES = { 'hr-std-optellen': 'hr-std-optellen-rat', 'hr-std-aftrekken': 'hr-std-aftrekken-rat' } as const;

describe('hoofdrekenen + − breuken: never a whole-valued term', () => {
    for (const [typeId, leafId] of Object.entries(LEAVES)) {
        test(`${typeId}: the fraction option matrix`, () => {
            const space = constraintSpaceFor(typeId);
            const base = seedLeafConstraints(leafId, null)!.constraints;
            let terms = 0;
            for (const fractionDifficulty of space.fractionDifficulty as string[])
                for (const termCount of space.termCount as number[])
                    for (const mixedNumber1 of [false, true])
                        for (const mixedNumber2 of [false, true])
                            for (const maxNumerator1 of space.maxNumerator1 as number[])
                                for (const maxDenominator1 of space.maxDenominator1 as number[])
                                    for (const maxDenominator2 of space.maxDenominator2 as number[])
                                        for (let seed = 1; seed <= 4; seed++) {
                                            Math.random = mulberry32(seed);
                                            const constraints = {
                                                ...base, numberType: 'rational', fractionDifficulty, termCount, mixedNumber1, mixedNumber2,
                                                maxNumerator1, maxNumerator2: maxNumerator1, maxDenominator1, maxDenominator2, linkFractions: false,
                                            };
                                            const block = makeBlock(typeId, { leafId, constraints, block: { numberOfExercises: 8 } });
                                            for (const eq of REGISTRY[typeId].generate(block) as Equation[]) {
                                                for (const op of eq.operands) {
                                                    if (!isFraction(op)) continue;
                                                    terms++;
                                                    expect(op.n % op.d, `${JSON.stringify(constraints)}: ${JSON.stringify(eq.operands)}`).not.toBe(0);
                                                }
                                            }
                                        }
            expect(terms).toBeGreaterThan(1000);
        });
    }

    test('the bug repro: optellen multi_step seed 7', () => {
        const seeded = seedLeafConstraints('hr-std-optellen-rat', null)!;
        Math.random = mulberry32(7);
        const block = makeBlock(seeded.typeId, { leafId: 'hr-std-optellen-rat', constraints: { ...seeded.constraints, fractionDifficulty: 'multi_step' }, block: { numberOfExercises: 20 } });
        const ops = (REGISTRY[seeded.typeId].generate(block) as Equation[]).flatMap(eq => eq.operands).filter(isFraction);
        expect(ops.length).toBeGreaterThan(0);
        for (const op of ops) expect(op.n % op.d).not.toBe(0);
    });
});
