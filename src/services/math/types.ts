export type ConstraintType = 'FREE' | 'REQUIRED' | 'FORBIDDEN';

export const isFraction = (val: unknown): val is Fraction =>
    typeof val === 'object' && val !== null && 'n' in val && 'd' in val;

export interface BridgeConstraints {
    units: ConstraintType;
    tens: ConstraintType;
    hundreds: ConstraintType;
}

export type LayoutPreset = 'inline-short' | 'inline-long' | 'stepped';

export interface Fraction {
    whole?: number; // geheel getal voor breuk
    n: number;      // Teller
    d: number;      // Noemer
}

export interface Equation {
    id: string;
    operands: (number | Fraction)[];
    operator: '+' | '-' | 'x' | ':';
    answer: number | Fraction; // we willen een getal of een breuk krijgen, voor de breuk roepen we het type van hierboven aan
    steps?: number[];
    isManuallyEdited: boolean;
    missingTerm?: 'result' | 'operand1' | 'operand2';
    remainder?: number;
}

export type FractionShape = 'rectangle' | 'square' | 'circle';

export type FractionSubType =
    | 'kleuren'
    | 'herkennen'
    | 'hoeveelheid'
    | 'hoeveelheid-rechthoek'
    | 'hoeveelheid-abstract'
    | 'lijnstuk'
    | 'veelhoek';

export interface FractionExercise {
    id: string;
    subType: FractionSubType;
    numerator: number;
    denominator: number;
    // Shape-based (kleuren, herkennen, tekenen)
    shape?: FractionShape;
    coloredIndices?: number[];
    gridRows?: number;
    gridCols?: number;
    // Amount-based (hoeveelheid, hoeveelheid-rechthoek)
    total?: number;
    objectShape?: 'circle' | 'square';
    // Line segment (lijnstuk)
    lineLength?: number;
    // Veelhoek grid rectangle
    rectangleWidth?: number;
    rectangleHeight?: number;
    isManuallyEdited: boolean;
}

export interface SplitsenExercise {
    id: string;
    total: number;
    pairs: Array<{ given: number; answer: number }>;
    // Place-value variants (positie-* layouts). One non-null set of these per item.
    placeBreakdown?: Array<{ key: string; label: string; digit: number; weight: number }>;
    blankSide?: 'legs' | 'top';                 // positie-benen: which side the pupil fills
    notation?: 'value' | 'letters';             // positie-benen: legs as 30 (value) vs 3T (letters)
    mathForm?: 'letters' | 'expanded';          // positie-math: 7H+9T+2E  vs  300+70+8
    mathDirection?: 'decompose' | 'compose';    // N=__+__+__  vs  __+__+__=N
    words?: string;                             // positie-tabel: Dutch number-word prompt
    blankPos?: 'top' | 'left' | 'right';        // splitsboom: which slot the pupil fills
    isManuallyEdited: boolean;
}

// Breuken bewerken — symbolic fraction work. One shape covers three subTypes:
//  gemengd        — improper↔mixed (direction set per item)
//  gelijknamig    — rewrite two fractions to a common (LCM) denominator
//  vereenvoudigen — reduce a fraction to lowest terms
export interface BreukBewerkExercise {
    id: string;
    subType: 'gemengd' | 'gelijknamig' | 'vereenvoudigen';
    direction?: 'naar-gemengd' | 'naar-breuk';   // gemengd: which way to convert
    inputs: Fraction[];     // the given fraction(s)
    answers: Fraction[];    // the target fraction(s) the pupil writes
    isManuallyEdited: boolean;
}

// #4 Ordenen — order a small set of numbers with < or >
export interface OrdenenExercise {
    id: string;
    values: (number | Fraction)[];   // ordered per operator (the answer)
    display: (number | Fraction)[];  // shuffled prompt shown on top
    operator: '<' | '>';
    isManuallyEdited: boolean;
}

// #2 Deelbaarheid — divisibility tick-table OR a multiples (veelvouden) fill-row
export interface DeelbaarheidExercise {
    id: string;
    number?: number;          // tabel layout: one number per row
    base?: number;            // veelvouden layout: the multiple base
    sequence?: number[];      // veelvouden: full multiples run
    givenCount?: number;      // veelvouden: how many shown before blanks
    isManuallyEdited: boolean;
}

// Plaatswaarde benoemen — name the value/place of a digit, or fill a place-value table
export interface PlaatswaardeExercise {
    id: string;
    number: number;
    placeKey: string;     // PLACE_VALUES key of the targeted digit (waarde/plaats)
    isManuallyEdited: boolean;
}

// Even en oneven — colour even/odd numbers in a grid, or pair circles
export interface EvenOnevenExercise {
    id: string;
    numbers?: number[];   // rooster: a row of numbers to colour
    number?: number;      // cirkels: one number drawn as circles
    isManuallyEdited: boolean;
}

// Romeinse cijfers — recognise (Roman→number) or write (number→Roman)
export interface RomeinseExercise {
    id: string;
    value: number;
    roman: string;
    isManuallyEdited: boolean;
}

// Afronden — round numbers (natural/decimal) to a place: a rooster of numbers × targets,
// or a single "getal ≈ ___" line.
export interface AfrondenExercise {
    id: string;
    number?: number;      // simpel view: the single number
    targetKey?: string;   // simpel view: which place to round to (T/H/D/TD or E/t/h)
    numbers?: number[];   // rooster view: the left-column numbers
    isManuallyEdited: boolean;
}

// Herleidingen — metric unit conversions (lengte/inhoud/massa). from/to are 1- or 2-part
// (compound), `blank` says whether the student fills the number(s) or the unit.
export interface HerleidingPart { key: string; value: number; }
export interface HerleidingExercise {
    id: string;
    format: 'enkel-getal' | 'enkel-eenheid' | 'samengesteld-enkel' | 'enkel-samengesteld' | 'vierkant-are' | 'are-vierkant';
    fromParts: HerleidingPart[];
    toParts: HerleidingPart[];
    blank: 'number' | 'unit';
    isManuallyEdited: boolean;
}

// Vergelijken — fill <, > or = between two numbers, or circle the largest/smallest
export interface VergelijkenExercise {
    id: string;
    a?: number;           // getallen view (numeric value, also used for comparison)
    b?: number;
    aFrac?: Fraction;     // representaties: set when that side is a breuk (rendered verbatim)
    bFrac?: Fraction;
    numbers?: number[];   // kiezen view
    target?: string;      // kiezen: 'grootste' | 'kleinste'
    isManuallyEdited: boolean;
}

// Meten — measure a line/polyline (lengte meten) or a shape's perimeter (omtrek).
// Coordinates are in cm so the viewer can draw genuinely to scale (1cm ≈ 37.8px).
export interface MeetPoint { x: number; y: number; }
export interface MeetExercise {
    id: string;
    kind: 'lijn' | 'veelhoek' | 'cirkel';
    shape?: string;             // omtrek shape key (driehoek/vierkant/…)
    points?: MeetPoint[];       // lijn = polyline, veelhoek = closed polygon (cm)
    sides?: number[];           // side lengths in draw order (cm)
    radius?: number;            // cirkel (cm)
    perimeter: number;          // answer: Σ sides, or π·d
    area?: number;              // oppervlakte: cm² (rooster count or l×b / ½·b·h)
    claim?: number;             // lengte-meten 'gegeven': stated length to judge
    claimCorrect?: boolean;     // whether the stated claim matches the real length
    isManuallyEdited: boolean;
}

// Getalpatronen — a row that follows an operation pattern from the left. The op between
// value i and i+1 is cycle[i % cycle.length]; `steps` = cycle length (1–4 repeating).
export interface PatroonStep { op: '+' | '-' | 'x' | ':'; operand: number; }
export interface PatroonExercise {
    id: string;
    values: number[];
    blankMask: boolean[];        // true = pupil fills this number
    cycle: PatroonStep[];
    numberType?: string;
    isManuallyEdited: boolean;
}

// Deelbaarheid (kleuren) — colour/circle the multiples of a divisor (+ optional remainder)
export interface DeelbaarheidKleurExercise {
    id: string;
    divisor: number;
    numbers: number[];
    cols?: number;               // raster: numbers laid out in a grid this wide
    isManuallyEdited: boolean;
}

// #6 Getallenas — a number line; pupil fills the blank ticks
export interface GetallenasExercise {
    id: string;
    start: number;
    step: number;
    tickCount: number;
    blankMask: boolean[];     // true = pupil fills this tick
    direction: 'left' | 'right';
    // Precomputed tick values L→R (source of truth for decimal/rational/geheel lines).
    values?: (number | Fraction)[];
    numberType?: string;      // natural | decimal | rational | geheel
    isManuallyEdited: boolean;
}

// #8 Temperatuur — thermometer: colour to a temp, read a coloured one, or the
// difference between two thermometers.
export type TemperatuurMode = 'gekleurd' | 'getal' | 'beide';
export interface TemperatuurExercise {
    id: string;
    celsius: number;
    variant: 'kleuren' | 'aflezen' | 'verschil';
    celsius2?: number;            // verschil: second thermometer
    mode1?: TemperatuurMode;      // verschil: what's given on each thermometer
    mode2?: TemperatuurMode;
    isManuallyEdited: boolean;
}

// Schattend rekenen — estimate a sum/difference/product by rounding both operands first.
export interface SchattendExercise {
    id: string;
    a: number;
    b: number;
    operator: '+' | '-' | 'x' | ':';
    targetKey: string;    // rounding place (afronden RoundTarget key: T/H/D or E/t)
    isManuallyEdited: boolean;
}

// Verbanden breuk · decimaal · procent — one benchmark value shown in one representation,
// the pupil fills the other(s). Decimal/percent are derived from the fraction (n/d).
export type VerbandRep = 'breuk' | 'decimaal' | 'procent';
export interface VerbandExercise {
    id: string;
    fraction: Fraction;
    given: VerbandRep;          // which representation is printed
    target?: VerbandRep;        // paren view: the single asked representation
    isManuallyEdited: boolean;
}

// Procenten — take a percent of a number, or express a part as a percent.
export interface ProcentExercise {
    id: string;
    percent: number;
    base: number;
    answer: number;       // nemen: percent van base · welk-percent: the part (answer = percent)
    isManuallyEdited: boolean;
}

// Maateenheid kiezen — pick/write the sensible unit (or measurement) for a real-world item.
export interface MaateenheidExercise {
    id: string;
    sentence: string;     // with '___' where the unit/measurement goes
    value: number;
    unit: string;         // correct unit symbol
    grootheid: string;    // lengte/massa/inhoud/tijd/temperatuur
    choices?: string[];   // omcirkelen: shuffled options incl. the correct one
    isManuallyEdited: boolean;
}

// Geld rekenen — korting/winst/intrest rooster rows. All money in cents (house convention).
export interface GeldRekenenExercise {
    id: string;
    subType: 'korting' | 'winst' | 'intrest';
    percent?: number;        // korting %, or intrest rentevoet
    priceCents?: number;     // korting: original price
    buyCents?: number;       // winst: aankoopprijs
    sellCents?: number;      // winst: verkoopprijs
    capitalCents?: number;   // intrest: kapitaal
    months?: number;         // intrest: looptijd in maanden (12 = 1 jaar)
    isManuallyEdited: boolean;
}

// Handig rekenen — compenseren (47 + 29 = 47 + 30 − 1) or splitsen (56 + 38 = 56 + 30 + 8).
export interface HandigExercise {
    id: string;
    a: number;
    b: number;
    operator: '+' | '-';
    strategy: 'compenseren' | 'splitsen';
    steps: [number, number];   // compenseren: [tienvoud, correctie] · splitsen: [T-deel, E-deel]
    answer: number;
    isManuallyEdited: boolean;
}

// Rekenvolgorde — expression printed verbatim from tokens (numbers + operators + haakjes).
export interface RekenvolgordeExercise {
    id: string;
    tokens: (number | string)[];
    answer: number;
    firstStep: number;       // value of the sub-expression that must be computed first
    isManuallyEdited: boolean;
}

// Functie van getallen — hoeveelheidsgetal / rangordegetal / maatgetal / codegetal.
export type GetalFunctie = 'hoeveelheid' | 'rang' | 'maat' | 'code';
export interface GetalFunctieExercise {
    id: string;
    sentence: string;
    number: string;          // as printed (codegetallen keep leading zeros / formats)
    functie: GetalFunctie;
    isManuallyEdited: boolean;
}

// Tijdsduur — begin/einde/duur row with one blank. Times as minutes since 00:00.
export interface TijdsduurExercise {
    id: string;
    startMin: number;
    endMin: number;          // may pass midnight (endMin > 1440 means next day)
    blank: 'duur' | 'einde' | 'begin';
    isManuallyEdited: boolean;
}

// Kalender — month-grid questions, date arithmetic, or notation conversion.
export interface KalenderExercise {
    id: string;
    subType: 'maandrooster' | 'datum-rekenen' | 'notatie';
    year: number;
    month: number;                                   // 0-based like JS Date
    questions?: { text: string; answer: string }[];  // maandrooster
    baseDate?: number;                               // datum-rekenen: day of month
    offsetDays?: number;                             // datum-rekenen: days ahead (may be negative)
    day?: number;                                    // notatie: the date to convert
    direction?: 'naar-cijfers' | 'naar-woorden';     // notatie
    isManuallyEdited: boolean;
}

// Controleren — negenproef cross for a worked ×, or verify via the inverse operation.
export interface ControleExercise {
    id: string;
    a: number;
    b: number;
    operator: '+' | '-' | 'x';
    shownAnswer: number;     // printed result (sometimes deliberately wrong)
    correctAnswer: number;
    isManuallyEdited: boolean;
}

// Weegschaal — kitchen-scale dial: read the needle (aflezen) or draw it (tekenen).
export interface WeegschaalExercise {
    id: string;
    grams: number;
    isManuallyEdited: boolean;
}

// Vormleer — punt/lijn, hoeken and vlakke figuren share one exercise shape; the
// viewer branches on `kind`. Coordinates in cm like MeetExercise.
export interface VormleerExercise {
    id: string;
    kind: 'punt-lijn' | 'hoek' | 'figuur';
    concept: string;             // 'rechte' | 'lijnstuk' | … | 'scherp' | … | 'ruit' | 'gelijkzijdig' | …
    points?: MeetPoint[];        // figuur: polygon (cm) · punt-lijn: endpoints
    labels?: string[];           // point letters (A, B, …)
    angleDeg?: number;           // hoek: opening in degrees
    rotation?: number;           // hoek/figuur: random rotation (deg)
    sides?: number[];            // figuur: side lengths (cm) for tick-mark grouping
    isManuallyEdited: boolean;
}

export interface MathBlock {
    id: string;
    typeId: string;
    locked?: boolean;
    pageBreakBefore?: boolean;   // force this set to start on a new printed page
    instructionText: string;
    layoutPreset: LayoutPreset;
    instructionMode: 'geen' | 'mag' | 'moet' | 'plus' | 'aangepast';
    customInstructionText?: string;
    steppedLines: number;
    numberOfExercises: number;
    totalPoints: number;
    // Intentionally `any`: a loose per-type bag read differently by each generator
    // (see ARCHITECTURE.md §6). Typing it would cascade casts across every plugin.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constraints: any;
    exercises: Equation[];
    clockExercises?: ClockExercise[];
    fractionExercises?: FractionExercise[];
    splitsenExercises?: SplitsenExercise[];
    cijferExercises?: CijferExercise[];
    geldExercises?: GeldExercise[];
    geldWisselExercises?: GeldWisselExercise[];
    geldTeruggevenExercises?: GeldTeruggevenExercise[];
    mabExercises?: MabExercise[];
    ordenenExercises?: OrdenenExercise[];
    breukBewerkExercises?: BreukBewerkExercise[];
    deelbaarheidExercises?: DeelbaarheidExercise[];
    getallenasExercises?: GetallenasExercise[];
    patroonExercises?: PatroonExercise[];
    deelbaarheidKleurExercises?: DeelbaarheidKleurExercise[];
    meetExercises?: MeetExercise[];
    temperatuurExercises?: TemperatuurExercise[];
    plaatswaardeExercises?: PlaatswaardeExercise[];
    evenOnevenExercises?: EvenOnevenExercise[];
    vergelijkenExercises?: VergelijkenExercise[];
    afrondenExercises?: AfrondenExercise[];
    romeinseExercises?: RomeinseExercise[];
    herleidingExercises?: HerleidingExercise[];
    schattendExercises?: SchattendExercise[];
    verbandExercises?: VerbandExercise[];
    procentExercises?: ProcentExercise[];
    maateenheidExercises?: MaateenheidExercise[];
    geldRekenenExercises?: GeldRekenenExercise[];
    handigExercises?: HandigExercise[];
    rekenvolgordeExercises?: RekenvolgordeExercise[];
    getalFunctieExercises?: GetalFunctieExercise[];
    tijdsduurExercises?: TijdsduurExercise[];
    kalenderExercises?: KalenderExercise[];
    controleExercises?: ControleExercise[];
    weegschaalExercises?: WeegschaalExercise[];
    vormleerExercises?: VormleerExercise[];
    verticalSpacing: number;
}

export interface ClockExercise {
    id: string;
    hours: number;        // 1-12 (12h mode) or 0-23 (24h mode)
    minutes: number;      // 0-59
    timeText: string;     // "kwart over 3", "25 voor 1"
    digitalText: string;  // "03:15"
    isManuallyEdited: boolean;
}

export interface FooterData {
    school: string;
    klas: string;
    leerkracht: string;
    showSchool: boolean;
    showKlas: boolean;
    showLeerkracht: boolean;
    showPagina: boolean;
    centerText: string;
    showCenterText: boolean;
}

export type ScaffoldingLevel = 1 | 2 | 3;
export type CijferOperator = '+' | '-' | 'x' | ':';

export interface CijferConstraints {
    operator: CijferOperator;
    numberType: 'natural' | 'decimal';
    maxRange: number;
    decimalPlaces: 1 | 2 | 3;
    withEstimation: boolean;
    scaffolding: ScaffoldingLevel;
    withRemainder: boolean;
    numberOfTerms: number;
    gridCellSize: number;
    operand0Mask: Record<string, boolean>;
    operand1Mask: Record<string, boolean>;
    operand2Mask: Record<string, boolean>;
    operand3Mask: Record<string, boolean>;
    bridges: Record<string, 'FREE' | 'REQUIRED' | 'FORBIDDEN'>;
    extraCols: number;
    extraRows: number;
    showQR?: boolean;
}

export type GeldDenominationType = 'bill' | 'euro-coin' | 'cent-coin';

export interface GeldDenomination {
    valueCents: number;
    type: GeldDenominationType;
    count: number;
}

export interface GeldExercise {
    id: string;
    amountCents: number;
    denominations: GeldDenomination[];
    isManuallyEdited: boolean;
}

export interface GeldWisselExercise {
    id: string;
    billValueCents: number;
    isManuallyEdited: boolean;
}

export interface GeldTeruggevenExercise {
    id: string;
    priceCents: number;      // "Je moet X betalen"
    payWithCents: number;    // "Je betaalt met Y" — always a clean denomination
    changeCents: number;     // = payWith - price
    waypointCents: number;   // next whole euro above price (e.g. 2375 → 2400)
    step1Cents: number;      // price → waypoint (always < 100, i.e. cents part)
    step2Cents: number;      // waypoint → payWith (always whole euros)
    isManuallyEdited: boolean;
}

export interface CijferExercise {
    id: string;
    operands: number[];
    operator: CijferOperator;
    answer: number;
    remainder: number;
    isManuallyEdited: boolean;
}

export type MabStyle = 'symbolic' | 'mab-bw' | 'mab-color';
export type MabScaffolding = 'positietabel' | 'kader' | 'geen';

export interface MabExercise {
    id: string;
    value: number;
    // Place-value digit breakdown; thousands present only when maxNumber === 1000.
    thousands: number;
    hundreds: number;
    tens: number;
    units: number;
    isManuallyEdited: boolean;
}

// ── Per-family constraint shapes ─────────────────────────────────────────────
// MathBlock.constraints stays `any` (blocks are heterogeneous); these interfaces
// type the registry's default-constraint factories and let config plugins cast.
// They describe the DEFAULT key set per family — generators may read extra
// optional keys, so all are loose supersets, not exhaustive contracts.

type PlaceMask = Record<string, boolean>;
type NumberType = 'natural' | 'decimal' | 'rational';

// Mental-math: optellen / aftrekken (mathEngine addition/subtraction).
export interface AddSubConstraints {
    numberType: NumberType;
    decimalPlaces: number;
    maxGetal: number;
    bridges: Record<string, ConstraintType>;
    operand1Mask: PlaceMask;
    operand2Mask: PlaceMask;
    equationType?: 'normal' | 'puntoefening';
    // Rational (fraction) sub-settings.
    fractionDifficulty?: string;
    mixedNumber1?: boolean;
    mixedNumber2?: boolean;
    maxNumerator1?: number;
    maxDenominator1?: number;
    maxNumerator2?: number;
    maxDenominator2?: number;
    linkFractions?: boolean;
}

// Mental-math: vermenigvuldigen / delen (mathEngine multiplication/division).
export interface MulDivConstraints extends AddSubConstraints {
    multiplicationMode?: 'tafels' | 'vrij';
    selectedTables?: number[];
    tableLimit?: number;
    fractionMultMode?: string;
    fractionOrderMode?: string;
    divisionLevel?: number;
    metRestLevel?: number;
}

export interface ClockConstraints {
    clockType: 'analoog' | 'digitaal';
    exerciseMode: string;
    is24hour: boolean;
    timeTypes: string[];
    minuteDirection: string;
    handChoice: string;
}

export interface FractionConstraints {
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
    maxDimension: number;
    maxAbstractN3: number;
    showGrid?: boolean;                // veelhoek: draw the 1cm background grid (default true)
}

export interface SplitsenConstraints {
    maxGetal: number;
    operand1Mask: PlaceMask;
    operand2Mask: PlaceMask;
    fixedTotal: number | null;
    layout: string;
    rowsPerBox: number;
    rowHeight: number;
}

export interface GeldConstraints {
    maxGetal: number;
    format: string;
    scaffolding: string;
    geldLayout: 'samen' | 'gescheiden';
    showVoorbeelden: boolean;
    voorbeeldTypes: number[];
    exercisesPerRow: number | null;
    allowedDenominations: number[];
    boxHeight: number;
}

export interface GeldWisselConstraints {
    exerciseBills: number[];
    exercisesPerRow: number;
    boxHeight: number;
}

export interface GeldTeruggevenConstraints {
    minPriceEuros: number;
    maxPriceEuros: number;
    payWithOptions: number[];
    centenDeel: string;
    scaffolding: string;
    antwoordType: string;
    antwoordFormat: string;
    betalenMetTekening: boolean;
    boxHeight: number;
}

export interface MabConstraints {
    mabStyle: MabStyle;
    maxNumber: number;
    operand1Mask: PlaceMask;
    scaffolding: MabScaffolding;
    exercisesPerRow: number;
    boxHeight: number;
    answerHeight: number;
}