import { describe, expect, test } from 'vitest';
import { VERB_SETS } from './helpers/fransChoices';
import { FRANS_MODES, fullAnswerOf, grammarOf, makeFransExercise, promptOf, withSubject, type FransExercise } from '../talen/frans/questions';
import { PERSONS, VERB_BY_INF, presentForms } from '../talen/frans/verbs';
import { drawOnderwerp, pronounOf } from '../talen/frans/onderwerpen';

function rngOf(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

// Every verb selection the options screen can make that is worth a look, from one verb to all of them.
const CARDS = Object.entries(VERB_SETS).map(([id, verbs]) => ({ id, verbs }));

function every(fn: (ex: FransExercise, card: (typeof CARDS)[number]) => void) {
    for (const card of CARDS) for (const mode of FRANS_MODES) for (const seed of SEEDS) {
        const ex = makeFransExercise({ tense: 'present', mode, verbs: card.verbs }, rngOf(seed * 31 + mode.length));
        expect(ex).not.toBeNull();
        fn(ex!, card);
    }
}

describe('Frans questions', () => {
    test('every selection × mode, one verb too: six different choices, the answer among them once', () => {
        every(ex => {
            expect(ex.choices).toHaveLength(6);
            expect(new Set(ex.choices).size).toBe(6);
            expect(ex.choices.filter(c => c === ex.answer)).toHaveLength(1);
        });
    });

    test('the answer is the real form (or the infinitief in werkwoord mode) and the Dutch bracket fits the person', () => {
        every(ex => {
            const verb = VERB_BY_INF.get(ex.verb)!;
            expect(ex.answer).toBe(ex.mode === 'werkwoord' ? verb.inf : presentForms(verb)[ex.person]);
            expect(ex.nl).toBe(verb.nl.present[ex.person]);
            expect(ex.subject.person).toBe(ex.person);
        });
    });

    test('vervoegen: only forms of that one verb (and its infinitief where two persons share a form)', () => {
        every(ex => {
            if (ex.mode !== 'vervoegen') return;
            const verb = VERB_BY_INF.get(ex.verb)!;
            const own = new Set([...presentForms(verb), verb.inf]);
            for (const c of ex.choices) expect(own.has(c), `${c} is not a form of ${verb.inf}`).toBe(true);
            // être, avoir, aller have six different forms: no infinitief needed.
            if (new Set(presentForms(verb)).size === 6) expect(ex.choices).not.toContain(verb.inf);
        });
    });

    test('werkwoord: six infinitives, the chosen verbs first, others borrowed when fewer than six are on', () => {
        every((ex, card) => {
            if (ex.mode !== 'werkwoord') return;
            for (const c of ex.choices) expect(VERB_BY_INF.has(c)).toBe(true);
            const fromCard = ex.choices.filter(c => card.verbs.includes(c)).length;
            expect(fromCard).toBe(Math.min(6, card.verbs.length));
        });
    });

    test('samen: forms of several verbs, the same person of other verbs among them (one verb: its own forms)', () => {
        every((ex, card) => {
            if (ex.mode !== 'samen') return;
            if (card.verbs.length === 1) {
                const verb = VERB_BY_INF.get(card.verbs[0])!;
                for (const c of ex.choices) expect([...presentForms(verb), verb.inf]).toContain(c);
                return;
            }
            const verbsShown = new Set(ex.choices.map(c => card.verbs.find(inf => presentForms(VERB_BY_INF.get(inf)!).includes(c))));
            expect(verbsShown.size).toBeGreaterThan(1);
            const samePerson = card.verbs.filter(inf => inf !== ex.verb).map(inf => presentForms(VERB_BY_INF.get(inf)!)[ex.person]);
            expect(ex.choices.some(c => c !== ex.answer && samePerson.includes(c))).toBe(true);
        });
    });

    test('elision only in the full answer, never on a button', () => {
        expect(withSubject('je', 'ai')).toBe("j'ai");
        expect(withSubject('je', 'aime')).toBe("j'aime");
        expect(withSubject('je', 'habite')).toBe("j'habite");
        expect(withSubject('je', 'écoute')).toBe("j'écoute");
        expect(withSubject('je', 'attends')).toBe("j'attends");
        expect(withSubject('je', 'suis')).toBe('je suis');
        expect(withSubject('tu', 'as')).toBe('tu as');
        every(ex => { for (const c of ex.choices) expect(c).not.toMatch(/'/); });
    });

    test('names: one boy il, one girl elle, two names ils (elles for two girls); pronouns in French', () => {
        const seen = new Set<string>();
        for (let seed = 1; seed < 400; seed++) {
            for (const p of PERSONS) {
                const o = drawOnderwerp(p, rngOf(seed));
                seen.add(o.fr);
                const pron = pronounOf(o);
                if (p === 2) expect(['il', 'elle', 'on']).toContain(pron);
                if (p === 5) expect(['ils', 'elles', 'ils/elles']).toContain(pron);
                if (/ en /.test(o.nl)) expect(o.fr).toMatch(/ et /);
            }
        }
        for (const fr of ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']) expect(seen.has(fr), fr).toBe(true);
        expect(seen.has('men (on)')).toBe(false);
        expect(pronounOf({ nl: 'Jos', fr: 'Jos', person: 2 })).toBe('il');
        expect(pronounOf({ nl: 'Lien', fr: 'Lien', person: 2 })).toBe('elle');
        expect(pronounOf({ nl: 'Lien en Fien', fr: 'Lien et Fien', person: 5 })).toBe('elles');
        expect(pronounOf({ nl: 'Jos en Lien', fr: 'Jos et Lien', person: 5 })).toBe('ils');
    });

    test('the prompt, the full answer and the grammar line in Op.stap terms', () => {
        const ex = (verb: string, person: 0 | 1 | 2 | 3 | 4 | 5, nl: string, fr: string): FransExercise => ({
            tense: 'present', mode: 'vervoegen', verb, person, subject: { nl, fr, person }, nl: VERB_BY_INF.get(verb)!.nl.present[person], answer: presentForms(VERB_BY_INF.get(verb)!)[person], choices: [],
        });
        const jos = ex('avoir', 2, 'Jos', 'Jos');
        expect(promptOf(jos)).toBe('Jos (heeft)');
        expect(fullAnswerOf(jos)).toBe('Jos a');
        expect(grammarOf(jos)).toBe('avoir, 3de persoon enkelvoud');
        const nous = ex('regarder', 3, 'wij', 'nous');
        expect(promptOf(nous)).toBe('nous (kijken)');
        expect(fullAnswerOf(nous)).toBe('nous regardons');
        expect(grammarOf(nous)).toBe('regarder, 1ste persoon meervoud, uitgang -ons');
        expect(grammarOf(ex('manger', 3, 'wij', 'nous'))).toBe('manger, 1ste persoon meervoud, uitgang -ons (met e: mangeons)');
        expect(grammarOf(ex('vendre', 2, 'hij', 'il'))).toBe('vendre, 3de persoon enkelvoud, stam zonder uitgang');
        expect(grammarOf(ex('finir', 4, 'jullie', 'vous'))).toBe('finir, 2de persoon meervoud, uitgang -issez');
        expect(fullAnswerOf(ex('avoir', 0, 'ik', 'je'))).toBe("j'ai");
        expect(fullAnswerOf(ex('être', 5, 'zij', 'elles'))).toBe('elles sont');
        expect(promptOf(ex('parler', 2, 'men', 'on'))).toBe('on (spreekt)');
        expect(promptOf(ex('avoir', 1, 'jij', 'tu'))).toBe('tu (hebt)');
        expect(promptOf(ex('avoir', 5, 'Jos en Lien', 'Jos et Lien'))).toBe('Jos et Lien (hebben)');
    });

    test('seeded: the same RNG makes the same question', () => {
        const s = { tense: 'present' as const, mode: 'samen' as const, verbs: VERB_SETS.alles };
        expect(makeFransExercise(s, rngOf(7))).toEqual(makeFransExercise(s, rngOf(7)));
    });

    test('no verb or no tense makes no question', () => {
        expect(makeFransExercise({ tense: 'present', mode: 'vervoegen', verbs: ['nager'] }, rngOf(1))).toBeNull();
        expect(makeFransExercise({ tense: 'mix', tenses: [], mode: 'vervoegen', verbs: ['avoir'] }, rngOf(1))).toBeNull();
    });
});
