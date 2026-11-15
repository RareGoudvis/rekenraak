import type {
    AfrondenExercise, ControleExercise, DeelbaarheidExercise, DeelbaarheidKleurExercise, Equation, EvenOnevenExercise, FractionExercise,
    GeldRekenenExercise, GeldTeruggevenExercise, GetalFunctieExercise, GetallenasExercise, HerleidingExercise, MaateenheidExercise,
    MabExercise, MeetExercise, PatroonExercise, PlaatswaardeExercise, ProcentExercise, RomeinseExercise, SchattendExercise,
    SplitsenExercise, TemperatuurExercise, TijdsduurExercise, VergelijkenExercise, VormleerExercise,
} from '../../../../services/math/types';
import type { KioskAnswer, KioskDescriptor } from '../../../../services/oefenen/types';
import { kioskInputOf } from '../../../../services/oefenen/kiosk';
import { formatMathNumber } from '../../../../services/math/formatters';
import { roundTo, targetsFor, usableTargets } from '../../../../services/afronden/afrondenGenerator';
import { plaatsView } from '../../../../services/plaatswaarde/plaatswaardeGenerator';
import { ladderFor } from '../../../../services/herleidingen/herleidingenGenerator';
import { toRoman } from '../../../../services/romeinse/romeinseGenerator';
import type { SpelKey } from '../../accepts';
import type { SpelVisual } from '../pack';
import { rijText } from '../../spelFormat';

// The tekst pack's leaves (tekstPack.ts): Zelf oefenen content whose kiosk exercise asks ONE value that a plain
// line of text can carry ("491 ≈ ? (op tiental)", "Een hoek van 62° is een ?"). Each entry says how its answers
// reach a game and builds the sign's line; where the kiosk card asks several values (a rij, a rooster), the game
// asks one of them as its own small kiosk exercise (`exercise` / `constraints`), which Nakijken then replays.
// Left out on purpose (the picture IS the question): MAB / geld / thermometer / weegschaal reading, getallenas,
// oppervlakte by counting squares, hoeken tekenen, and every cijferen grid.

export type Rng = () => number;
type C = Record<string, unknown>;

// What a variant's answers are for a game: 'number' = whole numbers ≥ 0 (typed or tapped: every game); 'typed' =
// numbers with a comma or a minus (every game but the digit-only ones; the keypad gets the leaf's keys); 'tap' = words
// (tap games only); null = these settings have no game form.
export type TekstPlay = 'number' | 'typed' | 'tap' | null;

interface AskBase {
    // The sign: one line, one '?' where the answer goes.
    text: string;
    // The kiosk exercise and settings actually asked, when the game asks a part of the made one.
    exercise?: unknown;
    constraints?: C;
    // How the sign draws the question instead of the line (a rij as number tiles); the line stays for aria and text-only signs.
    visual?: SpelVisual;
}
// A number: the answer with dp decimals; near = the leaf's own slips (each list one family, in that order);
// step = the answer's grain for the generic ±1 / ±10 slips (afronden op H: 100); min = the smallest option.
export interface NumberAsk extends AskBase {
    kind: 'number';
    answer: number;
    dp?: number;
    near?: number[][];
    step?: number;
    min?: number;
    // How an option reads on a target ("€ 2,50"; absent = the number) and what the kiosk check gets for it (absent = the number).
    show?(v: number): string;
    kiosk?(v: number): KioskAnswer;
}
// A word choice: the answer among options (all of them, the answer included); labels = accessible names.
export interface WordAsk extends AskBase {
    kind: 'words';
    answer: string;
    options: string[];
    labels?: Record<string, string>;
    kiosk?(option: string): KioskAnswer;
}
export type TekstAsk = NumberAsk | WordAsk;

export interface TekstLeaf {
    playsAs(c: C): TekstPlay;
    // The longest answer for these settings in digits and minus signs (a comma is as thin as the thousands space the
    // tap targets were measured with, "89 991" = 5); absent = words (the faces size themselves).
    chars?(c: C): number | undefined;
    // A 'typed' variant's extra keypad keys; absent = the comma.
    keys?(c: C): readonly SpelKey[];
    ask(ex: unknown, c: C, rng: Rng, d: KioskDescriptor): TekstAsk | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const nt = (c: C) => (c.numberType as string | undefined) ?? 'natural';
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
const len = (n: number) => String(Math.floor(Math.abs(n))).length;
const isPow10 = (n: number) => /^10*$/.test(String(n));
// A number as the sheet prints it, with the true minus.
const show = (n: number) => formatMathNumber(String(Number(n.toFixed(9)))).replace('-', '−');
const pick = <T>(list: readonly T[], rng: Rng): T | undefined => list[Math.floor(rng() * list.length)];
// The kiosk's first spelling as a number ('2,5' and '2.5' both).
const answerNumber = (d: KioskDescriptor, ex: unknown, c: C): number | null => {
    const first = d.answerOf(ex, c)[0];
    const v = first === undefined ? NaN : Number(first.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(v) ? v : null;
};
const decimalsOf = (n: number) => (String(Number(n.toFixed(9))).split('.')[1] ?? '').length;
// The display line with the sheet's minus.
const minus = (s: string) => s.replace(/(^|[\s(|–])-(?=\d)/g, '$1−');
const JA_NEE = ['ja', 'nee'];
// A number keeps its unit on its line when a long sign wraps (−1 °C, € 2,50).
const NB = ' ';
// The whole-number place keys, high to low (a decimal mask's highest one bounds its operand).
const INT_PLACES = ['M', 'HD', 'TD', 'D', 'H', 'T', 'E'];

// The rounding place in words on a game sign; the sheet's own shorthand for the millions (1M … 1MLD, owner 2026-09-27) is no game line.
const MILLIONS: Readonly<Record<string, string>> = { '1M': 'miljoen', '10M': 'tien miljoen', '100M': 'honderd miljoen', '1MLD': 'miljard' };
const placeWords = (text: string, label: string) => text.replace(/\(op [^)]*\)$/, `(op ${MILLIONS[label] ?? label})`);

// ── afronden (simpel, and a rooster asked one number at a time) ─────────────

function afrondenTargets(c: C) {
    const dec = nt(c) === 'decimal';
    if ((c.subType ?? 'rooster') === 'simpel') return targetsFor(nt(c));
    // SYNC: kioskDescriptors roosterTargets (the rooster's own columns).
    const cols = usableTargets(nt(c), Number(c.maxGetal ?? (dec ? 100 : 1000)), Number(c.decimalPlaces ?? 2), (c.roundTargets as string[] | undefined) ?? (dec ? ['E', 't'] : ['T', 'H']));
    return cols.length ? cols : [targetsFor(nt(c))[0]];
}
const AFRONDEN: TekstLeaf = {
    playsAs: c => (['simpel', 'rooster'].includes((c.subType as string | undefined) ?? 'rooster') ? (nt(c) === 'decimal' ? 'typed' : 'number') : null),
    // Rounding up can add a digit (9 960 → 10 000); a kommagetal keeps at most two decimals and its comma.
    chars: c => (nt(c) === 'decimal' ? len(num(c.maxGetal, 100)) + 2 : len(num(c.maxGetal, 1000)) + (isPow10(num(c.maxGetal, 1000)) ? 0 : 1)),
    ask: (raw, c, rng, d) => {
        const ex = raw as AfrondenExercise;
        const simpel = (c.subType ?? 'rooster') === 'simpel';
        const n = simpel ? ex.number : pick(ex.numbers ?? [], rng);
        const all = afrondenTargets(c);
        const t = simpel ? all.find(x => x.key === ex.targetKey) ?? all[0] : pick(all, rng);
        if (n === undefined || !t) return null;
        const asked: AfrondenExercise = { id: ex.id, number: n, targetKey: t.key, decimalPlaces: ex.decimalPlaces, isManuallyEdited: false };
        const askedC = simpel ? c : { ...c, subType: 'simpel', roundTargets: [t.key] };
        const answer = roundTo(n, t.weight);
        const dp = decimalsOf(t.weight);
        const down = roundTo(n - t.weight / 2 + 1e-9, t.weight), up = down + t.weight;
        // Rounded the wrong way, to the wrong place (never 0: 497 op D is no slip a pupil makes), or not at all.
        const near = [[Number((answer === down ? up : down).toFixed(dp))], [roundTo(n, t.weight * 10), ...(dp < 3 && t.weight > 1e-3 ? [roundTo(n, t.weight / 10)] : [])].filter(v => v > 0), [n]];
        return { kind: 'number', text: placeWords(d.display(asked, askedC), t.label), answer, dp, step: t.weight, near, exercise: asked, constraints: askedC };
    },
};

// ── schattend rekenen ────────────────────────────────────────────────────────

const SCHATTEND: TekstLeaf = {
    playsAs: c => (nt(c) === 'decimal' ? 'typed' : 'number'),
    // The exact result stays under the max (schattendGenerator); its estimate may round up one digit past a max like 9 999.
    chars: c => {
        const max = num(c.maxGetal, nt(c) === 'decimal' ? 100 : 1000);
        return len(max) + (isPow10(max) ? 0 : 1) + (nt(c) === 'decimal' ? Number(c.decimalPlaces ?? 2) : 0);
    },
    ask: (raw, c, _rng, d) => {
        const ex = raw as SchattendExercise;
        const answer = answerNumber(d, ex, c);
        if (answer === null) return null;
        const t = targetsFor(nt(c)).find(x => x.key === ex.targetKey) ?? targetsFor(nt(c))[0];
        const exact = ex.operator === '+' ? ex.a + ex.b : ex.operator === '-' ? ex.a - ex.b : ex.operator === 'x' ? ex.a * ex.b : ex.a / ex.b;
        const dp = Math.max(decimalsOf(answer), decimalsOf(t.weight));
        // The exact result, and the estimate one rounding step off. The place in words, as afronden says it ("op H" is sheet shorthand).
        return { kind: 'number', text: placeWords(d.display(ex, c), t.label), answer, dp, step: t.weight, near: [[Number(exact.toFixed(dp))], [answer + t.weight, answer - t.weight]] };
    },
};

// ── a plain number line from the kiosk (rekenvolgorde, procenten, temperatuur verschil, intrest, romeinse herkennen) ──

// The descriptor's own line and answer; near = the leaf's slips.
const plainNumber = (play: (c: C) => TekstPlay, chars: (c: C) => number | undefined, near?: (ex: never, c: C, a: number) => number[][]): TekstLeaf => ({
    playsAs: play,
    chars,
    ask: (ex, c, _rng, d) => {
        if (kioskInputOf(d, ex, c) !== 'number') return null;
        const answer = answerNumber(d, ex, c);
        if (answer === null) return null;
        return { kind: 'number', text: minus(d.display(ex, c)), answer, dp: decimalsOf(answer), near: near?.(ex as never, c, answer) ?? [] };
    },
});

const REKENVOLGORDE = plainNumber(() => 'number', c => len(num(c.maxGetal, 100) * 3));

const PROCENTEN = plainNumber(() => 'number', c => len(num(c.maxGetal, 1000)), (ex: ProcentExercise, c, a) => (c.subType === 'welk-percent'
    // Another percent of the card (10 % for 25 %).
    ? [((c.percents as number[] | undefined) ?? [10, 25, 50, 75]).filter(p => p !== a)]
    // Half, a quarter or a tenth of the base instead.
    : [[ex.base / 2, ex.base / 4, ex.base / 10].filter(v => Number.isInteger(v)), [ex.base]]));

// The verschil between two temperatures; the slip: the minus forgotten (−4 and 14 read as 10), or both added.
const TEMP_VERSCHIL: TekstLeaf = {
    playsAs: c => (c.variant === 'verschil' ? 'number' : null),
    chars: () => 3,
    ask: (raw, c, _rng, d) => {
        const ex = raw as TemperatuurExercise;
        const answer = answerNumber(d, ex, c);
        if (ex.variant !== 'verschil' || answer === null) return null;
        const [a, b] = [ex.celsius, ex.celsius2 ?? 0];
        return { kind: 'number', text: `Verschil tussen ${show(a)}${NB}°C en ${show(b)}${NB}°C: ?${NB}°C`, answer, near: [[Math.abs(Math.abs(a) - Math.abs(b)), Math.abs(a) + Math.abs(b)]] };
    },
};

// Interest in euros: a tenth or ten times too much (the % slip).
const INTREST: TekstLeaf = {
    playsAs: c => (c.subType === 'intrest' ? 'typed' : null),
    chars: () => 5,
    ask: (raw, c, _rng, d) => {
        const ex = raw as GeldRekenenExercise;
        if (ex.subType !== 'intrest') return null;
        const answer = answerNumber(d, ex, c);
        if (answer === null) return null;
        return { kind: 'number', text: minus(d.display(ex, c)).replace(/ = \?$/, ' = € ?'), answer, dp: decimalsOf(answer), near: [[answer * 10, answer / 10]] };
    },
};

const ROMEINS_HERKENNEN: TekstLeaf = {
    playsAs: c => (c.subType === 'schrijven' ? 'tap' : 'number'),
    chars: c => (c.subType === 'schrijven' ? undefined : 4),
    ask: (raw, c) => {
        const ex = raw as RomeinseExercise;
        if (c.subType === 'schrijven') {
            // The additive form (IIII for 4) and the neighbours.
            const others = [toRoman(ex.value, false), ...[1, -1, 5, -5, 10, -10].map(k => (ex.value + k > 0 ? toRoman(ex.value + k) : ''))].filter(o => o && o !== ex.roman);
            return { kind: 'words', text: `${show(ex.value)} in Romeinse cijfers: ?`, answer: ex.roman, options: [ex.roman, ...new Set(others)].slice(0, 6), labels: {} };
        }
        // Read as written left to right (IV as 6) and the neighbours.
        return { kind: 'number', text: `${ex.roman} = ?`, answer: ex.value, near: [[ex.value + 1, ex.value - 1]] };
    },
};

// ── plaatswaarde ─────────────────────────────────────────────────────────────

// The place labels high to low (PLACE_VALUES names), for the plaats choice.
const PLAATS_ORDER = ['miljarden', 'honderdmiljoenen', 'tienmiljoenen', 'miljoenen', 'honderdduizendtallen', 'tienduizendtallen', 'duizendtallen', 'honderdtallen', 'tientallen', 'eenheden', 'tienden', 'honderdsten', 'duizendsten'];
// The digit a waarde is made of (4 000 → 4, 0,04 → 4), or null for a zero.
const leadDigit = (v: number) => { const m = /[1-9]/.exec(String(v)); return m ? m[0] : null; };
const onlyOnce = (number: number, digit: string) => String(number).replace('.', '').split(digit).length === 2;

const PLAATSWAARDE: TekstLeaf = {
    playsAs: c => {
        const sub = plaatsView(c);
        if (sub === 'waarde') return Number(c.decimalPlaces ?? 0) > 0 ? 'typed' : 'number';
        return sub === 'plaats' || sub === 'omcirkelen' ? 'tap' : null;
    },
    // A digit's value: 4 000 under a max of 10 000, or 0,04 ("0," and its decimals).
    chars: c => (plaatsView(c) === 'waarde' ? Math.max(len(num(c.maxGetal, 1000)), Number(c.decimalPlaces ?? 0) > 0 ? Number(c.decimalPlaces) + 1 : 0) : undefined),
    ask: (raw, c, _rng, d) => {
        const ex = raw as PlaatswaardeExercise;
        if (plaatsView(c) === 'waarde') {
            const answer = answerNumber(d, ex, c);
            if (answer === null) return null;
            const digit = leadDigit(answer);
            const dp = decimalsOf(answer);
            // "In 659 516 is de 9 ? waard" when the digit is there once; else its place in words (never the sheet's "op H").
            const place = PLAATS_ORDER[PLAATS_ORDER.indexOf('eenheden') - Math.floor(Math.log10(answer) + 1e-9)];
            const text = digit && onlyOnce(ex.number, digit) ? `In ${show(ex.number)} is de ${digit} ? waard`
                : digit && place ? `In ${show(ex.number)} is de ${digit} bij de ${place} ? waard` : d.display(ex, c);
            const near = digit ? [[Number(digit)], [Number((answer * 10).toFixed(dp)), Number((answer / 10).toFixed(dp + 1))]] : [];
            return { kind: 'number', text, answer, dp, near };
        }
        // plaats (and omcirkelen asked as plaats): tap the place's name.
        const askedC = plaatsView(c) === 'omcirkelen' ? { ...c, subType: 'plaats', plaatsAnswer: 'plaats-shuffle' } : c;
        const answer = d.answerOf(ex, askedC)[0];
        const ownPlaces = (d.choicesOf?.(ex, askedC) ?? []).filter(p => PLAATS_ORDER.includes(p));
        if (!answer || !PLAATS_ORDER.includes(answer) || ownPlaces.length < 2) return null;
        // The underlined digit is the question: named by its value when it is there once, else no text form.
        const digit = digitAt(ex.number, answer);
        if (digit === null || !onlyOnce(ex.number, digit)) return null;
        return { kind: 'words', text: `In ${show(ex.number)} staat de ${digit} bij de ?`, answer, options: ownPlaces, exercise: ex, constraints: askedC };
    },
};
// The digit of n on a place named by its label (tientallen → the tens digit).
function digitAt(n: number, label: string): string | null {
    const pos = PLAATS_ORDER.indexOf(label) - PLAATS_ORDER.indexOf('eenheden');
    const [int, frac = ''] = String(n).split('.');
    const ch = pos <= 0 ? int[int.length - 1 + pos] : frac[pos - 1];
    return ch ?? null;
}

// ── MAB herkennen in letters, splitsen, rijen ───────────────────────────────

// "4T 7E" is the picture written out: the place-value notation a pupil reads without the blocks.
const MAB: TekstLeaf = {
    playsAs: () => 'number',
    chars: c => len(num(c.maxNumber, 100)),
    ask: (raw) => {
        const ex = raw as MabExercise;
        const parts = ([[ex.thousands, 'D'], [ex.hundreds, 'H'], [ex.tens, 'T'], [ex.units, 'E']] as const).filter(([n]) => n);
        if (!parts.length) return null;
        // The digits in the wrong order, the parts only added (4 + 7).
        return { kind: 'number', text: `${parts.map(([n, k]) => `${n}${k}`).join(' ')} = ?`, answer: ex.value, near: [[parts.reduce((s, [n]) => s + n, 0)], [Number(String(ex.value).split('').reverse().join(''))]] };
    },
};

const splitsLayout = (c: C) => (c.layout as string | undefined) ?? 'basic';
const SPLITSEN: TekstLeaf = {
    playsAs: c => (['basic', 'splitsboom', 'verliefde-harten'].includes(splitsLayout(c)) ? (Number(c.decimalPlaces ?? 0) > 0 ? 'typed' : 'number') : null),
    chars: c => len(num(c.maxGetal, 10)) + Number(c.decimalPlaces ?? 0),
    ask: (raw, c, rng, d) => {
        const ex = raw as SplitsenExercise;
        // A row of pairs (basis, harten): one pair is the game's question.
        const asked = splitsLayout(c) === 'splitsboom' ? ex : { ...ex, pairs: [pick(ex.pairs, rng)!].filter(Boolean) };
        if (!asked.pairs.length) return null;
        const answer = answerNumber(d, asked, c);
        if (answer === null) return null;
        const p = asked.pairs[0];
        // The total itself, the given part again, one off.
        return { kind: 'number', text: d.display(asked, c), answer, dp: decimalsOf(answer), near: [[ex.total], [p.given]], exercise: asked };
    },
};

// A rij with one blank: the game asks the first open place of the row, the rest filled in.
function oneBlank<E extends { blankMask: boolean[] }>(ex: E, values: readonly unknown[], rng: Rng): { asked: E; i: number } | null {
    const open = ex.blankMask.flatMap((b, i) => (b && typeof values[i] === 'number' ? [i] : []));
    const i = pick(open, rng);
    return i === undefined ? null : { asked: { ...ex, blankMask: ex.blankMask.map((_, j) => j === i) }, i };
}
const rijPlay = (c: C): TekstPlay => (nt(c) === 'natural' ? 'number' : nt(c) === 'rational' ? null : 'typed');
// Gehele getallen go below zero; kommagetallen take the comma.
const rijKeys = (c: C): SpelKey[] => (nt(c) === 'geheel' ? ['-'] : [',']);
// A rij runs a few jumps past its max; a kommagetal adds its decimals, a negatief its minus.
const rijChars = (c: C) => {
    const step = typeof c.step === 'number' ? c.step : 0.1;
    const dp = nt(c) === 'decimal' ? Math.max(decimalsOf(step), Number(c.maxDecimals ?? 1)) : 0;
    return len(Math.max(num(c.maxGetal, 20), 20) * 2) + dp + (nt(c) === 'geheel' ? 1 : 0);
};
// A row as number tiles with its one open place ('?'); its line reads "3, 4, ?, 6" (never the kiosk's "3 | 4" bars or
// "3 – 4" dashes, which read as minus signs).
const rijOf = (values: readonly unknown[], open: number): Pick<NumberAsk, 'text' | 'visual'> | null => {
    if (!values.every(v => typeof v === 'number')) return null;
    const items = values.map((v, j) => (j === open ? '?' : show(v as number)));
    return { text: rijText(items), visual: { kind: 'rij', items } };
};
// The neighbours in the row (one jump too far or too short) first.
function rijAsk(values: readonly (number | unknown)[], i: number, asked: unknown, nat: boolean): NumberAsk | null {
    const v = values[i];
    const rij = rijOf(values, i);
    if (typeof v !== 'number' || !rij) return null;
    const others = values.filter((x, j): x is number => typeof x === 'number' && j !== i);
    const jump = others.length >= 2 ? Math.abs(Number(((values[i === 0 ? 1 : i - 1] as number) - (values[i === 0 ? 2 : i] as number)).toFixed(6))) : 1;
    const dp = Math.max(decimalsOf(v), decimalsOf(jump));
    return { kind: 'number', ...rij, answer: v, dp, near: [[v + jump, v - jump].map(x => Number(x.toFixed(dp)))], min: nat ? 0 : -1e9, exercise: asked };
}
const GETALLENRIJ: TekstLeaf = {
    playsAs: rijPlay,
    chars: rijChars,
    keys: rijKeys,
    ask: (raw, c, rng) => {
        const ex = raw as GetallenasExercise;
        const values = ex.values ?? [];
        const one = oneBlank(ex, values, rng);
        return one && rijAsk(values, one.i, one.asked, nt(c) === 'natural');
    },
};
const PATROON: TekstLeaf = {
    playsAs: c => (c.showArrows && !(c.showOperators) ? null : rijPlay(c)),
    chars: rijChars,
    keys: rijKeys,
    ask: (raw, c, rng) => {
        const ex = raw as PatroonExercise;
        const one = oneBlank(ex, ex.values, rng);
        return one && rijAsk(ex.values, one.i, one.asked, nt(c) === 'natural');
    },
};

// ── deelbaarheid, even en oneven ─────────────────────────────────────────────

// Veelvouden: the next multiple after the given ones.
const VEELVOUDEN: TekstLeaf = {
    playsAs: c => ((c.layout ?? 'tabel') === 'veelvouden' ? 'number' : (c.layout ?? 'tabel') === 'tabel' ? 'tap' : null),
    chars: c => ((c.layout ?? 'tabel') === 'veelvouden' ? len(num(c.maxGetal, 100) * 2) : undefined),
    ask: (raw, c, rng) => {
        const ex = raw as DeelbaarheidExercise;
        if ((c.layout ?? 'tabel') === 'veelvouden') {
            const seq = ex.sequence ?? [];
            const given = ex.givenCount ?? 2;
            if (seq.length <= given) return null;
            const asked: DeelbaarheidExercise = { ...ex, sequence: seq.slice(0, given + 1) };
            const answer = seq[given];
            const base = given >= 2 ? seq[1] - seq[0] : 1;
            const rij = rijOf(asked.sequence!, given);
            return rij && { kind: 'number', ...rij, answer, near: [[answer + base, seq[given - 1] ?? answer - 1]], exercise: asked };
        }
        // Tabel: one divisor of the row, ja or nee (the kiosk row with that one column).
        const divisors = Array.isArray(c.divisors) ? (c.divisors as number[]) : [2, 5, 10];
        const dv = pick(divisors, rng);
        if (dv === undefined || ex.number === undefined) return null;
        const yes = ex.number % dv === 0;
        return {
            kind: 'words', text: `${show(ex.number)} deelbaar door ${dv}: ?`, answer: yes ? 'ja' : 'nee', options: JA_NEE,
            // The tapped column, or none.
            kiosk: o => (o === 'ja' ? show(dv) : ''), constraints: { ...c, divisors: [dv] },
        };
    },
};
// Kleuren / omcirkelen / kleurraster: one of the numbers, ja or nee.
const DEELBAAR_KLEUR: TekstLeaf = {
    playsAs: c => (c.showRest && c.viewMode !== 'raster' && c.rasterVorm !== 'rechthoek' ? null : 'tap'),
    ask: (raw, _c, rng) => {
        const ex = raw as DeelbaarheidKleurExercise;
        const n = pick(ex.numbers, rng);
        if (n === undefined) return null;
        const asked: DeelbaarheidKleurExercise = { ...ex, numbers: [n] };
        return { kind: 'words', text: `${show(n)} deelbaar door ${ex.divisor}: ?`, answer: n % ex.divisor === 0 ? 'ja' : 'nee', options: JA_NEE, kiosk: o => (o === 'ja' ? show(n) : ''), exercise: asked };
    },
};
const EVEN_ONEVEN: TekstLeaf = {
    playsAs: () => 'tap',
    ask: (raw, c, rng) => {
        const ex = raw as EvenOnevenExercise;
        if (c.subType === 'cirkels') {
            if (ex.number === undefined) return null;
            return { kind: 'words', text: `${show(ex.number)} is ?`, answer: ex.number % 2 === 0 ? 'even' : 'oneven', options: ['even', 'oneven'] };
        }
        // Rooster: one of its numbers; the kiosk row taps it when it is the asked kind (even, or oneven).
        const n = pick(ex.numbers ?? [], rng);
        if (n === undefined) return null;
        const target = (c.target as string | undefined) ?? 'even';
        return { kind: 'words', text: `${show(n)} is ?`, answer: n % 2 === 0 ? 'even' : 'oneven', options: ['even', 'oneven'], kiosk: o => (o === target ? show(n) : ''), exercise: { ...ex, numbers: [n] } };
    },
};

// ── vergelijken ──────────────────────────────────────────────────────────────

const COMPARE = ['<', '=', '>'];
const COMPARE_LABELS: Record<string, string> = { '<': 'kleiner dan', '=': 'gelijk aan', '>': 'groter dan' };
const VERGELIJKEN: TekstLeaf = {
    playsAs: c => (c.subType === 'kiezen' ? 'tap' : (c.subType ?? 'getallen') === 'getallen' || c.subType === 'representaties' ? 'tap' : null),
    chars: c => (c.subType === 'kiezen' ? len(num(c.maxGetal, 100)) + Number(c.decimalPlaces ?? 0) : undefined),
    ask: (raw, c, _rng, d) => {
        const ex = raw as VergelijkenExercise;
        if (c.subType === 'kiezen') {
            const nums = ex.numbers ?? [];
            const target = ex.target ?? (c.chooseTarget as string | undefined) ?? 'grootste';
            const answer = d.answerOf(ex, c)[0];
            const options = [...new Set(nums.map(show))];
            if (!answer || options.length < 2) return null;
            return { kind: 'words', text: `Het ${target} getal: ?`, answer, options };
        }
        return { kind: 'words', text: d.display(ex, c), answer: d.answerOf(ex, c)[0], options: COMPARE, labels: COMPARE_LABELS };
    },
};

// ── meten: herleidingen, omtrek, oppervlakte ────────────────────────────────

// One number to convert to one unit (enkel-getal, samengesteld-enkel, are-vierkant); the unit blank taps a unit.
const ONE_TARGET = ['enkel-getal', 'samengesteld-enkel', 'are-vierkant'];
const HERLEIDINGEN: TekstLeaf = {
    playsAs: c => (c.vraag === 'eenheid' ? 'tap' : ((c.formats as string[] | undefined) ?? ['enkel-getal']).some(f => ONE_TARGET.includes(f)) ? 'number' : null),
    // The biggest given value times the biggest step between the card's units.
    chars: c => {
        if (c.vraag === 'eenheid') return undefined;
        const units = ladderFor((c.measure as string | undefined) ?? 'lengte').filter(u => ((c.units as string[] | undefined) ?? []).includes(u.key));
        const ratio = units.length ? Math.max(...units.map(u => u.factor)) / Math.min(...units.map(u => u.factor)) : 1000;
        const compound = ((c.formats as string[] | undefined) ?? []).some(f => f !== 'enkel-getal');
        return len((compound ? Math.max(num(c.maxEnkel, 100), num(c.maxSamengesteld, 1000)) : num(c.maxEnkel, 100)) * ratio);
    },
    ask: (raw, c, _rng, d) => {
        const ex = raw as HerleidingExercise;
        const input = kioskInputOf(d, ex, c);
        if (input === 'choice') {
            const options = d.choicesOf?.(ex, c) ?? [];
            return options.length >= 2 ? { kind: 'words', text: d.display(ex, c), answer: d.answerOf(ex, c)[0], options } : null;
        }
        if (input !== 'number') return null;
        const answer = answerNumber(d, ex, c);
        if (answer === null) return null;
        // One step of the ladder too few or too many (×10, or ×100 for oppervlakte).
        const f = c.measure === 'oppervlakte' ? 100 : 10;
        const near = [[answer * f, answer / f], ...(f === 10 ? [[answer * 100, answer / 100]] : [])];
        return { kind: 'number', text: d.display(ex, c), answer, dp: decimalsOf(answer), near };
    },
};

const shapeName = (s: string | undefined) => (s ?? 'figuur').replace(/-/g, ' ');
const cm = (n: number) => `${show(n)}${NB}cm`;
// The figure in words from its labelled sides: "een rechthoek van 6 cm bij 4 cm".
function figureWords(ex: MeetExercise): string | null {
    const sides = ex.sides ?? [];
    if (ex.kind === 'cirkel' || sides.length < 3) return null;
    const name = shapeName(ex.shape);
    if (sides.every(s => s === sides[0])) return `een ${name} met zijden van ${cm(sides[0])}`;
    if (sides.length === 4 && sides[0] === sides[2] && sides[1] === sides[3]) return `een ${name} van ${cm(sides[0])} bij ${cm(sides[1])}`;
    return `een ${name} met zijden ${sides.slice(0, -1).map(show).join(', ')} en ${cm(sides[sides.length - 1])}`;
}
const OMTREK: TekstLeaf = {
    playsAs: c => (c.measureModel !== 'gegeven' || ((c.shapes as string[] | undefined) ?? []).includes('cirkel') ? null : c.precision === 'mm' ? 'typed' : 'number'),
    chars: c => len(num(c.maxLength, 10) * 8) + (c.precision === 'mm' ? 1 : 0),
    ask: (raw, c, _rng, d) => {
        const ex = raw as MeetExercise;
        const words = figureWords(ex);
        const answer = answerNumber(d, ex, c);
        if (!words || answer === null) return null;
        const s = ex.sides ?? [];
        // Half the perimeter, and the area of a rechthoek / vierkant.
        const near = [[Number((answer / 2).toFixed(1))], s.length === 4 && s[0] === s[2] ? [s[0] * s[1]] : []];
        return { kind: 'number', text: `Omtrek van ${words}: ? cm`, answer, dp: decimalsOf(answer), near };
    },
};
// Rechthoek, vierkant (and the rechthoekige driehoek from its two right sides): l × b.
const OPPERVLAKTE: TekstLeaf = {
    playsAs: c => {
        if (c.subType === 'rooster' || (c.askOmtrek && c.subType !== 'rooster')) return null;
        return ((c.shapes as string[] | undefined) ?? ['rechthoek']).some(s => s !== 'rechthoek' && s !== 'vierkant') ? 'typed' : 'number';
    },
    chars: c => len(num(c.maxLength, 10) ** 2) + 1,
    ask: (raw, c, _rng, d) => {
        const ex = raw as MeetExercise;
        const s = ex.sides ?? [];
        const answer = answerNumber(d, ex, c);
        if (answer === null || s.length < 3) return null;
        let text: string | null = null;
        if (s.length === 4 && s[0] === s[2] && s[1] === s[3]) text = s[0] === s[1] ? `een vierkant met zijden van ${cm(s[0])}` : `een rechthoek van ${cm(s[0])} bij ${cm(s[1])}`;
        else if (s.length === 3 && ex.shape === 'rechthoekige-driehoek' && Math.abs((s[0] * s[1]) / 2 - answer) < 1e-6) text = `een rechthoekige driehoek met rechte zijden ${cm(s[0])} en ${cm(s[1])}`;
        if (!text) return null;
        // The omtrek instead, or l + b.
        return { kind: 'number', text: `Oppervlakte van ${text}: ? cm²`, answer, dp: decimalsOf(answer), near: [[s.reduce((a, b) => a + b, 0)], [s[0] + s[1]]] };
    },
};

// ── geld, tijd ───────────────────────────────────────────────────────────────

const euroText = (cents: number) => formatMathNumber((cents / 100).toFixed(2));
const TERUGGEVEN: TekstLeaf = {
    playsAs: () => 'typed',
    // The change stays under the price's euros ("45,50" for 4,50 paid with 50).
    chars: c => len(num(c.maxPriceEuros, 99)) + 2,
    ask: (raw, c, _rng, d) => {
        const ex = raw as GeldTeruggevenExercise;
        const input = kioskInputOf(d, ex, c);
        const euro = (cents: number) => `€${NB}${cents % 100 === 0 ? show(cents / 100) : euroText(cents)}`;
        // The amount as the card takes it: laid in cents, typed as € + cent fields, or with a comma.
        const kiosk = (v: number): KioskAnswer => {
            const cents = Math.round(v * 100);
            if (input === 'interactive') return String(cents);
            if (input === 'multi-number') return [String(Math.floor(cents / 100)), String(cents % 100)];
            return (cents / 100).toFixed(2).replace('.', ',');
        };
        const change = ex.changeCents / 100;
        // No exchange in the cents (20 − 18,75 as 2,25), a ten cent or a euro off.
        return {
            kind: 'number', text: `Je betaalt ${euro(ex.priceCents)} met ${euro(ex.payWithCents)}. Je krijgt €${NB}? terug.`, answer: change, dp: 2,
            near: [[change + 1], [change + 0.1, change - 0.1], [change - 1]], step: 0.05, show: v => euroText(Math.round(v * 100)), kiosk,
        };
    },
};

const hm = (min: number) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')}`;
const duur = (min: number) => (min % 60 === 0 ? `${min / 60} u` : min < 60 ? `${min} min` : `${Math.floor(min / 60)} u ${min % 60} min`);
const TIJDSDUUR: TekstLeaf = {
    playsAs: () => 'tap',
    ask: (raw) => {
        const ex = raw as TijdsduurExercise;
        // Past midnight the sheet says "volgende dag": that row stays on the kiosk card.
        if (ex.endMin >= 1440 || ex.startMin < 0) return null;
        const d0 = ex.endMin - ex.startMin;
        // Minutes read as hundredths of an hour (2 u 30 for 150 min), a quarter or a whole hour off.
        const slip = (m: number) => Math.floor(m / 100) * 60 + (m % 100);
        const around = (v: number, max: number) => [...new Set([v + 60, v - 60, v + 15, v - 15, v + 5, v - 5, slip(d0) !== d0 ? v + slip(d0) - d0 : v + 30])].filter(x => x > 0 && x < max && x !== v);
        if (ex.blank === 'duur') {
            const options = [d0, ...around(d0, 1440)].slice(0, 6);
            return { kind: 'words', text: `Van ${hm(ex.startMin)} tot ${hm(ex.endMin)} duurt het ?`, answer: duur(d0), options: [...new Set(options.map(duur))], kiosk: o => { const m = options.find(x => duur(x) === o) ?? 0; return [String(Math.floor(m / 60)), String(m % 60)]; } };
        }
        const want = ex.blank === 'begin' ? ex.startMin : ex.endMin;
        const options = [want, ...around(want, 1440)].slice(0, 6);
        const text = ex.blank === 'begin' ? `? + ${duur(d0)} = ${hm(ex.endMin)}` : `${hm(ex.startMin)} + ${duur(d0)} = ?`;
        return { kind: 'words', text, answer: hm(want), options: [...new Set(options.map(hm))], kiosk: o => o.split(':') };
    },
};

// ── woorden: hoeken, maateenheden, controleren, getalfunctie ────────────────

const HOEKEN: TekstLeaf = {
    // Herkennen with the degrees in words; a figure's soort needs its picture.
    playsAs: c => ((c.mode ?? 'herkennen') === 'herkennen' && c.kind === 'hoek' ? 'tap' : null),
    ask: (raw, c, _rng, d) => {
        const ex = raw as VormleerExercise;
        if (ex.kind !== 'hoek' || ex.angleDeg === undefined) return null;
        const options = d.choicesOf?.(ex, c) ?? [];
        return options.length >= 2 ? { kind: 'words', text: `Een hoek van ${ex.angleDeg}° is een ?`, answer: d.answerOf(ex, c)[0], options } : null;
    },
};

// Schrijven (no chips on the card): the unit among its grootheid's usual ones.
const UNITS: Record<string, string[]> = {
    lengte: ['mm', 'cm', 'm', 'km'], massa: ['mg', 'g', 'kg', 'ton'], inhoud: ['ml', 'cl', 'l', 'hl'],
    tijd: ['s', 'min', 'u', 'dag'], temperatuur: ['°C', 'm', 'kg', 'l'],
};
const MAATEENHEID: TekstLeaf = {
    playsAs: c => (c.answerMode === 'schrijven' && c.subType === 'schatten' ? null : 'tap'),
    ask: (raw, c, _rng, d) => {
        const ex = raw as MaateenheidExercise;
        const answer = d.answerOf(ex, c)[0];
        const options = ex.choices ? ex.choices.map(u => (c.subType === 'schatten' ? `${show(ex.value)} ${u}` : u)) : [...new Set([ex.unit, ...(UNITS[ex.grootheid] ?? [])])];
        if (!answer || options.length < 2 || !options.includes(answer)) return null;
        return { kind: 'words', text: d.display(ex, c), answer, options };
    },
};

const CONTROLEREN: TekstLeaf = {
    playsAs: () => 'tap',
    ask: (raw, c, _rng, d) => {
        const ex = raw as ControleExercise;
        return { kind: 'words', text: d.display(ex, c).replace(/: juist of fout\?$/, ' is ?'), answer: d.answerOf(ex, c)[0], options: ['juist', 'fout'] };
    },
};

// SYNC: kioskDescriptors FUNCTIE_LABEL (the card's column names).
const FUNCTIE_LABEL: Record<string, string> = { hoeveelheid: 'hoeveelheid', rang: 'rangorde', maat: 'maat', code: 'code' };
const GETALFUNCTIE: TekstLeaf = {
    playsAs: () => 'tap',
    ask: (raw, c) => {
        const ex = raw as GetalFunctieExercise;
        const ids = (c.functies as string[] | undefined)?.length ? (c.functies as string[]) : Object.keys(FUNCTIE_LABEL);
        const answer = FUNCTIE_LABEL[ex.functie];
        const n = ex.number.charAt(0).toUpperCase() + ex.number.slice(1);
        return { kind: 'words', text: `${ex.sentence.replace('___', ex.number)} ${n} is een ?`, answer, options: ids.map(i => FUNCTIE_LABEL[i] ?? i) };
    },
};

// ── breuken: deel van een hoeveelheid, kommagetallen ────────────────────────

// "2/3 van 18": the kiosk's abstract form (the groups card is scratch work around this one number).
const HOEVEELHEID: TekstLeaf = {
    playsAs: c => (c.subType === 'hoeveelheid' || c.subType === 'hoeveelheid-abstract' ? 'number' : null),
    chars: () => 4,
    ask: (raw, c, _rng, d) => {
        const ex = raw as FractionExercise;
        const askedC = { ...c, subType: 'hoeveelheid-abstract' };
        const asked: FractionExercise = { ...ex, subType: 'hoeveelheid-abstract' };
        const answer = answerNumber(d, asked, askedC);
        if (answer === null) return null;
        // One part (18 : 3) instead of the teller's parts, and the total.
        const part = (ex.total ?? 0) / ex.denominator;
        return { kind: 'number', text: d.display(asked, askedC), answer, near: [[part], [ex.total ?? 0]], exercise: asked, constraints: askedC };
    },
};

// Kommagetallen + − × : (the hr-std decimal leaves): the slips are the comma shifted or the other operation.
const hrDecimaal = (op: '+' | '-' | 'x' | ':'): TekstLeaf => ({
    playsAs: c => (nt(c) === 'decimal' && c.multiplicationMode !== 'met_rest' ? 'typed' : null),
    // From the operands' place masks (E, t = under 10): + one carry digit, × the two factors' digits, : the deeltal's.
    chars: c => {
        const ints = (m: unknown) => { const keys = Object.keys((m as Record<string, boolean> | undefined) ?? {}).filter(k => (m as Record<string, boolean>)[k]); if (!keys.length) return null; const i = INT_PLACES.findIndex(k => keys.includes(k)); return i < 0 ? 1 : INT_PLACES.length - i; };
        const [a, b] = [ints(c.operand1Mask) ?? len(num(c.maxGetal, 100)), ints(c.operand2Mask) ?? (op === 'x' ? 1 : 2)];
        // The finest place a mask ticks (t, h, d) next to the card's own decimals.
        const fine = (m: unknown) => Math.max(0, ...['t', 'h', 'd'].map((k, i) => ((m as Record<string, boolean> | undefined)?.[k] ? i + 1 : 0)));
        const places = Math.max(Number(c.decimalPlaces ?? 2), fine(c.operand1Mask), fine(c.operand2Mask));
        const dp = op === 'x' && c.decimalTimesDecimal ? places * 2 : places;
        const int = op === 'x' ? a + b : op === ':' ? a : Math.max(a, b) + (op === '+' ? 1 : 0);
        return int + dp;
    },
    ask: (raw, c, _rng, d) => {
        const ex = raw as Equation;
        const input = kioskInputOf(d, ex, c);
        if (input !== 'number' && input !== 'missing-operand') return null;
        const answer = answerNumber(d, ex, c);
        if (answer === null || answer < 0) return null;
        const ops = ex.operands.filter((o): o is number => typeof o === 'number');
        const dp = Math.max(decimalsOf(answer), ...ops.map(decimalsOf));
        const [x = 0, y = 0] = ops;
        const other = ex.operator === '+' ? Math.abs(x - y) : ex.operator === '-' ? x + y : null;
        return { kind: 'number', text: d.display(ex, c), answer, dp, near: [[answer * 10, answer / 10], other === null ? [] : [other], [answer + 1, answer - 1]] };
    },
});

/** The tekst pack's leaves, by sidebar leaf. A new leaf = one line here (and a test row in spelen.tekst.test.ts). */
export const TEKST_LEAVES: Readonly<Record<string, TekstLeaf>> = {
    'afronden-nat-simpel': AFRONDEN, 'afronden-dec-simpel': AFRONDEN, 'afronden-nat-rooster': AFRONDEN, 'afronden-dec-rooster': AFRONDEN,
    'schattend-nat': SCHATTEND, 'schattend-dec': SCHATTEND,
    'handig-rekenvolgorde': REKENVOLGORDE,
    'procenten-nemen': PROCENTEN, 'procenten-welk': PROCENTEN,
    'temperatuur-verschil': TEMP_VERSCHIL,
    'geld-rekenen-intrest': INTREST,
    'romeinse-herkennen': ROMEINS_HERKENNEN, 'romeinse-schrijven': ROMEINS_HERKENNEN,
    'plaatswaarde-waarde': PLAATSWAARDE, 'plaatswaarde-plaats': PLAATSWAARDE, 'plaatswaarde-omcirkelen': PLAATSWAARDE,
    'mab-herkennen': MAB,
    'splitsen-basis': SPLITSEN, 'splitsen-boom': SPLITSEN, 'splitsen-harten': SPLITSEN,
    'getalbegrip-getallenrijen-nat': GETALLENRIJ, 'getalbegrip-getallenrijen-dec': GETALLENRIJ, 'getalbegrip-getallenrijen-geh': GETALLENRIJ,
    'patronen-nat': PATROON, 'patronen-dec': PATROON, 'patronen-geh': PATROON,
    'deelbaarheid-veelvouden': VEELVOUDEN, 'deelbaarheid-tabel': VEELVOUDEN,
    'deelbaarheid-rooster': DEELBAAR_KLEUR, 'deelbaarheid-omcirkelen': DEELBAAR_KLEUR, 'deelbaarheid-kleurraster': DEELBAAR_KLEUR,
    'even-oneven-cirkels': EVEN_ONEVEN, 'even-oneven-rooster': EVEN_ONEVEN,
    'vergelijken-getallen': VERGELIJKEN, 'vergelijken-representaties': VERGELIJKEN, 'vergelijken-kiezen': VERGELIJKEN,
    'herleidingen-lengte': HERLEIDINGEN, 'herleidingen-inhoud': HERLEIDINGEN, 'herleidingen-massa': HERLEIDINGEN, 'herleidingen-oppervlakte': HERLEIDINGEN,
    'omtrek': OMTREK, 'oppervlakte-berekenen': OPPERVLAKTE,
    'geld-teruggeven': TERUGGEVEN,
    'tijdsduur-berekenen': TIJDSDUUR,
    'vormleer-hoeken-herkennen': HOEKEN,
    'maateenheid-kiezen': MAATEENHEID,
    'controleren-omgekeerde': CONTROLEREN, 'controleren-negenproef': CONTROLEREN,
    'getalbegrip-functie': GETALFUNCTIE,
    'breuken-hoeveelheid': HOEVEELHEID,
    'hr-std-optellen-dec': hrDecimaal('+'), 'hr-std-aftrekken-dec': hrDecimaal('-'), 'hr-std-vermenigvuldigen-dec': hrDecimaal('x'), 'hr-std-delen-dec': hrDecimaal(':'),
};
