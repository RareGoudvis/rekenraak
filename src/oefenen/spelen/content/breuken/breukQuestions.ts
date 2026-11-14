// Breuken herkennen for the choice games: a picture to name, or a breuk to find among pictures.
// Pure and seeded: the same leerjaar and seed always give the same question and options.
import { mulberry32, type Rng } from '../../distractors';
import { BREUK_KINDS, BREUK_MAX_D, BREUK_MIN_D, type BreukKind } from './breukGeometry';

export interface Breuk { n: number; d: number }

export interface BreukItem extends Breuk {
    kind: BreukKind;
    // "3/8": what a text option or the prompt shows.
    text: string;
}

// picture → text: the prompt is a picture, the options breuken. text → picture: the other way round.
export type BreukDirection = 'picture-to-text' | 'text-to-picture';

export interface BreukQuestion {
    direction: BreukDirection;
    // The right breuk, drawn as `kind` (picture-to-text) or shown as its text (text-to-picture).
    prompt: BreukItem;
    // The answer and its distractors, shuffled; every option has the prompt's kind.
    options: BreukItem[];
    // Index of the right option in `options`.
    answer: number;
    // Stable id for the round ("3/8:pizza:picture-to-text").
    key: string;
}

/*
 * Noemers per leerjaar, from the breuken-herkennen leaf as the Eenvoudig cards seed it (cards.json):
 * L2 "Welk deel is gekleurd? (helft, kwart)" draws noemer 2..4, so thirds come along;
 * L3 and L4 "Breuk herkennen in een figuur" go to 16 on paper, but the pictures stop at 12 parts:
 * L3 to tienden (its veelhoek and hoeveelheid cards stop at 10), L4 to twaalfden.
 */
export function breukDenominators(leerjaar: number): number[] {
    const hi = leerjaar <= 2 ? 4 : leerjaar === 3 ? 10 : BREUK_MAX_D;
    return Array.from({ length: hi - BREUK_MIN_D + 1 }, (_, i) => BREUK_MIN_D + i);
}

/** Every proper breuk a leerjaar meets (1 ≤ n < d), smallest noemer first. 2/4 is its own item: 2 of 4 parts. */
export function breukPool(leerjaar: number): Breuk[] {
    return breukDenominators(leerjaar).flatMap(d => Array.from({ length: d - 1 }, (_, i) => ({ n: i + 1, d })));
}

export const breukText = ({ n, d }: Breuk): string => `${n}/${d}`;
export const sameValue = (a: Breuk, b: Breuk): boolean => a.n * b.d === b.n * a.d;

/** The picture kind of question `seed` in a round: consecutive seeds cycle pizza, taart, reep, strook, cirkel. */
export const kindFor = (seed: number): BreukKind => BREUK_KINDS[(Math.trunc(seed) % BREUK_KINDS.length + BREUK_KINDS.length) % BREUK_KINDS.length];

const item = (b: Breuk, kind: BreukKind): BreukItem => ({ n: b.n, d: b.d, kind, text: breukText(b) });

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const drawable = (b: Breuk) => b.d >= BREUK_MIN_D && b.d <= BREUK_MAX_D && b.n >= 1 && b.n < b.d;

/*
 * The typical slips, one family per option first so three options show three kinds of mistake:
 * the white parts counted instead of the coloured ones, the right teller under another noemer, one part
 * too many or few. Not teller and noemer swapped (8/3): an onechte breuk a leerjaar 2 pupil has not met, and
 * too plainly wrong to be a real trap (supervisor review 2026-11-14).
 */
function families({ n, d }: Breuk, denoms: readonly number[]): Breuk[][] {
    const near = [d - 1, d + 1, d - 2, d + 2].filter(x => denoms.includes(x));
    return [
        [{ n: d - n, d }],
        near.map(x => ({ n, d: x })),
        [{ n: n + 1, d }, { n: n - 1, d }],
    ];
}

/**
 * `count` wrong options for `answer`: never the answer, never a breuk equal in value to it or to
 * another option (2/4 next to 1/2 would be two right answers), no duplicates. Families first, then
 * the leerjaar's other breuken (same noemer first, then close in value), then any drawable breuk.
 */
export function breukDistractors(answer: Breuk, leerjaar: number, rng: Rng, count = 3, _direction: BreukDirection = 'picture-to-text'): Breuk[] {
    const denoms = breukDenominators(leerjaar);
    const picked: Breuk[] = [];
    // Every option is a proper breuk a picture could show, also as text.
    const fits = (b: Breuk) => drawable(b)
        && !sameValue(b, answer) && !picked.some(p => sameValue(p, b));
    const take = (b: Breuk) => { if (picked.length < count && fits(b)) picked.push(b); };

    const fams = families(answer, denoms).map(fam => shuffle(fam, rng));
    // Round-robin: the first fitting candidate of each family, then the next ones.
    for (let round = 0; picked.length < count && fams.some(fam => fam.length > round); round++) {
        for (const fam of fams) {
            const b = fam.slice(round).find(fits);
            if (b) take(b);
        }
    }
    const value = answer.n / answer.d;
    const byCloseness = (pool: Breuk[]) => shuffle(pool, rng)
        .sort((a, b) => Number(b.d === answer.d) - Number(a.d === answer.d) || Math.abs(a.n / a.d - value) - Math.abs(b.n / b.d - value));
    for (const b of byCloseness(breukPool(leerjaar))) take(b);
    for (const b of byCloseness(breukPool(BREUK_MAX_D))) take(b);
    return picked;
}

export interface BreukQuestionOptions {
    direction?: BreukDirection;
    kind?: BreukKind;
    // Options in all, the answer included (default 4).
    choiceCount?: number;
    // Leave this breuk out of the draw (the previous question), when the pool has others.
    avoid?: Breuk;
}

/** One question at a leerjaar. Without options the kind follows kindFor(seed) and the direction alternates with the seed. */
export function breukQuestion(leerjaar: number, seed: number, opts: BreukQuestionOptions = {}): BreukQuestion {
    const rng = mulberry32(seed);
    const all = breukPool(leerjaar);
    const pool = opts.avoid ? all.filter(b => !(b.n === opts.avoid!.n && b.d === opts.avoid!.d)) : all;
    const answer = pool[Math.floor(rng() * pool.length)] ?? all[0];
    const kind = opts.kind ?? kindFor(seed);
    const direction = opts.direction ?? (Math.trunc(seed) % 2 === 0 ? 'picture-to-text' : 'text-to-picture');
    const wrong = breukDistractors(answer, leerjaar, rng, Math.max(1, (opts.choiceCount ?? 4) - 1), direction);
    const options = shuffle([answer, ...wrong], rng).map(b => item(b, kind));
    return {
        direction, prompt: item(answer, kind), options,
        answer: options.findIndex(o => o.n === answer.n && o.d === answer.d),
        key: `${breukText(answer)}:${kind}:${direction}`,
    };
}

/** A round of `length` questions: the kinds rotate, the directions alternate, no breuk twice in a row. */
export function breukRound(leerjaar: number, seed: number, length: number, choiceCount = 4): BreukQuestion[] {
    const out: BreukQuestion[] = [];
    for (let i = 0; i < length; i++) {
        const prev = out[i - 1]?.prompt;
        out.push(breukQuestion(leerjaar, (seed + i) >>> 0, {
            kind: kindFor(i), direction: i % 2 === 0 ? 'picture-to-text' : 'text-to-picture', choiceCount, avoid: prev,
        }));
    }
    return out;
}

/** Memory (Hartjes koppelen, later): `count` breuken of different value, each to pair its picture with its text. */
export function breukPairs(leerjaar: number, seed: number, count: number): BreukItem[] {
    const rng = mulberry32(seed);
    const out: Breuk[] = [];
    for (const b of shuffle(breukPool(leerjaar), rng)) {
        if (out.length >= count) break;
        if (!out.some(o => sameValue(o, b))) out.push(b);
    }
    return out.map((b, i) => item(b, kindFor(i)));
}
