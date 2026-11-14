import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { BREUK_KINDS } from '../oefenen/spelen/content/breuken/breukGeometry';
import {
    breukDenominators, breukDistractors, breukPairs, breukPool, breukQuestion, breukRound, kindFor, sameValue,
    type Breuk, type BreukDirection,
} from '../oefenen/spelen/content/breuken/breukQuestions';

const LEERJAREN = [2, 3, 4];
const DIRECTIONS: BreukDirection[] = ['picture-to-text', 'text-to-picture'];

describe('breuken per leerjaar', () => {
    it('follows the breuken-herkennen cards: L2 to vierden, L3 to tienden, L4 to twaalfden', () => {
        expect(breukDenominators(2)).toEqual([2, 3, 4]);
        expect(breukDenominators(3)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(breukDenominators(4)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        // Below and above clamp to the nearest leerjaar.
        expect(breukDenominators(1)).toEqual(breukDenominators(2));
        expect(breukDenominators(6)).toEqual(breukDenominators(4));
    });

    it('the pool holds every proper breuk of those noemers', () => {
        expect(breukPool(2).map(b => `${b.n}/${b.d}`)).toEqual(['1/2', '1/3', '2/3', '1/4', '2/4', '3/4']);
        expect(breukPool(3)).toHaveLength(45);
        expect(breukPool(4)).toHaveLength(66);
    });

    it('questions stay inside their leerjaar', () => {
        for (const lj of LEERJAREN) {
            const max = Math.max(...breukDenominators(lj));
            for (let seed = 0; seed < 300; seed++) {
                const q = breukQuestion(lj, seed);
                expect(q.prompt.d).toBeLessThanOrEqual(max);
                expect(q.prompt.n).toBeGreaterThanOrEqual(1);
                expect(q.prompt.n).toBeLessThan(q.prompt.d);
            }
        }
    });
});

describe('distractors', () => {
    it('never the answer or an equal breuk, never two equal options, always the right count', () => {
        for (const lj of LEERJAREN) for (const direction of DIRECTIONS) for (const count of [1, 2, 3, 5]) {
            for (const answer of breukPool(lj)) {
                const wrong = breukDistractors(answer, lj, mulberry32(answer.n * 31 + answer.d), count, direction);
                expect(wrong).toHaveLength(count);
                const all = [answer, ...wrong];
                for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(sameValue(all[i], all[j])).toBe(false);
            }
        }
    });

    it('every option is a drawable proper breuk, as picture and as text (no swapped 8/3)', () => {
        for (const lj of LEERJAREN) for (const answer of breukPool(lj)) {
            for (const b of breukDistractors(answer, lj, mulberry32(7), 3, 'text-to-picture')) {
                expect(b.n >= 1 && b.n < b.d && b.d >= 2 && b.d <= 12).toBe(true);
            }
            for (const b of breukDistractors(answer, lj, mulberry32(7), 3, 'picture-to-text')) {
                expect(b.n >= 1 && b.n < b.d).toBe(true);
            }
        }
    });

    it('uses the typical slips first', () => {
        const ids = (bs: Breuk[]) => bs.map(b => `${b.n}/${b.d}`).sort();
        // 3/8 as text: the white parts 5/8, another noemer 3/x, one off 2/8 or 4/8; never the swap 8/3.
        const t = ids(breukDistractors({ n: 3, d: 8 }, 4, mulberry32(1), 3, 'picture-to-text'));
        expect(t).not.toContain('8/3');
        expect(t).toContain('5/8');
        // The same as pictures.
        const p = ids(breukDistractors({ n: 3, d: 8 }, 4, mulberry32(1), 3, 'text-to-picture'));
        expect(p).not.toContain('8/3');
        expect(p).toContain('5/8');
        expect(p.some(x => /^3\/(6|7|9|10)$/.test(x))).toBe(true);
        // 1/4 at L2: 3/4 (the white parts) and 1/3 or 1/2 (same teller).
        const l2 = ids(breukDistractors({ n: 1, d: 4 }, 2, mulberry32(3), 3, 'text-to-picture'));
        expect(l2).toContain('3/4');
        expect(l2.some(x => x === '1/3' || x === '1/2')).toBe(true);
        // 1/2 at L2 never shows 2/4 (two right answers).
        for (let s = 0; s < 50; s++) for (const dir of DIRECTIONS) {
            expect(ids(breukDistractors({ n: 1, d: 2 }, 2, mulberry32(s), 3, dir))).not.toContain('2/4');
        }
    });
});

describe('questions', () => {
    it('the answer index points at the prompt, every option has the prompt\'s kind, unique and non-equivalent', () => {
        for (const lj of LEERJAREN) for (let seed = 0; seed < 400; seed++) {
            const q = breukQuestion(lj, seed);
            expect(q.options).toHaveLength(4);
            const a = q.options[q.answer];
            expect(a.n).toBe(q.prompt.n);
            expect(a.d).toBe(q.prompt.d);
            expect(a.text).toBe(`${a.n}/${a.d}`);
            expect(q.options.every(o => o.kind === q.prompt.kind)).toBe(true);
            expect(new Set(q.options.map(o => o.text)).size).toBe(4);
            q.options.forEach((o, i) => { if (i !== q.answer) expect(sameValue(o, q.prompt)).toBe(false); });
        }
    });

    it('is seeded: the same seed gives the same question, another seed may differ', () => {
        for (const lj of LEERJAREN) for (let seed = 0; seed < 50; seed++) {
            expect(breukQuestion(lj, seed)).toEqual(breukQuestion(lj, seed));
        }
        expect(breukRound(4, 99, 10)).toEqual(breukRound(4, 99, 10));
        expect(breukPairs(3, 5, 6)).toEqual(breukPairs(3, 5, 6));
        const keys = new Set(Array.from({ length: 40 }, (_, s) => breukQuestion(4, s).key));
        expect(keys.size).toBeGreaterThan(20);
    });

    it('honours the options: kind, direction, choice count', () => {
        const q = breukQuestion(3, 12, { kind: 'reep', direction: 'text-to-picture', choiceCount: 3 });
        expect(q.prompt.kind).toBe('reep');
        expect(q.direction).toBe('text-to-picture');
        expect(q.options).toHaveLength(3);
    });

    it('kindFor rotates every kind, so a round mixes pizzas, cakes and bars', () => {
        expect(Array.from({ length: 5 }, (_, i) => kindFor(i))).toEqual([...BREUK_KINDS]);
        expect(kindFor(5)).toBe(kindFor(0));
        expect(kindFor(-1)).toBe(BREUK_KINDS[4]);
        const round = breukRound(2, 7, 10);
        expect(new Set(round.map(q => q.prompt.kind)).size).toBe(5);
        expect(new Set(round.map(q => q.direction)).size).toBe(2);
        for (let i = 1; i < round.length; i++) expect(round[i].prompt.text).not.toBe(round[i - 1].prompt.text);
    });

    it('memory pairs have different values', () => {
        for (const lj of LEERJAREN) for (let s = 0; s < 30; s++) {
            const pairs = breukPairs(lj, s, 5);
            expect(pairs).toHaveLength(5);
            for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) expect(sameValue(pairs[i], pairs[j])).toBe(false);
        }
    });
});
