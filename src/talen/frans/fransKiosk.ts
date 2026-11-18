import type { KioskDescriptor, OefenType } from '../../services/oefenen/types';
import type { KioskSubject } from '../../services/oefenen/subjects';
import type { StepLine } from '../../services/math/workedSteps';
import { FRANS_MODE_LABELS, FRANS_TYPE_ID, fransCardOfLeaf } from './fransCards';
import { FRANS_MODES, fullAnswerOf, grammarOf, makeFransExercise, promptOf, pronounOfExercise, tableOf, type FransExercise, type FransMode, type FransSettings } from './questions';
import { TENSES_READY, VERB_BY_INF, type Tense } from './verbs';

// Frans as a kiosk subject: the six choices on the kiosk's buttons, the explanation as its steps.

const asEx = (ex: unknown) => ex as FransExercise;

function settingsOf(c: Record<string, unknown>): FransSettings | null {
    const mode = c.mode as FransMode;
    const tense = c.tense as Tense;
    const verbs = c.verbs;
    if (!FRANS_MODES.includes(mode) || !TENSES_READY.includes(tense) || !Array.isArray(verbs)) return null;
    return { mode, tense, verbs: verbs.filter((x): x is string => typeof x === 'string') };
}

const INSTRUCTION: Readonly<Record<FransMode, (ex: FransExercise) => string>> = {
    vervoegen: ex => `Vervoeg ${ex.verb}. Kies de juiste vorm.`,
    werkwoord: () => 'Welk werkwoord is het? Kies de infinitief.',
    samen: () => 'Kies het juiste werkwoord in de juiste vorm.',
};

const word = (w: string, kind: string): StepLine => ({ kind: `frans.${kind}`, basis: true, aside: true, tokens: [{ t: 'word', w }] });

// The Dutch infinitive of the exercise's verb (the help line in werkwoord mode).
const verbNl = (e: FransExercise) => VERB_BY_INF.get(e.verb)?.nl.inf ?? '';

const FRANS_KIOSK: KioskDescriptor = {
    input: 'choice',
    choicesOf: ex => asEx(ex).choices,
    wordGrid: true,
    answerOf: ex => [asEx(ex).answer],
    display: ex => promptOf(asEx(ex)),
    kioskInstruction: ex => INSTRUCTION[asEx(ex).mode](asEx(ex)),
    supported: c => settingsOf(c) !== null,
};

export const FRANS_SUBJECT: KioskSubject = {
    typeId: FRANS_TYPE_ID,
    kiosk: FRANS_KIOSK,
    generate: (c, rng) => {
        const s = settingsOf(c);
        return s ? makeFransExercise(s, rng) : null;
    },
    // The same verb, person and oefening is the same question, whoever the subject is.
    keyOf: ex => { const e = asEx(ex); return `frans|${e.tense}|${e.mode}|${e.verb}|${e.person}`; },
    prompt: ex => {
        const e = asEx(ex);
        return e.mode === 'werkwoord' ? { lead: e.subject.nl, hint: `(${e.nl})`, ask: 'Infinitief:' } : { lead: e.subject.nl, hint: `(${e.nl})` };
    },
    steps: ex => [word(fullAnswerOf(asEx(ex)), 'antwoord'), word(grammarOf(asEx(ex)), 'uitleg')],
    // Hoe los ik dit op? in a game: which French pronoun, and the verb's table to look the form up in; "welk werkwoord"
    // asks the verb itself, so there the Dutch infinitive is the clue.
    help: ex => {
        const e = asEx(ex);
        if (e.mode === 'werkwoord') return [word(`${e.nl} komt van het werkwoord ${verbNl(e)}.`, 'tip')];
        return [word(`${e.subject.nl} = ${pronounOfExercise(e)}`, 'tip'), ...tableOf(e.verb).map(l => word(l, 'tabel'))];
    },
    afterLine: (ex, _c, correct) => (asEx(ex).mode === 'werkwoord' || !correct ? fullAnswerOf(asEx(ex)) : null),
    typeOf: (v): OefenType | null => {
        const card = fransCardOfLeaf(v.leafId);
        if (!card) return null;
        const mode = v.ov.mode as FransMode;
        return { typeId: FRANS_TYPE_ID, leafId: v.leafId, label: `${card.label} · ${FRANS_MODE_LABELS[mode] ?? ''}`, constraints: { ...v.ov }, weight: 100 };
    },
};

