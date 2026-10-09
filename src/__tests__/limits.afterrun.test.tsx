// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { mulberry32 } from './helpers/limitHarness';
import { makeBlock, generateFor } from './helpers/makeBlock';
import SchattendViewer from '../components/viewer/SchattendViewer';
import type { MathBlock } from '../services/math/types';
import { REGISTRY } from '../config/exerciseRegistry';
import { generateForBlock } from '../services/generateDispatch';
import type { CijferExercise } from '../services/math/types';

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

const dupes = (items: unknown[]) => items.length - new Set(items.map(ex => JSON.stringify({ ...(ex as object), id: undefined }))).size;
const repeatCount = (note: string | null) => (note?.match(/Kleine reeks/g) ?? []).length;

describe('P3 forced identical fills say so', () => {
    test('kettingsommen only x at max 20: one chain, repeats noted', () => {
        const { items, note } = noted('kettingsommen', { ops: ['x'], maxGetal: 20 }, 6);
        expect(items).toHaveLength(6);
        expect(dupes(items)).toBe(5);
        expect(note).toBe('Kleine reeks: 5 oefeningen komen dubbel voor.');
    });
    // No fallback since 2026-10-09 (owner): an impossible getalopbouw leaves the block empty, noted, never repeated stand-ins.
    test('cijferen x impossible mask: no stand-in exercises, the note says so', () => {
        const { items, note } = noted('cijferen-vermenigvuldigen-nat', { operator: 'x', numberType: 'natural', maxRange: 100, operand1Mask: { T: true } }, 8);
        expect(items).toEqual([]);
        expect(note).toMatch(/^Geen oefeningen mogelijk met deze instellingen tot 100: kies een andere getalopbouw\.$/);
        expect(repeatCount(note)).toBe(0);
    });
    test('cijferen x decimal: a getalopbouw key above the max is not shown, so it is ignored', () => {
        const { items, note } = noted('cijferen-vermenigvuldigen-dec', { operator: 'x', numberType: 'decimal', maxRange: 20, decimalPlaces: 2, operand1Mask: { HD: true } }, 6);
        const exs = items as CijferExercise[];
        expect(exs).toHaveLength(6);
        expect(note).toBeNull();
        for (const e of exs) expect(e.answer).toBeLessThanOrEqual(20);
    });
    test('getallenrijen teller max 1: identical rows, both notes', () => {
        const { items, note } = noted('getallenrijen', { numberType: 'rational', fractionStep: 4, ticks: 6, maxTeller: 1, direction: 'right' }, 5);
        expect(dupes(items)).toBe(4);
        expect(note).toBe('Hoogste teller 1 bij noemer 4: 2 vakjes i.p.v. 6. Kleine reeks: 4 oefeningen komen dubbel voor.');
    });
    test('dispatch with Geen dubbele oefeningen reports the repeats once', () => {
        const block = makeBlock('kettingsommen', { constraints: { ops: ['x'], maxGetal: 20 }, block: { numberOfExercises: 6 } });
        const { note } = seeded(1, () => generateForBlock(block, true));
        expect(note).toBe('Kleine reeks: 5 oefeningen komen dubbel voor.');
    });
});

describe('P4 met rest level clip honours Maximum per getal', () => {
    const METREST = { numberType: 'natural', multiplicationMode: 'met_rest' } as const;
    test('N2 with deeltal max 20 falls back to N1 with the level note', () => {
        const { items, note } = noted('hr-std-delen', { ...METREST, metRestLevel: 2, maxGetal: 100, operandMax: [20, null] }, 10);
        expect(items).toHaveLength(10);
        for (const ex of items as { operands: number[]; answer: number; remainder: number }[]) {
            expect(ex.operands[0]).toBeLessThanOrEqual(20);
            expect(ex.answer).toBeLessThanOrEqual(9);
            expect(ex.remainder).toBeGreaterThan(0);
        }
        expect(note).toMatch(/^Niveau N2 past niet onder het maximum 20: oefeningen op niveau N1\./);
    });
    test('N3 with a deeltal max that still holds three digits keeps N3', () => {
        const { items, note } = noted('hr-std-delen', { ...METREST, metRestLevel: 3, maxGetal: 1000, operandMax: [150, null] }, 10);
        expect(items).toHaveLength(10);
        for (const ex of items as { operands: number[] }[]) expect(ex.operands[0]).toBeGreaterThanOrEqual(100);
        expect(note ?? '').not.toMatch(/Niveau/);
    });
});

describe('P5 the kommagetal of Kommagetal x/: Breuk is never whole', () => {
    const RAT = { numberType: 'rational', fractionMultMode: 'decimal_fraction', fractionOrderMode: 'beide' } as const;
    test.each([
        ['hr-std-vermenigvuldigen', 1, 1000, {}],
        ['hr-std-vermenigvuldigen', 2, 100, {}],
        ['hr-std-vermenigvuldigen', 3, 10, {}],
        ['hr-std-vermenigvuldigen', 2, 1000, { E: true, T: true }],
        ['hr-std-delen', 1, 100, {}],
        ['hr-std-delen', 2, 1000, { H: true }],
    ] as const)('%s dp %i max %i mask %j', (typeId, dp, max, mask) => {
        for (let seed = 1; seed <= 30; seed++) {
            const block = makeBlock(typeId, { constraints: { ...RAT, decimalPlaces: dp, maxGetal: max, operand1Mask: mask }, block: { numberOfExercises: 20 } });
            const items = seeded(seed, () => generateFor(block)) as { operands: unknown[] }[];
            expect(items.length).toBeGreaterThan(0);
            for (const ex of items) {
                const dec = ex.operands.find(o => typeof o === 'number') as number;
                const units = Math.round(dec * 10 ** dp);
                expect(units % 10 ** dp, `seed ${seed}: ${dec}`).not.toBe(0);
                expect(units).toBeGreaterThan(0);
                if (!Object.keys(mask).length) expect(dec).toBeLessThanOrEqual(max);
            }
        }
    });
});
