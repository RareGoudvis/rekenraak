// Wrong options for a choice game (Ballonnen): typical slips on a + or − sum, never the answer.
// Pure and seeded: the same sum and seed always give the same options in the same order.

export type Rng = () => number;

export interface SumFacts {
    // The right answer: a whole number, 0 or more.
    answer: number;
    // The two terms of the sum, left to right.
    operands: readonly number[];
    op: '+' | '-';
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
function digitSwap(n: number): number | null {
    if (n < 10) return null;
    const s = String(n);
    const swapped = `${s.slice(0, -2)}${s.at(-1)}${s.at(-2)}`;
    // 40 → 04 is not a number a pupil would write.
    if (swapped.startsWith('0')) return null;
    const v = Number(swapped);
    return v === n ? null : v;
}

// The mistake families, each a list of candidates; one family per option first, so three options show three kinds of slip.
function families({ answer: a, operands, op }: SumFacts): number[][] {
    const [x = 0, y = 0] = operands;
    // + read as − (and back): the pupil did the other operation.
    const other = op === '+' ? Math.abs(x - y) : x + y;
    const swap = digitSwap(a);
    return [
        [a + 1, a - 1],
        [a + 10, a - 10],
        [other],
        swap === null ? [] : [swap],
    ];
}

/** Three wrong options from typical mistakes (±1, ±10, the other operation, a digit swap), unique, never the answer, never negative; near numbers fill in. */
export function distractors(facts: SumFacts, rng: Rng, count = 3): number[] {
    const a = facts.answer;
    const ok = (v: number, taken: readonly number[]) => Number.isInteger(v) && v >= 0 && v !== a && !taken.includes(v);
    const out: number[] = [];
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
