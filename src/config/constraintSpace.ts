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
// Keys deliberately left out: pure cosmetics that no generator reads (boxHeight,
// exercisesPerRow, gridCellSize, tableCellW/H, …) and per-block layout fields that
// live on MathBlock rather than in constraints.

export type OptionSpace = Record<string, unknown[]>;

const NUMBER_TYPES = ['natural', 'decimal', 'rational', 'geheel'];
const OPS = ['+', '-', 'x', ':'];

// Place keys: 'E' = eenheden (units), 'T' = tientallen (tens), 'H' = honderdtallen.
// A bridge is the Dutch 'bruggetje' — a carry/borrow across a place boundary.
const BRIDGE_SETS = [
    {},
    { E: 'FREE', T: 'FREE' },
    { E: 'REQUIRED' },
    { E: 'FORBIDDEN' },
    { E: 'REQUIRED', T: 'REQUIRED' },
    { E: 'FORBIDDEN', T: 'FORBIDDEN' },
];
const MASKS = [{}, { E: true }, { T: true, E: true }];

// hoofdrekenen: AdditionConfig/SubtractionConfig + addition/{Natural,Decimal,Rational}Settings
// + HrPresetRow. All four operations share one plugin family and one defaults factory.
const hrShared: OptionSpace = {
    numberType: NUMBER_TYPES,
    maxGetal: [10, 20, 100, 1000, 10000, 100000, 1000000],
    decimalPlaces: [1, 2, 3],
    bridges: BRIDGE_SETS,
    operand1Mask: MASKS,
    operand2Mask: MASKS,
    termCount: [2, 3, 4],
    fractionDifficulty: ['same', 'multiple', 'different'],
    mixedNumber1: [false, true],
    mixedNumber2: [false, true],
    maxNumerator1: [5, 10, 20],
    maxDenominator1: [4, 10, 20],
    linkFractions: [true, false],
};

const hrAddSub: OptionSpace = {
    ...hrShared,
    preset: ['vrij', 'compenseren'],
    presetDistance: [1, 2],
};

const hrMulDiv: OptionSpace = {
    ...hrShared,
    // MultiplicationConfig + multiplication/NaturalSettings
    multiplicationMode: ['tafels', 'met_rest', 'andere'],
    selectedTables: [[2, 3, 4, 5, 10], [7], [0, 1, 2, 11, 12, 25, 50, 75]],
    tableLimit: [10, 20, 50, 100],
    fractionMultMode: ['natural_fraction', 'fraction_fraction', 'decimal_fraction'],
    preset: ['vrij', 'tienvoud'],
    presetFactors: [[10], [10, 100, 1000]],
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
    ],
};

// CijferConfig — column arithmetic. `operator` + `numberType` come from the sidebar leaf.
const cijferSpace: OptionSpace = {
    operator: OPS,
    numberType: ['natural', 'decimal'],
    maxRange: [20, 100, 1000, 10000, 100000, 1000000, 1000000000],
    decimalPlaces: [1, 2, 3],
    withEstimation: [false, true],
    withRemainder: [false, true],
    numberOfTerms: [2, 3, 4],
    scaffolding: [0, 3],
    bridges: BRIDGE_SETS,
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
    maxTotal: [10, 20, 60],
    maxAbstractN3: [100, 1000],
    minLineLength: [2, 4],
    maxLineLength: [8, 12, 20],
    staticSize: [false, true],
    showGrid: [true, false],
};

// SplitsenConfig — 'splitsen' = decomposing a number into parts (7 → 3 + 4).
const splitsenSpace: OptionSpace = {
    layout: ['basic', 'splitsboom', 'verliefde-harten', 'positie-tabel', 'positie-benen', 'positie-math'],
    maxGetal: [10, 20, 100, 1000, 10000, 100000, 1000000],
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
    maxGetal: [10, 20, 100, 1000],
    format: ['euros', 'decimaal'],
    scaffolding: ['invullen', 'zelf-schrijven', 'eenvoudig', 'verdeeld'],
    geldLayout: ['samen', 'gescheiden'],
    allowedDenominations: [
        [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5],
        [200, 100, 50, 20, 10, 5],
    ],
};

const geldWisselSpace: OptionSpace = {
    exerciseBills: [[500], [500, 1000], [2000, 5000, 10000]],
};

const geldTeruggevenSpace: OptionSpace = {
    minPriceEuros: [1],
    maxPriceEuros: [9, 49, 99, 999],
    payWithOptions: [[1000], [1000, 2000, 5000], [5000, 10000, 20000, 50000]],
    centenDeel: ['vijfentwintig', 'tien', 'vijf'],
    scaffolding: ['ingevuld', 'leeg'],
    antwoordType: ['schrijven', 'tekenen-schrijven'],
    antwoordFormat: ['euro-cent', 'decimaal'],
    betalenMetTekening: [false, true],
};

// MAB = Dienes place-value blocks.
const mabSpace: OptionSpace = {
    mabStyle: ['symbolic', 'mab-bw', 'mab-color'],
    maxNumber: [10, 20, 100, 1000],
    scaffolding: ['positietabel', 'kader', 'geen'],
    operand1Mask: MASKS,
};

const ordenenSpace: OptionSpace = {
    numberType: NUMBER_TYPES,
    count: [2, 3, 5],
    operatorMode: ['oplopend', 'aflopend', 'beide'],
    maxGetal: [20, 100, 1000, 10000, 100000],
    decimalPlaces: [1, 2, 3],
    unitFractionsOnly: [false, true],
    allowMixed: [false, true],
    answerStyle: ['lijn', 'vak'],
};

const breukBewerkSpace: OptionSpace = {
    subType: ['gemengd', 'gelijknamig', 'vereenvoudigen'],
    direction: ['naar-gemengd', 'naar-breuk', 'beide'],
    minDenominator: [2, 3],
    maxDenominator: [6, 10, 20],
    maxNumerator: [5, 10, 30],
    tablesOnly: [true, false],
    allowIrreducible: [false, true],
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
    numberType: ['natural', 'decimal'],
    maxGetal: [20, 100, 1000, 10000, 100000],
    ticks: [4, 6, 10],
    steps: [1, 2, 3, 4],
    ops: [['+'], ['-'], ['x'], [':'], ['+', '-'], ['+', '-', 'x', ':']],
    maxDecimals: [1, 2],
    showArrows: [false, true],
    showOperators: [false, true],
    operatorStyle: ['symbol', 'full'],
};

const kettingSpace: OptionSpace = {
    numberType: ['natural'],
    maxGetal: [20, 100, 1000],
    chainLength: [2, 4, 6],
    ops: [['+'], ['+', '-'], ['+', '-', 'x', ':']],
    blankMiddle: [false, true],
    showArrows: [true, false],
    operatorStyle: ['symbol', 'full'],
};

const deelbaarheidSpace: OptionSpace = {
    layout: ['tabel', 'veelvouden'],
    divisors: [[2], [2, 5, 10], [3, 4, 6, 9, 25, 50, 100]],
    maxGetal: [100, 1000, 10000, 100000],
    base: [2, 9, 25],
    terms: [3, 6, 12],
    givenCount: [1, 2, 4],
};

const deelbaarheidKleurSpace: OptionSpace = {
    viewMode: ['strip', 'markeren'],
    rasterVorm: ['lijn', 'rechthoek'],
    divisors: [[2], [2, 5, 10], [3, 7, 11, 12]],
    maxGetal: [20, 100, 1000],
    perRow: [5, 10],
    rasterCount: [100, 1000],
    rasterCols: [10],
    showRest: [false, true],
};

const getallenasSpace: OptionSpace = {
    numberType: NUMBER_TYPES,
    maxGetal: [20, 100, 1000, 10000, 100000],
    step: [1, 2, 5, 10, 25, 50, 100, 0.1, 0.5],
    direction: ['right', 'left', 'beide'],
    hardMode: [false, true],
    ticks: [4, 6, 10],
};

const getallenrijSpace: OptionSpace = {
    ...getallenasSpace,
    numberMask: MASKS,
    fractionStep: [2, 4, 10],
    maxTeller: [10, 25],
    showFrame: [true, false],
};

const metenSpace: OptionSpace = {
    measureModel: ['meten', 'gegeven'],
    precision: ['cm', 'mm'],
    minLength: [2, 3],
    maxLength: [6, 10, 18],
    maxCorners: [0, 1, 2, 3, 4],
    perSideScaffold: [false, true],
    answerMode: ['single', 'sum'],
    answerUnit: ['cm', 'plain'],
    shapes: [
        ['driehoek'],
        ['driehoek', 'rechthoek', 'vierkant'],
        ['cirkel'],
        ['ruit', 'parallellogram', 'trapezium'],
    ],
};

const oppervlakteSpace: OptionSpace = {
    subType: ['rooster', 'berekenen'],
    shapes: [['rechthoek'], ['rechthoek', 'vierkant'], ['l-figuur'], ['rechthoekige-driehoek']],
    minLength: [2],
    maxLength: [5, 8, 12],
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
    maxGetal: [100, 1000, 10000, 100000, 1000000],
    numberMask: MASKS,
    decimalPlaces: [0, 1, 2, 3],
};

const evenOnevenSpace: OptionSpace = {
    subType: ['rooster', 'cirkels'],
    maxGetal: [20, 100, 1000, 10000],
    target: ['even', 'oneven'],
    perRow: [5, 10],
};

const vergelijkenSpace: OptionSpace = {
    subType: ['getallen', 'kiezen', 'representaties'],
    maxGetal: [10, 100, 1000, 10000, 100000, 1000000],
    numberMask: MASKS,
    chooseTarget: ['grootste', 'kleinste'],
    setSize: [2, 4, 6],
    decimalPlaces: [0, 1, 2],
    leftRep: ['breuk', 'kommagetal', 'plaatswaarde', 'woorden'],
    rightRep: ['breuk', 'kommagetal', 'plaatswaarde', 'woorden'],
};

const afrondenSpace: OptionSpace = {
    subType: ['rooster', 'simpel'],
    numberType: ['natural', 'decimal'],
    maxGetal: [10, 100, 1000, 10000, 100000, 1000000],
    numberMask: MASKS,
    roundTargets: [['T'], ['H'], ['T', 'H'], ['E'], ['E', 't']],
    roosterSize: [3, 6, 12],
    decimalPlaces: [1, 2, 3],
};

const romeinseSpace: OptionSpace = {
    subType: ['herkennen', 'schrijven'],
    niveau: [1, 2, 3, 4],
};

const herleidingenSpace: OptionSpace = {
    measure: ['lengte', 'inhoud', 'massa', 'oppervlakte'],
    maxEnkel: [10, 100, 1000],
    maxSamengesteld: [100, 1000, 10000],
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
    maxGetal: [10, 100, 1000, 10000, 100000],
    decimalPlaces: [1, 2],
    roundTargets: [['T'], ['H'], ['D'], ['T', 'H'], ['E']],
    scaffolding: ['tussenstappen', 'enkel-schatting'],
};

const verbandenSpace: OptionSpace = {
    subType: ['tabel', 'paren'],
    reps: [['breuk', 'decimaal'], ['breuk', 'procent'], ['breuk', 'decimaal', 'procent']],
    denominators: [[2], [2, 4, 5, 10, 100], [8, 20, 25]],
    given: ['random', 'breuk', 'decimaal', 'procent'],
};

const procentenSpace: OptionSpace = {
    subType: ['nemen', 'welk-percent'],
    percents: [[10], [10, 25, 50], [1, 5, 20, 75, 100]],
    maxGetal: [100, 1000, 10000],
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
    maxEuro: [100, 1000, 10000],
    wholeEuros: [true, false],
    halfYear: [false, true],
};

const rekenvolgordeSpace: OptionSpace = {
    operators: [['+', '-'], ['+', '-', 'x'], ['+', '-', 'x', ':']],
    haakjesMode: ['GEEN', 'MAG', 'MOET'],
    opsCount: [2, 3, 4],
    maxGetal: [100, 1000],
    tableLimit: [10, 20],
};

const getalfunctieSpace: OptionSpace = {
    functies: [['hoeveelheid'], ['rang'], ['maat'], ['code'], ['hoeveelheid', 'rang', 'maat', 'code']],
    answerMode: ['aankruisen', 'schrijven'],
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
    maxGetal: [100, 1000, 10000],
    foutAandeel: ['geen', 'helft', 'alles'],
    showKruis: [true, false],
};

const weegschaalSpace: OptionSpace = {
    mode: ['aflezen', 'tekenen'],
    bereikGram: [1000, 2000, 5000],
    // Snapped to the bereik by the generator; the plugin only offers the legal steps.
    stepGram: [20, 50, 100, 250],
    notatie: ['g', 'kg-komma', 'kg-g'],
};

const vormleerSpace: OptionSpace = {
    kind: ['punt-lijn', 'hoek', 'figuur'],
    mode: ['herkennen', 'benoemen', 'eigenschappen'],
    answerMode: ['woordbank', 'schrijven'],
    classify: ['vierhoeken', 'driehoeken'],
    concepts: [
        ['punt', 'rechte', 'halfrechte', 'lijnstuk'],
        ['evenwijdig', 'snijdend', 'loodrecht'],
        ['scherp', 'recht', 'stomp', 'gestrekt'],
        ['vierkant', 'rechthoek', 'ruit', 'parallellogram', 'trapezium'],
        ['scherphoekig', 'rechthoekig', 'stomphoekig', 'gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'],
    ],
    randomRotation: [false, true],
    showBoog: [true, false],
    rightAngleStyle: ['vierkantje', 'haakje'],
    raster: [true, false],
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
