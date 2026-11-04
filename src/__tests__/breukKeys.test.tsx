// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import VerticalFraction from '../components/viewer/VerticalFraction';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { Equation } from '../services/math/types';

afterEach(cleanup);

describe('breuk keys: big numbers keep their thousands spaces', () => {
    test('36 000 004/5', () => {
        const { container } = render(<VerticalFraction value={{ n: 36000004, d: 5 }} />);
        expect(container.textContent).toBe('36 000 0045');
    });
    test('a whole part and a big noemer too', () => {
        const { container } = render(<VerticalFraction value={{ whole: 12345, n: 1, d: 10000 }} />);
        expect(container.textContent).toBe('12 345110 000');
    });
});

// A Factor 1 mask place above the max is ignored (the rule cijferen got): {M, E} at max 1 000
// printed "9 000 001 × 8/10".
describe.each(['hr-std-vermenigvuldigen', 'hr-std-delen'])('%s natural × / : breuk under a mask', (typeId) => {
    const run = (mask: Record<string, boolean>) => {
        const out: number[] = [];
        for (let s = 0; s < 40; s++) {
            const block = makeBlock(typeId, { constraints: { numberType: 'rational', fractionMultMode: 'natural_fraction', fractionOrderMode: 'AB', maxGetal: 1000, operand1Mask: mask }, block: { numberOfExercises: 5 } });
            out.push(...(generateFor(block) as Equation[]).map(e => e.operands[0] as number));
        }
        return out;
    };
    test('{M, E} at max 1 000: the M is ignored, the max holds', () => {
        const ops = run({ M: true, E: true });
        expect(ops.length).toBeGreaterThan(0);
        for (const v of ops) expect(v).toBeLessThanOrEqual(1000);
    });
    test('{H, E} still shapes the number', () => {
        for (const v of run({ H: true, E: true })) {
            expect(v).toBeLessThanOrEqual(1000);
            expect(Math.floor(v / 100) % 10).toBeGreaterThan(0);
            expect(Math.floor(v / 10) % 10).toBe(0);
            expect(v % 10).toBeGreaterThan(0);
        }
    });
});
