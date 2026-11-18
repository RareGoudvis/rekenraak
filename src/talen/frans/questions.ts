import { ENDINGS, PERSONS, VERB_BY_INF, VERBS, formOf, nlFormOf, presentForms, type Person, type Tense, type Verb } from './verbs';
import { drawOnderwerp, pronounOf, type Onderwerp } from './onderwerpen';
import type { WordDir, WordDirChoice } from './woorden';

// The question maker: "Jos (heeft)" and six choices. Pure and seeded: the kiosk's scheduler hands in its RNG.

// vervoegen = the six forms of one verb; werkwoord = six infinitives (which verb is it?); samen = forms of several
// verbs, so the right verb and the right form at once.
export type FransMode = 'vervoegen' | 'werkwoord' | 'samen';
export const FRANS_MODES: readonly FransMode[] = ['vervoegen', 'werkwoord', 'samen'];

export interface FransSettings {
    tense: Tense;
    mode: FransMode;
    // The infinitives the card asks (VERBS ids).
    verbs: readonly string[];
    // nl-fr = "wij (hebben)" → avons (absent = this); fr-nl = "nous avons" → "wij hebben"; mix = either, per question.
    dir?: WordDirChoice;
}

export interface FransExercise {
    tense: Tense;
    mode: FransMode;
    verb: string;
    person: Person;
    subject: Onderwerp;
    // The Dutch verb form in the brackets: "heeft".
    nl: string;
    // The right choice: a form ("a"), or the infinitief in werkwoord mode ("avoir").
    answer: string;
    // Six different strings, the answer among them, shuffled.
    choices: string[];
    // fr-nl: the card shows the French ("nous avons") and the choices are Dutch ("wij hebben", or in werkwoord mode
    // "drinken"); subject.nl is then a plain Dutch pronoun. Absent = nl-fr.
    dir?: WordDir;
}

export const CHOICE_COUNT = 6;

const PERSON_NAMES: Readonly<Record<Person, string>> = {
    0: '1ste persoon enkelvoud', 1: '2de persoon enkelvoud', 2: '3de persoon enkelvoud',
    3: '1ste persoon meervoud', 4: '2de persoon meervoud', 5: '3de persoon meervoud',
};
export const personName = (p: Person): string => PERSON_NAMES[p];

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export const verbOf = (inf: string): Verb => {
    const verb = VERB_BY_INF.get(inf);
    if (!verb) throw new Error(`Frans: unknown verb ${inf}`);
    return verb;
};

const formIn = (verb: Verb, tense: Tense, person: Person): string => {
    const form = formOf(verb, tense, person);
    if (form === null) throw new Error(`Frans: ${tense} is not ready yet`);
    return form;
};

// Mode vervoegen: the verb's own forms; where two persons share one (je parle, il parle) the infinitief fills
// the sixth button, the slip of writing the infinitief instead of a persoonsvorm.
function ownChoices(verb: Verb, tense: Tense): string[] {
    const forms = [...new Set(PERSONS.map(p => formIn(verb, tense, p)))];
    return forms.length >= CHOICE_COUNT ? forms.slice(0, CHOICE_COUNT) : [...forms, verb.inf];
}

// Mode werkwoord: the card's infinitives first, then verbs of the same group, then any, never the answer twice.
function verbChoices(verb: Verb, card: readonly Verb[], rng: () => number): string[] {
    const others = (list: readonly Verb[]) => shuffle(list.filter(x => x.inf !== verb.inf), rng).map(x => x.inf);
    const pool = [...others(card), ...others(VERBS.filter(x => x.group === verb.group)), ...others(VERBS)];
    return [verb.inf, ...[...new Set(pool)].slice(0, CHOICE_COUNT - 1)];
}

// Mode samen: other persons of the same verb and the same person of other verbs, in turn; then other forms of the
// card's verbs. `form` writes one choice (the French form, or the Dutch pronoun and form).
function mixedChoices(verb: Verb, person: Person, card: readonly Verb[], rng: () => number, form: (v: Verb, p: Person) => string, last: string): string[] {
    const answer = form(verb, person);
    const otherVerbs = card.filter(x => x.inf !== verb.inf);
    const samePerson = shuffle(otherVerbs.map(x => form(x, person)), rng);
    const samePlace = shuffle(PERSONS.filter(p => p !== person).map(p => form(verb, p)), rng);
    const rest = shuffle(otherVerbs.flatMap(x => PERSONS.filter(p => p !== person).map(p => form(x, p))), rng);
    // At most three of the verb's own other forms, so the other verbs always show.
    const own = samePlace.slice(0, 3);
    const turns: string[] = [];
    for (let i = 0; i < Math.max(own.length, samePerson.length); i++) {
        if (i < own.length) turns.push(own[i]);
        if (i < samePerson.length) turns.push(samePerson[i]);
    }
    const out: string[] = [answer];
    for (const c of [...turns, ...rest, ...samePlace, last]) {
        if (out.length >= CHOICE_COUNT) break;
        if (!out.includes(c)) out.push(c);
    }
    return out;
}

// The Dutch pronoun of each person for a choice that is not the answer's (the answer keeps its own: zij for elle).
const NL_PRONOUNS: Readonly<Record<Person, string>> = { 0: 'ik', 1: 'jij', 2: 'hij', 3: 'wij', 4: 'jullie', 5: 'zij' };
// The French subjects of the Frans → Nederlands questions (pronouns only: a name would make the Dutch choices odd)
// with the Dutch pronoun the answer starts with; on is men in Dutch.
const FR_NL_SUBJECTS: readonly Onderwerp[] = [
    { fr: 'je', nl: 'ik', person: 0 }, { fr: 'tu', nl: 'jij', person: 1 },
    { fr: 'il', nl: 'hij', person: 2 }, { fr: 'elle', nl: 'zij', person: 2 }, { fr: 'on', nl: 'men', person: 2 },
    { fr: 'nous', nl: 'wij', person: 3 }, { fr: 'vous', nl: 'jullie', person: 4 },
    { fr: 'ils', nl: 'zij', person: 5 }, { fr: 'elles', nl: 'zij', person: 5 },
];

const nlPhrase = (verb: Verb, tense: Tense, person: Person, pronoun = NL_PRONOUNS[person]) => `${pronoun} ${nlFormOf(verb, tense, person)}`;

// Frans → Nederlands: "nous avons" with Dutch choices: the verb's six persons, six Dutch infinitives, or both mixed.
function makeFrNl(s: FransSettings, card: readonly Verb[], rng: () => number): FransExercise {
    const verb = pick(card, rng);
    const person = pick(PERSONS, rng);
    const subject = pick(FR_NL_SUBJECTS.filter(x => x.person === person), rng);
    const nl = nlFormOf(verb, s.tense, person)!;
    const form = (v: Verb, p: Person) => nlPhrase(v, s.tense, p, p === person ? subject.nl : undefined);
    const answer = s.mode === 'werkwoord' ? verb.nl.inf : form(verb, person);
    const raw = s.mode === 'vervoegen' ? PERSONS.map(p => form(verb, p))
        : s.mode === 'werkwoord' ? verbChoices(verb, card, rng).map(inf => verbOf(inf).nl.inf)
        : mixedChoices(verb, person, card, rng, form, verb.nl.inf);
    return { tense: s.tense, mode: s.mode, verb: verb.inf, person, subject, nl, answer, choices: shuffle([...new Set(raw)], rng), dir: 'fr-nl' };
}

/** One question from the card's verbs, or null when the settings cannot make one (no known verb, a tense not ready). */
export function makeFransExercise(s: FransSettings, rng: () => number): FransExercise | null {
    const card = s.verbs.map(inf => VERB_BY_INF.get(inf)).filter((x): x is Verb => !!x);
    if (!card.length || formOf(card[0], s.tense, 0) === null) return null;
    // Only a mixed card draws the direction, so the Nederlands → Frans questions stay as they were seeded.
    const dir: WordDir = s.dir === 'mix' ? (rng() < 0.5 ? 'fr-nl' : 'nl-fr') : s.dir ?? 'nl-fr';
    if (dir === 'fr-nl') return makeFrNl(s, card, rng);
    const verb = pick(card, rng);
    const person = pick(PERSONS, rng);
    const subject = drawOnderwerp(person, rng);
    const nl = nlFormOf(verb, s.tense, person)!;
    const answer = s.mode === 'werkwoord' ? verb.inf : formIn(verb, s.tense, person);
    const raw = s.mode === 'vervoegen' ? ownChoices(verb, s.tense)
        : s.mode === 'werkwoord' ? verbChoices(verb, card, rng)
        : mixedChoices(verb, person, card, rng, (v, p) => formIn(v, s.tense, p), verb.inf);
    return { tense: s.tense, mode: s.mode, verb: verb.inf, person, subject, nl, answer, choices: shuffle(raw, rng) };
}

// je before a vowel or a silent h: j'ai, j'aime, j'habite (none of the verbs here starts with an aspirated h).
const ELIDES = /^[aeéèêiïoôuh]/i;

/** "je" + form with its elision: j'ai, je suis. Only the shown full answer elides, never a choice. */
export const withSubject = (subject: string, form: string): string => (subject === 'je' && ELIDES.test(form) ? `j'${form}` : `${subject} ${form}`);

/** The question as one line: "Jos (heeft)", or Frans → Nederlands the French: "nous avons". */
export const promptOf = (ex: FransExercise): string => (ex.dir === 'fr-nl' ? fullAnswerOf(ex) : `${ex.subject.nl} (${ex.nl})`);

/** The Dutch of the question with its pronoun: "wij hebben" (Frans → Nederlands). */
export const nlPhraseOf = (ex: FransExercise): string => `${ex.subject.nl} ${ex.nl}`;

/** The right pair after a Frans → Nederlands question: "nous avons = wij hebben". */
export const frNlPairOf = (ex: FransExercise): string => `${fullAnswerOf(ex)} = ${nlPhraseOf(ex)}`;

/** The conjugated form the question asks (in werkwoord mode the answer is the infinitief, this stays the form). */
export const formOfExercise = (ex: FransExercise): string => formIn(verbOf(ex.verb), ex.tense, ex.person);

/** The full answer: "Jos a", "j'ai", "nous regardons". */
export const fullAnswerOf = (ex: FransExercise): string => withSubject(ex.subject.fr, formOfExercise(ex));

/** The ending a regular verb's form shows, for the grammar line; null for an irregular verb. */
export function endingOf(verb: Verb, person: Person): string | null {
    if (verb.group === 'onregelmatig') return null;
    return ENDINGS[verb.group][person];
}

/** The grammar line in Op.stap's words: "avoir, 3de persoon enkelvoud", "regarder, 1ste persoon meervoud, uitgang -ons". */
export function grammarOf(ex: FransExercise): string {
    const verb = verbOf(ex.verb);
    const parts = [verb.inf, personName(ex.person)];
    const ending = endingOf(verb, ex.person);
    if (ending === '') parts.push('stam zonder uitgang');
    else if (ending !== null) {
        const form = formOfExercise(ex);
        // mangeons: the e keeps the g soft; named, since it breaks "stam + uitgang".
        const extra = form.endsWith(`${verb.inf.slice(0, -2)}${ending}`) ? '' : ` (met ${verb.inf.endsWith('ger') ? 'e' : 'ç'}: ${form})`;
        parts.push(`uitgang -${ending}${extra}`);
    }
    return parts.join(', ');
}

/** The French subject pronoun behind the question's subject (Jos → il), for the help. */
export const pronounOfExercise = (ex: FransExercise): string => pronounOf(ex.subject);

const TABLE_SUBJECTS = ['je', 'tu', 'il/elle/on', 'nous', 'vous', 'ils/elles'];
const TABLE_NL = ['ik', 'jij', 'hij/zij/men', 'wij', 'jullie', 'zij'];

/** The verb's présent table as the help shows it: "j'ai", "tu as", "il/elle/on a" … */
export function tableOf(inf: string): string[] {
    const forms = presentForms(verbOf(inf));
    return forms.map((f, i) => withSubject(TABLE_SUBJECTS[i], f));
}

/** The same table with the Dutch beside it (Frans → Nederlands): "j'ai = ik heb" … */
export function tableNlOf(inf: string): string[] {
    const verb = verbOf(inf);
    return tableOf(inf).map((f, i) => `${f} = ${TABLE_NL[i]} ${verb.nl.present[i]}`);
}

/** The longest Dutch choice a Frans → Nederlands card can show: its verbs' forms with every pronoun, or infinitives. */
export function nlChoiceChars(verbs: readonly Verb[], tense: Tense, werkwoord: boolean): number {
    if (werkwoord) return Math.max(1, ...verbs.map(v => v.nl.inf.length));
    const pronouns = [...new Set([...Object.values(NL_PRONOUNS), ...FR_NL_SUBJECTS.map(x => x.nl)])];
    return Math.max(1, ...verbs.flatMap(v => PERSONS.flatMap(p => pronouns.map(pr => `${pr} ${nlFormOf(v, tense, p)}`.length))));
}
