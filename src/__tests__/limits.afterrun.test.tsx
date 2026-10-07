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
    test('cijferen x impossible mask: the fallback varies within the max and stays noted', () => {
        const max = 100;
        const { items, note } = noted('cijferen-vermenigvuldigen-nat', { operator: 'x', numberType: 'natural', maxRange: max, operand1Mask: { T: true } }, 8);
        const exs = items as CijferExercise[];
        expect(note).toMatch(/^Alle oefeningen passen niet bij de gekozen getalopbouw/);
        expect(new Set(exs.map(e => e.operands.join('x'))).size).toBeGreaterThan(1);
        for (const e of exs) {
            expect(e.answer).toBeLessThanOrEqual(max);
            expect(e.operands[0] * e.operands[1]).toBe(e.answer);
        }
        expect(repeatCount(note)).toBe(dupes(exs) > 0 ? 1 : 0);
    });
    test('cijferen x fallback with room for only one exercise notes the repeats', () => {
        const { items, note } = noted('cijferen-vermenigvuldigen-nat', { operator: 'x', numberType: 'natural', maxRange: 3, operand1Mask: { T: true } }, 4);
        expect(dupes(items)).toBe(3);
        expect(note).toMatch(/Kleine reeks: 3 oefeningen komen dubbel voor\.$/);
    });
    test('cijferen x decimal fallback varies too', () => {
        const { items } = noted('cijferen-vermenigvuldigen-dec', { operator: 'x', numberType: 'decimal', maxRange: 20, decimalPlaces: 2, operand1Mask: { HD: true } }, 6);
        const exs = items as CijferExercise[];
        expect(new Set(exs.map(e => e.operands.join('x'))).size).toBeGreaterThan(1);
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
