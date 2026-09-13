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
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises } from '../services/math/mathEngine';
import { generateWithRelaxation, relaxationNote } from '../services/math/relax';
import { generateMixedExercises, generateMixedExercisesNoted } from '../services/math/mixedGenerator';
import { generateClockExercises } from '../services/clock/clockGenerator';
import { generateFractionExercises } from '../services/fractions/fractionGenerator';
import { generateBreukBewerkExercises } from '../services/fractions/breukBewerkGenerator';
import { generateBreukenRangschikkenExercises } from '../services/ordenen/breukenRangschikkenGenerator';
import { generateSplitsenExercises } from '../services/splitsen/splitsenGenerator';
import { generateCijferExercises } from '../services/cijferen/cijferGenerator';
import { generateGeldExercises, generateGeldWisselExercises, generateGeldTeruggevenExercises } from '../services/geld/geldGenerator';
import { generateMabExercises } from '../services/mab/mabGenerator';
import { generateOrdenenExercises } from '../services/ordenen/ordenenGenerator';
import { generateDeelbaarheidExercises } from '../services/deelbaarheid/deelbaarheidGenerator';
import { generateGetallenasExercises } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercises } from '../services/getallenrij/getallenrijGenerator';
import { generateLengteMetenExercises, generateOmtrekExercises, generateOppervlakteExercises } from '../services/meten/metenGenerator';
import { generatePatroonExercises } from '../services/patroon/patroonGenerator';
import { generateDeelbaarheidKleurExercises } from '../services/deelbaarheid/deelbaarheidKleurGenerator';
import { generateTemperatuurExercises } from '../services/temperatuur/temperatuurGenerator';
import { generatePlaatswaardeExercises } from '../services/plaatswaarde/plaatswaardeGenerator';
import { generateEvenOnevenExercises } from '../services/evenoneven/evenOnevenGenerator';
import { generateVergelijkenExercises } from '../services/vergelijken/vergelijkenGenerator';
import { generateAfrondenExercises } from '../services/afronden/afrondenGenerator';
import { generateRomeinseExercises } from '../services/romeinse/romeinseGenerator';
import { generateHerleidingExercises } from '../services/herleidingen/herleidingenGenerator';
import { generateSchattendExercises } from '../services/schattend/schattendGenerator';
import { generateVerbandExercises, generateVerbandExercisesNoted } from '../services/verbanden/verbandenGenerator';
import { generateProcentExercises } from '../services/procenten/procentenGenerator';
import { generateMaateenheidExercises } from '../services/maateenheid/maateenheidGenerator';
import { generateGeldRekenenExercises } from '../services/geld/geldRekenenGenerator';
import { generateRekenvolgordeExercises } from '../services/rekenvolgorde/rekenvolgordeGenerator';
import { generateKettingExercises } from '../services/patroon/kettingGenerator';
import { generateGetalFunctieExercises } from '../services/getalfunctie/getalfunctieGenerator';
import { generateTijdsduurExercises } from '../services/tijdsduur/tijdsduurGenerator';
import { generateKalenderExercises } from '../services/kalender/kalenderGenerator';
import { generateControleExercises } from '../services/controleren/controlerenGenerator';
import { generateWeegschaalExercises } from '../services/weegschaal/weegschaalGenerator';
import { generateVormleerExercises } from '../services/vormleer/vormleerGenerator';

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
    // declared so the global base (decimalen / stambreuken / gemengd) can target them
    decimalPlaces: 1, unitFractionsOnly: false, allowMixed: false,
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
});

// All cijferen leaves share the same generator/field/defaults (operator + numberType
// come from the appstructure leaf's defaultConstraints, merged on top at add time).
const cijferRow = (): ExerciseTypeDef => row<CijferConstraints>({
    exerciseField: 'cijferExercises', generate: generateCijferExercises,
    defaultConstraints: cijferDefaults, defaultCount: 4,
});

export const REGISTRY: Record<string, ExerciseTypeDef> = {
    // Mental math (hoofdrekenen standaardprocedure) — one typeId per operation.
    'hr-std-optellen':         row<AddSubConstraints>({ exerciseField: 'exercises', ...relaxing(generateAdditionExercises),       defaultConstraints: addSubDefaults, defaultCount: 10 }),
    'hr-std-aftrekken':        row<AddSubConstraints>({ exerciseField: 'exercises', ...relaxing(generateSubtractionExercises),    defaultConstraints: addSubDefaults, defaultCount: 10 }),
    'hr-std-vermenigvuldigen': row<MulDivConstraints>({ exerciseField: 'exercises', ...relaxing(generateMultiplicationExercises), defaultConstraints: mulDivDefaults, defaultCount: 10 }),
    'hr-std-delen':            row<MulDivConstraints>({ exerciseField: 'exercises', ...relaxing(generateDivisionExercises),       defaultConstraints: mulDivDefaults, defaultCount: 10 }),
    // Mixed already relaxes per variant inside its own generator, so it brings its own note.
    'hr-std-gemengd':          row<MixedConstraints>({ exerciseField: 'exercises', generate: generateMixedExercises, generateNoted: generateMixedExercisesNoted, defaultConstraints: mixedDefaults, defaultCount: 10 }),

    // Cijferen (column arithmetic) — natural + decimal per operation.
    'cijferen-optellen-nat':         cijferRow(),
    'cijferen-optellen-dec':         cijferRow(),
    'cijferen-aftrekken-nat':        cijferRow(),
    'cijferen-aftrekken-dec':        cijferRow(),
    'cijferen-vermenigvuldigen-nat': cijferRow(),
    'cijferen-vermenigvuldigen-dec': cijferRow(),
    'cijferen-delen-nat':            cijferRow(),
    'cijferen-delen-dec':            cijferRow(),

    'klok-kloklezen': row<ClockConstraints>({ exerciseField: 'clockExercises',    generate: generateClockExercises,    defaultConstraints: clockDefaults,    defaultCount: 10 }),
    'breuken':        row<FractionConstraints>({ exerciseField: 'fractionExercises', generate: generateFractionExercises, defaultConstraints: fractionDefaults, defaultCount: 6 }),
    'splitsen':       row<SplitsenConstraints>({ exerciseField: 'splitsenExercises', generate: generateSplitsenExercises, defaultConstraints: splitsenDefaults, defaultCount: 5 }),

    'geld-herkennen':  row<GeldConstraints>({ exerciseField: 'geldExercises',           generate: generateGeldExercises,           defaultConstraints: geldDefaults,           defaultCount: 6 }),
    'geld-tekenen':    row<GeldConstraints>({ exerciseField: 'geldExercises',           generate: generateGeldExercises,           defaultConstraints: geldDefaults,           defaultCount: 6 }),
    'geld-wissel':     row<GeldWisselConstraints>({ exerciseField: 'geldWisselExercises',     generate: generateGeldWisselExercises,     defaultConstraints: geldWisselDefaults,     defaultCount: 4 }),
    'geld-teruggeven': row<GeldTeruggevenConstraints>({ exerciseField: 'geldTeruggevenExercises', generate: generateGeldTeruggevenExercises, defaultConstraints: geldTeruggevenDefaults, defaultCount: 4 }),

    'mab-herkennen': row<MabConstraints>({ exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6 }),
    'mab-tekenen':   row<MabConstraints>({ exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6 }),

    'ordenen':      row<OrdenenConstraints>({ exerciseField: 'ordenenExercises',      generate: generateOrdenenExercises,      defaultConstraints: ordenenDefaults,      defaultCount: 6 }),
    'breuken-bewerken':      row<BreukBewerkConstraints>({ exerciseField: 'breukBewerkExercises', generate: generateBreukBewerkExercises,        defaultConstraints: breukBewerkDefaults,        defaultCount: 8 }),
    'breuken-rangschikken':  row<BreukenRangschikkenConstraints>({ exerciseField: 'ordenenExercises',     generate: generateBreukenRangschikkenExercises, defaultConstraints: breukenRangschikkenDefaults, defaultCount: 6 }),
    'deelbaarheid': row<DeelbaarheidConstraints>({ exerciseField: 'deelbaarheidExercises', generate: generateDeelbaarheidExercises, defaultConstraints: deelbaarheidDefaults, defaultCount: 6 }),
    'getalpatronen': row<PatroonConstraints>({ exerciseField: 'patroonExercises', generate: generatePatroonExercises, defaultConstraints: patroonDefaults, defaultCount: 6 }),
    'deelbaarheid-kleuren': row<DeelbaarheidKleurConstraints>({ exerciseField: 'deelbaarheidKleurExercises', generate: generateDeelbaarheidKleurExercises, defaultConstraints: deelbaarheidKleurDefaults, defaultCount: 3 }),
    'getallenas':   row<GetallenasConstraints>({ exerciseField: 'getallenasExercises',   generate: generateGetallenasExercises,   defaultConstraints: getallenasDefaults,   defaultCount: 5 }),
    'getallenrijen':row<GetallenrijConstraints>({ exerciseField: 'getallenasExercises',   generate: generateGetallenrijExercises,  defaultConstraints: getallenrijDefaults,  defaultCount: 5 }),
    'lengte-meten': row<MetenConstraints>({ exerciseField: 'meetExercises',         generate: generateLengteMetenExercises,  defaultConstraints: metenDefaults,        defaultCount: 6 }),
    'omtrek':       row<MetenConstraints>({ exerciseField: 'meetExercises',         generate: generateOmtrekExercises,       defaultConstraints: metenDefaults,        defaultCount: 6 }),
    'temperatuur':  row<TemperatuurConstraints>({ exerciseField: 'temperatuurExercises',  generate: generateTemperatuurExercises,  defaultConstraints: temperatuurDefaults,  defaultCount: 4 }),
    'plaatswaarde': row<PlaatswaardeConstraints>({ exerciseField: 'plaatswaardeExercises', generate: generatePlaatswaardeExercises, defaultConstraints: plaatswaardeDefaults, defaultCount: 6 }),
    'even-oneven':  row<EvenOnevenConstraints>({ exerciseField: 'evenOnevenExercises',   generate: generateEvenOnevenExercises,   defaultConstraints: evenOnevenDefaults,   defaultCount: 3 }),
    'vergelijken':  row<VergelijkenConstraints>({ exerciseField: 'vergelijkenExercises',  generate: generateVergelijkenExercises,  defaultConstraints: vergelijkenDefaults,  defaultCount: 6 }),
    'afronden':     row<AfrondenConstraints>({ exerciseField: 'afrondenExercises',     generate: generateAfrondenExercises,     defaultConstraints: afrondenDefaults,     defaultCount: 6 }),
    'romeinse-cijfers': row<RomeinseConstraints>({ exerciseField: 'romeinseExercises', generate: generateRomeinseExercises, defaultConstraints: romeinseDefaults, defaultCount: 8 }),
    'herleidingen': row<HerleidingenConstraints>({ exerciseField: 'herleidingExercises', generate: generateHerleidingExercises, defaultConstraints: herleidingenDefaults, defaultCount: 8 }),

    // Schattend rekenen (compenseren + tienvoud are hr-std presets, not types).
    'schattend': row<SchattendConstraints>({ exerciseField: 'schattendExercises', generate: generateSchattendExercises, defaultConstraints: schattendDefaults, defaultCount: 8 }),

    // Procenten + verbanden breuk·decimaal·procent.
    'verbanden': row<VerbandenConstraints>({ exerciseField: 'verbandExercises', generate: generateVerbandExercises, generateNoted: generateVerbandExercisesNoted, defaultConstraints: verbandenDefaults, defaultCount: 8 }),
    'procenten': row<ProcentenConstraints>({ exerciseField: 'procentExercises', generate: generateProcentExercises, defaultConstraints: procentenDefaults, defaultCount: 8 }),

    'maateenheid':  row<MaateenheidConstraints>({ exerciseField: 'maateenheidExercises', generate: generateMaateenheidExercises, defaultConstraints: maateenheidDefaults, defaultCount: 8 }),
    'geld-rekenen': row<GeldRekenenConstraints>({ exerciseField: 'geldRekenenExercises', generate: generateGeldRekenenExercises, defaultConstraints: geldRekenenDefaults, defaultCount: 5 }),

    'rekenvolgorde':  row<RekenvolgordeConstraints>({ exerciseField: 'rekenvolgordeExercises', generate: generateRekenvolgordeExercises, defaultConstraints: rekenvolgordeDefaults, defaultCount: 10 }),

    // ── Blad-onderdelen (no generated content; constraints only) ────────────
    'layout-sectie':       row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0 }),
    'layout-schrijflijnen':row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0 }),
    'layout-raster':       row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0 }),
    'layout-kader':        row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0 }),
    'layout-lege-pagina':  row<LayoutConstraints>({ exerciseField: 'exercises', generate: noGenerate, defaultConstraints: layoutDefaults, defaultCount: 0 }),
    'kettingsommen':  row<KettingConstraints>({ exerciseField: 'patroonExercises',       generate: generateKettingExercises,       defaultConstraints: kettingDefaults,       defaultCount: 6 }),
    'getalfunctie':   row<GetalFunctieConstraints>({ exerciseField: 'getalFunctieExercises',  generate: generateGetalFunctieExercises,  defaultConstraints: getalfunctieDefaults,  defaultCount: 6 }),
    'tijdsduur':      row<TijdsduurConstraints>({ exerciseField: 'tijdsduurExercises',     generate: generateTijdsduurExercises,     defaultConstraints: tijdsduurDefaults,     defaultCount: 6 }),
    'kalender':       row<KalenderConstraints>({ exerciseField: 'kalenderExercises',      generate: generateKalenderExercises,      defaultConstraints: kalenderDefaults,      defaultCount: 1 }),
    'controleren':    row<ControlerenConstraints>({ exerciseField: 'controleExercises',      generate: generateControleExercises,      defaultConstraints: controlerenDefaults,   defaultCount: 4 }),

    // Meetkunde + SVG-heavy meten types.
    'oppervlakte': row<OppervlakteConstraints>({ exerciseField: 'meetExercises',       generate: generateOppervlakteExercises, defaultConstraints: oppervlakteDefaults, defaultCount: 4 }),
    'weegschaal':  row<WeegschaalConstraints>({ exerciseField: 'weegschaalExercises', generate: generateWeegschaalExercises,  defaultConstraints: weegschaalDefaults,  defaultCount: 4 }),
    'vormleer-punt-lijn': row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 }),
    'vormleer-hoeken':    row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 }),
    'vormleer-figuren':   row<VormleerConstraints>({ exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 }),
};
