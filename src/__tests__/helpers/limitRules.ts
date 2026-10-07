import type {
    Equation, Fraction, CijferExercise, FractionExercise, SplitsenExercise, BreukBewerkExercise, OrdenenExercise,
    DeelbaarheidExercise, PlaatswaardeExercise, EvenOnevenExercise, RomeinseExercise, AfrondenExercise,
    HerleidingExercise, VergelijkenExercise, MeetExercise, PatroonExercise, DeelbaarheidKleurExercise,
    GetallenasExercise, TemperatuurExercise, SchattendExercise, VerbandExercise, ProcentExercise,
    MaateenheidExercise, GeldRekenenExercise, RekenvolgordeExercise, GetalFunctieExercise, TijdsduurExercise,
    KalenderExercise, ControleExercise, WeegschaalExercise, ClockExercise, GeldExercise, GeldWisselExercise,
    GeldTeruggevenExercise, MabExercise, MathBlock,
} from '../../services/math/types';
import type { MixedVariantId } from '../../services/math/constraintTypes';
import { REGISTRY } from '../../config/exerciseRegistry';
import { GRADE_PRESETS, type Leerjaar } from '../../config/gradePresets';
import { targetsFor, roundTo } from '../../services/afronden/afrondenGenerator';
import { effectiveBlockFor } from '../../services/math/mixedGenerator';
import { ladderFor } from '../../services/herleidingen/herleidingenGenerator';
import { NIVEAU_MAX } from '../../services/romeinse/romeinseGenerator';
import { numberMatchesMask } from '../../services/math/mathEngine';
import { scaled, isFraction, fracValue, numValue, applyOp, evaluateChain, evaluateTokens, gcd } from './answerKeys';

// ── The limit harness rule book ──────────────────────────────────────────────
// Per generating typeId: an extractor (the numbers a pupil sees or writes: operands,
// answers, intermediates — never ids or indices) and the rules that encode what the
// config UI promises ("Maximum uitkomst", "Max. noemer", "Zijden tot …"). A rule returns
// violations; whether a violation is a KNOWN bug is decided by limits.knownBugs.ts, not here.
//
// Deliberately NOT rules (owner decisions 2026-10-07): herleidingen converted magnitudes
// (only the top-unit coefficient is capped), getalfunctie templates, the vergelijken
// fraction side, stale masks after lowering the max, breuken-rangschikken 'speciale',
// the lengte-meten path total, omtrek vierhoek/cirkel minimum, cijferen decimal-divisor
// quotient size, geld-teruggeven paid/change, standalone hr tienvoud overshoot (labelled),
// verbanden padded noemers (noted), deelbaarheid-kleuren rectangle padding, geld-rekenen
// intrest new balance, klok/kalender by-design items, a stale minGetal (a Config hint).

export interface Violation { rule: string; observed: unknown; limit: unknown; example: string }

export interface CheckContext {
    typeId: string;
    block: MathBlock;
    c: Record<string, unknown>;
    requested: number;
    grade: Leerjaar | null;
    leafId?: string;
    // The generation note the Inspector shows (generateNoted), null when the block is as asked.
    note: string | null;
}

export interface Extracted { operands: number[]; answers: number[]; intermediates: number[]; shown: number[] }

type Push = (rule: string, observed: unknown, limit: unknown, example: string) => void;
type C = Record<string, unknown>;

interface TypeSpec<E> {
    extract: (ex: E) => Extracted;
    item?: (ex: E, ctx: CheckContext, push: Push) => void;
    block?: (items: E[], ctx: CheckContext, push: Push) => void;
    // false = an exercise without numbers is legitimate (shape recognition, word-only items).
    numeric?: boolean;
}

// Float slack for decimal comparisons; the engine itself works in scaled integers.
const EPS = 1e-9;
const over = (v: number, limit: number) => v > limit + EPS * Math.max(1, Math.abs(limit));
const n = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const fin = (xs: unknown[]): number[] => xs.filter((x): x is number => typeof x === 'number');
const ex4 = (operands: number[], answers: number[], intermediates: number[] = [], extra: number[] = []): Extracted =>
    ({ operands, answers, intermediates, shown: [...operands, ...answers, ...intermediates, ...extra] });
const fmtF = (f: Fraction) => `${f.whole ? `${f.whole} ` : ''}${f.n}/${f.d}`;
const fmtV = (v: number | Fraction) => (isFraction(v) ? fmtF(v) : String(v));
// Same number, rounding noise allowed relative to its size (1e9 × 1e6 is near 2^53).
const sameNum = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) || scaled(a) === scaled(b);
const decimalsOf = (x: number) => { const s = String(Math.round(x * 1e9) / 1e9); const i = s.indexOf('.'); return i < 0 || s.includes('e') ? 0 : s.length - i - 1; };

// L20 (owner rule): Leerjaar 1 seeds max 20 only on these lists; every other list floors
// to its own lowest preset. Data, so widening the set is a one-line change.
export const GRADE1_MAX_20_TYPES: readonly string[] = ['vergelijken', 'plaatswaarde'];

// ── Hoofdrekenen ─────────────────────────────────────────────────────────────

const fracParts = (v: number | Fraction): number[] => (isFraction(v) ? [v.whole ?? 0, v.n, v.d].filter(x => x !== 0) : [v]);
const extractEq = (e: Equation): Extracted => ex4(
    e.operands.flatMap(fracParts),
    [...fracParts(e.answer), ...(e.remainder ? [e.remainder] : [])],
    fin(e.steps ?? []),
);
const fmtEq = (e: Equation) => `${e.operands.map(fmtV).join(` ${e.operator} `)} = ${fmtV(e.answer)}${e.remainder ? ` r ${e.remainder}` : ''}${e.variant ? ` [${e.variant}]` : ''}`;

interface HrMode { op: '+' | '-' | 'x' | ':'; gemengd: boolean; variant?: MixedVariantId }

function checkHr(e: Equation, c: C, mode: HrMode, ctx: CheckContext, push: Push) {
    const ex = fmtEq(e);
    const nt = (c.numberType as string) ?? 'natural';
    const preset = (c.preset as string) ?? 'vrij';
    const multMode = (c.multiplicationMode as string) ?? 'tafels';

    if (nt === 'rational') {
        const addSub = mode.op === '+' || mode.op === '-';
        const fmm = (c.fractionMultMode as string) ?? 'fraction_fraction';
        e.operands.forEach((o, i) => {
            if (isFraction(o)) {
                // Natural/decimal × fraction keeps its fraction in the second slot's caps; a 3-4 term
                // chain is all fractions, capped per position like fraction × fraction.
                const perSlot = addSub || fmm === 'fraction_fraction' || e.operands.length > 2;
                const maxD = perSlot ? n(i === 0 ? c.maxDenominator1 : c.maxDenominator2, 10) : n(c.maxDenominator2, 10);
                if (o.d > maxD) push('denominator>max', o.d, maxD, ex);
            } else if (fmm === 'decimal_fraction' && !addSub && !(o > 0)) {
                push('decimal-operand<=0', o, 0, ex);
            }
        });
        const want = evaluateChain(e);
        const got = numValue(e.answer);
        if (Math.abs(want - got) > 1e-9 * Math.max(1, Math.abs(want))) push('answer-key', got, want, ex);
        return;
    }

    const ops = e.operands.map(numValue);
    const operandMax = Array.isArray(c.operandMax) ? (c.operandMax as (number | null)[]) : [];
    ops.forEach((v, i) => {
        const om = operandMax[i];
        if (typeof om === 'number' && om > 0 && over(v, om)) push('operand>operandMax', v, om, ex);
    });
    if (c.excludeOne && mode.op === 'x' && preset !== 'tienvoud' && ops.includes(1)) push('excludeOne', 1, 'no factor 1', ex);

    const max = n(c.maxGetal, 1000);
    const ans = numValue(e.answer);
    const dividend = ops[0];
    if (mode.op === '+') {
        if (over(ans, max)) push('answer>max', ans, max, ex);
    } else if (mode.op === '-') {
        if (over(ops[0], max)) push('operand>max', ops[0], max, ex);
    } else if (mode.op === 'x') {
        // Standalone tafels have no max picker and tienvoud's overshoot is labelled; gemengd's
        // shared "Maximum uitkomst" holds for every variant (L2).
        const capped = mode.gemengd || (preset !== 'tienvoud' && (nt === 'decimal' || multMode === 'andere'));
        if (capped && over(ans, max)) push('answer>max', ans, max, ex);
    } else {
        if (multMode === 'met_rest' && nt !== 'decimal' && preset !== 'tienvoud') {
            if (over(dividend, max)) push('dividend>max', dividend, max, ex);
            const gradeMax = ctx.grade ? GRADE_PRESETS[ctx.grade].baseMaxGetal : undefined;
            if (gradeMax !== undefined && over(dividend, gradeMax)) push('dividend>gradeMax', dividend, gradeMax, ex);
        } else if (preset === 'tienvoud') {
            // gemengd ':tienvoud': the capped "uitkomst" is the quotient (L2 caps tienvoud answers).
            if (mode.gemengd && over(ans, max)) push('answer>max', ans, max, ex);
        } else if (mode.gemengd || nt === 'decimal' || multMode === 'andere') {
            if (over(dividend, max)) push('dividend>max', dividend, max, ex);
        }
        if (nt === 'decimal' && preset !== 'tienvoud' && over(ans, max)) push('quotient>max', ans, max, ex);
    }

    // The printed key: q × divisor + r = dividend for met rest, the plain chain otherwise.
    if (e.remainder !== undefined && e.remainder > 0) {
        const div = ops[1];
        if (!sameNum(ans * div + e.remainder, dividend) || e.remainder >= div) push('answer-key', `${ans} r ${e.remainder}`, `${dividend} : ${div}`, ex);
    } else if (!sameNum(evaluateChain(e), ans)) {
        push('answer-key', ans, evaluateChain(e), ex);
    }
}

const hrSpec = (op: HrMode['op']): TypeSpec<Equation> => ({
    extract: extractEq,
    item: (e, ctx, push) => checkHr(e, ctx.c, { op, gemengd: false }, ctx, push),
});

const gemengdSpec: TypeSpec<Equation> = {
    extract: extractEq,
    item: (e, ctx, push) => {
        const variant = (e.variant ?? '+') as MixedVariantId;
        const eff = effectiveBlockFor(ctx.block, variant).constraints as C;
        // Tag each rule with its variant so a known bug can name the variants it covers.
        const tagged: Push = (rule, observed, limit, example) => push(`${rule}@${variant}`, observed, limit, example);
        checkHr(e, eff, { op: e.operator, gemengd: true, variant }, ctx, tagged);
    },
};

// ── Cijferen ─────────────────────────────────────────────────────────────────

const cijferSpec: TypeSpec<CijferExercise> = {
    extract: e => ex4(e.operands, [e.answer, ...(e.remainder ? [e.remainder] : [])]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxRange, 1000);
        const dec = c.numberType === 'decimal';
        const [a, b] = e.operands;
        const ex = `${e.operands.join(` ${e.operator} `)} = ${e.answer}${e.remainder ? ` r ${e.remainder}` : ''}`;
        if (e.operator === '+') {
            if (over(e.answer, max)) push('answer>max', e.answer, max, ex);
            if (!sameNum(e.operands.reduce((s, x) => s + x, 0), e.answer)) push('answer-key', e.answer, e.operands.reduce((s, x) => s + x, 0), ex);
        } else if (e.operator === '-') {
            if (over(a, max)) push('operand>max', a, max, ex);
            if (!sameNum(e.operands.slice(1).reduce((s, x) => s - x, a), e.answer)) push('answer-key', e.answer, a - b, ex);
        } else if (e.operator === 'x') {
            if (over(e.answer, max)) push('answer>max', e.answer, max, ex);
            for (const o of e.operands) if (over(o, max)) push('operand>max', o, max, ex);
            if (!sameNum(a * b, e.answer)) push('answer-key', e.answer, a * b, ex);
        } else {
            if (over(a, max)) push('dividend>max', a, max, ex);
            if (!(e.answer > 0)) push('quotient<=0', e.answer, 0, ex);
            if (!dec && b < 2) push('divisor<2', b, 2, ex);
            if (dec ? Math.abs(e.answer * b + e.remainder - a) > 1e-6 : e.answer * b + e.remainder !== a || e.remainder >= b) {
                push('answer-key', `${e.answer} r ${e.remainder}`, `${a} : ${b}`, ex);
            }
        }
    },
};

// ── Getalbegrip ──────────────────────────────────────────────────────────────

const valueRange = (values: number[], lo: number, hi: number, ex: string, push: Push) => {
    for (const v of values) {
        if (over(v, hi)) push('value>max', v, hi, ex);
        if (v < lo - EPS * Math.max(1, Math.abs(lo))) push('value<min', v, lo, ex);
    }
};

const splitsenSpec: TypeSpec<SplitsenExercise> = {
    extract: e => ex4([e.total], e.pairs.flatMap(p => [p.given, p.answer]), [], (e.placeBreakdown ?? []).map(p => p.digit * p.weight)),
    item: (e, ctx, push) => {
        const max = n(ctx.c.maxGetal, 10);
        const ex = `${e.total} → ${e.pairs.map(p => `${p.given}+${p.answer}`).join(', ')}`;
        if (over(e.total, max)) push('value>max', e.total, max, ex);
        for (const p of e.pairs) if (!sameNum(p.given + p.answer, e.total)) push('answer-key', p.given + p.answer, e.total, ex);
        if (e.placeBreakdown?.length) {
            const sum = e.placeBreakdown.reduce((s, p) => s + p.digit * p.weight, 0);
            if (!sameNum(sum, e.total)) push('answer-key', sum, e.total, ex);
        }
    },
};

const mabSpec: TypeSpec<MabExercise> = {
    extract: e => ex4([e.value], [e.thousands, e.hundreds, e.tens, e.units]),
    item: (e, ctx, push) => {
        const max = n(ctx.c.maxNumber, 100);
        const ex = `${e.value}`;
        if (over(e.value, max)) push('value>max', e.value, max, ex);
        if (e.value < 1) push('value<min', e.value, 1, ex);
        if (e.thousands * 1000 + e.hundreds * 100 + e.tens * 10 + e.units !== e.value) push('answer-key', `${e.thousands}D${e.hundreds}H${e.tens}T${e.units}E`, e.value, ex);
    },
};

const gradeMaxRule = (items: unknown[], ctx: CheckContext, push: Push) => {
    void items;
    if (ctx.grade !== 1 || !GRADE1_MAX_20_TYPES.includes(ctx.typeId)) return;
    const max = n(ctx.c.maxGetal, Infinity);
    const limit = GRADE_PRESETS[1].baseMaxGetal ?? 20;
    if (over(max, limit)) push('seeded-max>grade', max, limit, `leerjaar 1 seeds max ${max}`);
};

const plaatswaardeSpec: TypeSpec<PlaatswaardeExercise> = {
    extract: e => ex4([e.number], []),
    item: (e, ctx, push) => {
        const max = n(ctx.c.maxGetal, 1000);
        valueRange([e.number], EPS, max, `${e.number}`, push);
    },
    block: gradeMaxRule,
};

const vergelijkenSpec: TypeSpec<VergelijkenExercise> = {
    extract: e => ex4(fin([e.a, e.b, ...(e.numbers ?? [])]), []),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 1000);
        const sub = (c.subType as string) ?? 'getallen';
        if (sub === 'representaties') {
            // The breuk side follows its own teller/noemer caps, not the max picker (owner call).
            const sides: Array<[unknown, number | undefined]> = [[c.leftRep, e.a], [c.rightRep, e.b]];
            for (const [rep, v] of sides) {
                if (rep !== 'breuk' && typeof v === 'number' && over(v, max)) push('value>max', v, max, `${e.a} vs ${e.b} (${c.leftRep}/${c.rightRep})`);
            }
            return;
        }
        const nums = sub === 'kiezen' ? e.numbers ?? [] : fin([e.a, e.b]);
        valueRange(nums, EPS, max, nums.join(' / '), push);
        if (sub === 'kiezen' && nums.length !== n(c.setSize, 3)) push('set-size', nums.length, c.setSize, nums.join(' / '));
    },
    block: gradeMaxRule,
};

const afrondenSpec: TypeSpec<AfrondenExercise> = {
    extract: e => ex4(fin([e.number, ...(e.numbers ?? [])]), []),
    item: (e, ctx, push) => {
        const max = n(ctx.c.maxGetal, 1000);
        const nums = fin([e.number, ...(e.numbers ?? [])]);
        valueRange(nums, EPS, max, nums.join(' / '), push);
    },
};

const evenOnevenSpec: TypeSpec<EvenOnevenExercise> = {
    extract: e => ex4(fin([e.number, ...(e.numbers ?? [])]), []),
    item: (e, ctx, push) => {
        const max = n(ctx.c.maxGetal, 100);
        if (ctx.c.subType === 'cirkels') valueRange(fin([e.number]), 2, Math.min(max, 24), `${e.number}`, push);
        else valueRange(e.numbers ?? [], 1, max, (e.numbers ?? []).join(' '), push);
    },
};

const romeinseSpec: TypeSpec<RomeinseExercise> = {
    extract: e => ex4([e.value], []),
    item: (e, ctx, push) => {
        const max = NIVEAU_MAX[n(ctx.c.niveau, 2)] ?? 39;
        valueRange([e.value], 1, max, `${e.value} = ${e.roman}`, push);
        const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let t = 0;
        for (let i = 0; i < e.roman.length; i++) { const a = val[e.roman[i]] ?? NaN, b = val[e.roman[i + 1]] ?? 0; t += a < b ? -a : a; }
        if (t !== e.value) push('answer-key', e.roman, e.value, `${e.value} = ${e.roman}`);
    },
};

const deelbaarheidSpec: TypeSpec<DeelbaarheidExercise> = {
    extract: e => ex4(fin([e.number, e.base]), e.sequence ?? []),
    item: (e, ctx, push) => {
        if (ctx.c.layout === 'veelvouden') {
            const seq = e.sequence ?? [];
            if (seq.some((v, i) => v !== (e.base ?? 0) * i)) push('answer-key', seq.join(','), `multiples of ${e.base}`, seq.join(','));
            return;
        }
        valueRange(fin([e.number]), 10, n(ctx.c.maxGetal, 1000), `${e.number}`, push);
    },
};

const deelbaarheidKleurSpec: TypeSpec<DeelbaarheidKleurExercise> = {
    extract: e => ex4([e.divisor, ...e.numbers], []),
    item: (e, ctx, push) => valueRange(e.numbers, 1, n(ctx.c.maxGetal, 100), `: ${e.divisor} over ${e.numbers.slice(0, 6).join(' ')}…`, push),
};

const ordenenSpec: TypeSpec<OrdenenExercise> = {
    extract: e => ex4(e.values.flatMap(fracParts), []),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const nt = (c.numberType as string) ?? 'natural';
        const max = n(c.maxGetal, 100);
        const ex = e.display.map(fmtV).join(', ');
        if (e.values.length === 0) push('empty-exercise', 0, n(c.count, 3), '(no values)');
        else if (e.values.length < n(c.count, 3)) push('count-short', e.values.length, n(c.count, 3), ex);
        if (nt === 'rational') {
            const lo = Math.max(2, n(c.minDenominator, 2)), hi = Math.max(2, n(c.maxDenominator, 10));
            for (const v of e.values) {
                if (!isFraction(v)) continue;
                if (v.d < Math.min(lo, hi) || v.d > Math.max(lo, hi)) push('denominator>max', v.d, `${Math.min(lo, hi)}-${Math.max(lo, hi)}`, ex);
                if (c.unitFractionsOnly && v.n !== 1) push('not-unit-fraction', fmtF(v), '1/d', ex);
            }
        } else {
            const lo = nt === 'geheel' ? n(c.minGetal, -max) : 0;
            valueRange(e.values.map(numValue), lo, max, ex, push);
        }
        const vals = e.values.map(numValue);
        for (let i = 1; i < vals.length; i++) {
            const ok = e.operator === '<' ? vals[i] > vals[i - 1] : vals[i] < vals[i - 1];
            if (!ok) { push('answer-key', vals.join(','), `sorted ${e.operator}`, ex); break; }
        }
    },
};

// Getallenas / getallenrijen: rationals print as {whole, n, d}; the rest as plain numbers.
const asSpec = (isRij: boolean): TypeSpec<GetallenasExercise> => ({
    extract: e => ex4((e.values ?? []).flatMap(fracParts), [], [], [e.start]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const nt = (c.numberType as string) ?? 'natural';
        const max = n(c.maxGetal, 100);
        const vals = e.values ?? [];
        const ex = `${vals.slice(0, 8).map(fmtV).join(', ')}`;
        // A line shortened (or a step shrunk) to fit its bounds is intended only when the note says so.
        if (!ctx.note && (e.tickCount < n(c.ticks, 6) || (nt !== 'rational' && !sameNum(e.step, n(c.step, 5) || 1)))) {
            push('line-shrunk-silently', `${e.tickCount} × +${e.step}`, `${n(c.ticks, 6)} × +${n(c.step, 5)}`, ex);
        }
        if (nt === 'rational') {
            const d = n(c.fractionStep, 4) > 1 ? n(c.fractionStep, 4) : 4;
            for (const v of vals) {
                if (isFraction(v) && v.d <= 0) push('negative-denominator', v.d, 1, ex);
                const x = numValue(v);
                if (x < -EPS) push('value<min', x, 0, ex);
                if (isRij && over(x * d, n(c.maxTeller, 25))) push('teller>maxTeller', Math.round(x * d), c.maxTeller, ex);
            }
            return;
        }
        const lo = nt === 'geheel' ? n(c.minGetal, -max) : 0;
        valueRange(vals.map(numValue), lo, max, ex, push);
        // getallenrijen 'Specifieke getalopbouw' shapes the first value; dropping it needs a note.
        const mask = c.numberMask as Record<string, boolean> | undefined;
        if (isRij && !ctx.note && (nt === 'natural' || nt === 'decimal') && mask && !numberMatchesMask(e.start, mask, max, nt, decimalsOf(e.step))) {
            push('mask-ignored', e.start, Object.keys(mask).filter(k => mask[k]).join(','), ex);
        }
    },
});

// PatroonViewer prints one connector per gap (ticks − 1), so with steps ≥ ticks the tail of the
// cycle is never on the sheet and is no displayed value.
const printedCycle = (e: PatroonExercise) => e.cycle.slice(0, Math.max(0, e.values.length - 1));

const patroonSpec: TypeSpec<PatroonExercise> = {
    extract: e => ex4(printedCycle(e).map(s => s.operand), e.values),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const nt = (c.numberType as string) ?? 'natural';
        const max = n(c.maxGetal, 100);
        const ops = (c.ops as string[] | undefined) ?? ['+'];
        const os = (c.opSettings as Record<string, { max?: number; mask?: Record<string, boolean> }> | undefined) ?? {};
        const steps = Math.min(4, Math.max(1, n(c.steps, 1)));
        const dp = nt === 'decimal' ? Math.min(3, Math.max(1, n(c.maxDecimals, 1))) : 0;
        const ex = `${e.values.join(', ')} [${e.cycle.map(s => `${s.op}${s.operand}`).join(' ')}]`;
        valueRange(e.values, nt === 'geheel' ? n(c.minGetal, -max) : 0, max, ex, push);
        for (const v of e.values) if (decimalsOf(v) > dp) push('decimals>max', decimalsOf(v), dp, ex);
        if (e.cycle.length !== steps || e.cycle.some(s => !ops.includes(s.op))) {
            push('fallback-ladder', e.cycle.map(s => s.op).join(''), ops.join(''), ex);
        } else {
            for (const s of printedCycle(e)) {
                const opMax = n(os[s.op]?.max, 10);
                const lim = s.op === '+' || s.op === '-' ? opMax : Math.min(opMax, 12);
                if (over(s.operand, lim)) push('step>opMax', s.operand, lim, ex);
                // A +/− mask that cannot fit under "Stap (max)" is dropped, which needs a note.
                const mask = os[s.op]?.mask;
                if ((s.op === '+' || s.op === '-') && !ctx.note && mask && !numberMatchesMask(s.operand, mask, max, nt === 'decimal' ? 'decimal' : 'natural', dp)) {
                    push('mask-ignored', s.operand, Object.keys(mask).filter(k => mask[k]).join(','), ex);
                }
            }
        }
        for (let i = 1; i < e.values.length; i++) {
            const s = e.cycle[(i - 1) % e.cycle.length];
            if (!sameNum(applyOp(e.values[i - 1], s.op, s.operand), e.values[i])) { push('answer-key', e.values[i], applyOp(e.values[i - 1], s.op, s.operand), ex); break; }
        }
    },
};

const kettingSpec: TypeSpec<PatroonExercise> = {
    extract: e => ex4(e.cycle.map(s => s.operand), e.values),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 100);
        const ops = (c.ops as string[] | undefined) ?? ['+', '-'];
        const os = (c.opSettings as Record<string, { max?: number }> | undefined) ?? {};
        const ex = `${e.values.join(' → ')} [${e.cycle.map(s => `${s.op}${s.operand}`).join(' ')}]`;
        valueRange(e.values, 0, max, ex, push);
        for (const v of e.values) if (!Number.isInteger(v)) push('non-integer', v, 'integer', ex);
        // The "+1 ladder" (1, 2, 3, …) is the fallback when the chosen operations found no chain.
        const ladder = e.cycle.every(s => s.op === '+' && s.operand === 1) && e.values.every((v, i) => v === i + 1);
        // With '+' as the only operation a +1 chain from 1 is a legitimate draw, not the fallback.
        if (ladder && !(ops.length === 1 && ops[0] === '+')) {
            push('fallback-ladder', '+1', ops.join(''), ex);
        } else {
            for (const s of e.cycle) {
                if (!ops.includes(s.op)) push('op-not-selected', s.op, ops.join(''), ex);
                const lim = s.op === '+' || s.op === '-' ? n(os[s.op]?.max, 10) : 10;
                if (over(s.operand, lim)) push('step>opMax', s.operand, lim, ex);
            }
        }
        for (let i = 1; i < e.values.length; i++) {
            const s = e.cycle[(i - 1) % e.cycle.length];
            if (!sameNum(applyOp(e.values[i - 1], s.op, s.operand), e.values[i])) { push('answer-key', e.values[i], applyOp(e.values[i - 1], s.op, s.operand), ex); break; }
        }
    },
};

const getalfunctieSpec: TypeSpec<GetalFunctieExercise> = {
    // Template numbers (house numbers, postcodes) are not bound by the max (owner call).
    extract: e => ex4([], [], [], fin([Number(String(e.number).replace(/\D/g, '')) || undefined])),
    numeric: false,
};

const herleidingenSpec: TypeSpec<HerleidingExercise> = {
    extract: e => ex4(e.fromParts.map(p => p.value), e.toParts.map(p => p.value)),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const ladder = ladderFor((c.measure as string) ?? 'lengte');
        const factor = (k: string) => ladder.find(u => u.key === k)?.factor ?? NaN;
        const parts = [...e.fromParts, ...e.toParts];
        const ex = `${e.fromParts.map(p => `${p.value} ${p.key}`).join(' ')} = ${e.toParts.map(p => `${p.value} ${p.key}`).join(' ')}`;
        const samengesteld = e.format === 'samengesteld-enkel' || e.format === 'enkel-samengesteld'
            || ((e.format === 'vierkant-are' || e.format === 'are-vierkant') && (c.areMode ?? 'samengesteld') === 'samengesteld');
        const cap = samengesteld ? n(c.maxSamengesteld, 1000) : n(c.maxEnkel, 100);
        // Only the largest unit's coefficient is capped; the converted side may be far bigger (owner call).
        const top = parts.reduce((a, b) => (factor(b.key) > factor(a.key) ? b : a));
        if (over(top.value, cap)) push('top-unit>cap', top.value, cap, ex);
        const units = (c.units as string[] | undefined) ?? [];
        // Fewer than two of this measure's units ticked: the generator uses the whole ladder.
        const ownUnits = ladder.filter(u => units.includes(u.key)).length >= 2;
        if (e.format !== 'vierkant-are' && e.format !== 'are-vierkant' && ownUnits) {
            for (const p of parts) if (!units.includes(p.key)) push('unit-not-selected', p.key, units.join(','), ex);
        }
        const total = (ps: typeof parts) => ps.reduce((s, p) => s + p.value * factor(p.key), 0);
        if (!sameNum(total(e.fromParts), total(e.toParts))) push('answer-key', total(e.toParts), total(e.fromParts), ex);
    },
};

// ── Breuken ──────────────────────────────────────────────────────────────────

const breukenSpec: TypeSpec<FractionExercise> = {
    extract: e => ex4(fin([e.numerator, e.denominator]), fin([e.total, e.lineLength, e.rectangleWidth, e.rectangleHeight])),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const ex = `${e.numerator}/${e.denominator}${e.total ? ` van ${e.total}` : ''}${e.lineLength ? ` van ${e.lineLength} cm` : ''}`;
        const lo = n(c.minDenominator, 2), hi = n(c.maxDenominator, 8);
        if (e.denominator > hi) push('denominator>max', e.denominator, hi, ex);
        if (e.denominator < Math.min(lo, hi)) push('denominator<min', e.denominator, lo, ex);
        if (e.numerator < 1 || e.numerator >= e.denominator) push('numerator-range', e.numerator, `1..${e.denominator - 1}`, ex);
        if ((e.subType === 'hoeveelheid' || e.subType === 'hoeveelheid-rechthoek') && e.total !== undefined) {
            if (over(e.total, n(c.maxTotal, 20))) push('total>maxTotal', e.total, n(c.maxTotal, 20), ex);
        }
        if (e.subType === 'hoeveelheid-abstract' && e.total !== undefined && n(c.level, 1) === 3 && over(e.total, n(c.maxAbstractN3, 1000))) {
            push('total>maxTotal', e.total, n(c.maxAbstractN3, 1000), ex);
        }
        if (e.total !== undefined && e.subType?.startsWith('hoeveelheid') && e.total % e.denominator !== 0) push('answer-key', e.total, `multiple of ${e.denominator}`, ex);
        if (e.subType === 'lijnstuk' && e.lineLength !== undefined && over(e.lineLength, n(c.maxLineLength, 12))) push('length>max', e.lineLength, n(c.maxLineLength, 12), ex);
        if (e.coloredIndices && e.coloredIndices.length !== e.numerator) push('answer-key', e.coloredIndices.length, e.numerator, ex);
    },
};

const breukBewerkSpec: TypeSpec<BreukBewerkExercise> = {
    extract: e => ex4(e.inputs.flatMap(fracParts), e.answers.flatMap(fracParts)),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const ex = `${e.inputs.map(fmtF).join(' , ')} → ${e.answers.map(fmtF).join(' , ')}`;
        const maxN = n(c.maxNumerator, 10), maxD = n(c.maxDenominator, 10), minD = n(c.minDenominator, 2);
        if (e.subType === 'gemengd') {
            const imp = e.direction === 'naar-gemengd' ? e.inputs[0] : e.answers[0];
            if (imp.n > maxN) push('numerator>max', imp.n, maxN, ex);
            if (imp.d > maxD) push('denominator>max', imp.d, maxD, ex);
        } else if (e.subType === 'vereenvoudigen') {
            const i = e.inputs[0], a = e.answers[0];
            if (i.n > maxN) push('numerator>max', i.n, maxN, ex);
            if (i.d > maxD) push('denominator>max', i.d, maxD, ex);
            if (!c.allowIrreducible && gcd(a.n, a.d) !== 1) push('answer-key', fmtF(a), 'lowest terms', ex);
        } else {
            for (const f of e.inputs) {
                if (f.d > maxD) push('denominator>max', f.d, maxD, ex);
                if (f.d < minD) push('denominator<min', f.d, minD, ex);
            }
            const target = c.targetDen;
            if (target !== '' && target !== undefined && target !== null && e.answers[0]?.d !== Number(target)) push('targetDen-ignored', e.answers[0]?.d, Number(target), ex);
            if (e.answers.length === 2 && e.answers[0].d !== e.answers[1].d) push('answer-key', ex, 'equal denominators', ex);
        }
        e.inputs.forEach((f, i) => {
            const a = e.answers[i];
            if (a && Math.abs(fracValue(a) - fracValue(f)) > 1e-9) push('answer-key', fmtF(a), fmtF(f), ex);
        });
    },
};

const rangschikkenSpec: TypeSpec<OrdenenExercise> = {
    extract: e => ex4(e.values.flatMap(fracParts), []),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const mode = (c.fractionMode as string) ?? 'stambreuken';
        const ex = e.display.map(fmtV).join(', ');
        if (e.values.length === 0) { push('empty-exercise', 0, n(c.count, 4), '(no values)'); return; }
        // 'speciale' uses its own benchmark fractions, not the noemer range (owner call).
        if (mode !== 'speciale') {
            const lo = n(c.minDenominator, 2), hi = n(c.maxDenominator, 10);
            for (const v of e.values) if (isFraction(v) && (v.d > hi || v.d < Math.min(lo, hi))) push('denominator>max', v.d, `${lo}-${hi}`, ex);
        }
        if (mode === 'stambreuken') for (const v of e.values) if (isFraction(v) && v.n !== 1) push('not-unit-fraction', fmtF(v), '1/d', ex);
        const vals = e.values.map(numValue);
        for (let i = 1; i < vals.length; i++) {
            const ok = e.operator === '<' ? vals[i] >= vals[i - 1] : vals[i] <= vals[i - 1];
            if (!ok) { push('answer-key', vals.join(','), `sorted ${e.operator}`, ex); break; }
        }
    },
};

const verbandenSpec: TypeSpec<VerbandExercise> = {
    extract: e => ex4([e.fraction.n, e.fraction.d], []),
    item: (e, ctx, push) => {
        const reps = (ctx.c.reps as string[] | undefined) ?? [];
        const ex = `${fmtF(e.fraction)} given ${e.given}${e.target ? ` → ${e.target}` : ''}`;
        if (!reps.includes(e.given)) push('given-not-in-reps', e.given, reps.join(','), ex);
        if (e.target && !reps.includes(e.target)) push('target-not-in-reps', e.target, reps.join(','), ex);
        if (e.fraction.n < 1 || e.fraction.n >= e.fraction.d) push('numerator-range', e.fraction.n, `1..${e.fraction.d - 1}`, ex);
    },
};

// ── Bewerkingen (rest) ───────────────────────────────────────────────────────

const schattendSpec: TypeSpec<SchattendExercise> = {
    extract: e => ex4([e.a, e.b], [applyOp(e.a, e.operator, e.b)]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 1000);
        const ex = `${e.a} ${e.operator} ${e.b} (${e.targetKey})`;
        if (over(e.a, max)) push('operand>max', e.a, max, ex);
        if (over(e.b, max)) push('operand>max', e.b, max, ex);
        // Owner rule (L17): the exact result stays within the max, not only the operands.
        const result = applyOp(e.a, e.operator, e.b);
        if (over(result, max)) push('result>max', result, max, ex);
        // The estimate the key prints (rounded operands) is part of the result: it stays within the max too.
        const tw = targetsFor(c.numberType === 'decimal' ? 'decimal' : 'natural').find(t => t.key === e.targetKey)?.weight;
        if (tw) {
            const ra = roundTo(e.a, tw), rb = e.operator === '+' || e.operator === '-' ? roundTo(e.b, tw) : e.b;
            const est = applyOp(ra, e.operator, rb);
            if (over(est, max)) push('estimate>max', est, max, ex);
        }
        // A target that cannot round at this max is swapped for the nearest valid one WITH a note: intended.
        if (!ctx.note && !((c.roundTargets as string[] | undefined) ?? []).includes(e.targetKey)) push('target-not-selected', e.targetKey, (c.roundTargets as string[] | undefined)?.join(','), ex);
        if (!((c.operators as string[] | undefined) ?? []).includes(e.operator)) push('op-not-selected', e.operator, (c.operators as string[] | undefined)?.join(','), ex);
    },
};

const controlerenSpec: TypeSpec<ControleExercise> = {
    extract: e => ex4([e.a, e.b], [e.correctAnswer], [], [e.shownAnswer]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 1000);
        const ex = `${e.a} ${e.operator} ${e.b} = ${e.shownAnswer} (juist ${e.correctAnswer})`;
        // Owner rule (L18): the result stays within the max, as for schattend.
        if (over(e.correctAnswer, max)) push('result>max', e.correctAnswer, max, ex);
        if (over(e.a, max)) push('operand>max', e.a, max, ex);
        if (over(e.b, max)) push('operand>max', e.b, max, ex);
        if (applyOp(e.a, e.operator, e.b) !== e.correctAnswer) push('answer-key', e.correctAnswer, applyOp(e.a, e.operator, e.b), ex);
        if (c.foutAandeel === 'geen' && e.shownAnswer !== e.correctAnswer) push('answer-key', e.shownAnswer, e.correctAnswer, ex);
        if (c.foutAandeel === 'alles' && e.shownAnswer === e.correctAnswer) push('answer-key', e.shownAnswer, 'a planted error', ex);
    },
};

// Largest value met while evaluating: brackets first, then x and : before + and -.
function peakIntermediate(tokens: (number | string)[]): number | null {
    let peak = 0;
    const flat = (ts: (number | string)[]): number => {
        const t = [...ts];
        for (let i = 1; i < t.length - 1; i++) {
            if (t[i] === 'x' || t[i] === ':') {
                const a = t[i - 1] as number, b = t[i + 1] as number;
                const v = t[i] === 'x' ? a * b : a / b;
                peak = Math.max(peak, v);
                t.splice(i - 1, 3, v); i--;
            }
        }
        let acc = t[0] as number;
        for (let i = 1; i < t.length - 1; i += 2) { acc = t[i] === '+' ? acc + (t[i + 1] as number) : acc - (t[i + 1] as number); peak = Math.max(peak, acc); }
        return acc;
    };
    const out: (number | string)[] = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
            const close = tokens.indexOf(')', i);
            out.push(flat(tokens.slice(i + 1, close)));
            i = close;
        } else out.push(tokens[i]);
    }
    flat(out);
    return peak;
}

const rekenvolgordeSpec: TypeSpec<RekenvolgordeExercise> = {
    extract: e => ex4(fin(e.tokens), [e.answer], [e.firstStep]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 100), tl = n(c.tableLimit, 10);
        const ex = `${e.tokens.join(' ')} = ${e.answer}`;
        if (over(e.answer, max)) push('answer>max', e.answer, max, ex);
        if (!Number.isInteger(e.answer) || e.answer < 0) push('answer-not-natural', e.answer, 'natural', ex);
        // Owner rule (L6): every intermediate result stays within the max as well.
        const peak = peakIntermediate(e.tokens);
        if (peak !== null && over(peak, max)) push('intermediate>max', peak, max, ex);
        for (let k = 0; k < e.tokens.length; k++) {
            if (e.tokens[k] !== 'x' && e.tokens[k] !== ':') continue;
            for (const nb of [e.tokens[k - 1], e.tokens[k + 1]]) if (typeof nb === 'number' && nb > tl) push('factor>tableLimit', nb, tl, ex);
        }
        const ops = e.tokens.filter(t => t === '+' || t === '-' || t === 'x' || t === ':') as string[];
        const chosen = (c.operators as string[] | undefined) ?? [];
        for (const o of ops) if (!chosen.includes(o)) push('op-not-selected', o, chosen.join(''), ex);
        if (ops.length !== Math.min(4, Math.max(2, n(c.opsCount, 2)))) push('ops-count', ops.length, c.opsCount, ex);
        if (c.haakjesMode === 'GEEN' && e.tokens.includes('(')) push('brackets-mode', 'haakjes', 'GEEN', ex);
        // A MOET the operations cannot honour (× only) drops its brackets WITH a note: intended.
        if (c.haakjesMode === 'MOET' && !e.tokens.includes('(') && !ctx.note) push('brackets-mode', 'geen haakjes', 'MOET', ex);
        if (!sameNum(evaluateTokens(e.tokens), e.answer)) push('answer-key', e.answer, evaluateTokens(e.tokens), ex);
    },
};

const procentenSpec: TypeSpec<ProcentExercise> = {
    extract: e => ex4([e.percent, e.base], [e.answer]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 1000);
        const ex = `${e.percent}% van ${e.base} = ${e.answer}`;
        if (!((c.percents as number[] | undefined) ?? []).includes(e.percent)) push('percent-not-selected', e.percent, (c.percents as number[] | undefined)?.join(','), ex);
        if (over(e.base, max)) push('value>max', e.base, max, ex);
        if (!(e.base > 0)) push('value<min', e.base, 1, ex);
        if (!sameNum(e.base * e.percent / 100, e.answer) || !Number.isInteger(e.answer)) push('answer-key', e.answer, e.base * e.percent / 100, ex);
    },
};

// ── Geld ─────────────────────────────────────────────────────────────────────

const geldSpec: TypeSpec<GeldExercise> = {
    extract: e => ex4([e.amountCents], e.denominations.map(d => d.valueCents * d.count)),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxGetal, 10) * 100;
        const allowed = (c.allowedDenominations as number[] | undefined) ?? [];
        const ex = `€ ${e.amountCents / 100} = ${e.denominations.map(d => `${d.count}×${d.valueCents}c`).join(' + ')}`;
        if (over(e.amountCents, max)) push('value>max', e.amountCents, max, ex);
        if (!(e.amountCents > 0)) push('amount<=0', e.amountCents, 1, ex);
        if (c.format === 'euros' && e.amountCents % 100 !== 0) push('cents-in-euros', e.amountCents, 'whole euros', ex);
        for (const d of e.denominations) if (!allowed.includes(d.valueCents)) push('denomination-not-allowed', d.valueCents, allowed.join(','), ex);
        if (ctx.typeId === 'geld-herkennen') {
            const sum = e.denominations.reduce((s, d) => s + d.valueCents * d.count, 0);
            if (sum !== e.amountCents) push('answer-key', sum, e.amountCents, ex);
        } else if (allowed.length && e.amountCents > 0 && e.amountCents % Math.min(...allowed) !== 0 && c.format !== 'euros') {
            push('unpayable', e.amountCents, `multiple of ${Math.min(...allowed)}c`, ex);
        }
    },
};

const geldWisselSpec: TypeSpec<GeldWisselExercise> = {
    extract: e => ex4([e.billValueCents], []),
    item: (e, ctx, push) => {
        const bills = (ctx.c.exerciseBills as number[] | undefined) ?? [];
        if (bills.length && !bills.includes(e.billValueCents)) push('bill-not-chosen', e.billValueCents, bills.join(','), `${e.billValueCents}c`);
    },
};

const geldTeruggevenSpec: TypeSpec<GeldTeruggevenExercise> = {
    extract: e => ex4([e.priceCents, e.payWithCents], [e.changeCents], [e.waypointCents, e.step1Cents, e.step2Cents]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const ex = `prijs ${e.priceCents}c, betaald ${e.payWithCents}c, terug ${e.changeCents}c`;
        const maxP = n(c.maxPriceEuros, 49), minP = n(c.minPriceEuros, 1);
        if (Math.floor(e.priceCents / 100) > maxP) push('value>max', e.priceCents, maxP * 100 + 99, ex);
        if (e.priceCents < minP * 100) push('value<min', e.priceCents, minP * 100, ex);
        const opts = (c.payWithOptions as number[] | undefined) ?? [];
        if (opts.length && !opts.includes(e.payWithCents)) push('bill-not-chosen', e.payWithCents, opts.join(','), ex);
        if (e.payWithCents <= e.priceCents) push('answer-key', e.payWithCents, `> ${e.priceCents}`, ex);
        if (e.changeCents !== e.payWithCents - e.priceCents || e.step1Cents + e.step2Cents !== e.changeCents) push('answer-key', e.changeCents, e.payWithCents - e.priceCents, ex);
    },
};

const geldRekenenSpec: TypeSpec<GeldRekenenExercise> = {
    extract: e => ex4(fin([e.priceCents, e.buyCents, e.sellCents, e.capitalCents, e.percent, e.months]), []),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const max = n(c.maxEuro, 100) * 100;
        const ex = JSON.stringify({ ...e, id: undefined, isManuallyEdited: undefined });
        for (const v of fin([e.priceCents, e.buyCents, e.sellCents, e.capitalCents])) {
            if (over(v, max)) push('value>max', v, max, ex);
            if (!(v > 0)) push('value<min', v, 1, ex);
        }
        if (e.percent !== undefined && !((c.percents as number[] | undefined) ?? []).includes(e.percent)) push('percent-not-selected', e.percent, (c.percents as number[] | undefined)?.join(','), ex);
    },
};

// ── Meten / meetkunde ────────────────────────────────────────────────────────

const lengteSpec: TypeSpec<MeetExercise> = {
    extract: e => ex4(e.sides ?? [], [e.perimeter], [], fin([e.claim])),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const maxL = n(c.maxLength, 10), lo = Math.max(1, Math.min(n(c.minLength, 3), maxL));
        const ex = `zijden ${(e.sides ?? []).join(', ')} = ${e.perimeter}`;
        // The path TOTAL may exceed maxLength (owner call); each drawn segment may not.
        valueRange(e.sides ?? [], lo, maxL, ex, push);
        if ((e.sides?.length ?? 1) - 1 > n(c.maxCorners, 0)) push('corners>max', (e.sides?.length ?? 1) - 1, c.maxCorners, ex);
    },
};

const omtrekSpec: TypeSpec<MeetExercise> = {
    extract: e => ex4([...(e.sides ?? []), ...fin([e.radius])], [e.perimeter]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const maxL = n(c.maxLength, 10);
        const ex = `${e.shape ?? e.kind} ${(e.sides ?? []).join(', ')}${e.radius ? `r ${e.radius}` : ''}`;
        const shapes = (c.shapes as string[] | undefined) ?? [];
        if (e.shape && shapes.length && !shapes.includes(e.shape)) push('shape-not-selected', e.shape, shapes.join(','), ex);
        // Minimum lengths are not a promise for vierhoek / cirkel (owner call): only the max is.
        if (e.kind === 'cirkel') { if (e.radius !== undefined && over(e.radius, maxL)) push('value>max', e.radius, maxL, ex); return; }
        for (const s of e.sides ?? []) if (over(s, maxL)) push('value>max', s, maxL, ex);
    },
};

const oppervlakteSpec: TypeSpec<MeetExercise> = {
    extract: e => ex4(e.sides ?? [], fin([e.area, e.perimeter])),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const maxL = n(c.maxLength, 8), minL = n(c.minLength, 2);
        const shapes = (c.shapes as string[] | undefined) ?? [];
        const ex = `${e.shape} ${(e.sides ?? []).join(' × ')} = ${e.area}`;
        if (e.shape && shapes.length && !shapes.includes(e.shape)) push('shape-not-selected', e.shape, shapes.join(','), ex);
        const s = e.sides ?? [];
        let dims: number[];
        if (c.subType === 'rooster') {
            const pts = e.points ?? [];
            const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
            // An L-figuur's inner cut is shorter by construction; its bounding box carries the promise.
            dims = e.shape === 'l-figuur' && pts.length ? [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] : s.slice(0, 2);
        } else {
            // The right triangle's hypotenuse is stored, not labelled (owner call): legs only.
            dims = e.shape === 'rechthoekige-driehoek' ? [s[0], s[2]] : e.shape === 'vierkant' ? [s[0]] : s.slice(0, 2);
        }
        valueRange(fin(dims), minL, maxL, ex, push);
    },
};

const tijdsduurSpec: TypeSpec<TijdsduurExercise> = {
    extract: e => ex4([e.startMin], [e.endMin - e.startMin], [], [e.endMin]),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const d = e.endMin - e.startMin;
        const ex = `${e.startMin} → ${e.endMin} (${d} min, blank ${e.blank})`;
        valueRange([d], 1, n(c.maxDuurMin, 240), ex, push);
        if (!c.overMidnight && e.endMin >= 1440) push('over-midnight', e.endMin, 1440, ex);
        if (!((c.blanks as string[] | undefined) ?? []).includes(e.blank)) push('blank-not-selected', e.blank, (c.blanks as string[] | undefined)?.join(','), ex);
    },
};

const kalenderSpec: TypeSpec<KalenderExercise> = {
    extract: e => ex4(fin([e.year, e.month, e.baseDate, e.offsetDays, e.day]), []),
    item: (e, ctx, push) => {
        const c = ctx.c;
        const ex = `${e.subType} ${e.year}-${e.month + 1}`;
        if (c.month !== 'random' && c.month !== undefined && e.month !== Number(c.month)) push('month-not-chosen', e.month, c.month, ex);
        if (e.year !== n(c.year, 2026)) push('year-not-chosen', e.year, c.year, ex);
        if (e.subType === 'maandrooster') {
            const want = n(c.questionCount, 5);
            if ((e.questions?.length ?? 0) < want) push('questions<questionCount', e.questions?.length ?? 0, want, ex);
        }
    },
};

const temperatuurSpec: TypeSpec<TemperatuurExercise> = {
    extract: e => ex4(fin([e.celsius, e.celsius2]), []),
    item: (e, ctx, push) => valueRange(fin([e.celsius, e.celsius2]), ctx.c.includeNegatives ? -15 : 0, 25, `${e.celsius}° ${e.celsius2 ?? ''}`, push),
};

const weegschaalSpec: TypeSpec<WeegschaalExercise> = {
    extract: e => ex4([e.grams], []),
    item: (e, ctx, push) => {
        const bereik = e.bereikGram ?? n(ctx.c.bereikGram, 1000);
        valueRange([e.grams], 1, bereik - 1, `${e.grams} g / ${bereik}`, push);
        if (e.stepGram && e.grams % e.stepGram !== 0) push('answer-key', e.grams, `multiple of ${e.stepGram}`, `${e.grams} g`);
    },
};

const klokSpec: TypeSpec<ClockExercise> = {
    extract: e => ex4([e.hours, e.minutes], []),
    item: (e, ctx, push) => {
        const h24 = !!ctx.c.is24hour;
        valueRange([e.hours], h24 ? 0 : 1, h24 ? 23 : 12, e.digitalText, push);
        valueRange([e.minutes], 0, 59, e.digitalText, push);
    },
};

const maateenheidSpec: TypeSpec<MaateenheidExercise> = {
    extract: e => ex4(fin([e.value]), []),
    item: (e, _ctx, push) => {
        if (e.choices && !e.choices.includes(e.unit)) push('answer-key', e.unit, e.choices.join(','), e.sentence);
    },
    numeric: false,
};

const noNumbers: TypeSpec<unknown> = { extract: () => ex4([], []), numeric: false };

// ── The table ────────────────────────────────────────────────────────────────

const cijferIds = ['optellen-nat', 'optellen-dec', 'aftrekken-nat', 'aftrekken-dec', 'vermenigvuldigen-nat', 'vermenigvuldigen-dec', 'delen-nat', 'delen-dec'];

export const LIMIT_SPECS: Record<string, TypeSpec<never>> = {
    'hr-std-optellen': hrSpec('+'),
    'hr-std-aftrekken': hrSpec('-'),
    'hr-std-vermenigvuldigen': hrSpec('x'),
    'hr-std-delen': hrSpec(':'),
    'hr-std-gemengd': gemengdSpec,
    ...Object.fromEntries(cijferIds.map(k => [`cijferen-${k}`, cijferSpec])),
    'klok-kloklezen': klokSpec,
    'breuken': breukenSpec,
    'splitsen': splitsenSpec,
    'geld-herkennen': geldSpec,
    'geld-tekenen': geldSpec,
    'geld-wissel': geldWisselSpec,
    'geld-teruggeven': geldTeruggevenSpec,
    'mab-herkennen': mabSpec,
    'mab-tekenen': mabSpec,
    'ordenen': ordenenSpec,
    'breuken-bewerken': breukBewerkSpec,
    'breuken-rangschikken': rangschikkenSpec,
    'deelbaarheid': deelbaarheidSpec,
    'getalpatronen': patroonSpec,
    'deelbaarheid-kleuren': deelbaarheidKleurSpec,
    'getallenas': asSpec(false),
    'getallenrijen': asSpec(true),
    'lengte-meten': lengteSpec,
    'omtrek': omtrekSpec,
    'temperatuur': temperatuurSpec,
    'plaatswaarde': plaatswaardeSpec,
    'even-oneven': evenOnevenSpec,
    'vergelijken': vergelijkenSpec,
    'afronden': afrondenSpec,
    'romeinse-cijfers': romeinseSpec,
    'herleidingen': herleidingenSpec,
    'schattend': schattendSpec,
    'verbanden': verbandenSpec,
    'procenten': procentenSpec,
    'maateenheid': maateenheidSpec,
    'geld-rekenen': geldRekenenSpec,
    'rekenvolgorde': rekenvolgordeSpec,
    'kettingsommen': kettingSpec,
    'getalfunctie': getalfunctieSpec,
    'tijdsduur': tijdsduurSpec,
    'kalender': kalenderSpec,
    'controleren': controlerenSpec,
    'oppervlakte': oppervlakteSpec,
    'weegschaal': weegschaalSpec,
    'vormleer-punt-lijn': noNumbers,
    'vormleer-hoeken': noNumbers,
    'vormleer-figuren': noNumbers,
} as Record<string, TypeSpec<never>>;

/** Every typeId that generates exercises (REGISTRY minus sheet furniture). */
export const generatingTypeIds = (): string[] => Object.keys(REGISTRY).filter(t => !REGISTRY[t].isFurniture);

/** The numbers a pupil sees or writes for one exercise. */
export function extractNumbers(typeId: string, ex: unknown): Extracted {
    const spec = LIMIT_SPECS[typeId] as TypeSpec<unknown> | undefined;
    return spec ? spec.extract(ex) : ex4([], []);
}

// NaN / ±Infinity anywhere a pupil could see it; ids are strings and never inspected.
function nonFinite(value: unknown, path: string, out: string[], seen = new Set<unknown>()): void {
    if (typeof value === 'number') { if (!Number.isFinite(value)) out.push(`${path}=${value}`); return; }
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) nonFinite(v, `${path}.${k}`, out, seen);
}

/** All violations one generated block shows: the generic checks plus the type's own rules. */
export function checkLimits(items: unknown[], ctx: CheckContext): Violation[] {
    const out: Violation[] = [];
    const push: Push = (rule, observed, limit, example) => out.push({ rule, observed, limit, example });
    const spec = LIMIT_SPECS[ctx.typeId] as TypeSpec<unknown> | undefined;
    // A short block that says why (a generation note) is the intended answer to an impossible ask.
    if (items.length < ctx.requested && !ctx.note) push('underfill', items.length, ctx.requested, `${items.length} of ${ctx.requested}`);
    if (items.length > ctx.requested) push('overfill', items.length, ctx.requested, `${items.length} of ${ctx.requested}`);
    items.forEach((ex, i) => {
        const bad: string[] = [];
        nonFinite(ex, `[${i}]`, bad);
        if (bad.length) push('non-finite', bad[0], 'finite', JSON.stringify(ex).slice(0, 160));
        if (!spec) return;
        if (spec.numeric !== false && spec.extract(ex).shown.length === 0) push('empty-exercise', 0, '≥1 number', JSON.stringify(ex).slice(0, 160));
        try {
            spec.item?.(ex, ctx, push);
        } catch (e) {
            // A rule that cannot read an exercise means the exercise lacks a field it promised.
            push('malformed', String((e as Error).message ?? e), 'readable', JSON.stringify(ex).slice(0, 160));
        }
    });
    spec?.block?.(items, ctx, push);
    return out;
}

