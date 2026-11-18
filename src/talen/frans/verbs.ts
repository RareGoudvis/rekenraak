// French verbs for the kids app (Op.stap Frans 10.2 / 10.3: persoonsvorm and uitgangen). Each verb carries its Dutch
// meaning, so a question can say "Jos (heeft)". The irregular verbs are written out; the regular ones follow the rule
// below, which frans.verbs.test.ts checks against a hand-written table.

// Step 1 plays the présent; futur proche (leerjaar 5) and passé composé (leerjaar 6) come as data in step 2.
export type Tense = 'present' | 'futurProche' | 'passeCompose';
export const TENSES_READY: readonly Tense[] = ['present'];

// 0 je · 1 tu · 2 il / elle / on · 3 nous · 4 vous · 5 ils / elles (the order the tables are written in).
export type Person = 0 | 1 | 2 | 3 | 4 | 5;
export const PERSONS: readonly Person[] = [0, 1, 2, 3, 4, 5];

export type Forms = readonly [string, string, string, string, string, string];

export type VerbGroup = 'onregelmatig' | 'er' | 'ir' | 're';

export interface Verb {
    // The infinitief, also the verb's id.
    inf: string;
    group: VerbGroup;
    // The Dutch infinitive and its présent forms (ik, jij, hij / zij, wij, jullie, zij).
    nl: { inf: string; present: Forms };
    // Hand-written présent forms; a regular verb leaves it out and follows its group's endings.
    present?: Forms;
}

const v = (inf: string, group: VerbGroup, nlInf: string, nl: Forms, present?: Forms): Verb => ({ inf, group, nl: { inf: nlInf, present: nl }, ...(present && { present }) });

export const VERBS: readonly Verb[] = [
    // Onregelmatig: written out in full.
    v('être', 'onregelmatig', 'zijn', ['ben', 'bent', 'is', 'zijn', 'zijn', 'zijn'], ['suis', 'es', 'est', 'sommes', 'êtes', 'sont']),
    v('avoir', 'onregelmatig', 'hebben', ['heb', 'hebt', 'heeft', 'hebben', 'hebben', 'hebben'], ['ai', 'as', 'a', 'avons', 'avez', 'ont']),
    v('aller', 'onregelmatig', 'gaan', ['ga', 'gaat', 'gaat', 'gaan', 'gaan', 'gaan'], ['vais', 'vas', 'va', 'allons', 'allez', 'vont']),
    v('faire', 'onregelmatig', 'doen', ['doe', 'doet', 'doet', 'doen', 'doen', 'doen'], ['fais', 'fais', 'fait', 'faisons', 'faites', 'font']),
    v('boire', 'onregelmatig', 'drinken', ['drink', 'drinkt', 'drinkt', 'drinken', 'drinken', 'drinken'], ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent']),
    v('venir', 'onregelmatig', 'komen', ['kom', 'komt', 'komt', 'komen', 'komen', 'komen'], ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent']),
    v('prendre', 'onregelmatig', 'nemen', ['neem', 'neemt', 'neemt', 'nemen', 'nemen', 'nemen'], ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent']),
    v('pouvoir', 'onregelmatig', 'kunnen', ['kan', 'kunt', 'kan', 'kunnen', 'kunnen', 'kunnen'], ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent']),
    v('vouloir', 'onregelmatig', 'willen', ['wil', 'wilt', 'wil', 'willen', 'willen', 'willen'], ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent']),
    v('voir', 'onregelmatig', 'zien', ['zie', 'ziet', 'ziet', 'zien', 'zien', 'zien'], ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient']),
    v('dire', 'onregelmatig', 'zeggen', ['zeg', 'zegt', 'zegt', 'zeggen', 'zeggen', 'zeggen'], ['dis', 'dis', 'dit', 'disons', 'dites', 'disent']),
    v('mettre', 'onregelmatig', 'zetten', ['zet', 'zet', 'zet', 'zetten', 'zetten', 'zetten'], ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent']),
    v('savoir', 'onregelmatig', 'weten', ['weet', 'weet', 'weet', 'weten', 'weten', 'weten'], ['sais', 'sais', 'sait', 'savons', 'savez', 'savent']),
    // -er (1ste groep): stam + e, es, e, ons, ez, ent.
    v('parler', 'er', 'spreken', ['spreek', 'spreekt', 'spreekt', 'spreken', 'spreken', 'spreken']),
    v('aimer', 'er', 'houden van', ['hou van', 'houdt van', 'houdt van', 'houden van', 'houden van', 'houden van']),
    v('jouer', 'er', 'spelen', ['speel', 'speelt', 'speelt', 'spelen', 'spelen', 'spelen']),
    v('regarder', 'er', 'kijken', ['kijk', 'kijkt', 'kijkt', 'kijken', 'kijken', 'kijken']),
    v('écouter', 'er', 'luisteren', ['luister', 'luistert', 'luistert', 'luisteren', 'luisteren', 'luisteren']),
    v('chanter', 'er', 'zingen', ['zing', 'zingt', 'zingt', 'zingen', 'zingen', 'zingen']),
    v('danser', 'er', 'dansen', ['dans', 'danst', 'danst', 'dansen', 'dansen', 'dansen']),
    v('manger', 'er', 'eten', ['eet', 'eet', 'eet', 'eten', 'eten', 'eten']),
    v('habiter', 'er', 'wonen', ['woon', 'woont', 'woont', 'wonen', 'wonen', 'wonen']),
    v('travailler', 'er', 'werken', ['werk', 'werkt', 'werkt', 'werken', 'werken', 'werken']),
    v('chercher', 'er', 'zoeken', ['zoek', 'zoekt', 'zoekt', 'zoeken', 'zoeken', 'zoeken']),
    v('donner', 'er', 'geven', ['geef', 'geeft', 'geeft', 'geven', 'geven', 'geven']),
    // -ir (2de groep, finir): stam + is, is, it, issons, issez, issent.
    v('finir', 'ir', 'eindigen', ['eindig', 'eindigt', 'eindigt', 'eindigen', 'eindigen', 'eindigen']),
    v('choisir', 'ir', 'kiezen', ['kies', 'kiest', 'kiest', 'kiezen', 'kiezen', 'kiezen']),
    v('réussir', 'ir', 'slagen', ['slaag', 'slaagt', 'slaagt', 'slagen', 'slagen', 'slagen']),
    // -re (vendre): stam + s, s, (niets), ons, ez, ent.
    v('vendre', 're', 'verkopen', ['verkoop', 'verkoopt', 'verkoopt', 'verkopen', 'verkopen', 'verkopen']),
    v('attendre', 're', 'wachten', ['wacht', 'wacht', 'wacht', 'wachten', 'wachten', 'wachten']),
    v('répondre', 're', 'antwoorden', ['antwoord', 'antwoordt', 'antwoordt', 'antwoorden', 'antwoorden', 'antwoorden']),
];

export const VERB_BY_INF: ReadonlyMap<string, Verb> = new Map(VERBS.map(x => [x.inf, x]));

/** The présent uitgangen of a regular group, je … ils. */
export const ENDINGS: Readonly<Record<Exclude<VerbGroup, 'onregelmatig'>, Forms>> = {
    er: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
    ir: ['is', 'is', 'it', 'issons', 'issez', 'issent'],
    re: ['s', 's', '', 'ons', 'ez', 'ent'],
};

/** The stam: the infinitief without -er / -ir / -re. */
export const stemOf = (verb: Verb): string => verb.inf.slice(0, -2);

// -ger and -cer keep their soft sound before -ons: mangeons, commençons.
function softStem(stem: string, ending: string): string {
    if (!ending.startsWith('o')) return stem;
    if (stem.endsWith('g')) return `${stem}e`;
    if (stem.endsWith('c')) return `${stem.slice(0, -1)}ç`;
    return stem;
}

/** The six présent forms of a verb: its own table, or the stam plus its group's endings. */
export function presentForms(verb: Verb): Forms {
    if (verb.present) return verb.present;
    if (verb.group === 'onregelmatig') throw new Error(`${verb.inf}: an irregular verb needs its table`);
    const stem = stemOf(verb);
    return ENDINGS[verb.group].map(e => `${softStem(stem, e)}${e}`) as unknown as Forms;
}

/** One form in a tense, or null for a tense that is not ready yet (step 2). */
export function formOf(verb: Verb, tense: Tense, person: Person): string | null {
    if (tense !== 'present') return null;
    return presentForms(verb)[person];
}

/** The Dutch form for that person in a tense (the bracket in "Jos (heeft)"); null when the tense is not ready. */
export function nlFormOf(verb: Verb, tense: Tense, person: Person): string | null {
    if (tense !== 'present') return null;
    return verb.nl.present[person];
}
