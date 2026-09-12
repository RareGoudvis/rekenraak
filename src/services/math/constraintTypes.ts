import type { GetalFunctie } from './types';
import type { RepKind } from '../vergelijken/representations';
import type { TimeCategory, ClockType, ExerciseMode, MinuteDirection, HandChoice } from '../clock/clockTypes';
import type { ConstraintType, FractionSubType, FractionShape, MabStyle, MabScaffolding, ScaffoldingLevel, CijferOperator } from './types';

// ── Per-family constraint shapes ─────────────────────────────────────────────
// `MathBlock.constraints` is one loose bag per block; these types say what each
// family actually puts in it. They are written from three sources that must agree:
// the registry's default factories (exerciseRegistry.ts), what the generator/viewer/
// plugin read, and the option lists in config/constraintSpace.ts.
//
// Keys the default factory emits are REQUIRED (so `row<C>()` catches a factory that
// drops or misspells one); everything a generator only reads when present is optional.
//
// These are `type` aliases, not interfaces, on purpose: only an alias of an object
// literal type gets an implicit index signature, which is what keeps each family type
// assignable to `BlockConstraints` (and therefore to `MathBlock`'s default parameter).

export type PlaceMask = Record<string, boolean>;
export type NumberType = 'natural' | 'decimal' | 'rational' | 'geheel';
export type BridgeMap = Record<string, ConstraintType>;

// Keys that are not owned by any one family: the sheet machinery reads them off any
// block, so they stay loose.
export type CrossCutting = {
    /** Per-block override of docSettings.bodyFontScale (exercise-body zoom). */
    bodyFontScale?: number;
    /** Amount of printed help; a number of lines for cijferen, a named level elsewhere. */
    scaffolding?: string | number;
    /** Selects the view within a family (set by the sidebar leaf). */
    subType?: string;
};

/** What `MathBlock.constraints` is when the block's family is not known statically. */
export type BlockConstraints = Record<string, unknown> & CrossCutting;

// ── Hoofdrekenen (mental math) ───────────────────────────────────────────────

// 'bruggetje' = a carry/borrow across a place-value boundary; bridges maps a place
// key (E/T/H/…) to FREE | REQUIRED | FORBIDDEN.
export type AddSubConstraints = {
    numberType: NumberType;
    decimalPlaces: number;
    maxGetal: number;
    bridges: BridgeMap;
    operand1Mask: PlaceMask;
    operand2Mask: PlaceMask;
    minGetal?: number;
    equationType?: 'normal' | 'puntoefening';
    // 2-4 terms: per-term mask/max live in parallel arrays indexed by term.
    termCount?: number;
    operandMasks?: PlaceMask[];
    operandMax?: number[];
    // Presets: 'compenseren' (+/− over a round number) · 'tienvoud' (×/: by 10/100/1000).
    preset?: 'vrij' | 'compenseren' | 'tienvoud';
    presetDistance?: number;
    presetFactors?: number[];
    compenserenScaffold?: boolean;
    // Rational (fraction) sub-settings.
    fractionDifficulty?: string;
    mixedNumber1?: boolean;
    mixedNumber2?: boolean;
    maxNumerator1?: number;
    maxDenominator1?: number;
    maxNumerator2?: number;
    maxDenominator2?: number;
    linkFractions?: boolean;
};

export type MulDivConstraints = AddSubConstraints & {
    multiplicationMode?: 'tafels' | 'vrij' | 'met_rest' | 'andere';
    selectedTables?: number[];
    tableLimit?: number;
    fractionMultMode?: string;
    fractionOrderMode?: string;
    divisionLevel?: number;
    divisionLevels?: number[];
    metRestLevel?: number;
    excludeOne?: boolean;
    // Rational ×/: — cap the denominator the answer may keep after simplifying.
    simplifyMaxDenominatorChecked?: boolean;
    simplifyMaxDenominator?: number;
};

// ── Cijferen (column arithmetic) ─────────────────────────────────────────────

export type CijferConstraints = {
    operator: CijferOperator;
    numberType: 'natural' | 'decimal';
    maxRange: number;
    decimalPlaces: 1 | 2 | 3;
    withEstimation: boolean;
    scaffolding: ScaffoldingLevel;
    withRemainder: boolean;
    numberOfTerms: number;
    gridCellSize: number;
    operand0Mask: PlaceMask;
    operand1Mask: PlaceMask;
    operand2Mask: PlaceMask;
    operand3Mask: PlaceMask;
    bridges: BridgeMap;
    extraCols: number;
    extraRows: number;
    showQR?: boolean;
};

// ── Klok ─────────────────────────────────────────────────────────────────────

export type ClockConstraints = {
    clockType: ClockType;
    exerciseMode: ExerciseMode;
    is24hour: boolean;
    timeTypes: TimeCategory[];
    minuteDirection: MinuteDirection;
    handChoice: HandChoice;
};

// ── Breuken ──────────────────────────────────────────────────────────────────

export type FractionConstraints = {
    subType: FractionSubType;
    shape: FractionShape;
    shapes?: FractionShape[];          // kleuren/herkennen: included shapes (≥1, mixed per exercise)
    staticSize?: boolean;              // keep shape size constant across denominators (only when 1 shape)
    staticW?: number;                  // rectangle width (cm) when staticSize
    staticH?: number;                  // rectangle height (cm) when staticSize
    staticSide?: number;               // square side (cm) when staticSize
    staticDiam?: number;               // circle diameter (cm) when staticSize
    minDenominator: number;
    maxDenominator: number;
    answerFormat: string;
    objectShape: 'circle' | 'square';
    maxTotal: number;
    groupingMode?: 'standaard' | 'gebalanceerd' | 'per-deel';  // concreet object row layout
    drawBoxW?: number;                 // schematisch draw box width (cm); 0/undefined = full width
    drawBoxH?: number;                 // schematisch draw box height (cm)
    minLineLength: number;
    maxLineLength: number;
    level: number;
    answerMode: string;
    maxDimension?: number;
    maxWidth?: number;
    maxHeight?: number;
    maxAbstractN3: number;
    showGrid?: boolean;                // veelhoek: draw the 1cm background grid (default true)
};

export type BreukBewerkConstraints = {
    subType: 'gemengd' | 'gelijknamig' | 'vereenvoudigen';
    direction: 'naar-gemengd' | 'naar-breuk' | 'beide';
    minDenominator: number;
    maxDenominator: number;
    maxNumerator: number;
    tablesOnly: boolean;
    allowIrreducible: boolean;
    targetDen: number | '';
};

export type BreukenRangschikkenConstraints = {
    fractionMode: string;
    count: number;
    operatorMode: string;
    minDenominator: number;
    maxDenominator: number;
};

// ── Splitsen (decomposing a number into parts, 7 → 3 + 4) ────────────────────

export type SplitsenConstraints = {
    maxGetal: number;
    operand1Mask: PlaceMask;
    operand2Mask: PlaceMask;
    fixedTotal: number | null;
    layout: string;
    rowsPerBox: number;
    rowHeight: number;
    decimalPlaces?: number;
    blankPositions?: string[];
    blankSide?: string;
    benenVariants?: string[];
    mathForm?: string;
    mathForms?: string[];
    mathDirection?: string;
    notation?: string;
};

// ── Geld ─────────────────────────────────────────────────────────────────────

export type GeldConstraints = {
    maxGetal: number;
    format: string;
    scaffolding: string;
    geldLayout: 'samen' | 'gescheiden';
    showVoorbeelden: boolean;
    voorbeeldTypes: number[];
    exercisesPerRow: number | null;
    allowedDenominations: number[];
    boxHeight: number;
};

export type GeldWisselConstraints = {
    exerciseBills: number[];
    exercisesPerRow: number;
    boxHeight: number;
};

export type GeldTeruggevenConstraints = {
    minPriceEuros: number;
    maxPriceEuros: number;
    payWithOptions: number[];
    centenDeel: string;
    scaffolding: string;
    antwoordType: string;
    antwoordFormat: string;
    betalenMetTekening: boolean;
    boxHeight: number;
};

export type GeldRekenenConstraints = {
    subType: 'korting' | 'winst' | 'intrest';
    percents: number[];
    maxEuro: number;
    wholeEuros: boolean;
    halfYear: boolean;
};

// ── MAB (Dienes place-value blocks) ──────────────────────────────────────────

export type MabConstraints = {
    // 'realistic' is the pre-rename value; worksheets saved with it still load.
    mabStyle: MabStyle | 'realistic';
    maxNumber: number;
    operand1Mask: PlaceMask;
    scaffolding: MabScaffolding;
    exercisesPerRow: number;
    boxHeight: number;
    answerHeight: number;
    showBox?: boolean;
};

// ── Getalbegrip ──────────────────────────────────────────────────────────────

export type OrdenenConstraints = {
    numberType: NumberType;
    count: number;
    operatorMode: string;
    maxGetal: number;
    decimalPlaces: number;
    unitFractionsOnly: boolean;
    allowMixed: boolean;
    minGetal?: number;
    numberMask?: PlaceMask;
    minDenominator?: number;
    maxDenominator?: number;
};

export type PlaatswaardeConstraints = {
    subType: 'waarde' | 'plaats' | 'tabel';
    maxGetal: number;
    numberMask: PlaceMask;
    decimalPlaces: number;
};

export type EvenOnevenConstraints = {
    subType: 'rooster' | 'cirkels';
    maxGetal: number;
    target: 'even' | 'oneven';
    perRow: number;
};

export type VergelijkenConstraints = {
    subType: 'getallen' | 'kiezen' | 'representaties';
    maxGetal: number;
    numberMask: PlaceMask;
    chooseTarget: 'grootste' | 'kleinste';
    setSize: number;
    decimalPlaces: number;
    leftRep: RepKind;
    rightRep: RepKind;
    leftMask: PlaceMask;
    rightMask: PlaceMask;
    leftFracN: number;
    leftFracD: number;
    rightFracN: number;
    rightFracD: number;
};

export type AfrondenConstraints = {
    subType: 'rooster' | 'simpel';
    numberType: NumberType;
    maxGetal: number;
    numberMask: PlaceMask;
    roundTargets: string[];
    roosterSize: number;
    decimalPlaces: number;
};

export type RomeinseConstraints = {
    subType: 'herkennen' | 'schrijven';
    niveau: number;
};

export type GetalFunctieConstraints = {
    functies: GetalFunctie[];
    answerMode: 'aankruisen' | 'schrijven';
    maxGetal: number;
};

export type DeelbaarheidConstraints = {
    layout: 'tabel' | 'veelvouden';
    divisors: number[];
    maxGetal: number;
    base: number;
    terms: number;
    givenCount: number;
};

export type DeelbaarheidKleurConstraints = {
    viewMode: 'strip' | 'markeren' | 'raster';
    divisors: number[];
    maxGetal: number;
    perRow: number;
    rasterCount: number;
    rasterCols: number;
    showRest: boolean;
};

export type GetallenasConstraints = {
    numberType: NumberType;
    maxGetal: number;
    step: number;
    direction: string;
    hardMode: boolean;
    ticks: number;
    minGetal?: number;
    allowMixed?: boolean;
    gelijknamig?: boolean;
    fractionStep?: number;
};

export type GetallenrijConstraints = GetallenasConstraints & {
    numberMask: PlaceMask;
    fractionStep: number;
    maxTeller: number;
    showFrame: boolean;
};

export type PatroonConstraints = {
    numberType: NumberType;
    maxGetal: number;
    ticks: number;
    steps: number;
    // One entry per operator in `ops`: the operand range (and mask) that step may use.
    ops: string[];
    opSettings: Record<string, { max?: number; mask?: PlaceMask }>;
    maxDecimals: number;
    showArrows: boolean;
    showOperators: boolean;
    operatorsShown: number;
    operatorStyle: 'symbol' | 'full';
    minGetal?: number;
};

export type KettingConstraints = {
    numberType: NumberType;
    maxGetal: number;
    chainLength: number;
    ops: string[];
    opSettings: Record<string, { max?: number; mask?: PlaceMask }>;
    blankMiddle: boolean;
    showArrows: boolean;
    showOperators: boolean;
    operatorsShown: number;
    operatorStyle: 'symbol' | 'full';
};

export type RekenvolgordeConstraints = {
    operators: string[];
    haakjesMode: 'GEEN' | 'MAG' | 'MOET';
    opsCount: number;
    maxGetal: number;
    tableLimit: number;
};

export type SchattendConstraints = {
    operators: string[];
    numberType: NumberType;
    maxGetal: number;
    decimalPlaces: number;
    roundTargets: string[];
    scaffolding: string;
};

export type ControlerenConstraints = {
    subType: 'negenproef' | 'omgekeerde';
    operators: string[];
    maxGetal: number;
    foutAandeel: 'geen' | 'helft' | 'alles';
    showKruis: boolean;
    prefill?: boolean;
};

export type VerbandenConstraints = {
    subType: 'tabel' | 'paren';
    reps: string[];
    denominators: number[];
    given: string;
};

export type ProcentenConstraints = {
    subType: 'nemen' | 'welk-percent';
    percents: number[];
    maxGetal: number;
    scaffold: boolean;
};

// ── Meten ────────────────────────────────────────────────────────────────────

export type MetenConstraints = {
    measureModel: 'meten' | 'gegeven';
    precision: 'cm' | 'mm';
    minLength: number;
    maxLength: number;
    maxCorners: number;
    perSideScaffold: boolean;
    answerMode: 'single' | 'sum';
    answerUnit: string;
    shapes: string[];
    subType?: string;
};

export type OppervlakteConstraints = {
    subType: 'rooster' | 'berekenen';
    shapes: string[];
    minLength: number;
    maxLength: number;
    askOmtrek: boolean;
    scaffoldFormule: boolean;
};

export type HerleidingenConstraints = {
    measure: string;
    units: string[];
    maxEnkel: number;
    maxSamengesteld: number;
    formats: string[];
    compoundMode: string;
    areMode: 'enkel' | 'samengesteld';
    writeUnits: boolean;
    scaffolding: string;
    herleidingLayout: string;
    tablePrompt: boolean;
    tableAnswer: string;
    tableCellW: number;
    tableCellH: number;
    maxGetal?: number;
};

export type MaateenheidConstraints = {
    grootheden: string[];
    answerMode: 'omcirkelen' | 'schrijven';
    subType: 'eenheid' | 'schatten';
};

export type TemperatuurConstraints = {
    variant: 'kleuren' | 'aflezen' | 'verschil';
    includeNegatives: boolean;
    perRow: number;
    mode1?: string;
    mode2?: string;
};

export type WeegschaalConstraints = {
    mode: 'aflezen' | 'tekenen';
    bereikGram: number;
    stepGram: number;
    notatie: string;
    exercisesPerRow: number;
    boxHeight: number;
};

export type TijdsduurConstraints = {
    granularity: string[];
    blanks: string[];
    maxDuurMin: number;
    overMidnight: boolean;
};

export type KalenderConstraints = {
    subType: 'maandrooster' | 'datum-rekenen' | 'notatie';
    questionTypes: string[];
    questionCount: number;
    month: number | 'random';
    year: number;
};

// ── Meetkunde ────────────────────────────────────────────────────────────────

export type VormleerConstraints = {
    kind: 'punt-lijn' | 'hoek' | 'figuur';
    mode: string;
    answerMode: 'woordbank' | 'schrijven';
    classify: string;
    concepts: string[];
    randomRotation: boolean;
    showBoog: boolean;
    showEqualSides: boolean;
    showRightAngles: boolean;
    showParallel: boolean;
    rightAngleStyle: 'vierkantje' | 'haakje';
    raster: boolean;
    boxHeight: number;
    exercisesPerRow: number;
    showMarks?: boolean;
};

// ── Blad-onderdelen (sheet furniture; no generator) ──────────────────────────

export type LayoutConstraints = {
    kind: string;
    title?: string;
    rule?: string;
    body?: string;
    emphasis?: string;
    lineCount?: number;
    lineSpacing?: number;
    lineStyle?: string;
    cellMm?: number;
    rows?: number;
};

// ── typeId → family ──────────────────────────────────────────────────────────
// The pairing a `typeId: string` can never express. Used by `row<C>()` reviewers and
// by anything that wants the family type for a known literal typeId.
export type ConstraintsByType = {
    'hr-std-optellen': AddSubConstraints;
    'hr-std-aftrekken': AddSubConstraints;
    'hr-std-vermenigvuldigen': MulDivConstraints;
    'hr-std-delen': MulDivConstraints;
    'cijferen-optellen-nat': CijferConstraints;
    'cijferen-optellen-dec': CijferConstraints;
    'cijferen-aftrekken-nat': CijferConstraints;
    'cijferen-aftrekken-dec': CijferConstraints;
    'cijferen-vermenigvuldigen-nat': CijferConstraints;
    'cijferen-vermenigvuldigen-dec': CijferConstraints;
    'cijferen-delen-nat': CijferConstraints;
    'cijferen-delen-dec': CijferConstraints;
    'klok-kloklezen': ClockConstraints;
    'breuken': FractionConstraints;
    'breuken-bewerken': BreukBewerkConstraints;
    'breuken-rangschikken': BreukenRangschikkenConstraints;
    'splitsen': SplitsenConstraints;
    'geld-herkennen': GeldConstraints;
    'geld-tekenen': GeldConstraints;
    'geld-wissel': GeldWisselConstraints;
    'geld-teruggeven': GeldTeruggevenConstraints;
    'geld-rekenen': GeldRekenenConstraints;
    'mab-herkennen': MabConstraints;
    'mab-tekenen': MabConstraints;
    'ordenen': OrdenenConstraints;
    'deelbaarheid': DeelbaarheidConstraints;
    'deelbaarheid-kleuren': DeelbaarheidKleurConstraints;
    'getalpatronen': PatroonConstraints;
    'kettingsommen': KettingConstraints;
    'getallenas': GetallenasConstraints;
    'getallenrijen': GetallenrijConstraints;
    'lengte-meten': MetenConstraints;
    'omtrek': MetenConstraints;
    'oppervlakte': OppervlakteConstraints;
    'temperatuur': TemperatuurConstraints;
    'plaatswaarde': PlaatswaardeConstraints;
    'even-oneven': EvenOnevenConstraints;
    'vergelijken': VergelijkenConstraints;
    'afronden': AfrondenConstraints;
    'romeinse-cijfers': RomeinseConstraints;
    'herleidingen': HerleidingenConstraints;
    'schattend': SchattendConstraints;
    'verbanden': VerbandenConstraints;
    'procenten': ProcentenConstraints;
    'maateenheid': MaateenheidConstraints;
    'rekenvolgorde': RekenvolgordeConstraints;
    'getalfunctie': GetalFunctieConstraints;
    'tijdsduur': TijdsduurConstraints;
    'kalender': KalenderConstraints;
    'controleren': ControlerenConstraints;
    'weegschaal': WeegschaalConstraints;
    'vormleer-punt-lijn': VormleerConstraints;
    'vormleer-hoeken': VormleerConstraints;
    'vormleer-figuren': VormleerConstraints;
    'layout-sectie': LayoutConstraints;
    'layout-schrijflijnen': LayoutConstraints;
    'layout-raster': LayoutConstraints;
    'layout-kader': LayoutConstraints;
    'layout-lege-pagina': LayoutConstraints;
};
