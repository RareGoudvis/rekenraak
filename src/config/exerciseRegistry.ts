import type { MathBlock } from '../services/math/types';
import type {
    BlockConstraints, AddSubConstraints, MulDivConstraints, CijferConstraints, ClockConstraints,
    FractionConstraints, BreukBewerkConstraints, BreukenRangschikkenConstraints, SplitsenConstraints,
    GeldConstraints, GeldWisselConstraints, GeldTeruggevenConstraints, GeldRekenenConstraints,
    MixedConstraints, MabConstraints, OrdenenConstraints, PlaatswaardeConstraints, EvenOnevenConstraints,
    VergelijkenConstraints, AfrondenConstraints, RomeinseConstraints, GetalFunctieConstraints,
    DeelbaarheidConstraints, DeelbaarheidKleurConstraints, GetallenasConstraints, GetallenrijConstraints,
    PatroonConstraints, KettingConstraints, RekenvolgordeConstraints, SchattendConstraints,
    ControlerenConstraints, VerbandenConstraints, ProcentenConstraints, MetenConstraints,
    OppervlakteConstraints, HerleidingenConstraints, MaateenheidConstraints, TemperatuurConstraints,
    WeegschaalConstraints, TijdsduurConstraints, KalenderConstraints, VormleerConstraints,
    LayoutConstraints,
} from '../services/math/constraintTypes';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises, generateDivisionExercisesNoted } from '../services/math/mathEngine';
import { generateWithRelaxation, relaxationNote } from '../services/math/relax';
import { generateMixedExercises, generateMixedExercisesNoted } from '../services/math/mixedGenerator';
import { generateClockExercises } from '../services/clock/clockGenerator';
import { generateFractionExercises, generateFractionExercisesNoted } from '../services/fractions/fractionGenerator';
import { generateBreukBewerkExercises, generateBreukBewerkExercisesNoted } from '../services/fractions/breukBewerkGenerator';
import { generateBreukenRangschikkenExercises, generateBreukenRangschikkenExercisesNoted } from '../services/ordenen/breukenRangschikkenGenerator';
import { generateSplitsenExercises } from '../services/splitsen/splitsenGenerator';
import { generateCijferExercises, generateCijferExercisesNoted } from '../services/cijferen/cijferGenerator';
import { generateGeldExercises, generateGeldExercisesNoted, generateGeldWisselExercises, generateGeldTeruggevenExercises, generateGeldTeruggevenExercisesNoted } from '../services/geld/geldGenerator';
import { generateMabExercises } from '../services/mab/mabGenerator';
import { generateOrdenenExercises, generateOrdenenExercisesNoted } from '../services/ordenen/ordenenGenerator';
import { generateDeelbaarheidExercises } from '../services/deelbaarheid/deelbaarheidGenerator';
import { generateGetallenasExercises, generateGetallenasExercisesNoted } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercises, generateGetallenrijExercisesNoted } from '../services/getallenrij/getallenrijGenerator';
import { generateLengteMetenExercises, generateOmtrekExercises, generateOmtrekExercisesNoted, generateOppervlakteExercises, generateOppervlakteExercisesNoted } from '../services/meten/metenGenerator';
import { generatePatroonExercises, generatePatroonExercisesNoted } from '../services/patroon/patroonGenerator';
import { generateDeelbaarheidKleurExercises } from '../services/deelbaarheid/deelbaarheidKleurGenerator';
import { DEELBAARHEID_KLEUR_KIOSK } from '../services/oefenen/kioskDescriptors';
import { generateTemperatuurExercises } from '../services/temperatuur/temperatuurGenerator';
import { generatePlaatswaardeExercises } from '../services/plaatswaarde/plaatswaardeGenerator';
import { generateEvenOnevenExercises } from '../services/evenoneven/evenOnevenGenerator';
import { generateVergelijkenExercises } from '../services/vergelijken/vergelijkenGenerator';
import { generateAfrondenExercises, targetsFor, usableTargets } from '../services/afronden/afrondenGenerator';
import { generateRomeinseExercises } from '../services/romeinse/romeinseGenerator';
import { generateHerleidingExercises, generateHerleidingExercisesNoted } from '../services/herleidingen/herleidingenGenerator';
import { generateSchattendExercises, generateSchattendNoted } from '../services/schattend/schattendGenerator';
import { generateVerbandExercises, generateVerbandExercisesNoted } from '../services/verbanden/verbandenGenerator';
import { generateProcentExercises, generateProcentNoted } from '../services/procenten/procentenGenerator';
import { generateMaateenheidExercises, generateMaateenheidExercisesNoted } from '../services/maateenheid/maateenheidGenerator';
import { generateGeldRekenenExercises } from '../services/geld/geldRekenenGenerator';
import { generateRekenvolgordeExercises, generateRekenvolgordeNoted } from '../services/rekenvolgorde/rekenvolgordeGenerator';
import { generateKettingExercises, generateKettingExercisesNoted } from '../services/patroon/kettingGenerator';
import { generateGetalFunctieExercises } from '../services/getalfunctie/getalfunctieGenerator';
import { generateTijdsduurExercises } from '../services/tijdsduur/tijdsduurGenerator';
import { generateKalenderExercises, generateKalenderExercisesNoted } from '../services/kalender/kalenderGenerator';
import { generateControleExercises } from '../services/controleren/controlerenGenerator';
import { generateWeegschaalExercises } from '../services/weegschaal/weegschaalGenerator';
import { generateVormleerExercises } from '../services/vormleer/vormleerGenerator';
import { RANGES, floorToPreset, AXIS_FALLBACK_STEPS, type MaxPresetsFn, type MaxRange } from './numberRanges';
import type { KioskDescriptor } from '../services/oefenen/types';
import { HR_KIOSK, PROCENTEN_KIOSK, AFRONDEN_KIOSK, VERGELIJKEN_KIOSK, CIJFER_KIOSK, PLAATSWAARDE_KIOSK, EVEN_ONEVEN_KIOSK, ROMEINSE_KIOSK, GETALFUNCTIE_KIOSK, MAB_KIOSK, SCHATTEND_KIOSK, REKENVOLGORDE_KIOSK, CONTROLEREN_KIOSK, VORMLEER_KIOSK, TEMPERATUUR_KIOSK, WEEGSCHAAL_KIOSK, LENGTE_KIOSK, OMTREK_KIOSK, OPPERVLAKTE_KIOSK, MAATEENHEID_KIOSK, HERLEIDINGEN_KIOSK, GELD_KIOSK, GELD_TERUGGEVEN_KIOSK, GELD_REKENEN_KIOSK, PATROON_KIOSK, GETALLENAS_KIOSK, VEELVOUDEN_KIOSK, ORDENEN_KIOSK, SPLITSEN_KIOSK, BREUK_BEWERK_KIOSK, VERBANDEN_KIOSK, BREUKEN_KIOSK, KLOK_KIOSK, TIJDSDUUR_KIOSK } from '../services/oefenen/kioskDescriptors';

// ── Single source of truth for exercise types ───────────────────────────────
// Every typeId maps to one row here. Adding a type = add a generator + a row
// (plus a UI row in exerciseUI.tsx). This file is PURE DATA (no React) so the
// store and generateDispatch can import it without a store↔component cycle.
//
// SYNC: the React side (Viewer + Config) lives in exerciseUI.tsx keyed by the
// same typeIds. Keep the two key sets identical.

type ExerciseField = Extract<keyof MathBlock,
    | 'exercises' | 'clockExercises' | 'fractionExercises' | 'splitsenExercises'
    | 'cijferExercises' | 'geldExercises' | 'geldWisselExercises'
    | 'geldTeruggevenExercises' | 'mabExercises'
    | 'ordenenExercises' | 'breukBewerkExercises' | 'deelbaarheidExercises' | 'getallenasExercises' | 'temperatuurExercises'
    | 'plaatswaardeExercises' | 'evenOnevenExercises' | 'vergelijkenExercises' | 'afrondenExercises'
    | 'romeinseExercises' | 'herleidingExercises' | 'meetExercises'
    | 'patroonExercises' | 'deelbaarheidKleurExercises'
    | 'schattendExercises' | 'verbandExercises' | 'procentExercises'
    | 'maateenheidExercises' | 'geldRekenenExercises'
    | 'rekenvolgordeExercises' | 'getalFunctieExercises'
    | 'tijdsduurExercises' | 'kalenderExercises' | 'controleExercises'
    | 'weegschaalExercises' | 'vormleerExercises'>;

export interface ExerciseTypeDef<C extends BlockConstraints = BlockConstraints> {
    // The array field on MathBlock that holds this type's exercises.
    exerciseField: ExerciseField;
    generate: (block: MathBlock) => unknown[];
    // Richer entry point for families that can report back on the generate (hoofdrekenen
    // relaxes over-restrictive settings). Dispatch prefers it and shows `note` in the
    // Inspector; `generate` stays the plain array form every other caller uses.
    generateNoted?: (block: MathBlock) => { items: unknown[]; note: string | null };
    // Factory (not a literal) so each new block gets fresh mutable mask objects.
    // Receives typeId because a few defaults differ by leaf (e.g. geld scaffolding).
    defaultConstraints: (typeId: string) => C;
    defaultCount: number;
    // Content key for sheet-level "Geen dubbele oefeningen" dedup (regenerateBlock,
    // generateDispatch.ts). Only needed when an exercise carries random display-only
    // fields that would make two identical sums look different under the default
    // JSON.stringify(id-stripped) key; omit otherwise.
    exerciseKey?: (ex: unknown) => string;
    // The max-number list this block's config shows for its current settings (numberType,
    // layout, mode…), top = the type's didactic ceiling. baseApply floors the grade seed
    // into it. Omitted / null = no max picker for these settings.
    maxPresets?: MaxPresetsFn;
    // Sheet furniture (a rule, writing lines, a grid): no opdracht title or number, and no
    // exercises to split.
    isFurniture?: true;
    // Oefenmodus: how a pupil answers one exercise on screen (accepted spellings, input kind,
    // plain-text rendering). Absent = the type cannot be practised in the kiosk.
    kiosk?: KioskDescriptor;
}

// Names each row's constraint family, so a default factory that drops or misspells a key
// fails here rather than silently reaching a generator. The cast erases C again: rows are
// stored heterogeneously, and every consumer looks a type up by its string typeId.
const row = <C extends BlockConstraints>(def: ExerciseTypeDef<C>): ExerciseTypeDef => def as ExerciseTypeDef;

// Hoofdrekenen settings can contradict each other (a digit mask + a forbidden brug + 4
// termen + a preset), which used to yield an empty block. The wrapper keeps the stored
// settings untouched, retries on a relaxed clone and reports what it had to drop.
const relaxing = (gen: (b: MathBlock) => unknown[]) => ({
    generate: (b: MathBlock) => generateWithRelaxation(b, gen).items,
    generateNoted: (b: MathBlock) => {
        const result = generateWithRelaxation(b, gen);
        return { items: result.items, note: relaxationNote(result) };
    },
});

// A digit mask under a low max can leave fewer distinct numbers than the block asks for
// (mask T at max 20 → only 10 and 20): say so instead of handing back a silently short block.
export function maskShortfallNote(got: number, want: number): string | null {
    if (got >= want) return null;
    if (got === 0) return 'Met deze getalopbouw en dit maximum past geen enkele oefening.';
    return `Met deze getalopbouw en dit maximum ${got === 1 ? 'past' : 'passen'} maar ${got} van de ${want} oefeningen.`;
}
const notingShortfall = (gen: (b: MathBlock) => unknown[]) => ({
    generate: gen,
    generateNoted: (b: MathBlock) => {
        const items = gen(b);
        return { items, note: maskShortfallNote(items.length, b.numberOfExercises) };
    },
});

// ── default-constraint factories (mirror the old addBlockFromType ternary) ───

const addSubDefaults = (): AddSubConstraints => ({
    numberType: 'natural', decimalPlaces: 2, maxGetal: 1000,
    bridges: { E: 'FREE', T: 'FREE' },
    operand1Mask: {}, operand2Mask: {},
    fractionDifficulty: 'same',
    mixedNumber1: false, mixedNumber2: false,
    maxNumerator1: 10, maxDenominator1: 10, maxNumerator2: 10, maxDenominator2: 10,
    linkFractions: true,
});

// Split from the +/- factory: tafels/selectedTables/tableLimit are read only by the
// multiplication and division generators, and a + block that carries them is drift.
// Gemengd starts as the four plain operators in random order; every other setting is
// the shared +/- bag, so the per-variant tabs start empty.
const mixedDefaults = (): MixedConstraints => ({
    ...addSubDefaults(),
    variants: ['+', '-', 'x', ':'],
    mix: 'random',
});

const mulDivDefaults = (): MulDivConstraints => ({
    ...addSubDefaults(),
    multiplicationMode: 'tafels',
    selectedTables: [2, 3, 4, 5, 10],
    tableLimit: 10,
});

const cijferDefaults = (): CijferConstraints => ({
    operator: '+', numberType: 'natural', maxRange: 1000, decimalPlaces: 2,
    withEstimation: false, scaffolding: 3, withRemainder: false, numberOfTerms: 2,
    gridCellSize: 25, operand0Mask: {}, operand1Mask: {}, operand2Mask: {}, operand3Mask: {},
    bridges: {}, extraCols: 0, extraRows: 0,
});

const clockDefaults = (): ClockConstraints => ({
    clockType: 'analoog', exerciseMode: 'lezen', is24hour: false,
    timeTypes: ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'],
    minuteDirection: 'beide', handChoice: 'beide',
});

const fractionDefaults = (): FractionConstraints => ({
    subType: 'kleuren', shape: 'rectangle', shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8,
    answerFormat: 'fraction-questions', objectShape: 'circle', maxTotal: 20,
    minLineLength: 4, maxLineLength: 12, level: 1, answerMode: 'berekeningslijnen',
    maxAbstractN3: 1000,
    // teacher refinements: shape mix + static size, concreet grouping, schematisch box, veelhoek grid
    staticSize: false, staticW: 4, staticH: 3, staticSide: 4, staticDiam: 4,
    groupingMode: 'standaard', drawBoxH: 3, showGrid: true,
});

const splitsenDefaults = (): SplitsenConstraints => ({
    maxGetal: 10, operand1Mask: {}, operand2Mask: {}, fixedTotal: null,
    layout: 'basic', rowsPerBox: 4, rowHeight: 28,
});

const geldDefaults = (typeId: string): GeldConstraints => ({
    maxGetal: 10,
    format: 'euros',
    scaffolding: typeId === 'geld-tekenen' ? 'eenvoudig' : 'invullen',
    geldLayout: 'samen',
    showVoorbeelden: false,
    voorbeeldTypes: [],
    exercisesPerRow: null,
    allowedDenominations: [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5],
    boxHeight: 80,
});

const geldWisselDefaults = (): GeldWisselConstraints => ({
    exerciseBills: [500, 1000], exercisesPerRow: 2, boxHeight: 100,
});

const geldTeruggevenDefaults = (): GeldTeruggevenConstraints => ({
    minPriceEuros: 1, maxPriceEuros: 49, payWithOptions: [1000, 2000, 5000],
    centenDeel: 'vijf', scaffolding: 'ingevuld', antwoordType: 'schrijven',
    antwoordFormat: 'euro-cent', betalenMetTekening: false, boxHeight: 120,
});

const mabDefaults = (): MabConstraints => ({
    mabStyle: 'symbolic', maxNumber: 100, operand1Mask: {},
    scaffolding: 'positietabel', exercisesPerRow: 3, boxHeight: 70, answerHeight: 36,
});

const ordenenDefaults = (): OrdenenConstraints => ({
    numberType: 'natural', count: 3, operatorMode: 'oplopend', maxGetal: 100,
    // declared so the global base (decimalen / stambreuken / gemengd) can target them; 2 is what
    // the old base (decimals 2) always wrote, so a base without decimals changes nothing here
    decimalPlaces: 2, unitFractionsOnly: false, allowMixed: false,
    answerStyle: 'lijn',
});

const breukBewerkDefaults = (): BreukBewerkConstraints => ({
    subType: 'gemengd', direction: 'naar-gemengd', minDenominator: 2, maxDenominator: 10,
    maxNumerator: 10, tablesOnly: true, allowIrreducible: false, targetDen: '',
});

const breukenRangschikkenDefaults = (): BreukenRangschikkenConstraints => ({
    fractionMode: 'stambreuken', count: 4, operatorMode: 'oplopend',
    minDenominator: 2, maxDenominator: 10, answerStyle: 'lijn',
});

const patroonDefaults = (): PatroonConstraints => ({
    numberType: 'natural', maxGetal: 100, ticks: 6, steps: 1,
    ops: ['+'], opSettings: { '+': { max: 10, mask: {} } }, maxDecimals: 1,
    showArrows: false, showOperators: false, operatorsShown: 0, operatorStyle: 'symbol',
});

const deelbaarheidKleurDefaults = (): DeelbaarheidKleurConstraints => ({
    viewMode: 'strip', divisors: [2, 5, 10], maxGetal: 100, perRow: 10,
    rasterCount: 100, rasterCols: 10, showRest: false,
});

const deelbaarheidDefaults = (): DeelbaarheidConstraints => ({
    layout: 'tabel', divisors: [2, 5, 10], maxGetal: 1000, base: 9, terms: 6, givenCount: 2,
});

const getallenasDefaults = (): GetallenasConstraints => ({
    numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6,
});

const getallenrijDefaults = (): GetallenrijConstraints => ({
    numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, numberMask: {},
    fractionStep: 4, maxTeller: 25, showFrame: true,
});

const metenDefaults = (): MetenConstraints => ({
    measureModel: 'meten', precision: 'cm', minLength: 3, maxLength: 10,
    maxCorners: 0, perSideScaffold: false, answerMode: 'single', answerUnit: 'cm',
    shapes: ['driehoek', 'rechthoek', 'vierkant'],
});

const temperatuurDefaults = (): TemperatuurConstraints => ({
    variant: 'kleuren', includeNegatives: false, perRow: 4,
});

const plaatswaardeDefaults = (): PlaatswaardeConstraints => ({
    subType: 'waarde', maxGetal: 1000, numberMask: {}, decimalPlaces: 0,
});

const evenOnevenDefaults = (): EvenOnevenConstraints => ({
    subType: 'rooster', maxGetal: 100, target: 'even', perRow: 10,
});

const vergelijkenDefaults = (): VergelijkenConstraints => ({
    subType: 'getallen', maxGetal: 1000, numberMask: {}, chooseTarget: 'grootste', setSize: 3, decimalPlaces: 0,
    // representaties: which representation each side shows + per-side getalopbouw
    leftRep: 'breuk', rightRep: 'kommagetal', leftMask: {}, rightMask: {},
    leftFracN: 4, leftFracD: 8, rightFracN: 4, rightFracD: 8,
});

const afrondenDefaults = (): AfrondenConstraints => ({
    subType: 'rooster', numberType: 'natural', maxGetal: 1000, numberMask: {},
    roundTargets: ['T', 'H'], roosterSize: 6, decimalPlaces: 2,
});

const romeinseDefaults = (): RomeinseConstraints => ({
    subType: 'herkennen', niveau: 2,
});

// measure + units come from the appstructure leaf's defaultConstraints (lengte/inhoud/massa).
const herleidingenDefaults = (): HerleidingenConstraints => ({
    measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'], maxEnkel: 100, maxSamengesteld: 1000,
    formats: ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'],
    compoundMode: '2', areMode: 'samengesteld', writeUnits: false, scaffolding: 'geen', herleidingLayout: 'uitlijnen',
    tablePrompt: false, tableAnswer: 'blank', tableCellW: 60, tableCellH: 30,
});

const schattendDefaults = (): SchattendConstraints => ({
    operators: ['+', '-'], numberType: 'natural', maxGetal: 1000, decimalPlaces: 2,
    roundTargets: ['H'], scaffolding: 'tussenstappen', answerLine: 'kort',
});

const verbandenDefaults = (): VerbandenConstraints => ({
    subType: 'tabel', reps: ['breuk', 'decimaal', 'procent'],
    denominators: [2, 4, 5, 10, 100], given: 'random',
});

const procentenDefaults = (): ProcentenConstraints => ({
    subType: 'nemen', percents: [10, 25, 50], maxGetal: 1000, scaffold: false,
});

const maateenheidDefaults = (): MaateenheidConstraints => ({
    grootheden: ['lengte', 'massa', 'inhoud'], answerMode: 'omcirkelen', subType: 'eenheid',
});

// subType + percent pool come from the appstructure leaf (korting/winst/intrest).
const geldRekenenDefaults = (): GeldRekenenConstraints => ({
    subType: 'korting', percents: [10, 25, 50], maxEuro: 100, wholeEuros: true, halfYear: false,
});

// Sheet furniture (section rule, writing lines, squared grid, memory box, blank page).
// No generator: everything they draw comes from constraints. They still get a registry row
// so the packer, the width grid and printing treat them like any other block.
const layoutDefaults = (typeId: string): LayoutConstraints => {
    const kind = typeId.replace('layout-', '');
    if (kind === 'schrijflijnen') return { kind, lineCount: 6, lineSpacing: 10, lineStyle: 'enkel' };
    if (kind === 'raster') return { kind, cellMm: 10, rows: 8 };
    if (kind === 'kader') return { kind, title: 'Onthoud', body: '', emphasis: 'kader' };
    if (kind === 'lege-pagina') return { kind };
    return { kind: 'sectie', title: '', rule: 'lijn' };
};
const noGenerate = () => [];

const rekenvolgordeDefaults = (): RekenvolgordeConstraints => ({
    operators: ['+', '-', 'x'], haakjesMode: 'MAG', opsCount: 2, maxGetal: 100, tableLimit: 10,
});

// Renders via PatroonViewer: all operators shown with operand, blank at the end.
const kettingDefaults = (): KettingConstraints => ({
    numberType: 'natural', maxGetal: 100, chainLength: 4, ops: ['+', '-'],
    opSettings: { '+': { max: 10 }, '-': { max: 10 } }, blankMiddle: false,
    showArrows: true, showOperators: true, operatorsShown: 99, operatorStyle: 'full',
});

const getalfunctieDefaults = (): GetalFunctieConstraints => ({
    functies: ['hoeveelheid', 'rang', 'maat', 'code'], answerMode: 'aankruisen', maxGetal: 1000,
});

const tijdsduurDefaults = (): TijdsduurConstraints => ({
    granularity: ['kwartier'], blanks: ['duur'], maxDuurMin: 240, overMidnight: false,
});

const kalenderDefaults = (): KalenderConstraints => ({
    subType: 'maandrooster', questionTypes: ['dag-van-datum', 'datum-van-dag', 'tellen'],
    questionCount: 5, month: 'random', year: 2026,
});

const controlerenDefaults = (): ControlerenConstraints => ({
    subType: 'negenproef', operators: ['+', '-'], maxGetal: 1000, foutAandeel: 'helft', showKruis: true,
});

const oppervlakteDefaults = (): OppervlakteConstraints => ({
    subType: 'berekenen', shapes: ['rechthoek', 'vierkant'], minLength: 2, maxLength: 8,
    askOmtrek: false, scaffoldFormule: true,
});

const weegschaalDefaults = (): WeegschaalConstraints => ({
    mode: 'aflezen', bereikGram: 1000, stepGram: 50, notatie: 'g', exercisesPerRow: 2, boxHeight: 170,
});

// kind + concepts come from the appstructure leaf (punt-lijn / hoek / figuur classify).
const vormleerDefaults = (typeId: string): VormleerConstraints => ({
    kind: typeId === 'vormleer-hoeken' ? 'hoek' : typeId === 'vormleer-figuren' ? 'figuur' : 'punt-lijn',
    mode: 'herkennen', answerMode: 'woordbank', classify: 'vierhoeken',
    concepts: typeId === 'vormleer-hoeken' ? ['scherp', 'recht', 'stomp']
        : typeId === 'vormleer-figuren' ? ['vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium']
        : ['punt', 'rechte', 'halfrechte', 'lijnstuk'],
    randomRotation: typeId === 'vormleer-hoeken', showBoog: true,
    // Figure marks split per notation kind; haakje = bare L-corner, vierkantje = closed square.
    showEqualSides: true, showRightAngles: true, showParallel: false, rightAngleStyle: 'vierkantje',
    raster: true, boxHeight: 4, exercisesPerRow: 3,
    // punt-lijn stand-pills off by default (free direction, as before); hoeken tekenen
    // names its angle unless the teacher turns it off.
    allowHorizontaal: false, allowVerticaal: false, nameAngles: true,
});

// ── max-number lists per type: the one source; each config plugin renders
// useMaxPresets(block), i.e. exactly what these return for the block's settings ──

const maxGetal = (presets: readonly number[]): MaxRange => ({ key: 'maxGetal', presets });
const numberTypeOf = (c: Record<string, unknown>) => (c.numberType as string | undefined) ?? 'natural';
// Same fixed list whatever the settings.
const fixedMax = (list: readonly number[]): MaxPresetsFn => () => maxGetal(list);

// AdditionConfig/SubtractionConfig: decimal → DecimalSettings, rational → no max picker,
// anything else (incl. gehele) falls back to NaturalSettings.
const addSubMax: MaxPresetsFn = (c) => {
    const nt = numberTypeOf(c);
    if (nt === 'rational') return null;
    return maxGetal(nt === 'decimal' ? RANGES.decimal : RANGES.hrNatural);
};

// MultiplicationConfig/DivisionConfig: the tienvoud preset (HrPresetRow, any non-rational
// type) wins; natural shows a max only in 'andere' mode (tafels has none).
const mulDivMax: MaxPresetsFn = (c) => {
    const nt = numberTypeOf(c);
    if (nt === 'rational') return null;
    if (c.preset === 'tienvoud') return maxGetal(RANGES.hrTienvoud);
    if (nt === 'decimal') return maxGetal(RANGES.decimal);
    if (nt === 'natural' && (c.multiplicationMode ?? 'tafels') === 'andere') return maxGetal(RANGES.hrAndere);
    return null;
};

// DivisionConfig adds met rest (natural only): its deeltal max follows the leerjaar.
const divMax: MaxPresetsFn = (c) =>
    c.preset !== 'tienvoud' && numberTypeOf(c) === 'natural' && c.multiplicationMode === 'met_rest'
        ? maxGetal(RANGES.hrMetRest)
        : mulDivMax(c);

// GemengdConfig: one shared picker, decimal list or the natural one for every other type.
const mixedMax: MaxPresetsFn = (c) =>
    maxGetal(numberTypeOf(c) === 'decimal' ? RANGES.decimal : RANGES.hrNatural);

const cijferMax: MaxPresetsFn = (c) => ({
    key: 'maxRange',
    presets: numberTypeOf(c) === 'decimal' ? RANGES.cijferDecimal : RANGES.cijferNatural,
});

// SplitsenConfig: harten / splitsboom have their own short lists; positie-tabel grows on
// its own list, the other positie-* layouts on theirs; rooster keeps the basic list.
const splitsenMax: MaxPresetsFn = (c) => {
    const layout = typeof c.layout === 'string' ? c.layout : 'basic';
    if (layout === 'verliefde-harten') return maxGetal(RANGES.splitsenHarten);
    if (layout === 'splitsboom') return maxGetal(RANGES.splitsenBoom);
    if (layout === 'positie-tabel') return maxGetal(RANGES.splitsenTabel);
    if (layout.startsWith('positie')) return maxGetal(RANGES.splitsenPositie);
    return maxGetal(RANGES.splitsenBasis);
};

const mabMax: MaxPresetsFn = () => ({ key: 'maxNumber', presets: RANGES.mab });

// Rationals are driven by step + ticks there, so those configs hide the max picker.
const nonRationalMax = (list: readonly number[]): MaxPresetsFn => (c) =>
    numberTypeOf(c) === 'rational' ? null : maxGetal(list);

// DeelbaarheidKleurConfig: the rechthoek raster (incl. the legacy viewMode 'raster') has
// its own list; strook and omcirkelen share the other.
const deelbaarheidKleurMax: MaxPresetsFn = (c) => {
    const raw = c.viewMode ?? 'strip';
    const viewMode = raw === 'raster' ? 'strip' : raw;
    const vorm = c.rasterVorm ?? (raw === 'raster' ? 'rechthoek' : 'lijn');
    const isRaster = viewMode === 'strip' && vorm === 'rechthoek';
    return maxGetal(isRaster ? RANGES.deelbaarheidKleurRaster : RANGES.deelbaarheidKleurStrook);
};

// Veelvouden is steered by base + terms sliders; only the tabel layout has a max.
const deelbaarheidMax: MaxPresetsFn = (c) =>
    (c.layout ?? 'tabel') === 'tabel' ? maxGetal(RANGES.deelbaarheid) : null;

const evenOnevenMax: MaxPresetsFn = (c) =>
    (c.subType ?? 'rooster') === 'rooster' ? maxGetal(RANGES.evenOneven) : null;

const vergelijkenMax: MaxPresetsFn = (c) =>
    maxGetal(c.subType === 'representaties' ? RANGES.vergelijkenRepresentaties : RANGES.vergelijken);

const afrondenMax: MaxPresetsFn = (c) =>
    maxGetal(numberTypeOf(c) === 'decimal' ? RANGES.decimal : RANGES.afrondenNatural);

const schattendMax: MaxPresetsFn = (c) =>
    maxGetal(numberTypeOf(c) === 'decimal' ? RANGES.decimal : RANGES.schattendNatural);

// All cijferen leaves share the same generator/field/defaults (operator + numberType
// come from the appstructure leaf's defaultConstraints, merged on top at add time).
const cijferRow = (): ExerciseTypeDef => row<CijferConstraints>({
    exerciseField: 'cijferExercises', generate: generateCijferExercises, generateNoted: generateCijferExercisesNoted,
    defaultConstraints: cijferDefaults, defaultCount: 4, maxPresets: cijferMax, kiosk: CIJFER_KIOSK,
});

export const REGISTRY: Record<string, ExerciseTypeDef> = {
    // Mental math (hoofdrekenen standaardprocedure) — one typeId per operation.
    'hr-std-optellen':         row<AddSubConstraints>({ exerciseField: 'exercises', ...relaxing(generateAdditionExercises),       defaultConstraints: addSubDefaults, defaultCount: 10, maxPresets: addSubMax, kiosk: HR_KIOSK }),
    'hr-std-aftrekken':        row<AddSubConstraints>({ exerciseField: 'exercises', ...relaxing(generateSubtractionExercises),    defaultConstraints: addSubDefaults, defaultCount: 10, maxPresets: addSubMax, kiosk: HR_KIOSK }),
    'hr-std-vermenigvuldigen': row<MulDivConstraints>({ exerciseField: 'exercises', ...relaxing(generateMultiplicationExercises), defaultConstraints: mulDivDefaults, defaultCount: 10, maxPresets: mulDivMax, kiosk: HR_KIOSK }),
    'hr-std-delen':            row<MulDivConstraints>({ exerciseField: 'exercises', ...relaxing(generateDivisionExercises), generateNoted: generateDivisionExercisesNoted, defaultConstraints: mulDivDefaults, defaultCount: 10, maxPresets: divMax, kiosk: HR_KIOSK }),
    // Mixed already relaxes per variant inside its own generator, so it brings its own note.
    'hr-std-gemengd':          row<MixedConstraints>({ exerciseField: 'exercises', generate: generateMixedExercises, generateNoted: generateMixedExercisesNoted, defaultConstraints: mixedDefaults, defaultCount: 10, maxPresets: mixedMax, kiosk: HR_KIOSK }),

    // Cijferen (column arithmetic) — natural + decimal per operation.
    'cijferen-optellen-nat':         cijferRow(),
    'cijferen-optellen-dec':         cijferRow(),
    'cijferen-aftrekken-nat':        cijferRow(),
    'cijferen-aftrekken-dec':        cijferRow(),
    'cijferen-vermenigvuldigen-nat': cijferRow(),
    'cijferen-vermenigvuldigen-dec': cijferRow(),
    'cijferen-delen-nat':            cijferRow(),
    'cijferen-delen-dec':            cijferRow(),

    'klok-kloklezen': row<ClockConstraints>({ exerciseField: 'clockExercises',    generate: generateClockExercises,    defaultConstraints: clockDefaults,    defaultCount: 10 , kiosk: KLOK_KIOSK }),
    'breuken':        row<FractionConstraints>({ exerciseField: 'fractionExercises', generate: generateFractionExercises, generateNoted: generateFractionExercisesNoted, defaultConstraints: fractionDefaults, defaultCount: 6 , kiosk: BREUKEN_KIOSK }),
    'splitsen':       row<SplitsenConstraints>({ exerciseField: 'splitsenExercises', generate: generateSplitsenExercises, defaultConstraints: splitsenDefaults, defaultCount: 5, maxPresets: splitsenMax , kiosk: SPLITSEN_KIOSK }),

    'geld-herkennen':  row<GeldConstraints>({ exerciseField: 'geldExercises',           generate: generateGeldExercises, generateNoted: generateGeldExercisesNoted,           defaultConstraints: geldDefaults,           defaultCount: 6, maxPresets: fixedMax(RANGES.geld) , kiosk: GELD_KIOSK }),
    'geld-tekenen':    row<GeldConstraints>({ exerciseField: 'geldExercises',           generate: generateGeldExercises, generateNoted: generateGeldExercisesNoted,           defaultConstraints: geldDefaults,           defaultCount: 6, maxPresets: fixedMax(RANGES.geld) }),
    'geld-wissel':     row<GeldWisselConstraints>({ exerciseField: 'geldWisselExercises',     generate: generateGeldWisselExercises,     defaultConstraints: geldWisselDefaults,     defaultCount: 4 }),
    'geld-teruggeven': row<GeldTeruggevenConstraints>({ exerciseField: 'geldTeruggevenExercises', generate: generateGeldTeruggevenExercises, generateNoted: generateGeldTeruggevenExercisesNoted, defaultConstraints: geldTeruggevenDefaults, defaultCount: 4 , kiosk: GELD_TERUGGEVEN_KIOSK }),

    'mab-herkennen': row<MabConstraints>({ exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6, maxPresets: mabMax , kiosk: MAB_KIOSK }),
    'mab-tekenen':   row<MabConstraints>({ exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6, maxPresets: mabMax }),

    'ordenen':      row<OrdenenConstraints>({ exerciseField: 'ordenenExercises',      generate: generateOrdenenExercises, generateNoted: generateOrdenenExercisesNoted, defaultConstraints: ordenenDefaults,      defaultCount: 6, maxPresets: nonRationalMax(RANGES.ordenen) , kiosk: ORDENEN_KIOSK }),
    'breuken-bewerken':      row<BreukBewerkConstraints>({ exerciseField: 'breukBewerkExercises', generate: generateBreukBewerkExercises, generateNoted: generateBreukBewerkExercisesNoted,        defaultConstraints: breukBewerkDefaults,        defaultCount: 8 , kiosk: BREUK_BEWERK_KIOSK }),
    'breuken-rangschikken':  row<BreukenRangschikkenConstraints>({ exerciseField: 'ordenenExercises',     generate: generateBreukenRangschikkenExercises, generateNoted: generateBreukenRangschikkenExercisesNoted, defaultConstraints: breukenRangschikkenDefaults, defaultCount: 6 , kiosk: ORDENEN_KIOSK }),
    'deelbaarheid': row<DeelbaarheidConstraints>({ exerciseField: 'deelbaarheidExercises', generate: generateDeelbaarheidExercises, defaultConstraints: deelbaarheidDefaults, defaultCount: 6, maxPresets: deelbaarheidMax , kiosk: VEELVOUDEN_KIOSK }),
    'getalpatronen': row<PatroonConstraints>({ exerciseField: 'patroonExercises', generate: generatePatroonExercises, generateNoted: generatePatroonExercisesNoted, defaultConstraints: patroonDefaults, defaultCount: 6, maxPresets: fixedMax(RANGES.patronen) , kiosk: PATROON_KIOSK }),
    'deelbaarheid-kleuren': row<DeelbaarheidKleurConstraints>({ exerciseField: 'deelbaarheidKleurExercises', generate: generateDeelbaarheidKleurExercises, defaultConstraints: deelbaarheidKleurDefaults, defaultCount: 3, maxPresets: deelbaarheidKleurMax, kiosk: DEELBAARHEID_KLEUR_KIOSK }),
    'getallenas':   row<GetallenasConstraints>({ exerciseField: 'getallenasExercises',   generate: generateGetallenasExercises,   generateNoted: generateGetallenasExercisesNoted, defaultConstraints: getallenasDefaults,   defaultCount: 5, maxPresets: nonRationalMax(RANGES.getallenas) , kiosk: GETALLENAS_KIOSK }),
    'getallenrijen':row<GetallenrijConstraints>({ exerciseField: 'getallenasExercises',   generate: generateGetallenrijExercises,  generateNoted: generateGetallenrijExercisesNoted, defaultConstraints: getallenrijDefaults,  defaultCount: 5, maxPresets: nonRationalMax(RANGES.getallenrijen) , kiosk: GETALLENAS_KIOSK }),
    'lengte-meten': row<MetenConstraints>({ exerciseField: 'meetExercises',         generate: generateLengteMetenExercises,  defaultConstraints: metenDefaults,        defaultCount: 6 , kiosk: LENGTE_KIOSK }),
    'omtrek':       row<MetenConstraints>({ exerciseField: 'meetExercises',         generate: generateOmtrekExercises, generateNoted: generateOmtrekExercisesNoted,       defaultConstraints: metenDefaults,        defaultCount: 6 , kiosk: OMTREK_KIOSK }),
    'temperatuur':  row<TemperatuurConstraints>({ exerciseField: 'temperatuurExercises',  generate: generateTemperatuurExercises,  defaultConstraints: temperatuurDefaults,  defaultCount: 4 , kiosk: TEMPERATUUR_KIOSK }),
    'plaatswaarde': row<PlaatswaardeConstraints>({ exerciseField: 'plaatswaardeExercises', ...notingShortfall(generatePlaatswaardeExercises), defaultConstraints: plaatswaardeDefaults, defaultCount: 6, maxPresets: fixedMax(RANGES.plaatswaarde) , kiosk: PLAATSWAARDE_KIOSK }),
    'even-oneven':  row<EvenOnevenConstraints>({ exerciseField: 'evenOnevenExercises',   generate: generateEvenOnevenExercises,   defaultConstraints: evenOnevenDefaults,   defaultCount: 3, maxPresets: evenOnevenMax , kiosk: EVEN_ONEVEN_KIOSK }),
    'vergelijken':  row<VergelijkenConstraints>({ exerciseField: 'vergelijkenExercises',  ...notingShortfall(generateVergelijkenExercises),  defaultConstraints: vergelijkenDefaults,  defaultCount: 6, maxPresets: vergelijkenMax, kiosk: VERGELIJKEN_KIOSK }),
    'afronden':     row<AfrondenConstraints>({ exerciseField: 'afrondenExercises',     ...notingShortfall(generateAfrondenExercises),     defaultConstraints: afrondenDefaults,     defaultCount: 6, maxPresets: afrondenMax, kiosk: AFRONDEN_KIOSK }),
    'romeinse-cijfers': row<RomeinseConstraints>({ exerciseField: 'romeinseExercises', generate: generateRomeinseExercises, defaultConstraints: romeinseDefaults, defaultCount: 8 , kiosk: ROMEINSE_KIOSK }),
    'herleidingen': row<HerleidingenConstraints>({ exerciseField: 'herleidingExercises', generate: generateHerleidingExercises, generateNoted: generateHerleidingExercisesNoted, defaultConstraints: herleidingenDefaults, defaultCount: 8 , kiosk: HERLEIDINGEN_KIOSK }),

    // Schattend rekenen (compenseren + tienvoud are hr-std presets, not types).
    'schattend': row<SchattendConstraints>({ exerciseField: 'schattendExercises', generate: generateSchattendExercises, generateNoted: generateSchattendNoted, defaultConstraints: schattendDefaults, defaultCount: 8, maxPresets: schattendMax , kiosk: SCHATTEND_KIOSK }),

    // Procenten + verbanden breuk·decimaal·procent.
    'verbanden': row<VerbandenConstraints>({ exerciseField: 'verbandExercises', generate: generateVerbandExercises, generateNoted: generateVerbandExercisesNoted, defaultConstraints: verbandenDefaults, defaultCount: 8 , kiosk: VERBANDEN_KIOSK }),
    'procenten': row<ProcentenConstraints>({ exerciseField: 'procentExercises', generate: generateProcentExercises, generateNoted: generateProcentNoted, defaultConstraints: procentenDefaults, defaultCount: 8, maxPresets: fixedMax(RANGES.procenten), kiosk: PROCENTEN_KIOSK }),

    'maateenheid':  row<MaateenheidConstraints>({ exerciseField: 'maateenheidExercises', generate: generateMaateenheidExercises, generateNoted: generateMaateenheidExercisesNoted, defaultConstraints: maateenheidDefaults, defaultCount: 8 , kiosk: MAATEENHEID_KIOSK }),
    'geld-rekenen': row<GeldRekenenConstraints>({ exerciseField: 'geldRekenenExercises', generate: generateGeldRekenenExercises, defaultConstraints: geldRekenenDefaults, defaultCount: 5 , kiosk: GELD_REKENEN_KIOSK }),

    'rekenvolgorde':  row<RekenvolgordeConstraints>({ exerciseField: 'rekenvolgordeExercises', generate: generateRekenvolgordeExercises, generateNoted: generateRekenvolgordeNoted, defaultConstraints: rekenvolgordeDefaults, defaultCount: 10, maxPresets: fixedMax(RANGES.rekenvolgorde) , kiosk: REKENVOLGORDE_KIOSK }),

    // ── Blad-onderdelen (no generated content; constraints only) ────────────
    'layout-sectie':       row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0, isFurniture: true }),
    'layout-schrijflijnen':row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0, isFurniture: true }),
    'layout-raster':       row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0, isFurniture: true }),
    'layout-kader':        row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0, isFurniture: true }),
    'layout-lege-pagina':  row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0, isFurniture: true }),
    'kettingsommen':  row<KettingConstraints>({ exerciseField: 'patroonExercises',       generate: generateKettingExercises,       generateNoted: generateKettingExercisesNoted, defaultConstraints: kettingDefaults,       defaultCount: 6, maxPresets: fixedMax(RANGES.ketting) , kiosk: PATROON_KIOSK }),
    'getalfunctie':   row<GetalFunctieConstraints>({ exerciseField: 'getalFunctieExercises',  generate: generateGetalFunctieExercises,  defaultConstraints: getalfunctieDefaults,  defaultCount: 6 , kiosk: GETALFUNCTIE_KIOSK }),
    'tijdsduur':      row<TijdsduurConstraints>({ exerciseField: 'tijdsduurExercises',     generate: generateTijdsduurExercises,     defaultConstraints: tijdsduurDefaults,     defaultCount: 6 , kiosk: TIJDSDUUR_KIOSK }),
    'kalender':       row<KalenderConstraints>({ exerciseField: 'kalenderExercises',      generate: generateKalenderExercises, generateNoted: generateKalenderExercisesNoted,      defaultConstraints: kalenderDefaults,      defaultCount: 1 }),
    'controleren':    row<ControlerenConstraints>({ exerciseField: 'controleExercises',      generate: generateControleExercises,      defaultConstraints: controlerenDefaults,   defaultCount: 4, maxPresets: fixedMax(RANGES.controleren) , kiosk: CONTROLEREN_KIOSK }),

    // Meetkunde + SVG-heavy meten types.
    'oppervlakte': row<OppervlakteConstraints>({ exerciseField: 'meetExercises',       generate: generateOppervlakteExercises, generateNoted: generateOppervlakteExercisesNoted, defaultConstraints: oppervlakteDefaults, defaultCount: 4 , kiosk: OPPERVLAKTE_KIOSK }),
    'weegschaal':  row<WeegschaalConstraints>({ exerciseField: 'weegschaalExercises', generate: generateWeegschaalExercises,  defaultConstraints: weegschaalDefaults,  defaultCount: 4 , kiosk: WEEGSCHAAL_KIOSK }),
    'vormleer-punt-lijn': row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 }),
    'vormleer-hoeken':    row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 , kiosk: VORMLEER_KIOSK }),
    'vormleer-figuren':   row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 , kiosk: VORMLEER_KIOSK }),
};

// ── Seed-time fit: settings that only make sense under the seeded max ────────
// A leerjaar seed can lower a block's max under what its default settings assume (H at max
// 100, a 5-step line of 6 ticks at max 20). seedConstraints runs these on the merged seed so
// a fresh block never starts on a setting its generator would have to replace with a note.

// Rounding targets that cannot round at this max (usableTargets, the rule both generators
// use) are dropped; when none is left, the nearest valid target takes over.
const fitRoundTargets = (c: Record<string, unknown>): Record<string, unknown> => {
    const selected = c.roundTargets;
    if (!Array.isArray(selected) || typeof c.maxGetal !== 'number') return c;
    const nt = numberTypeOf(c);
    const dp = typeof c.decimalPlaces === 'number' ? c.decimalPlaces : 2;
    const keep = usableTargets(nt, c.maxGetal, dp, selected as string[]).map(t => t.key);
    if (keep.length === selected.length) return c;
    if (keep.length) return { ...c, roundTargets: (selected as string[]).filter(k => keep.includes(k)) };
    const all = targetsFor(nt);
    const valid = usableTargets(nt, c.maxGetal, dp, all.map(t => t.key));
    const wanted = all.filter(t => (selected as string[]).includes(t.key));
    if (!valid.length || !wanted.length) return c;
    const ref = Math.max(...wanted.map(t => t.weight));
    const nearest = valid.reduce((best, t) => (Math.abs(Math.log(t.weight / ref)) < Math.abs(Math.log(best.weight / ref)) ? t : best));
    return { ...c, roundTargets: [nearest.key] };
};

// A getallenas / getallenrij spans step × (ticks − 1) from its lower bound: when that overruns
// the max, fewer ticks first (down to 4, the slider's floor), then a smaller step.
const fitAxisSpan = (c: Record<string, unknown>): Record<string, unknown> => {
    const nt = numberTypeOf(c);
    const { maxGetal: max, step, ticks } = c;
    if (nt === 'rational' || typeof max !== 'number' || typeof step !== 'number' || typeof ticks !== 'number' || step <= 0) return c;
    const lo = nt === 'geheel' ? (typeof c.minGetal === 'number' ? c.minGetal : -max) : 0;
    const room = max - lo;
    // 1e-9: decimal steps (0.1 × 5) must not miss a fit by a float hair.
    const fits = (s: number, t: number) => s * (t - 1) <= room + 1e-9;
    if (fits(step, ticks)) return c;
    const MIN_TICKS = 4;
    const t = Math.max(MIN_TICKS, Math.min(ticks, Math.floor(room / step + 1e-9) + 1));
    if (fits(step, t)) return { ...c, ticks: t };
    const steps = AXIS_FALLBACK_STEPS[nt === 'decimal' ? 'decimal' : 'natural'].filter(s => s < step && fits(s, t));
    return steps.length ? { ...c, ticks: t, step: Math.max(...steps) } : { ...c, ticks: t };
};

export const SEED_FIT: Record<string, (c: Record<string, unknown>) => Record<string, unknown>> = {
    'afronden': fitRoundTargets,
    'schattend': fitRoundTargets,
    'getallenas': fitAxisSpan,
    'getallenrijen': fitAxisSpan,
};

// An old save or share link can hold a max its picker no longer lists (the 1e10 leerjaar-6
// seed): floor it once at load, as the picker would, so opening the block changes nothing.
// Flooring never raises: a value below the list (a leaf pin) is left for the picker.
export function floorMaxIntoList(typeId: string, constraints: Record<string, unknown>): Record<string, unknown> {
    const def = REGISTRY[typeId];
    const range = def?.maxPresets?.({ ...def.defaultConstraints(typeId), ...constraints });
    if (!range || range.presets.length === 0) return constraints;
    const v = constraints[range.key];
    if (typeof v !== 'number' || range.presets.includes(v) || v < Math.min(...range.presets)) return constraints;
    return { ...constraints, [range.key]: floorToPreset(v, range.presets) };
}
