export interface LeafExercise {
    id: string;
    label: string;
    typeId: string;
    defaultConstraints?: Record<string, unknown>;
    placeholder?: boolean;
    minLeerjaar?: 1 | 2 | 3 | 4 | 5 | 6;   // explicit grade gate; else inferred (gradePresets)
}

export interface ExerciseType {
    id: string;
    label: string;
    // Leaf: has typeId, no children
    typeId?: string;
    defaultConstraints?: Record<string, unknown>;
    // Accordion: has children, no typeId
    children?: LeafExercise[];
    placeholder?: boolean;
    minLeerjaar?: 1 | 2 | 3 | 4 | 5 | 6;   // leaf-type grade gate (see gradePresets)
}

export interface Subdomain {
    id: string;
    label: string;
    types: ExerciseType[];
    placeholder?: boolean;
}

export interface Domain {
    id: string;
    label: string;
    accentVar: string;
    subdomains: Subdomain[];
    hidden?: boolean;   // hidden from the sidebar (not implemented / not coming soon)
}

// ── placeholder helper (only the hidden vraagstukken domain still uses it) ───
const ph = (id: string, label: string): ExerciseType => ({ id, label, placeholder: true });

export const APP_STRUCTURE: Domain[] = [
    {
        id: 'getallenkennis',
        label: 'Getallenkennis',
        accentVar: '--accent-getallenkennis',
        subdomains: [
            {
                id: 'getalbegrip',
                label: 'Getalbegrip',
                types: [
                    {
                        id: 'getalbegrip-mab',
                        label: 'MAB',
                        children: [
                            { id: 'mab-herkennen', label: 'Getallen herkennen', typeId: 'mab-herkennen' },
                            { id: 'mab-tekenen', label: 'Getallen tekenen', typeId: 'mab-tekenen' },
                        ],
                    },
                    {
                        id: 'getalbegrip-plaatswaarde', label: 'Plaatswaarde benoemen',
                        children: [
                            { id: 'plaatswaarde-waarde', label: 'Waarde van cijfer', typeId: 'plaatswaarde', defaultConstraints: { subType: 'waarde' } },
                            { id: 'plaatswaarde-plaats', label: 'Plaats benoemen',    typeId: 'plaatswaarde', defaultConstraints: { subType: 'plaats' } },
                            { id: 'plaatswaarde-tabel',  label: 'Tabel invullen',     typeId: 'plaatswaarde', defaultConstraints: { subType: 'tabel' } },
                        ],
                    },
                    {
                        id: 'getalbegrip-splitsen',
                        label: 'Splitsen',
                        children: [
                            { id: 'splitsen-basis', label: 'Rooster', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'basic', rowsPerBox: 4 } },
                            { id: 'splitsen-boom', label: 'Splitsboom', typeId: 'splitsen', defaultConstraints: { maxGetal: 100, layout: 'splitsboom', blankPositions: ['right'] } },
                            { id: 'splitsen-harten', label: 'Verliefde harten', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'verliefde-harten' } },
                            { id: 'splitsen-positietabel', label: 'Positietabel', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-tabel' } },
                            { id: 'splitsen-benen', label: 'Splitsbenen (H/T/E)', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-benen', benenVariants: ['legs-letters'] } },
                            { id: 'splitsen-plaatswaarden', label: 'Plaatswaarden', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-math', mathForms: ['letters'], mathDirection: 'decompose' } },
                        ],
                    },
                    {
                        id: 'getalbegrip-vergelijken', label: 'Vergelijken (<, >, =)',
                        children: [
                            { id: 'vergelijken-getallen', label: 'Twee getallen', typeId: 'vergelijken', defaultConstraints: { subType: 'getallen' } },
                            { id: 'vergelijken-kiezen',   label: 'Grootste / kleinste', typeId: 'vergelijken', defaultConstraints: { subType: 'kiezen' } },
                            { id: 'vergelijken-representaties', label: 'Breuken & kommagetallen', typeId: 'vergelijken', defaultConstraints: { subType: 'representaties', leftRep: 'breuk', rightRep: 'kommagetal', maxGetal: 10, decimalPlaces: 1 } },
                        ],
                    },
                    {
                        id: 'getalbegrip-ordenen',
                        label: 'Ordenen',
                        children: [
                            { id: 'getalbegrip-ordenen-nat', label: 'Natuurlijke getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'getalbegrip-ordenen-dec', label: 'Decimale getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'getalbegrip-ordenen-rat', label: 'Rationale getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'rational' } },
                            { id: 'getalbegrip-ordenen-geh', label: 'Gehele getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'geheel' } },
                        ],
                    },
                    {
                        id: 'getalbegrip-getallenassen',
                        label: 'Getallenassen',
                        children: [
                            { id: 'getalbegrip-getallenassen-nat', label: 'Natuurlijke getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'natural' } },
                            { id: 'getalbegrip-getallenassen-dec', label: 'Decimale getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'decimal', step: 0.5, maxGetal: 20 } },
                            { id: 'getalbegrip-getallenassen-rat', label: 'Rationale getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'rational', fractionStep: 4, ticks: 6 } },
                            { id: 'getalbegrip-getallenassen-geh', label: 'Gehele getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'geheel', maxGetal: 20, step: 5 } },
                        ],
                    },
                    {
                        id: 'getalbegrip-getallenrijen',
                        label: 'Getallenrijen',
                        children: [
                            { id: 'getalbegrip-getallenrijen-nat', label: 'Natuurlijke getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'getalbegrip-getallenrijen-dec', label: 'Decimale getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'decimal', step: 0.1, maxGetal: 10 } },
                            { id: 'getalbegrip-getallenrijen-rat', label: 'Rationale getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'rational', fractionStep: 4, ticks: 6 } },
                            { id: 'getalbegrip-getallenrijen-geh', label: 'Gehele getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'geheel', maxGetal: 20, step: 5 } },
                        ],
                    },
                    { id: 'getalbegrip-functie', label: 'Functie van getallen', typeId: 'getalfunctie', minLeerjaar: 2 },
                    {
                        id: 'getalbegrip-verbanden', label: 'Verbanden (breuk · decimaal · procent)',
                        children: [
                            { id: 'verbanden-tabel', label: 'Tabel invullen', typeId: 'verbanden', defaultConstraints: { subType: 'tabel' }, minLeerjaar: 5 },
                            { id: 'verbanden-paren', label: 'Omzettingen', typeId: 'verbanden', defaultConstraints: { subType: 'paren' }, minLeerjaar: 5 },
                        ],
                    },
                ],
            },
            {
                id: 'breuken',
                label: 'Breuken',
                types: [
                    { id: 'breuken-kleuren', label: 'Breuken kleuren', typeId: 'breuken', defaultConstraints: { subType: 'kleuren' } },
                    { id: 'breuken-herkennen', label: 'Breuken herkennen', typeId: 'breuken', defaultConstraints: { subType: 'herkennen' } },
                    // answerFormat must be set here: the registry default ('fraction-questions') is a
                    // herkennen value, and defaultsFor() only runs on a variant switch, not on block add.
                    { id: 'breuken-hoeveelheid', label: 'Breuk van een hoeveelheid', typeId: 'breuken', defaultConstraints: { subType: 'hoeveelheid', answerFormat: 'met-hulp', maxDenominator: 5, maxTotal: 20 } },
                    { id: 'breuken-lijnstuk', label: 'Breuk van een lijnstuk', typeId: 'breuken', defaultConstraints: { subType: 'lijnstuk' } },
                    { id: 'breuken-veelhoek', label: 'Breuk van een veelhoek', typeId: 'breuken', defaultConstraints: { subType: 'veelhoek' } },
                    { id: 'breuken-rangschikken', label: 'Breuken rangschikken', typeId: 'breuken-rangschikken' },
                ],
            },
            {
                id: 'afronden',
                label: 'Afronden',
                types: [
                    {
                        id: 'afronden-nat', label: 'Natuurlijke getallen',
                        children: [
                            { id: 'afronden-nat-rooster', label: 'Rooster', typeId: 'afronden', defaultConstraints: { subType: 'rooster', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] } },
                            { id: 'afronden-nat-simpel',  label: 'Eenvoudig (≈)', typeId: 'afronden', defaultConstraints: { subType: 'simpel', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] } },
                        ],
                    },
                    {
                        id: 'afronden-dec', label: 'Decimale getallen',
                        children: [
                            { id: 'afronden-dec-rooster', label: 'Rooster', typeId: 'afronden', defaultConstraints: { subType: 'rooster', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] } },
                            { id: 'afronden-dec-simpel',  label: 'Eenvoudig (≈)', typeId: 'afronden', defaultConstraints: { subType: 'simpel', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] } },
                        ],
                    },
                ],
            },
            {
                id: 'patronen',
                label: 'Patronen',
                types: [
                    { id: 'patronen-nat', label: 'Natuurlijke getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'natural' } },
                    { id: 'patronen-dec', label: 'Decimale getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'decimal', maxGetal: 100 } },
                    { id: 'patronen-geh', label: 'Gehele getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'geheel', maxGetal: 100 } },
                    { id: 'patronen-kettingsommen', label: 'Kettingsommen', typeId: 'kettingsommen', minLeerjaar: 2 },
                ],
            },
            {
                id: 'even-oneven',
                label: 'Even en oneven',
                types: [
                    { id: 'even-oneven-rooster', label: 'Rooster kleuren', typeId: 'even-oneven', defaultConstraints: { subType: 'rooster' } },
                    { id: 'even-oneven-cirkels', label: 'Cirkels groeperen', typeId: 'even-oneven', defaultConstraints: { subType: 'cirkels' } },
                ],
            },
            {
                id: 'veelvouden-deelbaarheid',
                label: 'Veelvouden en deelbaarheid',
                types: [
                    { id: 'deelbaarheid-veelvouden', label: 'Veelvouden aanvullen', typeId: 'deelbaarheid', defaultConstraints: { layout: 'veelvouden' } },
                    { id: 'deelbaarheid-tabel', label: 'Deelbaarheidstabel', typeId: 'deelbaarheid', defaultConstraints: { layout: 'tabel' } },
                    {
                        id: 'deelbaarheid-kleuren-acc', label: 'Deelbaarheid (kleuren)',
                        children: [
                            { id: 'deelbaarheid-rooster', label: 'Rooster', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'strip', divisors: [2, 5, 10] } },
                            { id: 'deelbaarheid-omcirkelen', label: 'Omcirkelen', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'markeren', divisors: [2, 5, 10] } },
                            { id: 'deelbaarheid-kleurraster', label: 'Kleurraster', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'raster', divisors: [2, 5, 10] } },
                        ],
                    },
                ],
            },
            {
                id: 'procenten',
                label: 'Procenten',
                types: [
                    { id: 'procenten-nemen', label: 'Percent van een getal', typeId: 'procenten', defaultConstraints: { subType: 'nemen' }, minLeerjaar: 5 },
                    { id: 'procenten-welk', label: 'Hoeveel procent?', typeId: 'procenten', defaultConstraints: { subType: 'welk-percent' }, minLeerjaar: 5 },
                    { id: 'procenten-verbanden', label: 'Breuk · decimaal · procent', typeId: 'verbanden', minLeerjaar: 5 },
                ],
            },
            {
                id: 'romeinse-cijfers',
                label: 'Romeinse cijfers',
                types: [
                    { id: 'romeinse-herkennen', label: 'Herkennen (→ getal)', typeId: 'romeinse-cijfers', defaultConstraints: { subType: 'herkennen' } },
                    { id: 'romeinse-schrijven', label: 'Schrijven (→ Romeins)', typeId: 'romeinse-cijfers', defaultConstraints: { subType: 'schrijven' } },
                ],
            },
        ],
    },
    {
        id: 'bewerkingen',
        label: 'Bewerkingen',
        accentVar: '--accent-bewerkingen',
        subdomains: [
            {
                id: 'hoofdrekenen-standaardprocedure',
                label: 'Hoofdrekenen',
                types: [
                    {
                        id: 'hr-std-optellen',
                        label: 'Optellen (standaardprocedure)',
                        children: [
                            { id: 'hr-std-optellen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-optellen-dec', label: 'Decimale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'hr-std-aftrekken',
                        label: 'Aftrekken (standaardprocedure)',
                        children: [
                            { id: 'hr-std-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-aftrekken-dec', label: 'Decimale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'hr-std-vermenigvuldigen',
                        label: 'Vermenigvuldigen (standaardprocedure)',
                        children: [
                            { id: 'hr-std-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-vermenigvuldigen-dec', label: 'Decimale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'hr-std-delen',
                        label: 'Delen (standaardprocedure)',
                        children: [
                            { id: 'hr-std-delen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-delen-dec', label: 'Decimale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'decimal' } },
                        ],
                    },
                ],
            },
            {
                id: 'hoofdrekenen-handig',
                label: 'Handig hoofdrekenen',
                types: [
                    // Compenseren + ×/: met tienvoud live as presets inside the standard
                    // hoofdrekenen configs; kettingsommen moved to Getallenkennis › Patronen.
                    { id: 'handig-rekenvolgorde', label: 'Rekenvolgorde en haakjes', typeId: 'rekenvolgorde', minLeerjaar: 4 },
                ],
            },
            {
                id: 'cijferen',
                label: 'Cijferen',
                types: [
                    {
                        id: 'cijferen-optellen',
                        label: 'Optellen',
                        children: [
                            { id: 'cijferen-optellen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-optellen-nat', defaultConstraints: { operator: '+', numberType: 'natural' } },
                            { id: 'cijferen-optellen-dec', label: 'Kommagetallen', typeId: 'cijferen-optellen-dec', defaultConstraints: { operator: '+', numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'cijferen-aftrekken',
                        label: 'Aftrekken',
                        children: [
                            { id: 'cijferen-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-aftrekken-nat', defaultConstraints: { operator: '-', numberType: 'natural' } },
                            { id: 'cijferen-aftrekken-dec', label: 'Kommagetallen', typeId: 'cijferen-aftrekken-dec', defaultConstraints: { operator: '-', numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'cijferen-vermenigvuldigen',
                        label: 'Vermenigvuldigen',
                        children: [
                            { id: 'cijferen-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-vermenigvuldigen-nat', defaultConstraints: { operator: 'x', numberType: 'natural' } },
                            { id: 'cijferen-vermenigvuldigen-dec', label: 'Kommagetallen', typeId: 'cijferen-vermenigvuldigen-dec', defaultConstraints: { operator: 'x', numberType: 'decimal' } },
                        ],
                    },
                    {
                        id: 'cijferen-delen',
                        label: 'Delen',
                        children: [
                            { id: 'cijferen-delen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-delen-nat', defaultConstraints: { operator: ':', numberType: 'natural' } },
                            { id: 'cijferen-delen-dec', label: 'Kommagetallen', typeId: 'cijferen-delen-dec', defaultConstraints: { operator: ':', numberType: 'decimal' } },
                        ],
                    },
                    // Negenproef checks a worked cijfer-multiplication — it belongs with cijferen.
                    { id: 'controleren-negenproef', label: 'Negenproef', typeId: 'controleren', defaultConstraints: { subType: 'negenproef' }, minLeerjaar: 5 },
                ],
            },
            {
                id: 'schattend-rekenen',
                label: 'Schattend rekenen',
                types: [
                    { id: 'schattend-nat', label: 'Natuurlijke getallen', typeId: 'schattend', defaultConstraints: { numberType: 'natural' }, minLeerjaar: 3 },
                    { id: 'schattend-dec', label: 'Kommagetallen', typeId: 'schattend', defaultConstraints: { numberType: 'decimal', maxGetal: 100, roundTargets: ['E'] }, minLeerjaar: 4 },
                ],
            },
            {
                id: 'controleren',
                label: 'Controleren',
                types: [
                    { id: 'controleren-omgekeerde', label: 'Omgekeerde bewerking', typeId: 'controleren', defaultConstraints: { subType: 'omgekeerde', maxGetal: 1000 }, minLeerjaar: 3 },
                ],
            },
            {
                id: 'bewerkingen-breuken',
                label: 'Bewerkingen met breuken',
                types: [
                    // Fraction arithmetic (+ − × :) — leerplan "Bewerkingen met breuken", introduced L4.
                    { id: 'hr-std-optellen-rat', label: 'Optellen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4 },
                    { id: 'hr-std-aftrekken-rat', label: 'Aftrekken', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4 },
                    { id: 'hr-std-vermenigvuldigen-rat', label: 'Vermenigvuldigen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4 },
                    { id: 'hr-std-delen-rat', label: 'Delen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4 },
                    { id: 'breuken-gemengd', label: 'Gemengd getal ↔ breuk', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'gemengd', direction: 'naar-gemengd' } },
                    { id: 'breuken-gelijknamig', label: 'Gelijknamig maken', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'gelijknamig' } },
                    { id: 'breuken-vereenvoudigen', label: 'Vereenvoudigen', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'vereenvoudigen' } },
                ],
            },
        ],
    },
    {
        id: 'meetkunde',
        label: 'Meetkunde',
        accentVar: '--accent-meetkunde',
        subdomains: [
            {
                id: 'vormleer',
                label: 'Vormleer',
                types: [
                    {
                        id: 'vormleer-punt-lijn', label: 'Punt / lijn / rechte',
                        children: [
                            { id: 'vormleer-punt-lijn-herkennen', label: 'Herkennen', typeId: 'vormleer-punt-lijn', defaultConstraints: { mode: 'herkennen' }, minLeerjaar: 3 },
                            { id: 'vormleer-punt-lijn-tekenen', label: 'Tekenen', typeId: 'vormleer-punt-lijn', defaultConstraints: { mode: 'tekenen' }, minLeerjaar: 3 },
                        ],
                    },
                    {
                        id: 'vormleer-hoeken', label: 'Hoeken',
                        children: [
                            { id: 'vormleer-hoeken-herkennen', label: 'Herkennen', typeId: 'vormleer-hoeken', defaultConstraints: { mode: 'herkennen' }, minLeerjaar: 3 },
                            { id: 'vormleer-hoeken-tekenen', label: 'Tekenen', typeId: 'vormleer-hoeken', defaultConstraints: { mode: 'tekenen' }, minLeerjaar: 3 },
                        ],
                    },
                    {
                        id: 'vormleer-vlakke-figuren', label: 'Vlakke figuren',
                        children: [
                            // One driehoeken leaf: the config offers both classification axes (hoeken + zijden).
                            { id: 'vormleer-driehoeken', label: 'Driehoeken', typeId: 'vormleer-figuren', defaultConstraints: { classify: 'driehoeken', concepts: ['scherphoekig', 'rechthoekig', 'stomphoekig', 'gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'] }, minLeerjaar: 4 },
                            { id: 'vormleer-vierhoeken', label: 'Vierhoeken', typeId: 'vormleer-figuren', defaultConstraints: { classify: 'vierhoeken' }, minLeerjaar: 4 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'meten-metend-rekenen',
        label: 'Meten en metend rekenen',
        accentVar: '--accent-metendrekenen',
        subdomains: [
            {
                id: 'tijd',
                label: 'Tijdstip en tijdsduur',
                types: [
                    {
                        id: 'klok-analoog', label: 'Analoge klok',
                        children: [
                            { id: 'klok-analoog-lezen', label: 'Lezen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'lezen' } },
                            { id: 'klok-analoog-tekenen', label: 'Tekenen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'tekenen' } },
                            { id: 'klok-analoog-omzetten', label: 'Omzetten', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'omzetten' } },
                        ],
                    },
                    {
                        id: 'klok-digitaal', label: 'Digitale klok',
                        children: [
                            { id: 'klok-digitaal-lezen', label: 'Lezen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'digitaal', exerciseMode: 'lezen' } },
                            { id: 'klok-digitaal-tekenen', label: 'Tekenen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'digitaal', exerciseMode: 'tekenen' } },
                        ],
                    },
                    { id: 'tijdsduur-berekenen', label: 'Tijdsduur berekenen', typeId: 'tijdsduur', minLeerjaar: 3 },
                    {
                        id: 'kalender-datum', label: 'Kalender / datum lezen',
                        children: [
                            { id: 'kalender-maandrooster', label: 'Maandrooster lezen', typeId: 'kalender', defaultConstraints: { subType: 'maandrooster' }, minLeerjaar: 2 },
                            { id: 'kalender-datum-rekenen', label: 'Rekenen met dagen', typeId: 'kalender', defaultConstraints: { subType: 'datum-rekenen' }, minLeerjaar: 3 },
                            { id: 'kalender-notatie', label: 'Datumnotatie', typeId: 'kalender', defaultConstraints: { subType: 'notatie' }, minLeerjaar: 3 },
                        ],
                    },
                ],
            },
            {
                id: 'geld',
                label: 'Geld',
                types: [
                    { id: 'geld-herkennen',   label: 'Herkennen',      typeId: 'geld-herkennen'   },
                    { id: 'geld-tekenen',     label: 'Bedrag tekenen', typeId: 'geld-tekenen'     },
                    { id: 'geld-wissel',      label: 'Wissel',         typeId: 'geld-wissel'      },
                    { id: 'geld-teruggeven',  label: 'Teruggeven',     typeId: 'geld-teruggeven'  },
                    { id: 'geld-rekenen-korting', label: 'Korting', typeId: 'geld-rekenen', defaultConstraints: { subType: 'korting', percents: [10, 25, 50] }, minLeerjaar: 5 },
                    { id: 'geld-rekenen-intrest', label: 'Intrest', typeId: 'geld-rekenen', defaultConstraints: { subType: 'intrest', percents: [1, 2, 5], maxEuro: 10000 }, minLeerjaar: 6 },
                    { id: 'geld-rekenen-winst', label: 'Winst / Verlies', typeId: 'geld-rekenen', defaultConstraints: { subType: 'winst' }, minLeerjaar: 5 },
                ],
            },
            {
                id: 'temperatuur',
                label: 'Temperatuur',
                types: [
                    { id: 'temperatuur-kleuren', label: 'Meter kleuren', typeId: 'temperatuur', defaultConstraints: { variant: 'kleuren' } },
                    { id: 'temperatuur-aflezen', label: 'Meter aflezen', typeId: 'temperatuur', defaultConstraints: { variant: 'aflezen' } },
                    { id: 'temperatuur-verschil', label: 'Verschil', typeId: 'temperatuur', defaultConstraints: { variant: 'verschil', mode1: 'gekleurd', mode2: 'getal' } },
                ],
            },
            {
                id: 'lengte-oppervlakte',
                label: 'Lengte en oppervlakte',
                types: [
                    { id: 'lengte-meten', label: 'Lengte meten', typeId: 'lengte-meten' },
                    { id: 'omtrek', label: 'Omtrek', typeId: 'omtrek' },
                    {
                        id: 'oppervlakte', label: 'Oppervlakte',
                        children: [
                            { id: 'oppervlakte-rooster', label: 'Rooster tellen', typeId: 'oppervlakte', defaultConstraints: { subType: 'rooster', shapes: ['rechthoek', 'l-figuur'] }, minLeerjaar: 3 },
                            { id: 'oppervlakte-berekenen', label: 'Berekenen', typeId: 'oppervlakte', defaultConstraints: { subType: 'berekenen' }, minLeerjaar: 5 },
                        ],
                    },
                ],
            },
            {
                id: 'massa',
                label: 'Massa',
                types: [
                    { id: 'massa-weegschaal-aflezen', label: 'Weegschaal aflezen', typeId: 'weegschaal', defaultConstraints: { mode: 'aflezen' }, minLeerjaar: 2 },
                    { id: 'massa-weegschaal-tekenen', label: 'Wijzer tekenen', typeId: 'weegschaal', defaultConstraints: { mode: 'tekenen' }, minLeerjaar: 2 },
                ],
            },
            {
                id: 'maateenheden',
                label: 'Maateenheden',
                types: [
                    { id: 'maateenheid-kiezen', label: 'Passende maateenheid kiezen', typeId: 'maateenheid', minLeerjaar: 2 },
                ],
            },
            {
                id: 'herleidingen',
                label: 'Herleidingen',
                types: [
                    { id: 'herleidingen-lengte', label: 'Lengte', typeId: 'herleidingen', defaultConstraints: { measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'] } },
                    { id: 'herleidingen-inhoud', label: 'Inhoud', typeId: 'herleidingen', defaultConstraints: { measure: 'inhoud', units: ['l', 'dl', 'cl', 'ml'] } },
                    { id: 'herleidingen-massa', label: 'Massa', typeId: 'herleidingen', defaultConstraints: { measure: 'massa', units: ['kg', 'dag', 'g', 'dg'] } },
                    { id: 'herleidingen-oppervlakte', label: 'Oppervlakte', typeId: 'herleidingen', defaultConstraints: { measure: 'oppervlakte', units: ['m²', 'dm²', 'cm²', 'a', 'ca', 'ha'] } },
                ],
            },
        ],
    },
    {
        id: 'vraagstukken',
        label: 'Probleemoplossend denken',
        accentVar: '--accent-vraagstukken',
        hidden: true,   // not coming soon — hidden from the sidebar
        subdomains: [
            {
                id: 'vraagstukken-sub',
                label: 'Vraagstukken',
                placeholder: true,
                types: [ph('vraagstukken-item', 'Vraagstukken')],
            },
        ],
    },
];
