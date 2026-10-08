import type {
    AfrondenExercise, BreukBewerkExercise, CijferExercise, ControleExercise, DeelbaarheidExercise, Equation, EvenOnevenExercise,
    ClockExercise, Fraction, FractionExercise, GeldExercise, TijdsduurExercise, VerbandExercise,
    GeldRekenenExercise, GeldTeruggevenExercise, GetalFunctieExercise, GetallenasExercise, HerleidingExercise, HerleidingPart,
    MaateenheidExercise, MabExercise, MeetExercise, OrdenenExercise, PatroonExercise, PlaatswaardeExercise, ProcentExercise,
    RekenvolgordeExercise, RomeinseExercise, SchattendExercise, SplitsenExercise, TemperatuurExercise, VergelijkenExercise,
    VormleerExercise, WeegschaalExercise,
} from '../math/types';
import { INTERACT_SEP, type KioskDescriptor, type KioskInput, type KioskKey } from './types';
import { gcd, isFraction } from '../math/answerKeys';
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
// kiezen: tap the grootste / kleinste ON the card (Phase C); the viewer's keys are positions.
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
    inputOf: (_ex, c) => (isKiezen(c) ? 'interactive' : 'choice'),
    choices: ['<', '=', '>'],
    interact: {
        kind: 'tap',
        keys: (ex) => (ex.numbers ?? []).map((_, i) => String(i)),
        answerOf: (ex) => showNum(kiezenAnswer(ex)),
        // The tapped number's value, so two equal maxima both count and a stats row reads "437".
        fromState: (st, ex) => {
            const n = st.selected.length ? ex.numbers?.[Number(st.selected[0])] : undefined;
            return n === undefined ? '' : showNum(n);
        },
    },
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

// cirkels: the pupil groups the circles and picks even / oneven. rooster: taps every even (or
// oneven) number ON the card (Phase C); the answer is that set, smallest first.
const isRooster = (c: Record<string, unknown>) => c.subType !== 'cirkels';
const roosterTarget = (c: Record<string, unknown>) => ((c.target as string | undefined) ?? 'even');
const roosterSet = (nums: readonly number[]) => [...nums].sort((a, b) => a - b).map(showNum).join(INTERACT_SEP);
const roosterAnswer = (ex: EvenOnevenExercise, c: Record<string, unknown>) => {
    // SYNC: EvenOnevenViewer isTarget.
    const even = roosterTarget(c) === 'even';
    return roosterSet((ex.numbers ?? []).filter(n => (n % 2 === 0) === even));
};
export const EVEN_ONEVEN_KIOSK = descriptor<EvenOnevenExercise>({
    input: 'choice',
    inputOf: (_ex, c) => (isRooster(c) ? 'interactive' : 'choice'),
    choices: ['even', 'oneven'],
    interact: {
        kind: 'tap-multi',
        keys: (ex) => (ex.numbers ?? []).map((_, i) => String(i)),
        answerOf: roosterAnswer,
        fromState: (st, ex) => roosterSet(st.selected.map(k => ex.numbers?.[Number(k)]).filter((n): n is number => n !== undefined)),
    },
    answerOf: (ex, c) => [isRooster(c) ? roosterAnswer(ex, c) : (ex.number ?? 0) % 2 === 0 ? 'even' : 'oneven'],
    display: (ex, c) => (isRooster(c) ? `${roosterTarget(c)} in ${(ex.numbers ?? []).map(showNum).join(' ')}: ?` : `${ex.number ?? 0} is ?`),
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

// ── Rijen: one field per blank, left to right ───────────────────────────────

// A value as the sheet prints it AND reduced: an ordenen row can show 6/8, and copying it
// over is right there (only breuken-bewerken asks for one particular form).
function shownSpellings(v: number | Fraction): string[] {
    if (!isFraction(v)) return numberSpellings(v);
    const g = gcd(v.n, v.d) || 1;
    return [...new Set([...fractionSpellings(v), ...fractionSpellings({ whole: v.whole, n: v.n / g, d: v.d / g })])];
}
// Every blank's value as one multi-number entry (a fraction in all its spellings).
const blanksOf = (values: readonly (number | Fraction)[], mask: readonly boolean[]) =>
    values.filter((_, i) => mask[i]).map(v => shownSpellings(v).join('|'));
const rowText = (values: readonly (number | Fraction)[], mask: readonly boolean[], sep: string) =>
    values.map((v, i) => (mask[i] ? '?' : showValue(v))).join(sep);
// The keys a number kind needs: decimals a comma, fractions a slash (+ space for gemengd), gehele a minus.
const kindKeys = (c: Record<string, unknown>): KioskKey[] => {
    const nt = numberTypeOf(c);
    return nt === 'decimal' ? [','] : nt === 'rational' ? ['/', ' '] : nt === 'geheel' ? ['-'] : [];
};

// An operator blank (arrows on, the sign not printed) is a second kind of answer: those
// settings stay out. Kettingsommen print every sign by default.
// SYNC: PatroonViewer `filled` (showOperators && i < operatorsShown).
const operatorsAllShown = (c: Record<string, unknown>) => {
    if (!c.showArrows) return true;
    const ops = typeof c.ticks === 'number' ? c.ticks - 1 : Number(c.chainLength ?? 4);
    return !!c.showOperators && Number(c.operatorsShown ?? 0) >= ops;
};
export const PATROON_KIOSK = descriptor<PatroonExercise>({
    input: 'multi-number',
    keys: kindKeys,
    answerOf: (ex) => blanksOf(ex.values, ex.blankMask),
    display: (ex) => rowText(ex.values, ex.blankMask, ' – '),
    supported: operatorsAllShown,
});

export const GETALLENAS_KIOSK = descriptor<GetallenasExercise>({
    input: 'multi-number',
    keys: kindKeys,
    // SYNC: GetallenasViewer derives a legacy natural line from start + step.
    answerOf: (ex) => blanksOf(ex.values?.length ? ex.values : Array.from({ length: ex.tickCount }, (_, i) => ex.start + (ex.direction === 'left' ? -i : i) * ex.step), ex.blankMask),
    display: (ex) => rowText(ex.values ?? [], ex.blankMask, ' | '),
});

// The multiples after the given ones; the kiosk card prints the whole run (no "enz." cap).
export const VEELVOUDEN_KIOSK = descriptor<DeelbaarheidExercise>({
    input: 'multi-number',
    answerOf: (ex) => (ex.sequence ?? []).slice(ex.givenCount ?? 2).map(String),
    display: (ex) => (ex.sequence ?? []).map((v, i) => (i < (ex.givenCount ?? 2) ? String(v) : '?')).join(' – '),
    supported: (c) => c.layout === 'veelvouden',
});

// Write the shuffled values in order; the < or > sits between the fields as on the sheet.
export const ORDENEN_KIOSK = descriptor<OrdenenExercise>({
    input: 'multi-number',
    keys: (c) => (c.fractionMode !== undefined ? ['/'] : kindKeys(c)),
    separator: (ex) => ex.operator,
    answerOf: (ex) => ex.values.map(v => shownSpellings(v).join('|')),
    display: (ex) => `${ex.display.map(showValue).join(', ')} → ${ex.values.map(() => '?').join(` ${ex.operator} `)}`,
});

// basis / harten: the partner of every given number; boom: the one blank of the tree;
// positie-tabel: the digit of every place. Benen and the math rows are not served yet.
const splitsLayout = (c: Record<string, unknown>) => (c.layout as string | undefined) ?? 'basic';
const pairLabels = (ex: SplitsenExercise) => ex.pairs.map(p => `${showNum(p.given)} en`);
export const SPLITSEN_KIOSK = descriptor<SplitsenExercise>({
    input: 'multi-number',
    inputOf: (_ex, c) => (splitsLayout(c) === 'splitsboom' ? 'number' : 'multi-number'),
    keys: (c) => (Number(c.decimalPlaces ?? 0) > 0 && splitsLayout(c) === 'basic' ? [','] : []),
    labels: (ex, c) => (splitsLayout(c) === 'positie-tabel' ? (ex.placeBreakdown ?? []).map(p => p.key) : pairLabels(ex)),
    answerOf: (ex, c) => {
        const layout = splitsLayout(c);
        if (layout === 'positie-tabel') return (ex.placeBreakdown ?? []).map(p => String(p.digit));
        if (layout === 'splitsboom') {
            const p = ex.pairs[0];
            const pos = ex.blankPos ?? 'right';
            return numberSpellings(pos === 'top' ? ex.total : pos === 'left' ? p.given : p.answer);
        }
        return ex.pairs.map(p => numberSpellings(p.answer).join('|'));
    },
    display: (ex, c) => {
        const layout = splitsLayout(c);
        if (layout === 'positie-tabel') return `${showNum(ex.total)} in de positietabel: ?`;
        if (layout === 'splitsboom') {
            const pos = ex.blankPos ?? 'right';
            const [top, left, right] = [ex.total, ex.pairs[0]?.given ?? 0, ex.pairs[0]?.answer ?? 0].map(showNum);
            return `${pos === 'top' ? '?' : top} = ${pos === 'left' ? '?' : left} + ${pos === 'right' ? '?' : right}`;
        }
        return `${showNum(ex.total)} = ${ex.pairs.map(p => `${showNum(p.given)} + ?`).join(' ; ')}`;
    },
    supported: (c) => ['basic', 'splitsboom', 'verliefde-harten', 'positie-tabel'].includes(splitsLayout(c)),
});

// ── Breuken ──────────────────────────────────────────────────────────────────

const fracText = (f: Fraction) => (f.whole ? `${f.whole} ${f.n}/${f.d}` : `${f.n}/${f.d}`);
const reduce = (f: Fraction): Fraction => {
    const g = gcd(f.n, f.d) || 1;
    return { whole: f.whole, n: f.n / g, d: f.d / g };
};

// The FORM is the exercise here, so only that form counts: naar-gemengd a gemengd getal
// (the fraction part simplified or not), naar-breuk an improper fraction (idem),
// vereenvoudigen the lowest terms, gelijknamig the two fractions over the common noemer.
function bewerkSpellings(ex: BreukBewerkExercise, f: Fraction): string[] {
    if (ex.subType === 'gelijknamig' || ex.subType === 'vereenvoudigen') return [fracText(f)];
    const whole = (f.whole ?? 0) + Math.floor(f.n / f.d);
    const n = f.n % f.d;
    if (ex.direction === 'naar-breuk') {
        const top = whole * f.d + n;
        return [...new Set([`${top}/${f.d}`, fracText(reduce({ n: top, d: f.d }))])];
    }
    if (n === 0) return [String(whole)];
    return [...new Set([`${whole} ${n}/${f.d}`, fracText(reduce({ whole, n, d: f.d }))])];
}
export const BREUK_BEWERK_KIOSK = descriptor<BreukBewerkExercise>({
    input: 'number',
    inputOf: (ex) => (ex.subType === 'gelijknamig' ? 'multi-number' : 'number'),
    keys: (c) => (c.subType === 'gemengd' ? ['/', ' '] : ['/']),
    labels: () => ['1ste breuk', '2de breuk'],
    answerOf: (ex) => (ex.subType === 'gelijknamig'
        ? ex.answers.map(a => bewerkSpellings(ex, a).join('|'))
        : bewerkSpellings(ex, ex.answers[0])),
    display: (ex) => `${ex.inputs.map(fracText).join(' en ')} → ${ex.answers.map(() => '?').join(' en ')}`,
});

// SYNC: VerbandenViewer derives kommagetal (3 places) and procent (1 place) from n/d.
const REP_LABEL: Record<string, string> = { breuk: 'breuk', decimaal: 'kommagetal', procent: 'procent %' };
const verbandAnswer = (f: Fraction, rep: string): string[] => {
    if (rep === 'decimaal') return numberSpellings(Number((f.n / f.d).toFixed(3)));
    if (rep === 'procent') return numberSpellings(Number(((f.n / f.d) * 100).toFixed(1)));
    return [...new Set([fracText(f), fracText(reduce(f))])];
};
const verbandFields = (ex: VerbandExercise, c: Record<string, unknown>): string[] => {
    if (c.subType === 'paren') return [ex.target ?? 'decimaal'];
    const reps = (c.reps as string[] | undefined) ?? ['breuk', 'decimaal', 'procent'];
    return reps.filter(r => r !== ex.given);
};
// Every asked representation is a field, captioned; a percent is typed without the % sign.
export const VERBANDEN_KIOSK = descriptor<VerbandExercise>({
    input: 'multi-number',
    keys: () => [',', '/'],
    labels: (ex, c) => verbandFields(ex, c).map(r => REP_LABEL[r] ?? r),
    answerOf: (ex, c) => verbandFields(ex, c).map(r => verbandAnswer(ex.fraction, r).join('|')),
    display: (ex, c) => `${verbandAnswer(ex.fraction, ex.given)[0]}${ex.given === 'procent' ? ' %' : ''} = ${verbandFields(ex, c).map(r => `? (${REP_LABEL[r]})`).join(' = ')}`,
});

// herkennen: the coloured part as a breuk (or the two counting questions); hoeveelheid: how
// many objects n/d of the total is. The shapes to colour or a line to divide are drawing.
const fracSub = (c: Record<string, unknown>) => (c.subType as string | undefined) ?? 'kleuren';
const isQuestions = (c: Record<string, unknown>) => fracSub(c) === 'herkennen' && (c.answerFormat ?? 'fraction-questions') === 'fraction-questions';
// SYNC: FractionExerciseItem coloredCount (concreet: rounded; abstract: 4 places).
const deelVan = (ex: FractionExercise) => (ex.subType === 'hoeveelheid-abstract'
    ? parseFloat((parseFloat(((ex.total ?? 0) / ex.denominator).toFixed(4)) * ex.numerator).toFixed(4))
    : Math.round(((ex.total ?? 0) * ex.numerator) / ex.denominator));
export const BREUKEN_KIOSK = descriptor<FractionExercise>({
    input: 'number',
    inputOf: (_ex, c) => (isQuestions(c) ? 'multi-number' : 'number'),
    keys: (c) => (fracSub(c) === 'herkennen' && !isQuestions(c) ? ['/'] : fracSub(c) === 'hoeveelheid-abstract' ? [','] : []),
    labels: () => ['gelijke delen', 'ingekleurd'],
    answerOf: (ex, c) => {
        if (isQuestions(c)) return [String(ex.denominator), String(ex.numerator)];
        if (fracSub(c) === 'herkennen') return [...new Set([`${ex.numerator}/${ex.denominator}`, fracText(reduce({ n: ex.numerator, d: ex.denominator }))])];
        return numberSpellings(deelVan(ex));
    },
    display: (ex, c) => (fracSub(c) === 'herkennen'
        ? `gekleurd deel van ${ex.denominator} delen: ?`
        : `${ex.numerator}/${ex.denominator} van ${ex.total ?? 0} = ?`),
    supported: (c) => ['herkennen', 'hoeveelheid', 'hoeveelheid-abstract'].includes(fracSub(c)),
});

// ── Tijd ─────────────────────────────────────────────────────────────────────

const hm = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;

// Read an analoge klok, or write a spoken time ("kwart over 3") digitally. A clock face has
// no ochtend / avond, so 3:15 and 15:15 both count (and 0:00 / 12:00 for twaalf uur).
// Reading a digitale klok asks the time in words: not served.
const klokMode = (ex: ClockExercise, c: Record<string, unknown>) => ex.exerciseMode ?? (c.exerciseMode as string | undefined) ?? 'lezen';
const klokType = (ex: ClockExercise, c: Record<string, unknown>) => ex.clockType ?? (c.clockType as string | undefined) ?? 'analoog';
export const KLOK_KIOSK = descriptor<ClockExercise>({
    input: 'time',
    answerOf: (ex) => {
        const h12 = ex.hours % 12;
        return (h12 === 0 ? [0, 12] : [h12, h12 + 12]).map(h => hm(h, ex.minutes));
    },
    display: (ex, c) => (klokMode(ex, c) === 'lezen' ? `${klokType(ex, c) === 'analoog' ? 'analoge' : 'digitale'} klok: ? : ??` : `${ex.timeText} = ? : ??`),
    supported: (c) => {
        const mode = (c.exerciseMode as string | undefined) ?? 'lezen';
        const type = (c.clockType as string | undefined) ?? 'analoog';
        return type === 'analoog' ? mode !== 'tekenen' : mode === 'tekenen';
    },
});

// begin / einde: a 24-hour time as the row prints it (past midnight wraps); duur: uur + min.
const clock24 = (min: number) => hm(Math.floor(min / 60) % 24, min % 60);
export const TIJDSDUUR_KIOSK = descriptor<TijdsduurExercise>({
    input: 'time',
    inputOf: (ex) => (ex.blank === 'duur' ? 'multi-number' : 'time'),
    labels: () => ['uur', 'min'],
    answerOf: (ex) => {
        if (ex.blank === 'duur') {
            const d = ex.endMin - ex.startMin;
            return [String(Math.floor(d / 60)), String(d % 60)];
        }
        return [clock24(ex.blank === 'begin' ? ex.startMin : ex.endMin)];
    },
    display: (ex) => {
        const cell = (k: 'begin' | 'einde' | 'duur', v: string) => (ex.blank === k ? '?' : v);
        return `begin ${cell('begin', clock24(ex.startMin))} · einde ${cell('einde', clock24(ex.endMin))} · duur ${cell('duur', `${ex.endMin - ex.startMin} min`)}`;
    },
});
