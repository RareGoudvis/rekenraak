import { describe, test, expect } from 'vitest';
import { generateForBlock } from '../services/generateDispatch';
import { formatMathNumber } from '../services/math/formatters';
import { NAT_CEILING, RANGES } from '../config/numberRanges';
import { makeBlock } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';

// ── Integer safety at the 1e9 ceiling ─────────────────────────────────────────
// Every type whose max list reaches ≥ 1e7, at the top of that list with its most decimals:
// (a) every number on an exercise is finite, prints without an exponent or float tail and stays
// a safe integer once scaled by INTERNAL_SCALE (1e6); (b) operands and answer survive the
// print → parse round trip; (c) the answer equals the exact result recomputed in BigInt from
// the PRINTED operands, which is what catches a silently rounded product (> 2^53).

const SEEDS = [11, 2026, 909];
const COUNT = 30;
const SCALE = 1_000_000;
const DEC_TOP = Math.max(...RANGES.decimal);
const TIENVOUD_TOP = Math.max(...RANGES.hrTienvoud);
const CIJFER_DEC_TOP = Math.max(...RANGES.cijferDecimal);
const DP = 3;

interface Case { label: string; typeId: string; c: Record<string, unknown> }

const hr = (label: string, typeId: string, c: Record<string, unknown>): Case => ({ label, typeId, c });

const ADD_SUB: Case[] = ['hr-std-optellen', 'hr-std-aftrekken'].flatMap(t => [2, 3, 4].flatMap(termCount => [
    hr(`${t} natural 1e9 ${termCount}t`, t, { numberType: 'natural', maxGetal: NAT_CEILING, termCount }),
    hr(`${t} geheel 1e9 ${termCount}t`, t, { numberType: 'geheel', maxGetal: NAT_CEILING, termCount }),
    hr(`${t} natural 1e9 mask HM ${termCount}t`, t, { numberType: 'natural', maxGetal: NAT_CEILING, termCount, operand1Mask: { HM: true, E: true }, operand2Mask: { M: true, E: true } }),
    hr(`${t} decimal ${DEC_TOP} dp${DP} ${termCount}t`, t, { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, termCount }),
]).concat([
    hr(`${t} compenseren 1e9`, t, { numberType: 'natural', maxGetal: NAT_CEILING, preset: 'compenseren' }),
    hr(`${t} compenseren decimal`, t, { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, preset: 'compenseren' }),
]));

// The rational modes have no max picker, so a 1e9 max set under 'natural' rides along hidden.
const RATIONAL = (t: string): Case[] => ['natural_fraction', 'decimal_fraction', 'fraction_fraction'].map(m =>
    hr(`${t} rational ${m} hidden 1e9`, t, { numberType: 'rational', fractionMultMode: m, maxGetal: NAT_CEILING, decimalPlaces: DP, maxNumerator2: 20, maxDenominator2: 20 }));

const MUL: Case[] = [
    hr('× andere 1e9', 'hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING }),
    hr('× andere 1e9 masks', 'hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, operand1Mask: { HM: true }, operand2Mask: { E: true } }),
    hr('× andere 1e9 masks M', 'hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, operand1Mask: { M: true, E: true }, operand2Mask: { T: true, E: true } }),
    hr('× andere 1e9 4t', 'hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, termCount: 4 }),
    hr('× tafels 1e9', 'hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'tafels', maxGetal: NAT_CEILING, tableLimit: 100 }),
    hr('× decimal × natural', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP }),
    hr('× decimal × decimal', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, decimalTimesDecimal: true }),
    hr('× decimal × decimal masks', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, decimalTimesDecimal: true, operand1Mask: { E: true, h: true }, operand2Mask: { t: true } }),
    hr('× tienvoud natural', 'hr-std-vermenigvuldigen', { numberType: 'natural', preset: 'tienvoud', maxGetal: TIENVOUD_TOP }),
    hr('× tienvoud decimal', 'hr-std-vermenigvuldigen', { numberType: 'decimal', preset: 'tienvoud', maxGetal: TIENVOUD_TOP, decimalPlaces: DP }),
    ...RATIONAL('hr-std-vermenigvuldigen'),
];

const DIV: Case[] = [
    hr(': andere 1e9', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING }),
    hr(': andere 1e9 niveaus', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, divisionLevels: [1, 2, 3, 4, 5, 6] }),
    hr(': andere 1e9 deeltal mask', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, operand1Mask: { HM: true } }),
    hr(': andere 1e9 deler mask', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, operand2Mask: { T: true, E: true } }),
    hr(': andere 1e9 both masks', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, operand1Mask: { M: true, E: true }, operand2Mask: { E: true } }),
    hr(': andere 1e9 3t', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'andere', maxGetal: NAT_CEILING, termCount: 3 }),
    hr(': met rest', 'hr-std-delen', { numberType: 'natural', multiplicationMode: 'met_rest', maxGetal: Math.max(...RANGES.hrMetRest), metRestLevel: 3 }),
    hr(': decimal', 'hr-std-delen', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP }),
    hr(': decimal masks', 'hr-std-delen', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, operand1Mask: { E: true, h: true }, operand2Mask: { t: true } }),
    hr(': tienvoud decimal', 'hr-std-delen', { numberType: 'decimal', preset: 'tienvoud', maxGetal: TIENVOUD_TOP, decimalPlaces: DP }),
    ...RATIONAL('hr-std-delen'),
];

const ALL_VARIANTS = ['+', '+:compenseren', '-', '-:compenseren', 'x', 'x:tienvoud', ':', ':tienvoud'];
const MIXED: Case[] = [
    hr('gemengd natural 1e9', 'hr-std-gemengd', { numberType: 'natural', maxGetal: NAT_CEILING, variants: ALL_VARIANTS, mix: 'cycle' }),
    hr('gemengd natural 1e9 andere', 'hr-std-gemengd', { numberType: 'natural', maxGetal: NAT_CEILING, variants: ['x', ':'], mix: 'cycle', perVariant: { x: { multiplicationMode: 'andere' }, ':': { multiplicationMode: 'andere' } } }),
    hr('gemengd decimal', 'hr-std-gemengd', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, variants: ALL_VARIANTS, mix: 'cycle' }),
    hr('gemengd decimal × decimal', 'hr-std-gemengd', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, variants: ['x', ':'], mix: 'cycle', decimalTimesDecimal: true }),
];

const CIJFER_OPS: [string, string][] = [['optellen', '+'], ['aftrekken', '-'], ['vermenigvuldigen', 'x'], ['delen', ':']];
const CIJFER: Case[] = CIJFER_OPS.flatMap(([name, operator]) => [
    hr(`cijferen ${name} nat 1e9`, `cijferen-${name}-nat`, { operator, numberType: 'natural', maxRange: NAT_CEILING, numberOfTerms: 4 }),
    hr(`cijferen ${name} nat 1e9 rest`, `cijferen-${name}-nat`, { operator, numberType: 'natural', maxRange: NAT_CEILING, withRemainder: true, operand0Mask: { M: true, E: true } }),
    ...[1, 2, DP].map(dp => hr(`cijferen ${name} dec ${CIJFER_DEC_TOP} dp${dp}`, `cijferen-${name}-dec`, { operator, numberType: 'decimal', maxRange: CIJFER_DEC_TOP, decimalPlaces: dp, numberOfTerms: 4 })),
    hr(`cijferen ${name} dec masks`, `cijferen-${name}-dec`, { operator, numberType: 'decimal', maxRange: CIJFER_DEC_TOP, decimalPlaces: DP, operand0Mask: { HM: true, E: true, h: true }, operand1Mask: { t: true } }),
]);

const GETALBEGRIP: Case[] = [
    ...['positie-tabel', 'positie-benen', 'positie-math', 'basic'].map(layout =>
        hr(`splitsen ${layout}`, 'splitsen', { layout, maxGetal: NAT_CEILING })),
    ...['waarde', 'plaats', 'tabel', 'omcirkelen'].map(subType =>
        hr(`plaatswaarde ${subType}`, 'plaatswaarde', { subType, maxGetal: NAT_CEILING, decimalPlaces: DP })),
    ...['getallen', 'kiezen'].map(subType =>
        hr(`vergelijken ${subType}`, 'vergelijken', { subType, maxGetal: NAT_CEILING, decimalPlaces: 2 })),
    ...['rooster', 'simpel'].map(subType =>
        hr(`afronden ${subType}`, 'afronden', { subType, numberType: 'natural', maxGetal: NAT_CEILING, roundTargets: ['M', 'TM', 'HM', 'Mrd'] })),
    hr('afronden decimal', 'afronden', { subType: 'simpel', numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, roundTargets: ['E', 't'] }),
];

// Off the decimal list: a stale 1e9 max on a block just switched to kommagetallen (the picker floors
// it one tick later) and the flat matrix space both hand a decimal generator the natural ceiling.
const OFF_LIST: Case[] = [
    ...['hr-std-optellen', 'hr-std-aftrekken'].map(t => hr(`${t} decimal off-list 1e9`, t, { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, termCount: 3 })),
    hr('× decimal × natural off-list 1e9', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP }),
    hr('× decimal × decimal off-list 1e9', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, decimalTimesDecimal: true }),
    hr('× decimal × decimal off-list 1e9 masks', 'hr-std-vermenigvuldigen', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, decimalTimesDecimal: true, operand1Mask: { HM: true, h: true }, operand2Mask: { M: true, t: true } }),
    hr(': decimal off-list 1e9', 'hr-std-delen', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP }),
    hr(': decimal off-list 1e9 masks', 'hr-std-delen', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, operand1Mask: { HM: true, h: true }, operand2Mask: { t: true } }),
    hr('× tienvoud decimal off-list 1e9', 'hr-std-vermenigvuldigen', { numberType: 'decimal', preset: 'tienvoud', maxGetal: NAT_CEILING, decimalPlaces: DP }),
    hr(': tienvoud decimal off-list 1e9', 'hr-std-delen', { numberType: 'decimal', preset: 'tienvoud', maxGetal: NAT_CEILING, decimalPlaces: DP }),
    hr('× tienvoud natural off-list 1e9', 'hr-std-vermenigvuldigen', { numberType: 'natural', preset: 'tienvoud', maxGetal: NAT_CEILING }),
    hr('gemengd decimal off-list 1e9', 'hr-std-gemengd', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, variants: ALL_VARIANTS, mix: 'cycle' }),
    hr('gemengd decimal × decimal off-list 1e9', 'hr-std-gemengd', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, variants: ['x', ':'], mix: 'cycle', decimalTimesDecimal: true }),
    hr('afronden decimal off-list 1e9', 'afronden', { subType: 'simpel', numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP, roundTargets: ['E', 't'] }),
    hr('schattend decimal off-list 1e9', 'schattend', { numberType: 'decimal', maxGetal: NAT_CEILING, decimalPlaces: DP }),
];

// Below 1e7 but named in the 2026-10-28 audit: their own tops, all operators, most decimals.
const SMALL_TOPS: Case[] = [
    hr('schattend natural', 'schattend', { numberType: 'natural', maxGetal: Math.max(...RANGES.schattendNatural), operators: ['+', '-', 'x', ':'], roundTargets: ['T', 'H', 'D'] }),
    hr('schattend decimal', 'schattend', { numberType: 'decimal', maxGetal: DEC_TOP, decimalPlaces: DP, operators: ['+', '-', 'x', ':'], roundTargets: ['E', 't', 'h'] }),
    hr('rekenvolgorde', 'rekenvolgorde', { maxGetal: Math.max(...RANGES.rekenvolgorde), operators: ['+', '-', 'x', ':'], opsCount: 4, haakjesMode: 'MAG', tableLimit: 20 }),
    ...['nemen', 'welk-percent'].map(subType => hr(`procenten ${subType}`, 'procenten', { subType, maxGetal: Math.max(...RANGES.procenten), percents: [1, 5, 10, 20, 25, 50, 75, 100] })),
    ...['negenproef', 'omgekeerde'].map(subType => hr(`controleren ${subType}`, 'controleren', { subType, maxGetal: Math.max(...RANGES.controleren), operators: ['+', '-'] })),
    ...['tabel', 'paren'].map(subType => hr(`verbanden ${subType}`, 'verbanden', { subType, reps: ['breuk', 'decimaal', 'procent'], denominators: [8, 20, 25] })),
    ...['lengte', 'inhoud', 'massa', 'oppervlakte'].map(measure => hr(`herleidingen ${measure}`, 'herleidingen', {
        measure, maxEnkel: 1_000, maxSamengesteld: Math.max(...RANGES.herleidingenSamengesteld),
        formats: ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'], compoundMode: 'volledig', areMode: 'samengesteld',
    })),
];

const CASES: Case[] = [...ADD_SUB, ...MUL, ...DIV, ...MIXED, ...CIJFER, ...GETALBEGRIP, ...OFF_LIST, ...SMALL_TOPS];

// ── exact rationals ──
interface Q { n: bigint; d: bigint }
const babs = (x: bigint) => (x < 0n ? -x : x);
const bgcd = (a: bigint, b: bigint): bigint => (b === 0n ? babs(a) : bgcd(b, a % b));
const norm = (q: Q): Q => {
    if (q.d < 0n) q = { n: -q.n, d: -q.d };
    const g = bgcd(q.n, q.d) || 1n;
    return { n: q.n / g, d: q.d / g };
};
const add = (a: Q, b: Q) => norm({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
const sub = (a: Q, b: Q) => norm({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
const mul = (a: Q, b: Q) => norm({ n: a.n * b.n, d: a.d * b.d });
const div = (a: Q, b: Q) => norm({ n: a.n * b.d, d: a.d * b.n });
const eq = (a: Q, b: Q) => a.n * b.d === b.n * a.d;
const lt = (a: Q, b: Q) => a.n * b.d < b.n * a.d;
const show = (q: Q) => `${q.n}/${q.d}`;

// A printed number ("1 234,567", "−5") as an exact rational; null when it is not plain decimal notation.
function parsePrinted(s: string): Q | null {
    // \s covers the narrow and non-breaking spaces a pupil page swaps in; U+2212 is the printed minus.
    const t = s.replace(/\s/g, '').replace('−', '-').replace(',', '.');
    const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(t);
    if (!m) return null;
    const frac = m[3] ?? '';
    const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n);
    return norm({ n, d: 10n ** BigInt(frac.length) });
}

interface Frac { n: number; d: number; whole?: number }
const isFrac = (v: unknown): v is Frac => typeof v === 'object' && v !== null && 'n' in v && 'd' in v;

function toQ(v: unknown, dp: number | undefined, where: string, problems: string[]): Q | null {
    if (isFrac(v)) {
        const whole = BigInt(v.whole ?? 0), n = BigInt(v.n), d = BigInt(v.d);
        return norm({ n: whole * d + n, d });
    }
    if (typeof v !== 'number') { problems.push(`${where}: not a number (${JSON.stringify(v)})`); return null; }
    const printed = formatMathNumber(v, dp);
    const q = parsePrinted(printed);
    if (!q) { problems.push(`${where}: prints as "${printed}"`); return null; }
    // (b) the print round-trips to the stored value.
    if (Number(printed.replace(/\s/g, '').replace(',', '.')) !== v) problems.push(`${where}: ${v} prints as "${printed}"`);
    return q;
}

// (a) every number anywhere on the exercise.
function walkNumbers(x: unknown, path: string, problems: string[]): void {
    if (typeof x === 'number') {
        if (!Number.isFinite(x)) { problems.push(`${path}: ${x}`); return; }
        const s = String(x);
        if (/e/i.test(s)) problems.push(`${path}: exponent notation ${s}`);
        const decimals = s.split('.')[1]?.length ?? 0;
        if (decimals > 6) problems.push(`${path}: float tail ${s}`);
        // A whole number (a count, a teller) must be safe itself; a decimal must stay safe on the 1e6 grid.
        if (Number.isInteger(x) ? !Number.isSafeInteger(x) : !Number.isSafeInteger(Math.round(x * SCALE))) problems.push(`${path}: ${s} is past 2^53 (scaled)`);
        return;
    }
    if (Array.isArray(x)) { x.forEach((v, i) => walkNumbers(v, `${path}[${i}]`, problems)); return; }
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walkNumbers(v, `${path}.${k}`, problems);
}

interface Eqn { operands: unknown[]; operator: string; operators?: string[]; answer: unknown; remainder?: number; decimalPlaces?: number }
const isEquation = (x: unknown): x is Eqn =>
    !!x && typeof x === 'object' && Array.isArray((x as Eqn).operands) && typeof (x as Eqn).operator === 'string' && 'answer' in (x as object);

// (c) the answer against BigInt arithmetic on the printed operands (left to right, as mathEngine builds chains).
function checkEquation(ex: Eqn, cijfer: boolean, problems: string[]): void {
    const dp = cijfer ? ex.decimalPlaces : undefined;
    const ops = ex.operators ?? ex.operands.slice(1).map(() => ex.operator);
    const qs = ex.operands.map((o, i) => toQ(o, dp, `operand${i}`, problems));
    const answer = toQ(ex.answer, dp, 'answer', problems);
    if (qs.some(q => !q) || !answer) return;
    const terms = qs as Q[];
    const text = `${ex.operands.map(o => (isFrac(o) ? `${o.whole ?? ''} ${o.n}/${o.d}` : formatMathNumber(o as number, dp))).join(` ${ex.operator} `)} = ${isFrac(ex.answer) ? JSON.stringify(ex.answer) : formatMathNumber(ex.answer as number, dp)}`;
    const rem = ex.remainder ?? 0;

    if (ops.length === 1 && ops[0] === ':' && (rem !== 0 || cijfer)) {
        // A division with a rest (met rest, or a staartdeling truncated after dp decimals): a = q·b + r, 0 ≤ r < b·10^-dp.
        const r = toQ(rem, undefined, 'remainder', problems);
        if (!r) return;
        const [a, b] = terms;
        if (!eq(add(mul(answer, b), r), a)) problems.push(`${text} rest ${rem}: q·b + r ≠ a`);
        const unit = norm({ n: 1n, d: 10n ** BigInt(dp ?? 0) });
        if (r.n < 0n || !lt(r, mul(b, unit))) problems.push(`${text} rest ${rem}: rest out of range`);
        return;
    }
    let acc = terms[0];
    for (let i = 1; i < terms.length; i++) {
        const op = ops[i - 1];
        acc = op === '+' ? add(acc, terms[i]) : op === '-' ? sub(acc, terms[i]) : op === 'x' ? mul(acc, terms[i]) : div(acc, terms[i]);
    }
    if (!eq(acc, answer)) problems.push(`${text}: exact ${show(acc)}`);
}

function run(cs: Case, seed: number): { made: number; problems: string[] } {
    const realRandom = Math.random;
    Math.random = mulberry32(seed);
    try {
        const block = makeBlock(cs.typeId, { constraints: cs.c, block: { numberOfExercises: COUNT } });
        const { items } = generateForBlock(block);
        const problems: string[] = [];
        const cijfer = cs.typeId.startsWith('cijferen-');
        items.forEach((ex, i) => {
            const local: string[] = [];
            walkNumbers(ex, 'ex', local);
            if (isEquation(ex)) checkEquation(ex, cijfer, local);
            problems.push(...local.map(p => `#${i} ${p}`));
        });
        return { made: items.length, problems };
    } finally {
        Math.random = realRandom;
    }
}

describe.each(CASES.map(c => [c.label, c] as const))('safe integers: %s', (_label, cs) => {
    test.each(SEEDS)('seed %i', (seed) => {
        const { made, problems } = run(cs, seed);
        expect(made, 'the case must produce exercises to prove anything').toBeGreaterThan(0);
        expect(problems.slice(0, 12)).toEqual([]);
    });
});
