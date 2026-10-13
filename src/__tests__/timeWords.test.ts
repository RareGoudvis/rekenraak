import { describe, test, expect } from 'vitest';
import { parseTimeWords, timeWords, timeWordsText, type TimeWordsParts } from '../services/clock/timeWords';

const w = (minute: string, word: string, hour: string): TimeWordsParts => ({ word, hour, minute });
const face = (h: number, m: number) => ((h % 12) * 60 + m) % 720;

describe('timeWords: the one wording per time in the four-word grammar', () => {
    test.each([
        [3, 0, '3 uur'], [3, 30, 'half 4'], [3, 15, 'kwart over 3'], [3, 45, 'kwart voor 4'],
        [3, 5, '5 over 3'], [3, 25, '25 over 3'], [3, 35, '25 voor 4'], [3, 55, '5 voor 4'],
        [3, 1, '1 over 3'], [3, 29, '29 over 3'], [3, 31, '29 voor 4'], [3, 59, '1 voor 4'],
        [12, 0, '12 uur'], [0, 0, '12 uur'], [11, 30, 'half 12'], [12, 30, 'half 1'], [12, 45, 'kwart voor 1'],
        [15, 15, 'kwart over 3'], [23, 30, 'half 12'], [0, 20, '20 over 12'],
    ])('%i:%i → %s', (h, m, text) => {
        expect(timeWordsText(timeWords(h, m))).toBe(text);
    });

    test('every minute of the face round-trips through parseTimeWords', () => {
        for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
            expect(parseTimeWords(timeWords(h, m)), `${h}:${m}`).toBe(face(h, m));
        }
    });

    test('a quarter is always the kwart key, never 15', () => {
        expect(timeWords(3, 15)).toEqual({ word: 'over', hour: '3', minute: 'kwart' });
        expect(timeWords(3, 45)).toEqual({ word: 'voor', hour: '4', minute: 'kwart' });
    });
});

describe('parseTimeWords: right wordings count by value, others are null', () => {
    test('right ones', () => {
        expect(parseTimeWords(w('kwart', 'over', '3'))).toBe(face(3, 15));
        expect(parseTimeWords(w('kwart', 'over', '15'))).toBe(face(3, 15));
        expect(parseTimeWords(w('25', 'voor', '4'))).toBe(face(3, 35));
        expect(parseTimeWords(w('', 'uur', '3'))).toBe(face(3, 0));
        expect(parseTimeWords(w('', 'uur', '12'))).toBe(0);
        expect(parseTimeWords(w('', 'uur', '0'))).toBe(0);
        expect(parseTimeWords(w('', 'half', '4'))).toBe(face(3, 30));
        expect(parseTimeWords(w('', 'half', '1'))).toBe(face(12, 30));
        expect(parseTimeWords(w('05', 'over', '03'))).toBe(face(3, 5));
        expect(parseTimeWords(w(' KWART ', 'voor', '4'))).toBe(face(3, 45));
    });

    test.each([
        ['15 over 3 (a quarter is kwart)', w('15', 'over', '3')],
        ['15 voor 4', w('15', 'voor', '4')],
        ['35 over 3 (that is 25 voor 4)', w('35', 'over', '3')],
        ['30 over 3 (that is half 4)', w('30', 'over', '3')],
        ['0 over 3', w('0', 'over', '3')],
        ['minutes with uur', w('5', 'uur', '3')],
        ['kwart with half', w('kwart', 'half', '4')],
        ['no minutes with over', w('', 'over', '3')],
        ['no hour', w('', 'uur', '')],
        ['hour 24', w('', 'uur', '24')],
        ['three digits', w('', 'uur', '100')],
        ['no word', w('5', '', '3')],
        ['voor half is not a word here', w('5', 'voor half', '4')],
        ['a decimal', w('2,5', 'over', '3')],
    ])('%s → null', (_name, parts) => {
        expect(parseTimeWords(parts)).toBeNull();
    });
});

describe('timeWordsText shows what the pupil built', () => {
    test('complete and partial wordings', () => {
        expect(timeWordsText(w('15', 'over', '3'))).toBe('15 over 3');
        expect(timeWordsText(w('', 'over', '3'))).toBe('over 3');
        expect(timeWordsText(w('', 'uur', ''))).toBe('uur');
    });
});
