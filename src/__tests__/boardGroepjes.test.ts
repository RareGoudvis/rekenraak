import { describe, test, expect, afterEach, vi } from 'vitest';
import { makeGroups, type GroepjesProps } from '../board/widgetSizing';

// Groepjesmaker: must-together pairs merge into one dealt unit (union-find, transitive);
// cannot-together pairs force a re-shuffle; impossible rules return a flagged best effort.
// Seeded Math.random (mulberry32) so a failure names a reproducible seed.
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const CLASS = ['Ana', 'Bert', 'Cas', 'Dina', 'Eli', 'Fien', 'Gust', 'Hanne', 'Ilias', 'Jade', 'Kobe', 'Lien'];

const cfg = (p: Partial<GroepjesProps> = {}): GroepjesProps => ({ mode: 'aantal', groups: 3, size: 4, mustTogether: '', cannotTogether: '', ...p });
const groupOf = (groups: string[][], name: string) => groups.findIndex((g) => g.includes(name));

function run(names: string[], c: GroepjesProps, seed: number) {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
    const r = makeGroups(names, c);
    vi.restoreAllMocks();
    return r;
}

function expectEveryNameOnce(names: string[], groups: string[][]) {
    expect(groups.flat().sort()).toEqual([...names].sort());
    expect(groups.every((g) => g.length > 0)).toBe(true);
}

afterEach(() => vi.restoreAllMocks());

describe('group counts', () => {
    test.each(SEEDS)('aantal: 12 names in 3 groups of 4 (seed %i)', (seed) => {
        const { groups, ok } = run(CLASS, cfg(), seed);
        expect(ok).toBe(true);
        expect(groups.map((g) => g.length)).toEqual([4, 4, 4]);
        expectEveryNameOnce(CLASS, groups);
    });

    test('aantal never makes more groups than names', () => {
        const { groups } = run(['Ana', 'Bert'], cfg({ groups: 5 }), 1);
        expect(groups).toHaveLength(2);
    });

    test.each([[3, 4], [4, 3], [5, 2], [6, 2]])('grootte %i: 12 names → %i groups, sizes within 1', (size, n) => {
        const { groups } = run(CLASS, cfg({ mode: 'grootte', size }), 7);
        expect(groups).toHaveLength(n);
        const lens = groups.map((g) => g.length);
        expect(Math.max(...lens) - Math.min(...lens)).toBeLessThanOrEqual(1);
        expectEveryNameOnce(CLASS, groups);
    });

    test('grootte never drops below one group', () => {
        expect(run(['Ana', 'Bert'], cfg({ mode: 'grootte', size: 10 }), 1).groups).toHaveLength(1);
    });
});

describe('must together (join)', () => {
    test.each(SEEDS)('a pair always shares a group (seed %i)', (seed) => {
        const { groups, ok } = run(CLASS, cfg({ mustTogether: 'Ana, Bert\nCas,Dina' }), seed);
        expect(ok).toBe(true);
        expect(groupOf(groups, 'Ana')).toBe(groupOf(groups, 'Bert'));
        expect(groupOf(groups, 'Cas')).toBe(groupOf(groups, 'Dina'));
        expectEveryNameOnce(CLASS, groups);
    });

    test.each(SEEDS)('pairs chain transitively: A-B + B-C + D-C puts all four together (seed %i)', (seed) => {
        const { groups } = run(CLASS, cfg({ mustTogether: 'Ana, Bert\nBert, Cas\nDina, Cas' }), seed);
        const g = groupOf(groups, 'Ana');
        expect(['Bert', 'Cas', 'Dina'].map((n) => groupOf(groups, n))).toEqual([g, g, g]);
        expectEveryNameOnce(CLASS, groups);
    });

    test('a merged unit is dealt whole, onto the smallest group', () => {
        const { groups } = run(CLASS, cfg({ groups: 2, mustTogether: 'Ana, Bert\nBert, Cas\nCas, Dina\nDina, Eli' }), 3);
        expect(groups.find((x) => x.includes('Ana'))).toEqual(expect.arrayContaining(['Ana', 'Bert', 'Cas', 'Dina', 'Eli']));
        expectEveryNameOnce(CLASS, groups);
    });

    test('a line is a pair: a third name on the line is ignored, a single name is no rule', () => {
        // Seed where Cas lands apart from the Ana-Bert unit, so the test shows Cas was not joined.
        const seed = SEEDS.find((s) => {
            const { groups } = run(CLASS, cfg({ mustTogether: 'Ana, Bert, Cas\nDina' }), s);
            return groupOf(groups, 'Cas') !== groupOf(groups, 'Ana');
        });
        expect(seed).toBeDefined();
    });
});

describe('cannot together (split)', () => {
    test.each(SEEDS)('a forbidden pair never shares a group (seed %i)', (seed) => {
        const { groups, ok } = run(CLASS, cfg({ cannotTogether: 'Ana, Bert\nAna, Cas\nBert, Cas' }), seed);
        expect(ok).toBe(true);
        const gs = ['Ana', 'Bert', 'Cas'].map((n) => groupOf(groups, n));
        expect(new Set(gs).size).toBe(3);
        expectEveryNameOnce(CLASS, groups);
    });

    test.each(SEEDS)('join and split together (seed %i)', (seed) => {
        const { groups, ok } = run(CLASS, cfg({ mustTogether: 'Ana, Bert', cannotTogether: 'Bert, Cas\nAna, Dina' }), seed);
        expect(ok).toBe(true);
        expect(groupOf(groups, 'Ana')).toBe(groupOf(groups, 'Bert'));
        expect(groupOf(groups, 'Cas')).not.toBe(groupOf(groups, 'Bert'));
        expect(groupOf(groups, 'Dina')).not.toBe(groupOf(groups, 'Ana'));
    });

    test('contradicting rules: flagged best effort, every name still dealt once', () => {
        const { groups, ok } = run(CLASS, cfg({ mustTogether: 'Ana, Bert', cannotTogether: 'Ana, Bert' }), 1);
        expect(ok).toBe(false);
        expectEveryNameOnce(CLASS, groups);
        expect(groupOf(groups, 'Ana')).toBe(groupOf(groups, 'Bert'));
    });

    test('impossible split (2 groups, 3 mutually forbidden) is flagged', () => {
        const { ok, groups } = run(CLASS, cfg({ groups: 2, cannotTogether: 'Ana, Bert\nAna, Cas\nBert, Cas' }), 1);
        expect(ok).toBe(false);
        expect(groups).toHaveLength(2);
        expectEveryNameOnce(CLASS, groups);
    });
});

describe('deleted names', () => {
    test.each(SEEDS.slice(0, 10))('rules naming someone no longer in the class list are ignored (seed %i)', (seed) => {
        const names = CLASS.filter((n) => n !== 'Bert' && n !== 'Cas');
        const { groups, ok } = run(names, cfg({ mustTogether: 'Ana, Bert\nBert, Dina\nCas, Eli', cannotTogether: 'Bert, Ana\nCas, Fien' }), seed);
        expect(ok).toBe(true);
        expectEveryNameOnce(names, groups);
        // Ana and Dina are NOT joined through the deleted Bert.
        expect(groups.flat()).not.toContain('Bert');
    });

    test('a deleted middle link breaks the chain: Ana-Bert-Cas with Bert gone leaves Ana and Cas free', () => {
        const names = CLASS.filter((n) => n !== 'Bert');
        const apart = SEEDS.some((s) => {
            const { groups } = run(names, cfg({ mustTogether: 'Ana, Bert\nBert, Cas' }), s);
            return groupOf(groups, 'Ana') !== groupOf(groups, 'Cas');
        });
        expect(apart).toBe(true);
    });
});
