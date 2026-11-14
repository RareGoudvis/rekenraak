import type { BreukBewerkExercise, Fraction, FractionExercise, OrdenenExercise } from '../../../../services/math/types';
import type { KioskAnswer } from '../../../../services/oefenen/types';
import { kioskFor } from '../../../../services/oefenen/kiosk';
import type { CardVariant } from '../../../../config/eenvoudig/cards';
import { resolveCard } from '../../../../config/eenvoudig/resolveCard';
import { mulberry32, seedOf, type Rng } from '../../distractors';
import type { SpelChoiceView, SpelPack, SpelPackBoard, SpelPackQuestion, SpelVisual } from '../pack';
import { BREUK_MAX_D, BREUK_MIN_D, breukAriaLabel, type BreukKind } from './breukGeometry';
import { breukDistractors, breukText, kindFor, sameValue, type Breuk } from './breukQuestions';
import { BREUK_TIPS } from './breukHelp';
import { breukComb } from './breukComb';

// The breuken as game content (owner 2026-11-14). Every question is a made kiosk exercise of the card, shown as
// choices; the kiosk still checks the pick and Nakijken replays the exercise.
//   herkennen      Breuken herkennen (L2–L4): a picture → its breuk, or a breuk → its picture.
//   gelijkwaardig  Gelijkwaardige breuken (L4): "6/8 is gelijk aan ?" → 3/4.
//   vereenvoudig   the same card: "Vereenvoudig: 6/9 = ?" → 2/3.
//   gelijknamig    Breuken gelijknamig maken (L4): "3/8 is gelijknamig met ?" → the other breuk over 8.
//   vergelijken    Breuken ordenen (L4): two of its breuken, "3/4 ? 2/3" → < = >.

export type BreukSpel = 'herkennen' | 'gelijkwaardig' | 'vereenvoudig' | 'gelijknamig' | 'vergelijken';

export const BREUK_LEAVES = ['breuken-herkennen', 'breuken-vereenvoudigen', 'breuken-gelijknamig', 'breuken-rangschikken'] as const;

// Breuken open Spelen one leerjaar further than the sums (owner 2026-11-14).
export const BREUK_MAX_GRADE = 4;

// Picture options stop at tienden: elf- and twaalfden read only on the big sign (they get text options).
export const PICTURE_OPTION_MAX_D = 10;

/** The question types a card plays, from its leaf and its settings; [] = no game form (onechte breuken, a free noemer pair). */
export function breukSpelOf(leafId: string, c: Record<string, unknown>): BreukSpel[] {
    if (c.allowImproper === true) return [];
    switch (leafId) {
        case 'breuken-herkennen': return ['herkennen'];
        case 'breuken-vereenvoudigen': return ['gelijkwaardig', 'vereenvoudig'];
        // Leerjaar 4: one noemer a multiple of the other, so one breuk keeps its noemer and the other one gets it.
        case 'breuken-gelijknamig': return c.denominatorRelation === 'multiple' ? ['gelijknamig'] : [];
        case 'breuken-rangschikken': return ['vergelijken'];
        default: return [];
    }
}

const variantSpel = new Map<string, BreukSpel[]>();
/** What a card variant plays, from its resolved settings (cached per variant). */
export function breukSpelOfVariant(v: CardVariant): BreukSpel[] {
    let out = variantSpel.get(v.id);
    if (!out) {
        try { out = breukSpelOf(v.leafId, resolveCard(v).constraints); } catch { out = []; }
        variantSpel.set(v.id, out);
    }
    return out;
}

/** The board rounds a card fills: memory pairs (picture ↔ breuk, breuk ↔ vereenvoudigd), the equivalence comb (Honingraat). */
export function breukBoardsOf(spel: readonly BreukSpel[]): SpelPackBoard[] {
    const out = new Set<SpelPackBoard>();
    for (const s of spel) {
        if (s === 'herkennen') out.add('pairs');
        if (s === 'vereenvoudig' || s === 'gelijkwaardig') { out.add('pairs'); out.add('target'); }
    }
    return [...out];
}

// ── helpers ──────────────────────────────────────────────────────────────────

const whole = (x: number) => Number.isInteger(x);
const isProper = (b: Breuk) => whole(b.n) && whole(b.d) && b.n >= 1 && b.d >= 2 && b.n < b.d;
const reduced = ({ n, d }: Breuk): Breuk => {
    let a = n, b = d;
    while (b) [a, b] = [b, a % b];
    return { n: n / a, d: d / a };
};
const drawable = (b: Breuk) => isProper(b) && b.d >= BREUK_MIN_D && b.d <= BREUK_MAX_D;

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// A strook of 7 or more cells is too thin in a game (a balloon, a heart, the sign): a cirkel instead.
const smallShape = (shape: BreukKind, bs: readonly Breuk[]): BreukKind => (shape === 'strook' && bs.some(b => b.d > 6) ? 'cirkel' : shape);

const picture = (b: Breuk, shape: BreukKind, other?: Breuk): SpelVisual =>
    ({ kind: 'breuk', n: b.n, d: b.d, shape, ...(other && { with: { n: other.n, d: other.d } }) });
const textView = (b: Breuk): SpelChoiceView => ({ text: breukText(b), label: breukText(b) });
const pictureView = (b: Breuk, shape: BreukKind): SpelChoiceView => ({ visual: picture(b, shape), label: breukAriaLabel(shape, b.n, b.d) });

/**
 * Pick `count` options from candidate families, one per family in turn (so the options show different
 * slips), then from `fill`. `ok` decides what may stand beside the answer and the options picked so far.
 */
function pickFamilies(families: readonly Breuk[][], fill: readonly Breuk[], count: number, ok: (b: Breuk, picked: readonly Breuk[]) => boolean): Breuk[] {
    const picked: Breuk[] = [];
    const take = (b: Breuk) => { if (picked.length < count && ok(b, picked)) { picked.push(b); return true; } return false; };
    for (let round = 0; picked.length < count && families.some(f => f.length > round); round++) {
        for (const fam of families) {
            for (const b of fam.slice(round)) if (take(b)) break;
        }
    }
    for (const b of fill) take(b);
    return picked;
}

// Every proper breuk up to twaalfden, the ones nearest `value` first (same noemer first on ties).
function nearBreuken(value: number, rng: Rng, d?: number): Breuk[] {
    const all: Breuk[] = [];
    for (let dd = 2; dd <= BREUK_MAX_D; dd++) for (let n = 1; n < dd; n++) all.push({ n, d: dd });
    return shuffle(all, rng).sort((a, b) => Number(b.d === d) - Number(a.d === d) || Math.abs(a.n / a.d - value) - Math.abs(b.n / b.d - value));
}

// ── herkennen ────────────────────────────────────────────────────────────────

function herkennen(ex: FractionExercise, c: Record<string, unknown>, key: string, rng: Rng, choiceCount: number): SpelPackQuestion | null {
    const answer: Breuk = { n: ex.numerator, d: ex.denominator };
    // The card may draw noemers to 16; a picture stops at 12 parts (the session draws again).
    if (!drawable(answer) || (ex.wholes ?? 1) !== 1) return null;
    const toPicture = answer.d <= PICTURE_OPTION_MAX_D && rng() < 0.5;
    // The leerjaar's noemers: helft en kwart at leerjaar 2, tienden for picture options, else to twaalfden.
    const level = Number(c.maxDenominator ?? BREUK_MAX_D) <= 4 ? 2 : toPicture || answer.d <= PICTURE_OPTION_MAX_D ? 3 : 4;
    const wrong = breukDistractors(answer, level, rng, Math.max(1, choiceCount - 1), toPicture ? 'text-to-picture' : 'picture-to-text');
    const options = shuffle([answer, ...wrong], rng);
    if (toPicture && options.some(o => o.d > PICTURE_OPTION_MAX_D)) return null;
    const text = breukText(answer);
    const shape = smallShape(kindFor(seedOf(key)), options);
    return {
        text: toPicture ? `Waar is ${text} gekleurd?` : 'Welk deel is gekleurd?',
        ...(!toPicture && { visual: picture(answer, shape) }),
        answer: text,
        choices: options.map(breukText),
        views: options.map(o => (toPicture ? pictureView(o, shape) : textView(o))),
        // The kiosk's fraction input: [noemer, teller].
        kioskAnswers: options.map(o => [String(o.d), String(o.n)]),
        help: { tip: BREUK_TIPS.herkennen, visual: picture(answer, shape) },
        // On a heart the picture is smaller than on the sign: tienden at most.
        ...(answer.d <= PICTURE_OPTION_MAX_D && { pair: { sum: pictureView(answer, shape), answer: textView(answer) } }),
        same: breukText(reduced(answer)),
    };
}

// ── gelijkwaardig / vereenvoudig ─────────────────────────────────────────────

/**
 * The slips on 6/8 → 3/4 (owner brief): only the teller divided (3/8), only the noemer (6/4), the same number
 * added instead of a division (7/9), subtracted (6/9 → 3/6), simplified too far (1/2, 1/3). Never a breuk
 * equal in value to the answer or to another option, never a whole number.
 */
export function simplifyDistractors(f: Breuk, a: Breuk, spel: 'gelijkwaardig' | 'vereenvoudig', rng: Rng, count = 3): Breuk[] {
    const g = f.n / a.n;
    const teller = [{ n: f.n / g, d: f.d }];
    const noemer = [{ n: f.n, d: f.d / g }];
    const plus = [{ n: f.n + 1, d: f.d + 1 }, { n: f.n + g, d: f.d + g }];
    const minus = [{ n: f.n - g, d: f.d - g }];
    const far = shuffle([{ n: Math.floor(a.n / 2), d: Math.floor(a.d / 2) }, ...(a.n % 2 === 0 ? [{ n: a.n / 2, d: a.d }] : []), { n: 1, d: a.d }], rng);
    const near = shuffle([{ n: a.n + 1, d: a.d }, { n: a.n, d: a.d + 1 }, { n: a.n - 1, d: a.d }], rng);
    // Three of the four slips per question, a different three over the round.
    const families = [...shuffle(spel === 'gelijkwaardig' ? [teller, noemer, plus, far] : [minus, teller, far, noemer], rng), near];
    // Only the noemer divided may give an onechte breuk (6/4): the owner's own example; never a whole number.
    const fine = (b: Breuk) => whole(b.n) && whole(b.d) && b.n >= 1 && b.d >= 2 && b.n % b.d !== 0 && b.d <= 20 && b.n <= 20
        && (b.n < b.d || noemer.some(x => x.n === b.n && x.d === b.d));
    return pickFamilies(families, nearBreuken(a.n / a.d, rng, a.d), count,
        (b, picked) => fine(b) && !sameValue(b, a) && !picked.some(p => sameValue(p, b)));
}

function simplify(ex: BreukBewerkExercise, spel: 'gelijkwaardig' | 'vereenvoudig', key: string, rng: Rng, choiceCount: number): SpelPackQuestion | null {
    const f = ex.inputs?.[0], a = ex.answers?.[0];
    // Only breuken that really simplify (an "allowIrreducible" 5/7 has no game form).
    if (!f || !a || f.whole || a.whole || !isProper(f) || !isProper(a) || a.d >= f.d || !sameValue(f, a)) return null;
    const options = shuffle([a, ...simplifyDistractors(f, a, spel, rng, Math.max(1, choiceCount - 1))], rng);
    const shape = smallShape(kindFor(seedOf(key)), [f]);
    return {
        text: spel === 'vereenvoudig' ? `Vereenvoudig: ${breukText(f)} = ?` : `${breukText(f)} is gelijk aan ?`,
        answer: breukText(a),
        choices: options.map(breukText),
        views: options.map(textView),
        kioskAnswers: options.map(breukText),
        // Both pictures side by side: the same part of the whole.
        help: { tip: BREUK_TIPS[spel], ...(drawable(f) && { visual: picture(f, shape, a) }) },
        pair: { sum: textView(f), answer: textView(a) },
        same: breukText(a),
    };
}

// ── gelijknamig ──────────────────────────────────────────────────────────────

/** Breuken that are NOT over noemer L, as the pupil slips: the breuk unchanged (1/4), the new teller over the old noemer (2/4), a noemer nearby. */
export function gelijknamigDistractors(prompt: Breuk, source: Breuk, answer: Breuk, rng: Rng, count = 3): Breuk[] {
    const L = answer.d;
    const families = [
        [source],
        [{ n: answer.n, d: source.d }, { n: prompt.n, d: source.d }],
        shuffle([L - 1, L + 1, L - 2, L + 2, 2 * L].map(d => ({ n: answer.n, d })), rng),
    ];
    const texts = (bs: readonly Breuk[]) => bs.map(breukText);
    return pickFamilies(families, nearBreuken(answer.n / answer.d, rng).filter(b => b.d !== L), count,
        (b, picked) => isProper(b) && b.d !== L && b.d <= 20 && !texts(picked).includes(breukText(b)) && breukText(b) !== breukText(prompt));
}

function gelijknamig(ex: BreukBewerkExercise, key: string, rng: Rng, choiceCount: number): SpelPackQuestion | null {
    const [f1, f2] = ex.inputs ?? [];
    const [a1, a2] = ex.answers ?? [];
    if (!f1 || !f2 || !a1 || !a2 || ![f1, f2, a1, a2].every(isProper) || a1.d !== a2.d) return null;
    // The breuk that already has the common noemer asks; the other one, made gelijknamig, is the answer.
    const keep = f1.d === a1.d ? 0 : f2.d === a2.d ? 1 : -1;
    if (keep < 0) return null;
    const prompt = keep === 0 ? a1 : a2, answer = keep === 0 ? a2 : a1, source = keep === 0 ? f2 : f1;
    if (answer.n === prompt.n) return null;
    const options = shuffle([answer, ...gelijknamigDistractors(prompt, source, answer, rng, Math.max(1, choiceCount - 1))], rng);
    const shape = smallShape(kindFor(seedOf(key)), [prompt]);
    // The kiosk checks both breuken: the asked one as it is and the picked one beside it.
    const kiosk = (o: Breuk): KioskAnswer => (keep === 0 ? [breukText(prompt), breukText(o)] : [breukText(o), breukText(prompt)]);
    return {
        text: `${breukText(prompt)} is gelijknamig met ?`,
        answer: breukText(answer),
        choices: options.map(breukText),
        views: options.map(textView),
        kioskAnswers: options.map(kiosk),
        help: { tip: BREUK_TIPS.gelijknamig, ...(drawable(prompt) && drawable(answer) && { visual: picture(prompt, shape, answer) }) },
    };
}

// ── vergelijken ──────────────────────────────────────────────────────────────

export const COMPARE_CHOICES = ['<', '=', '>'] as const;
const COMPARE_LABELS: Record<string, string> = { '<': 'kleiner dan', '=': 'gelijk aan', '>': 'groter dan' };
const isFraction = (v: unknown): v is Fraction => typeof v === 'object' && v !== null && 'n' in v && 'd' in v;
const valueOf = (b: Breuk) => b.n / b.d;

/** "3/4 ? 2/3": two of the card's breuken (now and then a gelijkwaardige pair, so = is sometimes right). */
function vergelijken(ex: OrdenenExercise, c: Record<string, unknown>, typeId: string, rng: Rng): SpelPackQuestion | null {
    const vals = (ex.display ?? []).filter(isFraction).filter(f => !f.whole && isProper(f));
    if (vals.length < 2) return null;
    const i = Math.floor(rng() * vals.length);
    const j = (i + 1 + Math.floor(rng() * (vals.length - 1))) % vals.length;
    let pair: Breuk[] = [vals[Math.min(i, j)], vals[Math.max(i, j)]];
    // Ongelijknamige breuken: one in five asks a breuk against its own gelijkwaardige one (2/3 = 4/6).
    if (c.fractionMode === 'gelijknamig-te-maken' && rng() < 0.2) {
        const a = pair[0];
        const k = [2, 3].find(x => a.d * x <= BREUK_MAX_D);
        if (k) pair = shuffle([a, { n: a.n * k, d: a.d * k }], rng);
    }
    const [a, b] = pair;
    const answer = sameValue(a, b) ? '=' : valueOf(a) < valueOf(b) ? '<' : '>';
    const operator = ex.operator === '>' ? '>' : '<';
    const values = [...pair].sort((x, y) => (operator === '<' ? valueOf(x) - valueOf(y) : valueOf(y) - valueOf(x)));
    const asked: OrdenenExercise = { id: ex.id, values, display: pair, operator, isManuallyEdited: false };
    const right = kioskFor(typeId)?.answerOf(asked, c)[0];
    if (right === undefined) return null;
    return {
        text: `${breukText(a)} ? ${breukText(b)}`,
        answer,
        choices: [...COMPARE_CHOICES],
        views: COMPARE_CHOICES.map(x => ({ text: x, label: COMPARE_LABELS[x] })),
        // The kiosk orders the two breuken: the right sign gets the right order, any other sign no order at all.
        kioskAnswers: COMPARE_CHOICES.map(x => (x === answer ? right : '×')),
        help: { tip: BREUK_TIPS.vergelijken, ...(drawable(a) && drawable(b) && { visual: picture(a, 'pizza', b) }) },
        exercise: asked,
    };
}

// ── the pack ─────────────────────────────────────────────────────────────────

/** The game question for a made breuken exercise; null = this exercise has no game form (the session draws again). */
export function breukPackQuestion(leafId: string, typeId: string, exercise: unknown, c: Record<string, unknown>, key: string, choiceCount = 4): SpelPackQuestion | null {
    const spel = breukSpelOf(leafId, c);
    if (!spel.length || !exercise) return null;
    const rng = mulberry32(seedOf(key));
    // The card's types take turns by the exercise (Gelijkwaardige breuken: gelijkwaardig and vereenvoudig).
    const kind = spel[Math.floor(rng() * spel.length)];
    switch (kind) {
        case 'herkennen': return herkennen(exercise as FractionExercise, c, key, rng, choiceCount);
        case 'gelijkwaardig':
        case 'vereenvoudig': return simplify(exercise as BreukBewerkExercise, kind, key, rng, choiceCount);
        case 'gelijknamig': return gelijknamig(exercise as BreukBewerkExercise, key, rng, choiceCount);
        case 'vergelijken': return vergelijken(exercise as OrdenenExercise, c, typeId, rng);
    }
}

export const BREUK_PACK: SpelPack = {
    leaves: BREUK_LEAVES,
    maxGrade: BREUK_MAX_GRADE,
    partial: true,
    plays: v => breukSpelOfVariant(v).length > 0,
    boardsOf: v => breukBoardsOf(breukSpelOfVariant(v)),
    // Honingraat: the equivalence comb, for Gelijkwaardige breuken only.
    targetBoard: (type, sample, size, index, rng) => (breukSpelOf(type.leafId, sample.constraints).includes('vereenvoudig') ? breukComb(type, sample, size, index, rng) : null),
    question: (type, made, choiceCount) => breukPackQuestion(type.leafId, type.typeId, made.exercise, made.constraints, made.key, choiceCount),
};
