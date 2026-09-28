import { describe, test, expect, afterEach } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { formatAmount } from '../services/geld/geldGenerator';
import type { GeldExercise } from '../services/math/types';

// The geld-herkennen key must be the money that is drawn: Σ coupures == amountCents, and the
// printed key (formatAmount) reads back to that same amount. Reference parsing is plain
// string work here, not the generator's own arithmetic.

function mulberry32(a: number) {
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// "€12" → 1200, "€12,05" → 1205; anything else fails the test.
function keyToCents(key: string): number {
    const m = /^€(\d+)(?:,(\d\d))?$/.exec(key);
    if (!m) throw new Error(`unreadable key "${key}"`);
    return parseInt(m[1], 10) * 100 + (m[2] ? parseInt(m[2], 10) : 0);
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

const ALL = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5];
const CASES: [string, Record<string, unknown>][] = [
    ['defaults (euros, all denominations)', {}],
    ['decimaal', { format: 'decimaal' }],
    ['euros, max 1000', { maxGetal: 1000 }],
    ['decimaal, max 1000', { format: 'decimaal', maxGetal: 1000 }],
    ['coins only, max 100', { format: 'decimaal', maxGetal: 100, allowedDenominations: [200, 100, 50, 20, 10, 5] }],
    ['cents only, decimaal', { format: 'decimaal', allowedDenominations: [50, 20, 10, 5] }],
    ['bills 5 + 2 euro only', { allowedDenominations: [500, 200], maxGetal: 50 }],
    ['all, max 10, decimaal', { format: 'decimaal', allowedDenominations: ALL }],
];

describe('geld-herkennen answer key keeps the cents', () => {
    for (const [name, constraints] of CASES) {
        test(name, () => {
            const format = (constraints.format as string) ?? 'euros';
            for (let seed = 1; seed <= 60; seed++) {
                Math.random = mulberry32(seed);
                const exs = generateFor(makeBlock('geld-herkennen', { constraints })) as GeldExercise[];
                expect(exs.length).toBeGreaterThan(0);
                for (const ex of exs) {
                    const drawn = ex.denominations.reduce((s, d) => s + d.valueCents * d.count, 0);
                    const items = ex.denominations.reduce((s, d) => s + d.count, 0);
                    const tag = `seed ${seed}: ${ex.amountCents}c`;
                    expect(drawn, `${tag} drawn`).toBe(ex.amountCents);
                    expect(items, `${tag} items`).toBeLessThanOrEqual(12);
                    expect(keyToCents(formatAmount(ex.amountCents, format)), `${tag} key`).toBe(ex.amountCents);
                    if (format === 'euros') expect(ex.amountCents % 100, `${tag} whole euros`).toBe(0);
                }
            }
        });
    }

    test('the 100 + 3 × 50c case reads €101,50, never €102', () => {
        expect(formatAmount(10150, 'euros')).toBe('€101,50');
        expect(formatAmount(10150, 'decimaal')).toBe('€101,50');
        expect(formatAmount(14700, 'euros')).toBe('€147');
        expect(formatAmount(5, 'decimaal')).toBe('€0,05');
    });

    test('geld-tekenen in euros format asks for whole euros', () => {
        for (let seed = 1; seed <= 30; seed++) {
            Math.random = mulberry32(seed);
            for (const ex of generateFor(makeBlock('geld-tekenen')) as GeldExercise[]) {
                expect(ex.amountCents % 100).toBe(0);
                expect(keyToCents(formatAmount(ex.amountCents, 'euros'))).toBe(ex.amountCents);
            }
        }
    });
});
