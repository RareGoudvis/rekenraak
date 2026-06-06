import type { MathBlock, FooterData } from '../services/math/types';
import type { WorksheetFile } from '../services/persistence';
import type { Leerjaar } from './gradePresets';
import { REGISTRY } from './exerciseRegistry';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderData, type DocSettings } from '../store/useWorksheetStore';

// A curated, ready-made worksheet shown in the "Kant-en-klare bladen" library.
// Authored by the developer (distinct from "Mijn bladen", the teacher's own saves).
// "Gebruik sjabloon" → loadWorksheet(payload) + generateAllBlocks.
export interface WorksheetTemplate {
    id: string;
    title: string;
    domainId: string;            // matches APP_STRUCTURE Domain.id (Domein filter)
    leerjaar: Leerjaar;          // single-select Leerjaar filter
    rekenmethodeIds?: string[];  // REKENMETHODES ids; absent/empty = all methods
    exerciseCount: number;       // "N oefeningen" (display only)
    tags?: string[];
    payload: WorksheetFile;      // full worksheet fed to loadWorksheet()
}

// ── Block-spec → MathBlock (mirrors addBlockFromType's default block, minus the live
// baseSettings snapshot — templates pin their own constraints so they're reproducible). ──
interface BlockSpec { typeId: string; label: string; constraints?: Record<string, unknown>; count?: number; }

function buildBlock(spec: BlockSpec): MathBlock {
    const def = REGISTRY[spec.typeId];
    const defaults = def ? def.defaultConstraints(spec.typeId) : {};
    return {
        id: Math.random().toString(36).substring(2, 9),
        typeId: spec.typeId,
        instructionText: `${spec.label}:`,
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: spec.count ?? (def ? def.defaultCount : 10),
        totalPoints: 5,
        verticalSpacing: 14,
        constraints: { ...defaults, ...(spec.constraints ?? {}) },
        exercises: [],
    };
}

// Neutral chrome for every template (matches the store's initial header/footer/docSettings).
const TEMPLATE_HEADER: HeaderData = { naam: true, klas: true, nummer: false, datum: false, titel: '', fieldOrder: [...DEFAULT_FIELD_ORDER], fieldWidths: { ...DEFAULT_FIELD_WIDTHS }, repeatHeader: false };
const TEMPLATE_FOOTER: FooterData = { school: '', klas: '', leerkracht: '', showSchool: false, showKlas: false, showLeerkracht: false, showPagina: false, centerText: '', showCenterText: false };
const TEMPLATE_DOC: DocSettings = { showScores: false, opdrachtTitelStyle: 'regular', showDividers: false, headerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16, headerContentGap: 12, blockSpacing: 12, numberBlocks: true, bodyFontScale: 1 };

function makeTemplate(id: string, title: string, leerjaar: Leerjaar, domainId: string, specs: BlockSpec[], methode = 'methode-onafhankelijk'): WorksheetTemplate {
    const blocks = specs.map(buildBlock);
    return {
        id, title, leerjaar, domainId,
        rekenmethodeIds: [methode],
        exerciseCount: blocks.reduce((s, b) => s + (b.numberOfExercises || 0), 0),
        payload: { version: 2, exportedAt: '', mode: 'template', blocks, header: TEMPLATE_HEADER, footer: TEMPLATE_FOOTER, docSettings: TEMPLATE_DOC },
    };
}

const GK = 'getallenkennis';
const BW = 'bewerkingen';
const MT = 'meten-metend-rekenen';

// ── Constraint helpers (verified against the generators) ──
// 'bruggetje' = carry/borrow across a place boundary. mathEngine reads bridges[place] ∈ FREE|REQUIRED|FORBIDDEN.
const NOBRIDGE = { E: 'FORBIDDEN', T: 'FORBIDDEN' };
const BRIDGE = { E: 'REQUIRED' };
// Pin maal-/deeltafels: mathEngine uses multiplicationMode 'tafels' + selectedTables (maxGetal is IGNORED here).
const tafels = (...t: number[]) => ({ numberType: 'natural', multiplicationMode: 'tafels', selectedTables: t, tableLimit: 10 });
// Division with remainder ('delen met rest') uses multiplicationMode 'met_rest'.
const restDelen = (...t: number[]) => ({ numberType: 'natural', multiplicationMode: 'met_rest', selectedTables: t, tableLimit: 10 });
// Free ×/÷ ('andere' mode, not tafels): pin getalopbouw via operand masks. E=units, T=tens, H=hundreds.
// E.g. E×T = factor1 a single unit, factor2 a pure tental. mathEngine reads operand1Mask/operand2Mask.
const E = { E: true }, T = { T: true }, TE = { T: true, E: true };
const vrijOp = (op1: object, op2: object) => ({ numberType: 'natural', multiplicationMode: 'andere', maxGetal: 1000, operand1Mask: op1, operand2Mask: op2 });
// Division uses the 'andere' niveau presets (N1–N5) for bigger structured deeltallen, not place masks.
// N1 quotiënt T · N2 quotiënt H+E · N3 quotiënt H+T+E · N4 quotiënt T+E · N5 deeltal met 1 decimaal.
// Division niveaus (N1–N6) via the 'andere' mode; pass one or more — multiple are mixed per exercise.
const deelLevels = (...levels: number[]) => ({ numberType: 'natural', multiplicationMode: 'andere', maxGetal: 1000, divisionLevels: levels });

// ── View/subtype expanders — a family with multiple render-forms → one block per form. ──
// Rationale: variants are easy to delete but hard to discover, so presets ship them all.
const breukenViews = (count: number): BlockSpec[] =>
    (['kleuren', 'herkennen', 'hoeveelheid', 'lijnstuk', 'veelhoek'] as const).map(s =>
        ({ typeId: 'breuken', label: `Breuken (${s})`, constraints: { subType: s }, count }));
const breukBewerkViews = (count: number): BlockSpec[] => [
    { typeId: 'breuken-bewerken', label: 'Gemengd getal ↔ breuk', constraints: { subType: 'gemengd', direction: 'naar-gemengd' }, count },
    { typeId: 'breuken-bewerken', label: 'Gelijknamig maken', constraints: { subType: 'gelijknamig' }, count },
    { typeId: 'breuken-bewerken', label: 'Vereenvoudigen', constraints: { subType: 'vereenvoudigen' }, count },
];
const plaatswaardeViews = (maxGetal: number, count: number): BlockSpec[] =>
    (['waarde', 'plaats', 'tabel'] as const).map(s => ({ typeId: 'plaatswaarde', label: `Plaatswaarde (${s})`, constraints: { subType: s, maxGetal }, count }));
const vergelijkenViews = (maxGetal: number, count: number): BlockSpec[] => [
    { typeId: 'vergelijken', label: 'Vergelijken (< > =)', constraints: { subType: 'getallen', maxGetal }, count },
    { typeId: 'vergelijken', label: 'Grootste / kleinste', constraints: { subType: 'kiezen', maxGetal }, count },
];
const afrondenViews = (maxGetal: number, roundTargets: string[], count: number): BlockSpec[] => [
    { typeId: 'afronden', label: 'Afronden (rooster)', constraints: { subType: 'rooster', maxGetal, roundTargets }, count },
    { typeId: 'afronden', label: 'Afronden (≈ schatten)', constraints: { subType: 'simpel', maxGetal, roundTargets }, count },
];
const evenOnevenViews = (maxGetal: number, count: number): BlockSpec[] => [
    { typeId: 'even-oneven', label: 'Even/oneven (rooster)', constraints: { subType: 'rooster', maxGetal }, count },
    { typeId: 'even-oneven', label: 'Even/oneven (cirkels)', constraints: { subType: 'cirkels', maxGetal }, count },
];
const deelbaarheidKleurViews = (maxGetal: number, divisors: number[], count: number): BlockSpec[] =>
    (['strip', 'markeren', 'raster'] as const).map(v => ({ typeId: 'deelbaarheid-kleuren', label: `Veelvouden (${v})`, constraints: { viewMode: v, maxGetal, divisors }, count }));
const geldViews = (count: number): BlockSpec[] => [
    { typeId: 'geld-herkennen', label: 'Geld herkennen', count },
    { typeId: 'geld-tekenen', label: 'Bedrag tekenen', count },
    { typeId: 'geld-wissel', label: 'Geld wisselen', count },
    { typeId: 'geld-teruggeven', label: 'Teruggeven', count },
];
const klokViews = (count: number): BlockSpec[] => [
    { typeId: 'klok-kloklezen', label: 'Klok lezen', constraints: { clockType: 'analoog', exerciseMode: 'lezen' }, count },
    { typeId: 'klok-kloklezen', label: 'Klok tekenen', constraints: { clockType: 'analoog', exerciseMode: 'tekenen' }, count },
    { typeId: 'klok-kloklezen', label: 'Tijd omzetten', constraints: { clockType: 'analoog', exerciseMode: 'omzetten' }, count },
];
const mabViews = (maxNumber: number, count: number): BlockSpec[] => [
    { typeId: 'mab-herkennen', label: 'MAB herkennen', constraints: { maxNumber }, count },
    { typeId: 'mab-tekenen', label: 'MAB tekenen', constraints: { maxNumber }, count },
];

// ── 20 method-independent (methode-onafhankelijk) starter sheets. Counts sized to fill ≥1 A4 page. ──
const METHODE_ONAFHANKELIJK: WorksheetTemplate[] = [
    makeTemplate('t-splitsen-10', 'Splitsen tot 10', 1, GK, [
        { typeId: 'splitsen', label: 'Splits', constraints: { layout: 'verliefde-harten', maxGetal: 10 }, count: 12 },
    ]),
    makeTemplate('t-opt-aft-20-zonder', 'Optellen en aftrekken tot 20 (zonder brug)', 1, BW, [
        { typeId: 'hr-std-optellen', label: 'Tel op', constraints: { numberType: 'natural', maxGetal: 20, bridges: NOBRIDGE }, count: 16 },
        { typeId: 'hr-std-aftrekken', label: 'Trek af', constraints: { numberType: 'natural', maxGetal: 20, bridges: NOBRIDGE }, count: 16 },
    ]),
    makeTemplate('t-opt-aft-20-met', 'Optellen en aftrekken tot 20 (met brug)', 2, BW, [
        { typeId: 'hr-std-optellen', label: 'Tel op', constraints: { numberType: 'natural', maxGetal: 20, bridges: BRIDGE }, count: 16 },
        { typeId: 'hr-std-aftrekken', label: 'Trek af', constraints: { numberType: 'natural', maxGetal: 20, bridges: BRIDGE }, count: 16 },
    ]),
    makeTemplate('t-getalbegrip-100', 'Getalbegrip tot 100', 2, GK, [
        ...mabViews(100, 9),
        ...plaatswaardeViews(100, 8),
    ]),
    makeTemplate('t-opt-aft-100', 'Optellen en aftrekken tot 100', 2, BW, [
        { typeId: 'hr-std-optellen', label: 'Tel op', constraints: { numberType: 'natural', maxGetal: 100 }, count: 16 },
        { typeId: 'hr-std-aftrekken', label: 'Trek af', constraints: { numberType: 'natural', maxGetal: 100 }, count: 16 },
    ]),
    makeTemplate('t-maaltafels', 'Maaltafels 1–10', 2, BW, [
        { typeId: 'hr-std-vermenigvuldigen', label: 'Maaltafels', constraints: tafels(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), count: 28 },
    ]),
    makeTemplate('t-delen-tafels', 'Delen binnen de tafels', 3, BW, [
        { typeId: 'hr-std-delen', label: 'Deel', constraints: tafels(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), count: 28 },
    ]),
    makeTemplate('t-ordenen-1000', 'Getallen tot 1000 ordenen en vergelijken', 3, GK, [
        ...vergelijkenViews(1000, 12),
        { typeId: 'ordenen', label: 'Rangschik', constraints: { maxGetal: 1000 }, count: 6 },
    ]),
    makeTemplate('t-afronden', 'Afronden op tiental en honderdtal', 3, GK, [
        ...afrondenViews(1000, ['T', 'H'], 8),
    ]),
    makeTemplate('t-cijferen-opt-aft', 'Cijferend optellen en aftrekken', 3, BW, [
        { typeId: 'cijferen-optellen-nat', label: 'Cijferend optellen', constraints: { operator: '+', maxRange: 1000 }, count: 8 },
        { typeId: 'cijferen-aftrekken-nat', label: 'Cijferend aftrekken', constraints: { operator: '-', maxRange: 1000 }, count: 8 },
    ]),
    makeTemplate('t-cijferen-verm', 'Cijferend vermenigvuldigen', 4, BW, [
        { typeId: 'cijferen-vermenigvuldigen-nat', label: 'Cijferend vermenigvuldigen', constraints: { operator: 'x', maxRange: 10000 }, count: 10 },
    ]),
    makeTemplate('t-cijferen-delen', 'Cijferend delen (staartdeling)', 4, BW, [
        { typeId: 'cijferen-delen-nat', label: 'Staartdeling', constraints: { operator: ':', maxRange: 10000, withRemainder: true }, count: 8 },
    ]),
    makeTemplate('t-breuken-geheel', 'Breuken: deel van een geheel', 3, GK, [
        ...breukenViews(8),
    ]),
    makeTemplate('t-breuken-vereenvoudigen', 'Breuken vereenvoudigen en gelijkwaardig', 4, GK, [
        ...breukBewerkViews(10),
    ]),
    makeTemplate('t-kommagetallen', 'Kommagetallen optellen en aftrekken', 4, BW, [
        { typeId: 'hr-std-optellen', label: 'Tel op', constraints: { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2 }, count: 14 },
        { typeId: 'hr-std-aftrekken', label: 'Trek af', constraints: { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2 }, count: 14 },
    ]),
    makeTemplate('t-klok', 'Kloklezen (uur, half, kwart)', 2, MT, [
        ...klokViews(10),
    ]),
    makeTemplate('t-geld', 'Geld: betalen en teruggeven', 2, MT, [
        ...geldViews(6),
    ]),
    makeTemplate('t-lengte', 'Lengte omzetten (km, m, cm, mm)', 4, MT, [
        { typeId: 'herleidingen', label: 'Zet om', constraints: { measure: 'lengte', units: ['km', 'm', 'cm', 'mm'] }, count: 12 },
    ]),
    makeTemplate('t-even-veelvouden', 'Even en oneven, veelvouden', 2, GK, [
        ...evenOnevenViews(100, 3),
        ...deelbaarheidKleurViews(100, [2, 5, 10], 3),
    ]),
    makeTemplate('t-getallenas-patronen', 'Getallenas en getalpatronen', 3, GK, [
        { typeId: 'getallenas', label: 'Vul de getallenas in', constraints: { maxGetal: 100 }, count: 6 },
        { typeId: 'getalpatronen', label: 'Zet het patroon voort', constraints: { maxGetal: 100 }, count: 8 },
    ]),
];

// ── Reken Maar! 3 (leerjaar 3): one preset per blok, mapped to the Werkboek lessons. ──
// Tables-lessons → tafels(); × tot 1000 → vrijOp() getalopbouw masks (E×T, E×TE); ÷ tot 1000 → deelLevels() niveau N1–N6.
const RM = (id: string, title: string, specs: BlockSpec[]) => makeTemplate(id, title, 3, GK, specs, 'reken-maar');

const REKEN_MAAR_3: WorksheetTemplate[] = [
    // Blok 1 (Werkboek A): tafels van 1/5/10 + 2/4/8, getallen tot 100, afronden op tiental,
    // optellen/aftrekken tot 100 (zonder + met brug), even/oneven (instaples).
    RM('rm3-b1', 'Blok 1 — Tafels en rekenen tot 100', [
        { typeId: 'hr-std-vermenigvuldigen', label: 'Maaltafels van 1, 2, 4, 5, 8 en 10', constraints: tafels(1, 2, 4, 5, 8, 10), count: 12 },
        { typeId: 'hr-std-delen', label: 'Deeltafels van 1, 2, 4, 5, 8 en 10', constraints: tafels(1, 2, 4, 5, 8, 10), count: 12 },
        ...vergelijkenViews(100, 8),
        ...afrondenViews(100, ['T'], 6),
        { typeId: 'hr-std-optellen', label: 'Optellen tot 100', constraints: { numberType: 'natural', maxGetal: 100 }, count: 12 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 100', constraints: { numberType: 'natural', maxGetal: 100 }, count: 12 },
        ...evenOnevenViews(100, 2),
    ]),
    // Blok 2 (Werkboek A): tafels van 3/6/9 + 7, optellen/aftrekken tot 100, delen met rest,
    // getallen tot 1000 (op de getallenas / ordenen), kloklezen tot op het kwartier, geldwaarden.
    RM('rm3-b2', 'Blok 2 — Tafels, tot 1000, delen met rest', [
        { typeId: 'hr-std-vermenigvuldigen', label: 'Maaltafels van 3, 6, 7 en 9', constraints: tafels(3, 6, 7, 9), count: 12 },
        { typeId: 'hr-std-delen', label: 'Deeltafels van 3, 6, 7 en 9', constraints: tafels(3, 6, 7, 9), count: 12 },
        { typeId: 'hr-std-delen', label: 'Delen met rest', constraints: restDelen(2, 3, 4, 5, 6, 7, 8, 9, 10), count: 8 },
        { typeId: 'hr-std-optellen', label: 'Optellen tot 100', constraints: { numberType: 'natural', maxGetal: 100 }, count: 10 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 100', constraints: { numberType: 'natural', maxGetal: 100 }, count: 10 },
        { typeId: 'ordenen', label: 'Getallen tot 1000 rangschikken', constraints: { maxGetal: 1000 }, count: 4 },
        { typeId: 'getallenas', label: 'Getallen tot 1000 op de getallenas', constraints: { maxGetal: 1000, step: 100 }, count: 4 },
        ...klokViews(6),
        ...geldViews(6),
    ]),
    // Blok 3 (Werkboek B): getallen tot 1000, × tot 1000 (E×T, E×H), ÷ tot 1000 (H:E, HT:E),
    // +/− tot 1000 zonder brug, lengte (m/dm/cm), klok.
    RM('rm3-b3', 'Blok 3 — Tot 1000: rekenen, lengte en klok', [
        { typeId: 'ordenen', label: 'Getallen tot 1000 rangschikken', constraints: { maxGetal: 1000 }, count: 4 },
        { typeId: 'getallenas', label: 'Getallen tot 1000 op de getallenas', constraints: { maxGetal: 1000, step: 100 }, count: 4 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000 (E × T en E × H)', constraints: vrijOp(E, T), count: 8 },
        { typeId: 'hr-std-delen', label: 'Delen tot 1000 (H:E en H+T+E)', constraints: deelLevels(3, 4), count: 8 },
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000 zonder brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: NOBRIDGE }, count: 10 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000 zonder brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: NOBRIDGE }, count: 10 },
        { typeId: 'herleidingen', label: 'Lengte: m, dm en cm', constraints: { measure: 'lengte', units: ['m', 'dm', 'cm'] }, count: 8 },
        ...klokViews(6),
    ]),
    // Blok 4 (Werkboek B): (stam)breuken, +/− tot 1000 met brug, getalpatronen, × tot 1000 (E×TE), ÷ (TE:E).
    RM('rm3-b4', 'Blok 4 — Stambreuken, tot 1000 met brug, patronen', [
        ...breukenViews(6),
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000 met brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: BRIDGE }, count: 10 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000 met brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: BRIDGE }, count: 10 },
        { typeId: 'getalpatronen', label: 'Getalpatronen', constraints: { maxGetal: 1000 }, count: 6 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000 (E × TE)', constraints: vrijOp(E, TE), count: 8 },
        { typeId: 'hr-std-delen', label: 'Delen tot 100 (TE : E, bv. 84 : 7)', constraints: deelLevels(2), count: 8 },
    ]),
    // Blok 5 (Werkboek C): schatten/afronden, ×/÷ herhaling tot 1000, +/− tot 1000 met brug, inhoud (l/dl/cl), klok.
    RM('rm3-b5', 'Blok 5 — Afronden, met brug, inhoud en klok', [
        ...afrondenViews(1000, ['T', 'H'], 6),
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000', constraints: vrijOp(E, TE), count: 8 },
        { typeId: 'hr-std-delen', label: 'Delen (N1 + N2)', constraints: deelLevels(1, 2), count: 8 },
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000 met brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: BRIDGE }, count: 10 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000 met brug', constraints: { numberType: 'natural', maxGetal: 1000, bridges: BRIDGE }, count: 10 },
        { typeId: 'herleidingen', label: 'Inhoud: l, dl en cl', constraints: { measure: 'inhoud', units: ['l', 'dl', 'cl'] }, count: 8 },
        ...klokViews(6),
    ]),
    // Blok 6 (Werkboek C): negatieve getallen, flexibel +/−, cijferen optellen (inwisselen), temperatuur.
    RM('rm3-b6', 'Blok 6 — Cijferen optellen, negatieve getallen, temperatuur', [
        { typeId: 'cijferen-optellen-nat', label: 'Cijferen: optellen', constraints: { operator: '+', maxRange: 1000 }, count: 8 },
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 8 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 8 },
        { typeId: 'getallenas', label: 'Negatieve getallen', constraints: { numberType: 'geheel', maxGetal: 100 }, count: 4 },
        { typeId: 'temperatuur', label: 'Temperatuur', count: 4 },
    ]),
    // Blok 7 (Werkboek D): cijferen aftrekken, stambreuk nemen van getal/grootheid, +/− tot 1000.
    RM('rm3-b7', 'Blok 7 — Cijferen aftrekken, breuken, tot 1000', [
        { typeId: 'cijferen-aftrekken-nat', label: 'Cijferen: aftrekken', constraints: { operator: '-', maxRange: 1000 }, count: 8 },
        ...breukenViews(6),
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 8 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 8 },
    ]),
    // Blok 8 (Werkboek D): cijferen +/−, breuken vergelijken/ordenen, ×/÷, klok (1 min), gewicht, lengte (km).
    RM('rm3-b8', 'Blok 8 — Cijferen +/−, breuken ordenen, meten', [
        { typeId: 'cijferen-optellen-nat', label: 'Cijferen: optellen', constraints: { operator: '+', maxRange: 1000 }, count: 5 },
        { typeId: 'cijferen-aftrekken-nat', label: 'Cijferen: aftrekken', constraints: { operator: '-', maxRange: 1000 }, count: 5 },
        { typeId: 'breuken-rangschikken', label: 'Breuken vergelijken en ordenen', count: 4 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000', constraints: vrijOp(E, TE), count: 8 },
        { typeId: 'hr-std-delen', label: 'Delen tot 1000 (H:E en H+T+E)', constraints: deelLevels(3, 4), count: 8 },
        ...klokViews(6),
        { typeId: 'herleidingen', label: 'Gewicht: kg en g', constraints: { measure: 'massa', units: ['kg', 'g'] }, count: 6 },
    ]),
    // Blok 9 (Werkboek E): cijferen vermenigvuldigen, flexibel ×/÷, klok-tijdsduur, omtrek.
    RM('rm3-b9', 'Blok 9 — Cijferen vermenigvuldigen, ×/÷, omtrek', [
        { typeId: 'cijferen-vermenigvuldigen-nat', label: 'Cijferen: vermenigvuldigen', constraints: { operator: 'x', maxRange: 1000 }, count: 8 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Flexibel vermenigvuldigen tot 1000', constraints: vrijOp(E, TE), count: 8 },
        { typeId: 'hr-std-delen', label: 'Flexibel delen tot 1000', constraints: deelLevels(3, 4, 5), count: 8 },
        ...klokViews(6),
        { typeId: 'omtrek', label: 'Omtrek', count: 4 },
    ]),
    // Blok 10 (Werkboek E): alle bewerkingen herhaling, delers/veelvouden, cijferen delen (met rest).
    RM('rm3-b10', 'Blok 10 — Alle bewerkingen, delers, cijferen delen', [
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 5 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 5 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000', constraints: vrijOp(E, TE), count: 5 },
        { typeId: 'hr-std-delen', label: 'Delen (delers 2, 4, 5, 8, 10) — quotiënt tot 100×', constraints: { numberType: 'natural', multiplicationMode: 'tafels', selectedTables: [2, 4, 5, 8, 10], tableLimit: 100 }, count: 5 },
        ...deelbaarheidKleurViews(100, [2, 5, 10], 3),
        { typeId: 'deelbaarheid', label: 'Delers en veelvouden', constraints: { maxGetal: 1000, divisors: [2, 5, 10] }, count: 6 },
        { typeId: 'cijferen-delen-nat', label: 'Cijferen: delen (met rest)', constraints: { operator: ':', maxRange: 1000, withRemainder: true }, count: 6 },
    ]),
    // Blok 11 (Werkboek F): cijferen (alle bewerkingen), klok, geldwaarden, functies van getallen.
    RM('rm3-b11', 'Blok 11 — Cijferen (alle), klok, geld', [
        { typeId: 'cijferen-optellen-nat', label: 'Cijferen: optellen', constraints: { operator: '+', maxRange: 1000 }, count: 4 },
        { typeId: 'cijferen-aftrekken-nat', label: 'Cijferen: aftrekken', constraints: { operator: '-', maxRange: 1000 }, count: 4 },
        { typeId: 'cijferen-vermenigvuldigen-nat', label: 'Cijferen: vermenigvuldigen', constraints: { operator: 'x', maxRange: 1000 }, count: 4 },
        { typeId: 'cijferen-delen-nat', label: 'Cijferen: delen (met rest)', constraints: { operator: ':', maxRange: 1000, withRemainder: true }, count: 4 },
        ...klokViews(6),
        ...geldViews(6),
    ]),
    // Blok 12 (Werkboek F): herhaling — getallen, breuken, alle bewerkingen, cijferen, klok, meten.
    RM('rm3-b12', 'Blok 12 — Herhaling alle leerstof', [
        { typeId: 'ordenen', label: 'Getallen tot 1000 rangschikken', constraints: { maxGetal: 1000 }, count: 4 },
        ...breukenViews(6),
        { typeId: 'hr-std-optellen', label: 'Optellen tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 4 },
        { typeId: 'hr-std-aftrekken', label: 'Aftrekken tot 1000', constraints: { numberType: 'natural', maxGetal: 1000 }, count: 4 },
        { typeId: 'hr-std-vermenigvuldigen', label: 'Vermenigvuldigen tot 1000', constraints: vrijOp(E, TE), count: 4 },
        { typeId: 'hr-std-delen', label: 'Delen tot 1000', constraints: deelLevels(2, 3, 4), count: 4 },
        { typeId: 'cijferen-optellen-nat', label: 'Cijferen', constraints: { operator: '+', maxRange: 1000 }, count: 4 },
        ...klokViews(6),
        { typeId: 'herleidingen', label: 'Lengte, inhoud en gewicht', constraints: { measure: 'lengte', units: ['m', 'dm', 'cm'] }, count: 6 },
    ]),
];

export const WORKSHEET_TEMPLATES: WorksheetTemplate[] = [...METHODE_ONAFHANKELIJK, ...REKEN_MAAR_3];
