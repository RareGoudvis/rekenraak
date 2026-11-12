// The one or two settings a teacher reaches for first, per exercise type: the Eenvoudig
// Inspector shows them in a highlighted block and tucks everything else under "Alle instellingen".
// Pure data: QuickBlock renders any row, so a new type needs a row here and no component.

export type QuickConstraints = Record<string, unknown>;

export interface QuickOption {
    label: string;
    value: unknown;
}

export interface QuickPills {
    kind: 'pills';
    // The constraint the pill writes (same key the type's Config writes).
    key: string;
    label: string;
    options: QuickOption[];
    // What the generator assumes while the key is unset, so the default pill reads as chosen.
    fallback?: unknown;
    // Hide the row when the current constraints make the setting meaningless (as the Config does).
    when?: (c: QuickConstraints) => boolean;
    // Values the Config builds itself (not a fixed list in CONSTRAINT_SPACE); the coverage test skips the membership check.
    free?: true;
}

// The writing-space control (Korte lijn / Lange lijn / Onder elkaar), same actions as HrStdStyleConfig.
export interface QuickLayout {
    kind: 'layout';
}

// The type's own whole settings panel, for types whose panel is still short (owner, 2026-11-12: the
// vormleer types are not fleshed out yet, so one pill would hide most of what they offer).
export interface QuickFull {
    kind: 'full';
}

export type QuickSpec = QuickPills | QuickLayout | QuickFull;

const layout: QuickLayout = { kind: 'layout' };
const full: QuickFull = { kind: 'full' };
const pills = (key: string, label: string, options: Array<[string, unknown]>, extra: Partial<QuickPills> = {}): QuickPills =>
    ({ kind: 'pills', key, label, options: options.map(([l, value]) => ({ label: l, value })), ...extra });

const upTo = (key: string, label: string, values: number[], extra: Partial<QuickPills> = {}) =>
    pills(key, label, values.map((v): [string, unknown] => [v.toLocaleString('nl-BE'), v]), extra);

const onOff = (key: string, label: string, on: string, off: string, fallback: boolean, extra: Partial<QuickPills> = {}) =>
    pills(key, label, [[on, true], [off, false]], { fallback, ...extra });

const tablesMode = (c: QuickConstraints) => (c.multiplicationMode ?? 'tafels') === 'tafels';
const shapeSubType = (c: QuickConstraints) => c.subType === undefined || c.subType === 'kleuren' || c.subType === 'herkennen';

const cijfer: QuickSpec[] = [upTo('maxRange', 'Tot welk getal?', [100, 1000, 10000, 100000])];
const tafels: QuickSpec[] = [
    pills('selectedTables', 'Welke tafels?', [['2, 5 en 10', [2, 5, 10]], ['3, 4 en 6', [3, 4, 6]], ['7, 8 en 9', [7, 8, 9]], ['Alle tafels', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]], { when: tablesMode, free: true }),
    layout,
];
const meten: QuickSpec[] = [
    pills('measureModel', 'Wat doet de leerling?', [['Meten met de lat', 'meten'], ['Maten zijn gegeven', 'gegeven']]),
    pills('precision', 'Hoe nauwkeurig?', [['Op de cm', 'cm'], ['Op de mm', 'mm']]),
];
const geldGetal: QuickSpec[] = [
    upTo('maxGetal', 'Tot hoeveel?', [10, 20, 100, 1000]),
    pills('format', 'Hoe schrijf je het bedrag?', [['Euro en cent', 'euros'], ['Kommagetal', 'decimaal']]),
];
const mab: QuickSpec[] = [
    upTo('maxNumber', 'Tot welk getal?', [20, 100, 1000, 9999]),
    pills('mabStyle', 'Hoe ziet het materiaal eruit?', [['Symbolen', 'symbolic'], ['Zwart-wit', 'mab-bw'], ['Kleur', 'mab-color']]),
];
const getallenlijn: QuickSpec[] = [
    upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000, 10000]),
    // With 2+ jumps the generators follow `jumps`, and a rational step is its noemer: this pill would do nothing.
    pills('step', 'Grootte van de sprong', [['1', 1], ['2', 2], ['5', 5], ['10', 10], ['100', 100]], { when: c => c.numberType !== 'rational' && !(Array.isArray(c.jumps) && c.jumps.length >= 2) }),
];
const divisors = (bigger: number[]): QuickPills =>
    pills('divisors', 'Deelbaar door', [['2', [2]], ['2, 5 en 10', [2, 5, 10]], ['Grotere getallen', bigger]]);

// Keyed by typeId; sheet furniture (layout-*) has no generator and needs no row.
export const QUICK_SETTINGS: Record<string, QuickSpec[]> = {
    'hr-std-optellen': [upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000, 10000]), layout],
    'hr-std-aftrekken': [upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000, 10000]), layout],
    'hr-std-vermenigvuldigen': tafels,
    'hr-std-delen': tafels,
    'hr-std-gemengd': [pills('variants', 'Welke bewerkingen?', [['Optellen en aftrekken', ['+', '-']], ['Maal en delen', ['x', ':']], ['Alle vier', ['+', '-', 'x', ':']]]), layout],

    'cijferen-optellen-nat': cijfer,
    'cijferen-optellen-dec': cijfer,
    'cijferen-aftrekken-nat': cijfer,
    'cijferen-aftrekken-dec': cijfer,
    'cijferen-vermenigvuldigen-nat': cijfer,
    'cijferen-vermenigvuldigen-dec': cijfer,
    'cijferen-delen-nat': cijfer,
    'cijferen-delen-dec': cijfer,

    'klok-kloklezen': [
        pills('clockType', 'Soort klok', [['Analoog', 'analoog'], ['Digitaal', 'digitaal']], { fallback: 'analoog' }),
        pills('timeTypes', 'Welke tijden?', [
            ['Hele uren', ['uren']],
            ['Hele en halve uren, kwartieren', ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor']],
            ['Per 5 minuten', ['nauwkeurig_5']],
            ['Per minuut', ['nauwkeurig_1']],
        ]),
    ],
    'breuken': [
        pills('shapes', 'Welke vorm?', [['Rechthoek', ['rectangle']], ['Cirkel', ['circle']], ['Allebei', ['rectangle', 'circle']]], { when: shapeSubType }),
        upTo('maxDenominator', 'Noemer tot', [4, 8, 12], { when: shapeSubType }),
    ],
    'splitsen': [upTo('maxGetal', 'Tot welk getal?', [10, 20, 100, 1000])],
    'geld-herkennen': geldGetal,
    'geld-tekenen': geldGetal,
    'geld-wissel': [pills('exerciseBills', 'Met welke biljetten?', [['5 euro', [500]], ['5 en 10 euro', [500, 1000]], ['20, 50 en 100 euro', [2000, 5000, 10000]]])],
    'geld-teruggeven': [pills('payWithOptions', 'Betaalt met', [['1 euro', [100]], ['2 euro', [200]], ['5 euro', [500]], ['10 euro', [1000]], ['10, 20 of 50 euro', [1000, 2000, 5000]]])],
    'mab-herkennen': mab,
    'mab-tekenen': mab,
    'ordenen': [
        pills('operatorMode', 'Volgorde', [['Oplopend', 'oplopend'], ['Aflopend', 'aflopend'], ['Beide', 'beide']]),
        pills('count', 'Hoeveel getallen?', [['2', 2], ['3', 3], ['5', 5]]),
    ],
    'breuken-bewerken': [pills('direction', 'Welke kant op?', [['Naar gemengd getal', 'naar-gemengd'], ['Naar breuk', 'naar-breuk'], ['Beide', 'beide']], { when: c => (c.subType ?? 'gemengd') === 'gemengd' })],
    'breuken-rangschikken': [
        pills('fractionMode', 'Welke breuken?', [['Stambreuken', 'stambreuken'], ['Gelijknamig', 'gelijknamige'], ['Gelijknamig maken', 'gelijknamig-te-maken'], ['Speciale breuken', 'speciale']]),
        pills('operatorMode', 'Volgorde', [['Oplopend', 'oplopend'], ['Aflopend', 'aflopend'], ['Beide', 'beide']]),
    ],
    'deelbaarheid': [divisors([3, 4, 6, 9, 25, 50, 100])],
    'getalpatronen': [
        pills('ops', 'Bewerking', [['Optellen', ['+']], ['Aftrekken', ['-']], ['Maal', ['x']], ['Delen', [':']], ['Optellen en aftrekken', ['+', '-']]]),
        upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000]),
    ],
    'deelbaarheid-kleuren': [divisors([3, 7, 11, 12])],
    'getallenas': getallenlijn,
    'getallenrijen': getallenlijn,
    'lengte-meten': meten,
    'omtrek': meten,
    'temperatuur': [
        pills('variant', 'Wat doet de leerling?', [['Kleuren', 'kleuren'], ['Aflezen', 'aflezen'], ['Verschil', 'verschil']]),
        onOff('includeNegatives', 'Temperaturen onder nul?', 'Met', 'Zonder', false),
    ],
    'plaatswaarde': [upTo('maxGetal', 'Tot welk getal?', [100, 1000, 10000, 100000])],
    'even-oneven': [
        pills('target', 'Welke getallen?', [['Even', 'even'], ['Oneven', 'oneven']]),
        upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000]),
    ],
    'vergelijken': [upTo('maxGetal', 'Tot welk getal?', [20, 100, 1000, 10000, 100000])],
    'afronden': [
        pills('roundTargets', 'Afronden op', [['Tientallen', ['T']], ['Honderdtallen', ['H']], ['Eenheden', ['E']], ['Tientallen en honderdtallen', ['T', 'H']]]),
        upTo('maxGetal', 'Tot welk getal?', [100, 1000, 10000, 100000]),
    ],
    'romeinse-cijfers': [pills('niveau', 'Tot welk niveau?', [['1', 1], ['2', 2], ['3', 3], ['4', 4]])],
    'herleidingen': [
        pills('measure', 'Welke maat?', [['Lengte', 'lengte'], ['Inhoud', 'inhoud'], ['Massa', 'massa'], ['Oppervlakte', 'oppervlakte']]),
        pills('vraag', 'Wat wordt gevraagd?', [['Getal', 'getal'], ['Eenheid', 'eenheid'], ['Afwisselend', 'afwisselend']]),
    ],
    'schattend': [
        pills('operators', 'Bewerking', [['Optellen', ['+']], ['Aftrekken', ['-']], ['Maal', ['x']], ['Delen', [':']], ['Alle vier', ['+', '-', 'x', ':']]]),
        pills('roundTargets', 'Afronden op', [['Tientallen', ['T']], ['Honderdtallen', ['H']], ['Eenheden', ['E']]]),
    ],
    'verbanden': [
        pills('reps', 'Welke schrijfwijzen?', [['Breuk en kommagetal', ['breuk', 'decimaal']], ['Breuk en procent', ['breuk', 'procent']], ['Alle drie', ['breuk', 'decimaal', 'procent']]]),
        pills('given', 'Wat is gegeven?', [['Door elkaar', 'random'], ['Breuk', 'breuk'], ['Kommagetal', 'decimaal'], ['Procent', 'procent']]),
    ],
    'procenten': [
        pills('percents', 'Welke procenten?', [['10 %', [10]], ['10, 25 en 50 %', [10, 25, 50]], ['1, 5, 20, 75 en 100 %', [1, 5, 20, 75, 100]]]),
        upTo('maxGetal', 'Tot welk getal?', [100, 1000, 10000]),
    ],
    'maateenheid': [
        pills('grootheden', 'Welke grootheid?', [['Lengte', ['lengte']], ['Massa', ['massa']], ['Inhoud', ['inhoud']], ['Tijd', ['tijd']], ['Temperatuur', ['temperatuur']], ['Alle', ['lengte', 'massa', 'inhoud', 'tijd', 'temperatuur']]]),
        pills('answerMode', 'Antwoord', [['Omcirkelen', 'omcirkelen'], ['Schrijven', 'schrijven']]),
    ],
    'geld-rekenen': [upTo('maxEuro', 'Prijzen tot (euro)', [100, 1000, 10000]), onOff('wholeEuros', 'Bedragen', 'Gehele euro', 'Met cent', true)],
    'rekenvolgorde': [pills('haakjesMode', 'Haakjes', [['Geen', 'GEEN'], ['Mag', 'MAG'], ['Moet', 'MOET']]), layout],
    'kettingsommen': [
        pills('ops', 'Bewerking', [['Optellen', ['+']], ['Optellen en aftrekken', ['+', '-']], ['Maal', ['x']], ['Delen', [':']], ['Alle vier', ['+', '-', 'x', ':']]]),
        pills('chainLength', 'Aantal stappen', [['3', 3], ['4', 4], ['5', 5]]),
    ],
    'getalfunctie': [
        pills('functies', 'Welke functie?', [['Hoeveelheid', ['hoeveelheid']], ['Rang', ['rang']], ['Maat', ['maat']], ['Code', ['code']], ['Alle vier', ['hoeveelheid', 'rang', 'maat', 'code']]]),
        pills('answerMode', 'Antwoord', [['Aankruisen', 'aankruisen'], ['Schrijven', 'schrijven']]),
    ],
    'tijdsduur': [
        pills('granularity', 'Hoe nauwkeurig?', [['Hele uren', ['heel-uur']], ['Kwartieren', ['kwartier']], ['Per 5 minuten', ['vijf-min']], ['Per minuut', ['een-min']]]),
        pills('blanks', 'Wat zoekt de leerling?', [['Duur', ['duur']], ['Einde', ['einde']], ['Begin', ['begin']], ['Alles', ['duur', 'einde', 'begin']]]),
    ],
    'kalender': [pills('questionCount', 'Aantal vragen', [['3', 3], ['5', 5], ['8', 8]], { when: c => (c.subType ?? 'maandrooster') !== 'maandrooster' })],
    'controleren': [pills('operators', 'Bewerking', [['Optellen', ['+']], ['Aftrekken', ['-']], ['Optellen en aftrekken', ['+', '-']]])],
    'oppervlakte': [pills('shapes', 'Welke figuren?', [['Rechthoek', ['rechthoek']], ['Rechthoek en vierkant', ['rechthoek', 'vierkant']], ['L-figuur', ['l-figuur']], ['Rechthoekige driehoek', ['rechthoekige-driehoek']]])],
    'weegschaal': [
        pills('stepGram', 'Streepjes per', [['20 g', 20], ['50 g', 50], ['100 g', 100], ['250 g', 250]]),
        pills('notatie', 'Antwoord in', [['Gram', 'g'], ['Kilo met komma', 'kg-komma'], ['Kilo en gram', 'kg-g']]),
    ],
    'vormleer-punt-lijn': [full],
    'vormleer-hoeken': [full],
    'vormleer-figuren': [full],
};
