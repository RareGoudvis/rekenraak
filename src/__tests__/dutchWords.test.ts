import { describe, test, expect } from 'vitest';
import { numberToDutchWords } from '../services/splitsen/dutchWords';

// Taken from Geert's fork; our spelling puts a space after "duizend" (Taalunie), so the
// long case reads "…zesenvijftigduizend zevenhonderd…".
describe('numberToDutchWords', () => {
    test.each([
        [0, 'nul'],
        [19, 'negentien'],
        [23, 'drieëntwintig'],
        [456, 'vierhonderdzesenvijftig'],
        [1000, 'duizend'],
        [2000, 'tweeduizend'],
        [1000000, 'een miljoen'],
        [2000000, 'twee miljoen'],
        [10000000, 'tien miljoen'],
        [100000000, 'honderd miljoen'],
        [1000000000, 'een miljard'],
        [3000000000, 'drie miljard'],
        [123456789, 'honderddrieëntwintig miljoen vierhonderdzesenvijftigduizend zevenhonderdnegenentachtig'],
    ])('%d -> %s', (n, expected) => {
        expect(numberToDutchWords(n)).toBe(expected);
    });

    test('decimals still read "komma <digit> <digit>…" on top of the extended integer part', () => {
        expect(numberToDutchWords(10_000_000.5)).toBe('tien miljoen komma vijf');
    });
});
