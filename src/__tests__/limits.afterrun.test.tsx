// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { mulberry32 } from './helpers/limitHarness';
import { makeBlock, generateFor } from './helpers/makeBlock';
import SchattendViewer from '../components/viewer/SchattendViewer';
import type { MathBlock } from '../services/math/types';

// Limit after-run 2026-10-08, [P1]-[P5] in BUGS.md: small leftovers of the limit-fix campaign.

afterEach(cleanup);

const seeded = <T,>(seed: number, f: () => T): T => {
    const real = Math.random;
    Math.random = mulberry32(seed);
    try { return f(); } finally { Math.random = real; }
};

describe('P1 schattend key keeps the target decimals', () => {
    test.each(['+', '-', 'x', ':'] as const)('schattend-dec target t, operator %s, prints at most one decimal', (op) => {
        for (let seed = 1; seed <= 60; seed++) {
            const block = makeBlock('schattend', {
                leafId: 'schattend-dec',
                constraints: { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['t'], operators: [op] },
            });
            const items = seeded(seed, () => generateFor(block));
            const filled = { ...block, schattendExercises: items } as MathBlock;
            const { container } = render(<SchattendViewer block={filled} showSolutions />);
            const text = container.textContent ?? '';
            // Every number on the row: the exercise has two decimals, but the rounded operands and the estimate have one.
            const tooLong = (text.match(/\d+,\d{3,}/g) ?? []);
            expect(tooLong, `seed ${seed}: ${text}`).toEqual([]);
            cleanup();
        }
    });
});
