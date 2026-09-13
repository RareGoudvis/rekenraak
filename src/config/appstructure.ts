import type { BlockConstraints } from '../services/math/constraintTypes';

// A leaf's default opdracht-titel: a fixed line, or a function of its merged constraints
// for families whose wording depends on a setting (e.g. ordenen's klein→groot / groot→klein).
export type InstructionFn = (c: BlockConstraints) => string;

export interface LeafExercise {
    id: string;
    label: string;
    typeId: string;
    defaultConstraints?: Record<string, unknown>;
    placeholder?: boolean;
    minLeerjaar?: 1 | 2 | 3 | 4 | 5 | 6;   // explicit grade gate; else inferred (gradePresets)
    instruction?: string | InstructionFn;
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
    instruction?: string | InstructionFn;
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

// ── instruction-fn helpers (settings-dependent opdracht-titels below) ───────
// Dutch "a, b en c" list join.
function joinNL(items: (string | number)[]): string {
    if (items.length <= 1) return items.join('');
    return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// splitsen-benen: which place-value letters the legs actually show for this maxGetal ("tot 1000" never rolls 1000 itself, so D stays out)
// (SYNC: mirrors splitsenGenerator.ts's INT_PLACES key/weight for D/H/T/E).
function placeLetters(maxGetal: number): string {
    const PLACES = [{ key: 'D', weight: 1000 }, { key: 'H', weight: 100 }, { key: 'T', weight: 10 }, { key: 'E', weight: 1 }];
    const inPlay = PLACES.filter(p => p.weight < Math.max(2, maxGetal)).map(p => p.key);
    return joinNL(inPlay.length ? inPlay : ['E']);
}

// ordenen + breuken-rangschikken share the same operatorMode axis (klein→groot default).
function orderDirectionInstruction(subject: string): InstructionFn {
    return (c) => c.operatorMode === 'aflopend'
        ? `Zet ${subject}in volgorde van groot naar klein.`
        : c.operatorMode === 'beide'
            ? `Zet ${subject}in volgorde (klein → groot of groot → klein).`
            : `Zet ${subject}in volgorde van klein naar groot.`;
}
const ordenenInstruction = orderDirectionInstruction('');
const breukenRangschikkenInstruction = orderDirectionInstruction('de breuken ');

// afronden: the review table asks for the raw place-value letters ("Rond af op T en H."),
// same shorthand the rooster/simpel viewers already print on the sheet.
const roundTargetsInstruction: InstructionFn = (c) =>
    `Rond af op ${joinNL((c.roundTargets as string[] | undefined) ?? ['T', 'H'])}.`;

const schattendInstruction: InstructionFn = (c) => c.scaffolding === 'tussenstappen' ? 'Rond af en schat.' : 'Schat het antwoord.';

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
                            { id: 'mab-herkennen', label: 'Getallen herkennen', typeId: 'mab-herkennen', instruction: 'Welk getal is dit?' },
                            { id: 'mab-tekenen', label: 'Getallen tekenen', typeId: 'mab-tekenen', instruction: 'Teken het getal met MAB-materiaal.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-plaatswaarde', label: 'Plaatswaarde benoemen',
                        children: [
                            // Wording says "onderstreepte" rather than the review table's "aangeduide": the
                            // viewer marks the digit with an underline (never bold), so the title should
                            // name what the pupil actually sees.
                            { id: 'plaatswaarde-waarde', label: 'Waarde van cijfer', typeId: 'plaatswaarde', defaultConstraints: { subType: 'waarde' }, instruction: 'Wat is de waarde van het onderstreepte cijfer?' },
                            { id: 'plaatswaarde-plaats', label: 'Plaats benoemen',    typeId: 'plaatswaarde', defaultConstraints: { subType: 'plaats' }, instruction: 'Op welke plaats staat het onderstreepte cijfer?' },
                            { id: 'plaatswaarde-omcirkelen', label: 'Plaats omcirkelen', typeId: 'plaatswaarde', defaultConstraints: { subType: 'omcirkelen' }, instruction: 'Omcirkel de plaats van het onderstreepte cijfer.' },
                            { id: 'plaatswaarde-tabel',  label: 'Tabel invullen',     typeId: 'plaatswaarde', defaultConstraints: { subType: 'tabel' }, instruction: 'Vul de plaatswaardetabel in.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-splitsen',
                        label: 'Splitsen',
                        children: [
                            { id: 'splitsen-basis', label: 'Rooster', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'basic', rowsPerBox: 4 }, instruction: 'Splits het getal.' },
                            { id: 'splitsen-boom', label: 'Splitsboom', typeId: 'splitsen', defaultConstraints: { maxGetal: 100, layout: 'splitsboom', blankPositions: ['right'] }, instruction: 'Vul de splitsboom aan.' },
                            { id: 'splitsen-harten', label: 'Verliefde harten', typeId: 'splitsen', defaultConstraints: { maxGetal: 10, layout: 'verliefde-harten' }, instruction: 'Vul de verliefde harten aan.' },
                            { id: 'splitsen-positietabel', label: 'Positietabel', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-tabel' }, instruction: 'Vul de positietabel in.' },
                            { id: 'splitsen-benen', label: 'Splitsbenen (H/T/E)', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-benen', benenVariants: ['legs-letters'] }, instruction: (c) => `Splits in ${placeLetters(Number(c.maxGetal ?? 1000))}.` },
                            { id: 'splitsen-plaatswaarden', label: 'Plaatswaarden', typeId: 'splitsen', defaultConstraints: { maxGetal: 1000, layout: 'positie-math', mathForms: ['letters'], mathDirection: 'decompose' }, instruction: (c) => c.mathDirection === 'compose' ? 'Schrijf het getal.' : c.mathDirection === 'beide' ? 'Splits of schrijf het getal volgens plaatswaarde.' : 'Splits volgens plaatswaarde.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-vergelijken', label: 'Vergelijken (<, >, =)',
                        children: [
                            { id: 'vergelijken-getallen', label: 'Twee getallen', typeId: 'vergelijken', defaultConstraints: { subType: 'getallen' }, instruction: 'Vul in: <, > of =.' },
                            { id: 'vergelijken-kiezen',   label: 'Grootste / kleinste', typeId: 'vergelijken', defaultConstraints: { subType: 'kiezen' }, instruction: (c) => c.chooseTarget === 'kleinste' ? 'Omcirkel het kleinste getal.' : 'Omcirkel het grootste getal.' },
                            { id: 'vergelijken-representaties', label: 'Breuken & kommagetallen', typeId: 'vergelijken', defaultConstraints: { subType: 'representaties', leftRep: 'breuk', rightRep: 'kommagetal', maxGetal: 10, decimalPlaces: 1 }, instruction: 'Vul in: <, > of =.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-ordenen',
                        label: 'Ordenen',
                        children: [
                            { id: 'getalbegrip-ordenen-nat', label: 'Natuurlijke getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'natural' }, instruction: ordenenInstruction },
                            { id: 'getalbegrip-ordenen-dec', label: 'Decimale getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'decimal' }, instruction: ordenenInstruction },
                            { id: 'getalbegrip-ordenen-rat', label: 'Rationale getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'rational' }, instruction: ordenenInstruction },
                            { id: 'getalbegrip-ordenen-geh', label: 'Gehele getallen', typeId: 'ordenen', defaultConstraints: { numberType: 'geheel' }, instruction: ordenenInstruction },
                        ],
                    },
                    {
                        id: 'getalbegrip-getallenassen',
                        label: 'Getallenassen',
                        children: [
                            { id: 'getalbegrip-getallenassen-nat', label: 'Natuurlijke getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'natural' }, instruction: 'Vul de getallenas aan.' },
                            { id: 'getalbegrip-getallenassen-dec', label: 'Decimale getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'decimal', step: 0.5, maxGetal: 20 }, instruction: 'Vul de getallenas aan.' },
                            { id: 'getalbegrip-getallenassen-rat', label: 'Rationale getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'rational', fractionStep: 4, ticks: 6 }, instruction: 'Vul de getallenas aan.' },
                            { id: 'getalbegrip-getallenassen-geh', label: 'Gehele getallen', typeId: 'getallenas', defaultConstraints: { numberType: 'geheel', maxGetal: 20, step: 5 }, instruction: 'Vul de getallenas aan.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-getallenrijen',
                        label: 'Getallenrijen',
                        children: [
                            { id: 'getalbegrip-getallenrijen-nat', label: 'Natuurlijke getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'natural' }, instruction: 'Vul de getallenrij aan.' },
                            { id: 'getalbegrip-getallenrijen-dec', label: 'Decimale getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'decimal', step: 0.1, maxGetal: 10 }, instruction: 'Vul de getallenrij aan.' },
                            { id: 'getalbegrip-getallenrijen-rat', label: 'Rationale getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'rational', fractionStep: 4, ticks: 6 }, instruction: 'Vul de getallenrij aan.' },
                            { id: 'getalbegrip-getallenrijen-geh', label: 'Gehele getallen', typeId: 'getallenrijen', defaultConstraints: { numberType: 'geheel', maxGetal: 20, step: 5 }, instruction: 'Vul de getallenrij aan.' },
                        ],
                    },
                    {
                        id: 'getalbegrip-verbanden', label: 'Verbanden (breuk · decimaal · procent)',
                        children: [
                            { id: 'verbanden-tabel', label: 'Tabel invullen', typeId: 'verbanden', defaultConstraints: { subType: 'tabel' }, minLeerjaar: 5, instruction: 'Vul de tabel aan: breuk, kommagetal en procent.' },
                            { id: 'verbanden-paren', label: 'Omzettingen', typeId: 'verbanden', defaultConstraints: { subType: 'paren' }, minLeerjaar: 5, instruction: 'Zet om.' },
                        ],
                    },
                ],
            },
            {
                // C1 step 2: getalfunctie used to be a bare leaf inside 'getalbegrip', sitting
                // oddly among the plaatswaarde/splitsen/vergelijken accordions — it is its own
                // topic (a number's role: hoeveelheid/rang/maat/code), not a getalbegrip skill.
                id: 'functie-van-getallen',
                label: 'Functie van getallen',
                types: [
                    { id: 'getalbegrip-functie', label: 'Functie van getallen', typeId: 'getalfunctie', minLeerjaar: 2, instruction: (c) => c.answerMode === 'schrijven' ? 'Wat betekent het getal in de zin?' : 'Wat betekent het getal? Kruis aan.' },
                ],
            },
            {
                id: 'breuken',
                label: 'Breuken',
                types: [
                    { id: 'breuken-kleuren', label: 'Breuken kleuren', typeId: 'breuken', defaultConstraints: { subType: 'kleuren' }, instruction: 'Kleur de breuk.' },
                    { id: 'breuken-herkennen', label: 'Breuken herkennen', typeId: 'breuken', defaultConstraints: { subType: 'herkennen' }, instruction: 'Welk deel is gekleurd? Schrijf de breuk.' },
                    // answerFormat must be set here: the registry default ('fraction-questions') is a
                    // herkennen value, and defaultsFor() only runs on a variant switch, not on block add.
                    { id: 'breuken-hoeveelheid', label: 'Breuk van een hoeveelheid', typeId: 'breuken', defaultConstraints: { subType: 'hoeveelheid', answerFormat: 'met-hulp', maxDenominator: 5, maxTotal: 20 }, instruction: 'Bereken de breuk van de hoeveelheid.' },
                    { id: 'breuken-lijnstuk', label: 'Breuk van een lijnstuk', typeId: 'breuken', defaultConstraints: { subType: 'lijnstuk' }, instruction: 'Duid de breuk aan op het lijnstuk.' },
                    { id: 'breuken-veelhoek', label: 'Breuk van een veelhoek', typeId: 'breuken', defaultConstraints: { subType: 'veelhoek' }, instruction: 'Kleur de breuk van de veelhoek.' },
                    { id: 'breuken-rangschikken', label: 'Breuken rangschikken', typeId: 'breuken-rangschikken', instruction: breukenRangschikkenInstruction },
                ],
            },
            {
                id: 'afronden',
                label: 'Afronden',
                types: [
                    {
                        id: 'afronden-nat', label: 'Natuurlijke getallen',
                        children: [
                            { id: 'afronden-nat-rooster', label: 'Rooster', typeId: 'afronden', defaultConstraints: { subType: 'rooster', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] }, instruction: roundTargetsInstruction },
                            { id: 'afronden-nat-simpel',  label: 'Eenvoudig (≈)', typeId: 'afronden', defaultConstraints: { subType: 'simpel', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] }, instruction: roundTargetsInstruction },
                        ],
                    },
                    {
                        id: 'afronden-dec', label: 'Decimale getallen',
                        children: [
                            { id: 'afronden-dec-rooster', label: 'Rooster', typeId: 'afronden', defaultConstraints: { subType: 'rooster', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] }, instruction: roundTargetsInstruction },
                            { id: 'afronden-dec-simpel',  label: 'Eenvoudig (≈)', typeId: 'afronden', defaultConstraints: { subType: 'simpel', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] }, instruction: roundTargetsInstruction },
                        ],
                    },
                ],
            },
            {
                id: 'patronen',
                label: 'Patronen',
                types: [
                    { id: 'patronen-nat', label: 'Natuurlijke getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'natural' }, instruction: 'Zet de rij verder.' },
                    { id: 'patronen-dec', label: 'Decimale getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'decimal', maxGetal: 100 }, instruction: 'Zet de rij verder.' },
                    { id: 'patronen-geh', label: 'Gehele getallen', typeId: 'getalpatronen', defaultConstraints: { numberType: 'geheel', maxGetal: 100 }, instruction: 'Zet de rij verder.' },
                    { id: 'patronen-kettingsommen', label: 'Kettingsommen', typeId: 'kettingsommen', minLeerjaar: 2, instruction: 'Reken de kettingsom uit.' },
                ],
            },
            {
                id: 'even-oneven',
                label: 'Even en oneven',
                types: [
                    { id: 'even-oneven-rooster', label: 'Rooster kleuren', typeId: 'even-oneven', defaultConstraints: { subType: 'rooster' }, instruction: (c) => c.target === 'oneven' ? 'Kleur de oneven getallen.' : 'Kleur de even getallen.' },
                    { id: 'even-oneven-cirkels', label: 'Cirkels groeperen', typeId: 'even-oneven', defaultConstraints: { subType: 'cirkels' }, instruction: 'Maak groepjes van twee. Even of oneven?' },
                ],
            },
            {
                id: 'veelvouden-deelbaarheid',
                label: 'Veelvouden en deelbaarheid',
                types: [
                    { id: 'deelbaarheid-veelvouden', label: 'Veelvouden aanvullen', typeId: 'deelbaarheid', defaultConstraints: { layout: 'veelvouden' }, instruction: 'Vul de veelvouden aan.' },
                    { id: 'deelbaarheid-tabel', label: 'Deelbaarheidstabel', typeId: 'deelbaarheid', defaultConstraints: { layout: 'tabel' }, instruction: 'Kruis aan: door welke getallen is het getal deelbaar?' },
                    {
                        id: 'deelbaarheid-kleuren-acc', label: 'Deelbaarheid (kleuren)',
                        children: [
                            { id: 'deelbaarheid-rooster', label: 'Rooster', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'strip', divisors: [2, 5, 10] }, instruction: (c) => `Kleur de veelvouden van ${joinNL((c.divisors as number[] | undefined) ?? [2, 5, 10])}.` },
                            { id: 'deelbaarheid-omcirkelen', label: 'Omcirkelen', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'markeren', divisors: [2, 5, 10] }, instruction: (c) => `Omcirkel de veelvouden van ${joinNL((c.divisors as number[] | undefined) ?? [2, 5, 10])}.` },
                            // 'raster' is now the strip mode's 'rechthoek' shape (C1 step 6) — the
                            // leaf id/label stay the same, only what they set underneath changed.
                            { id: 'deelbaarheid-kleurraster', label: 'Kleurraster', typeId: 'deelbaarheid-kleuren', defaultConstraints: { viewMode: 'strip', rasterVorm: 'rechthoek', divisors: [2, 5, 10] }, instruction: (c) => `Kleur de veelvouden van ${joinNL((c.divisors as number[] | undefined) ?? [2, 5, 10])}.` },
                        ],
                    },
                ],
            },
            {
                id: 'procenten',
                label: 'Procenten',
                types: [
                    { id: 'procenten-nemen', label: 'Percent van een getal', typeId: 'procenten', defaultConstraints: { subType: 'nemen' }, minLeerjaar: 5, instruction: 'Reken uit.' },
                    { id: 'procenten-welk', label: 'Hoeveel procent?', typeId: 'procenten', defaultConstraints: { subType: 'welk-percent' }, minLeerjaar: 5, instruction: 'Hoeveel procent is het?' },
                    { id: 'procenten-verbanden', label: 'Breuk · decimaal · procent', typeId: 'verbanden', minLeerjaar: 5, instruction: 'Vul de tabel aan: breuk, kommagetal en procent.' },
                ],
            },
            {
                id: 'romeinse-cijfers',
                label: 'Romeinse cijfers',
                types: [
                    { id: 'romeinse-herkennen', label: 'Herkennen (→ getal)', typeId: 'romeinse-cijfers', defaultConstraints: { subType: 'herkennen' }, instruction: 'Welk getal is dit?' },
                    { id: 'romeinse-schrijven', label: 'Schrijven (→ Romeins)', typeId: 'romeinse-cijfers', defaultConstraints: { subType: 'schrijven' }, instruction: 'Schrijf in Romeinse cijfers.' },
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
                            { id: 'hr-std-optellen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'natural' }, instruction: 'Reken uit.' },
                            { id: 'hr-std-optellen-dec', label: 'Decimale getallen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'decimal' }, instruction: 'Reken uit.' },
                        ],
                    },
                    {
                        id: 'hr-std-aftrekken',
                        label: 'Aftrekken (standaardprocedure)',
                        children: [
                            { id: 'hr-std-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'natural' }, instruction: 'Reken uit.' },
                            { id: 'hr-std-aftrekken-dec', label: 'Decimale getallen', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'decimal' }, instruction: 'Reken uit.' },
                        ],
                    },
                    {
                        id: 'hr-std-vermenigvuldigen',
                        label: 'Vermenigvuldigen (standaardprocedure)',
                        children: [
                            { id: 'hr-std-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'natural' }, instruction: 'Reken uit.' },
                            { id: 'hr-std-vermenigvuldigen-dec', label: 'Decimale getallen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'decimal' }, instruction: 'Reken uit.' },
                        ],
                    },
                    {
                        id: 'hr-std-delen',
                        label: 'Delen (standaardprocedure)',
                        children: [
                            { id: 'hr-std-delen-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'natural' }, instruction: 'Reken uit.' },
                            { id: 'hr-std-delen-dec', label: 'Decimale getallen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'decimal' }, instruction: 'Reken uit.' },
                        ],
                    },
                    // Last of the family on purpose: one block that mixes the four operations
                    // (and their presets) is a rehearsal of what comes before it.
                    {
                        id: 'hr-std-gemengd',
                        label: 'Gemengd',
                        children: [
                            { id: 'hr-std-gemengd-nat', label: 'Natuurlijke getallen', typeId: 'hr-std-gemengd', defaultConstraints: { numberType: 'natural' }, instruction: 'Reken uit.' },
                            { id: 'hr-std-gemengd-dec', label: 'Decimale getallen', typeId: 'hr-std-gemengd', defaultConstraints: { numberType: 'decimal' }, instruction: 'Reken uit.' },
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
                    { id: 'handig-rekenvolgorde', label: 'Rekenvolgorde en haakjes', typeId: 'rekenvolgorde', minLeerjaar: 4, instruction: 'Reken uit. Let op de volgorde van de bewerkingen.' },
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
                            { id: 'cijferen-optellen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-optellen-nat', defaultConstraints: { operator: '+', numberType: 'natural' }, instruction: 'Cijfer uit.' },
                            { id: 'cijferen-optellen-dec', label: 'Kommagetallen', typeId: 'cijferen-optellen-dec', defaultConstraints: { operator: '+', numberType: 'decimal' }, instruction: 'Cijfer uit.' },
                        ],
                    },
                    {
                        id: 'cijferen-aftrekken',
                        label: 'Aftrekken',
                        children: [
                            { id: 'cijferen-aftrekken-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-aftrekken-nat', defaultConstraints: { operator: '-', numberType: 'natural' }, instruction: 'Cijfer uit.' },
                            { id: 'cijferen-aftrekken-dec', label: 'Kommagetallen', typeId: 'cijferen-aftrekken-dec', defaultConstraints: { operator: '-', numberType: 'decimal' }, instruction: 'Cijfer uit.' },
                        ],
                    },
                    {
                        id: 'cijferen-vermenigvuldigen',
                        label: 'Vermenigvuldigen',
                        children: [
                            { id: 'cijferen-vermenigvuldigen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-vermenigvuldigen-nat', defaultConstraints: { operator: 'x', numberType: 'natural' }, instruction: 'Cijfer uit.' },
                            { id: 'cijferen-vermenigvuldigen-dec', label: 'Kommagetallen', typeId: 'cijferen-vermenigvuldigen-dec', defaultConstraints: { operator: 'x', numberType: 'decimal' }, instruction: 'Cijfer uit.' },
                        ],
                    },
                    {
                        id: 'cijferen-delen',
                        label: 'Delen',
                        children: [
                            { id: 'cijferen-delen-nat', label: 'Natuurlijke getallen', typeId: 'cijferen-delen-nat', defaultConstraints: { operator: ':', numberType: 'natural' }, instruction: 'Cijfer uit.' },
                            { id: 'cijferen-delen-dec', label: 'Kommagetallen', typeId: 'cijferen-delen-dec', defaultConstraints: { operator: ':', numberType: 'decimal' }, instruction: 'Cijfer uit.' },
                        ],
                    },
                    // Negenproef checks a worked cijfer-multiplication — it belongs with cijferen.
                    { id: 'controleren-negenproef', label: 'Negenproef', typeId: 'controleren', defaultConstraints: { subType: 'negenproef' }, minLeerjaar: 5, instruction: 'Controleer met de negenproef.' },
                ],
            },
            {
                id: 'schattend-rekenen',
                label: 'Schattend rekenen',
                types: [
                    { id: 'schattend-nat', label: 'Natuurlijke getallen', typeId: 'schattend', defaultConstraints: { numberType: 'natural' }, minLeerjaar: 3, instruction: schattendInstruction },
                    { id: 'schattend-dec', label: 'Kommagetallen', typeId: 'schattend', defaultConstraints: { numberType: 'decimal', maxGetal: 100, roundTargets: ['E'] }, minLeerjaar: 4, instruction: schattendInstruction },
                ],
            },
            {
                id: 'controleren',
                label: 'Controleren',
                types: [
                    { id: 'controleren-omgekeerde', label: 'Omgekeerde bewerking', typeId: 'controleren', defaultConstraints: { subType: 'omgekeerde', maxGetal: 1000 }, minLeerjaar: 3, instruction: 'Reken uit en controleer met de omgekeerde bewerking.' },
                ],
            },
            {
                id: 'bewerkingen-breuken',
                label: 'Bewerkingen met breuken',
                types: [
                    // Fraction arithmetic (+ − × :) — leerplan "Bewerkingen met breuken", introduced L4.
                    { id: 'hr-std-optellen-rat', label: 'Optellen', typeId: 'hr-std-optellen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4, instruction: 'Reken uit.' },
                    { id: 'hr-std-aftrekken-rat', label: 'Aftrekken', typeId: 'hr-std-aftrekken', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4, instruction: 'Reken uit.' },
                    { id: 'hr-std-vermenigvuldigen-rat', label: 'Vermenigvuldigen', typeId: 'hr-std-vermenigvuldigen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4, instruction: 'Reken uit.' },
                    { id: 'hr-std-delen-rat', label: 'Delen', typeId: 'hr-std-delen', defaultConstraints: { numberType: 'rational' }, minLeerjaar: 4, instruction: 'Reken uit.' },
                    { id: 'breuken-gemengd', label: 'Gemengd getal ↔ breuk', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'gemengd', direction: 'naar-gemengd' }, instruction: (c) => c.direction === 'naar-breuk' ? 'Schrijf als breuk.' : 'Schrijf als gemengd getal.' },
                    { id: 'breuken-gelijknamig', label: 'Gelijknamig maken', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'gelijknamig' }, instruction: 'Maak gelijknamig.' },
                    { id: 'breuken-vereenvoudigen', label: 'Vereenvoudigen', typeId: 'breuken-bewerken', defaultConstraints: { subType: 'vereenvoudigen' }, instruction: 'Vereenvoudig.' },
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
                            { id: 'vormleer-punt-lijn-herkennen', label: 'Herkennen', typeId: 'vormleer-punt-lijn', defaultConstraints: { mode: 'herkennen' }, minLeerjaar: 3, instruction: 'Hoe heet dit?' },
                            { id: 'vormleer-punt-lijn-tekenen', label: 'Tekenen', typeId: 'vormleer-punt-lijn', defaultConstraints: { mode: 'tekenen' }, minLeerjaar: 3, instruction: 'Teken.' },
                        ],
                    },
                    {
                        id: 'vormleer-hoeken', label: 'Hoeken',
                        children: [
                            { id: 'vormleer-hoeken-herkennen', label: 'Herkennen', typeId: 'vormleer-hoeken', defaultConstraints: { mode: 'herkennen' }, minLeerjaar: 3, instruction: 'Welke soort hoek is dit?' },
                            { id: 'vormleer-hoeken-tekenen', label: 'Tekenen', typeId: 'vormleer-hoeken', defaultConstraints: { mode: 'tekenen' }, minLeerjaar: 3, instruction: 'Teken de hoek.' },
                            { id: 'vormleer-hoeken-meten', label: 'Meten', typeId: 'vormleer-hoeken', defaultConstraints: { kind: 'hoek', mode: 'meten', exercisesPerRow: 2 }, minLeerjaar: 4, instruction: 'Meet de hoek en schrijf het aantal graden.' },
                        ],
                    },
                    {
                        id: 'vormleer-vlakke-figuren', label: 'Vlakke figuren',
                        children: [
                            // One driehoeken leaf: the config offers both classification axes (hoeken + zijden).
                            { id: 'vormleer-driehoeken', label: 'Driehoeken', typeId: 'vormleer-figuren', defaultConstraints: { classify: 'driehoeken', concepts: ['scherphoekig', 'rechthoekig', 'stomphoekig', 'gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'] }, minLeerjaar: 4, instruction: (c) => c.mode === 'eigenschappen' ? 'Vul de eigenschappen in.' : 'Welke soort driehoek is dit?' },
                            { id: 'vormleer-vierhoeken', label: 'Vierhoeken', typeId: 'vormleer-figuren', defaultConstraints: { classify: 'vierhoeken' }, minLeerjaar: 4, instruction: (c) => c.mode === 'eigenschappen' ? 'Vul de eigenschappen in.' : 'Welke vierhoek is dit?' },
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
                            { id: 'klok-analoog-lezen', label: 'Lezen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'lezen' }, instruction: 'Hoe laat is het?' },
                            { id: 'klok-analoog-tekenen', label: 'Tekenen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'tekenen' }, instruction: 'Teken de wijzers.' },
                            { id: 'klok-analoog-omzetten', label: 'Omzetten', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'analoog', exerciseMode: 'omzetten' }, instruction: 'Schrijf de tijd digitaal.' },
                        ],
                    },
                    {
                        id: 'klok-digitaal', label: 'Digitale klok',
                        children: [
                            { id: 'klok-digitaal-lezen', label: 'Lezen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'digitaal', exerciseMode: 'lezen' }, instruction: 'Hoe laat is het?' },
                            { id: 'klok-digitaal-tekenen', label: 'Tekenen', typeId: 'klok-kloklezen', defaultConstraints: { clockType: 'digitaal', exerciseMode: 'tekenen' }, instruction: 'Vul de digitale klok in.' },
                        ],
                    },
                    { id: 'tijdsduur-berekenen', label: 'Tijdsduur berekenen', typeId: 'tijdsduur', minLeerjaar: 3, instruction: 'Vul in: begin, einde of duur.' },
                    {
                        id: 'kalender-datum', label: 'Kalender / datum lezen',
                        children: [
                            { id: 'kalender-maandrooster', label: 'Maandrooster lezen', typeId: 'kalender', defaultConstraints: { subType: 'maandrooster' }, minLeerjaar: 2, instruction: 'Bekijk de kalender en vul in.' },
                            { id: 'kalender-datum-rekenen', label: 'Rekenen met dagen', typeId: 'kalender', defaultConstraints: { subType: 'datum-rekenen' }, minLeerjaar: 3, instruction: 'Reken met dagen.' },
                            { id: 'kalender-notatie', label: 'Datumnotatie', typeId: 'kalender', defaultConstraints: { subType: 'notatie' }, minLeerjaar: 3, instruction: 'Schrijf de datum anders.' },
                        ],
                    },
                ],
            },
            {
                id: 'geld',
                label: 'Geld',
                types: [
                    { id: 'geld-herkennen',   label: 'Herkennen',      typeId: 'geld-herkennen', instruction: 'Hoeveel geld is dit?' },
                    { id: 'geld-tekenen',     label: 'Bedrag tekenen', typeId: 'geld-tekenen', instruction: 'Teken het bedrag.' },
                    { id: 'geld-wissel',      label: 'Wissel',         typeId: 'geld-wissel', instruction: 'Wissel het bedrag.' },
                    { id: 'geld-teruggeven',  label: 'Teruggeven',     typeId: 'geld-teruggeven', instruction: 'Hoeveel krijg je terug?' },
                    { id: 'geld-rekenen-korting', label: 'Korting', typeId: 'geld-rekenen', defaultConstraints: { subType: 'korting', percents: [10, 25, 50] }, minLeerjaar: 5, instruction: 'Bereken de korting en de nieuwe prijs.' },
                    { id: 'geld-rekenen-intrest', label: 'Intrest', typeId: 'geld-rekenen', defaultConstraints: { subType: 'intrest', percents: [1, 2, 5], maxEuro: 10000 }, minLeerjaar: 6, instruction: 'Bereken de intrest.' },
                    { id: 'geld-rekenen-winst', label: 'Winst / Verlies', typeId: 'geld-rekenen', defaultConstraints: { subType: 'winst' }, minLeerjaar: 5, instruction: 'Bereken de winst of het verlies.' },
                ],
            },
            {
                id: 'temperatuur',
                label: 'Temperatuur',
                types: [
                    { id: 'temperatuur-kleuren', label: 'Meter kleuren', typeId: 'temperatuur', defaultConstraints: { variant: 'kleuren' }, instruction: 'Kleur de thermometer.' },
                    { id: 'temperatuur-aflezen', label: 'Meter aflezen', typeId: 'temperatuur', defaultConstraints: { variant: 'aflezen' }, instruction: 'Lees de temperatuur af.' },
                    { id: 'temperatuur-verschil', label: 'Verschil', typeId: 'temperatuur', defaultConstraints: { variant: 'verschil', mode1: 'gekleurd', mode2: 'getal' }, instruction: 'Bereken het verschil in temperatuur.' },
                ],
            },
            {
                id: 'lengte-oppervlakte',
                label: 'Lengte en oppervlakte',
                types: [
                    { id: 'lengte-meten', label: 'Lengte meten', typeId: 'lengte-meten', instruction: (c) => c.measureModel === 'gegeven' ? 'Juist of fout?' : 'Meet.' },
                    { id: 'omtrek', label: 'Omtrek', typeId: 'omtrek', instruction: 'Bereken de omtrek.' },
                    {
                        id: 'oppervlakte', label: 'Oppervlakte',
                        children: [
                            { id: 'oppervlakte-rooster', label: 'Rooster tellen', typeId: 'oppervlakte', defaultConstraints: { subType: 'rooster', shapes: ['rechthoek', 'l-figuur'] }, minLeerjaar: 3, instruction: 'Tel de vierkantjes. Wat is de oppervlakte?' },
                            { id: 'oppervlakte-berekenen', label: 'Berekenen', typeId: 'oppervlakte', defaultConstraints: { subType: 'berekenen' }, minLeerjaar: 5, instruction: 'Bereken de oppervlakte.' },
                        ],
                    },
                ],
            },
            {
                id: 'massa',
                label: 'Massa',
                types: [
                    { id: 'massa-weegschaal-aflezen', label: 'Weegschaal aflezen', typeId: 'weegschaal', defaultConstraints: { mode: 'aflezen' }, minLeerjaar: 2, instruction: 'Lees het gewicht af.' },
                    { id: 'massa-weegschaal-tekenen', label: 'Weegschaal kleuren', typeId: 'weegschaal', defaultConstraints: { mode: 'kleuren' }, minLeerjaar: 2, instruction: 'Kleur de weegschaal tot het gegeven gewicht.' },
                ],
            },
            {
                id: 'maateenheden',
                label: 'Maateenheden',
                types: [
                    { id: 'maateenheid-kiezen', label: 'Passende maateenheid kiezen', typeId: 'maateenheid', minLeerjaar: 2, instruction: (c) => c.answerMode === 'schrijven' ? 'Schrijf de passende maateenheid.' : 'Omcirkel de passende maateenheid.' },
                ],
            },
            {
                id: 'herleidingen',
                label: 'Herleidingen',
                types: [
                    { id: 'herleidingen-lengte', label: 'Lengte', typeId: 'herleidingen', defaultConstraints: { measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'] }, instruction: 'Zet om.' },
                    { id: 'herleidingen-inhoud', label: 'Inhoud', typeId: 'herleidingen', defaultConstraints: { measure: 'inhoud', units: ['l', 'dl', 'cl', 'ml'] }, instruction: 'Zet om.' },
                    { id: 'herleidingen-massa', label: 'Massa', typeId: 'herleidingen', defaultConstraints: { measure: 'massa', units: ['kg', 'dag', 'g', 'dg'] }, instruction: 'Zet om.' },
                    { id: 'herleidingen-oppervlakte', label: 'Oppervlakte', typeId: 'herleidingen', defaultConstraints: { measure: 'oppervlakte', units: ['m²', 'dm²', 'cm²', 'a', 'ca', 'ha'] }, instruction: 'Zet om.' },
                ],
            },
        ],
    },
    {
        // Sheet furniture, not maths: separators, writing lines, squared grids, a memory
        // box, a blank page. Deliberately its own domain at the bottom of the sidebar so
        // it never competes with the exercise types for attention.
        id: 'bladonderdelen',
        label: 'Bladonderdelen',
        accentVar: '--accent-vraagstukken',
        subdomains: [
            {
                id: 'bladonderdelen-indeling',
                label: 'Indeling',
                types: [
                    { id: 'layout-sectie', label: 'Sectie / scheidingslijn', typeId: 'layout-sectie' },
                    { id: 'layout-lege-pagina', label: 'Lege pagina', typeId: 'layout-lege-pagina' },
                ],
            },
            {
                id: 'bladonderdelen-schrijven',
                label: 'Schrijven en tekenen',
                types: [
                    { id: 'layout-schrijflijnen', label: 'Schrijflijnen', typeId: 'layout-schrijflijnen' },
                    { id: 'layout-raster', label: 'Ruitjesraster', typeId: 'layout-raster' },
                ],
            },
            {
                id: 'bladonderdelen-kaders',
                label: 'Kaders',
                types: [
                    { id: 'layout-kader', label: 'Onthoudkader', typeId: 'layout-kader' },
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

// ── typeId → its domain ──────────────────────────────────────────────────────
// The tree is the only place that knows which domain an exercise belongs to, and
// several panels (sidebar Overzicht, the Inspector chip) need to show that. Built
// once at module load so nobody re-walks the tree per render.
export interface DomainTag {
    id: string;
    label: string;
    accentVar: string;
    /** The domain half of the token name, e.g. 'bewerkingen' — feeds --domain-<name>-line/-soft. */
    name: string;
}

export const DOMAIN_BY_TYPE: Record<string, DomainTag> = (() => {
    const map: Record<string, DomainTag> = {};
    for (const domain of APP_STRUCTURE) {
        const tag: DomainTag = {
            id: domain.id,
            label: domain.label,
            accentVar: domain.accentVar,
            name: domain.accentVar.replace('--accent-', ''),
        };
        for (const sub of domain.subdomains) {
            for (const type of sub.types) {
                if (type.typeId) map[type.typeId] = tag;
                for (const leaf of type.children ?? []) map[leaf.typeId] = tag;
            }
        }
    }
    return map;
})();

// ── flattened leaves — every addable sidebar entry as one row ───────────────
// Used by the DEV-only window.__rekenraak.leaves hook (main.tsx) so a Playwright
// harness (scripts/font-baseline.mjs) can walk the same set a teacher can reach by
// clicking, without importing this TS module into a plain Node script. Skips
// hidden domains, placeholder subdomains/types/leaves — those aren't reachable
// from the sidebar, so measuring them would test nothing a teacher can click.
export interface AppLeaf {
    id: string;
    path: string;               // "Domein › Subdomein › Type[ › Leaf]" — for reports, not lookups
    typeId: string;
    label: string;
    defaultConstraints?: Record<string, unknown>;
    instruction?: string | InstructionFn;
}

export function flattenLeaves(): AppLeaf[] {
    const out: AppLeaf[] = [];
    for (const domain of APP_STRUCTURE) {
        if (domain.hidden) continue;
        for (const sub of domain.subdomains) {
            if (sub.placeholder) continue;
            for (const type of sub.types) {
                if (type.placeholder) continue;
                if (type.typeId) {
                    out.push({
                        id: type.id,
                        path: `${domain.label} › ${sub.label} › ${type.label}`,
                        typeId: type.typeId,
                        label: type.label,
                        defaultConstraints: type.defaultConstraints,
                        instruction: type.instruction,
                    });
                } else {
                    for (const leaf of type.children ?? []) {
                        if (leaf.placeholder) continue;
                        out.push({
                            id: leaf.id,
                            path: `${domain.label} › ${sub.label} › ${type.label} › ${leaf.label}`,
                            typeId: leaf.typeId,
                            label: leaf.label,
                            defaultConstraints: leaf.defaultConstraints,
                            instruction: leaf.instruction,
                        });
                    }
                }
            }
        }
    }
    return out;
}

// leafId → its instruction (typeId + label along for the fallback). Lets a caller that
// only has a leafId (a persisted curriculum lock, a MathBlock.leafId) resolve the same
// opdracht-titel a sidebar click would have produced, without holding onto the leaf's
// own object reference (which a share link can't serialise — it may be a function).
export const LEAF_BY_ID: Record<string, { typeId: string; label: string; instruction?: string | InstructionFn }> =
    Object.fromEntries(flattenLeaves().map((l) => [l.id, { typeId: l.typeId, label: l.label, instruction: l.instruction }]));
