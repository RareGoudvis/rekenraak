import { describe, expect, it } from 'vitest';
import { cardSpanFor } from '../components/eenvoudig/cardSpan';

describe('cardSpanFor', () => {
    it('keeps compact and single-line sums at single width', () => {
        expect(cardSpanFor(217, 22)).toBe(1);   // a hoofdrekenen sum
        expect(cardSpanFor(264, 38)).toBe(1);
        expect(cardSpanFor(280, 22)).toBe(1);
        expect(cardSpanFor(122, 23)).toBe(1);
    });
    it('keeps height-limited figures single even when large', () => {
        expect(cardSpanFor(282, 224)).toBe(1);
        expect(cardSpanFor(154, 137)).toBe(1);
    });
    it('doubles wide rows that would shrink below readable', () => {
        expect(cardSpanFor(688, 44)).toBe(2);   // getallenrij
        expect(cardSpanFor(528, 70)).toBe(2);   // getallenas
        expect(cardSpanFor(451, 34)).toBe(2);
    });
    it('is single for degenerate boxes', () => {
        expect(cardSpanFor(0, 10)).toBe(1);
        expect(cardSpanFor(10, 0)).toBe(1);
        expect(cardSpanFor(NaN, 10)).toBe(1);
    });
});
