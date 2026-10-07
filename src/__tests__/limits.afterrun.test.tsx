// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { mulberry32 } from './helpers/limitHarness';
import { makeBlock, generateFor } from './helpers/makeBlock';
import SchattendViewer from '../components/viewer/SchattendViewer';
import type { MathBlock } from '../services/math/types';
import { REGISTRY } from '../config/exerciseRegistry';

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

const noted = (typeId: string, constraints: Record<string, unknown>, count: number, seed = 1) => {
    const block = makeBlock(typeId, { constraints, block: { numberOfExercises: count } });
    return seeded(seed, () => REGISTRY[typeId].generateNoted!(block));
};

describe('P2 breuken-rangschikken shortfall note grammar', () => {
    test('one fraction per exercise is singular', () => {
        const { note } = noted('breuken-rangschikken', { fractionMode: 'gelijknamig-te-maken', minDenominator: 7, maxDenominator: 7, count: 4 }, 5);
        expect(note).toBe('Bij dit bereik van noemers past maar 1 breuk per oefening (gevraagd: 4).');
    });
    test('several fractions per exercise stay plural', () => {
        const { note } = noted('breuken-rangschikken', { fractionMode: 'stambreuken', minDenominator: 2, maxDenominator: 4, count: 4 }, 5);
        expect(note).toBe('Bij dit bereik van noemers passen maar 3 breuken per oefening (gevraagd: 4).');
    });
});
