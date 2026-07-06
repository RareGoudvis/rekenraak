import type { MathBlock } from '../services/math/types';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises } from '../services/math/mathEngine';
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
import { generateTienvoudExercises } from '../services/handig/tienvoudGenerator';
import { generateSchattendExercises } from '../services/schattend/schattendGenerator';
import { generateVerbandExercises } from '../services/verbanden/verbandenGenerator';
import { generateProcentExercises } from '../services/procenten/procentenGenerator';
import { generateMaateenheidExercises } from '../services/maateenheid/maateenheidGenerator';
import { generateGeldRekenenExercises } from '../services/geld/geldRekenenGenerator';
import { generateHandigExercises } from '../services/handig/handigGenerator';
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
    | 'handigExercises' | 'rekenvolgordeExercises' | 'getalFunctieExercises'
    | 'tijdsduurExercises' | 'kalenderExercises' | 'controleExercises'
    | 'weegschaalExercises' | 'vormleerExercises'>;

export interface ExerciseTypeDef {
    // The array field on MathBlock that holds this type's exercises.
    exerciseField: ExerciseField;
    generate: (block: MathBlock) => unknown[];
    // Factory (not a literal) so each new block gets fresh mutable mask objects.
    // Receives typeId because a few defaults differ by leaf (e.g. geld scaffolding).
    defaultConstraints: (typeId: string) => Record<string, unknown>;
    defaultCount: number;
}

// ── default-constraint factories (mirror the old addBlockFromType ternary) ───

const mentalMathDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', decimalPlaces: 2, maxGetal: 1000,
    bridges: { E: 'FREE', T: 'FREE' },
    operand1Mask: {}, operand2Mask: {},
    fractionDifficulty: 'same',
    mixedNumber1: false, mixedNumber2: false,
    maxNumerator1: 10, maxDenominator1: 10, maxNumerator2: 10, maxDenominator2: 10,
    linkFractions: true,
    multiplicationMode: 'tafels',
    selectedTables: [2, 3, 4, 5, 10],
    tableLimit: 10,
});

const cijferDefaults = (): Record<string, unknown> => ({
    operator: '+', numberType: 'natural', maxRange: 1000, decimalPlaces: 2,
    withEstimation: false, scaffolding: 3, withRemainder: false, numberOfTerms: 2,
    gridCellSize: 25, operand0Mask: {}, operand1Mask: {}, operand2Mask: {}, operand3Mask: {},
    bridges: {}, extraCols: 0, extraRows: 0,
});

const clockDefaults = (): Record<string, unknown> => ({
    clockType: 'analoog', exerciseMode: 'lezen', is24hour: false,
    timeTypes: ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'],
    minuteDirection: 'beide', handChoice: 'beide',
});

const fractionDefaults = (): Record<string, unknown> => ({
    subType: 'kleuren', shape: 'rectangle', shapes: ['rectangle'], minDenominator: 2, maxDenominator: 8,
    answerFormat: 'fraction-questions', objectShape: 'circle', maxTotal: 20,
    minLineLength: 4, maxLineLength: 12, level: 1, answerMode: 'berekeningslijnen',
    maxDimension: 6, maxAbstractN3: 1000,
    // teacher refinements: shape mix + static size, concreet grouping, schematisch box, veelhoek grid
    staticSize: false, staticW: 4, staticH: 3, staticSide: 4, staticDiam: 4,
    groupingMode: 'standaard', drawBoxH: 3, showGrid: true,
});

const splitsenDefaults = (): Record<string, unknown> => ({
    maxGetal: 10, operand1Mask: {}, operand2Mask: {}, fixedTotal: null,
    layout: 'basic', rowsPerBox: 4, rowHeight: 28,
});

const geldDefaults = (typeId: string): Record<string, unknown> => ({
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

const geldWisselDefaults = (): Record<string, unknown> => ({
    exerciseBills: [500, 1000], exercisesPerRow: 2, boxHeight: 100,
});

const geldTeruggevenDefaults = (): Record<string, unknown> => ({
    minPriceEuros: 1, maxPriceEuros: 49, payWithOptions: [1000, 2000, 5000],
    centenDeel: 'vijf', scaffolding: 'ingevuld', antwoordType: 'schrijven',
    antwoordFormat: 'euro-cent', betalenMetTekening: false, boxHeight: 120,
});

const mabDefaults = (): Record<string, unknown> => ({
    mabStyle: 'symbolic', maxNumber: 100, operand1Mask: {},
    scaffolding: 'positietabel', exercisesPerRow: 3, boxHeight: 70, answerHeight: 36,
});

const ordenenDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', count: 3, operatorMode: 'oplopend', maxGetal: 100,
    // declared so the global base (decimalen / stambreuken / gemengd) can target them
    decimalPlaces: 1, unitFractionsOnly: false, allowMixed: false,
});

const breukBewerkDefaults = (): Record<string, unknown> => ({
    subType: 'gemengd', direction: 'naar-gemengd', minDenominator: 2, maxDenominator: 10,
    maxNumerator: 10, tablesOnly: true, allowIrreducible: false, targetDen: '',
});

const breukenRangschikkenDefaults = (): Record<string, unknown> => ({
    fractionMode: 'stambreuken', count: 4, operatorMode: 'oplopend',
    minDenominator: 2, maxDenominator: 10,
});

const patroonDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', maxGetal: 100, ticks: 6, steps: 1,
    ops: ['+'], opSettings: { '+': { max: 10, mask: {} } }, maxDecimals: 1,
    showArrows: false, showOperators: false, operatorsShown: 0, operatorStyle: 'symbol',
});

const deelbaarheidKleurDefaults = (): Record<string, unknown> => ({
    viewMode: 'strip', divisors: [2, 5, 10], maxGetal: 100, perRow: 10,
    rasterCount: 100, rasterCols: 10, showRest: false,
});

const deelbaarheidDefaults = (): Record<string, unknown> => ({
    layout: 'tabel', divisors: [2, 5, 10], maxGetal: 1000, base: 9, terms: 6, givenCount: 2,
});

const getallenasDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6,
});

const getallenrijDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, numberMask: {},
    fractionStep: 4, maxTeller: 25, showFrame: true,
});

const metenDefaults = (): Record<string, unknown> => ({
    measureModel: 'meten', precision: 'cm', minLength: 3, maxLength: 10,
    maxCorners: 0, perSideScaffold: false, answerMode: 'single', answerUnit: 'cm',
    shapes: ['driehoek', 'rechthoek', 'vierkant'],
});

const temperatuurDefaults = (): Record<string, unknown> => ({
    variant: 'kleuren', includeNegatives: false, perRow: 4,
});

const plaatswaardeDefaults = (): Record<string, unknown> => ({
    subType: 'waarde', maxGetal: 1000, numberMask: {}, decimalPlaces: 0,
});

const evenOnevenDefaults = (): Record<string, unknown> => ({
    subType: 'rooster', maxGetal: 100, target: 'even', perRow: 10,
});

const vergelijkenDefaults = (): Record<string, unknown> => ({
    subType: 'getallen', maxGetal: 1000, numberMask: {}, chooseTarget: 'grootste', setSize: 4, decimalPlaces: 0,
    // representaties: which representation each side shows + per-side getalopbouw
    leftRep: 'breuk', rightRep: 'kommagetal', leftMask: {}, rightMask: {},
    leftFracN: 4, leftFracD: 8, rightFracN: 4, rightFracD: 8,
});

const afrondenDefaults = (): Record<string, unknown> => ({
    subType: 'rooster', numberType: 'natural', maxGetal: 1000, numberMask: {},
    roundTargets: ['T', 'H'], roosterSize: 6, decimalPlaces: 2,
});

const romeinseDefaults = (): Record<string, unknown> => ({
    subType: 'herkennen', niveau: 2, numberMask: {},
});

// measure + units come from the appstructure leaf's defaultConstraints (lengte/inhoud/massa).
const herleidingenDefaults = (): Record<string, unknown> => ({
    measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'], maxEnkel: 100, maxSamengesteld: 1000,
    formats: ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'],
    compoundMode: '2', areMode: 'samengesteld', writeUnits: false, scaffolding: 'geen', herleidingLayout: 'uitlijnen',
    tablePrompt: false, tableAnswer: 'blank', tableCellW: 60, tableCellH: 30,
});

const tienvoudDefaults = (): Record<string, unknown> => ({
    operators: ['x', ':'], factors: [10, 100, 1000], numberType: 'natural',
    maxGetal: 1000, decimalPlaces: 2, missingFactor: false,
});

const schattendDefaults = (): Record<string, unknown> => ({
    operators: ['+', '-'], numberType: 'natural', maxGetal: 1000, decimalPlaces: 2,
    roundTargets: ['H'], scaffolding: 'tussenstappen',
});

const verbandenDefaults = (): Record<string, unknown> => ({
    subType: 'tabel', reps: ['breuk', 'decimaal', 'procent'],
    denominators: [2, 4, 5, 10, 100], given: 'random',
});

const procentenDefaults = (): Record<string, unknown> => ({
    subType: 'nemen', percents: [10, 25, 50], maxGetal: 1000, scaffold: false,
});

const maateenheidDefaults = (): Record<string, unknown> => ({
    grootheden: ['lengte', 'massa', 'inhoud'], answerMode: 'omcirkelen', subType: 'eenheid',
});

// subType + percent pool come from the appstructure leaf (korting/winst/intrest).
const geldRekenenDefaults = (): Record<string, unknown> => ({
    subType: 'korting', percents: [10, 25, 50], maxEuro: 100, wholeEuros: true, halfYear: false,
});

const handigDefaults = (): Record<string, unknown> => ({
    subType: 'compenseren', operators: ['+'], maxGetal: 100, distance: 1, scaffolding: 'tussenstap',
});

const rekenvolgordeDefaults = (): Record<string, unknown> => ({
    operators: ['+', '-', 'x'], haakjesMode: 'MAG', opsCount: 2, maxGetal: 100, tableLimit: 10,
});

// Renders via PatroonViewer: all operators shown with operand, blank at the end.
const kettingDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', maxGetal: 100, chainLength: 4, ops: ['+', '-'],
    opSettings: { '+': { max: 10 }, '-': { max: 10 } }, blankMiddle: false,
    showArrows: true, showOperators: true, operatorsShown: 99, operatorStyle: 'full',
});

const getalfunctieDefaults = (): Record<string, unknown> => ({
    functies: ['hoeveelheid', 'rang', 'maat', 'code'], answerMode: 'aankruisen', maxGetal: 1000,
});

const tijdsduurDefaults = (): Record<string, unknown> => ({
    granularity: ['kwartier'], blanks: ['duur'], maxDuurMin: 240, overMidnight: false,
});

const kalenderDefaults = (): Record<string, unknown> => ({
    subType: 'maandrooster', questionTypes: ['dag-van-datum', 'datum-van-dag', 'tellen'],
    questionCount: 5, month: 'random', year: 2026,
});

const controlerenDefaults = (): Record<string, unknown> => ({
    subType: 'negenproef', operators: ['+', '-'], maxGetal: 1000, foutAandeel: 'helft', showKruis: true,
});

const oppervlakteDefaults = (): Record<string, unknown> => ({
    subType: 'berekenen', shapes: ['rechthoek', 'vierkant'], minLength: 2, maxLength: 8,
    askOmtrek: false, scaffoldFormule: true,
});

const weegschaalDefaults = (): Record<string, unknown> => ({
    mode: 'aflezen', bereikGram: 1000, stepGram: 50, notatie: 'g', exercisesPerRow: 2, boxHeight: 170,
});

// kind + concepts come from the appstructure leaf (punt-lijn / hoek / figuur classify).
const vormleerDefaults = (typeId: string): Record<string, unknown> => ({
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
const cijferRow = (): ExerciseTypeDef => ({
    exerciseField: 'cijferExercises', generate: generateCijferExercises,
    defaultConstraints: cijferDefaults, defaultCount: 2,
});

export const REGISTRY: Record<string, ExerciseTypeDef> = {
    // Mental math (hoofdrekenen standaardprocedure) — one typeId per operation.
    'hr-std-optellen':         { exerciseField: 'exercises', generate: generateAdditionExercises,       defaultConstraints: mentalMathDefaults, defaultCount: 10 },
    'hr-std-aftrekken':        { exerciseField: 'exercises', generate: generateSubtractionExercises,    defaultConstraints: mentalMathDefaults, defaultCount: 10 },
    'hr-std-vermenigvuldigen': { exerciseField: 'exercises', generate: generateMultiplicationExercises, defaultConstraints: mentalMathDefaults, defaultCount: 10 },
    'hr-std-delen':            { exerciseField: 'exercises', generate: generateDivisionExercises,       defaultConstraints: mentalMathDefaults, defaultCount: 10 },

    // Cijferen (column arithmetic) — natural + decimal per operation.
    'cijferen-optellen-nat':         cijferRow(),
    'cijferen-optellen-dec':         cijferRow(),
    'cijferen-aftrekken-nat':        cijferRow(),
    'cijferen-aftrekken-dec':        cijferRow(),
    'cijferen-vermenigvuldigen-nat': cijferRow(),
    'cijferen-vermenigvuldigen-dec': cijferRow(),
    'cijferen-delen-nat':            cijferRow(),
    'cijferen-delen-dec':            cijferRow(),

    'klok-kloklezen': { exerciseField: 'clockExercises',    generate: generateClockExercises,    defaultConstraints: clockDefaults,    defaultCount: 10 },
    'breuken':        { exerciseField: 'fractionExercises', generate: generateFractionExercises, defaultConstraints: fractionDefaults, defaultCount: 6 },
    'splitsen':       { exerciseField: 'splitsenExercises', generate: generateSplitsenExercises, defaultConstraints: splitsenDefaults, defaultCount: 5 },

    'geld-herkennen':  { exerciseField: 'geldExercises',           generate: generateGeldExercises,           defaultConstraints: geldDefaults,           defaultCount: 6 },
    'geld-tekenen':    { exerciseField: 'geldExercises',           generate: generateGeldExercises,           defaultConstraints: geldDefaults,           defaultCount: 6 },
    'geld-wissel':     { exerciseField: 'geldWisselExercises',     generate: generateGeldWisselExercises,     defaultConstraints: geldWisselDefaults,     defaultCount: 4 },
    'geld-teruggeven': { exerciseField: 'geldTeruggevenExercises', generate: generateGeldTeruggevenExercises, defaultConstraints: geldTeruggevenDefaults, defaultCount: 4 },

    'mab-herkennen': { exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6 },
    'mab-tekenen':   { exerciseField: 'mabExercises', generate: generateMabExercises, defaultConstraints: mabDefaults, defaultCount: 6 },

    'ordenen':      { exerciseField: 'ordenenExercises',      generate: generateOrdenenExercises,      defaultConstraints: ordenenDefaults,      defaultCount: 6 },
    'breuken-bewerken':      { exerciseField: 'breukBewerkExercises', generate: generateBreukBewerkExercises,        defaultConstraints: breukBewerkDefaults,        defaultCount: 8 },
    'breuken-rangschikken':  { exerciseField: 'ordenenExercises',     generate: generateBreukenRangschikkenExercises, defaultConstraints: breukenRangschikkenDefaults, defaultCount: 6 },
    'deelbaarheid': { exerciseField: 'deelbaarheidExercises', generate: generateDeelbaarheidExercises, defaultConstraints: deelbaarheidDefaults, defaultCount: 6 },
    'getalpatronen': { exerciseField: 'patroonExercises', generate: generatePatroonExercises, defaultConstraints: patroonDefaults, defaultCount: 6 },
    'deelbaarheid-kleuren': { exerciseField: 'deelbaarheidKleurExercises', generate: generateDeelbaarheidKleurExercises, defaultConstraints: deelbaarheidKleurDefaults, defaultCount: 3 },
    'getallenas':   { exerciseField: 'getallenasExercises',   generate: generateGetallenasExercises,   defaultConstraints: getallenasDefaults,   defaultCount: 5 },
    'getallenrijen':{ exerciseField: 'getallenasExercises',   generate: generateGetallenrijExercises,  defaultConstraints: getallenrijDefaults,  defaultCount: 5 },
    'lengte-meten': { exerciseField: 'meetExercises',         generate: generateLengteMetenExercises,  defaultConstraints: metenDefaults,        defaultCount: 6 },
    'omtrek':       { exerciseField: 'meetExercises',         generate: generateOmtrekExercises,       defaultConstraints: metenDefaults,        defaultCount: 6 },
    'temperatuur':  { exerciseField: 'temperatuurExercises',  generate: generateTemperatuurExercises,  defaultConstraints: temperatuurDefaults,  defaultCount: 4 },
    'plaatswaarde': { exerciseField: 'plaatswaardeExercises', generate: generatePlaatswaardeExercises, defaultConstraints: plaatswaardeDefaults, defaultCount: 6 },
    'even-oneven':  { exerciseField: 'evenOnevenExercises',   generate: generateEvenOnevenExercises,   defaultConstraints: evenOnevenDefaults,   defaultCount: 3 },
    'vergelijken':  { exerciseField: 'vergelijkenExercises',  generate: generateVergelijkenExercises,  defaultConstraints: vergelijkenDefaults,  defaultCount: 6 },
    'afronden':     { exerciseField: 'afrondenExercises',     generate: generateAfrondenExercises,     defaultConstraints: afrondenDefaults,     defaultCount: 6 },
    'romeinse-cijfers': { exerciseField: 'romeinseExercises', generate: generateRomeinseExercises, defaultConstraints: romeinseDefaults, defaultCount: 8 },
    'herleidingen': { exerciseField: 'herleidingExercises', generate: generateHerleidingExercises, defaultConstraints: herleidingenDefaults, defaultCount: 8 },

    // Handig rekenen + schattend rekenen.
    'tienvoud':  { exerciseField: 'exercises',          generate: generateTienvoudExercises,  defaultConstraints: tienvoudDefaults,  defaultCount: 10 },
    'schattend': { exerciseField: 'schattendExercises', generate: generateSchattendExercises, defaultConstraints: schattendDefaults, defaultCount: 8 },

    // Procenten + verbanden breuk·decimaal·procent.
    'verbanden': { exerciseField: 'verbandExercises', generate: generateVerbandExercises, defaultConstraints: verbandenDefaults, defaultCount: 8 },
    'procenten': { exerciseField: 'procentExercises', generate: generateProcentExercises, defaultConstraints: procentenDefaults, defaultCount: 8 },

    'maateenheid':  { exerciseField: 'maateenheidExercises', generate: generateMaateenheidExercises, defaultConstraints: maateenheidDefaults, defaultCount: 8 },
    'geld-rekenen': { exerciseField: 'geldRekenenExercises', generate: generateGeldRekenenExercises, defaultConstraints: geldRekenenDefaults, defaultCount: 5 },

    'handig-rekenen': { exerciseField: 'handigExercises',        generate: generateHandigExercises,        defaultConstraints: handigDefaults,        defaultCount: 8 },
    'rekenvolgorde':  { exerciseField: 'rekenvolgordeExercises', generate: generateRekenvolgordeExercises, defaultConstraints: rekenvolgordeDefaults, defaultCount: 10 },
    'kettingsommen':  { exerciseField: 'patroonExercises',       generate: generateKettingExercises,       defaultConstraints: kettingDefaults,       defaultCount: 6 },
    'getalfunctie':   { exerciseField: 'getalFunctieExercises',  generate: generateGetalFunctieExercises,  defaultConstraints: getalfunctieDefaults,  defaultCount: 6 },
    'tijdsduur':      { exerciseField: 'tijdsduurExercises',     generate: generateTijdsduurExercises,     defaultConstraints: tijdsduurDefaults,     defaultCount: 6 },
    'kalender':       { exerciseField: 'kalenderExercises',      generate: generateKalenderExercises,      defaultConstraints: kalenderDefaults,      defaultCount: 1 },
    'controleren':    { exerciseField: 'controleExercises',      generate: generateControleExercises,      defaultConstraints: controlerenDefaults,   defaultCount: 4 },

    // Meetkunde + SVG-heavy meten types.
    'oppervlakte': { exerciseField: 'meetExercises',       generate: generateOppervlakteExercises, defaultConstraints: oppervlakteDefaults, defaultCount: 4 },
    'weegschaal':  { exerciseField: 'weegschaalExercises', generate: generateWeegschaalExercises,  defaultConstraints: weegschaalDefaults,  defaultCount: 4 },
    'vormleer-punt-lijn': { exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 },
    'vormleer-hoeken':    { exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 },
    'vormleer-figuren':   { exerciseField: 'vormleerExercises', generate: generateVormleerExercises, defaultConstraints: vormleerDefaults, defaultCount: 6 },
};
