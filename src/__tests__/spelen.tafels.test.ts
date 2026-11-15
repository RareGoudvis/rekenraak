import { describe, test, expect } from 'vitest';
import { distractors, mulberry32, type SumFacts } from '../oefenen/spelen/distractors';
import { choiceCanPlay, spelContentOf, SPEL_LEAVES } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS } from '../oefenen/spelen/skins/registry';
import type { ZelfChoice } from '../oefenen/zelf/zelfSessie';
import type { CardVariant } from '../config/eenvoudig/cards';

// Owner 2026-11-14: the maal- en deeltafels join the games (leerjaar 1–3); deling met rest stays out (two answers).

const variant = (leafId: string, ov: Record<string, unknown> = {}): CardVariant =>
    ({ id: `v-${leafId}`, l: 'x', lj: 2, leafId, ov, count: null, label: 'x' }) as unknown as CardVariant;
const choice = (...vars: CardVariant[]): ZelfChoice => ({ key: 'k', label: 'k', vars });

describe('tafels in Spelen', () => {
    test('maal- and deeltafels leaves are playable at leerjaar 1–6, met rest is not', () => {
        expect(SPEL_LEAVES['hr-std-vermenigvuldigen-nat']).toBe('x');
        expect(SPEL_LEAVES['hr-std-delen-nat']).toBe(':');
        expect(choiceCanPlay(choice(variant('hr-std-vermenigvuldigen-nat')), 2)).toBe(true);
        expect(choiceCanPlay(choice(variant('hr-std-delen-nat')), 3)).toBe(true);
        expect(choiceCanPlay(choice(variant('hr-std-delen-nat', { multiplicationMode: 'met_rest' })), 3)).toBe(false);
        // Owner 2026-11-15: + − × : reach leerjaar 6 (they stopped at 3 and 4 before).
        expect(choiceCanPlay(choice(variant('hr-std-vermenigvuldigen-nat')), 4)).toBe(true);
        expect(choiceCanPlay(choice(variant('hr-std-vermenigvuldigen-nat')), 6)).toBe(true);
        expect(choiceCanPlay(choice(variant('hr-std-optellen-nat')), 5)).toBe(true);
        expect(choiceCanPlay(choice(variant('hr-std-optellen-nat'), variant('hr-std-delen-nat')), 6)).toBe(true);
    });

    test('× distractors: a neighbouring row of the tafel, the sum, ±1; never the answer, unique, not negative', () => {
        for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++) {
            const f: SumFacts = { answer: x * y, operands: [x, y], op: 'x' };
            for (const seed of [1, 7, 42]) {
                const d = distractors(f, mulberry32(seed));
                expect(d).toHaveLength(3);
                expect(new Set(d).size).toBe(3);
                expect(d).not.toContain(x * y);
                expect(d.every(v => v >= 0)).toBe(true);
            }
        }
        // 7 × 8: at least one option is a neighbouring row (7 × 7, 7 × 9, 6 × 8, 8 × 8).
        const near = new Set([49, 63, 48, 64]);
        expect(distractors({ answer: 56, operands: [7, 8], op: 'x' }, mulberry32(3)).some(v => near.has(v))).toBe(true);
    });

    test(': distractors: one jump off or the deler; never the answer', () => {
        for (let y = 2; y <= 10; y++) for (let q = 1; q <= 10; q++) {
            const f: SumFacts = { answer: q, operands: [q * y, y], op: ':' };
            const d = distractors(f, mulberry32(q * 31 + y));
            expect(new Set(d).size).toBe(3);
            expect(d).not.toContain(q);
            expect(d.every(v => v >= 0)).toBe(true);
        }
    });

    test('tafel content hides Honingraat (+ / − only), + content keeps it', () => {
        const ids = (c: ZelfChoice, g: number) => skinsFor(SKINS, spelContentOf(c, g)!).map(s => s.meta.id);
        expect(ids(choice(variant('hr-std-vermenigvuldigen-nat')), 2)).not.toContain('honingraat');
        expect(ids(choice(variant('hr-std-optellen-nat')), 2)).toContain('honingraat');
    });
});
