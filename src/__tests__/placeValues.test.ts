import { describe, test, expect } from 'vitest';
import { PLACE_VALUES, getMaskPlaces, getBridgePlaces, digitAtPlace, buildMaskedNatural } from '../services/math/mathEngine';

const keys = (places: Array<{ key: string }>) => places.map((p) => p.key);

describe('PLACE_VALUES above the millions', () => {
    test('keys are unique and weights strictly descending', () => {
        expect(new Set(keys(PLACE_VALUES)).size).toBe(PLACE_VALUES.length);
        for (let i = 1; i < PLACE_VALUES.length; i++) expect(PLACE_VALUES[i].weight).toBeLessThan(PLACE_VALUES[i - 1].weight);
    });

    // A sheet at today's sizes must see exactly the places it saw before Mrd/HM/TM existed.
    test.each<[number, string[], string[]]>([
        [1000, ['D', 'H', 'T', 'E'], ['H', 'T', 'E']],
        [100, ['H', 'T', 'E'], ['T', 'E']],
        [1_000_000, ['M', 'HD', 'TD', 'D', 'H', 'T', 'E'], ['HD', 'TD', 'D', 'H', 'T', 'E']],
    ])('max %d: mask and bridge places unchanged', (max, mask, bridge) => {
        expect(keys(getMaskPlaces(max))).toEqual(mask);
        expect(keys(getBridgePlaces(max))).toEqual(bridge);
    });

    test('max 1e9 reaches Mrd … E', () => {
        expect(keys(getMaskPlaces(1e9))).toEqual(['Mrd', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E']);
        expect(keys(getBridgePlaces(1e9))).toEqual(['HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E']);
    });

    test('the plaats answers read as plural place names', () => {
        const byKey = Object.fromEntries(PLACE_VALUES.map((p) => [p.key, p.label.toLowerCase()]));
        expect(byKey.Mrd).toBe('miljarden');
        expect(byKey.HM).toBe('honderdmiljoenen');
        expect(byKey.TM).toBe('tienmiljoenen');
    });

    test('digits at every natural place add back up to the number (1000 random n ≤ 1e9)', () => {
        const natural = PLACE_VALUES.filter((p) => p.weight >= 1);
        // Fixed LCG so a failure reproduces.
        let seed = 12345;
        const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        const samples = [0, 1, 9, 10, 999_999_999, 1_000_000_000, 123_456_789, 100_000_001];
        for (let i = 0; i < 1000; i++) samples.push(Math.floor(next() * 1_000_000_001));
        for (const n of samples) {
            const sum = natural.reduce((acc, p) => acc + digitAtPlace(n, p.weight) * p.weight, 0);
            expect(sum, `n=${n}`).toBe(n);
        }
    });
});

describe('buildMaskedNatural', () => {
    test('honours the mask exactly and stays within max', () => {
        const cases: Array<[Record<string, boolean>, number]> = [
            [{ Mrd: true }, 1e9],
            [{ HM: true, E: true }, 1e9],
            [{ HM: true, TM: true, M: true }, 1e9],
            [{ TM: true, D: true }, 1e8],
            [{ H: true, T: true, E: true }, 1000],
        ];
        for (const [mask, max] of cases) {
            const places = getMaskPlaces(max);
            for (let i = 0; i < 50; i++) {
                const n = buildMaskedNatural(mask, max);
                expect(n, JSON.stringify(mask)).not.toBeNull();
                expect(n!).toBeLessThanOrEqual(max);
                for (const p of places) expect(digitAtPlace(n!, p.weight) > 0, `${n} at ${p.key}`).toBe(!!mask[p.key]);
            }
        }
    });

    test('a mask with no place in range, or one that never fits, gives null', () => {
        expect(buildMaskedNatural({}, 1e9)).toBeNull();
        expect(buildMaskedNatural({ Mrd: true }, 1e6)).toBeNull();
        // D digit ≥ 1 plus E ≥ 1 always exceeds 1000.
        expect(buildMaskedNatural({ D: true, E: true }, 1000, 20)).toBeNull();
    });
});
