import type { Equation } from './types';
import type { AddSubConstraints } from './constraintTypes';

// Worked steps ("tussenstappen") for hoofdrekenen: one pure function per strategy, rendered by
// the answer key, Oefenmodus and the tutor page alike so the three can never disagree.
// Optellen and aftrekken by rijgen are specified (owner's whiteboard examples 475 + 368 and
// 247 − 188, 2026-11-12); every other shape returns null until the owner gives an example for it.

export type StepToken =
    | { t: 'num'; v: number }
    | { t: 'op'; op: '+' | '-' | 'x' | ':' }
    | { t: 'open' }
    | { t: 'close' };

// 'first' = the place-value split, 'move' = previous result + the next part, 'split' = a brug
// part split into fill + rest, 'fill' = the result after the fill, 'answer' = the result alone.
export type StepKind = 'first' | 'move' | 'split' | 'fill' | 'answer';

// Every line reads as "= <tokens>"; the renderer draws the "=" and the original sum itself.
// `basis` = shown at the Basisstappen level; Alle shows every line.
export interface StepLine {
    kind: StepKind;
    basis: boolean;
    tokens: StepToken[];
}

export type StepLevel = 'basis' | 'alle';

// The didactic ceiling of this brief (leerjaar 1-3): above 1000 a brug over the hundreds
// appears, which has no owner example yet.
const MAX_ANSWER = 1000;

const num = (v: number): StepToken => ({ t: 'num', v });
type RijOp = '+' | '-';

// "cur ± br ± rest…", with (cur ± br) bracketed unless that bracket would span the whole line
// or the caller leaves it off.
function chain(op: RijOp, cur: number, br: number | null, rest: number[], bracket = true): StepToken[] {
    const sign: StepToken = { t: 'op', op };
    const out: StepToken[] = [];
    if (br !== null && rest.length > 0 && bracket) out.push({ t: 'open' }, num(cur), sign, num(br), { t: 'close' });
    else if (br !== null) out.push(num(cur), sign, num(br));
    else out.push(num(cur));
    for (const r of rest) out.push(sign, num(r));
    return out;
}

// 368 → [300, 60, 8]; zero digits are skipped (308 → [300, 8]).
function placeParts(b: number): number[] {
    const digits = String(b);
    const parts: number[] = [];
    for (let i = 0; i < digits.length; i++) {
        const d = Number(digits[i]);
        if (d) parts.push(d * 10 ** (digits.length - 1 - i));
    }
    return parts;
}

// Rijgen: take the second operand's place-value parts off (or on) largest first. A part is a
// 'brug' when it crosses a round number at its own place: optellen when that digit plus the
// part's digit passes 10 (exactly 10 is a normal move), aftrekken when the part's digit is
// bigger than that digit (equal is a normal move). A brug splits into a fill to the round
// number plus the rest. Returns null for an aftrekken brug on a 0 digit (403 − 20): there is
// nothing to take off first, and the owner has not said how he writes that yet.
function rijgen(a: number, b: number, op: RijOp): StepLine[] | null {
    const parts = placeParts(b);
    const sign = op === '+' ? 1 : -1;
    const lines: StepLine[] = [];
    let v = a;
    for (let k = 0; k < parts.length; k++) {
        const p = parts[k];
        const rest = parts.slice(k + 1);
        const place = 10 ** (String(p).length - 1);
        const digit = Math.floor(v / place) % 10;
        const brug = op === '+' ? digit + p / place > 10 : p / place > digit;
        if (op === '-' && brug && digit === 0) return null;
        // The owner's aftrekken board writes a brug move without its bracket (147 − 80 − 8); optellen keeps it.
        lines.push({ kind: k === 0 ? 'first' : 'move', basis: k === 0 || !brug, tokens: chain(op, v, p, rest, !(op === '-' && brug && k > 0)) });
        if (brug) {
            const fill = (op === '+' ? 10 - digit : digit) * place;
            const r = p - fill;
            lines.push({ kind: 'split', basis: true, tokens: chain(op, v, fill, [r, ...rest]) });
            v += sign * fill;
            lines.push({ kind: 'fill', basis: false, tokens: chain(op, v, null, [r, ...rest]) });
            v += sign * r;
        } else {
            v += sign * p;
        }
    }
    lines.push({ kind: 'answer', basis: true, tokens: [num(v)] });
    return lines;
}

export const rijgenOptellen = (a: number, b: number): StepLine[] => rijgen(a, b, '+')!;
export const rijgenAftrekken = (a: number, b: number): StepLine[] | null => rijgen(a, b, '-');

// The strategy for one exercise, or null when none is specified for its shape. The constraints
// matter because the strategy follows the preset (compenseren / tienvoud), not the numbers alone.
export function workedSteps(eq: Equation, c?: Partial<AddSubConstraints>): StepLine[] | null {
    if (!eq || (eq.operator !== '+' && eq.operator !== '-') || eq.operands?.length !== 2) return null;
    if (eq.operators && eq.operators.some(o => o !== eq.operator)) return null;
    if (eq.missingIndex !== undefined || (eq.missingTerm && eq.missingTerm !== 'result')) return null;
    if (eq.remainder !== undefined) return null;
    if (c?.equationType === 'puntoefening') return null;
    if (c?.preset && c.preset !== 'vrij') return null;
    // Gemengd tags each exercise with its variant; '+:compenseren' / '-:compenseren' are a different strategy.
    if (eq.variant && eq.variant !== eq.operator) return null;
    const [a, b] = eq.operands;
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 10 || b < 1) return null;
    if (eq.operator === '+' ? a + b > MAX_ANSWER : a > MAX_ANSWER || b > a) return null;
    // One non-zero digit (47 + 8, 47 − 30): the first line would only repeat the sum. Open question.
    if (placeParts(b).length < 2) return null;
    return eq.operator === '+' ? rijgenOptellen(a, b) : rijgenAftrekken(a, b);
}

export function stepsAtLevel(lines: StepLine[], level: StepLevel): StepLine[] {
    return level === 'alle' ? lines : lines.filter(l => l.basis);
}

// Plain text of a line's tokens (without the leading "="), numbers through the caller's formatter.
export function stepText(tokens: StepToken[], fmt: (n: number) => string = String): string {
    let s = '';
    for (const tok of tokens) {
        if (tok.t === 'num') s += fmt(tok.v);
        else if (tok.t === 'op') s += ` ${tok.op === 'x' ? '×' : tok.op === '-' ? '−' : tok.op} `;
        else if (tok.t === 'open') s += '(';
        else s += ')';
    }
    return s;
}
