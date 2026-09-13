import type { GetalFunctie } from './types';
import type { RepKind } from '../vergelijken/representations';
import type { VerbandRep } from './types';
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
    /**
     * Per-block override of docSettings.answerSpace: the height of one answer line, in px
     * at the 13pt default (ScaledBlock writes it onto --sheet-answer-h for this block only).
     * Distinct from `verticalSpacing`, which is the gap BETWEEN exercises.
     */
    answerSpace?: number;
    // `scaffolding` is deliberately NOT here. Every family that has one means something
    // different by it — a structure level for cijferen, a named answer box for geld, a
    // conversion table for herleidingen — so each declares its own literal type below.
    /** Selects the view within a family (set by the sidebar leaf). */
    subType?: string;
    /**
     * Opt-in: let ScaledBlock shrink this block's zoom below 1 (down to 0.7) until it
     * fits one page's height. Off by default — a too-tall block then keeps today's
     * behaviour (it spans, and the page shows the red overflow banner).
     */
    fitToPage?: boolean;
    /**
     * Opt-in: let ScaledBlock shrink this block's zoom (down to 0.85) until its content
     * fits the WIDTH of the column it sits in. Off by default — a block that does not fit
     * is widened by the packer instead, because a block that quietly renders at 85% next
     * to an identical one at 100% is a font-size mismatch nobody asked for.
     */
    fitToWidth?: boolean;
};

/**
 * What `MathBlock.constraints` is when the block's family is not known statically: a bag
 * whose keys are strings and whose values are not assumed. `unknown` rather than `any`, so
 * reading a key without saying what it is stays a compile error — code that knows its family
 * casts to the exact type above, and that cast is where typos are caught. The writers that
 * must serve every family at once (baseApply, the store's merge, the template seeds) only
 * spread and assign, which needs no value type.
 */
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
    // null = no ceiling for that term (the engine's maxOpFor reads it that way).
    operandMax?: (number | null)[];
    // Presets: 'compenseren' (+/− over a round number) · 'tienvoud' (×/: by 10/100/1000).
    preset?: 'vrij' | 'compenseren' | 'tienvoud';
    presetDistance?: number;
    presetFactors?: number[];
    /** compenseren: print the intermediate step ('tussenstap') or only the answer. */
    compenserenScaffold?: 'tussenstap' | 'geen';
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

// 'Gemengd' = one block that mixes + - x : in a single list. The block keeps ONE shared
// settings bag (the +/- shape above); a per-variant tab stores only what it overrides, so
// raising maxGetal once raises it for every variant.
//
// A VARIANT is an operator plus an optional hoofdrekenen preset, so "optellen" and
// "optellen met compenseren" can sit in the same block — the preset is a generator
// flavour of the operator, not a different operator.
export type MixedOp = '+' | '-' | 'x' | ':';

export type MixedVariantId = '+' | '+:compenseren' | '-' | '-:compenseren' | 'x' | 'x:tienvoud' | ':' | ':tienvoud';

export interface MixedVariant {
    id: MixedVariantId;
    op: MixedOp;
    preset?: 'compenseren' | 'tienvoud';
    /** Dutch label, used verbatim in the config's variant chips and tab strip. */
    label: string;
}

// SYNC: the id set here IS `MixedVariantId`; the config chips and constraintSpace read it.
export const MIXED_VARIANTS: MixedVariant[] = [
    { id: '+', op: '+', label: 'Optellen' },
    { id: '+:compenseren', op: '+', preset: 'compenseren', label: 'Optellen (compenseren)' },
    { id: '-', op: '-', label: 'Aftrekken' },
    { id: '-:compenseren', op: '-', preset: 'compenseren', label: 'Aftrekken (compenseren)' },
    { id: 'x', op: 'x', label: 'Vermenigvuldigen' },
    { id: 'x:tienvoud', op: 'x', preset: 'tienvoud', label: 'Vermenigvuldigen (tienvoud)' },
    { id: ':', op: ':', label: 'Delen' },
    { id: ':tienvoud', op: ':', preset: 'tienvoud', label: 'Delen (tienvoud)' },
];

export const mixedVariant = (id: MixedVariantId): MixedVariant =>
    MIXED_VARIANTS.find(v => v.id === id) ?? MIXED_VARIANTS[0];

export type MixedConstraints = AddSubConstraints & {
    /** Which variants are in the mix (at least one). Order matters for `mix: 'cycle'`. */
    variants: MixedVariantId[];
    /** How each exercise picks its variant: uniformly at random, or the chosen ones in turn. */
    mix: 'random' | 'cycle';
    /**
     * Sparse per-variant overrides, merged on top of the shared settings by
     * `effectiveBlockFor` — a tab that was never touched has no entry at all.
     */
    perVariant?: Partial<Record<MixedVariantId, Partial<AddSubConstraints & MulDivConstraints>>>;
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
    /** Print a second line for the check sum (the inverse operation). */
    omgekeerdeControle?: boolean;
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
    // Per subType: herkennen picks a question shape, hoeveelheid(-rechthoek) a help level.
    answerFormat: 'fraction-questions' | 'phrase' | 'blank-fraction' | 'blank-line'
        | 'met-hulp' | 'met-breukvragen' | 'zonder-hulp'
        | 'met-berekening' | 'zonder-berekening';
    objectShape: 'circle' | 'square';
    maxTotal: number;
    groupingMode?: 'standaard' | 'gebalanceerd' | 'per-deel';  // concreet object row layout
    drawBoxW?: number;                 // schematisch draw box width (cm); 0/undefined = full width
    drawBoxH?: number;                 // schematisch draw box height (cm)
    minLineLength: number;
    maxLineLength: number;
    level: number;
    /** lijnstuk / hoeveelheid-abstract: which calculation lines are printed. */
    answerMode: 'berekeningslijnen' | 'structuurlijnen' | 'blanco';
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
    // 'lijn' = underline blank (default), 'vak' = bordered box — Differentiatie choice.
    answerStyle?: 'lijn' | 'vak';
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
    // positie-math only: 'volgorde' (place-value order, e.g. H, T, E) or 'gehusseld'
    // (shuffled once per exercise, stored on ex.placeOrder) — default 'volgorde'.
    mathOrder?: 'volgorde' | 'gehusseld';
    notation?: string;
};

// ── Geld ─────────────────────────────────────────────────────────────────────

export type GeldConstraints = {
    maxGetal: number;
    /** How an amount is written: "€ 12" vs "€ 12,50". */
    format: 'euros' | 'decimaal';
    /** herkennen: how the answer is written · tekenen: how the draw box is divided. */
    scaffolding: 'invullen' | 'zelf-schrijven' | 'eenvoudig' | 'verdeeld';
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
    /** How much of the counting-on diagram is pre-drawn ('leeg' = nothing, 'ingevuld' = all). */
    scaffolding: 'ingevuld' | 'basis' | 'structuur' | 'rechthoek' | 'leeg';
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
    // 'lijn' = underline blank (default), 'vak' = bordered box — Differentiatie choice.
    answerStyle?: 'lijn' | 'vak';
};

export type PlaatswaardeConstraints = {
    subType: 'waarde' | 'plaats' | 'tabel' | 'omcirkelen';
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
    // Only meaningful when viewMode === 'strip'. 'lijn' = a wrapped number strip
    // (perRow); 'rechthoek' = a fixed-column grid (rasterCols) — the shape the standalone
    // 'raster' viewMode used to be, before C1 step 6 merged it into 'strip'.
    rasterVorm?: 'lijn' | 'rechthoek';
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

// One operator's operand settings inside `opSettings`. Both families that use it share
// the shape: getalpatronen writes max + mask, kettingsommen only max, so both keys are
// optional and the generators fill their own defaults at the entry line.
export type OpSetting = { max?: number; mask?: PlaceMask };

export type PatroonConstraints = {
    numberType: NumberType;
    maxGetal: number;
    ticks: number;
    steps: number;
    // One entry per operator in `ops`: the operand range (and mask) that step may use.
    ops: string[];
    opSettings: Record<string, OpSetting>;
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
    opSettings: Record<string, OpSetting>;
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
    operators: ('+' | '-' | 'x' | ':')[];
    numberType: NumberType;
    maxGetal: number;
    decimalPlaces: number;
    roundTargets: string[];
    /** Print the rounding step, or only the estimate. */
    scaffolding: 'tussenstappen' | 'enkel-schatting';
    /** 'lang' runs the estimate's write-line to the end of the row (one exercise per row). */
    answerLine?: 'kort' | 'lang';
};

export type ControlerenConstraints = {
    subType: 'negenproef' | 'omgekeerde';
    operators: ('+' | '-' | 'x')[];
    maxGetal: number;
    foutAandeel: 'geen' | 'helft' | 'alles';
    showKruis: boolean;
    /** omgekeerde: how much of the check line is printed. */
    prefill?: 'niets' | 'teken' | 'alles';
};

export type VerbandenConstraints = {
    subType: 'tabel' | 'paren';
    reps: VerbandRep[];
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
    /** 'cm' prints the unit after the writing line, 'plain' prints the line alone. */
    answerUnit: 'cm' | 'plain';
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
    /** The conversion-table scaffold printed with the exercise. */
    scaffolding: 'geen' | 'tabel-headers' | 'tabel-blanco';
    herleidingLayout: 'uitlijnen' | 'compact';
    tablePrompt: boolean;
    tableAnswer: 'blank' | 'filled' | 'hidden';
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
    blanks: ('duur' | 'einde' | 'begin')[];
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
    // Pre-split value: one flag for both mark kinds; still read as the fallback.
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
    'hr-std-gemengd': MixedConstraints;
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
