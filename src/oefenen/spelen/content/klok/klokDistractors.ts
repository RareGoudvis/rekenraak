import type { Rng } from '../../distractors';

// Wrong clock times for a klok game: the typical slips of a pupil reading or setting a clock. Pure and
// seeded. Times are minutes in a day (0–1439); a face has no ochtend / avond, so two times 12 hours apart
// are one choice (08:15 and 20:15 are never both shown) and never the answer's twin.

export interface KlokTime { h: number; m: number }

// The finest step the card asks (minutes): 60 = hele uren, 30 = halve, 15 = kwartieren, 5, 1.
export type KlokGrain = 60 | 30 | 15 | 5 | 1;

const DAY = 24 * 60;
const FACE = 12 * 60;
const wrap = (n: number, mod: number) => ((n % mod) + mod) % mod;
const absOf = (t: KlokTime) => wrap(t.h * 60 + t.m, DAY);
export const timeOf = (a: number): KlokTime => ({ h: Math.floor(wrap(a, DAY) / 60), m: wrap(a, DAY) % 60 });

/** The card's grain from its tijdstypes; the exercise's own minutes guard a drifted setting. */
export function grainOf(timeTypes: unknown, minutes: number): KlokGrain {
    const types = Array.isArray(timeTypes) ? (timeTypes as string[]) : [];
    const want: KlokGrain = types.includes('nauwkeurig_1') ? 1 : types.includes('nauwkeurig_5') ? 5
        : types.includes('kwartier_over') || types.includes('kwartier_voor') ? 15 : types.includes('halve_uren') ? 30 : 60;
    return ([want, 30, 15, 5, 1] as KlokGrain[]).find(g => g <= want && minutes % g === 0) ?? 1;
}

export interface KlokSlipOptions {
    grain: KlokGrain;
    // The pupil answers in words (analoog → woorden): the half trap is then the hour before, not after.
    wordsAnswer: boolean;
}

function shuffle<T>(list: T[], rng: Rng): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// The slips, as day minutes. traps = always offered first (the classic confusions), families = one each, shuffled.
export function klokSlips(t: KlokTime, { grain, wordsAnswer }: KlokSlipOptions): { traps: number[]; families: number[][] } {
    const a = absOf(t);
    const { h, m } = t;
    // The answer's half of the day, so a 24-hour card keeps its slips in the same ochtend / namiddag.
    const base = h >= 12 ? FACE : 0;
    const traps: number[] = [];
    // "Half drie" is 2:30: read as 3:30 (the hour after). In words the pupil names the hour the kleine wijzer just passed ("half 2").
    if (m === 30) traps.push(wordsAnswer ? a - 60 : a + 60);
    // Kwart over ↔ kwart voor the same hour: kwart over 8 (8:15) for kwart voor 8 (7:45), and back.
    if (m === 15) traps.push(a - 30);
    if (m === 45) traps.push(a + 30);
    const families: number[][] = [];
    if (m % 5 === 0) {
        // The hands swapped: the grote wijzer read as the hour, the kleine as the minutes (8:15 → 3:40),
        // or only the grote wijzer read as the hour (8:00 → 12:00).
        const asHour = (m / 5) % 12;
        families.push([base + asHour * 60 + (h % 12) * 5, base + asHour * 60 + m]);
    }
    // The other kwart of the same hour (8:15 ↔ 8:45).
    if (m === 15 || m === 45) families.push([m === 15 ? a + 30 : a - 30]);
    // One cijfer too far or too short.
    if (grain <= 5) families.push([a + 5, a - 5]);
    // The wrong hour with the right minutes.
    families.push([a + 60, a - 60]);
    return { traps, families };
}

/** count wrong times: the traps, then one per family, then the leftovers, then near times on the card's grain; unique on the face, never the answer. */
export function klokDistractors(t: KlokTime, opts: KlokSlipOptions, rng: Rng, count = 3): KlokTime[] {
    const a = absOf(t);
    const taken = new Set([wrap(a, FACE)]);
    const out: number[] = [];
    const add = (v: number) => {
        const w = wrap(v, DAY);
        if (out.length >= count || wrap(w, opts.grain) !== 0 || taken.has(wrap(w, FACE))) return;
        taken.add(wrap(w, FACE));
        out.push(w);
    };
    const { traps, families } = klokSlips(t, opts);
    traps.forEach(add);
    const fams = shuffle(families, rng).map(f => shuffle(f, rng));
    for (const f of fams) {
        const before = out.length;
        for (const v of f) if (out.length === before) add(v);
    }
    for (const v of shuffle(fams.flat(), rng)) add(v);
    // Near times: a step of the grain either way, further out until there are enough (a face has 720 minutes).
    for (let k = 1; out.length < count && k * opts.grain < FACE; k++) for (const v of shuffle([a + k * opts.grain, a - k * opts.grain], rng)) add(v);
    return out.map(timeOf);
}

/** The answer and its distractors in a seeded random order. */
export function klokChoicesOf(t: KlokTime, opts: KlokSlipOptions, rng: Rng, count = 4): KlokTime[] {
    return shuffle([timeOf(absOf(t)), ...klokDistractors(t, opts, rng, count - 1)], rng);
}
