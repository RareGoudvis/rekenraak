import type { Equation } from './types';
import type { AddSubConstraints } from './constraintTypes';

// Worked steps ("tussenstappen") for hoofdrekenen: one pure function per strategy, rendered by
// the answer key, Oefenmodus and the tutor page alike so the three can never disagree.
// Optellen and aftrekken by rijgen are the owner's whiteboard (475 + 368, 247 − 188); × and : follow
// his examples (5 × 65, 2340 : 3) and the Op.stap goals (2.2.GL3–GL6). Other shapes return null.

export type StepToken =
    | { t: 'num'; v: number }
    | { t: 'op'; op: '+' | '-' | 'x' | ':' }
    | { t: 'open' }
    | { t: 'close' }
    // A place-value unit after a number: "48 T" (tientallen), "18 t" (tienden), as in the Op.stap examples.
    | { t: 'unit'; u: StepUnit }
    // Inside an aside line: "6 × 9 = 54", and "en" between two of them.
    | { t: 'eq' }
    | { t: 'and' }
    // Between counted jumps: "0, 5, 10, 15".
    | { t: 'sep' }
    // Delen met rest: "9 rest 1"; the part after it is what is left over, not divided.
    | { t: 'rest' };

export type StepUnit = 'T' | 'H' | 'D' | 't' | 'h' | 'd';

// 'first' = the place-value split, 'move' = previous result + the next part, 'split' = a brug
// part split into fill + rest, 'fill' = the result after the fill, 'answer' = the result alone.
// × and :: 'parts' = the split written out, 'distribute' = spread over the parts, 'values' = the
// partial results, 'units' = a sum read in tientallen / tienden ("8 × 6 T"). Met rest: 'multiples' =
// the divisor's multiples around the deeltal, 'remainder' = the deeltal as that multiple plus the rest.
export type StepKind = 'first' | 'move' | 'split' | 'fill' | 'answer' | 'parts' | 'distribute' | 'values' | 'units' | 'multiples' | 'remainder';

// A line reads as "= <tokens>"; the renderer draws the "=" and the original sum itself. An `aside`
// line is a side calculation ("6 × 9 = 54 en 6 × 10 = 60") that stands on its own, without that "=".
// `basis` = shown at the Basisstappen level; Alle shows every line.
export interface StepLine {
    kind: StepKind;
    basis: boolean;
    tokens: StepToken[];
    aside?: true;
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

// × and : stay mental: above this the steps would turn into cijferen.
const MAX_MULDIV = 10_000;
// Handig rekenen goes further (62 300 : 7 is an Op.stap example).
const MAX_HANDIG = 100_000;

const op = (o: '+' | '-' | 'x' | ':'): StepToken => ({ t: 'op', op: o });
const OPEN: StepToken = { t: 'open' };
const CLOSE: StepToken = { t: 'close' };
const line = (kind: StepKind, basis: boolean, tokens: StepToken[]): StepLine => ({ kind, basis, tokens });
const joinWith = (groups: StepToken[][], o: '+' | '-' | 'x' | ':'): StepToken[] => groups.flatMap((g, i) => (i ? [op(o), ...g] : g));
const bracket = (x: number, o: 'x' | ':' | '-' | '+', y: number): StepToken[] => [OPEN, num(x), op(o), num(y), CLOSE];
const nums = (vs: number[], o: '+' | '-' = '+') => joinWith(vs.map(v => [num(v)]), o);
const isPow10 = (n: number) => n === 1 || n === 10 || n === 100 || n === 1000;
const trailingZeros = (n: number) => { let k = 0; while (n !== 0 && n % 10 === 0 && k < 9) { n /= 10; k++; } return k; };
const UNIT_OF_POW: Record<number, StepUnit> = { 1: 'T', 2: 'H', 3: 'D' };
const DEC_UNIT: Record<number, StepUnit> = { 1: 't', 2: 'h', 3: 'd' };
const decimalsOf = (x: number) => { const s = String(x); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
const roundTo = (x: number, dp: number) => Number(x.toFixed(dp));

// Whether adding the partial results needs a carry somewhere; without one the sum is read off at once.
function needsCarry(values: number[]): boolean {
    let carry = 0;
    for (let place = 1; place <= 10 ** 9; place *= 10) {
        const s = values.reduce((acc, v) => acc + (Math.floor(v / place) % 10), carry);
        if (s > 9) return true;
        carry = Math.floor(s / 10);
        if (values.every(v => v < place * 10)) break;
    }
    return false;
}

// "Alle stappen" works out the final sum of partial results, only when it needs a carry (owner: "if
// needed"): two parts by rijgen, more by folding left.
function sumLines(values: number[]): StepLine[] {
    if (!needsCarry(values)) return [];
    if (values.length === 2) {
        const r = rijgen(values[0], values[1], '+');
        if (!r) return [];
        const same = (t: StepToken[]) => stepText(t) === stepText(nums(values));
        return r.slice(0, -1).filter(l => !same(l.tokens)).map(l => ({ ...l, basis: false }));
    }
    const out: StepLine[] = [];
    let acc = values[0];
    for (let i = 1; i < values.length - 1; i++) {
        acc += values[i];
        out.push(line('move', false, nums([acc, ...values.slice(i + 1)])));
    }
    return out;
}

// Splitsen en verdelen: 5 × 65 = 5 × (60 + 5) = (5 × 60) + (5 × 5) = 300 + 25 = 325. TE × TE splits the
// first factor and spreads the non-round parts again (Op.stap 13 × 24 = … = 240 + (3 × 20) + (3 × 4)).
function splitsenMaal(a: number, b: number): StepLine[] | null {
    const pa = placeParts(a), pb = placeParts(b);
    let splitFirst: boolean;
    if (a < 10 && pb.length >= 2) splitFirst = false;
    else if (b < 10 && pa.length >= 2) splitFirst = true;
    else if (a >= 10 && b >= 10 && pa.length >= 2) splitFirst = true;
    else return null;
    const parts = splitFirst ? pa : pb;
    const other = splitFirst ? b : a;
    const group = [OPEN, ...nums(parts), CLOSE];
    const lines: StepLine[] = [line('parts', true, splitFirst ? [...group, op('x'), num(other)] : [num(other), op('x'), ...group])];
    const pairs = parts.map(p => (splitFirst ? [p, other] : [other, p]));
    lines.push(line('distribute', true, joinWith(pairs.map(([x, y]) => bracket(x, 'x', y)), '+')));
    let values = pairs.map(([x, y]) => x * y);
    const otherParts = placeParts(other);
    if (other >= 10 && otherParts.length >= 2 && parts.some(p => !isPow10(p))) {
        const terms: StepToken[][] = [];
        const vals: number[] = [];
        parts.forEach((p, i) => {
            if (isPow10(p)) { terms.push([num(values[i])]); vals.push(values[i]); return; }
            for (const q of otherParts) { terms.push(bracket(p, 'x', q)); vals.push(p * q); }
        });
        lines.push(line('distribute', true, joinWith(terms, '+')));
        values = vals;
    }
    lines.push(line('values', true, nums(values)), ...sumLines(values), line('answer', true, [num(a * b)]));
    return lines;
}

// Naar analogie met de tafels: 8 × 60 = 8 × 6 T = 48 T = 480; both round: 80 × 60 = 8 × 10 × 6 × 10 = 8 × 6 × 100 = 4 800.
function analogieMaal(a: number, b: number): StepLine[] | null {
    const pa = placeParts(a), pb = placeParts(b);
    if (pa.length !== 1 || pb.length !== 1) return null;
    const za = trailingZeros(a), zb = trailingZeros(b);
    const da = a / 10 ** za, db = b / 10 ** zb;
    if (za === 0 && zb === 0) return null;
    if (za > 0 && zb > 0) {
        return [
            line('parts', true, joinWith([[num(da)], [num(10 ** za)], [num(db)], [num(10 ** zb)]], 'x')),
            line('units', true, joinWith([[num(da)], [num(db)], [num(10 ** (za + zb))]], 'x')),
            line('answer', true, [num(a * b)]),
        ];
    }
    const z = za || zb;
    if (z > 3) return null;
    const u: StepToken = { t: 'unit', u: UNIT_OF_POW[z] };
    const read = za ? [num(da), u, op('x'), num(b)] : [num(a), op('x'), num(db), u];
    return [line('units', true, read), line('units', true, [num(da * db), u]), line('answer', true, [num(a * b)])];
}

// Kommagetal × natuurlijk getal via eenheden (Op.stap 0,6 × 3 = 3 × 0,6 = 3 × 6 t = 18 t = 1,8).
function eenhedenMaal(a: number, b: number): StepLine[] | null {
    const [x, n, swapped] = Number.isInteger(a) ? [b, a, false] : [a, b, true];
    if (Number.isInteger(x) || !Number.isInteger(n) || n < 2 || n > 10) return null;
    const dp = decimalsOf(x);
    if (dp < 1 || dp > 3) return null;
    const m = Math.round(x * 10 ** dp);
    if (m > 99) return null;
    const u: StepToken = { t: 'unit', u: DEC_UNIT[dp] };
    const lines: StepLine[] = [];
    // The keerhandeling reads "n times x": the owner's source writes the swap as its own line.
    if (swapped) lines.push(line('parts', true, [num(n), op('x'), num(x)]));
    lines.push(line('units', true, [num(n), op('x'), num(m), u]), line('units', true, [num(n * m), u]), line('answer', true, [num(roundTo((n * m) / 10 ** dp, dp))]));
    return lines;
}

// Splitsen en verdelen (opgaand): 2340 : 3 = (2100 + 240) : 3 = (2100 : 3) + (240 : 3) = 700 + 80 = 780.
// Per place from the highest, the largest multiple of divisor × place: the parts a pupil divides by heart.
function splitsenDeel(a: number, d: number): StepLine[] | null {
    const parts: number[] = [];
    let rest = a;
    for (let place = 10 ** (String(a).length - 1); place >= 1 && rest > 0; place /= 10) {
        const k = Math.floor(rest / (d * place));
        if (k > 0) { parts.push(k * d * place); rest -= k * d * place; }
    }
    if (rest !== 0 || parts.length < 2) return null;
    const quotients = parts.map(p => p / d);
    return [
        line('parts', true, [OPEN, ...nums(parts), CLOSE, op(':'), num(d)]),
        line('distribute', true, joinWith(parts.map(p => bracket(p, ':', d)), '+')),
        line('values', true, nums(quotients)),
        line('answer', true, [num(a / d)]),
    ];
}

// Naar analogie met de tafels: 480 : 6 = 48 T : 6 = 8 T = 80.
function analogieDeel(a: number, d: number): StepLine[] | null {
    for (let z = 1; z <= 3; z++) {
        if (a % 10 ** z !== 0) break;
        const m = a / 10 ** z;
        if (m % d === 0 && m / d <= 10) {
            const u: StepToken = { t: 'unit', u: UNIT_OF_POW[z] };
            return [line('units', true, [num(m), u, op(':'), num(d)]), line('units', true, [num(m / d), u]), line('answer', true, [num(a / d)])];
        }
    }
    return null;
}

// Kommagetal : natuurlijk getal via eenheden (Op.stap 0,08 : 2 = 8 h : 2 = 4 h = 0,04).
function eenhedenDeel(a: number, d: number): StepLine[] | null {
    if (Number.isInteger(a) || !Number.isInteger(d) || d < 2 || d > 9) return null;
    const dp = decimalsOf(a);
    if (dp < 1 || dp > 3) return null;
    const m = Math.round(a * 10 ** dp);
    if (m % d !== 0 || m > 99) return null;
    const u: StepToken = { t: 'unit', u: DEC_UNIT[dp] };
    return [line('units', true, [num(m), u, op(':'), num(d)]), line('units', true, [num(m / d), u]), line('answer', true, [num(roundTo(m / d / 10 ** dp, dp))])];
}

// Delen met rest by counting in jumps of the deler (owner, 2026-11-12: "26 : 5 → 0 5 10 15 20 25"; Op.stap
// 2.2.GL3.32): 26 : 5 → 0, 5, 10, 15, 20, 25, 26 = 25 + 1, = 5 rest 1.
function tafelRest(a: number, d: number, q: number, r: number): StepLine[] {
    const jumps = Array.from({ length: q + 1 }, (_, i) => d * i);
    const lines: StepLine[] = [
        { ...line('multiples', true, jumps.flatMap((v, i) => (i ? [{ t: 'sep' } as StepToken, num(v)] : [num(v)]))), aside: true },
        { ...line('remainder', true, [num(a), { t: 'eq' }, num(d * q), op('+'), num(r)]), aside: true },
    ];
    lines.push(line('answer', true, [num(q), { t: 'rest' }, num(r)]));
    return lines;
}

// A bigger quotient by splitsen en verdelen with the rest split off (Op.stap 2.2.GL5.19):
// 235 : 3 = (210 + 24 + 1) : 3 = (210 : 3) + (24 : 3) rest 1 = 70 + 8 rest 1 = 78 rest 1.
function splitsenRest(a: number, d: number, q: number, r: number): StepLine[] | null {
    const parts: number[] = [];
    let left = a;
    for (let place = 10 ** (String(a).length - 1); place >= 1; place /= 10) {
        const k = Math.floor(left / (d * place));
        if (k > 0) { parts.push(k * d * place); left -= k * d * place; }
    }
    if (left !== r || parts.length === 0) return null;
    const rest: StepToken[] = [{ t: 'rest' }, num(r)];
    const lines: StepLine[] = [
        line('parts', true, [OPEN, ...nums([...parts, r]), CLOSE, op(':'), num(d)]),
        line('distribute', true, [...joinWith(parts.map(p => bracket(p, ':', d)), '+'), ...rest]),
    ];
    // One part: its quotient already is the answer, so the values line would only repeat it.
    if (parts.length > 1) lines.push(line('values', true, [...nums(parts.map(p => p / d)), ...rest]));
    lines.push(line('answer', true, [num(q), ...rest]));
    return lines;
}

// Met rest: the delers the config offers (2-12), a quotient of at least 1 and a rest the generator would
// write (1 up to the deler); the steps must agree with the key, so a hand-edited answer gets none.
function restSteps(eq: Equation, a: number, d: number): StepLine[] | null {
    if (eq.operator !== ':' || !Number.isInteger(a) || !Number.isInteger(d) || d < 2 || d > 12 || a > MAX_MULDIV) return null;
    const q = Math.floor(a / d), r = a - q * d;
    if (q < 1 || r < 1 || eq.remainder !== r || eq.answer !== q) return null;
    return q <= 10 ? tafelRest(a, d, q, r) : splitsenRest(a, d, q, r);
}

// A list of jumps or running totals: "0, 4, 8, 12".
const countLine = (vals: number[], basis: boolean): StepLine =>
    ({ ...line('multiples', basis, vals.flatMap((v, i) => (i ? [{ t: 'sep' } as StepToken, num(v)] : [num(v)]))), aside: true });

// A tafel by herhaalde optelling (Op.stap 2.2.GL2.33: 3 × 2 = 2 + 2 + 2 = 6): a groups of b. "Alle stappen"
// adds the counting row (2, 4, 6).
function herhaaldeOptelling(a: number, b: number): StepLine[] | null {
    if (a < 2 || a > 9 || b < 2 || b > 10) return null;
    const terms = Array.from({ length: a }, () => b);
    return [line('parts', true, nums(terms)), countLine(terms.map((_, i) => b * (i + 1)), false), line('answer', true, [num(a * b)])];
}

// A deeltafel by counting in jumps of the deler (Op.stap 2.2.GL2.34: 20 : 4 → 4, 8, 12, 16, 20, 5 sprongen;
// from 0, like the met-rest kladlijn).
function sprongenDeel(a: number, d: number): StepLine[] | null {
    const q = a / d;
    if (q < 2) return null;
    return [countLine(Array.from({ length: q + 1 }, (_, i) => d * i), true), line('answer', true, [num(q)])];
}

function maalSteps(a: number, b: number): StepLine[] | null {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return eenhedenMaal(a, b);
    if (a < 2 || b < 2 || a * b > MAX_MULDIV) return null;
    // A tafel: herhaalde optelling, the method pupils learn it by (Op.stap L2-L3).
    if (a <= 10 && b <= 10) return herhaaldeOptelling(a, b);
    return analogieMaal(a, b) ?? splitsenMaal(a, b);
}

function deelSteps(a: number, d: number): StepLine[] | null {
    if (!Number.isInteger(a)) return eenhedenDeel(a, d);
    if (!Number.isInteger(d) || d < 2 || d > 9 || a > MAX_MULDIV || a % d !== 0) return null;
    // A deeltafel: counted in jumps of the deler (Op.stap L2-L3).
    if (a / d <= 10) return sprongenDeel(a, d);
    return analogieDeel(a, d) ?? splitsenDeel(a, d);
}

// The round number just above b (…8, …9, or 1–3 under a hundred): 99 → 100 − 1, 48 → 50 − 2.
function nearRound(b: number): { r: number; k: number } | null {
    if (b >= 100) { const r = Math.ceil(b / 100) * 100; if (r - b >= 1 && r - b <= 3) return { r, k: r - b }; }
    const r = Math.ceil(b / 10) * 10;
    return r - b >= 1 && r - b <= 3 ? { r, k: r - b } : null;
}

// Compenseren: 140 + 99 = 140 + 100 − 1 = 240 − 1 = 239; 475 − 29 = 475 − 30 + 1 = 445 + 1 = 446.
function compenserenPlusMin(a: number, b: number, o: '+' | '-'): StepLine[] | null {
    const n = nearRound(b);
    if (!n || a < 1 || (o === '-' && a < n.r) || a + b > MAX_HANDIG) return null;
    const first = o === '+' ? a + n.r : a - n.r;
    const back: '+' | '-' = o === '+' ? '-' : '+';
    return [
        line('split', true, [num(a), op(o), num(n.r), op(back), num(n.k)]),
        line('values', true, [num(first), op(back), num(n.k)]),
        line('answer', true, [num(o === '+' ? a + b : a - b)]),
    ];
}

// Compenseren ×: 9 × 13 = (10 − 1) × 13 = (10 × 13) − (1 × 13) = 130 − 13 = 117 (Op.stap 98 × 12).
function compenserenMaal(a: number, b: number): StepLine[] | null {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 2 || b < 2 || a * b > MAX_HANDIG) return null;
    for (const first of [true, false]) {
        const f = first ? a : b, g = first ? b : a;
        if (f < 8) continue;
        const n = nearRound(f);
        if (!n || n.k > 2) continue;
        const group = [OPEN, num(n.r), op('-'), num(n.k), CLOSE];
        const pr = (x: number) => (first ? bracket(x, 'x', g) : bracket(g, 'x', x));
        return [
            line('split', true, first ? [...group, op('x'), num(g)] : [num(g), op('x'), ...group]),
            line('distribute', true, [...pr(n.r), op('-'), ...pr(n.k)]),
            line('values', true, nums([n.r * g, n.k * g], '-')),
            line('answer', true, [num(a * b)]),
        ];
    }
    return null;
}

// Compenseren : (Op.stap 57 : 3 = (60 − 3) : 3 = (60 : 3) − (3 : 3) = 20 − 1 = 19; 62 300 : 7).
function compenserenDeel(a: number, d: number): StepLine[] | null {
    if (!Number.isInteger(a) || !Number.isInteger(d) || d < 2 || d > 9 || a % d !== 0 || a > MAX_HANDIG) return null;
    for (let j = 0; j <= 3; j++) {
        const s = d * 10 ** j, r = a + s;
        if (s >= a) break;
        if (r % 10 ** (j + 1) === 0 && r % d === 0) {
            return [
                line('split', true, [OPEN, num(r), op('-'), num(s), CLOSE, op(':'), num(d)]),
                line('distribute', true, [...bracket(r, ':', d), op('-'), ...bracket(s, ':', d)]),
                line('values', true, nums([r / d, s / d], '-')),
                line('answer', true, [num(a / d)]),
            ];
        }
    }
    return null;
}

// Ontbinden ×: 25 × 32 = 25 × 4 × 8 = 100 × 8 = 800 (Op.stap 2.2.GL6.35).
function ontbindenMaal(a: number, b: number): StepLine[] | null {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a * b > MAX_HANDIG) return null;
    for (const first of [true, false]) {
        const x = first ? a : b, y = first ? b : a;
        if (y <= 10) continue;
        for (let f1 = 2; f1 <= 9; f1++) {
            const round = x * f1;
            if ((round !== 10 && round !== 100 && round !== 1000) || y % f1 !== 0 || y / f1 < 2) continue;
            const f2 = y / f1;
            return first
                ? [line('split', true, joinWith([[num(x)], [num(f1)], [num(f2)]], 'x')), line('values', true, joinWith([[num(round)], [num(f2)]], 'x')), line('answer', true, [num(a * b)])]
                : [line('split', true, joinWith([[num(f2)], [num(f1)], [num(x)]], 'x')), line('values', true, joinWith([[num(f2)], [num(round)]], 'x')), line('answer', true, [num(a * b)])];
        }
    }
    return null;
}

// Ontbinden :: 3 000 : 12 = 3 000 : 3 : 4 = 1 000 : 4 = 250 (Op.stap 2.2.GL6.36); the roundest first quotient wins.
function ontbindenDeel(a: number, d: number): StepLine[] | null {
    if (!Number.isInteger(a) || !Number.isInteger(d) || d < 10 || a > MAX_HANDIG || a % d !== 0) return null;
    let best: [number, number] | null = null;
    for (let f1 = 2; f1 <= 9; f1++) {
        const f2 = d / f1;
        if (!Number.isInteger(f2) || f2 < 2 || f2 > 9 || a % f1 !== 0) continue;
        if (!best || trailingZeros(a / f1) > trailingZeros(a / best[0])) best = [f1, f2];
    }
    if (!best) return null;
    const [f1, f2] = best;
    return [
        line('split', true, joinWith([[num(a)], [num(f1)], [num(f2)]], ':')),
        line('values', true, joinWith([[num(a / f1)], [num(f2)]], ':')),
        line('answer', true, [num(a / d)]),
    ];
}

// The checks every strategy shares; returns the plain operands, or null for a shape steps never cover.
function plainOperands(eq: Equation, c?: Partial<AddSubConstraints>): [number, number] | null {
    if (!eq || eq.operands?.length !== 2) return null;
    if (eq.operators && eq.operators.some(o => o !== eq.operator)) return null;
    if (eq.missingIndex !== undefined || (eq.missingTerm && eq.missingTerm !== 'result')) return null;
    if (c?.equationType === 'puntoefening') return null;
    const [a, b] = eq.operands;
    if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) return null;
    return [a, b];
}

// Gemengd tags each exercise with its variant ('+:compenseren'); a block carries the preset itself.
function presetOf(eq: Equation, c?: Partial<AddSubConstraints>): string | null | undefined {
    if (!eq.variant) return c?.preset;
    const [vop, vpreset] = eq.variant.split(':');
    return vop === eq.operator ? (vpreset ?? 'vrij') : null;
}

// The standard method for one exercise, or null when none is specified for its shape. The constraints
// matter because the strategy follows the preset (compenseren / tienvoud), not the numbers alone.
export function workedSteps(eq: Equation, c?: Partial<AddSubConstraints>): StepLine[] | null {
    const ab = plainOperands(eq, c);
    if (!ab) return null;
    const preset = presetOf(eq, c);
    if (preset === null) return null;
    const [a, b] = ab;
    if (eq.remainder !== undefined) return preset && preset !== 'vrij' ? null : restSteps(eq, a, b);
    if (eq.operator === 'x') return preset && preset !== 'vrij' ? null : maalSteps(a, b);
    if (eq.operator === ':') return preset && preset !== 'vrij' ? null : deelSteps(a, b);
    if (eq.operator !== '+' && eq.operator !== '-') return null;
    if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
    if (preset === 'compenseren') return compenserenPlusMin(a, b, eq.operator);
    if (preset && preset !== 'vrij') return null;
    if (a < 10 || b < 1) return null;
    if (eq.operator === '+' ? a + b > MAX_ANSWER : a > MAX_ANSWER || b > a) return null;
    // One non-zero digit (47 + 8, 47 − 30): the first line would only repeat the sum. Open question.
    if (placeParts(b).length < 2) return null;
    return eq.operator === '+' ? rijgenOptellen(a, b) : rijgenAftrekken(a, b);
}

export interface HandigStrategy {
    name: 'Compenseren' | 'Ontbinden';
    lines: StepLine[];
}

// Handig rekenen (owner, 2026-11-12): an optional view for the pupil next to the standard method, never
// on the answer key. Worked out from the sum itself; a strategy equal to the standard steps is left out.
export function handigSteps(eq: Equation, c?: Partial<AddSubConstraints>): HandigStrategy[] {
    const ab = plainOperands(eq, c);
    // Compenseren and ontbinden are written for opgaande delingen only.
    if (!ab || presetOf(eq, c) === null || eq.remainder !== undefined) return [];
    const [a, b] = ab;
    const found: [HandigStrategy['name'], StepLine[] | null][] =
        eq.operator === 'x' ? [['Compenseren', compenserenMaal(a, b)], ['Ontbinden', ontbindenMaal(a, b)]]
        : eq.operator === ':' ? [['Compenseren', compenserenDeel(a, b)], ['Ontbinden', ontbindenDeel(a, b)]]
        : Number.isInteger(a) && Number.isInteger(b) ? [['Compenseren', compenserenPlusMin(a, b, eq.operator as '+' | '-')]]
        : [];
    const standard = workedSteps(eq, c);
    const key = (ls: StepLine[] | null) => (ls ? ls.map(l => stepText(l.tokens)).join('|') : '');
    return found.filter((f): f is [HandigStrategy['name'], StepLine[]] => !!f[1] && key(f[1]) !== key(standard)).map(([name, lines]) => ({ name, lines }));
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
        else if (tok.t === 'close') s += ')';
        else if (tok.t === 'eq') s += ' = ';
        else if (tok.t === 'and') s += ' en ';
        else if (tok.t === 'sep') s += ', ';
        else if (tok.t === 'rest') s += ' rest ';
        else s += ` ${tok.u}`;
    }
    return s;
}

// One line as the pupil reads it: "= …", or an aside on its own.
export function stepLineText(l: StepLine, fmt: (n: number) => string = String): string {
    return l.aside ? stepText(l.tokens, fmt) : `= ${stepText(l.tokens, fmt)}`;
}
