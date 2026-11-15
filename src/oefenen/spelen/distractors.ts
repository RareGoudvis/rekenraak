// Wrong options for a choice game (Ballonnen): typical slips on a + − × : sum, never the answer.
// Pure and seeded: the same sum and seed always give the same options in the same order.

export type Rng = () => number;

export interface SumFacts {
    // The right answer: a whole number, 0 or more.
    answer: number;
    // The two terms of the sum, left to right.
    operands: readonly number[];
    op: '+' | '-' | 'x' | ':';
}

export function mulberry32(seed: number): Rng {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A 32-bit seed from a text (the exercise key), so one sum keeps its options. */
export function seedOf(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return h >>> 0;
}

function shuffle<T>(list: T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// 34 → 43 (the tens and ones swapped); 3-digit answers swap their last two digits (152 → 125).
export function digitSwap(n: number): number | null {
    if (n < 10) return null;
    const s = String(n);
    const swapped = `${s.slice(0, -2)}${s.at(-1)}${s.at(-2)}`;
    // 40 → 04 is not a number a pupil would write.
    if (swapped.startsWith('0')) return null;
    const v = Number(swapped);
    return v === n ? null : v;
}

// × / : by 10, 100 or 1000: the factor (the deler), else null.
export function powerOfTen({ operands, op }: SumFacts): number | null {
    const [x = 0, y = 0] = operands;
    const pow = (n: number) => n === 10 || n === 100 || n === 1000;
    if (op === 'x') return pow(y) ? y : pow(x) ? x : null;
    return op === ':' && pow(y) ? y : null;
}

// The mistake families, each a list of candidates; one family per option first, so three options show three kinds of slip.
function families(facts: SumFacts): number[][] {
    const { answer: a, operands, op } = facts;
    const [x = 0, y = 0] = operands;
    // Tafels (owner 2026-11-14): a neighbouring row of the tafel (7 × 8 read as 6 × 8 or 7 × 7), the sum for the
    // product, ±1; for delen one jump too many or too few and the deler itself written as the answer.
    // 47 × 100: the neighbouring row is 46 or 48 hundreds (47 × 101 is no row a pupil reads).
    const p = op === 'x' ? powerOfTen(facts) : null;
    if (p !== null) { const b = p === y ? x : y; return [[(b + 1) * p, (b - 1) * p], [a + 10, a - 10]]; }
    // The sum for the product is a tafel slip (7 + 8 for 7 × 8); next to 4 × 155 = 620 a 159 is no option.
    if (op === 'x') return [[x * (y + 1), x * (y - 1), (x + 1) * y, (x - 1) * y], x <= 12 && y <= 12 ? [x + y] : [], [a + 1, a - 1], [a + 10, a - 10], ...bigSlips(a)];
    if (op === ':') return [[a + 1, a - 1], [y], [a + 2, a - 2], [a * 10]];
    // + read as − (and back): the pupil did the other operation.
    const other = op === '+' ? Math.abs(x - y) : x + y;
    const swap = digitSwap(a);
    return [
        [a + 1, a - 1],
        [a + 10, a - 10],
        [other],
        swap === null ? [] : [swap],
        ...bigSlips(a),
    ];
}

// Leerjaar 5–6 answers (owner 2026-11-15): from 1 000 on, a slip in the hundreds or thousands is as likely as ±1.
const bigSlips = (a: number): number[][] => (a >= 1000 ? [[a + 100, a - 100, a + 1000, a - 1000]] : []);

/**
 * Options for a whole-number answer that is no plain two-term sum (the tekst pack: afronden, herleidingen, a 3-term
 * sum): the answer and count − 1 wrong ones. near = the leaf's own slips, one family each, first; then ±step, ±10 step,
 * ±100 step and ±1000 step (from that size on) and a digit swap. step = the answer's own grain (afronden op H: 100).
 * min / max = the smallest and biggest option (0; a negative getallenrij allows less; max keeps a slip as short as the answers can be).
 */
export function numberChoicesOf(answer: number, rng: Rng, count = 4, near: readonly (readonly number[])[] = [], step = 1, min = 0, max = Infinity): number[] {
    const a = answer;
    const ok = (v: number, taken: readonly number[]) => Number.isInteger(v) && v >= min && v <= max && v !== a && !taken.includes(v);
    const generic: number[][] = [[a + step, a - step], [a + 10 * step, a - 10 * step]];
    if (Math.abs(a) >= 100 * step) generic.push([a + 100 * step, a - 100 * step]);
    if (Math.abs(a) >= 1000 * step) generic.push([a + 1000 * step, a - 1000 * step]);
    const swap = step === 1 && a >= 0 ? digitSwap(a) : null;
    if (swap !== null) generic.push([swap]);
    const out: number[] = [];
    // The leaf's slips in their own order, a random one per family; then the generic families shuffled.
    for (const f of [...near.map(f => shuffle([...f], rng)), ...shuffle(generic, rng).map(f => shuffle(f, rng))]) {
        if (out.length >= count - 1) break;
        const pick = f.find(v => ok(v, out));
        if (pick !== undefined) out.push(pick);
    }
    for (let d = 2; out.length < count - 1 && d < 1000; d++) {
        for (const v of shuffle([a + d * step, a - d * step], rng)) if (out.length < count - 1 && ok(v, out)) out.push(v);
    }
    return shuffle([a, ...out], rng);
}

/** Three wrong options from typical mistakes (±1, ±10, the other operation, a digit swap, a zero too many or too few), unique, never the answer, never negative; near numbers fill in. */
export function distractors(facts: SumFacts, rng: Rng, count = 3): number[] {
    const a = facts.answer;
    const ok = (v: number, taken: readonly number[]) => Number.isInteger(v) && v >= 0 && v !== a && !taken.includes(v);
    const out: number[] = [];
    // × / : 10, 100, 1000: one zero too many or too few (470 for 47 or 4 700) always comes first.
    if (count > 0 && powerOfTen(facts) !== null) {
        const zeros = shuffle([a * 10, a / 10], rng).find(v => ok(v, out));
        if (zeros !== undefined) out.push(zeros);
    }
    // Round 1: one candidate from each family in a random family order; round 2: the families' leftovers.
    const fams = shuffle(families(facts), rng).map(f => shuffle(f, rng));
    for (const f of fams) {
        if (out.length >= count) break;
        const pick = f.find(v => ok(v, out));
        if (pick !== undefined) out.push(pick);
    }
    for (const v of shuffle(fams.flat(), rng)) {
        if (out.length >= count) break;
        if (ok(v, out)) out.push(v);
    }
    // Near numbers when the rules gave too little (a tiny answer: 0, 1, 2).
    for (let d = 2; out.length < count; d++) {
        for (const v of shuffle([a + d, a - d], rng)) if (out.length < count && ok(v, out)) out.push(v);
    }
    return out;
}

/** The answer and its distractors in a seeded random order: what the balloons show. */
export function choicesOf(facts: SumFacts, rng: Rng, count = 4): number[] {
    return shuffle([facts.answer, ...distractors(facts, rng, count - 1)], rng);
}
