// ── Constraint option space ──────────────────────────────────────────────────
// For every exercise typeId: the set of values each constraint key can actually take
// in the UI. This is what lets one test sweep every generator across every setting a
// teacher can reach, instead of only the defaults.
//
// SYNC: mirrors the option lists in the config plugins
// (src/components/configurator/plugins/**) and the leaf defaultConstraints in
// appstructure.ts. A picker option added there must be added here, or the matrix
// stops covering it. Where a key is a free numeric (a slider, a count), three values
// are listed: minimum, default, maximum.
//
// Max-number lists are NOT mirrored: they come from numberRanges.ts, the same lists the
// plugins render. A space is flat, so a type whose config switches lists (by numberType,
// layout, mode) gets the union of every list it can show.
//
// Keys deliberately left out: pure cosmetics that no generator reads (boxHeight,
// exercisesPerRow, gridCellSize, tableCellW/H, …) and per-block layout fields that
// live on MathBlock rather than in constraints.

import { RANGES, HERLEIDINGEN_ENKEL } from './numberRanges';

export type OptionSpace = Record<string, unknown[]>;

// Every list a config can show for one key, sorted and deduped (flat space, see header).
const union = (...lists: ReadonlyArray<readonly number[]>): number[] =>
    [...new Set(lists.flat())].sort((a, b) => a - b);

const NUMBER_TYPES = ['natural', 'decimal', 'rational', 'geheel'];
const OPS = ['+', '-', 'x', ':'];

// Place keys: 'E' = eenheden (units), 'T' = tientallen (tens), 'H' = honderdtallen,
// 'M' = miljoenen, 'TM' / 'HM' = tien- / honderdmiljoenen (PLACE_VALUES in mathEngine.ts).
// A bridge is the Dutch 'bruggetje' — a carry/borrow across a place boundary.
const BRIDGE_SETS = [
    {},
    { E: 'FREE', T: 'FREE' },
    { E: 'REQUIRED' },
    { E: 'FORBIDDEN' },
    { E: 'REQUIRED', T: 'REQUIRED' },
    { E: 'FORBIDDEN', T: 'FORBIDDEN' },
    // Big-place cases: pairwise meets them with a small max too, where they must under-produce, not throw.
    { TM: 'REQUIRED' },
];
const MASKS = [{}, { E: true }, { T: true, E: true }, { M: true, E: true }, { HM: true }];
// Decimal places too ('t' = tienden, 'h' = honderdsten); on a natural block they are stale and ignored.
const DEC_MASKS = [{}, { E: true }, { T: true }, { t: true }, { E: true, h: true }];

// hoofdrekenen: AdditionConfig/SubtractionConfig + addition/{Natural,Decimal,Rational}Settings
// + HrPresetRow. All four operations share one plugin family and one defaults factory.
const hrShared: OptionSpace = {
    numberType: NUMBER_TYPES,
    // addition/NaturalSettings + DecimalSettings; x/: override it below.
    maxGetal: union(RANGES.hrNatural, RANGES.decimal),
    decimalPlaces: [1, 2, 3],
    bridges: BRIDGE_SETS,
    operand1Mask: MASKS,
    operand2Mask: MASKS,
    termCount: [2, 3, 4],
    // addition/NaturalSettings per-term rows: a ceiling per term (null = vrij) and a mask per term.
    operandMax: [[], [50], [null, 30], [20, 20, 20, 20]],
    operandMasks: [[], [{}, {}, { H: true }], [{ E: true }, { T: true }, { E: true }, { E: true }]],
    equationType: ['normal', 'puntoefening'],
    // HrStdStyleConfig: 'one_step' = ongelijknamig (eenvoudig), 'multi_step' = (moeilijk).
    fractionDifficulty: ['same', 'one_step', 'multi_step'],
    mixedNumber1: [false, true],
    mixedNumber2: [false, true],
    maxNumerator1: [5, 10, 20],
    maxDenominator1: [4, 10, 20],
    // RationalSettings' second operand row when the fractions are not linked.
    maxNumerator2: [1, 10, 20],
    maxDenominator2: [2, 4, 10, 20],
    linkFractions: [true, false],
};

const hrAddSub: OptionSpace = {
    ...hrShared,
    preset: ['vrij', 'compenseren'],
    presetDistance: [1, 2],
};

const hrMulDiv: OptionSpace = {
    ...hrShared,
    // 'andere' mode, decimal and the tienvoud preset each have their own list.
    maxGetal: union(RANGES.hrAndere, RANGES.decimal, RANGES.hrTienvoud),
    // MultiplicationConfig + multiplication/NaturalSettings
    multiplicationMode: ['tafels', 'met_rest', 'andere'],
    selectedTables: [[2, 3, 4, 5, 10], [7], [0, 1, 2, 11, 12, 25, 50, 75]],
    tableLimit: [10, 20, 50, 100],
    fractionMultMode: ['natural_fraction', 'fraction_fraction', 'decimal_fraction'],
    fractionOrderMode: ['AB', 'BA', 'beide'],
    preset: ['vrij', 'tienvoud'],
    presetFactors: [[10], [10, 100, 1000]],
    excludeOne: [false, true],
    // multiplication/NaturalSettings 'Met rest' niveau and the 'andere' delen niveaus (N1-N6).
    metRestLevel: [1, 2, 3],
    divisionLevels: [[], [1], [6], [1, 2, 3, 4, 5, 6]],
};

// GemengdConfig — one block that mixes variants (operator + optional preset). The leaves
// offer natural/decimal only, and the preset lives in the variant id rather than in a
// `preset` key, so this space is hrShared minus rational/geheel plus the mix controls.
const hrMixed: OptionSpace = {
    ...hrShared,
    numberType: ['natural', 'decimal'],
    variants: [
        ['+'],
        ['+', '-'],
        ['x', ':'],
        ['+', '+:compenseren'],
        ['x', 'x:tienvoud'],
        ['+', '-', 'x', ':'],
        ['+', '+:compenseren', '-', '-:compenseren', 'x', 'x:tienvoud', ':', ':tienvoud'],
    ],
    mix: ['random', 'cycle'],
    // Sparse tab overrides: only what a teacher changed inside one variant's tab.
    perVariant: [
        {},
        { x: { selectedTables: [7] } },
        { '+': { maxGetal: 20 }, ':': { tableLimit: 5 } },
        { x: { multiplicationMode: 'andere' }, ':': { multiplicationMode: 'met_rest', selectedTables: [7], metRestLevel: 3 } },
    ],
};

// CijferConfig — column arithmetic. `operator` + `numberType` come from the sidebar leaf.
const cijferSpace: OptionSpace = {
    operator: OPS,
    numberType: ['natural', 'decimal'],
    maxRange: union(RANGES.cijferNatural, RANGES.cijferDecimal),
    decimalPlaces: [1, 2, 3],
    withEstimation: [false, true],
    withRemainder: [false, true],
    numberOfTerms: [2, 3, 4],
    scaffolding: [0, 3],
    bridges: BRIDGE_SETS,
    // 'Specifieke getalopbouw' per getal: operand0Mask = Getal 1, operand1Mask = Getal 2, …
    operand0Mask: DEC_MASKS,
    operand1Mask: DEC_MASKS,
    operand2Mask: [{}, { T: true }],
};

const clockSpace: OptionSpace = {
    clockType: ['analoog', 'digitaal'],
    exerciseMode: ['lezen', 'tekenen', 'omzetten'],
    is24hour: [false, true],
    timeTypes: [
        ['uren'],
        ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'],
        ['nauwkeurig_5'],
        ['nauwkeurig_1'],
        ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor', 'nauwkeurig_5', 'nauwkeurig_1'],
    ],
    minuteDirection: ['over', 'voor', 'beide'],
    handChoice: ['uur', 'minuut', 'beide'],
};

const fractionSpace: OptionSpace = {
    subType: ['kleuren', 'herkennen', 'hoeveelheid', 'hoeveelheid-rechthoek', 'hoeveelheid-abstract', 'lijnstuk', 'veelhoek'],
    shapes: [['rectangle'], ['circle'], ['rectangle', 'circle']],
    objectShape: ['circle', 'square'],
    minDenominator: [2, 3],
    maxDenominator: [4, 8, 12],
    answerFormat: ['fraction-questions', 'met-hulp', 'met-berekening'],
    answerMode: ['berekeningslijnen', 'structuurlijnen', 'blanco'],
    level: [1, 2],
    // 2 sits below a noemer of 3: the edge where no multiple of the noemer fits.
    maxTotal: [2, 10, 20, 60],
    maxAbstractN3: [100, 1000],
    minLineLength: [2, 4],
    maxLineLength: [8, 12, 20],
    staticSize: [false, true],
    showGrid: [true, false],
};

// SplitsenConfig — 'splitsen' = decomposing a number into parts (7 → 3 + 4).
const splitsenSpace: OptionSpace = {
    layout: ['basic', 'splitsboom', 'verliefde-harten', 'positie-tabel', 'positie-benen', 'positie-math'],
    maxGetal: union(RANGES.splitsenBasis, RANGES.splitsenBoom, RANGES.splitsenHarten, RANGES.splitsenTabel, RANGES.splitsenPositie),
    fixedTotal: [null, 10],
    rowsPerBox: [1, 4, 8],
    blankPositions: [['right'], ['left'], ['top'], ['left', 'right', 'top']],
    benenVariants: [['legs-letters'], ['legs-numbers'], ['legs-letters', 'legs-numbers']],
    mathForms: [['letters'], ['expanded'], ['letters', 'expanded']],
    mathDirection: ['decompose', 'compose', 'beide'],
    mathOrder: ['volgorde', 'gehusseld'],
    operand1Mask: MASKS,
};

const geldSpace: OptionSpace = {
    maxGetal: union(RANGES.geld),
    format: ['euros', 'decimaal'],
    scaffolding: ['invullen', 'zelf-schrijven', 'eenvoudig', 'verdeeld'],
    geldLayout: ['samen', 'gescheiden'],
    allowedDenominations: [
        [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5],
        [200, 100, 50, 20, 10, 5],
        // Degenerate pickers a teacher can still click: nothing ticked, one coin, one big bill.
        [],
        [5],
        [50000],
    ],
};

const geldWisselSpace: OptionSpace = {
    exerciseBills: [[500], [500, 1000], [2000, 5000, 10000]],
};

const geldTeruggevenSpace: OptionSpace = {
    minPriceEuros: [1],
    maxPriceEuros: [9, 49, 99, 999],
    payWithOptions: [[500], [1000], [1000, 2000, 5000], [5000, 10000, 20000, 50000]],
    centenDeel: ['vijfentwintig', 'tien', 'vijf'],
    scaffolding: ['ingevuld', 'leeg'],
    antwoordType: ['schrijven', 'tekenen-schrijven'],
    antwoordFormat: ['euro-cent', 'decimaal'],
    betalenMetTekening: [false, true],
};

// MAB = Dienes place-value blocks.
const mabSpace: OptionSpace = {
    mabStyle: ['symbolic', 'mab-bw', 'mab-color'],
    maxNumber: union(RANGES.mab),
    scaffolding: ['positietabel', 'kader', 'geen'],
    operand1Mask: MASKS,
};

const ordenenSpace: OptionSpace = {
    numberType: NUMBER_TYPES,
    count: [2, 3, 5],
    operatorMode: ['oplopend', 'aflopend', 'beide'],
    maxGetal: union(RANGES.ordenen),
    decimalPlaces: [1, 2, 3],
    numberMask: [{}, { E: true }, { D: true }, { T: true, t: true }],
    unitFractionsOnly: [false, true],
    allowMixed: [false, true],
    answerStyle: ['lijn', 'vak'],
};

const breukBewerkSpace: OptionSpace = {
    subType: ['gemengd', 'gelijknamig', 'vereenvoudigen'],
    direction: ['naar-gemengd', 'naar-breuk', 'beide'],
    // 6 meets maxDenominator 6: the 'van X tot X' range.
    minDenominator: [2, 3, 6],
    maxDenominator: [6, 10, 20],
    maxNumerator: [1, 2, 5, 10, 30],
    tablesOnly: [true, false],
    allowIrreducible: [false, true],
    // 'Vaste gemeenschappelijke noemer' ('' = the KGV).
    targetDen: ['', 2, 7, 12],
};

const breukenRangschikkenSpace: OptionSpace = {
    fractionMode: ['stambreuken', 'gelijknamige', 'gelijknamig-te-maken', 'speciale'],
    count: [2, 4, 5],
    operatorMode: ['oplopend', 'aflopend', 'beide'],
    minDenominator: [2, 3],
    maxDenominator: [6, 10, 20],
    answerStyle: ['lijn', 'vak'],
};

const patroonSpace: OptionSpace = {
    numberType: ['natural', 'decimal', 'geheel'],
    maxGetal: union(RANGES.patronen),
    ticks: [4, 6, 10],
    steps: [1, 2, 3, 4],
    ops: [['+'], ['-'], ['x'], [':'], ['+', '-'], ['+', '-', 'x', ':']],
    // PatroonConfig per-operator rows: 'Stap (max)' plus an optional getalopbouw mask for + / −.
    opSettings: [
        {},
        { '+': { max: 50, mask: { H: true, T: true } } },
        { '+': { max: 1, mask: {} }, '-': { max: 5, mask: { E: true } } },
        { x: { max: 3, mask: {} }, ':': { max: 12, mask: {} } },
    ],
    maxDecimals: [1, 2],
    showArrows: [false, true],
    showOperators: [false, true],
    operatorStyle: ['symbol', 'full'],
};

const kettingSpace: OptionSpace = {
    numberType: ['natural'],
    maxGetal: union(RANGES.ketting),
    chainLength: [3, 4, 5],
    ops: [['+'], ['+', '-'], ['x'], [':'], ['+', '-', 'x', ':']],
    // KettingConfig 'max' per + / − operator.
    opSettings: [{}, { '+': { max: 10 }, '-': { max: 10 } }, { '+': { max: 50 }, '-': { max: 50 } }],
    blankMiddle: [false, true],
    showArrows: [true, false],
    operatorStyle: ['symbol', 'full'],
};

const deelbaarheidSpace: OptionSpace = {
    layout: ['tabel', 'veelvouden'],
    divisors: [[2], [2, 5, 10], [3, 4, 6, 9, 25, 50, 100]],
    maxGetal: union(RANGES.deelbaarheid),
    base: [2, 9, 25],
    terms: [3, 6, 12],
    givenCount: [1, 2, 4],
};

const deelbaarheidKleurSpace: OptionSpace = {
    viewMode: ['strip', 'markeren'],
    rasterVorm: ['lijn', 'rechthoek'],
    divisors: [[2], [2, 5, 10], [3, 7, 11, 12]],
    maxGetal: union(RANGES.deelbaarheidKleurStrook, RANGES.deelbaarheidKleurRaster),
    perRow: [5, 10],
    rasterCount: [100, 1000],
    rasterCols: [10],
    showRest: [false, true],
};

const getallenasSpace: OptionSpace = {
    numberType: NUMBER_TYPES,
    maxGetal: union(RANGES.getallenas),
    step: [1, 2, 5, 10, 25, 50, 100, 0.1, 0.5],
    direction: ['right', 'left', 'beide'],
    hardMode: [false, true],
    ticks: [4, 5, 6, 7, 8, 9, 10],
    // Ondergrens (gehele getallen only; the other number types ignore it).
    minGetal: [0, -50, -1000],
};

const getallenrijSpace: OptionSpace = {
    ...getallenasSpace,
    maxGetal: union(RANGES.getallenrijen, RANGES.getallenrijenDecimal),
    numberMask: MASKS,
    fractionStep: [2, 4, 10],
    maxTeller: [1, 3, 10, 25],
    showFrame: [true, false],
};

const metenSpace: OptionSpace = {
    measureModel: ['meten', 'gegeven'],
    precision: ['cm', 'mm'],
    minLength: [2, 3],
    // 2 is the slider's low edge, where the fixed-size shapes (trapezium, cirkel) overshoot.
    maxLength: [2, 6, 10, 18],
    maxCorners: [0, 1, 2, 3, 4],
    perSideScaffold: [false, true],
    answerMode: ['single', 'sum'],
    answerUnit: ['cm', 'plain'],
    shapes: [
        ['driehoek'],
        ['driehoek', 'rechthoek', 'vierkant'],
        ['cirkel'],
        ['ruit', 'parallellogram', 'trapezium'],
        ['rechthoek'],
    ],
};

const oppervlakteSpace: OptionSpace = {
    subType: ['rooster', 'berekenen'],
    shapes: [['rechthoek'], ['rechthoek', 'vierkant'], ['l-figuur'], ['rechthoekige-driehoek']],
    minLength: [2, 3],
    maxLength: [3, 4, 5, 8, 12],
    askOmtrek: [false, true],
    scaffoldFormule: [true, false],
};

const temperatuurSpace: OptionSpace = {
    variant: ['kleuren', 'aflezen', 'verschil'],
    includeNegatives: [false, true],
    mode1: ['gekleurd', 'getal'],
    mode2: ['gekleurd', 'getal'],
};

const plaatswaardeSpace: OptionSpace = {
    subType: ['waarde', 'plaats', 'tabel', 'omcirkelen'],
    maxGetal: union(RANGES.plaatswaarde),
    numberMask: MASKS,
    decimalPlaces: [0, 1, 2, 3],
};

const evenOnevenSpace: OptionSpace = {
    subType: ['rooster', 'cirkels'],
    maxGetal: union(RANGES.evenOneven),
    target: ['even', 'oneven'],
    perRow: [5, 10],
};

const vergelijkenSpace: OptionSpace = {
    subType: ['getallen', 'kiezen', 'representaties'],
    maxGetal: union(RANGES.vergelijken, RANGES.vergelijkenRepresentaties),
    numberMask: MASKS,
    chooseTarget: ['grootste', 'kleinste'],
    setSize: [2, 4, 6],
    decimalPlaces: [0, 1, 2],
    leftRep: ['breuk', 'kommagetal', 'plaatswaarde', 'woorden'],
    rightRep: ['breuk', 'kommagetal', 'plaatswaarde', 'woorden'],
    // representaties: per-side getalopbouw (the breuk side has its own teller/noemer caps).
    leftMask: [{}, { T: true }, { E: true, t: true }],
    rightMask: [{}, { T: true }, { E: true, t: true }],
};

const afrondenSpace: OptionSpace = {
    subType: ['rooster', 'simpel'],
    numberType: ['natural', 'decimal'],
    maxGetal: union(RANGES.afrondenNatural, RANGES.decimal),
    numberMask: MASKS,
    // Mrd is inclusive (offered AT 1e9), so it gets its own row; the millions ride together.
    roundTargets: [['T'], ['H'], ['T', 'H'], ['E'], ['E', 't'], ['Mrd'], ['M', 'TM', 'HM', 'Mrd']],
    roosterSize: [3, 6, 12],
    decimalPlaces: [1, 2, 3],
};

const romeinseSpace: OptionSpace = {
    subType: ['herkennen', 'schrijven'],
    niveau: [1, 2, 3, 4],
};

const herleidingenSpace: OptionSpace = {
    measure: ['lengte', 'inhoud', 'massa', 'oppervlakte'],
    maxEnkel: [HERLEIDINGEN_ENKEL.min, 100, HERLEIDINGEN_ENKEL.max],
    maxSamengesteld: union(RANGES.herleidingenSamengesteld),
    formats: [
        ['enkel-getal'],
        ['enkel-eenheid'],
        ['samengesteld-enkel'],
        ['enkel-samengesteld'],
        ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'],
    ],
    compoundMode: ['2', 'volledig'],
    areMode: ['enkel', 'samengesteld'],
    writeUnits: [false, true],
    scaffolding: ['geen', 'tabel-headers', 'tabel-blanco'],
    herleidingLayout: ['uitlijnen', 'vrij'],
};

const schattendSpace: OptionSpace = {
    operators: [['+'], ['-'], ['x'], [':'], ['+', '-'], ['+', '-', 'x', ':']],
    numberType: ['natural', 'decimal'],
    maxGetal: union(RANGES.schattendNatural, RANGES.decimal),
    decimalPlaces: [1, 2, 3],
    roundTargets: [['T'], ['H'], ['D'], ['T', 'H'], ['E'], ['t'], ['h']],
    scaffolding: ['tussenstappen', 'enkel-schatting'],
    answerLine: ['kort', 'lang'],
};

const verbandenSpace: OptionSpace = {
    subType: ['tabel', 'paren'],
    reps: [['breuk', 'decimaal'], ['breuk', 'procent'], ['breuk', 'decimaal', 'procent']],
    denominators: [[2], [2, 4, 5, 10, 100], [8, 20, 25]],
    given: ['random', 'breuk', 'decimaal', 'procent'],
};

const procentenSpace: OptionSpace = {
    subType: ['nemen', 'welk-percent'],
    percents: [[10], [10, 25, 50], [1, 5, 20, 75, 100], [1], [5], [100], [1, 5, 10, 20, 25, 50, 75, 100]],
    maxGetal: union(RANGES.procenten),
    scaffold: [false, true],
};

const maateenheidSpace: OptionSpace = {
    grootheden: [['lengte'], ['massa'], ['inhoud'], ['tijd'], ['temperatuur'], ['lengte', 'massa', 'inhoud', 'tijd', 'temperatuur']],
    answerMode: ['omcirkelen', 'schrijven'],
    subType: ['eenheid', 'schatten'],
};

const geldRekenenSpace: OptionSpace = {
    subType: ['korting', 'winst', 'intrest'],
    percents: [[5], [10, 25, 50], [1, 2, 3, 4, 5, 10, 20, 75]],
    maxEuro: union(RANGES.geldRekenen),
    wholeEuros: [true, false],
    halfYear: [false, true],
};

const rekenvolgordeSpace: OptionSpace = {
    operators: [['+', '-'], ['+', '-', 'x'], ['+', '-', 'x', ':'], ['x'], [':'], ['x', ':']],
    haakjesMode: ['GEEN', 'MAG', 'MOET'],
    opsCount: [2, 3, 4],
    maxGetal: union(RANGES.rekenvolgorde),
    tableLimit: [10, 20],
};

const getalfunctieSpace: OptionSpace = {
    functies: [['hoeveelheid'], ['rang'], ['maat'], ['code'], ['hoeveelheid', 'rang', 'maat', 'code']],
    answerMode: ['aankruisen', 'schrijven'],
    // No picker: only the base seed reaches this key, so sample low / default / high.
    maxGetal: [100, 1000, 10000],
};

const tijdsduurSpace: OptionSpace = {
    granularity: [['heel-uur'], ['kwartier'], ['vijf-min'], ['een-min'], ['heel-uur', 'kwartier', 'vijf-min', 'een-min']],
    blanks: [['duur'], ['einde'], ['begin'], ['duur', 'einde', 'begin']],
    maxDuurMin: [60, 240, 720],
    overMidnight: [false, true],
};

const kalenderSpace: OptionSpace = {
    subType: ['maandrooster', 'datum-rekenen', 'notatie'],
    questionTypes: [['dag-van-datum'], ['datum-van-dag'], ['tellen'], ['dag-van-datum', 'datum-van-dag', 'tellen']],
    questionCount: [1, 5, 10],
    month: ['random', 0, 1, 11],
    year: [2024, 2026],
};

const controlerenSpace: OptionSpace = {
    subType: ['negenproef', 'omgekeerde'],
    operators: [['+'], ['-'], ['+', '-']],
    maxGetal: union(RANGES.controleren),
    foutAandeel: ['geen', 'helft', 'alles'],
    showKruis: [true, false],
};

const weegschaalSpace: OptionSpace = {
    mode: ['aflezen', 'kleuren'],
    bereikGram: [1000, 2000, 5000],
    // Snapped to the bereik by the generator; the plugin only offers the legal steps.
    stepGram: [20, 50, 100, 250],
    notatie: ['g', 'kg-komma', 'kg-g'],
};

const vormleerSpace: OptionSpace = {
    kind: ['punt-lijn', 'hoek', 'figuur'],
    mode: ['herkennen', 'benoemen', 'eigenschappen', 'meten', 'tekenen'],
    answerMode: ['woordbank', 'schrijven'],
    classify: ['vierhoeken', 'driehoeken'],
    concepts: [
        ['punt', 'rechte', 'halfrechte', 'lijnstuk'],
        // Include punt/lijnstuk so niveau 2/3 also exercises the 'ligt-op' relation.
        ['punt', 'lijnstuk', 'evenwijdig', 'snijdend', 'loodrecht'],
        ['scherp', 'recht', 'stomp', 'gestrekt'],
        ['vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium'],
        ['scherphoekig', 'rechthoekig', 'stomphoekig', 'gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'],
    ],
    randomRotation: [false, true],
    showBoog: [true, false],
    rightAngleStyle: ['vierkantje', 'haakje'],
    raster: [true, false],
    // punt-lijn herkennen/tekenen difficulty tier (same meaning in both modes).
    niveau: [1, 2, 3],
    showHulplijn: [true, false],
    // Stand-pills: rechten/lijnstukken/halfrechten may be drawn truly flat.
    allowHorizontaal: [false, true],
    allowVerticaal: [false, true],
    // hoeken tekenen: name the requested angle (hoek ABC).
    nameAngles: [true, false],
};

// Sheet furniture: no generator, but the packer's height estimate reads these.
const layoutSpace: Record<string, OptionSpace> = {
    'layout-sectie': { title: ['', 'Onthoud'], rule: ['lijn', 'geen'] },
    'layout-schrijflijnen': { lineCount: [1, 6, 20], lineSpacing: [6, 10, 16], lineStyle: ['enkel', 'dubbel'] },
    'layout-raster': { cellMm: [5, 10, 20], rows: [1, 8, 20] },
    'layout-kader': { title: ['Onthoud'], body: ['', 'een\ntwee'], emphasis: ['kader', 'geen'] },
    'layout-lege-pagina': {},
};

export const CONSTRAINT_SPACE: Record<string, OptionSpace> = {
    'hr-std-optellen': hrAddSub,
    'hr-std-aftrekken': hrAddSub,
    'hr-std-vermenigvuldigen': hrMulDiv,
    'hr-std-delen': hrMulDiv,
    'hr-std-gemengd': hrMixed,

    'cijferen-optellen-nat': cijferSpace,
    'cijferen-optellen-dec': cijferSpace,
    'cijferen-aftrekken-nat': cijferSpace,
    'cijferen-aftrekken-dec': cijferSpace,
    'cijferen-vermenigvuldigen-nat': cijferSpace,
    'cijferen-vermenigvuldigen-dec': cijferSpace,
    'cijferen-delen-nat': cijferSpace,
    'cijferen-delen-dec': cijferSpace,

    'klok-kloklezen': clockSpace,
    'breuken': fractionSpace,
    'splitsen': splitsenSpace,

    'geld-herkennen': geldSpace,
    'geld-tekenen': geldSpace,
    'geld-wissel': geldWisselSpace,
    'geld-teruggeven': geldTeruggevenSpace,

    'mab-herkennen': mabSpace,
    'mab-tekenen': mabSpace,

    'ordenen': ordenenSpace,
    'breuken-bewerken': breukBewerkSpace,
    'breuken-rangschikken': breukenRangschikkenSpace,
    'deelbaarheid': deelbaarheidSpace,
    'getalpatronen': patroonSpace,
    'kettingsommen': kettingSpace,
    'deelbaarheid-kleuren': deelbaarheidKleurSpace,
    'getallenas': getallenasSpace,
    'getallenrijen': getallenrijSpace,
    'lengte-meten': metenSpace,
    'omtrek': metenSpace,
    'oppervlakte': oppervlakteSpace,
    'temperatuur': temperatuurSpace,
    'plaatswaarde': plaatswaardeSpace,
    'even-oneven': evenOnevenSpace,
    'vergelijken': vergelijkenSpace,
    'afronden': afrondenSpace,
    'romeinse-cijfers': romeinseSpace,
    'herleidingen': herleidingenSpace,
    'schattend': schattendSpace,
    'verbanden': verbandenSpace,
    'procenten': procentenSpace,
    'maateenheid': maateenheidSpace,
    'geld-rekenen': geldRekenenSpace,
    'rekenvolgorde': rekenvolgordeSpace,
    'getalfunctie': getalfunctieSpace,
    'tijdsduur': tijdsduurSpace,
    'kalender': kalenderSpace,
    'controleren': controlerenSpace,
    'weegschaal': weegschaalSpace,
    'vormleer-punt-lijn': vormleerSpace,
    'vormleer-hoeken': vormleerSpace,
    'vormleer-figuren': vormleerSpace,

    ...layoutSpace,
};

/** The option space for a typeId, or an empty space if none is declared. */
export function constraintSpaceFor(typeId: string): OptionSpace {
    return CONSTRAINT_SPACE[typeId] ?? {};
}
