import type { CardVariant } from '../../config/eenvoudig/cards';
import type { SpelPack } from '../../oefenen/spelen/content/pack';
import { mulberry32, seedOf } from '../../oefenen/spelen/distractors';
import { fransLeaves } from './fransCards';
import { CHOICE_COUNT, formOfExercise, nlChoiceChars, promptOf, type FransExercise } from './questions';
import { VERBS, VERB_BY_INF, presentForms, type Tense, type Verb } from './verbs';

// Frans in the games (a content pack): the question on the sign with the answer's place marked, the exercise's own
// choices on the targets (as many as the game shows), and a memory pair "wij (hebben)" with "avons". Words only, so
// only the tap and board games take it; the session still checks with the kiosk descriptor.

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** The longest word a variant can put on a target (the skins' maxWordChars): its verbs' forms and infinitives, or in
 * werkwoord mode every infinitive the choices may borrow (the card's, else its verbs' groups too); Frans → Nederlands
 * the Dutch of the same, with its pronoun. */
export function fransWordChars(v: CardVariant): number {
    const card = ((v.ov.verbs as string[] | undefined) ?? []).map(inf => VERB_BY_INF.get(inf)).filter((x): x is Verb => !!x);
    const longest = (words: string[]) => Math.max(1, ...words.map(w => w.length));
    const werkwoord = v.ov.mode === 'werkwoord';
    // Welk werkwoord? with fewer than six verbs borrows their groups' infinitives, and every verb when that is still too few.
    const grouped = VERBS.filter(x => card.includes(x) || card.some(c => c.group === x.group));
    const pool = !werkwoord || card.length >= CHOICE_COUNT ? card : grouped.length >= CHOICE_COUNT ? grouped : VERBS;
    const fr = werkwoord ? longest(pool.map(x => x.inf)) : longest(card.flatMap(x => [...presentForms(x), x.inf]));
    const dir = v.ov.dir ?? 'nl-fr';
    const nl = nlChoiceChars(pool, (v.ov.tense as Tense | undefined) ?? 'present', werkwoord);
    return dir === 'nl-fr' ? fr : dir === 'fr-nl' ? nl : Math.max(fr, nl);
}

// "Jos ? (heeft)": the sign puts the answer where the ? is; "welk werkwoord" asks after the sentence; Frans →
// Nederlands "nous avons = ?".
const signOf = (ex: FransExercise) => (ex.dir === 'fr-nl' ? `${promptOf(ex)} = ?` : ex.mode === 'werkwoord' ? `${promptOf(ex)}: ?` : `${ex.subject.fr} ? (${ex.nl})`);

// One verb in one person never shows twice on a memory board, whichever way it is asked ("wij (hebben)" and "nous
// avons"); in werkwoord mode one verb once; two persons with the same form (je parle, il parle) once.
const sameOf = (ex: FransExercise) => (ex.mode === 'werkwoord' ? ex.verb : ex.dir === 'fr-nl' ? formOfExercise(ex) : ex.answer);

export const FRANS_PACK: SpelPack = {
    leaves: fransLeaves,
    // Frans is leerjaar 5 and 6 only; the cards decide that, the pack plays wherever they show.
    maxGrade: 6,
    contentOf: v => ({ kind: 'choice', boards: ['pairs'], wordChars: fransWordChars(v) }),
    boardsOf: () => ['pairs'],
    question: (_type, made, choiceCount) => {
        const ex = made.exercise as FransExercise;
        if (!ex?.choices?.includes(ex.answer)) return null;
        const rng = mulberry32(seedOf(made.key));
        const others = shuffle(ex.choices.filter(c => c !== ex.answer), rng).slice(0, Math.max(1, choiceCount - 1));
        const choices = shuffle([ex.answer, ...others], rng);
        return {
            text: signOf(ex),
            answer: ex.answer,
            choices,
            views: choices.map(c => ({ text: c, label: c })),
            kioskAnswers: choices,
            pair: { sum: { text: promptOf(ex), label: promptOf(ex) }, answer: { text: ex.answer, label: ex.answer } },
            same: sameOf(ex),
        };
    },
};
