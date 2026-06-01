import type { MathBlock } from '../services/math/types';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises } from '../services/math/mathEngine';
import { generateClockExercises } from '../services/clock/clockGenerator';
import { generateFractionExercises } from '../services/fractions/fractionGenerator';
import { generateSplitsenExercises } from '../services/splitsen/splitsenGenerator';
import { generateCijferExercises } from '../services/cijferen/cijferGenerator';
import { generateGeldExercises, generateGeldWisselExercises, generateGeldTeruggevenExercises } from '../services/geld/geldGenerator';
import { generateMabExercises } from '../services/mab/mabGenerator';
import { generateOrdenenExercises } from '../services/ordenen/ordenenGenerator';
import { generateDeelbaarheidExercises } from '../services/deelbaarheid/deelbaarheidGenerator';
import { generateGetallenasExercises } from '../services/getallenas/getallenasGenerator';
import { generateTemperatuurExercises } from '../services/temperatuur/temperatuurGenerator';
import { generatePlaatswaardeExercises } from '../services/plaatswaarde/plaatswaardeGenerator';
import { generateEvenOnevenExercises } from '../services/evenoneven/evenOnevenGenerator';
import { generateVergelijkenExercises } from '../services/vergelijken/vergelijkenGenerator';
import { generateAfrondenExercises } from '../services/afronden/afrondenGenerator';
import { generateRomeinseExercises } from '../services/romeinse/romeinseGenerator';

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
    | 'ordenenExercises' | 'deelbaarheidExercises' | 'getallenasExercises' | 'temperatuurExercises'
    | 'plaatswaardeExercises' | 'evenOnevenExercises' | 'vergelijkenExercises' | 'afrondenExercises'
    | 'romeinseExercises'>;

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
    scaffolding: 'positietabel', exercisesPerRow: 3, boxHeight: 60, answerHeight: 36,
});

const ordenenDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', count: 3, operatorMode: 'oplopend', maxGetal: 100,
    // declared so the global base (decimalen / stambreuken / gemengd) can target them
    decimalPlaces: 1, unitFractionsOnly: false, allowMixed: false,
});

const deelbaarheidDefaults = (): Record<string, unknown> => ({
    layout: 'tabel', divisors: [2, 5, 10], maxGetal: 1000, base: 9, terms: 6, givenCount: 2,
});

const getallenasDefaults = (): Record<string, unknown> => ({
    numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6,
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
});

const afrondenDefaults = (): Record<string, unknown> => ({
    subType: 'rooster', numberType: 'natural', maxGetal: 1000, numberMask: {},
    roundTargets: ['T', 'H'], roosterSize: 6, decimalPlaces: 2,
});

const romeinseDefaults = (): Record<string, unknown> => ({
    subType: 'herkennen', niveau: 2, numberMask: {},
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
    'deelbaarheid': { exerciseField: 'deelbaarheidExercises', generate: generateDeelbaarheidExercises, defaultConstraints: deelbaarheidDefaults, defaultCount: 6 },
    'getallenas':   { exerciseField: 'getallenasExercises',   generate: generateGetallenasExercises,   defaultConstraints: getallenasDefaults,   defaultCount: 5 },
    'temperatuur':  { exerciseField: 'temperatuurExercises',  generate: generateTemperatuurExercises,  defaultConstraints: temperatuurDefaults,  defaultCount: 4 },
    'plaatswaarde': { exerciseField: 'plaatswaardeExercises', generate: generatePlaatswaardeExercises, defaultConstraints: plaatswaardeDefaults, defaultCount: 6 },
    'even-oneven':  { exerciseField: 'evenOnevenExercises',   generate: generateEvenOnevenExercises,   defaultConstraints: evenOnevenDefaults,   defaultCount: 3 },
    'vergelijken':  { exerciseField: 'vergelijkenExercises',  generate: generateVergelijkenExercises,  defaultConstraints: vergelijkenDefaults,  defaultCount: 6 },
    'afronden':     { exerciseField: 'afrondenExercises',     generate: generateAfrondenExercises,     defaultConstraints: afrondenDefaults,     defaultCount: 6 },
    'romeinse-cijfers': { exerciseField: 'romeinseExercises', generate: generateRomeinseExercises, defaultConstraints: romeinseDefaults, defaultCount: 8 },
};
