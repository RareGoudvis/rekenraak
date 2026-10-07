import { describe, test, expect } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { DEFAULT_BASE, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS } from '../config/gradePresets';
import { NAT_CEILING } from '../config/numberRanges';
import { withinCeiling, generateForBlock } from '../services/generateDispatch';
import { makeBlock } from './helpers/makeBlock';

// Snapshot of baseApply before the per-type floor (≤ 2026-09-27): what every block got at
// the default base, so the refactor can prove it changed nothing a default sheet shows.
function legacyBaseApply(base: BaseSettings, d: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const hasKeys = (o: Record<string, unknown>) => Object.keys(o).length > 0;
    if ('maxGetal' in d) out.maxGetal = base.baseMaxGetal;
    if ('maxRange' in d) out.maxRange = base.baseMaxGetal;
    if ('maxNumber' in d) out.maxNumber = Math.min(base.baseMaxGetal, 9999);
    if ('numberType' in d) out.numberType = base.baseNumberType;
    if ('operand1Mask' in d && hasKeys(base.baseOperand1Mask)) out.operand1Mask = { ...base.baseOperand1Mask };
    if ('operand2Mask' in d && hasKeys(base.baseOperand2Mask)) out.operand2Mask = { ...base.baseOperand2Mask };
    if ('bridges' in d && hasKeys(base.baseBridges)) out.bridges = { ...base.baseBridges };
    if ('decimalPlaces' in d) out.decimalPlaces = base.baseDecimalPlaces;
    if ('unitFractionsOnly' in d) out.unitFractionsOnly = base.baseUnitFractionsOnly;
    if ('allowMixed' in d) out.allowMixed = base.baseAllowMixed;
    return out;
}

const typeIds = Object.keys(REGISTRY);
const leaves = flattenLeaves();
// Every entry point a teacher reaches: the bare registry type and every sidebar leaf.
const cases: Array<[string, string, Record<string, unknown> | undefined]> = [
    ...typeIds.map((t) => [`type ${t}`, t, undefined] as [string, string, undefined]),
    ...leaves.map((l) => [`leaf ${l.id}`, l.typeId, l.defaultConstraints] as [string, string, Record<string, unknown> | undefined]),
];

const MAX_KEYS = ['maxGetal', 'maxRange', 'maxNumber'] as const;
// The default base as it was until 2026-10-07 (decimals 2), which the legacy snapshot assumes.
const OLD_DEFAULT_BASE: BaseSettings = { ...DEFAULT_BASE, baseDecimalPlaces: 2 };
const gradeBase = (g: 1 | 2 | 3 | 4 | 5 | 6): BaseSettings => ({ ...DEFAULT_BASE, ...GRADE_PRESETS[g] });

describe('(a) the default base changes nothing', () => {
    test.each(cases)('%s', (_name, typeId, leaf) => {
        const defaults = REGISTRY[typeId].defaultConstraints(typeId);
        const legacy: Record<string, unknown> = { ...defaults, ...legacyBaseApply(OLD_DEFAULT_BASE, defaults), ...(leaf ?? {}) };
        // [S1] 2026-10-07: the base's decimals default to 0. Where decimalPlaces is the decimal switch
        // (plaatswaarde, vergelijken) a block starts on whole numbers; where a numberType picks
        // decimals the type keeps its own precision (2).
        if ('decimalPlaces' in defaults && !(leaf && 'decimalPlaces' in leaf)) {
            legacy.decimalPlaces = 'numberType' in defaults ? defaults.decimalPlaces : 0;
        }
        // A hidden picker keeps the registry default (even-oneven cirkels: 100, drawn ≤ 24 either way).
        if (REGISTRY[typeId].maxPresets?.(legacy) === null) {
            for (const key of MAX_KEYS) if (key in defaults && !(leaf && key in leaf)) legacy[key] = defaults[key];
        }
        expect(makeBlock(typeId, { constraints: leaf }).constraints).toEqual(legacy);
    });
});

describe('(b) leerjaar 5 floors into each type\'s own list', () => {
    const base = gradeBase(5);
    test.each<[string, string, Record<string, unknown> | undefined, string, number]>([
        ['hoofdrekenen natuurlijk', 'hr-std-optellen', undefined, 'maxGetal', 1_000_000],
        ['hoofdrekenen decimaal', 'hr-std-optellen', { numberType: 'decimal' }, 'maxGetal', 1000],
        ['gemengd decimaal', 'hr-std-gemengd', { numberType: 'decimal' }, 'maxGetal', 1000],
        ['deelbaarheid', 'deelbaarheid', undefined, 'maxGetal', 100_000],
        ['MAB', 'mab-herkennen', undefined, 'maxNumber', 1000],
        ['geld', 'geld-herkennen', undefined, 'maxGetal', 1000],
        ['kettingsommen', 'kettingsommen', undefined, 'maxGetal', 1000],
        ['controleren', 'controleren', undefined, 'maxGetal', 10_000],
        ['cijferen natuurlijk', 'cijferen-optellen-nat', { operator: '+', numberType: 'natural' }, 'maxRange', 1_000_000],
    ])('%s', (_name, typeId, leaf, key, want) => {
        expect(makeBlock(typeId, { base, constraints: leaf }).constraints[key]).toBe(want);
    });

    test('a decimal base picks the decimal list', () => {
        const decimalBase: BaseSettings = { ...base, baseNumberType: 'decimal' };
        expect(makeBlock('hr-std-optellen', { base: decimalBase }).constraints.maxGetal).toBe(1000);
    });
});

describe('(c) leerjaar 6 lands inside every picker', () => {
    // 1e10 = the seed old autosaves still carry; 1e9 = the leerplan ceiling.
    test.each([1e10, NAT_CEILING])('base %d', (seed) => {
        const base: BaseSettings = { ...gradeBase(6), baseMaxGetal: seed };
        const problems: string[] = [];
        for (const [name, typeId, leaf] of cases) {
            const c = makeBlock(typeId, { base, constraints: leaf }).constraints as Record<string, unknown>;
            for (const key of MAX_KEYS) {
                if (key in c && !((c[key] as number) <= NAT_CEILING)) problems.push(`${name}: ${key}=${c[key]} above the ceiling`);
            }
            const range = REGISTRY[typeId].maxPresets?.(c);
            // A leaf that pins its own max wins over the seed; only the seeded value is judged here.
            if (range && !(leaf && range.key in leaf) && !range.presets.includes(c[range.key] as number)) {
                problems.push(`${name}: ${range.key}=${c[range.key]} not in [${range.presets.join(', ')}]`);
            }
        }
        expect(problems).toEqual([]);
    });
});

describe('(d) old saves above the ceiling', () => {
    test('a max ≤ NAT_CEILING passes through as the very same block', () => {
        const b = makeBlock('hr-std-optellen', { constraints: { maxGetal: NAT_CEILING } });
        expect(withinCeiling(b)).toBe(b);
    });

    test('a 1e10 maxGetal / maxRange generates from a clamped copy, the stored block untouched', () => {
        const hr = makeBlock('hr-std-optellen', { constraints: { maxGetal: 1e10 } });
        expect(withinCeiling(hr).constraints.maxGetal).toBe(NAT_CEILING);
        expect(hr.constraints.maxGetal).toBe(1e10);
        const cijfer = makeBlock('cijferen-optellen-nat', { constraints: { operator: '+', maxRange: 1e10 } });
        expect(withinCeiling(cijfer).constraints.maxRange).toBe(NAT_CEILING);
        expect(generateForBlock(cijfer, true).items.length).toBe(cijfer.numberOfExercises);
    });
});

describe('(e) base masks and bridges stop at the block\'s own max', () => {
    // Leerjaar 6 with an HM-only mask and an HM brug: fine for natural hoofdrekenen at 1e9,
    // impossible for a block whose list tops at 1 000 or a leaf that pins 10.
    const base: BaseSettings = { ...gradeBase(6), baseOperand1Mask: { HM: true }, baseOperand2Mask: { HM: true, E: true }, baseBridges: { HM: 'REQUIRED', E: 'FORBIDDEN' } };
    const leafOf = (id: string) => leaves.find((l) => l.id === id)!;
    const seeded = (typeId: string, leaf?: Record<string, unknown>) =>
        makeBlock(typeId, { base, constraints: leaf }).constraints as Record<string, Record<string, unknown>>;

    test('hoofdrekenen natuurlijk keeps HM', () => {
        const c = seeded('hr-std-optellen');
        expect(c.operand1Mask).toEqual({ HM: true });
        expect(c.bridges).toEqual({ HM: 'REQUIRED', E: 'FORBIDDEN' });
    });

    test('hoofdrekenen decimaal drops HM, keeps what fits', () => {
        const c = seeded('hr-std-optellen', { numberType: 'decimal' });
        expect(c.operand1Mask).toEqual({});
        expect(c.operand2Mask).toEqual({ E: true });
        expect(c.bridges).toEqual({ E: 'FORBIDDEN' });
    });

    test('MAB drops HM', () => {
        expect(seeded('mab-herkennen').operand1Mask).toEqual({});
    });

    test('splitsen basis (pinned 10) drops HM', () => {
        const leaf = leafOf('splitsen-basis');
        const c = seeded(leaf.typeId, leaf.defaultConstraints);
        expect(c.operand1Mask).toEqual({});
        expect(c.operand2Mask).toEqual({ E: true });
    });

    test('none of them leaves a generation note', () => {
        for (const [typeId, leaf] of [['hr-std-optellen', { numberType: 'decimal' }], ['mab-herkennen', undefined], ['splitsen', leafOf('splitsen-basis').defaultConstraints]] as const) {
            const block = makeBlock(typeId, { base, constraints: leaf });
            const { items, note } = generateForBlock(block, true);
            expect(note, typeId).toBeNull();
            expect(items.length, typeId).toBe(block.numberOfExercises);
        }
    });
});

describe('(f) a hidden max picker keeps the registry default', () => {
    const base = gradeBase(6);
    test.each<[string, string, Record<string, unknown>, number]>([
        ['tafels', 'hr-std-vermenigvuldigen', {}, 1000],
        ['delen tafels', 'hr-std-delen', {}, 1000],
        ['even-oneven cirkels', 'even-oneven', { subType: 'cirkels' }, 100],
        ['veelvouden', 'deelbaarheid', { layout: 'veelvouden' }, 1000],
        ['rationaal optellen', 'hr-std-optellen', { numberType: 'rational' }, 1000],
    ])('%s', (_name, typeId, leaf, want) => {
        expect(makeBlock(typeId, { base, constraints: leaf }).constraints.maxGetal).toBe(want);
    });

    test('switching tafels to andere lands on a value the picker lists', () => {
        const c: Record<string, unknown> = { ...makeBlock('hr-std-vermenigvuldigen', { base }).constraints, multiplicationMode: 'andere' };
        const range = REGISTRY['hr-std-vermenigvuldigen'].maxPresets!(c)!;
        expect(range.presets).toContain(c.maxGetal);
        expect(c.maxGetal).toBe(1000);
    });
});
