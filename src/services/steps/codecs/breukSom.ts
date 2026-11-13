import type { Equation, Fraction } from '../../math/types';
import type { StepToken } from '../../math/workedSteps';
import { breukSomSteps } from '../breukBewerkSteps';
import { defineCodec } from '../tutorCodec';

// Breuken optellen / aftrekken on the hoofdrekenen typeIds: [op, a, b] with a breuk as [n, d] or [whole, n, d] and a
// whole number as itself. It claims only sums with a breuk in them; whole-number sums keep the hoofdrekenen forms.
const MAX = 10_000;
const int = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= MAX;
const isFraction = (v: unknown): v is Fraction => typeof v === 'object' && v !== null && 'n' in v && 'd' in v;

const termOut = (v: number | Fraction): unknown => (typeof v === 'number' ? v : v.whole ? [v.whole, v.n, v.d] : [v.n, v.d]);

function termIn(w: unknown): number | Fraction | null {
    if (int(w, 0)) return w;
    if (!Array.isArray(w)) return null;
    if (w.length === 2 && int(w[0], 0) && int(w[1], 1)) return { n: w[0], d: w[1] };
    if (w.length === 3 && int(w[0], 1) && int(w[1], 0) && int(w[2], 1)) return { whole: w[0], n: w[1], d: w[2] };
    return null;
}

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const valueOf = (v: number | Fraction): [number, number] => (typeof v === 'number' ? [v, 1] : [(v.whole ?? 0) * v.d + v.n, v.d]);

// The answer is worked out here, never taken from the wire.
function answerOf(op: '+' | '-', a: number | Fraction, b: number | Fraction): Fraction {
    const [n1, d1] = valueOf(a), [n2, d2] = valueOf(b);
    const n = op === '+' ? n1 * d2 + n2 * d1 : n1 * d2 - n2 * d1, d = d1 * d2;
    const g = gcd(Math.abs(n), d) || 1;
    return { n: n / g, d: d / g };
}

const termTokens = (v: number | Fraction): StepToken[] =>
    typeof v === 'number' ? [{ t: 'num', v }] : [...(v.whole ? [{ t: 'num', v: v.whole } as StepToken] : []), { t: 'frac', n: v.n, d: v.d }];

export const codec = defineCodec<Equation>({
    id: 'bs',
    typeIds: ['hr-std-optellen', 'hr-std-aftrekken'],
    what: 'breuksom',
    out(ex) {
        const eq = ex as Equation | undefined;
        if (!eq || (eq.operator !== '+' && eq.operator !== '-') || eq.operands?.length !== 2) return null;
        if (eq.operators?.some(o => o !== eq.operator)) return null;
        if (eq.missingIndex !== undefined || (eq.missingTerm && eq.missingTerm !== 'result')) return null;
        if (!eq.operands.some(isFraction)) return null;
        return [eq.operator, ...eq.operands.map(termOut)];
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 3 || (wire[0] !== '+' && wire[0] !== '-')) return null;
        const a = termIn(wire[1]), b = termIn(wire[2]);
        if (a === null || b === null || (!isFraction(a) && !isFraction(b))) return null;
        const op = wire[0] as '+' | '-';
        return { id: '', operands: [a, b], operator: op, answer: answerOf(op, a, b), isManuallyEdited: false };
    },
    steps: eq => breukSomSteps(eq),
    sum: eq => [...termTokens(eq.operands[0]), { t: 'op', op: eq.operator }, ...termTokens(eq.operands[1])],
});
