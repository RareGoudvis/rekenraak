import { describe, test, expect } from 'vitest';
import { formatTimeText } from '../services/clock/clockTypes';

// Flemish school convention for the written time: up to 20 minutes counts from the hour,
// 21-29 counts to the half, 31-39 from the half, from 40 on to the next hour.
describe('formatTimeText: voor half / over half', () => {
    test.each<[number, number, string]>([
        [3, 0, '3 uur'],
        [3, 5, '5 over 3'],
        [3, 10, '10 over 3'],
        [3, 15, 'kwart over 3'],
        [3, 20, '20 over 3'],
        [1, 25, '5 voor half 2'],
        [1, 21, '9 voor half 2'],
        [1, 29, '1 voor half 2'],
        [3, 30, 'half 4'],
        [1, 35, '5 over half 2'],
        [1, 31, '1 over half 2'],
        [1, 39, '9 over half 2'],
        [3, 40, '20 voor 4'],
        [3, 45, 'kwart voor 4'],
        [3, 55, '5 voor 4'],
        [12, 25, '5 voor half 1'],
        [12, 35, '5 over half 1'],
        [12, 50, '10 voor 1'],
    ])('12h %i:%i → %s', (h, m, text) => {
        expect(formatTimeText(h, m, false)).toBe(text);
    });

    test.each<[number, number, string]>([
        [20, 31, '1 over half 21'],
        [20, 25, '5 voor half 21'],
        [23, 30, 'half 24'],
        [23, 35, '5 over half 24'],
        [23, 50, '10 voor 24'],
        // Midnight in 24-hour text is 24, like "half 24" for 23:30: never "5 over 0".
        [0, 5, '5 over 24'],
        [0, 0, '24 uur'],
        [0, 25, '5 voor half 1'],
        [13, 15, 'kwart over 13'],
    ])('24h %i:%i → %s', (h, m, text) => {
        expect(formatTimeText(h, m, true)).toBe(text);
    });

    test('every minute of every hour reads without a 0 hour or a negative count', () => {
        for (const is24 of [false, true]) {
            for (let h = is24 ? 0 : 1; h < (is24 ? 24 : 13); h++) {
                for (let m = 0; m < 60; m++) {
                    const text = formatTimeText(h, m, is24);
                    expect(text, `${h}:${m}`).not.toMatch(/(^|\s)0(\s|$)|-|undefined|NaN/);
                    expect(text, `${h}:${m}`).not.toMatch(/(^|\s)(2[1-9]|3\d) (over|voor)/);
                }
            }
        }
    });
});
