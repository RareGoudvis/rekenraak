import type {
    AfrondenExercise, CijferExercise, ControleExercise, Equation, EvenOnevenExercise, Fraction, GeldExercise, GeldRekenenExercise,
    GeldTeruggevenExercise, GetalFunctieExercise, HerleidingExercise, HerleidingPart, MaateenheidExercise, MabExercise, MeetExercise,
    PlaatswaardeExercise, ProcentExercise, RekenvolgordeExercise, RomeinseExercise, SchattendExercise, TemperatuurExercise,
    VergelijkenExercise, VormleerExercise, WeegschaalExercise,
} from '../math/types';
import type { KioskDescriptor, KioskInput, KioskKey } from './types';
import { isFraction } from '../math/answerKeys';
import { formatMathNumber, opGlyph } from '../math/formatters';
import { ROUND_SCALE, roundTo, targetsFor } from '../afronden/afrondenGenerator';
import { digitAtPlace, getMaskPlaces } from '../math/mathEngine';
import { CONCEPT_NAMES } from '../vormleer/vormleerGenerator';

// Kiosk descriptors for the exercise registry (row field `kiosk`): pure data + pure functions,
// imported by exerciseRegistry.ts. A type without a descriptor cannot be practised on screen.

// Same type-erasing helper as the registry's row(): each descriptor names its exercise shape.
const descriptor = <E>(d: KioskDescriptor<E>): KioskDescriptor => d as KioskDescriptor;

const numberTypeOf = (c: Record<string, unknown>) => (c.numberType as string | undefined) ?? 'natural';

// Generators keep decimals as floats (0.1 + 0.2): 9 places strips the float tail and still
// keeps every value the generators can make (≤ 1e9, ≤ 3 decimals).
const plain = (x: number): string => String(Number(x.toFixed(9)));

// Every accepted spelling of a number: dot and comma decimal ('2.5', '2,5').
export function numberSpellings(x: number): string[] {
    const dot = plain(x);
    const comma = dot.replace('.', ',');
    return comma === dot ? [dot] : [comma, dot];
}

// A fraction as mixed number and as improper fraction ('1 3/4' and '7/4'); whole values as
// the integer only. The generators hand back reduced fractions, so only those forms count.
export function fractionSpellings(f: Fraction): string[] {
    const whole = f.whole ?? 0;
    const sign = whole < 0 || f.n < 0 ? '-' : '';
    const w = Math.abs(whole), n = Math.abs(f.n), d = Math.abs(f.d);
    const totalN = w * d + n;
    if (totalN % d === 0) return [`${sign}${totalN / d}`];
    const mixedW = Math.floor(totalN / d), mixedN = totalN % d;
    const improper = `${sign}${totalN}/${d}`;
    return mixedW > 0 ? [`${sign}${mixedW} ${mixedN}/${d}`, improper] : [improper];
}

const valueSpellings = (v: number | Fraction) => (isFraction(v) ? fractionSpellings(v) : numberSpellings(v));

const showValue = (v: number | Fraction): string => {
    if (!isFraction(v)) return formatMathNumber(plain(v)).replace('-', '−');
    const n = `${v.n}/${v.d}`;
    return v.whole ? `${v.whole} ${n}` : n;
};

// ── Hoofdrekenen (+ − × :) ───────────────────────────────────────────────────

// The blank of a puntoefening: missingIndex, or the 2-term missingTerm the rational paths set.
function missingIndexOf(eq: Equation): number | undefined {
    if (eq.missingIndex !== undefined) return eq.missingIndex;
    if (eq.missingTerm === 'operand1') return 0;
    if (eq.missingTerm === 'operand2') return 1;
    return undefined;
}

// SYNC: MathBlockRenderer draws the "= ___ r ___" row whenever `remainder` is set.
// Met-rest mode sets it on every row, so the kiosk asks for a rest exactly when the sheet does.
const hasRest = (eq: Equation) => eq.remainder !== undefined;

const hrInput = (eq: Equation): KioskInput => {
    if (hasRest(eq)) return 'number+rest';
    return missingIndexOf(eq) !== undefined ? 'missing-operand' : 'number';
};

const hrKeys = (c: Record<string, unknown>): KioskKey[] => {
    const nt = numberTypeOf(c);
    if (nt === 'decimal') return [','];
    if (nt === 'rational') return ['/', ' '];
    if (nt === 'geheel') return ['-'];
    return [];
};

export const HR_KIOSK = descriptor<Equation>({
    input: 'number',
    inputOf: hrInput,
    keys: hrKeys,
    answerOf: (eq) => {
        if (hasRest(eq)) return [plain(eq.answer as number), String(eq.remainder ?? 0)];
        const idx = missingIndexOf(eq);
        return valueSpellings(idx !== undefined ? eq.operands[idx] : eq.answer);
    },
    display: (eq) => {
        const idx = hasRest(eq) ? undefined : missingIndexOf(eq);
        const ops = eq.operators ?? eq.operands.slice(1).map(() => eq.operator);
        const terms = eq.operands.map((o, i) => (i === idx ? '?' : showValue(o)));
        const lhs = terms.reduce((acc, t, i) => `${acc} ${opGlyph(ops[i - 1])} ${t}`);
        if (hasRest(eq)) return `${lhs} = ? r ?`;
        return `${lhs} = ${idx !== undefined ? showValue(eq.answer) : '?'}`;
    },
});

// ── Procenten ────────────────────────────────────────────────────────────────

// nemen: "25 % van 80 = ?" → answer; welk-percent: "20 van 80 = ? %" → percent.
const isWelk = (c: Record<string, unknown>) => c.subType === 'welk-percent';

export const PROCENTEN_KIOSK = descriptor<ProcentExercise>({
    input: 'number',
    answerOf: (ex, c) => numberSpellings(isWelk(c) ? ex.percent : ex.answer),
    display: (ex, c) => isWelk(c)
        ? `${formatMathNumber(ex.answer)} van ${formatMathNumber(ex.base)} = ? %`
        : `${formatMathNumber(ex.percent)} % van ${formatMathNumber(ex.base)} = ?`,
    supported: (c) => (c.subType ?? 'nemen') === 'nemen' || isWelk(c),
});

// ── Afronden (simpel only; a rooster is a whole table, not one answer) ───────

const afrondenTarget = (ex: AfrondenExercise, c: Record<string, unknown>) => {
    const all = targetsFor(numberTypeOf(c));
    // SYNC: AfrondenViewer falls back to the first target the same way.
    return all.find(t => t.key === ex.targetKey) ?? all[0];
};

export const AFRONDEN_KIOSK = descriptor<AfrondenExercise>({
    input: 'number',
    keys: (c) => (numberTypeOf(c) === 'decimal' ? [','] : []),
    answerOf: (ex, c) => numberSpellings(roundTo(ex.number ?? 0, afrondenTarget(ex, c).weight)),
    display: (ex, c) => `${formatMathNumber(plain(ex.number ?? 0))} ≈ ? (op ${afrondenTarget(ex, c).label})`,
    supported: (c) => (c.subType ?? 'rooster') === 'simpel',
});

// ── Vergelijken ──────────────────────────────────────────────────────────────

// getallen / representaties: < = > between a and b (a breuk side compares by its value);
// kiezen: tap the grootste / kleinste of the row, the buttons being the row's own numbers.
const isKiezen = (c: Record<string, unknown>) => c.subType === 'kiezen';
const showNum = (x: number) => formatMathNumber(plain(x));
const kiezenAnswer = (ex: VergelijkenExercise) => {
    const nums = ex.numbers ?? [];
    // SYNC: VergelijkenViewer circles Math.min / Math.max by ex.target.
    return (ex.target ?? 'grootste') === 'kleinste' ? Math.min(...nums) : Math.max(...nums);
};
const sideText = (v: number | undefined, f: Fraction | undefined) => (f ? showValue(f) : showNum(v ?? 0));

export const VERGELIJKEN_KIOSK = descriptor<VergelijkenExercise>({
    input: 'choice',
    choices: ['<', '=', '>'],
    choicesOf: (ex, c) => (isKiezen(c) ? (ex.numbers ?? []).map(showNum) : ['<', '=', '>']),
    answerOf: (ex, c) => {
        if (isKiezen(c)) return [showNum(kiezenAnswer(ex))];
        const a = ex.a ?? 0, b = ex.b ?? 0;
        return [a < b ? '<' : a > b ? '>' : '='];
    },
    display: (ex, c) => isKiezen(c)
        ? `${ex.target ?? 'grootste'} van ${(ex.numbers ?? []).map(showNum).join(' · ')}: ?`
        : `${sideText(ex.a, ex.aFrac)} ? ${sideText(ex.b, ex.bFrac)}`,
});

// ── Cijferen (the grid is scrap paper; the pupil types the final result) ─────

// Delen asks quotiënt + rest like the sheet's q / r box; the decimal leaves need a comma.
export const CIJFER_KIOSK = descriptor<CijferExercise>({
    input: 'number',
    inputOf: (ex) => (ex.operator === ':' ? 'number+rest' : 'number'),
    keys: (c) => (numberTypeOf(c) === 'decimal' ? [','] : []),
    answerOf: (ex) => (ex.operator === ':' ? [plain(ex.answer), plain(ex.remainder ?? 0)] : numberSpellings(ex.answer)),
    display: (ex) => `${ex.operands.map(showValue).join(` ${opGlyph(ex.operator)} `)} = ${ex.operator === ':' ? '? r ?' : '?'}`,
});

// ── Getalbegrip ──────────────────────────────────────────────────────────────

// Digits of `n` from its highest non-zero place down to E (or 10^-dp), as the sheet prints them.
// SYNC: PlaatswaardeViewer placesOf / placesFor.
function plaatsenOf(ex: PlaatswaardeExercise, c: Record<string, unknown>) {
    const own = (String(ex.number).split('.')[1] ?? '').length;
    const dp = Math.max(Number(c.decimalPlaces ?? 0), own);
    const all = getMaskPlaces(Math.max(Number(c.maxGetal ?? 1000), ex.number), dp > 0 ? 'decimal' : 'natural', dp);
    const start = all.findIndex(p => digitAtPlace(ex.number, p.weight) !== 0);
    return (start < 0 ? all.slice(-1) : all.slice(start)).map(p => ({ ...p, digit: digitAtPlace(ex.number, p.weight) }));
}
const plaatsOf = (ex: PlaatswaardeExercise, c: Record<string, unknown>) => plaatsenOf(ex, c).find(p => p.key === ex.placeKey);
const pwSub = (c: Record<string, unknown>) => (c.subType as string | undefined) ?? 'waarde';

// waarde: type the digit's value (300, 0,05); plaats: tap the place name; omcirkelen: tap
// its letter (H, t) among the number's own places, like the sheet's chips.
export const PLAATSWAARDE_KIOSK = descriptor<PlaatswaardeExercise>({
    input: 'number',
    inputOf: (_ex, c) => (pwSub(c) === 'waarde' ? 'number' : 'choice'),
    keys: (c) => (Number(c.decimalPlaces ?? 0) > 0 ? [','] : []),
    choicesOf: (ex, c) => plaatsenOf(ex, c).map(p => (pwSub(c) === 'plaats' ? p.label.toLowerCase() : p.key)),
    answerOf: (ex, c) => {
        const p = plaatsOf(ex, c);
        if (!p) return [];
        if (pwSub(c) === 'waarde') return numberSpellings(Number((p.digit * p.weight).toFixed(4)));
        return [pwSub(c) === 'plaats' ? p.label.toLowerCase() : p.key];
    },
    display: (ex, c) => `${showNum(ex.number)}: ${pwSub(c) === 'waarde' ? 'waarde' : 'plaats'} van het cijfer op ${plaatsOf(ex, c)?.key ?? '?'} = ?`,
    supported: (c) => pwSub(c) !== 'tabel',
});

// Cirkels only: the pupil groups the circles and writes even / oneven.
export const EVEN_ONEVEN_KIOSK = descriptor<EvenOnevenExercise>({
    input: 'choice',
    choices: ['even', 'oneven'],
    answerOf: (ex) => [(ex.number ?? 0) % 2 === 0 ? 'even' : 'oneven'],
    display: (ex) => `${ex.number ?? 0} is ?`,
    supported: (c) => c.subType === 'cirkels',
});

// herkennen: Roman → number; schrijven: number → Roman, typed on the device keyboard.
const isSchrijven = (c: Record<string, unknown>) => c.subType === 'schrijven';
export const ROMEINSE_KIOSK = descriptor<RomeinseExercise>({
    input: 'number',
    inputOf: (_ex, c) => (isSchrijven(c) ? 'text' : 'number'),
    answerOf: (ex, c) => (isSchrijven(c) ? [ex.roman] : numberSpellings(ex.value)),
    display: (ex, c) => (isSchrijven(c) ? `${ex.value} = ? (Romeins)` : `${ex.roman} = ?`),
});

// SYNC: GetalFunctieViewer FUNCTIE_LABEL (aankruisen columns) / FUNCTIE_FULL (schrijven).
const FUNCTIE_LABEL: Record<string, string> = { hoeveelheid: 'hoeveelheid', rang: 'rangorde', maat: 'maat', code: 'code' };
const FUNCTIE_FULL: Record<string, string> = { hoeveelheid: 'hoeveelheidsgetal', rang: 'rangordegetal', maat: 'maatgetal', code: 'codegetal' };
const functiesOf = (c: Record<string, unknown>) => {
    const f = c.functies as string[] | undefined;
    return f?.length ? f : ['hoeveelheid', 'rang', 'maat', 'code'];
};
const isSchrijf = (c: Record<string, unknown>) => c.answerMode === 'schrijven';
export const GETALFUNCTIE_KIOSK = descriptor<GetalFunctieExercise>({
    input: 'choice',
    inputOf: (_ex, c) => (isSchrijf(c) ? 'text' : 'choice'),
    choicesOf: (_ex, c) => functiesOf(c).map(f => FUNCTIE_LABEL[f] ?? f),
    // Schrijven takes the full word and the short column name alike.
    answerOf: (ex, c) => (isSchrijf(c) ? [FUNCTIE_FULL[ex.functie], FUNCTIE_LABEL[ex.functie]] : [FUNCTIE_LABEL[ex.functie]]),
    display: (ex) => `${ex.sentence.replace('___', ex.number)} → ${ex.number} is een ?`,
});

export const MAB_KIOSK = descriptor<MabExercise>({
    input: 'number',
    answerOf: (ex) => numberSpellings(ex.value),
    display: (ex) => `MAB ${([[ex.thousands, 'D'], [ex.hundreds, 'H'], [ex.tens, 'T'], [ex.units, 'E']] as const).filter(([n]) => n).map(([n, k]) => `${n}${k}`).join(' ')} = ?`,
});

// ── Schattend, rekenvolgorde, controleren ───────────────────────────────────

// Only the estimate is asked; the rounded operands are the pupil's own scrap work.
// SYNC: SchattendViewer rows (round both for + −, only a for × :).
function schatting(ex: SchattendExercise, c: Record<string, unknown>): number {
    const all = targetsFor(numberTypeOf(c));
    const t = all.find(x => x.key === ex.targetKey) ?? all[0];
    const ra = roundTo(ex.a, t.weight);
    const rb = ex.operator === '+' || ex.operator === '-' ? roundTo(ex.b, t.weight) : ex.b;
    const units = (n: number) => Math.round(n * ROUND_SCALE);
    if (ex.operator === '+') return (units(ra) + units(rb)) / ROUND_SCALE;
    if (ex.operator === '-') return (units(ra) - units(rb)) / ROUND_SCALE;
    return ex.operator === 'x' ? Number((ra * rb).toFixed(6)) : Number((ra / rb).toFixed(6));
}
export const SCHATTEND_KIOSK = descriptor<SchattendExercise>({
    input: 'number',
    keys: (c) => (numberTypeOf(c) === 'decimal' ? [','] : []),
    answerOf: (ex, c) => numberSpellings(schatting(ex, c)),
    display: (ex) => `${showNum(ex.a)} ${opGlyph(ex.operator)} ${showNum(ex.b)} ≈ ? (op ${ex.targetKey})`,
});

export const REKENVOLGORDE_KIOSK = descriptor<RekenvolgordeExercise>({
    input: 'number',
    answerOf: (ex) => numberSpellings(ex.answer),
    // SYNC: RekenvolgordeViewer renderTokens (tight brackets).
    display: (ex) => `${ex.tokens.map(t => (typeof t === 'number' ? showNum(t) : opGlyph(t))).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')')} = ?`,
});

// Negenproef and omgekeerde bewerking both end in the sheet's juist / fout circle.
export const CONTROLEREN_KIOSK = descriptor<ControleExercise>({
    input: 'choice',
    choices: ['juist', 'fout'],
    answerOf: (ex) => [ex.shownAnswer === ex.correctAnswer ? 'juist' : 'fout'],
    display: (ex) => `${showNum(ex.a)} ${opGlyph(ex.operator)} ${showNum(ex.b)} = ${showNum(ex.shownAnswer)}: juist of fout?`,
});

// ── Vormleer (herkennen: name the hoek / vierhoek) ──────────────────────────

// Triangles have two naming systems (by angle and by side): a rechthoekige driehoek can also
// be gelijkbenig, so a set mixing both would have two right buttons. One system at a time.
const BY_ANGLE = ['scherphoekig', 'rechthoekig', 'stomphoekig'];
const BY_SIDE = ['gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'];
const conceptsOf = (c: Record<string, unknown>) => (c.concepts as string[] | undefined) ?? [];
export const VORMLEER_KIOSK = descriptor<VormleerExercise>({
    input: 'choice',
    choicesOf: (_ex, c) => conceptsOf(c).map(k => CONCEPT_NAMES[k] ?? k),
    answerOf: (ex) => [CONCEPT_NAMES[ex.concept] ?? ex.concept],
    display: () => 'Welke soort? ?',
    supported: (c) => {
        if ((c.mode ?? 'herkennen') !== 'herkennen' || (c.kind !== 'hoek' && c.kind !== 'figuur')) return false;
        const ks = conceptsOf(c);
        return ks.length >= 2 && !(ks.some(k => BY_ANGLE.includes(k)) && ks.some(k => BY_SIDE.includes(k)));
    },
});

// ── Meten ────────────────────────────────────────────────────────────────────

// aflezen: read the thermometer; verschil: the difference (never negative). Kleuren is drawing.
export const TEMPERATUUR_KIOSK = descriptor<TemperatuurExercise>({
    input: 'number',
    keys: (c) => (c.includeNegatives && c.variant === 'aflezen' ? ['-'] : []),
    answerOf: (ex) => numberSpellings(ex.variant === 'verschil' ? Math.abs(ex.celsius - (ex.celsius2 ?? 0)) : ex.celsius),
    display: (ex) => (ex.variant === 'verschil' ? `verschil ${ex.celsius} °C en ${ex.celsius2 ?? 0} °C = ? °C` : 'thermometer: ? °C'),
    supported: (c) => c.variant === 'aflezen' || c.variant === 'verschil',
});

// The dial reads in the block's notatie: grams, kilograms with a comma, or kg + g (two fields).
const gewichtNotatie = (ex: WeegschaalExercise, c: Record<string, unknown>) => ex.notatie ?? (c.notatie as string | undefined) ?? 'g';
export const WEEGSCHAAL_KIOSK = descriptor<WeegschaalExercise>({
    input: 'number',
    inputOf: (ex, c) => (gewichtNotatie(ex, c) === 'kg-g' ? 'multi-number' : 'number'),
    keys: (c) => (c.notatie === 'kg-komma' ? [','] : []),
    labels: () => ['kg', 'g'],
    answerOf: (ex, c) => {
        const n = gewichtNotatie(ex, c);
        if (n === 'kg-g') return [String(Math.floor(ex.grams / 1000)), String(ex.grams % 1000)];
        return numberSpellings(n === 'kg-komma' ? ex.grams / 1000 : ex.grams);
    },
    display: (ex, c) => `weegschaal: ? ${gewichtNotatie(ex, c) === 'kg-komma' ? 'kg' : gewichtNotatie(ex, c) === 'kg-g' ? 'kg ? g' : 'g'}`,
    supported: (c) => (c.mode ?? 'aflezen') === 'aflezen',
});

// Labelled sides only ('gegeven'): measuring with a ruler on a scaled card is not to size.
// lengte-meten asks juist / fout about the stated length; omtrek the perimeter (round1, cm).
const round1 = (v: number) => Math.round(v * 10) / 10;   // SYNC: MetenViewer round1
const isGegeven = (c: Record<string, unknown>) => c.measureModel === 'gegeven';
export const LENGTE_KIOSK = descriptor<MeetExercise>({
    input: 'choice',
    choices: ['juist', 'fout'],
    answerOf: (ex) => [ex.claimCorrect ? 'juist' : 'fout'],
    display: (ex) => `lengte = ${showNum(round1(ex.claim ?? 0))} cm: juist of fout?`,
    supported: isGegeven,
});
export const OMTREK_KIOSK = descriptor<MeetExercise>({
    input: 'number',
    keys: (c) => (c.precision === 'mm' || (c.shapes as string[] | undefined)?.includes('cirkel') ? [','] : []),
    answerOf: (ex) => numberSpellings(round1(ex.perimeter)),
    display: (ex) => `omtrek ${ex.shape ?? ex.kind} = ? cm`,
    supported: isGegeven,
});

// Rooster: count the squares; berekenen: the area (+ the omtrek as a second field when asked).
const asksOmtrek = (c: Record<string, unknown>) => !!c.askOmtrek && c.subType !== 'rooster';
export const OPPERVLAKTE_KIOSK = descriptor<MeetExercise>({
    input: 'number',
    inputOf: (_ex, c) => (asksOmtrek(c) ? 'multi-number' : 'number'),
    keys: (c) => (c.subType === 'rooster' ? [] : [',']),
    labels: () => ['opp. cm²', 'omtrek cm'],
    answerOf: (ex, c) => {
        const area = numberSpellings(round1(ex.area ?? 0));
        return asksOmtrek(c) ? [area.join('|'), numberSpellings(round1(ex.perimeter)).join('|')] : area;
    },
    display: (ex) => `oppervlakte ${ex.shape ?? ''} = ? cm²`,
});

// omcirkelen: tap one of the sheet's chips; schrijven: type the unit ('°C' also as 'C').
// SYNC: MaateenheidViewer chipText (schatten shows value + unit).
const chipText = (ex: MaateenheidExercise, c: Record<string, unknown>, u: string) =>
    (c.subType === 'schatten' ? `${showNum(ex.value)} ${u}` : u);
export const MAATEENHEID_KIOSK = descriptor<MaateenheidExercise>({
    input: 'choice',
    inputOf: (ex) => (ex.choices ? 'choice' : 'text'),
    choicesOf: (ex, c) => (ex.choices ?? []).map(u => chipText(ex, c, u)),
    answerOf: (ex, c) => (ex.choices ? [chipText(ex, c, ex.unit)] : [...new Set([ex.unit, ex.unit.replace('°', '')])]),
    display: (ex) => ex.sentence.replace('___', '?'),
    // Schatten written out is a number and a unit in one line: not one word to check.
    supported: (c) => !(c.answerMode === 'schrijven' && c.subType === 'schatten'),
});

// number blank: one field per part (2 m 35 cm → two fields, labelled with the units); unit
// blank: tap the unit. Units the pupil writes next to a number (writeUnits) are not asked.
const herleidUnits = (ex: HerleidingExercise, c: Record<string, unknown>) =>
    [...new Set([...((c.units as string[] | undefined) ?? []), ...ex.fromParts.map(p => p.key), ...ex.toParts.map(p => p.key)])];
const partsText = (ps: HerleidingPart[]) => ps.map(p => `${showNum(p.value)} ${p.key}`).join(' ');
export const HERLEIDINGEN_KIOSK = descriptor<HerleidingExercise>({
    input: 'number',
    inputOf: (ex) => (ex.blank === 'unit' ? 'choice' : ex.toParts.length > 1 ? 'multi-number' : 'number'),
    choicesOf: herleidUnits,
    labels: (ex) => ex.toParts.map(p => p.key),
    answerOf: (ex) => {
        if (ex.blank === 'unit') return [ex.toParts[0].key];
        return ex.toParts.length > 1 ? ex.toParts.map(p => String(p.value)) : numberSpellings(ex.toParts[0].value);
    },
    display: (ex) => (ex.blank === 'unit'
        ? `${partsText(ex.fromParts)} = ${showNum(ex.toParts[0].value)} ?`
        : `${partsText(ex.fromParts)} = ${ex.toParts.map(p => `? ${p.key}`).join(' ')}`),
    supported: (c) => !c.writeUnits,
});

// ── Geld ─────────────────────────────────────────────────────────────────────

const euros = (cents: number) => numberSpellings(cents / 100);
// Whole euros bare (€ 10), else always two cent digits (€ 1,70), like the sheet.
const showEuro = (cents: number) => `€ ${cents % 100 === 0 ? showNum(cents / 100) : formatMathNumber((cents / 100).toFixed(2))}`;

// The amount in euros; the decimaal format needs the comma.
export const GELD_KIOSK = descriptor<GeldExercise>({
    input: 'number',
    keys: (c) => (c.format === 'decimaal' ? [','] : []),
    answerOf: (ex) => euros(ex.amountCents),
    display: (ex) => `${ex.denominations.filter(d => d.count > 0).map(d => `${d.count} × ${showEuro(d.valueCents)}`).join(' + ')} = € ?`,
});

// euro-cent (the default, and 'beide'): "__ euro en __ cent" as two fields; decimaal: € 3,75.
const teruggevenDecimaal = (c: Record<string, unknown>) => c.antwoordFormat === 'decimaal';
export const GELD_TERUGGEVEN_KIOSK = descriptor<GeldTeruggevenExercise>({
    input: 'number',
    inputOf: (_ex, c) => (teruggevenDecimaal(c) ? 'number' : 'multi-number'),
    keys: (c) => (teruggevenDecimaal(c) ? [','] : []),
    labels: () => ['euro', 'cent'],
    answerOf: (ex, c) => (teruggevenDecimaal(c)
        ? euros(ex.changeCents)
        : [String(Math.floor(ex.changeCents / 100)), String(ex.changeCents % 100)]),
    display: (ex) => `${showEuro(ex.priceCents)} betalen met ${showEuro(ex.payWithCents)}: terug ?`,
});

// korting: korting in € + nieuwe prijs (two fields); intrest: the interest. Winst asks a word too.
// SYNC: GeldRekenenViewer rows.
const kortingCents = (ex: GeldRekenenExercise) => ((ex.priceCents ?? 0) * (ex.percent ?? 0)) / 100;
const intrestCents = (ex: GeldRekenenExercise) => ((ex.capitalCents ?? 0) * (ex.percent ?? 0)) / 100 * ((ex.months ?? 12) / 12);
export const GELD_REKENEN_KIOSK = descriptor<GeldRekenenExercise>({
    input: 'number',
    inputOf: (ex) => (ex.subType === 'korting' ? 'multi-number' : 'number'),
    keys: () => [','],
    labels: () => ['korting €', 'nieuwe prijs €'],
    answerOf: (ex) => (ex.subType === 'korting'
        ? [euros(kortingCents(ex)).join('|'), euros((ex.priceCents ?? 0) - kortingCents(ex)).join('|')]
        : euros(intrestCents(ex))),
    display: (ex) => (ex.subType === 'korting'
        ? `${showEuro(ex.priceCents ?? 0)} − ${ex.percent} %: korting ? nieuwe prijs ?`
        : `${ex.percent} % van ${showEuro(ex.capitalCents ?? 0)} (${ex.months === 6 ? '6 maanden' : '1 jaar'}) = ?`),
    supported: (c) => c.subType === 'korting' || c.subType === 'intrest',
});
