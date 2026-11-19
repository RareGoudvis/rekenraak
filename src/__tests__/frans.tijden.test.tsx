// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { PERSONS, VERBS, VERB_BY_INF, formOf, nlFormOf, type Person, type Tense } from '../talen/frans/verbs';
import { FRANS_MODES, fullAnswerOf, grammarOf, isFeminine, makeFransExercise, tableOf, tableNlOf, type FransExercise } from '../talen/frans/questions';
import { fransVariant, tensesForGrade } from '../talen/frans/fransCards';
import { fransWordChars } from '../talen/frans/fransPack';
import { readPicks } from '../talen/frans/fransPicks';
import { buildZelfSessie } from '../oefenen/zelf/zelfSessie';
import { useOefenStore, currentInput } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { skinById } from '../oefenen/spelen/skins/registry';
import { padRoundOf } from '../oefenen/spelen/spelQuestion';
import { PAD_MAX_WORD_CHARS } from '../oefenen/spelen/accepts';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { resetKiosk } from './helpers/oefenKiosk';
import { VERB_SETS, verbsOf } from './helpers/fransChoices';

// Step 2: the futur proche and the passé composé, hand-checked tables, agreement with être, the Tijd row, the games.

// il / elle / on and hij: the passé composé of all 31 verbs, French and Dutch, written out by hand (owner list
// 2026-11-19: only aller and venir take être; eindigen, slagen, gaan, komen and zijn take zijn in Dutch).
const PC_3RD: readonly (readonly [string, string, string])[] = [
    ['être', 'a été', 'is geweest'], ['avoir', 'a eu', 'heeft gehad'], ['aller', 'est allé', 'is gegaan'],
    ['faire', 'a fait', 'heeft gedaan'], ['boire', 'a bu', 'heeft gedronken'], ['venir', 'est venu', 'is gekomen'],
    ['prendre', 'a pris', 'heeft genomen'], ['pouvoir', 'a pu', 'heeft gekund'], ['vouloir', 'a voulu', 'heeft gewild'],
    ['voir', 'a vu', 'heeft gezien'], ['dire', 'a dit', 'heeft gezegd'], ['mettre', 'a mis', 'heeft gezet'],
    ['savoir', 'a su', 'heeft geweten'],
    ['parler', 'a parlé', 'heeft gesproken'], ['aimer', 'a aimé', 'heeft gehouden van'], ['jouer', 'a joué', 'heeft gespeeld'],
    ['regarder', 'a regardé', 'heeft gekeken'], ['écouter', 'a écouté', 'heeft geluisterd'], ['chanter', 'a chanté', 'heeft gezongen'],
    ['danser', 'a dansé', 'heeft gedanst'], ['manger', 'a mangé', 'heeft gegeten'], ['habiter', 'a habité', 'heeft gewoond'],
    ['travailler', 'a travaillé', 'heeft gewerkt'], ['chercher', 'a cherché', 'heeft gezocht'], ['donner', 'a donné', 'heeft gegeven'],
    ['finir', 'a fini', 'is geëindigd'], ['choisir', 'a choisi', 'heeft gekozen'], ['réussir', 'a réussi', 'is geslaagd'],
    ['vendre', 'a vendu', 'heeft verkocht'], ['attendre', 'a attendu', 'heeft gewacht'], ['répondre', 'a répondu', 'heeft geantwoord'],
];

const seeded = (seed: number) => mulberry32(seed * 7919 + 13);
const verb = (inf: string) => VERB_BY_INF.get(inf)!;
const ALL = (inf: string, tense: Tense, fem = false) => PERSONS.map(p => formOf(verb(inf), tense, p, fem));

describe('the tables', () => {
    test('passé composé, all 31 verbs, French and Dutch', () => {
        expect(PC_3RD.map(r => r[0]).sort()).toEqual(VERBS.map(v => v.inf).sort());
        for (const [inf, fr, nl] of PC_3RD) {
            expect(formOf(verb(inf), 'passeCompose', 2)).toBe(fr);
            expect(nlFormOf(verb(inf), 'passeCompose', 2)).toBe(nl);
        }
    });

    test('the persons: avoir + participle, être + agreeing participle, Dutch hebben / zijn', () => {
        expect(ALL('manger', 'passeCompose')).toEqual(['ai mangé', 'as mangé', 'a mangé', 'avons mangé', 'avez mangé', 'ont mangé']);
        expect(ALL('aller', 'passeCompose')).toEqual(['suis allé', 'es allé', 'est allé', 'sommes allés', 'êtes allés', 'sont allés']);
        expect(ALL('aller', 'passeCompose', true)).toEqual(['suis allée', 'es allée', 'est allée', 'sommes allées', 'êtes allées', 'sont allées']);
        expect(ALL('venir', 'passeCompose', true)[5]).toBe('sont venues');
        expect(PERSONS.map(p => nlFormOf(verb('manger'), 'passeCompose', p))).toEqual(['heb gegeten', 'hebt gegeten', 'heeft gegeten', 'hebben gegeten', 'hebben gegeten', 'hebben gegeten']);
        expect(PERSONS.map(p => nlFormOf(verb('venir'), 'passeCompose', p))).toEqual(['ben gekomen', 'bent gekomen', 'is gekomen', 'zijn gekomen', 'zijn gekomen', 'zijn gekomen']);
    });

    test('futur proche: aller (présent) + infinitief, Dutch gaan + infinitief', () => {
        expect(ALL('manger', 'futurProche')).toEqual(['vais manger', 'vas manger', 'va manger', 'allons manger', 'allez manger', 'vont manger']);
        expect(PERSONS.map(p => nlFormOf(verb('manger'), 'futurProche', p))).toEqual(['ga eten', 'gaat eten', 'gaat eten', 'gaan eten', 'gaan eten', 'gaan eten']);
        expect(formOf(verb('aimer'), 'futurProche', 3)).toBe('allons aimer');
        expect(nlFormOf(verb('aimer'), 'futurProche', 3)).toBe('gaan houden van');
    });

    test('the help tables: elision, and the agreement of être shown as (e)', () => {
        expect(tableOf('avoir', 'passeCompose')[0]).toBe("j'ai eu");
        expect(tableOf('aller', 'passeCompose')).toEqual(['je suis allé(e)', 'tu es allé(e)', 'il/elle/on est allé(e)', 'nous sommes allé(e)s', 'vous êtes allé(e)s', 'ils/elles sont allé(e)s']);
        expect(tableOf('manger', 'futurProche')[0]).toBe('je vais manger');
        expect(tableNlOf('manger', 'passeCompose')[2]).toBe('il/elle/on a mangé = hij/zij/men heeft gegeten');
    });
});

const ex = (inf: string, person: Person, fr: string, nl: string, tense: Tense): FransExercise =>
    ({ tense, mode: 'vervoegen', verb: inf, person, subject: { fr, nl, person }, nl: nlFormOf(verb(inf), tense, person)!, answer: '', choices: [] });

describe('the questions in the two tenses', () => {
    test('every selection, mode, direction and tense: six distinct choices, the answer once', () => {
        for (const verbs of Object.values(VERB_SETS)) for (const mode of FRANS_MODES) for (const tense of ['futurProche', 'passeCompose'] as const)
            for (const dir of ['nl-fr', 'fr-nl'] as const) for (let seed = 1; seed < 60; seed++) {
                const e = makeFransExercise({ tense, mode, verbs, dir }, seeded(seed))!;
                expect(e.tense).toBe(tense);
                expect(e.choices, `${verbs} ${mode} ${tense} ${dir}`).toHaveLength(6);
                expect(new Set(e.choices).size).toBe(6);
                expect(e.choices.filter(c => c === e.answer)).toHaveLength(1);
            }
    });

    test('être agreement: the subject decides; never a second right form among the choices', () => {
        let seen = 0;
        for (const mode of ['vervoegen', 'samen'] as const) for (let seed = 1; seed < 400; seed++) {
            const e = makeFransExercise({ tense: 'passeCompose', mode, verbs: ['aller', 'venir'] }, seeded(seed))!;
            const fem = isFeminine(e.subject);
            expect(e.answer).toBe(formOf(verb(e.verb), 'passeCompose', e.person, fem));
            // The other agreement of the same verb and person is never on a button.
            expect(e.choices).not.toContain(formOf(verb(e.verb), 'passeCompose', e.person, !fem));
            if (['je', 'tu', 'nous', 'vous', 'on', 'il', 'ils'].includes(e.subject.fr)) expect(fem).toBe(false);
            if (e.subject.fr === 'Lien') { expect(e.answer).toMatch(/(allée|venue)$/); seen++; }
        }
        const names = (fr: string, person: Person) => formOf(verb('aller'), 'passeCompose', person, isFeminine({ fr, nl: fr, person }));
        expect(names('Jos', 2)).toBe('est allé');
        expect(names('Lien', 2)).toBe('est allée');
        expect(names('Jos et Lien', 5)).toBe('sont allés');
        expect(names('Lien et Fien', 5)).toBe('sont allées');
        expect(names('elles', 5)).toBe('sont allées');
        expect(seen).toBeGreaterThan(0);
    });

    test('the full answer and the grammar line name tense, auxiliary and person', () => {
        const jos = ex('manger', 2, 'Jos', 'Jos', 'passeCompose');
        expect(fullAnswerOf(jos)).toBe('Jos a mangé');
        expect(grammarOf(jos)).toBe('passé composé van manger, hulpwerkwoord avoir, 3de persoon enkelvoud');
        const tu = ex('manger', 1, 'tu', 'jij', 'futurProche');
        expect(fullAnswerOf(tu)).toBe('tu vas manger');
        expect(grammarOf(tu)).toBe('futur proche van manger (aller + infinitief), 2de persoon enkelvoud');
        const lien = ex('aller', 2, 'Lien', 'Lien', 'passeCompose');
        expect(fullAnswerOf(lien)).toBe('Lien est allée');
        expect(grammarOf(lien)).toBe('passé composé van aller, hulpwerkwoord être, 3de persoon enkelvoud, deelwoord allée (vrouwelijk)');
        expect(fullAnswerOf(ex('avoir', 0, 'je', 'ik', 'passeCompose'))).toBe("j'ai eu");
        expect(fullAnswerOf(ex('aller', 0, 'je', 'ik', 'passeCompose'))).toBe('je suis allé');
        expect(fullAnswerOf(ex('aller', 3, 'nous', 'wij', 'futurProche'))).toBe('nous allons aller');
    });

    test('Door elkaar: the leerjaar\'s tenses, one per question', () => {
        expect(tensesForGrade(5)).toEqual(['present', 'futurProche']);
        expect(tensesForGrade(6)).toEqual(['present', 'futurProche', 'passeCompose']);
        for (const grade of [5, 6] as const) {
            const v = fransVariant({ verbs: ['avoir', 'être'], mode: 'samen', dir: 'nl-fr', tense: 'mix' }, grade);
            const seen = new Set<string>();
            for (let seed = 1; seed < 200; seed++) seen.add(makeFransExercise(v.ov as never, seeded(seed))!.tense);
            expect([...seen].sort()).toEqual([...tensesForGrade(grade)].sort());
        }
        // A passé composé remembered from leerjaar 6 plays the présent in leerjaar 5.
        expect(fransVariant({ verbs: ['avoir'], mode: 'samen', dir: 'nl-fr', tense: 'passeCompose' }, 5).ov.tense).toBe('present');
        // The présent keeps its old variant id.
        expect(fransVariant({ verbs: ['avoir'], mode: 'samen', dir: 'nl-fr', tense: 'present' }, 5).id)
            .toBe(fransVariant({ verbs: ['avoir'], mode: 'samen', dir: 'nl-fr' }, 5).id);
    });

    test('word lengths bound every choice, and decide the pad: avoir and être fit, -er in the futur proche does not', () => {
        for (const verbs of Object.values(VERB_SETS)) for (const mode of FRANS_MODES) for (const tense of ['futurProche', 'passeCompose', 'mix'] as const)
            for (const dir of ['nl-fr', 'fr-nl', 'mix'] as const) {
                const v = fransVariant({ verbs, mode, dir, tense }, 6);
                const max = fransWordChars(v);
                for (let seed = 1; seed < 40; seed++) for (const w of makeFransExercise(v.ov as never, seeded(seed))!.choices) expect(w.length, `${w}`).toBeLessThanOrEqual(max);
            }
        const pin = skinById('pinguintoren')!.meta;
        expect(padRoundOf(pin, { choice: verbsOf(['être', 'avoir'], 'samen', 'nl-fr', 6, 'futurProche'), grade: 6 })).toBe(true);
        expect(padRoundOf(pin, { choice: verbsOf(['être', 'avoir'], 'samen', 'nl-fr', 6, 'passeCompose'), grade: 6 })).toBe(true);
        expect(fransWordChars(fransVariant({ verbs: VERB_SETS.er, mode: 'samen', dir: 'nl-fr', tense: 'futurProche' }, 6))).toBeGreaterThan(PAD_MAX_WORD_CHARS);
        expect(padRoundOf(pin, { choice: verbsOf(VERB_SETS.er, 'samen', 'nl-fr', 6, 'futurProche'), grade: 6 })).toBe(false);
    });
});

const st = () => useOefenStore.getState();

describe('through the kiosk, a duel and the options screen', () => {
    beforeEach(() => { resetKiosk(); localStorage.clear(); useOefenStore.setState({ fixed: null, missed: [] }); useSpelStore.getState().otherGame(); useSpelStore.getState().takePickerAt(); });
    afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); useDuelStore.getState().stop(); });

    test('a passé composé run: the mistake line names tense, auxiliary and person', () => {
        vi.useFakeTimers();
        st().openZelf(buildZelfSessie(verbsOf(VERB_SETS.er, 'vervoegen', 'nl-fr', 6, 'passeCompose'), { kind: 'count', n: 3 }, 0, 6));
        const e = st().shown!.exercise as FransExercise;
        expect(e.tense).toBe('passeCompose');
        st().choose(currentInput(st().sessie, st().shown)!.choices.find(c => c !== e.answer)!);
        st().answer();
        expect(st().feedbackHint).toBe(`${fullAnswerOf(e)} – ${grammarOf(e)}`);
        expect(st().feedbackHint).toMatch(/passé composé van .*, hulpwerkwoord avoir, /);
    });

    test('a duel through the pad in the futur proche: six choices a side, checked', () => {
        const meta = resolveMeta(skinById('touwtrekken')!.meta, { spelers: '2' });
        useDuelStore.getState().begin({ meta, from: { choice: verbsOf(['être', 'avoir'], 'samen', 'nl-fr', 6, 'futurProche'), grade: 6, topicId: 'frans:werkwoorden' }, rule: {}, config: { players: 2, level: 'makkelijk', lives: 5, bestOf: 1, stream: 'own', readyMs: 0 } });
        const du = useDuelStore.getState();
        expect(du.pad).toBe(true);
        const l = du.sides.left.question!;
        expect((l.exercise as FransExercise).tense).toBe('futurProche');
        expect(l.choices).toHaveLength(6);
        useDuelStore.getState().answer('left', l.answer);
        expect(useDuelStore.getState().sides.left.feedback!.correct).toBe(true);
    });

    test('the Tijd row: three in leerjaar 5, four in leerjaar 6; the pick is remembered and played', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        localStorage.setItem(GRADE_KEY, '5');
        const { unmount } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
        fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[0]);
        const labels = () => within(screen.getByRole('group', { name: 'Tijd' })).getAllByRole('button').map(b => b.textContent);
        expect(labels()).toEqual(['Présent', 'Futur proche', 'Door elkaar']);
        unmount();
        localStorage.setItem(GRADE_KEY, '6');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
        fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[0]);
        expect(labels()).toEqual(['Présent', 'Futur proche', 'Passé composé', 'Door elkaar']);
        fireEvent.click(within(screen.getByRole('group', { name: 'Tijd' })).getByRole('button', { name: 'Passé composé' }));
        expect(readPicks().werkwoorden.tense).toBe('passeCompose');
        const oefenen = screen.queryByRole('button', { name: 'Oefenen' });
        if (oefenen) fireEvent.click(oefenen);
        fireEvent.click(screen.getByRole('button', { name: '3 oefeningen' }));
        fireEvent.click(screen.getByRole('button', { name: /Begin met oefenen/ }));
        expect((st().shown!.exercise as FransExercise).tense).toBe('passeCompose');
    });
});
