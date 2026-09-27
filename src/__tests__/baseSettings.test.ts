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
const gradeBase = (g: 1 | 2 | 3 | 4 | 5 | 6): BaseSettings => ({ ...DEFAULT_BASE, ...GRADE_PRESETS[g] });

describe('(a) the default base changes nothing', () => {
    test.each(cases)('%s', (_name, typeId, leaf) => {
        const defaults = REGISTRY[typeId].defaultConstraints(typeId);
        const legacy = { ...defaults, ...legacyBaseApply(DEFAULT_BASE, defaults), ...(leaf ?? {}) };
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
            const range = REGISTRY[typeId].maxPresets?.(c, false);
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
