import { describe, test, expect } from 'vitest';
import { BIG_NUMBERS_ENABLED, NAT_CEILING, NAT_STEPS, RANGES, floorToPreset, presetLabel } from '../config/numberRanges';

const LIST = [10, 20, 100, 1000, 10000, 100000, 1000000];

describe('floorToPreset', () => {
    test.each<[string, number, number]>([
        ['below the lowest', 5, 10],
        ['zero', 0, 10],
        ['negative', -300, 10],
        ['exact lowest', 10, 10],
        ['between two presets', 50_000, 10_000],
        ['just under a preset', 999, 100],
        ['exact middle preset', 1000, 1000],
        ['exact top', 1_000_000, 1_000_000],
        ['above the top', 5_000_000, 1_000_000],
        ['old leerjaar-6 seed', 1e10, 1_000_000],
        ['NaN', Number.NaN, 10],
        ['Infinity', Number.POSITIVE_INFINITY, 10],
        ['-Infinity', Number.NEGATIVE_INFINITY, 10],
    ])('%s', (_name, v, want) => {
        expect(floorToPreset(v, LIST)).toBe(want);
    });

    test('unsorted presets floor the same as sorted ones', () => {
        expect(floorToPreset(50_000, [1_000_000, 10, 10_000, 100])).toBe(10_000);
    });

    test('an empty list returns the value untouched', () => {
        expect(floorToPreset(1234, [])).toBe(1234);
    });
});

describe('the lists', () => {
    test('the ceiling is the top natural step and stays exact in scaled integers', () => {
        expect(NAT_STEPS[NAT_STEPS.length - 1]).toBe(NAT_CEILING);
        // Engine scales by 1e6 (INTERNAL_SCALE); the product must stay a safe integer.
        expect(Number.isSafeInteger(NAT_CEILING * 1_000_000)).toBe(true);
    });

    // Flag off, every picker must render exactly what it rendered before the refactor.
    test.runIf(!BIG_NUMBERS_ENABLED)('flag off: the growing lists equal the legacy literals', () => {
        expect(RANGES.base()).toEqual(LIST);
        expect(RANGES.hrNatural()).toEqual(LIST);
        expect(RANGES.hrAndere()).toEqual([1000, 10000, 100000, 1000000]);
        expect(RANGES.cijferNatural()).toEqual([20, 100, 1000, 10000, 100000, 1000000, 1000000000]);
        expect(RANGES.afrondenNatural()).toEqual([100, 1000, 10000, 100000, 1000000]);
        expect(RANGES.plaatswaarde()).toEqual([100, 1000, 10000, 100000, 1000000]);
        expect(RANGES.vergelijken()).toEqual([100, 1000, 10000, 100000, 1000000]);
        expect(RANGES.splitsenTabel()).toEqual(LIST);
        expect(RANGES.splitsenPositie()).toEqual([...LIST, 1000000000]);
    });

    test('capped lists keep their own values, forced or not', () => {
        const fixed: Array<[keyof typeof RANGES, number[]]> = [
            ['hrTienvoud', [100, 1000, 10000]],
            ['decimal', [10, 100, 1000]],
            ['cijferDecimal', [20, 100, 1000, 10000, 100000, 1000000, 1000000000]],
            ['vergelijkenRepresentaties', [10, 100, 1000]],
            ['splitsenBasis', LIST],
            ['splitsenBoom', [10, 20, 100, 1000]],
            ['splitsenHarten', [10, 20, 100]],
            ['deelbaarheid', [100, 1000, 10000, 100000]],
            ['deelbaarheidKleurStrook', [20, 100, 1000]],
            ['deelbaarheidKleurRaster', [100, 1000]],
            ['getallenas', [20, 100, 1000, 10000, 100000]],
            ['getallenrijen', [20, 100, 1000, 10000, 100000]],
            ['patronen', [20, 100, 1000, 10000, 100000]],
            ['ordenen', [20, 100, 1000, 10000, 100000]],
            ['schattendNatural', [100, 1000, 10000, 100000]],
            ['evenOneven', [20, 100, 1000, 10000]],
            ['procenten', [100, 1000, 10000]],
            ['controleren', [1000, 10000]],
            ['geld', [10, 20, 100, 1000]],
            ['geldRekenen', [100, 1000, 10000]],
            ['mab', [10, 20, 100, 1000]],
            ['ketting', [20, 100, 1000]],
            ['rekenvolgorde', [100, 1000]],
            ['herleidingenSamengesteld', [10, 100, 1000, 10000, 100000, 1000000]],
        ];
        for (const [name, want] of fixed) {
            expect(RANGES[name](), name).toEqual(want);
            expect(RANGES[name](true), `${name} forced`).toEqual(want);
        }
    });

    test('forced, the growing lists end in 1e7 / 1e8 / 1e9, sorted and without duplicates', () => {
        const growing: Array<keyof typeof RANGES> = ['base', 'hrNatural', 'hrAndere', 'cijferNatural', 'afrondenNatural', 'plaatswaarde', 'vergelijken', 'splitsenTabel', 'splitsenPositie'];
        for (const name of growing) {
            const list = RANGES[name](true);
            expect(list.slice(-4), name).toEqual([1_000_000, 10_000_000, 100_000_000, 1_000_000_000]);
            expect([...list].sort((a, b) => a - b), name).toEqual(list);
            expect(new Set(list).size, name).toBe(list.length);
        }
    });

    test('presetLabel uses the Flemish thousands separator', () => {
        expect(presetLabel(1_000_000)).toBe(`Tot ${(1_000_000).toLocaleString('nl-BE')}`);
        expect(presetLabel(20)).toBe('Tot 20');
    });
});
