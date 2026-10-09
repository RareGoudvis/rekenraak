import { describe, test, expect } from 'vitest';
import type { AfrondenExercise, CijferExercise, Equation, Fraction, ProcentExercise, VergelijkenExercise } from '../services/math/types';
import type { KioskDescriptor, KioskInput, KioskPiece, OefenSessie, OefenType } from '../services/oefenen/types';
import { flattenLeaves, type AppLeaf } from '../config/appstructure';
import { LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { seedConstraints } from '../config/baseSettings';
import { targetsFor, usableTargets } from '../services/afronden/afrondenGenerator';
import { formatMathNumber } from '../services/math/formatters';
import { kioskCapableLeaves, kioskFor, kioskInputOf, kioskInteractOf, kioskSupports } from '../services/oefenen/kiosk';
import { nextExercise } from '../services/oefenen/scheduler';
import { checkAnswer, normaliseFraction, normaliseNumber } from '../services/oefenen/check';
import { INTERACT_SEP } from '../services/oefenen/types';
import { EMPTY_INTERACTION, type BuildEntry } from '../components/viewer/ViewerInteractionContext';
import { fractionSpellings, numberSpellings } from '../services/oefenen/kioskDescriptors';
import { answerText, expectedText } from '../services/oefenen/stats';
import { gradeBase, mulberry32 } from './helpers/limitHarness';
import { cellsFromParts, cijferFill, type Cells } from './helpers/fillCells';
import { checkDrag } from './helpers/dragCheck';
import { cijferKiosk } from '../services/oefenen/kioskDescriptors';
import { cijferKioskGrid } from '../services/cijferen/cijferCells';
import { divideToDecimals } from '../services/cijferen/cijferGenerator';
import { sanitizeAnswer } from '../oefenen/useOefenStore';
import type * as T from '../services/math/types';
import { PLACE_VALUES } from '../services/math/mathEngine';
import { CONCEPT_NAMES } from '../services/vormleer/vormleerGenerator';
import { KIOSK_MAX_NUMBERS, kioskNumbers } from '../services/deelbaarheid/deelbaarheidKleurGenerator';
import { applyOp,evaluateChain, evaluateTokens, isFraction, numValue, scaled } from './helpers/answerKeys';

// Every kiosk-capable leaf × every leerjaar seed × 50 seeds: the descriptor's answer must be
// the generator's own answer field, and checkAnswer must take it (in every spelling) and
// refuse a wrong one.

const SEEDS = 50;

const EXPECTED_LEAVES = [
    'hr-std-optellen-nat', 'hr-std-optellen-dec', 'hr-std-optellen-rat',
    'hr-std-aftrekken-nat', 'hr-std-aftrekken-dec', 'hr-std-aftrekken-rat',
    'hr-std-vermenigvuldigen-nat', 'hr-std-vermenigvuldigen-dec', 'hr-std-vermenigvuldigen-rat',
    'hr-std-delen-nat', 'hr-std-delen-dec', 'hr-std-delen-rat',
    'procenten-nemen', 'procenten-welk', 'afronden-nat-simpel', 'afronden-dec-simpel', 'vergelijken-getallen',
    'hr-std-gemengd-nat', 'hr-std-gemengd-dec',
    'cijferen-optellen-nat', 'cijferen-optellen-dec', 'cijferen-aftrekken-nat', 'cijferen-aftrekken-dec',
    'cijferen-vermenigvuldigen-nat', 'cijferen-vermenigvuldigen-dec', 'cijferen-delen-nat', 'cijferen-delen-dec',
    'plaatswaarde-waarde', 'plaatswaarde-plaats', 'plaatswaarde-omcirkelen', 'vergelijken-kiezen', 'vergelijken-representaties',
    'even-oneven-cirkels', 'romeinse-herkennen', 'romeinse-schrijven', 'getalbegrip-functie', 'mab-herkennen',
    'schattend-nat', 'schattend-dec', 'handig-rekenvolgorde', 'controleren-negenproef', 'controleren-omgekeerde',
    'vormleer-hoeken-herkennen', 'vormleer-vierhoeken',
    'temperatuur-aflezen', 'temperatuur-verschil', 'massa-weegschaal-aflezen', 'oppervlakte-rooster', 'oppervlakte-berekenen',
    'maateenheid-kiezen', 'herleidingen-lengte', 'herleidingen-inhoud', 'herleidingen-massa', 'herleidingen-oppervlakte',
    'geld-herkennen', 'geld-teruggeven', 'geld-rekenen-korting', 'geld-rekenen-intrest',
    'splitsen-basis', 'splitsen-boom', 'splitsen-harten', 'splitsen-positietabel',
    'getalbegrip-ordenen-nat', 'getalbegrip-ordenen-dec', 'getalbegrip-ordenen-rat', 'getalbegrip-ordenen-geh',
    'getalbegrip-getallenassen-nat', 'getalbegrip-getallenassen-dec', 'getalbegrip-getallenassen-rat', 'getalbegrip-getallenassen-geh',
    'getalbegrip-getallenrijen-nat', 'getalbegrip-getallenrijen-dec', 'getalbegrip-getallenrijen-rat', 'getalbegrip-getallenrijen-geh',
    'breuken-rangschikken', 'patronen-nat', 'patronen-dec', 'patronen-geh', 'patronen-kettingsommen', 'deelbaarheid-veelvouden',
    'breuken-herkennen', 'breuken-hoeveelheid', 'breuken-gemengd', 'breuken-gelijknamig', 'breuken-vereenvoudigen',
    'verbanden-tabel', 'verbanden-paren', 'procenten-verbanden',
    'klok-analoog-lezen', 'klok-analoog-omzetten', 'klok-digitaal-tekenen', 'tijdsduur-berekenen',
    'even-oneven-rooster',
    'deelbaarheid-tabel', 'deelbaarheid-rooster', 'deelbaarheid-omcirkelen', 'deelbaarheid-kleurraster',
    'breuken-kleuren',
    'afronden-nat-rooster', 'afronden-dec-rooster', 'plaatswaarde-tabel',
    'geld-tekenen', 'geld-wissel', 'mab-tekenen',
    'klok-analoog-tekenen', 'vormleer-hoeken-tekenen', 'temperatuur-kleuren', 'massa-weegschaal-tekenen',
];

// Parses an accepted spelling back to a value, independently of check.ts.
function valueOf(spelling: string): number {
    const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(spelling);
    if (m) return (m[1] ? -1 : 1) * (Number(m[2] ?? 0) + Number(m[3]) / Number(m[4]));
    return Number(spelling.replace(',', '.'));
}

const missingIdx = (eq: Equation) =>
    eq.missingIndex ?? (eq.missingTerm === 'operand1' ? 0 : eq.missingTerm === 'operand2' ? 1 : undefined);

// Written from scratch: half up on scaled integers.
function roundHalfUp(n: number, weight: number): number {
    const units = Math.round(n * 1e6), step = Math.round(weight * 1e6);
    return (Math.floor((units + step / 2) / step) * step) / 1e6;
}

// What the pupil must give: a number, [quotiënt, rest], a choice, accepted words, accepted
// times or one number per field.
type Truth = number | [number, number] | string | { text: string[] } | { time: Array<[number, number]> } | { multi: number[] } | { set: string[] } | { count: number }
    // build: the value to lay, and the coins / blocks the tray may hold (absent = any).
    | BuildTruth;
type BuildTruth = { build: number; allowed?: number[]; digits?: Record<string, number> };

// Every cijferen leaf is its own typeId; the answer must also redo the column sum.
function cijferTruth(ex: CijferExercise): Truth {
    const [a, b] = ex.operands;
    if (ex.operator === ':') {
        expect(scaled(ex.answer * b + ex.remainder)).toBe(scaled(a));
        expect(ex.remainder).toBeGreaterThanOrEqual(0);
        return [ex.answer, ex.remainder];
    }
    const want = ex.operator === '+' ? ex.operands.reduce((x, y) => x + y, 0) : ex.operator === '-' ? a - b : a * b;
    expect(scaled(want)).toBe(scaled(ex.answer));
    return ex.answer;
}

function hrTruth(eq: Equation): Truth {
    if (eq.remainder !== undefined) return [eq.answer as number, eq.remainder];
    // The equation itself must hold, so a field that agrees with answerOf is also right.
    expect(scaled(evaluateChain(eq)), JSON.stringify(eq)).toBe(scaled(numValue(eq.answer)));
    const idx = missingIdx(eq);
    return numValue(idx !== undefined ? eq.operands[idx] : eq.answer);
}

// The value the pupil must give, read straight from the generator's fields, per typeId.
const TRUTH: Record<string, (ex: never, c: Record<string, unknown>) => Truth> = {
    procenten: (p: ProcentExercise, c) => {
        expect(scaled((p.base * p.percent) / 100)).toBe(scaled(p.answer));
        return c.subType === 'welk-percent' ? p.percent : p.answer;
    },
    afronden: (a: AfrondenExercise, c) => {
        if (c.subType === 'rooster') {
            // Every number × every rounding column the sheet prints.
            const dec = c.numberType === 'decimal';
            const cols = usableTargets(c.numberType as string, Number(c.maxGetal ?? (dec ? 100 : 1000)), Number(c.decimalPlaces ?? 2), c.roundTargets as string[]);
            const ts = cols.length ? cols : [targetsFor(c.numberType as string)[0]];
            return { multi: a.numbers!.flatMap(n => ts.map(t => roundHalfUp(n, t.weight))) };
        }
        const t = targetsFor(c.numberType as string).find(x => x.key === a.targetKey);
        expect(t, `target ${a.targetKey}`).toBeDefined();
        return roundHalfUp(a.number as number, t!.weight);
    },
    vergelijken: (v: VergelijkenExercise, c) => {
        if (c.subType !== 'kiezen') return v.a! < v.b! ? '<' : v.a! > v.b! ? '>' : '=';
        const nums = v.numbers!;
        return formatMathNumber(v.target === 'kleinste' ? Math.min(...nums) : Math.max(...nums));
    },
    plaatswaarde: (p: T.PlaatswaardeExercise, c) => {
        const place = PLACE_VALUES.find(x => x.key === p.placeKey)!;
        expect(place, p.placeKey).toBeDefined();
        if (c.subType === 'plaats') return place.label.toLowerCase();
        if (c.subType === 'omcirkelen') return place.key;
        if (c.subType === 'tabel') {
            // The digits from the first non-zero one down to the last place the block prints.
            const dp = Number(c.decimalPlaces ?? 0);
            return { multi: String(Math.round(p.number * 10 ** dp)).split('').map(Number) };
        }
        // The digit at that place, on scaled integers (4 decimals at most).
        const digit = Math.floor(Math.round(p.number * 1e4) / Math.round(place.weight * 1e4)) % 10;
        expect(digit, `${p.number} ${p.placeKey}`).toBeGreaterThan(0);
        return digit * place.weight;
    },
    'even-oneven': (e: T.EvenOnevenExercise, c) => {
        if (c.subType === 'cirkels') return e.number! % 2 === 0 ? 'even' : 'oneven';
        // rooster: every number of the asked parity, smallest first, as the card's answer string.
        const want = c.target === 'oneven' ? 1 : 0;
        return { set: e.numbers!.filter(n => n % 2 === want).sort((a, b) => a - b).map(n => formatMathNumber(n)) };
    },
    'romeinse-cijfers': (r: T.RomeinseExercise, c) => {
        expect(fromRoman(r.roman)).toBe(r.value);
        return c.subType === 'schrijven' ? { text: [r.roman] } : r.value;
    },
    getalfunctie: (g: T.GetalFunctieExercise, c) => {
        const short = { hoeveelheid: 'hoeveelheid', rang: 'rangorde', maat: 'maat', code: 'code' }[g.functie];
        const full = { hoeveelheid: 'hoeveelheidsgetal', rang: 'rangordegetal', maat: 'maatgetal', code: 'codegetal' }[g.functie];
        return c.answerMode === 'schrijven' ? { text: [full, short] } : short;
    },
    // A positietabel column holds a digit: the blocks to lay are the number's own digits.
    'mab-tekenen': (m: T.MabExercise) => {
        const digits = { D: Math.floor(m.value / 1000), H: Math.floor(m.value / 100) % 10, T: Math.floor(m.value / 10) % 10, E: m.value % 10 };
        expect([m.thousands, m.hundreds, m.tens, m.units]).toEqual([digits.D, digits.H, digits.T, digits.E]);
        return { build: m.value, digits };
    },
    // Any coins and bills the teacher ticked, none above the block's top amount.
    'geld-tekenen': (g: T.GeldExercise, c) => {
        const max = Number(c.maxGetal) * 100;
        expect(g.amountCents).toBeLessThanOrEqual(max);
        if (c.format === 'euros') expect(g.amountCents % 100).toBe(0);
        return { build: g.amountCents, allowed: (c.allowedDenominations as number[]).filter(v => v <= max) };
    },
    // The bill the kiosk drew from the teacher's (prepare: one per exercise), laid in smaller money.
    'geld-wissel': (g: T.GeldWisselExercise, c) => {
        expect(g.billValueCents).toBe((c.exerciseBills as number[] | undefined)?.[0] ?? 500);
        return { build: g.billValueCents, allowed: [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5].filter(v => v < g.billValueCents) };
    },
    'mab-herkennen': (m: T.MabExercise) => {
        expect(m.thousands * 1000 + m.hundreds * 100 + m.tens * 10 + m.units).toBe(m.value);
        return m.value;
    },
    rekenvolgorde: (r: T.RekenvolgordeExercise) => {
        expect(scaled(evaluateTokens(r.tokens))).toBe(scaled(r.answer));
        return r.answer;
    },
    controleren: (k: T.ControleExercise) => (k.shownAnswer === applyOp(k.a, k.operator, k.b) ? 'juist' : 'fout'),
    schattend: (s: T.SchattendExercise, c) => {
        const w = targetsFor(c.numberType as string).find(x => x.key === s.targetKey)!.weight;
        const ra = roundHalfUp(s.a, w);
        const rb = s.operator === '+' || s.operator === '-' ? roundHalfUp(s.b, w) : s.b;
        return applyOp(ra, s.operator, rb);
    },
    'vormleer-hoeken': (v: T.VormleerExercise) => CONCEPT_NAMES[v.concept],
    'vormleer-figuren': (v: T.VormleerExercise) => CONCEPT_NAMES[v.concept],
    temperatuur: (t: T.TemperatuurExercise, c) => (c.variant === 'verschil' ? Math.abs(t.celsius - t.celsius2!) : t.celsius),
    weegschaal: (w: T.WeegschaalExercise, c) => {
        const n = w.notatie ?? c.notatie;
        if (n === 'kg-g') return { multi: [Math.floor(w.grams / 1000), w.grams % 1000] };
        return n === 'kg-komma' ? w.grams / 1000 : w.grams;
    },
    'lengte-meten': (m: T.MeetExercise) => {
        const len = (m.points ?? []).slice(1).reduce((s, p, i) => s + Math.hypot(p.x - m.points![i].x, p.y - m.points![i].y), 0);
        expect(Math.abs(len - m.perimeter)).toBeLessThan(0.05);
        return m.claimCorrect ? 'juist' : 'fout';
    },
    omtrek: (m: T.MeetExercise) => {
        const p = m.kind === 'cirkel' ? 2 * Math.PI * m.radius! : m.sides!.reduce((a, b) => a + b, 0);
        expect(Math.abs(p - m.perimeter)).toBeLessThan(0.05);
        return Math.round(m.perimeter * 10) / 10;
    },
    oppervlakte: (m: T.MeetExercise, c) => {
        if (m.shape === 'rechthoek' || m.shape === 'vierkant') expect(m.area).toBe(m.sides![0] * m.sides![1]);
        const area = Math.round(m.area! * 10) / 10;
        return c.askOmtrek && c.subType !== 'rooster' ? { multi: [area, Math.round(m.perimeter * 10) / 10] } : area;
    },
    maateenheid: (m: T.MaateenheidExercise, c) => {
        const chip = c.subType === 'schatten' ? `${formatMathNumber(m.value)} ${m.unit}` : m.unit;
        return m.choices ? chip : { text: [m.unit] };
    },
    herleidingen: (h: T.HerleidingExercise) => {
        // Both sides are the same quantity in base units (m, l, g, m²).
        const base = (ps: T.HerleidingPart[]) => ps.reduce((s, p) => s + p.value * UNIT[p.key], 0);
        expect(scaled(base(h.toParts)), JSON.stringify(h)).toBe(scaled(base(h.fromParts)));
        if (h.blank === 'unit') return h.toParts[0].key;
        return h.toParts.length > 1 ? { multi: h.toParts.map(p => p.value) } : h.toParts[0].value;
    },
    'geld-herkennen': (g: T.GeldExercise) => {
        expect(g.denominations.reduce((s, d) => s + d.valueCents * d.count, 0)).toBe(g.amountCents);
        return g.amountCents / 100;
    },
    'geld-teruggeven': (g: T.GeldTeruggevenExercise, c) => {
        const change = g.payWithCents - g.priceCents;
        expect(g.changeCents).toBe(change);
        // With a draw box the change is laid from the coins and bills below the note paid with.
        if (c.antwoordType === 'tekenen-schrijven') return { build: change, allowed: [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5].filter(v => v < g.payWithCents) };
        return c.antwoordFormat === 'decimaal' ? change / 100 : { multi: [Math.floor(change / 100), change % 100] };
    },
    'geld-rekenen': (g: T.GeldRekenenExercise) => {
        if (g.subType === 'korting') {
            const korting = g.priceCents! * g.percent! / 100;
            return { multi: [korting / 100, (g.priceCents! - korting) / 100] };
        }
        return g.capitalCents! * g.percent! / 100 * ((g.months ?? 12) / 12) / 100;
    },
    getalpatronen: (p: T.PatroonExercise) => patroonTruth(p),
    kettingsommen: (p: T.PatroonExercise) => patroonTruth(p),
    getallenas: (a: T.GetallenasExercise) => axisTruth(a),
    getallenrijen: (a: T.GetallenasExercise) => axisTruth(a),
    deelbaarheid: (d: T.DeelbaarheidExercise, c) => {
        // tabel: the divisor columns the number divides, smallest first (tapped cells).
        if (c.layout !== 'veelvouden') return { set: (c.divisors as number[]).filter(x => d.number! % x === 0).sort((a, b) => a - b).map(x => formatMathNumber(x)) };
        d.sequence!.forEach((v, k) => expect(v).toBe(d.base! * k));
        return { multi: d.sequence!.slice(d.givenCount ?? 2) };
    },
    'deelbaarheid-kleuren': (k: T.DeelbaarheidKleurExercise) => {
        // The card shows a capped sub-list of the generated numbers; the multiples in it are the answer.
        const shown = kioskNumbers(k.numbers, k.divisor);
        expect(shown.length).toBe(Math.min(k.numbers.length, KIOSK_MAX_NUMBERS));
        shown.forEach(n => expect(k.numbers).toContain(n));
        expect(new Set(shown).size).toBe(shown.length);
        const all = k.numbers.filter(n => n % k.divisor === 0).length;
        expect(shown.filter(n => n % k.divisor === 0).length).toBeGreaterThanOrEqual(Math.min(2, all));
        return { set: shown.filter(n => n % k.divisor === 0).sort((a, b) => a - b).map(n => formatMathNumber(n)) };
    },
    ordenen: (o: T.OrdenenExercise) => ordenTruth(o),
    'breuken-rangschikken': (o: T.OrdenenExercise) => ordenTruth(o),
    splitsen: (s: T.SplitsenExercise, c) => {
        if (c.layout === 'positie-tabel') {
            const places = s.placeBreakdown!;
            expect(scaled(places.reduce((t, p) => t + p.digit * p.weight, 0))).toBe(scaled(s.total));
            return { multi: places.map(p => p.digit) };
        }
        for (const p of s.pairs) expect(scaled(p.given + p.answer)).toBe(scaled(s.total));
        if (c.layout === 'splitsboom') {
            const pos = s.blankPos ?? 'right';
            return pos === 'top' ? s.total : pos === 'left' ? s.pairs[0].given : s.pairs[0].answer;
        }
        return { multi: s.pairs.map(p => p.answer) };
    },
    'breuken-bewerken': (b: T.BreukBewerkExercise) => {
        const val = (f: Fraction) => (f.whole ?? 0) + f.n / f.d;
        if (b.subType === 'gelijknamig') {
            b.inputs.forEach((f, i) => expect(scaled(val(b.answers[i]))).toBe(scaled(val(f))));
            expect(b.answers[0].d).toBe(b.answers[1].d);
            return { multi: b.answers.map(val) };
        }
        expect(scaled(val(b.answers[0]))).toBe(scaled(val(b.inputs[0])));
        return val(b.answers[0]);
    },
    verbanden: (v: T.VerbandExercise, c) => {
        const { n, d } = v.fraction;
        const of = (rep: string) => (rep === 'breuk' ? n / d : rep === 'decimaal' ? Math.round((n / d) * 1000) / 1000 : Math.round((n / d) * 1000) / 10);
        const asked = c.subType === 'paren' ? [v.target!] : ((c.reps as string[] | undefined) ?? ['breuk', 'decimaal', 'procent']).filter(r => r !== v.given);
        expect(asked).not.toContain(v.given);
        return { multi: asked.map(of) };
    },
    breuken: (f: T.FractionExercise, c) => {
        if (c.subType === 'kleuren') {
            expect(f.numerator).toBeGreaterThanOrEqual(1);
            expect(f.numerator).toBeLessThanOrEqual(f.denominator);
            return { count: f.numerator };
        }
        if (c.subType === 'herkennen') {
            return (c.answerFormat ?? 'fraction-questions') === 'fraction-questions' ? { multi: [f.denominator, f.numerator] } : f.numerator / f.denominator;
        }
        if (c.subType === 'hoeveelheid-abstract') return Math.round((f.total! / f.denominator) * f.numerator * 1e4) / 1e4;
        // Concreet objects: n/d of the total is a whole number of them.
        expect(Number.isInteger((f.total! * f.numerator) / f.denominator), JSON.stringify(f)).toBe(true);
        return (f.total! * f.numerator) / f.denominator;
    },
    'klok-kloklezen': (k: T.ClockExercise) => {
        expect(k.digitalText).toBe(`${String(k.hours).padStart(2, '0')}:${String(k.minutes).padStart(2, '0')}`);
        // Both halves of the day: a clock face (and "kwart over 3") does not say which.
        const h = k.hours % 12;
        return { time: [[h === 0 ? 12 : h, k.minutes], [h === 0 ? 0 : h + 12, k.minutes]] };
    },
    tijdsduur: (t: T.TijdsduurExercise) => {
        expect(t.endMin).toBeGreaterThan(t.startMin);
        if (t.blank === 'duur') return { multi: [Math.floor((t.endMin - t.startMin) / 60), (t.endMin - t.startMin) % 60] };
        const min = t.blank === 'begin' ? t.startMin : t.endMin;
        return { time: [[Math.floor(min / 60) % 24, min % 60]] };
    },
};

// The row follows its own cycle of steps; the blanks are what the pupil fills.
function patroonTruth(p: T.PatroonExercise): Truth {
    p.values.slice(1).forEach((v, i) => {
        const step = p.cycle[i % p.cycle.length];
        expect(scaled(applyOp(p.values[i], step.op, step.operand)), JSON.stringify(p)).toBe(scaled(v));
    });
    return { multi: p.values.filter((_, i) => p.blankMask[i]) };
}

// Equal steps along the line (fractions by value).
function axisTruth(a: T.GetallenasExercise): Truth {
    const vals = (a.values?.length ? a.values : Array.from({ length: a.tickCount }, (_, i) => a.start + (a.direction === 'left' ? -i : i) * a.step)).map(numValue);
    const d = vals[1] - vals[0];
    vals.slice(1).forEach((v, i) => expect(scaled(v - vals[i]), JSON.stringify(a)).toBe(scaled(d)));
    return { multi: vals.filter((_, i) => a.blankMask[i]) };
}

// The answer row is the shown values sorted by the operator.
function ordenTruth(o: T.OrdenenExercise): Truth {
    const want = o.display.map(numValue).sort((x, y) => (o.operator === '<' ? x - y : y - x));
    expect(o.values.map(v => scaled(numValue(v)))).toEqual(want.map(scaled));
    return { multi: want };
}

// Every unit herleidingen uses, in its measure's base unit (m, l, g, m²).
const UNIT: Record<string, number> = {
    km: 1000, hm: 100, dam: 10, m: 1, dm: 0.1, cm: 0.01, mm: 0.001,
    kl: 1000, hl: 100, dal: 10, l: 1, dl: 0.1, cl: 0.01, ml: 0.001,
    ton: 1e6, kg: 1000, hg: 100, dag: 10, g: 1, dg: 0.1, cg: 0.01, mg: 0.001,
    'km²': 1e6, 'hm²': 1e4, 'dam²': 100, 'm²': 1, 'dm²': 0.01, 'cm²': 1e-4, 'mm²': 1e-6, ha: 1e4, a: 100, ca: 1,
};

// Written from scratch: subtractive Roman numerals (IV, XC, CM).
function fromRoman(s: string): number {
    const v: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let i = 0; i < s.length; i++) total += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
    return total;
}

function generatorAnswer(typeId: string, ex: unknown, c: Record<string, unknown>): Truth {
    if (typeId.startsWith('hr-std-')) return hrTruth(ex as Equation);
    if (typeId.startsWith('cijferen-')) return cijferTruth(ex as CijferExercise);
    const f = TRUTH[typeId];
    expect(f, `no truth for ${typeId}`).toBeDefined();
    return f(ex as never, c);
}

const wrongNumber = (x: number) => numberSpellings(x + 1)[0];

describe('kiosk-capable leaves', () => {
    test('exactly the expected leaves; roosters / representaties / drawing stay out', () => {
        const ids = kioskCapableLeaves().map(l => l.id);
        expect([...ids].sort()).toEqual([...EXPECTED_LEAVES].sort());
    });

    test('supported() follows the settings, registry defaults filling gaps', () => {
        expect(kioskSupports('afronden', { subType: 'simpel' })).toBe(true);
        expect(kioskSupports('afronden', {})).toBe(true);
        expect(kioskSupports('afronden', { subType: 'nope' })).toBe(false);
        expect(kioskSupports('vergelijken', {})).toBe(true);
        expect(kioskSupports('vergelijken', { subType: 'kiezen' })).toBe(true);
        expect(kioskSupports('procenten', {})).toBe(true);
        expect(kioskSupports('plaatswaarde', { subType: 'tabel' })).toBe(true);
        expect(kioskSupports('even-oneven', { subType: 'rooster' })).toBe(true);
        expect(kioskSupports('vormleer-hoeken', { mode: 'tekenen' })).toBe(true);
        expect(kioskSupports('vormleer-hoeken', { mode: 'meten' })).toBe(false);
        expect(kioskSupports('vormleer-punt-lijn', { mode: 'tekenen' })).toBe(false);
        expect(kioskSupports('vormleer-figuren', { mode: 'tekenen' })).toBe(false);
        expect(kioskSupports('vormleer-figuren', { concepts: ['rechthoekig', 'gelijkbenig'] })).toBe(false);
        expect(kioskSupports('vormleer-figuren', { concepts: ['rechthoekig', 'stomphoekig'] })).toBe(true);
        expect(kioskSupports('klok-kloklezen', {})).toBe(true);
        expect(kioskSupports('klok-kloklezen', { clockType: 'digitaal', exerciseMode: 'lezen' })).toBe(false);
        expect(kioskSupports('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'tekenen' })).toBe(true);
        expect(kioskSupports('nope', {})).toBe(false);
        // build: an empty tray (nothing ticked, only notes above the top amount, a 5 cent to change) is not served.
        expect(kioskSupports('geld-tekenen', { allowedDenominations: [] })).toBe(false);
        expect(kioskSupports('geld-tekenen', { allowedDenominations: [50000], maxGetal: 10 })).toBe(false);
        expect(kioskSupports('geld-tekenen', { allowedDenominations: [50000], maxGetal: 1000 })).toBe(true);
        expect(kioskSupports('geld-wissel', { exerciseBills: [5] })).toBe(false);
        expect(kioskSupports('geld-wissel', { exerciseBills: [10, 5] })).toBe(true);
        expect(kioskSupports('geld-wissel', { exerciseBills: [5, 5] })).toBe(false);
        expect(kioskSupports('mab-tekenen', {})).toBe(true);
    });
});

describe('descriptor answers agree with the generators', () => {
    test.each(kioskCapableLeaves().map(l => [l.id, l] as const))('%s', (_id, leaf) => {
        const inputs = agreeOverSeeds(leaf);
        expect([...inputs.values()].reduce((a, b) => a + b, 0)).toBe(SEEDS * 7);
    });

    // Settings a teacher picks in the builder that the leaf defaults never reach.
    test.each<[string, Record<string, unknown>, string]>([
        ['hr-std-optellen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-optellen-nat', { equationType: 'puntoefening', termCount: 3 }, 'missing-operand'],
        ['hr-std-aftrekken-dec', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-vermenigvuldigen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-vermenigvuldigen-nat', { multiplicationMode: 'andere' }, 'number'],
        ['hr-std-delen-nat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-delen-nat', { multiplicationMode: 'met_rest' }, 'number+rest'],
        ['hr-std-delen-rat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-aftrekken-rat', { equationType: 'puntoefening' }, 'missing-operand'],
        ['hr-std-optellen-nat', { numberType: 'geheel' }, 'number'],
        ['hr-std-aftrekken-nat', { numberType: 'geheel' }, 'number'],
        ['afronden-dec-simpel', { decimalPlaces: 3, roundTargets: ['E', 't', 'h'] }, 'number'],
        ['procenten-welk', { percents: [1, 5, 10, 20, 25, 50, 75] }, 'number'],
        ['vergelijken-getallen', { decimalPlaces: 2 }, 'choice'],
        ['vergelijken-kiezen', { chooseTarget: 'kleinste', decimalPlaces: 1 }, 'interactive'],
        ['even-oneven-rooster', { target: 'oneven', maxGetal: 10000, perRow: 12 }, 'interactive'],
        ['deelbaarheid-tabel', { divisors: [3, 4, 6, 9, 25, 50, 100], maxGetal: 10000 }, 'interactive'],
        ['deelbaarheid-kleurraster', { divisors: [3, 7, 11, 12], maxGetal: 1000, rasterCount: 1000 }, 'interactive'],
        ['deelbaarheid-omcirkelen', { divisors: [2], perRow: 5 }, 'interactive'],
        ['breuken-kleuren', { shapes: ['circle'], maxDenominator: 12 }, 'interactive'],
        ['breuken-kleuren', { shapes: ['square', 'rectangle'], minDenominator: 2, maxDenominator: 10 }, 'interactive'],
        ['deelbaarheid-rooster', { divisors: [3, 4, 6, 9, 25, 50, 100], maxGetal: 1000 }, 'interactive'],
        ['plaatswaarde-waarde', { decimalPlaces: 3 }, 'number'],
        ['plaatswaarde-plaats', { decimalPlaces: 2, maxGetal: 1000000 }, 'choice'],
        ['plaatswaarde-omcirkelen', { decimalPlaces: 2, maxGetal: 1000000 }, 'interactive'],
        ['getalbegrip-functie', { answerMode: 'schrijven' }, 'text'],
        ['getalbegrip-functie', { functies: ['rang', 'code'] }, 'interactive'],
        ['controleren-negenproef', { foutAandeel: 'alles' }, 'interactive'],
        ['temperatuur-aflezen', { includeNegatives: true }, 'number'],
        ['massa-weegschaal-aflezen', { notatie: 'kg-g', bereikGram: 5000, stepGram: 250 }, 'multi-number'],
        ['massa-weegschaal-aflezen', { notatie: 'kg-komma', bereikGram: 5000, stepGram: 250 }, 'number'],
        ['lengte-meten', { measureModel: 'gegeven' }, 'choice'],
        ['omtrek', { measureModel: 'gegeven', precision: 'mm', shapes: ['cirkel', 'trapezium', 'ruit'] }, 'number'],
        ['oppervlakte-berekenen', { askOmtrek: true, shapes: ['rechthoek', 'driehoek'] }, 'multi-number'],
        ['maateenheid-kiezen', { answerMode: 'schrijven', grootheden: ['temperatuur', 'tijd'] }, 'text'],
        ['maateenheid-kiezen', { subType: 'schatten' }, 'interactive'],
        ['herleidingen-massa', { formats: ['enkel-samengesteld'], compoundMode: 'volledig' }, 'multi-number'],
        ['herleidingen-lengte', { formats: ['enkel-eenheid'] }, 'choice'],
        ['geld-herkennen', { format: 'decimaal' }, 'number'],
        ['geld-teruggeven', { antwoordFormat: 'decimaal' }, 'number'],
        ['geld-rekenen-korting', { wholeEuros: false }, 'multi-number'],
        ['geld-rekenen-intrest', { halfYear: true }, 'number'],
        ['klok-analoog-lezen', { is24hour: true }, 'time'],
        ['klok-analoog-tekenen', { is24hour: true, timeTypes: ['nauwkeurig_1', 'uren'] }, 'interactive'],
        ['klok-analoog-tekenen', { handChoice: 'minuut', timeTypes: ['nauwkeurig_5'] }, 'interactive'],
        ['klok-analoog-tekenen', { handChoice: 'uur' }, 'interactive'],
        ['vormleer-hoeken-tekenen', { concepts: ['scherp', 'recht', 'stomp', 'gestrekt'], nameAngles: false }, 'interactive'],
        ['temperatuur-kleuren', { includeNegatives: true }, 'interactive'],
        ['massa-weegschaal-tekenen', { notatie: 'kg-g', bereikGram: 5000, stepGram: 250 }, 'interactive'],
        ['massa-weegschaal-tekenen', { notatie: 'kg-komma', bereikGram: 2000, stepGram: 50 }, 'interactive'],
        ['tijdsduur-berekenen', { blanks: ['begin', 'einde'], overMidnight: true }, 'time'],
        // Phase C2: a middle blank and the result, both cells on the card.
        ['patronen-kettingsommen', { blankMiddle: true, chainLength: 6, ops: ['+', '-', 'x', ':'] }, 'interactive'],
        ['splitsen-basis', { decimalPlaces: 1, maxGetal: 100 }, 'interactive'],
        ['plaatswaarde-tabel', { decimalPlaces: 3, maxGetal: 1000000 }, 'interactive'],
        ['cijferen-optellen-nat', { numberOfTerms: 4, maxRange: 100000 }, 'interactive'],
        // A two-digit multiplier needs a max above 100 (the multiplier tier); no stand-in fills in since 2026-10-09.
        ['cijferen-vermenigvuldigen-dec', { operand1Mask: { T: true, E: true }, maxRange: 10000 }, 'interactive'],
        // Phase C3: laid from the tray.
        ['geld-tekenen', { format: 'decimaal', maxGetal: 100 }, 'interactive'],
        ['geld-tekenen', { allowedDenominations: [200, 100, 50, 20, 10, 5], scaffolding: 'verdeeld' }, 'interactive'],
        ['geld-tekenen', { allowedDenominations: [5], format: 'decimaal' }, 'interactive'],
        ['geld-tekenen', { maxGetal: 1000 }, 'interactive'],
        ['geld-wissel', { exerciseBills: [50000] }, 'interactive'],
        ['geld-wissel', { exerciseBills: [10] }, 'interactive'],
        ['geld-wissel', { exerciseBills: [200, 5000] }, 'interactive'],
        ['mab-tekenen', { maxNumber: 1000, mabStyle: 'mab-color', operand1Mask: { H: true, E: true } }, 'interactive'],
        ['mab-tekenen', { maxNumber: 10 }, 'interactive'],
        ['geld-teruggeven', { antwoordType: 'tekenen-schrijven' }, 'interactive'],
        ['geld-teruggeven', { antwoordType: 'tekenen-schrijven', payWithOptions: [5000, 10000, 20000, 50000], maxPriceEuros: 999, centenDeel: 'vijf' }, 'interactive'],
    ])('%s + %j → %s', (leafId, extra, want) => {
        // From the whole sidebar: a setting can make a leaf kiosk-capable (lengte-meten 'gegeven').
        const leaf = flattenLeaves().find(l => l.id === leafId)!;
        expect(kioskSupports(leaf.typeId, { ...leaf.defaultConstraints, ...extra })).toBe(true);
        const inputs = agreeOverSeeds(leaf, extra);
        expect(inputs.get(want as KioskInput) ?? 0, JSON.stringify([...inputs])).toBeGreaterThan(0);
    });
});

// Phase C: tapping the viewer's keys must give the generator's answer. tap = one key, its value
// the truth; tap-multi = the set of right keys in any order, and one key more or less is wrong.
function checkInteractive(typeId: string, d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, truth: Truth, where: string) {
    const ia = kioskInteractOf(d, c)!;
    expect(ia, where).toBeDefined();
    const keys = ia.keys!(ex, c);
    const tap = (selected: string[]) => ia.fromState({ ...EMPTY_INTERACTION, selected }, ex, c);
    const check = (selected: string[]) => checkAnswer(d, ex, c, tap(selected));
    expect(new Set(keys).size, where).toBe(keys.length);
    expect(d.answerOf(ex, c), where).toEqual([ia.answerOf(ex, c)]);
    expect(tap([]), where).toBe('');
    if (ia.kind === 'fill-cells') { checkCells(typeId, d, ex, c, truth, where); return; }
    if (ia.kind === 'build') { checkBuild(d, ex, c, truth as BuildTruth, where); return; }
    if (ia.kind === 'drag') { checkDrag(typeId, d, ex, c, truth, where); return; }
    if (ia.kind === 'tap') {
        expect(ia.answerOf(ex, c), where).toBe(truth);
        const right = keys.filter(k => tap([k]) === truth);
        expect(right.length, where).toBeGreaterThan(0);
        for (const k of keys) expect(check([k]), `${where} key ${k}`).toBe(right.includes(k));
        expect(check([]), where).toBe(false);
        return;
    }
    if (ia.kind === 'order') {
        // The generator's values, smallest (or largest) first; tapping the display in that
        // order is right, the reverse is wrong, and a half row is no answer yet.
        const want = (truth as { multi: number[] }).multi;
        const o = ex as T.OrdenenExercise;
        const parse = (s: string) => (s.includes('/') ? valueOf(s.replace('−', '-')) : Number(s.replace('−', '-').replace(/\s/g, '').replace(',', '.')));
        expect(ia.answerOf(ex, c).split(INTERACT_SEP).map(s => scaled(parse(s))), where).toEqual(want.map(scaled));
        const order = (seq: string[]) => ia.fromState({ ...EMPTY_INTERACTION, order: seq }, ex, c);
        const right = [...keys].sort((a, b) => (numValue(o.display[Number(a)]) - numValue(o.display[Number(b)])) * (o.operator === '<' ? 1 : -1));
        expect(checkAnswer(d, ex, c, order(right)), where).toBe(true);
        expect(order(right.slice(0, -1)), where).toBe('');
        const back = [...right].reverse();
        if (scaled(want[0]) !== scaled(want[want.length - 1])) expect(checkAnswer(d, ex, c, order(back)), where).toBe(false);
        return;
    }
    expect(ia.kind, where).toBe('tap-multi');
    if (typeof truth === 'object' && 'count' in truth) {
        // breuken kleuren: ANY n of the d parts is right; one more or one fewer is wrong.
        const n = truth.count;
        expect(ia.answerOf(ex, c), where).toBe(String(n));
        expect(keys.length, where).toBeGreaterThanOrEqual(n);
        expect(check(keys.slice(0, n)), where).toBe(true);
        expect(check(keys.slice(-n)), where).toBe(true);
        expect(check(keys.slice(0, n - 1)), where).toBe(false);
        if (keys.length > n) expect(check(keys.slice(0, n + 1)), where).toBe(false);
        return;
    }
    const want =(truth as { set: string[] }).set;
    expect(ia.answerOf(ex, c).split(INTERACT_SEP).filter(Boolean), where).toEqual(want);
    const right = keys.filter(k => want.includes(tap([k])));
    const wrong = keys.filter(k => !right.includes(k));
    expect(right.length, where).toBe(want.length);
    expect(check([...right].reverse()), where).toBe(true);
    if (right.length) expect(check(right.slice(1)), where).toBe(false);
    if (wrong.length) expect(check([...right, wrong[0]]), where).toBe(false);
}

// Phase C2: typing the right digits into the card's cells is juist; one wrong cell is fout.
function checkCells(typeId: string, d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, truth: Truth, where: string) {
    const ia = kioskInteractOf(d, c)!;
    const keys = ia.keys!(ex, c);
    const fill = (cells: Cells, dd: KioskDescriptor = d) => kioskInteractOf(dd, c)!.fromState({ ...EMPTY_INTERACTION, cells }, ex, c);
    const ok = (cells: Cells, dd: KioskDescriptor = d) => checkAnswer(dd, ex, c, fill(cells, dd));
    const keypad = d.keys?.(c) ?? [];
    const typeable = (cells: Cells) => Object.values(cells).forEach(v =>
        expect(sanitizeAnswer(v, keypad), `${where} untypeable ${v} keys ${keypad}`).toBe(v));
    // The Enter path is never empty: the keypad has a first cell to start in.
    expect(keys.some(k => !ia.cellOf?.(k, ex, c)?.scratch), where).toBe(true);
    expect(ia.show?.(ia.answerOf(ex, c), ex, c) ?? 'x', where).not.toBe('');

    if (typeId.startsWith('cijferen-')) {
        const cx = ex as CijferExercise;
        const { answer, scratch, alt } = cijferFill(cx, keys);
        typeable(answer); typeable(scratch);
        // The answer row spells the generator's answer.
        if (cx.operator !== ':') {
            const digits = keys.filter(k => k.startsWith('a')).sort((x, y) => Number(x.slice(1)) - Number(y.slice(1))).map(k => answer[k] || '0').join('');
            // A product has the decimals of both factors (0,3 × 1,2 = 0,36).
            const decimals = (x: number) => (String(x).split('.')[1] ?? '').length;
            const ansDp = (cx.decimalPlaces ?? 0) + (cx.operator === 'x' ? decimals(cx.operands[1]) : 0);
            expect(scaled(Number(digits) / 10 ** ansDp), where).toBe(scaled(truth as number));
        }
        // Strict (the default): every real carry / exchange must be written, so the answer row
        // alone is juist exactly when nothing needed carrying.
        const needsScratch = Object.values(scratch).some(v => v !== '');
        expect(ok(answer), where).toBe(!needsScratch);
        expect(ok({ ...answer, ...scratch }), where).toBe(true);
        if (alt) expect(ok({ ...alt, ...scratch }), `${where} alt ${JSON.stringify(alt)}`).toBe(true);
        // A column with no carry takes a written 0 too (never demand writing where nothing happens).
        const zeros = Object.fromEntries(Object.entries(scratch).filter(([k, v]) => v === '' && k.startsWith('c')).map(([k]) => [k, '0']));
        expect(ok({ ...answer, ...scratch, ...zeros }), where).toBe(true);
        // Lenient (tests only): a blank carry is fine, a wrong one still is not.
        const lenient = cijferKiosk({ strictCarries: false });
        expect(ok(answer, lenient), where).toBe(true);
        expect(ok({ ...answer, ...scratch }, lenient), where).toBe(true);
        // A wrong digit in the answer row, a wrong rest, a wrong carry: fout.
        if (cx.operator === ':') {
            expect(ok({ ...answer, r: String(Number(answer.r.replace(',', '.')) + 1) }), where).toBe(false);
            const lastQ = keys.filter(k => k.startsWith('q')).pop()!;
            expect(ok({ ...answer, [lastQ]: String((Number(answer[lastQ] || 0) + 1) % 10) }), where).toBe(false);
            expect(fill({ ...answer, r: '' }), where).toBe('');
        } else {
            const units = keys.filter(k => k.startsWith('a')).sort((x, y) => Number(y.slice(1)) - Number(x.slice(1)))[0];
            expect(ok({ ...answer, ...scratch, [units]: String((Number(answer[units] || 0) + 1) % 10) }), where).toBe(false);
        }
        const carried = Object.entries(scratch).find(([, v]) => v !== '');
        if (carried) {
            expect(ok({ ...answer, ...scratch, [carried[0]]: String(Number(carried[1]) + 1) }), where).toBe(false);
            expect(ok({ ...answer, ...scratch, [carried[0]]: '' }), where).toBe(false);
            expect(ok({ ...answer, [carried[0]]: String(Number(carried[1]) + 1) }, lenient), where).toBe(false);
        }
        const noCarry = Object.entries(scratch).find(([k, v]) => v === '' && k.startsWith('c'));
        if (noCarry) expect(ok({ ...answer, ...scratch, [noCarry[0]]: '1' }), where).toBe(false);
        return;
    }
    // One cell per blank, in key order: each cell holds the generator's value.
    const right = cellsFromParts(d, ex, c);
    const want = typeof truth === 'number' ? [truth] : (truth as { multi: number[] }).multi;
    expect(want, `${where}: no fill-cells truth for ${typeId}`).toBeDefined();
    expect(keys.length, where).toBe(want.length);
    keys.forEach((k, i) => expect(scaled(valueOf(right[k])), `${where} cell ${k}`).toBe(scaled(want[i])));
    typeable(right);
    expect(ok(right), where).toBe(true);
    const last = keys.length - 1;
    expect(ok({ ...right, [keys[last]]: wrongNumber(want[last]) }), where).toBe(false);
    // Controleer waits for every cell.
    expect(fill({ ...right, [keys[0]]: '' }), where).toBe('');
}

const gcdOf = (a: number, b: number): number => (b ? gcdOf(b, a % b) : a);

// Fewest pieces worth exactly `target` within each piece's max (bounded change-making, written
// from scratch), or null when the tray cannot make it.
function makeUp(target: number, pieces: KioskPiece[]): BuildEntry[] | null {
    const unit = pieces.reduce((g, p) => gcdOf(g, p.value), 0) || 1;
    if (target % unit) return null;
    const n = target / unit;
    // best[v] = fewest pieces for v units; via[v] = the piece laid last, from[v] = the value before it.
    const best = new Array<number>(n + 1).fill(Infinity);
    const via = new Array<number>(n + 1).fill(-1);
    const from = new Array<number>(n + 1).fill(-1);
    best[0] = 0;
    pieces.forEach((p, i) => {
        const step = p.value / unit;
        const relax = (v: number) => {
            if (best[v - step] + 1 < best[v]) { best[v] = best[v - step] + 1; via[v] = i; from[v] = v - step; }
        };
        // Unbounded: one forward pass; bounded: one backward (0/1) pass per copy.
        if (p.max === undefined) for (let v = step; v <= n; v++) relax(v);
        else for (let k = 0; k < p.max; k++) for (let v = n; v >= step; v--) relax(v);
    });
    if (best[n] === Infinity) return null;
    const counts = new Map<string, number>();
    for (let v = n; v > 0; v = from[v]) counts.set(pieces[via[v]].key, (counts.get(pieces[via[v]].key) ?? 0) + 1);
    return [...counts].map(([key, count]) => ({ key, count }));
}

const addPieces = (a: BuildEntry[], b: BuildEntry[]) => {
    const out = a.map(e => ({ ...e }));
    for (const e of b) {
        const at = out.find(x => x.key === e.key);
        if (at) at.count += e.count; else out.push({ ...e });
    }
    return out.filter(e => e.count > 0);
};

// Phase C3: laying the right value from the tray is juist (any make-up), one piece more or less is fout.
function checkBuild(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, truth: BuildTruth, where: string) {
    const ia = kioskInteractOf(d, c)!;
    const pieces = ia.pieces!(ex, c);
    const valueOfKey = (k: string) => pieces.find(p => p.key === k)!.value;
    const lay = (build: BuildEntry[]) => ia.fromState({ ...EMPTY_INTERACTION, build }, ex, c);
    const ok = (build: BuildEntry[]) => checkAnswer(d, ex, c, lay(build));
    expect(pieces.map(p => p.key), where).toEqual(ia.keys!(ex, c));
    expect(ia.answerOf(ex, c), where).toBe(String(truth.build));
    expect(pieces.length, where).toBeGreaterThan(0);
    if (truth.allowed) for (const p of pieces) expect(truth.allowed, `${where} piece ${p.key}`).toContain(p.value);
    const laid = makeUp(truth.build, pieces);
    expect(laid, `${where}: the tray ${pieces.map(p => p.key)} cannot make ${truth.build}`).not.toBeNull();
    if (truth.digits) {
        // Nine at most per place: the only make-up is the number's digits.
        for (const p of pieces) expect(laid!.find(b => b.key === p.key)?.count ?? 0, `${where} ${p.key}`).toBe(truth.digits[p.key]);
    }
    expect(ok(laid!), where).toBe(true);
    expect(ok([...laid!].reverse()), where).toBe(true);
    const smallest = [...pieces].sort((a, b) => a.value - b.value)[0];
    expect(ok(addPieces(laid!, [{ key: smallest.key, count: 1 }])), where).toBe(false);
    const fewer = addPieces(laid!, [{ key: laid![0].key, count: -1 }]);
    if (fewer.length) expect(ok(fewer), where).toBe(false);
    // Another make-up of the same value counts too: the biggest piece changed into smaller ones.
    const big = [...laid!].sort((a, b) => valueOfKey(b.key) - valueOfKey(a.key))[0];
    const split = makeUp(valueOfKey(big.key), pieces.filter(p => p.value < valueOfKey(big.key)).map(p => ({ ...p, max: undefined })));
    if (split && !truth.digits) expect(ok(addPieces(addPieces(laid!, [{ key: big.key, count: -1 }]), split)), `${where} split ${big.key}`).toBe(true);
    expect(lay([]), where).toBe('');
}

// Runs the agreement checks for one leaf (+ extra settings) over every grade × SEEDS seeds;
// returns how often each input kind came up.
function agreeOverSeeds(leaf: AppLeaf, extra: Record<string, unknown> = {}): Map<KioskInput, number> {
    const inputs = new Map<KioskInput, number>();
    const d = kioskFor(leaf.typeId)!;
    for (const grade of [null, ...LEERJAREN] as Array<Leerjaar | null>) {
        const constraints = seedConstraints({ typeId: leaf.typeId, base: gradeBase(grade), override: { ...leaf.defaultConstraints, ...extra }, grade, leafId: leaf.id });
        const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
        const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
        for (let seed = 1; seed <= SEEDS; seed++) {
            const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 7919 + (grade ?? 0)));
            expect(got, `L${grade} seed ${seed}: no exercise`).not.toBeNull();
            const { exercise: ex, constraints: c } = got!;
            const where = `L${grade} seed ${seed}: ${JSON.stringify(ex)}`;
            const accepted = d.answerOf(ex, c);
            const input = kioskInputOf(d, ex, c);
            const truth = generatorAnswer(leaf.typeId, ex, c);
            expect(d.display(ex, c), where).toContain('?');

            const keys = d.keys?.(c) ?? [];
            // The pupil can type every field's first spelling with the keys on offer.
            const typeable = (a: string) => expect(sanitizeAnswer(a, keys, input).replace(',', '.'), `${where} untypeable ${a} keys ${keys}`).toBe(a.replace(',', '.'));

            if (input === 'interactive') {
                checkInteractive(leaf.typeId, d, ex, c, truth, where);
            } else if (input === 'number+rest') {
                const [q, r] = truth as [number, number];
                expect(accepted.map(Number), where).toEqual([q, r]);
                accepted.forEach(typeable);
                expect(checkAnswer(d, ex, c, accepted), where).toBe(true);
                expect(checkAnswer(d, ex, c, [` 0${accepted[0]} `, accepted[1]]), where).toBe(true);
                expect(checkAnswer(d, ex, c, [accepted[0], String(r + 1)]), where).toBe(false);
                expect(checkAnswer(d, ex, c, accepted[0]), where).toBe(false);
            } else if (input === 'choice') {
                const choices = d.choicesOf?.(ex, c) ?? d.choices ?? [];
                expect(accepted, where).toEqual([truth]);
                expect(choices, where).toContain(truth);
                expect(new Set(choices).size, where).toBe(choices.length);
                expect(checkAnswer(d, ex, c, truth as string), where).toBe(true);
                for (const other of choices.filter(x => x !== truth)) expect(checkAnswer(d, ex, c, other), where).toBe(false);
            } else if (input === 'text') {
                const { text } = truth as { text: string[] };
                for (const t of text) {
                    expect(checkAnswer(d, ex, c, t), where).toBe(true);
                    expect(checkAnswer(d, ex, c, ` ${t.toLowerCase()} `), where).toBe(true);
                    expect(checkAnswer(d, ex, c, `${t}x`), where).toBe(false);
                }
                expect(accepted.map(a => a.toLowerCase()), where).toContain(text[0].toLowerCase());
                typeable(accepted[0]);
                expect(checkAnswer(d, ex, c, ''), where).toBe(false);
            } else if (input === 'time') {
                const { time } = truth as { time: Array<[number, number]> };
                const hm = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
                for (const [h, m] of time) {
                    expect(accepted, where).toContain(hm(h, m));
                    expect(checkAnswer(d, ex, c, [String(h), String(m).padStart(2, '0')]), where).toBe(true);
                    expect(checkAnswer(d, ex, c, [String(h), String((m + 1) % 60)]), where).toBe(false);
                }
                for (const a of accepted) expect(time.some(([h, m]) => a === hm(h, m)), `${where} extra ${a}`).toBe(true);
            } else if (input === 'multi-number') {
                const { multi } = truth as { multi: number[] };
                expect(accepted.length, where).toBe(multi.length);
                accepted.forEach((a, i) => {
                    for (const alt of a.split('|')) expect(scaled(valueOf(alt)), where).toBe(scaled(multi[i]));
                    typeable(a.split('|')[0]);
                });
                const firsts = accepted.map(a => a.split('|')[0]);
                expect(checkAnswer(d, ex, c, firsts), where).toBe(true);
                const last = multi.length - 1;
                expect(checkAnswer(d, ex, c, firsts.map((a, i) => (i === last ? wrongNumber(multi[i]) : a))), where).toBe(false);
                expect(checkAnswer(d, ex, c, firsts.slice(0, last)), where).toBe(false);
            } else {
                for (const a of accepted) {
                    expect(scaled(valueOf(a)), where).toBe(scaled(truth as number));
                    expect(checkAnswer(d, ex, c, a), where).toBe(true);
                }
                const first = accepted[0];
                typeable(first);
                if (!first.includes('/')) {
                    // The sheet's own spelling (space thousands, decimal comma) is accepted too.
                    expect(checkAnswer(d, ex, c, formatMathNumber(first.replace(',', '.'))), where).toBe(true);
                    expect(checkAnswer(d, ex, c, wrongNumber(truth as number)), where).toBe(false);
                } else {
                    expect(checkAnswer(d, ex, c, `${first}1`), where).toBe(false);
                }
                expect(checkAnswer(d, ex, c, ''), where).toBe(false);
            }
            inputs.set(input, (inputs.get(input) ?? 0) + 1);
        }
    }
    return inputs;
}

describe('inputs per exercise', () => {
    const d = kioskFor('hr-std-delen')!;
    const eq = (over: Partial<Equation>): Equation => ({ id: 'x', operands: [12, 4], operator: ':', answer: 3, isManuallyEdited: false, ...over });
    test('puntoefening = missing-operand, met rest = number+rest, else number', () => {
        expect(kioskInputOf(d, eq({}), {})).toBe('number');
        expect(kioskInputOf(d, eq({ missingIndex: 1 }), {})).toBe('missing-operand');
        expect(kioskInputOf(d, eq({ missingTerm: 'operand1' }), {})).toBe('missing-operand');
        expect(kioskInputOf(d, eq({ operands: [14, 4], remainder: 2 }), {})).toBe('number+rest');
        expect(d.answerOf(eq({ missingIndex: 1 }), {})).toEqual(['4']);
        expect(d.answerOf(eq({ operands: [14, 4], remainder: 2 }), {})).toEqual(['3', '2']);
        expect(d.display(eq({ missingIndex: 0 }), {})).toBe('? : 4 = 3');
        expect(d.display(eq({ operands: [14, 4], remainder: 2 }), {})).toBe('14 : 4 = ? r ?');
    });
    test('keypad keys come from the settings', () => {
        expect(d.keys!({ numberType: 'decimal' })).toEqual([',']);
        expect(d.keys!({ numberType: 'rational' })).toEqual(['/', ' ']);
        expect(d.keys!({ numberType: 'natural' })).toEqual([]);
    });
    test('display uses the sheet glyphs', () => {
        const add = kioskFor('hr-std-vermenigvuldigen')!;
        expect(add.display(eq({ operands: [1200, 3], operator: 'x', answer: 3600 }), {})).toBe('1 200 × 3 = ?');
        expect(kioskFor('procenten')!.display({ id: 'p', percent: 25, base: 80, answer: 20, isManuallyEdited: false }, { subType: 'welk-percent' })).toBe('20 van 80 = ? %');
        expect(kioskFor('afronden')!.display({ id: 'a', number: 3.47, targetKey: 't', isManuallyEdited: false }, { subType: 'simpel', numberType: 'decimal' })).toBe('3,47 ≈ ? (op tiende)');
    });
});

describe('breuken-bewerken: the form is the exercise', () => {
    const d = kioskFor('breuken-bewerken')!;
    const ex = (over: Partial<T.BreukBewerkExercise>): T.BreukBewerkExercise =>
        ({ id: 'b', subType: 'gemengd', direction: 'naar-gemengd', inputs: [{ n: 14, d: 8 }], answers: [{ whole: 1, n: 6, d: 8 }], isManuallyEdited: false, ...over });
    test('naar-gemengd: a gemengd getal, simplified or not; never the breuk itself', () => {
        expect(checkAnswer(d, ex({}), {}, '1 6/8')).toBe(true);
        expect(checkAnswer(d, ex({}), {}, '1 3/4')).toBe(true);
        expect(checkAnswer(d, ex({}), {}, '14/8')).toBe(false);
        expect(checkAnswer(d, ex({}), {}, '7/4')).toBe(false);
    });
    test('naar-breuk: an improper fraction', () => {
        const e = ex({ direction: 'naar-breuk', inputs: [{ whole: 1, n: 6, d: 8 }], answers: [{ n: 14, d: 8 }] });
        expect(checkAnswer(d, e, {}, '14/8')).toBe(true);
        expect(checkAnswer(d, e, {}, '7/4')).toBe(true);
        expect(checkAnswer(d, e, {}, '1 6/8')).toBe(false);
    });
    test('vereenvoudigen: lowest terms only', () => {
        const e = ex({ subType: 'vereenvoudigen', direction: undefined, inputs: [{ n: 6, d: 8 }], answers: [{ n: 3, d: 4 }] });
        expect(checkAnswer(d, e, {}, '3/4')).toBe(true);
        expect(checkAnswer(d, e, {}, '6/8')).toBe(false);
    });
    test('gelijknamig: both over the common noemer', () => {
        const e = ex({ subType: 'gelijknamig', direction: undefined, inputs: [{ n: 1, d: 2 }, { n: 1, d: 3 }], answers: [{ n: 3, d: 6 }, { n: 2, d: 6 }] });
        expect(checkAnswer(d, e, {}, ['3/6', '2/6'])).toBe(true);
        expect(checkAnswer(d, e, {}, ['1/2', '2/6'])).toBe(false);
    });
});

describe('fractions as the sheet prints them', () => {
    test('ordenen: 6/8 and 3/4 are one value, tapped in either order', () => {
        const d = kioskFor('ordenen')!;
        const ia = d.interact!;
        const ex: T.OrdenenExercise = { id: 'o', operator: '<', display: [{ n: 6, d: 8 }, { n: 1, d: 8 }, { n: 3, d: 4 }], values: [{ n: 1, d: 8 }, { n: 6, d: 8 }, { n: 3, d: 4 }], isManuallyEdited: false };
        const c = { numberType: 'rational' };
        const tapped = (order: string[]) => checkAnswer(d, ex, c, ia.fromState({ ...EMPTY_INTERACTION, order }, ex, c));
        expect(tapped(['1', '0', '2'])).toBe(true);
        expect(tapped(['1', '2', '0'])).toBe(true);
        expect(tapped(['0', '1', '2'])).toBe(false);
        expect(ia.fromState({ ...EMPTY_INTERACTION, order: ['1', '0'] }, ex, c)).toBe('');
    });
});

describe('interactive checks (Phase C)', () => {
    const fake = (kind: 'tap' | 'tap-multi' | 'fill-cells' | 'order', want: string): KioskDescriptor => ({
        input: 'interactive', answerOf: () => [want], display: () => '?',
        interact: { kind, answerOf: () => want, fromState: () => '' },
    });
    const S = INTERACT_SEP;
    test('tap: the exact value', () => {
        expect(checkAnswer(fake('tap', '437'), {}, {}, '437')).toBe(true);
        expect(checkAnswer(fake('tap', '437'), {}, {}, '43')).toBe(false);
        expect(checkAnswer(fake('tap', '437'), {}, {}, '')).toBe(false);
    });
    test('tap-multi: a set, order-free; an empty set when nothing is asked', () => {
        const d = fake('tap-multi', ['4', '12', '30'].join(S));
        expect(checkAnswer(d, {}, {}, ['30', '4', '12'].join(S))).toBe(true);
        expect(checkAnswer(d, {}, {}, ['4', '12'].join(S))).toBe(false);
        expect(checkAnswer(d, {}, {}, ['4', '12', '30', '7'].join(S))).toBe(false);
        expect(checkAnswer(fake('tap-multi', ''), {}, {}, '')).toBe(true);
        expect(checkAnswer(fake('tap-multi', ''), {}, {}, '3')).toBe(false);
    });
    test('order: the sequence counts', () => {
        const d = fake('order', ['1', '2', '3'].join(S));
        expect(checkAnswer(d, {}, {}, ['1', '2', '3'].join(S))).toBe(true);
        expect(checkAnswer(d, {}, {}, ['2', '1', '3'].join(S))).toBe(false);
    });
    test('fill-cells: each cell as a number, alternatives per cell', () => {
        const d = fake('fill-cells', ['12', '2,5|2.5'].join(S));
        expect(checkAnswer(d, {}, {}, ['012', '2.50'].join(S))).toBe(true);
        expect(checkAnswer(d, {}, {}, ['12', '3'].join(S))).toBe(false);
        expect(checkAnswer(d, {}, {}, '12')).toBe(false);
    });
    test('no interact half: never correct', () => {
        expect(checkAnswer({ input: 'interactive', answerOf: () => ['1'], display: () => '?' }, {}, {}, '1')).toBe(false);
    });
});

describe('text, time and multi-number checks', () => {
    const fake = (input: KioskInput, accepted: string[]): KioskDescriptor => ({ input, answerOf: () => accepted, display: () => '?' });
    test('text: case and outer spaces do not count', () => {
        const d = fake('text', ['XIV']);
        expect(checkAnswer(d, {}, {}, ' xiv ')).toBe(true);
        expect(checkAnswer(d, {}, {}, 'XV')).toBe(false);
        expect(checkAnswer(d, {}, {}, '')).toBe(false);
    });
    test('time: uur + minuten against every accepted spelling', () => {
        const d = fake('time', ['8:05', '20:05']);
        expect(checkAnswer(d, {}, {}, ['08', '05'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['20', '5'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['8', '50'])).toBe(false);
        expect(checkAnswer(d, {}, {}, ['8', ''])).toBe(false);
        expect(checkAnswer(d, {}, {}, '8:05')).toBe(false);
    });
    test('multi-number: every field in order, alternatives per field', () => {
        const d = fake('multi-number', ['12', '1 1/2|3/2', '2,5']);
        expect(checkAnswer(d, {}, {}, ['12', '3/2', '2.5'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['12', '1 1/2', '2,50'])).toBe(true);
        expect(checkAnswer(d, {}, {}, ['2,5', '3/2', '12'])).toBe(false);
        expect(checkAnswer(d, {}, {}, ['12', '3/2'])).toBe(false);
    });
    test('sanitize: a text field keeps letters, a time field two digits', () => {
        expect(sanitizeAnswer('MM3x IV!', [], 'text')).toBe('MM3x IV');
        expect(sanitizeAnswer('°C;', [], 'text')).toBe('°C');
        expect(sanitizeAnswer('1234', [], 'time')).toBe('12');
        expect(sanitizeAnswer('1:2', [':'], 'time')).toBe('12');
    });
});

describe('spellings and normalisation', () => {
    test('numbers: comma and dot', () => {
        expect(numberSpellings(2.5)).toEqual(['2,5', '2.5']);
        expect(numberSpellings(0.1 + 0.2)).toEqual(['0,3', '0.3']);
        expect(numberSpellings(1234)).toEqual(['1234']);
    });
    test('fractions: mixed and improper, whole values as integers', () => {
        const f = (whole: number, n: number, d: number): Fraction => ({ whole, n, d });
        expect(fractionSpellings(f(1, 3, 4))).toEqual(['1 3/4', '7/4']);
        expect(fractionSpellings({ n: 3, d: 4 })).toEqual(['3/4']);
        expect(fractionSpellings({ n: 9, d: 4 })).toEqual(['2 1/4', '9/4']);
        expect(fractionSpellings({ n: 8, d: 4 })).toEqual(['2']);
        expect(fractionSpellings({ n: 0, d: 4 })).toEqual(['0']);
        expect(isFraction({ n: 1, d: 2 })).toBe(true);
    });
    test.each([
        ['7', '7'], [' 007 ', '7'], ['1 234', '1234'], ['1 234,50', '1234.5'], ['2,5', '2.5'], ['2.50', '2.5'],
        ['0,0', '0'], ['-0', '0'], ['−12', '-12'], [',5', '0.5'], ['5,', '5'],
    ])('normaliseNumber(%j) = %j', (raw, want) => expect(normaliseNumber(raw)).toBe(want));
    test.each(['', ',', 'abc', '1,2,3', '1.2,3', '--1', '1-'])('normaliseNumber(%j) = null', raw => expect(normaliseNumber(raw)).toBeNull());
    test.each([
        ['3/4', '3/4'], [' 1  3 / 4 ', '1 3/4'], ['03/04', '3/4'], ['0 3/4', '3/4'],
    ])('normaliseFraction(%j) = %j', (raw, want) => expect(normaliseFraction(raw)).toBe(want));
    test.each(['3/0', '3/', '/4', '1 2 3/4'])('normaliseFraction(%j) = null', raw => expect(normaliseFraction(raw)).toBeNull());
});

describe('O25: a decimal divisor sizes the quotient from the shifted dividend', () => {
    // 742,4 : 0,7 is worked as 7424 : 7, so the quotient has as many whole places as 7424.
    test.each([
        [742.4, 0.7, '1060,57', 6],
        [935.6, 0.8, '1169,5', 6],
        [74.24, 0.07, '1060,57', 6],
        [742.4, 7, '106,05', 5],
    ])('%d : %d = %s fits %d quotient cells and checks', (dividend, divisor, quotient, cells) => {
        const { quotient: answer, remainder } = divideToDecimals(dividend, divisor, 2);
        const ex: CijferExercise = { id: 'o25', operands: [dividend, divisor], operator: ':', answer, remainder, isManuallyEdited: false, decimalPlaces: 2 };
        const c = { numberType: 'decimal', decimalPlaces: 2 };
        const q = cijferKioskGrid(ex, 2).cells.filter(cell => cell.role === 'quotient');
        expect(q).toHaveLength(cells);
        const d = cijferKiosk();
        const keys = kioskInteractOf(d, c)!.keys!(ex, c);
        const { answer: right } = cijferFill(ex, keys);
        const given = kioskInteractOf(d, c)!.fromState({ ...EMPTY_INTERACTION, cells: right }, ex, c);
        expect(normaliseNumber(given.split(INTERACT_SEP)[0])).toBe(normaliseNumber(quotient));
        expect(checkAnswer(d, ex, c, given)).toBe(true);
    });
});

describe('O26: a getallenrij / getallenas keypad has a komma when the step has decimals', () => {
    const d = kioskFor('getallenrijen')!;
    // From the settings, never the exercise: the keypad must not change from one rij to the next.
    test.each([
        [{ numberType: 'natural', step: 0.5 }, [',']],
        [{ numberType: 'natural', step: 0.1 }, [',']],
        [{ numberType: 'geheel', step: 0.5 }, ['-', ',']],
        [{ numberType: 'natural', step: 5 }, []],
        [{ numberType: 'geheel', step: 5 }, ['-']],
        [{ numberType: 'decimal', step: 0.1 }, [',']],
        [{ numberType: 'rational', step: 0.5, fractionStep: 4 }, ['/', ' ']],
    ])('%j → keys %j', (c, keys) => {
        expect(d.keys?.(c)).toEqual(keys);
        expect(kioskFor('getallenas')!.keys?.(c)).toEqual(keys);
    });
});

describe('O27: a deelbaarheidstabel row with no divisor says "geen" in Resultaten', () => {
    const d = kioskFor('deelbaarheid')!;
    const c = { layout: 'tabel', divisors: [2, 5, 10] };
    const fill = (ex: T.DeelbaarheidExercise, selected: string[]) => kioskInteractOf(d, c)!.fromState({ ...EMPTY_INTERACTION, selected }, ex, c);
    test('291: none of 2, 5, 10 → Juist antwoord "geen", tapping nothing is juist', () => {
        const ex: T.DeelbaarheidExercise = { id: 'o27', number: 291, isManuallyEdited: false };
        expect(expectedText(d, ex, c)).toBe('geen');
        expect(checkAnswer(d, ex, c, fill(ex, []))).toBe(true);
        expect(answerText(d, ex, c, fill(ex, []))).toBe('geen');
        expect(checkAnswer(d, ex, c, fill(ex, ['0']))).toBe(false);
        expect(answerText(d, ex, c, fill(ex, ['0']))).toBe('2');
    });
    test('40: the divisors as before', () => {
        const ex: T.DeelbaarheidExercise = { id: 'o27b', number: 40, isManuallyEdited: false };
        expect(expectedText(d, ex, c)).toBe(['2', '5', '10'].join(INTERACT_SEP));
    });
});
