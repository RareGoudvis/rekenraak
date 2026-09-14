import { describe, test, expect } from 'vitest';
import { itemLabel, itemLabelChars } from '../components/viewer/itemNumbering';

describe('itemLabel', () => {
    test('cijfer counts from 1', () => {
        expect(itemLabel('cijfer', 0)).toBe('1)');
        expect(itemLabel('cijfer', 9)).toBe('10)');
    });

    // A block can hold more than 26 exercises, so the letters have to keep going.
    test('letter runs a) … z) then aa), ab)', () => {
        expect(itemLabel('letter', 0)).toBe('a)');
        expect(itemLabel('letter', 25)).toBe('z)');
        expect(itemLabel('letter', 26)).toBe('aa)');
        expect(itemLabel('letter', 27)).toBe('ab)');
    });

    test('off (geen / absent) renders nothing', () => {
        expect(itemLabel('geen', 0)).toBeNull();
        expect(itemLabel(undefined, 3)).toBeNull();
    });
});

describe('itemLabelChars', () => {
    test('is the longest label in the block, so every row shares one column', () => {
        expect(itemLabelChars('cijfer', 9)).toBe(2);    // '9)'
        expect(itemLabelChars('cijfer', 10)).toBe(3);   // '10)'
        expect(itemLabelChars('letter', 26)).toBe(2);   // 'z)'
        expect(itemLabelChars('letter', 27)).toBe(3);   // 'aa)'
    });

    test('is 0 when numbering is off or the block is empty', () => {
        expect(itemLabelChars('geen', 10)).toBe(0);
        expect(itemLabelChars(undefined, 10)).toBe(0);
        expect(itemLabelChars('cijfer', 0)).toBe(0);
    });
});
