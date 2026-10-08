import type { AfrondenExercise, CijferExercise, Equation, Fraction, ProcentExercise, VergelijkenExercise } from '../math/types';
import type { KioskDescriptor, KioskInput, KioskKey } from './types';
import { isFraction } from '../math/answerKeys';
import { formatMathNumber, opGlyph } from '../math/formatters';
import { roundTo, targetsFor } from '../afronden/afrondenGenerator';

// Kiosk descriptors for the exercise registry (row field `kiosk`): pure data + pure functions,
// imported by exerciseRegistry.ts. A type without a descriptor cannot be practised on screen.

// Same type-erasing helper as the registry's row(): each descriptor names its exercise shape.
const descriptor = <E>(d: KioskDescriptor<E>): KioskDescriptor => d as KioskDescriptor;

const numberTypeOf = (c: Record<string, unknown>) => (c.numberType as string | undefined) ?? 'natural';

// Generators keep decimals as floats (0.1 + 0.2): 9 places strips the float tail and still
// keeps every value the generators can make (≤ 1e9, ≤ 3 decimals).
const plain = (x: number): string => String(Number(x.toFixed(9)));

// Every accepted spelling of a number: dot and comma decimal ('2.5', '2,5').
export function numberSpellings(x: number): string[] {
    const dot = plain(x);
    const comma = dot.replace('.', ',');
    return comma === dot ? [dot] : [comma, dot];
}

// A fraction as mixed number and as improper fraction ('1 3/4' and '7/4'); whole values as
// the integer only. The generators hand back reduced fractions, so only those forms count.
export function fractionSpellings(f: Fraction): string[] {
    const whole = f.whole ?? 0;
    const sign = whole < 0 || f.n < 0 ? '-' : '';
    const w = Math.abs(whole), n = Math.abs(f.n), d = Math.abs(f.d);
    const totalN = w * d + n;
    if (totalN % d === 0) return [`${sign}${totalN / d}`];
    const mixedW = Math.floor(totalN / d), mixedN = totalN % d;
    const improper = `${sign}${totalN}/${d}`;
    return mixedW > 0 ? [`${sign}${mixedW} ${mixedN}/${d}`, improper] : [improper];
}

const valueSpellings = (v: number | Fraction) => (isFraction(v) ? fractionSpellings(v) : numberSpellings(v));

const showValue = (v: number | Fraction): string => {
    if (!isFraction(v)) return formatMathNumber(plain(v)).replace('-', '−');
    const n = `${v.n}/${v.d}`;
    return v.whole ? `${v.whole} ${n}` : n;
};

// ── Hoofdrekenen (+ − × :) ───────────────────────────────────────────────────

// The blank of a puntoefening: missingIndex, or the 2-term missingTerm the rational paths set.
function missingIndexOf(eq: Equation): number | undefined {
    if (eq.missingIndex !== undefined) return eq.missingIndex;
    if (eq.missingTerm === 'operand1') return 0;
    if (eq.missingTerm === 'operand2') return 1;
    return undefined;
}

// SYNC: MathBlockRenderer draws the "= ___ r ___" row whenever `remainder` is set.
// Met-rest mode sets it on every row, so the kiosk asks for a rest exactly when the sheet does.
const hasRest = (eq: Equation) => eq.remainder !== undefined;

const hrInput = (eq: Equation): KioskInput => {
    if (hasRest(eq)) return 'number+rest';
    return missingIndexOf(eq) !== undefined ? 'missing-operand' : 'number';
};

const hrKeys = (c: Record<string, unknown>): KioskKey[] => {
    const nt = numberTypeOf(c);
    if (nt === 'decimal') return [','];
    if (nt === 'rational') return ['/', ' '];
    if (nt === 'geheel') return ['-'];
    return [];
};

export const HR_KIOSK = descriptor<Equation>({
    input: 'number',
    inputOf: hrInput,
    keys: hrKeys,
    answerOf: (eq) => {
        if (hasRest(eq)) return [plain(eq.answer as number), String(eq.remainder ?? 0)];
        const idx = missingIndexOf(eq);
        return valueSpellings(idx !== undefined ? eq.operands[idx] : eq.answer);
    },
    display: (eq) => {
        const idx = hasRest(eq) ? undefined : missingIndexOf(eq);
        const ops = eq.operators ?? eq.operands.slice(1).map(() => eq.operator);
        const terms = eq.operands.map((o, i) => (i === idx ? '?' : showValue(o)));
        const lhs = terms.reduce((acc, t, i) => `${acc} ${opGlyph(ops[i - 1])} ${t}`);
        if (hasRest(eq)) return `${lhs} = ? r ?`;
        return `${lhs} = ${idx !== undefined ? showValue(eq.answer) : '?'}`;
    },
});

// ── Procenten ────────────────────────────────────────────────────────────────

// nemen: "25 % van 80 = ?" → answer; welk-percent: "20 van 80 = ? %" → percent.
const isWelk = (c: Record<string, unknown>) => c.subType === 'welk-percent';

export const PROCENTEN_KIOSK = descriptor<ProcentExercise>({
    input: 'number',
    answerOf: (ex, c) => numberSpellings(isWelk(c) ? ex.percent : ex.answer),
    display: (ex, c) => isWelk(c)
        ? `${formatMathNumber(ex.answer)} van ${formatMathNumber(ex.base)} = ? %`
        : `${formatMathNumber(ex.percent)} % van ${formatMathNumber(ex.base)} = ?`,
    supported: (c) => (c.subType ?? 'nemen') === 'nemen' || isWelk(c),
});

// ── Afronden (simpel only; a rooster is a whole table, not one answer) ───────

const afrondenTarget = (ex: AfrondenExercise, c: Record<string, unknown>) => {
    const all = targetsFor(numberTypeOf(c));
    // SYNC: AfrondenViewer falls back to the first target the same way.
    return all.find(t => t.key === ex.targetKey) ?? all[0];
};

export const AFRONDEN_KIOSK = descriptor<AfrondenExercise>({
    input: 'number',
    keys: (c) => (numberTypeOf(c) === 'decimal' ? [','] : []),
    answerOf: (ex, c) => numberSpellings(roundTo(ex.number ?? 0, afrondenTarget(ex, c).weight)),
    display: (ex, c) => `${formatMathNumber(plain(ex.number ?? 0))} ≈ ? (op ${afrondenTarget(ex, c).label})`,
    supported: (c) => (c.subType ?? 'rooster') === 'simpel',
});

// ── Vergelijken (getallen only) ──────────────────────────────────────────────

export const VERGELIJKEN_KIOSK = descriptor<VergelijkenExercise>({
    input: 'choice',
    choices: ['<', '=', '>'],
    answerOf: (ex) => {
        const a = ex.a ?? 0, b = ex.b ?? 0;
        return [a < b ? '<' : a > b ? '>' : '='];
    },
    display: (ex) => `${formatMathNumber(plain(ex.a ?? 0))} ? ${formatMathNumber(plain(ex.b ?? 0))}`,
    supported: (c) => (c.subType ?? 'getallen') === 'getallen',
});

// ── Cijferen (the grid is scrap paper; the pupil types the final result) ─────

// Delen asks quotiënt + rest like the sheet's q / r box; the decimal leaves need a comma.
export const CIJFER_KIOSK = descriptor<CijferExercise>({
    input: 'number',
    inputOf: (ex) => (ex.operator === ':' ? 'number+rest' : 'number'),
    keys: (c) => (numberTypeOf(c) === 'decimal' ? [','] : []),
    answerOf: (ex) => (ex.operator === ':' ? [plain(ex.answer), plain(ex.remainder ?? 0)] : numberSpellings(ex.answer)),
    display: (ex) => `${ex.operands.map(showValue).join(` ${opGlyph(ex.operator)} `)} = ${ex.operator === ':' ? '? r ?' : '?'}`,
});
