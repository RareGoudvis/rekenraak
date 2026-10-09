// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { bool, color, custom, num, numList, oneOf, readProps, cleanProps, strList, text, boolList } from '../board/settings/propSchema';
import { resetProps, TRANSIENT_PROP_KEYS } from '../board/settings/widgetDefaults';

// The typed props schema behind the widget settings: every field reads its default when the
// stored value is missing or junk, and the load-time clean-up drops junk without touching
// keys the schema doesn't own.
afterEach(() => localStorage.clear());

const SCHEMA = {
    n: num(5, 1, 10, true),
    f: num(0.5, 0, 1),
    b: bool(true),
    mode: oneOf('a', ['a', 'b'] as const),
    t: text('hoi', 5),
    c: color('#123456'),
    list: numList([1], 0, 9, 3),
    names: strList([], 2),
    flags: boolList(3),
    pair: custom<[number, number]>([0, 0], (v) => (Array.isArray(v) && v.length === 2 ? v as [number, number] : undefined)),
};

describe('readProps', () => {
    test('no props = every default', () => {
        expect(readProps(SCHEMA, undefined)).toEqual({ n: 5, f: 0.5, b: true, mode: 'a', t: 'hoi', c: '#123456', list: [1], names: [], flags: [], pair: [0, 0] });
    });

    test('good values pass, clamped and rounded where the field says so', () => {
        expect(readProps(SCHEMA, { n: 99, f: -1, b: false, mode: 'b', t: 'abcdefgh', c: '#abc', list: [3, 'x', 12, 4, 5], names: ['a', 2, 'b', 'c'], flags: [true, 1, true, true], pair: [1, 2] }))
            .toEqual({ n: 10, f: 0, b: false, mode: 'b', t: 'abcde', c: '#abc', list: [3, 9, 4], names: ['a', 'b'], flags: [true, false, true], pair: [1, 2] });
        // A numeric string from an early text input still counts.
        expect(readProps(SCHEMA, { n: '7.4' }).n).toBe(7);
    });

    test('junk values fall back per field', () => {
        expect(readProps(SCHEMA, { n: 'veel', f: NaN, b: 'ja', mode: 'c', t: 5, c: 'rood', list: 'x', names: {}, flags: null, pair: [1] }))
            .toEqual(readProps(SCHEMA, {}));
    });

    test("an empty colour means 'not set' and is kept", () => {
        expect(readProps(SCHEMA, { c: '' }).c).toBe('');
    });
});

describe('cleanProps', () => {
    test('drops junk owned keys, keeps good ones and every foreign key', () => {
        expect(cleanProps(SCHEMA, { n: 'veel', mode: 'b', title: 'T', showHeader: false, accent: '#111111' }))
            .toEqual({ mode: 'b', title: 'T', showHeader: false, accent: '#111111' });
    });
});

describe('Standaard herstellen keeps the card content', () => {
    test('an image survives a reset; settings go back to the factory look', () => {
        expect(resetProps('afbeelding', { src: 'data:x', title: 'T' })).toEqual({ src: 'data:x' });
    });

    test('per-instance state never becomes a saved standaard', () => {
        for (const k of ['laps', 'values', 'history', 'level', 'calibrateAt', 'locked']) expect(TRANSIENT_PROP_KEYS).toContain(k);
    });
});
