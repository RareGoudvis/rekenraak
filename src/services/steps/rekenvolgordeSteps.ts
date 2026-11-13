import type { RekenvolgordeExercise } from '../math/types';
import type { StepLine, StepToken } from '../math/workedSteps';

// Rekenvolgorde: one operation per line, in the order a child may rely on: haakjes first, then × and :
// from left to right, then + and − from left to right. Each line is the whole expression after that step.

type Tok = number | string;
const OPS = new Set(['+', '-', 'x', ':']);
const MAX = 1_000_000;

export function isRekenvolgordeTokens(tokens: unknown): tokens is Tok[] {
    if (!Array.isArray(tokens) || tokens.length < 3 || tokens.length > 20) return false;
    return tokens.every(t => (typeof t === 'number' ? Number.isInteger(t) && t >= 0 && t <= MAX : t === '(' || t === ')' || OPS.has(t as string)));
}

const toStep = (t: Tok): StepToken => (typeof t === 'number' ? { t: 'num', v: t } : t === '(' ? { t: 'open' } : t === ')' ? { t: 'close' } : { t: 'op', op: t as '+' | '-' | 'x' | ':' });
const toTokens = (ts: Tok[]): StepToken[] => ts.map(toStep);

interface Move { tokens: Tok[]; hint: string }

// One reduction of `tokens`, or null when it is a single number or cannot be computed (loose, negative, broken brackets).
function reduce(tokens: Tok[]): Move | null {
    const open = tokens.indexOf('(');
    const close = open >= 0 ? tokens.indexOf(')', open) : -1;
    if (open >= 0 && close < 0) return null;
    const lo = open >= 0 ? open + 1 : 0;
    const hi = open >= 0 ? close : tokens.length;
    const region = tokens.slice(lo, hi);
    if (region.some(t => t === '(' || t === ')') || region.length % 2 === 0) return null;
    const hasMul = region.some(t => t === 'x' || t === ':');
    const hasAdd = region.some(t => t === '+' || t === '-');
    const at = hasMul ? region.findIndex(t => t === 'x' || t === ':') : region.findIndex(t => t === '+' || t === '-');
    if (at < 1) return null;
    const a = region[at - 1], b = region[at + 1], o = region[at];
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    let v: number;
    if (o === 'x') v = a * b;
    else if (o === ':') { if (b === 0 || a % b !== 0) return null; v = a / b; }
    else if (o === '+') v = a + b;
    else v = a - b;
    if (v < 0 || v > MAX) return null;
    const nextRegion = [...region.slice(0, at - 1), v, ...region.slice(at + 2)];
    // A bracket around a single number has done its job and disappears.
    const wrapped = open >= 0 && nextRegion.length > 1 ? ['(', ...nextRegion, ')'] : nextRegion;
    const out = open >= 0 ? [...tokens.slice(0, open), ...wrapped, ...tokens.slice(close + 1)] : wrapped;
    const hint = open >= 0 ? 'Haakjes eerst.' : hasMul && hasAdd ? '× en : gaan voor + en −.' : 'Van links naar rechts.';
    return { tokens: out, hint };
}

// The value of a rekenvolgorde expression, or null when it cannot be worked out.
export function rekenvolgordeValue(tokens: Tok[]): number | null {
    let cur = tokens;
    for (let guard = 0; guard < 40; guard++) {
        if (cur.length === 1) return typeof cur[0] === 'number' ? cur[0] : null;
        const m = reduce(cur);
        if (!m) return null;
        cur = m.tokens;
    }
    return null;
}

export function rekenvolgordeSteps(ex: RekenvolgordeExercise | undefined): StepLine[] | null {
    if (!ex || !isRekenvolgordeTokens(ex.tokens)) return null;
    const lines: StepLine[] = [];
    let cur: Tok[] = ex.tokens;
    for (let guard = 0; guard < 40 && cur.length > 1; guard++) {
        const m = reduce(cur);
        if (!m) return null;
        cur = m.tokens;
        lines.push({ kind: 'rv.stap', basis: true, question: 'Wat reken je nu uit?', hint: m.hint, tokens: toTokens(cur), mark: lines.length });
    }
    if (cur.length !== 1 || cur[0] !== ex.answer || lines.length === 0) return null;
    lines.push({ kind: 'rv.klaar', basis: true, aside: true, tokens: [{ t: 'word', w: 'Dus: ' }, ...toTokens(ex.tokens), { t: 'eq' }, { t: 'num', v: ex.answer }] });
    return lines;
}
