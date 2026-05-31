export interface LeafExercise {
    id: string;
    label: string;
    typeId: string;
    defaultConstraints?: Record<string, unknown>;
    placeholder?: boolean;
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
}

// ── placeholder helpers ──────────────────────────────────────────────────────
const ph = (id: string, label: string): ExerciseType => ({ id, label, placeholder: true });
const phLeaf = (id: string, label: string): LeafExercise => ({ id, label, typeId: '__placeholder__', placeholder: true });
const phAcc = (id: string, label: string, children: LeafExercise[]): ExerciseType => ({
    id, label, placeholder: true, children,
});

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
                        id: 'getalbegrip-splitsen',
                        label: 'Splitsen',
                        children: [
                            { id: 'splitsen-basis', label: 'Rooster', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'basic', rowsPerBox: 4 } },
                            { id: 'splitsen-harten', label: 'Verliefde harten', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'verliefde-harten' } },
                            { id: 'splitsen-positietabel', label: 'Positietabel', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-tabel' } },
                            { id: 'splitsen-benen', label: 'Splitsbenen (H/T/E)', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-benen', benenVariants: ['legs-letters'] } },
                            { id: 'splitsen-plaatswaarden', label: 'Plaatswaarden', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-math', mathForms: ['letters'], mathDirection: 'decompose' } },
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
                    ph('getalbegrip-functie', 'Functie van getallen'),
                    {
                        id: 'getalbegrip-vergelijken', label: 'Vergelijken (<, >, =)',
                        children: [
                            { id: 'vergelijken-getallen', label: 'Twee getallen', typeId: 'vergelijken', defaultConstraints: { subType: 'getallen' } },
                            { id: 'vergelijken-kiezen',   label: 'Grootste / kleinste', typeId: 'vergelijken', defaultConstraints: { subType: 'kiezen' } },
                        ],
                    },
                    ph('getalbegrip-verbanden', 'Verbanden (breuk · decimaal · procent)'),
                    {
                        id: 'getalbegrip-even-oneven', label: 'Even en oneven',
                        children: [
                            { id: 'even-oneven-rooster', label: 'Rooster kleuren', typeId: 'even-oneven', defaultConstraints: { subType: 'rooster' } },
                            { id: 'even-oneven-cirkels', label: 'Cirkels groeperen', typeId: 'even-oneven', defaultConstraints: { subType: 'cirkels' } },
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
                placeholder: true,
                types: [
                    ph('patronen-nat', 'Natuurlijke getallen'),
                    ph('patronen-dec', 'Decimale getallen'),
                ],
            },
            {
                id: 'veelvouden-delers',
                label: 'Veelvouden en delers',
                types: [
                    { id: 'deelbaarheid-veelvouden', label: 'Veelvouden aanvullen', typeId: 'deelbaarheid', defaultConstraints: { layout: 'veelvouden' } },
                ],
            },
            {
                id: 'deelbaarheid',
                label: 'Deelbaarheid',
                types: [
                    { id: 'deelbaarheid-tabel', label: 'Deelbaarheidstabel', typeId: 'deelbaarheid', defaultConstraints: { layout: 'tabel' } },
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
            {
                id: 'procenten',
                label: 'Procenten',
                placeholder: true,
                types: [ph('procenten-item', 'Procenten')],
            },
            {
                id: 'breuken',
                label: 'Breuken',
                types: [
                    { id: 'breuken-kleuren', label: 'Breuken kleuren', typeId: 'breuken', defaultConstraints: { subType: 'kleuren' } },
                    { id: 'breuken-herkennen', label: 'Breuken herkennen', typeId: 'breuken', defaultConstraints: { subType: 'herkennen' } },
                    { id: 'breuken-hoeveelheid', label: 'Breuk van een hoeveelheid', typeId: 'breuken', defaultConstraints: { subType: 'hoeveelheid' } },
                    { id: 'breuken-lijnstuk', label: 'Breuk van een lijnstuk', typeId: 'breuken', defaultConstraints: { subType: 'lijnstuk' } },
                    { id: 'breuken-veelhoek', label: 'Breuk van een veelhoek', typeId: 'breuken', defaultConstraints: { subType: 'veelhoek' } },
                    ph('breuken-rangschikken', 'Breuken rangschikken'),
                ],
            },
            {
                id: 'gehele-getallen',
                label: 'Gehele getallen',
                placeholder: true,
                types: [ph('gehele-getallen-item', 'Gehele getallen')],
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
                label: 'Hoofdrekenen (standaardprocedure)',
                types: [
                    {
                        id: 'hr-std-optellen',
                        label: 'Optellen',
                        children: [
                            { id: 'hr-std-optellen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-optellen-dec', label: 'Decimale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-optellen-rat', label: 'Rationale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-aftrekken',
                        label: 'Aftrekken',
                        children: [
                            { id: 'hr-std-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-aftrekken-dec', label: 'Decimale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-aftrekken-rat', label: 'Rationale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-vermenigvuldigen',
                        label: 'Vermenigvuldigen',
                        children: [
                            { id: 'hr-std-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-vermenigvuldigen-dec', label: 'Decimale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-vermenigvuldigen-rat', label: 'Rationale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
                    {
                        id: 'hr-std-delen',
                        label: 'Delen',
                        children: [
                            { id: 'hr-std-delen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'natural' } },
                            { id: 'hr-std-delen-dec', label: 'Decimale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'decimal' } },
                            { id: 'hr-std-delen-rat', label: 'Rationale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'rational' } },
                        ],
                    },
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
                ],
            },
            {
                id: 'hoofdrekenen-handig',
                label: 'Hoofdrekenen (handig rekenen)',
                placeholder: true,
                types: [
                    ph('handig-tienvoud', '× / : met 10, 100, 1000'),
                    ph('handig-compenseren', 'Handig rekenen (compenseren, splitsen)'),
                    ph('handig-rekenvolgorde', 'Rekenvolgorde en haakjes'),
                    ph('handig-kettingsommen', 'Kettingsommen'),
                ],
            },
            {
                id: 'schattend-rekenen',
                label: 'Schattend rekenen',
                placeholder: true,
                types: [ph('schattend-rekenen-item', 'Schattend rekenen')],
            },
            {
                id: 'controleren',
                label: 'Controleren',
                placeholder: true,
                types: [ph('controleren-negenproef', 'Negenproef / omgekeerde bewerking')],
            },
        ],
    },
    {
        id: 'meten-metend-rekenen',
        label: 'Meten en metend rekenen',
        accentVar: '--accent-metendrekenen',
        subdomains: [
            {
                id: 'kloklezen',
                label: 'Kloklezen',
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
                    ph('geld-rekenen-korting', 'Korting'),
                    ph('geld-rekenen-intrest', 'Intrest'),
                    ph('geld-rekenen-winst', 'Winst / Verlies'),
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
                id: 'tijdsduur',
                label: 'Tijdsduur',
                placeholder: true,
                types: [ph('tijdsduur-berekenen', 'Tijdsduur berekenen')],
            },
            {
                id: 'kalender',
                label: 'Kalender',
                placeholder: true,
                types: [ph('kalender-datum', 'Kalender / datum lezen')],
            },
            {
                id: 'lengte-oppervlakte',
                label: 'Lengte en oppervlakte',
                placeholder: true,
                types: [
                    ph('meten-liniaal', 'Meten met liniaal'),
                    ph('omtrek', 'Omtrek'),
                    ph('oppervlakte', 'Oppervlakte'),
                ],
            },
            {
                id: 'massa',
                label: 'Massa',
                placeholder: true,
                types: [ph('massa-weegschaal', 'Meten met weegschaal')],
            },
            {
                id: 'maateenheden',
                label: 'Maateenheden',
                placeholder: true,
                types: [ph('maateenheid-kiezen', 'Passende maateenheid kiezen')],
            },
            {
                id: 'herleidingen',
                label: 'Herleidingen',
                placeholder: true,
                types: [
                    ph('herleidingen-lengte', 'Lengte'),
                    ph('herleidingen-oppervlakte', 'Oppervlakte'),
                    ph('herleidingen-inhoud', 'Inhoud'),
                    ph('herleidingen-massa', 'Massa'),
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
                placeholder: true,
                types: [
                    phAcc('vormleer-punt-lijn', 'Punt / lijn / rechte', [
                        phLeaf('vormleer-punt-lijn-herkennen', 'Herkennen'),
                        phLeaf('vormleer-punt-lijn-tekenen', 'Tekenen'),
                    ]),
                    phAcc('vormleer-hoeken', 'Hoeken', [
                        phLeaf('vormleer-hoeken-herkennen', 'Herkennen'),
                        phLeaf('vormleer-hoeken-tekenen', 'Tekenen'),
                    ]),
                    phAcc('vormleer-vlakke-figuren', 'Vlakke figuren', [
                        phLeaf('vormleer-driehoeken-hoeken', 'Driehoeken (volgens hoeken)'),
                        phLeaf('vormleer-driehoeken-zijden', 'Driehoeken (volgens zijden)'),
                        phLeaf('vormleer-vierhoeken', 'Vierhoeken'),
                    ]),
                ],
            },
        ],
    },
    {
        id: 'vraagstukken',
        label: 'Vraagstukken',
        accentVar: '--accent-vraagstukken',
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
