import type { KioskDescriptor, OefenType } from '../../services/oefenen/types';
import type { KioskSubject } from '../../services/oefenen/subjects';
import type { StepLine } from '../../services/math/workedSteps';
import { FRANS_TYPE_ID, fransCardOfLeaf, fransLabelOf } from './fransCards';
import {
    FRANS_MODES, formOfExercise, frNlPairOf, fullAnswerOf, grammarOf, makeFransExercise, promptOf, pronounOfExercise, tableNlOf, tableOf,
    type FransExercise, type FransMode, type FransSettings,
} from './questions';
import { TENSES_READY, VERB_BY_INF, type Tense } from './verbs';
import { WORD_DIRS, type WordDirChoice } from './woorden';

// Frans as a kiosk subject: the six choices on the kiosk's buttons, the explanation as its steps.

const asEx = (ex: unknown) => ex as FransExercise;
const frNl = (e: FransExercise) => e.dir === 'fr-nl';

function settingsOf(c: Record<string, unknown>): FransSettings | null {
    const mode = c.mode as FransMode;
    const tense = c.tense as Tense;
    const verbs = c.verbs;
    // Settings from before the Richting row have no dir: Nederlands → Frans.
    const dir = (c.dir ?? 'nl-fr') as WordDirChoice;
    if (!FRANS_MODES.includes(mode) || !TENSES_READY.includes(tense) || !Array.isArray(verbs) || !WORD_DIRS.includes(dir)) return null;
    return { mode, tense, verbs: verbs.filter((x): x is string => typeof x === 'string'), dir };
}

const INSTRUCTION: Readonly<Record<FransMode, (ex: FransExercise) => string>> = {
    vervoegen: ex => `Vervoeg ${ex.verb}. Kies de juiste vorm.`,
    werkwoord: () => 'Welk werkwoord is het? Kies de infinitief.',
    samen: () => 'Kies het juiste werkwoord in de juiste vorm.',
};
const INSTRUCTION_FR_NL: Readonly<Record<FransMode, string>> = {
    vervoegen: 'Wat betekent het? Kies de juiste Nederlandse vorm.',
    werkwoord: 'Welk werkwoord is het? Kies het Nederlandse werkwoord.',
    samen: 'Wat betekent het? Kies het juiste werkwoord in de juiste vorm.',
};

const word = (w: string, kind: string): StepLine => ({ kind: `frans.${kind}`, basis: true, aside: true, tokens: [{ t: 'word', w }] });

// The Dutch infinitive of the exercise's verb (the help line in werkwoord mode).
const verbNl = (e: FransExercise) => VERB_BY_INF.get(e.verb)?.nl.inf ?? '';

// The answer line after the question: "Jos a", or Frans → Nederlands the pair "nous avons = wij hebben".
const answerLine = (e: FransExercise) => (frNl(e) ? frNlPairOf(e) : fullAnswerOf(e));

const FRANS_KIOSK: KioskDescriptor = {
    input: 'choice',
    choicesOf: ex => asEx(ex).choices,
    wordGrid: true,
    answerOf: ex => [asEx(ex).answer],
    display: ex => promptOf(asEx(ex)),
    kioskInstruction: ex => (frNl(asEx(ex)) ? INSTRUCTION_FR_NL[asEx(ex).mode] : INSTRUCTION[asEx(ex).mode](asEx(ex))),
    supported: c => settingsOf(c) !== null,
};

export const FRANS_SUBJECT: KioskSubject = {
    typeId: FRANS_TYPE_ID,
    kiosk: FRANS_KIOSK,
    generate: (c, rng) => {
        const s = settingsOf(c);
        return s ? makeFransExercise(s, rng) : null;
    },
    // The same verb, person and oefening is the same question, whoever the subject is (and per direction).
    keyOf: ex => { const e = asEx(ex); return `frans|${e.tense}|${e.mode}|${e.verb}|${e.person}${frNl(e) ? '|fr-nl' : ''}`; },
    prompt: ex => {
        const e = asEx(ex);
        if (frNl(e)) return { lead: promptOf(e), ask: 'Nederlands:' };
        return e.mode === 'werkwoord' ? { lead: e.subject.nl, hint: `(${e.nl})`, ask: 'Infinitief:' } : { lead: e.subject.nl, hint: `(${e.nl})` };
    },
    steps: ex => [word(answerLine(asEx(ex)), 'antwoord'), word(grammarOf(asEx(ex)), 'uitleg')],
    // Hoe los ik dit op? in a game: which French pronoun, and the verb's table to look the form up in; "welk werkwoord"
    // asks the verb itself, so there the infinitive is the clue (the French one when the Dutch is asked).
    help: ex => {
        const e = asEx(ex);
        if (frNl(e)) {
            if (e.mode === 'werkwoord') return [word(`${formOfExercise(e)} komt van ${e.verb}.`, 'tip'), word(`${e.verb} = ${verbNl(e)}`, 'tabel')];
            return [word(`${e.subject.fr} = ${e.subject.nl}`, 'tip'), ...tableNlOf(e.verb).map(l => word(l, 'tabel'))];
        }
        if (e.mode === 'werkwoord') return [word(`${e.nl} komt van het werkwoord ${verbNl(e)}.`, 'tip')];
        return [word(`${e.subject.nl} = ${pronounOfExercise(e)}`, 'tip'), ...tableOf(e.verb).map(l => word(l, 'tabel'))];
    },
    afterLine: (ex, _c, correct) => (asEx(ex).mode === 'werkwoord' || !correct ? answerLine(asEx(ex)) : null),
    typeOf: (v): OefenType | null => {
        const card = fransCardOfLeaf(v.leafId);
        if (!card) return null;
        const mode = v.ov.mode as FransMode;
        const dir = (v.ov.dir ?? 'nl-fr') as WordDirChoice;
        return { typeId: FRANS_TYPE_ID, leafId: v.leafId, label: fransLabelOf(card, mode, dir), constraints: { ...v.ov }, weight: 100 };
    },
};
