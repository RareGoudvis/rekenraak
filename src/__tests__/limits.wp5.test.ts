import { describe, it, expect } from 'vitest';
import type { MathBlock } from '../services/math/types';
import { generateRekenvolgordeNoted } from '../services/rekenvolgorde/rekenvolgordeGenerator';

const mk = (constraints: object, n: number): MathBlock => ({ constraints, numberOfExercises: n } as unknown as MathBlock);
const isMD = (t: unknown) => t === 'x' || t === ':';

describe('rekenvolgorde limits', () => {
    const OPSETS = [['+', '-'], ['+', '-', 'x'], ['+', '-', 'x', ':'], ['x'], [':'], ['x', ':'], ['+', 'x'], ['-', ':']];
    for (const maxGetal of [100, 1000]) for (const tableLimit of [10, 20])
        for (const operators of OPSETS) for (const opsCount of [2, 3, 4]) for (const haakjesMode of ['GEEN', 'MAG', 'MOET'])
            it(`${operators.join('')} ops${opsCount} ${haakjesMode} max${maxGetal} tl${tableLimit}`, () => {
                for (let seed = 0; seed < 3; seed++) {
                    const { items } = generateRekenvolgordeNoted(mk({ operators, opsCount, haakjesMode, maxGetal, tableLimit }, 10));
                    for (const ex of items) {
                        expect(ex.answer).toBeLessThanOrEqual(maxGetal);
                        expect(ex.answer).toBeGreaterThanOrEqual(0);
                        const tk = ex.tokens;
                        tk.forEach((t, i) => {
                            if (typeof t !== 'number') return;
                            let l = i - 1; while (l >= 0 && tk[l] === '(') l--;
                            let r = i + 1; while (r < tk.length && tk[r] === ')') r++;
                            const left = tk[l], right = tk[r];
                            if (!isMD(left) && !isMD(right)) return;
                            // A dividend opening a chain may be any exact multiple up to max; everything else is a table factor.
                            const dividend = right === ':' && !isMD(left);
                            expect(t).toBeLessThanOrEqual(dividend ? maxGetal : tableLimit);
                        });
                    }
                }
            });

    it('x-only + MOET fills the block without brackets and says so', () => {
        const { items, note } = generateRekenvolgordeNoted(mk({ operators: ['x'], opsCount: 2, haakjesMode: 'MOET', maxGetal: 100, tableLimit: 10 }, 8));
        expect(items.length).toBeGreaterThan(0);
        expect(items.every(e => !e.tokens.includes('('))).toBe(true);
        expect(note).toMatch(/Haakjes weggelaten/);
    });
    it('colon-only fills the block', () => {
        const { items } = generateRekenvolgordeNoted(mk({ operators: [':'], opsCount: 2, haakjesMode: 'GEEN', maxGetal: 100, tableLimit: 10 }, 8));
        expect(items.length).toBe(8);
    });
});
