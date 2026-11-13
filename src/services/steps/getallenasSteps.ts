import type { StepLine, StepToken } from '../math/workedSteps';
import type { Fraction, GetallenasExercise } from '../math/types';
import { formatMathNumber } from '../math/formatters';

// Getallenas and getallenrijen: find the sprong (or the repeating sprongen of a mixed row) from numbers
// you know, then fill the empty places one by one, then the whole row. Shared by both typeIds' codecs and visuals.

export type AxisValue = number | Fraction;

const isFrac = (v: AxisValue): v is Fraction => typeof v === 'object' && v !== null;
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const decimalsOf = (x: number) => { const s = String(x); const i = s.indexOf('.'); return i < 0 || s.includes('e') ? 0 : s.length - i - 1; };
const denomOf = (v: AxisValue) => (isFrac(v) ? v.d : 10 ** decimalsOf(v));
const word = (w: string): StepToken => ({ t: 'word', w });
// Between the numbers of a row: a comma, or a semicolon once a decimal comma could be misread (0,25; 0,5).
const rowSep = (values: AxisValue[]): StepToken => (values.some(v => !isFrac(v) && !Number.isInteger(v)) ? word('; ') : { t: 'sep' });

// The row's ticks left to right: the stored values, or (an old natural line) start ± k × step.
export function axisValues(ex: GetallenasExercise): AxisValue[] {
    if (ex.values?.length) return ex.values;
    return Array.from({ length: ex.tickCount }, (_, k) => Math.round((ex.direction === 'left' ? ex.start - k * ex.step : ex.start + k * ex.step) * 1e6) / 1e6);
}

// A value as the pupil reads it: "−5", "0,25", "1 1/4".
export function valueText(v: AxisValue): string {
    if (!isFrac(v)) return v < 0 ? `−${formatMathNumber(-v)}` : formatMathNumber(v);
    return v.whole ? `${formatMathNumber(v.whole)} ${v.n}/${v.d}` : `${v.n}/${v.d}`;
}

function valueTokens(v: AxisValue): StepToken[] {
    if (isFrac(v)) return v.whole ? [{ t: 'num', v: v.whole }, word(' '), { t: 'frac', n: v.n, d: v.d }] : [{ t: 'frac', n: v.n, d: v.d }];
    return v < 0 ? [word(`−${formatMathNumber(-v)}`)] : [{ t: 'num', v }];
}

// u units of 1/scale as a number, or as a breuk on a breuken row.
function unitsTokens(u: number, scale: number, frac: boolean): StepToken[] {
    if (frac && u % scale !== 0) return [{ t: 'frac', n: u, d: scale }];
    return [{ t: 'num', v: Number((u / scale).toFixed(9)) }];
}
const unitsText = (u: number, scale: number, frac: boolean) => (frac && u % scale !== 0 ? `${u}/${scale}` : formatMathNumber(Number((u / scale).toFixed(9))));

export interface AxisPlan {
    values: AxisValue[];
    blank: boolean[];
    // The jump from tick k to k + 1, signed, in units of 1/scale; a mixed row repeats `period` of them.
    jumps: number[];
    period: number;
    scale: number;
    frac: boolean;
    // The empty places in the order the steps fill them, each from its left (+1) or right (−1) neighbour.
    order: { k: number; from: number }[];
}

// Everything the steps and the visual need, or null when the row has no clear method.
export function axisPlan(ex: GetallenasExercise | undefined): AxisPlan | null {
    if (!ex || !Array.isArray(ex.blankMask)) return null;
    const values = axisValues(ex);
    const blank = values.map((_, k) => !!ex.blankMask[k]);
    if (values.length < 3 || values.length > 30 || !blank.some(Boolean) || blank.filter(b => !b).length < 2) return null;
    const frac = values.some(isFrac);
    const scale = values.reduce<number>((s, v) => lcm(s, denomOf(v)), 1);
    if (scale > 1e6) return null;
    const units = values.map(v => Math.round((isFrac(v) ? (v.whole ?? 0) + v.n / v.d : v) * scale));
    const jumps = units.slice(1).map((u, k) => u - units[k]);
    const period = ex.jumps && ex.jumps.length >= 2 ? ex.jumps.length : 1;
    if (jumps.some(j => j === 0) || jumps.some((j, k) => j !== jumps[k % period])) return null;
    // A mixed row shows its pattern in the opening cells; without them the pupil cannot find it.
    if (period > 1 && blank.slice(0, period + 1).some(Boolean)) return null;
    const known = blank.map(b => !b);
    const order: AxisPlan['order'] = [];
    while (order.length < blank.filter(Boolean).length) {
        const before = order.length;
        for (let k = 0; k < values.length; k++) {
            if (known[k]) continue;
            const from = k > 0 && known[k - 1] ? 1 : k + 1 < values.length && known[k + 1] ? -1 : 0;
            if (!from) continue;
            order.push({ k, from });
            known[k] = true;
            break;
        }
        if (order.length === before) return null;
    }
    return { values, blank, jumps, period, scale, frac, order };
}

const sign = (j: number) => (j > 0 ? '+' : '−');
const signedTokens = (j: number, p: AxisPlan): StepToken[] => [word(sign(j)), ...unitsTokens(Math.abs(j), p.scale, p.frac)];
export const signedText = (j: number, p: Pick<AxisPlan, 'scale' | 'frac'>) => `${sign(j)}${unitsText(Math.abs(j), p.scale, p.frac)}`;

function jumpLine(p: AxisPlan): StepLine {
    const base = { kind: 'getallenas.sprong', basis: true, aside: true } as const;
    if (p.period > 1) {
        const tokens = p.jumps.slice(0, p.period).flatMap((j, k) => [...(k ? [word(', dan ')] : []), ...signedTokens(j, p)]);
        return { ...base, question: 'Welke sprongen zie je?', hint: 'Kijk vooraan in de rij: van elk getal naar het volgende.', tokens: [...tokens, word(', en zo verder')] };
    }
    const question = 'Hoe groot is de sprong?';
    const j = p.jumps[0];
    const pair = p.blank.findIndex((b, k) => !b && k + 1 < p.blank.length && !p.blank[k + 1]);
    if (pair >= 0) {
        return { ...base, question, hint: 'Kijk naar twee getallen naast elkaar.', tokens: [word('van '), ...valueTokens(p.values[pair]), word(' naar '), ...valueTokens(p.values[pair + 1]), word(': '), ...signedTokens(j, p)] };
    }
    // No two known numbers side by side: the difference spread over the sprongen between them.
    const [a, b] = p.blank.flatMap((bl, k) => (bl ? [] : [k]));
    const gaps = b - a;
    const calc: StepToken[] = [...unitsTokens(Math.abs(j) * gaps, p.scale, p.frac), { t: 'op', op: ':' }, { t: 'num', v: gaps }, { t: 'eq' }, ...unitsTokens(Math.abs(j), p.scale, p.frac)];
    return {
        ...base, question, hint: 'Zoek twee getallen die je kent. Hoeveel sprongen liggen ertussen?',
        tokens: [word('van '), ...valueTokens(p.values[a]), word(' naar '), ...valueTokens(p.values[b]), word(` zijn ${gaps} sprongen: `), ...calc, word(', dus '), ...signedTokens(j, p)],
    };
}

export function getallenasSteps(ex: GetallenasExercise | undefined): StepLine[] | null {
    const p = axisPlan(ex);
    if (!p) return null;
    const fills = p.order.map(({ k, from }): StepLine => {
        const n = k - from;
        // From the right the pupil jumps back: the inverse of the jump between k and k + 1.
        const j = from > 0 ? p.jumps[n] : -p.jumps[k];
        const hint = from > 0 ? `Begin bij ${valueText(p.values[n])} en spring ${signedText(j, p)}.` : `Begin bij ${valueText(p.values[n])} en spring terug: ${signedText(j, p)}.`;
        const calc: StepToken[] = [...valueTokens(p.values[n]), { t: 'op', op: j > 0 ? '+' : '-' }, ...unitsTokens(Math.abs(j), p.scale, p.frac), { t: 'eq' }, ...valueTokens(p.values[k])];
        return { kind: 'getallenas.vul', basis: true, aside: true, mark: k, question: 'Welk getal komt op de volgende lege plek?', hint, tokens: calc };
    });
    const row = p.values.flatMap((v, k) => [...(k ? [rowSep(p.values)] : []), ...valueTokens(v)]);
    return [jumpLine(p), ...fills, { kind: 'getallenas.rij', basis: true, aside: true, tokens: row }];
}

// ── Wire (the getallenas / getallenrijen tutor codecs) ──────────────────────────────────────
// [values, blanks, jumps?]: a value is a number or [n, d] / [whole, n, d]; blanks is "0110…"; jumps only on a mixed row.
type WireValue = number | number[];
const MAX_ABS = 1e10;

export function axisEncode(ex: GetallenasExercise | undefined): unknown {
    if (!axisPlan(ex)) return null;
    const vals: WireValue[] = axisValues(ex!).map(v => (isFrac(v) ? (v.whole ? [v.whole, v.n, v.d] : [v.n, v.d]) : v));
    const blanks = ex!.blankMask.slice(0, vals.length).map(b => (b ? '1' : '0')).join('');
    return ex!.jumps && ex!.jumps.length >= 2 ? [vals, blanks, ex!.jumps] : [vals, blanks];
}

const whole = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function decodeValue(w: unknown): AxisValue | null {
    if (typeof w === 'number') return Number.isFinite(w) && Math.abs(w) <= MAX_ABS ? w : null;
    if (!Array.isArray(w) || (w.length !== 2 && w.length !== 3)) return null;
    const [a, b, c] = w as unknown[];
    if (w.length === 2) return whole(a, 0, 1e6) && whole(b, 1, 1000) ? { n: a, d: b } : null;
    return whole(a, 1, 1e6) && whole(b, 0, 1e6) && whole(c, 1, 1000) ? { whole: a, n: b, d: c } : null;
}

export function axisDecode(wire: unknown): GetallenasExercise | null {
    if (!Array.isArray(wire) || wire.length < 2 || wire.length > 3) return null;
    const [vals, blanks, jumps] = wire as unknown[];
    if (!Array.isArray(vals) || vals.length < 3 || vals.length > 30 || typeof blanks !== 'string' || !/^[01]+$/.test(blanks) || blanks.length !== vals.length) return null;
    const values = vals.map(decodeValue);
    if (values.some(v => v === null)) return null;
    if (wire.length === 3 && !(Array.isArray(jumps) && jumps.length >= 2 && jumps.length <= 10 && jumps.every(j => typeof j === 'number' && Number.isFinite(j) && j > 0))) return null;
    const first = values[0] as AxisValue;
    const ex: GetallenasExercise = {
        id: '', start: isFrac(first) ? 0 : first, step: 0, tickCount: values.length, blankMask: [...blanks].map(b => b === '1'),
        direction: 'right', values: values as AxisValue[], ...(wire.length === 3 && { jumps: jumps as number[] }), isManuallyEdited: false,
    };
    const plan = axisPlan(ex);
    if (!plan) return null;
    return { ...ex, step: Math.abs(plan.jumps[0]) / plan.scale, direction: plan.jumps[0] < 0 ? 'left' : 'right' };
}

// The row's opening cells as printed, an empty place as a box, "…" after them: the card heading never wraps, so it stays short.
const SUM_CELLS = 3;
export function axisSum(ex: GetallenasExercise): StepToken[] {
    const values = axisValues(ex);
    const head = values.slice(0, SUM_CELLS).flatMap((v, k) => [...(k ? [rowSep(values)] : []), ...(ex.blankMask[k] ? [word('□')] : valueTokens(v))]);
    return values.length > SUM_CELLS ? [...head, rowSep(values), word('…')] : head;
}
