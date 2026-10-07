import type { Leerjaar } from '../config/gradePresets';
import { ladderFor } from '../services/herleidingen/herleidingenGenerator';
import { getMaskPlaces } from '../services/math/mathEngine';

// ── Known limit bugs ─────────────────────────────────────────────────────────
// One entry per still-open BUGS.md id ([Lx] limit, [Ex] other, [Nx] found by this harness).
// limits.matrix.test.ts accepts a violation only when an entry here names its typeId and
// rule AND its `match` holds for the block's constraints; anything else fails the gate.
// The same test runs every trigger case in scripts/limit-trigger-cases.json and fails when
// an entry no longer reproduces there, so a fix agent deletes the entry (and its BUGS.md
// line) in the commit that fixes the generator — from then on the gate enforces the fix.
//
// Matchers read the block's EFFECTIVE constraints (registry defaults → base → leaf →
// override, i.e. block.constraints), never the raw override. A gemengd rule carries the
// variant it came from after an '@' ('answer>max@x:tienvoud'); an entry's rule without '@'
// matches every variant.

type C = Record<string, unknown>;

export interface KnownBug {
    id: string;
    typeIds: string[];
    rules: string[];
    match: (typeId: string, c: C, grade?: Leerjaar | null) => boolean;
}

export interface KnownSkip {
    id: string;
    typeIds: string[];
    // 'hang' never runs anywhere; 'crash' is skipped by the generator matrix but run (and
    // caught) by the limit harness, so its entry still proves it reproduces.
    kind: 'hang' | 'crash';
    match: (typeId: string, c: C) => boolean;
}

const HR = ['hr-std-optellen', 'hr-std-aftrekken', 'hr-std-vermenigvuldigen', 'hr-std-delen', 'hr-std-gemengd'];
// The eight cijferen typeIds share one generator; the operator and number type come from the block.
const CIJFEREN = ['optellen', 'aftrekken', 'vermenigvuldigen', 'delen'].flatMap(op => [`cijferen-${op}-nat`, `cijferen-${op}-dec`]);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const masked = (m: unknown, keys?: string[]) =>
    !!m && typeof m === 'object' && Object.entries(m as Record<string, boolean>).some(([k, on]) => on && (!keys || keys.includes(k)));
const DECIMAL_PLACES = ['t', 'h', 'd', 'td'];
const opSetting = (c: C, op: string) => ((c.opSettings ?? {}) as Record<string, { max?: number; mask?: unknown }>)[op];

// Some d1 in [2..D1] for which every d2 in [2..D2] equals, divides or is divisible by it:
// the multi_step do/while (mathEngine.ts ~351 / ~474) then never finds a d2.
export function fractionMultiStepHangs(maxD1: number, maxD2: number): boolean {
    for (let d1 = 2; d1 <= Math.max(2, maxD1); d1++) {
        let free = false;
        for (let d2 = 2; d2 <= Math.max(2, maxD2); d2++) if (!(d1 === d2 || d2 % d1 === 0 || d1 % d2 === 0)) { free = true; break; }
        if (!free) return true;
    }
    return false;
}

export const KNOWN_SKIPS: KnownSkip[] = [
    {
        // [E1] PAGE FREEZE: rational +/− 'multi_step' (any difficulty other than same/one_step
        // reaches the same loop), also when a 3-4 term chain relaxes to 2 terms.
        id: 'E1', kind: 'hang', typeIds: ['hr-std-optellen', 'hr-std-aftrekken'],
        match: (_t, c) => c.numberType === 'rational'
            && !['same', 'one_step'].includes(str(c.fractionDifficulty, 'same'))
            && fractionMultiStepHangs(num(c.maxDenominator1, 10), num(c.maxDenominator2, 10)),
    },
    {
        // [E2] CRASH: herleidingen units whose factors are all equal (m² + ca, hm² + ha,
        // dam² + a) leave gridUnits with one entry and pickPair reads index 1.
        id: 'E2', kind: 'crash', typeIds: ['herleidingen'],
        match: (_t, c) => {
            const ladder = ladderFor(str(c.measure, 'lengte'));
            const picked = ladder.filter(u => ((c.units as string[] | undefined) ?? []).includes(u.key));
            return picked.length >= 2 && new Set(picked.map(u => u.factor)).size === 1;
        },
    },
];

export const KNOWN_BUGS: KnownBug[] = [
    // ── WP1 Hoofdrekenen engine ──
    {
        id: 'L2', typeIds: ['hr-std-gemengd'],
        rules: ['answer>max@x', 'answer>max@x:tienvoud', 'dividend>max@:', 'answer>max@:tienvoud'],
        match: () => true,
    },
    {
        id: 'L7', typeIds: ['hr-std-optellen', 'hr-std-aftrekken'], rules: ['denominator>max'],
        match: (_t, c) => c.numberType === 'rational' && c.fractionDifficulty === 'one_step',
    },
    {
        id: 'L8', typeIds: ['hr-std-delen', 'hr-std-gemengd'], rules: ['quotient>max'],
        match: (_t, c) => c.numberType === 'decimal',
    },
    {
        id: 'L14', typeIds: HR, rules: ['operand>operandMax'],
        match: (_t, c) => Array.isArray(c.operandMax) && c.operandMax.some(v => typeof v === 'number'),
    },
    {
        id: 'L15', typeIds: ['hr-std-vermenigvuldigen', 'hr-std-delen'], rules: ['decimal-operand<=0'],
        match: (_t, c) => c.numberType === 'rational' && c.fractionMultMode === 'decimal_fraction',
    },
    {
        id: 'L19', typeIds: ['hr-std-delen'], rules: ['dividend>max', 'dividend>gradeMax'],
        match: (_t, c) => c.multiplicationMode === 'met_rest',
    },

    // ── WP2 Rows and patterns ──
    {
        // The row cannot fit: step × (ticks − 1) is wider than the range it must stay in.
        id: 'L1', typeIds: ['getallenas', 'getallenrijen'], rules: ['value>max', 'value<min'],
        match: (_t, c) => {
            if (c.numberType === 'rational') return false;
            const max = num(c.maxGetal, 100);
            const lo = c.numberType === 'geheel' ? num(c.minGetal, -max) : 0;
            return num(c.step, 5) * (num(c.ticks, 6) - 1) > max - lo + 1e-9;
        },
    },
    {
        id: 'L9', typeIds: ['getalpatronen'], rules: ['step>opMax'],
        match: (_t, c) => masked(opSetting(c, '+')?.mask) || masked(opSetting(c, '-')?.mask),
    },
    {
        id: 'L10', typeIds: ['getallenrijen'], rules: ['teller>maxTeller', 'negative-denominator', 'value<min'],
        match: (_t, c) => c.numberType === 'rational',
    },
    { id: 'E5a', typeIds: ['getalpatronen', 'kettingsommen'], rules: ['fallback-ladder'], match: () => true },

    // ── WP3 Cijferen ──
    {
        id: 'L3', typeIds: CIJFEREN, rules: ['answer>max'],
        match: (_t, c) => c.operator === 'x' && (masked(c.operand0Mask) || masked(c.operand1Mask)),
    },
    {
        id: 'L4', typeIds: CIJFEREN, rules: ['operand>max', 'answer-key', 'answer>max'],
        match: (_t, c) => c.operator === 'x' && c.numberType === 'decimal' && masked(c.operand1Mask, DECIMAL_PLACES),
    },
    {
        // A divisor mask with no tens (E, or a decimal place a natural block cannot show) gives 1.
        id: 'E3', typeIds: CIJFEREN, rules: ['divisor<2', 'answer-key'],
        match: (_t, c) => c.operator === ':' && c.numberType !== 'decimal' && masked(c.operand1Mask),
    },
    {
        // Also a Getal 1 mask with no place above E: the dividend stays below 10, the quotient is 0.
        id: 'E7', typeIds: CIJFEREN, rules: ['quotient<=0', 'dividend>max'],
        match: (_t, c) => c.operator === ':' && c.numberType === 'decimal'
            && (masked(c.operand1Mask, DECIMAL_PLACES) || (masked(c.operand0Mask) && !masked(c.operand0Mask, ['Mrd', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T']))),
    },

    // ── WP4 Geometry, fractions, vergelijken ──
    {
        id: 'L5', typeIds: ['vergelijken'], rules: ['value>max'],
        match: (_t, c) => c.subType === 'representaties' && (masked(c.leftMask) || masked(c.rightMask)),
    },
    {
        id: 'L11', typeIds: ['breuken-bewerken'], rules: ['denominator>max'],
        match: (_t, c) => c.subType === 'gelijknamig' && num(c.minDenominator, 2) >= num(c.maxDenominator, 10),
    },
    {
        // w = h = max → h + 1 (metenGenerator.ts ~83).
        id: 'L12', typeIds: ['omtrek', 'oppervlakte'], rules: ['value>max'],
        match: (_t, c) => ((c.shapes as string[] | undefined) ?? []).includes('rechthoek'),
    },
    {
        id: 'L13', typeIds: ['oppervlakte'], rules: ['value<min', 'shape-not-selected'],
        match: (_t, c) => c.subType === 'rooster',
    },
    {
        id: 'L16', typeIds: ['breuken-bewerken', 'breuken', 'omtrek'],
        rules: ['numerator>max', 'denominator>max', 'targetDen-ignored', 'total>maxTotal', 'value>max'],
        match: (t, c) => {
            if (t === 'breuken') return num(c.maxTotal, 20) < Math.max(2, num(c.minDenominator, 2));
            if (t === 'omtrek') return num(c.maxLength, 10) <= 3;
            if (c.subType === 'gemengd') return num(c.maxNumerator, 10) <= 2;
            if (c.subType === 'vereenvoudigen') return num(c.maxDenominator, 10) <= 3 || num(c.maxNumerator, 10) <= 1;
            return c.subType === 'gelijknamig' && c.targetDen !== '' && c.targetDen !== undefined && c.targetDen !== null;
        },
    },

    // ── WP6 Misc generators ──
    {
        id: 'E2', typeIds: ['herleidingen'], rules: ['threw'],
        match: (t, c) => KNOWN_SKIPS.find(s => s.id === 'E2')!.match(t, c),
    },
    {
        id: 'E4b', typeIds: ['ordenen', 'breuken-rangschikken', 'herleidingen', 'maateenheid', 'kalender', 'geld-teruggeven'],
        rules: ['underfill', 'empty-exercise', 'count-short', 'questions<questionCount'],
        match: (t, c) => {
            if (t === 'ordenen') return masked(c.numberMask);
            if (t === 'breuken-rangschikken') return c.fractionMode === 'gelijknamig-te-maken';
            if (t === 'maateenheid') return ((c.grootheden as string[] | undefined) ?? []).length <= 1;
            if (t === 'kalender') return !((c.questionTypes as string[] | undefined) ?? []).includes('dag-van-datum');
            if (t === 'geld-teruggeven') return ((c.payWithOptions as number[] | undefined) ?? []).length <= 1;
            return true;
        },
    },
    {
        id: 'E6', typeIds: ['verbanden'], rules: ['given-not-in-reps', 'target-not-in-reps'],
        match: (_t, c) => c.given !== 'random' && !((c.reps as string[] | undefined) ?? []).includes(str(c.given, 'random')),
    },
    {
        id: 'E8', typeIds: ['geld-herkennen', 'geld-tekenen'], rules: ['amount<=0', 'cents-in-euros', 'unpayable'],
        match: () => true,
    },

    // ── WP7 Grade lists ──
    {
        id: 'L20', typeIds: ['vergelijken', 'plaatswaarde'], rules: ['seeded-max>grade'],
        match: (_t, _c, grade) => grade === 1,
    },

    // ── Found by this harness (BUGS.md 'Limit audit 2026-10-07', harness section) ──
    {
        // Gemengd getal on Getal 2 with Getal 1 the smaller fraction: the key is wrong.
        // The same swap also lets Getal 2's noemer past its cap under multi_step.
        id: 'N1', typeIds: ['hr-std-aftrekken'], rules: ['answer-key', 'denominator>max'],
        match: (_t, c) => c.numberType === 'rational' && c.mixedNumber2 === true,
    },
    {
        // A getalopbouw mask on only the top place (weight = max) admits one number.
        // afronden too; the retry loop that hunts for more numbers makes kiezen slow.
        id: 'N2', typeIds: ['plaatswaarde', 'vergelijken', 'afronden'], rules: ['underfill', 'slow'],
        match: (_t, c) => {
            const max = num(c.maxGetal, 1000);
            const on = getMaskPlaces(max, 'natural').filter(p => (c.numberMask as Record<string, boolean> | undefined)?.[p.key]);
            return on.length > 0 && on.every(p => p.weight === max);
        },
    },
];

const ruleMatches = (entryRule: string, rule: string) => rule === entryRule || rule.startsWith(`${entryRule}@`);

/** The known bug a violation belongs to, or null when it is a NEW finding. */
export function knownBugFor(typeId: string, c: C, grade: Leerjaar | null, rule: string): KnownBug | null {
    return KNOWN_BUGS.find(b => b.typeIds.includes(typeId) && b.rules.some(r => ruleMatches(r, rule)) && b.match(typeId, c, grade)) ?? null;
}

/** A setting that must not run at all here: a hang (everywhere) or, for `includeCrashes`, a crash. */
export function skip(typeId: string, c: C, includeCrashes = true): KnownSkip | null {
    return KNOWN_SKIPS.find(s => s.typeIds.includes(typeId) && (includeCrashes || s.kind === 'hang') && s.match(typeId, c)) ?? null;
}
