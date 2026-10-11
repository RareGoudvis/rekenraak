import { describe, test, expect } from 'vitest';
import type { Equation } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { seedLeafConstraints } from '../config/baseSettings';

// Owner 2026-10-11: the decimal delen default keeps a DECIMAL deler ("48,6 : 0,6"), usually 0,x and
// sometimes whole; max 100 / 1 decimal stays and every division is exact.
function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const dp = (v: number) => (String(v).split('.')[1] ?? '').length;

describe.each(['hr-std-delen-dec', 'hr-std-gemengd-dec'])('%s default deler', (leafId) => {
    test('over 200 seeds: at least 60% of the delers are decimal, all divisions exact, numbers within 100 / 1 decimal', () => {
        const seeded = seedLeafConstraints(leafId, null)!;
        let total = 0, decimalDeler = 0, wholeDeler = 0;
        for (let seed = 1; seed <= 200; seed++) {
            Math.random = mulberry32(seed);
            const block = makeBlock(seeded.typeId, { leafId, constraints: seeded.constraints });
            for (const eq of REGISTRY[seeded.typeId].generate(block) as Equation[]) {
                if (eq.operator !== ':') continue;
                const [a, b] = eq.operands as number[];
                const where = `seed ${seed}: ${a} : ${b} = ${eq.answer}`;
                total++;
                if (dp(b) > 0) decimalDeler++; else wholeDeler++;
                expect(Math.abs((eq.answer as number) * b - a), where).toBeLessThan(1e-9);
                for (const v of [a, b, eq.answer as number]) { expect(v, where).toBeLessThanOrEqual(100); expect(dp(v), where).toBeLessThanOrEqual(1); }
                if (dp(b) > 0) expect(b, where).toBeLessThan(1);
            }
        }
        expect(total).toBeGreaterThan(100);
        expect(wholeDeler, 'whole delers stay possible').toBeGreaterThan(0);
        expect(decimalDeler / total, `decimal share ${decimalDeler}/${total}`).toBeGreaterThanOrEqual(0.6);
    });
});
