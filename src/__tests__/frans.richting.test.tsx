// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { FRANS_CARDS } from '../talen/frans/fransCards';
import { FRANS_ZELF } from '../talen/frans/fransZelf';
import { fransWordChars } from '../talen/frans/fransPack';
import { FRANS_MODES, frNlPairOf, fullAnswerOf, grammarOf, makeFransExercise, promptOf, type FransExercise } from '../talen/frans/questions';
import { VERB_BY_INF, PERSONS } from '../talen/frans/verbs';
import { buildZelfSessie, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore, currentInput } from '../oefenen/useOefenStore';
import { stepLineText } from '../services/math/workedSteps';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { resetKiosk } from './helpers/oefenKiosk';
import { mulberry32 } from '../oefenen/spelen/distractors';

// The verb cards' Richting: Nederlands → Frans as before, Frans → Nederlands ("nous avons" → "wij hebben"), door
// elkaar; a row under the oefeningen on the Keuze screen.

const seeded = (seed: number) => mulberry32(seed * 7919 + 13);
const NL_PRONOUN: Record<string, string> = { je: 'ik', tu: 'jij', il: 'hij', elle: 'zij', on: 'men', nous: 'wij', vous: 'jullie', ils: 'zij', elles: 'zij' };

describe('Frans → Nederlands questions', () => {
    test('every card and mode: six distinct Dutch choices with the answer, the French shown', () => {
        for (const card of FRANS_CARDS) for (const mode of FRANS_MODES) for (let seed = 1; seed < 150; seed++) {
            const ex = makeFransExercise({ tense: 'present', mode, verbs: card.verbs, dir: 'fr-nl' }, seeded(seed))!;
            expect(ex.dir).toBe('fr-nl');
            expect(ex.choices).toHaveLength(6);
            expect(new Set(ex.choices).size).toBe(6);
            expect(ex.choices).toContain(ex.answer);
            const verb = VERB_BY_INF.get(ex.verb)!;
            expect(ex.subject.nl).toBe(NL_PRONOUN[ex.subject.fr]);
            expect(promptOf(ex)).toBe(fullAnswerOf(ex));
            if (mode === 'werkwoord') {
                expect(ex.answer).toBe(verb.nl.inf);
                const dutchInfs = [...VERB_BY_INF.values()].map(v => v.nl.inf);
                for (const c of ex.choices) expect(dutchInfs).toContain(c);
            } else {
                expect(ex.answer).toBe(`${ex.subject.nl} ${verb.nl.present[ex.person]}`);
                // Each choice a Dutch pronoun with a Dutch form.
                for (const c of ex.choices) expect(c).toMatch(/^(ik|jij|hij|zij|men|wij|jullie) \S/);
            }
            if (mode === 'vervoegen') for (const c of ex.choices) expect(PERSONS.map(p => verb.nl.present[p])).toContain(c.replace(/^\S+ /, ''));
        }
    });

    test('the examples: nous avons = wij hebben, elle a = zij heeft', () => {
        const ex = (fr: string, person: 0 | 1 | 2 | 3 | 4 | 5, nl: string, verb = 'avoir'): FransExercise =>
            ({ tense: 'present', mode: 'vervoegen', verb, person, subject: { fr, nl: NL_PRONOUN[fr], person }, nl, answer: '', choices: [], dir: 'fr-nl' });
        expect(frNlPairOf(ex('nous', 3, 'hebben'))).toBe('nous avons = wij hebben');
        expect(frNlPairOf(ex('elle', 2, 'heeft'))).toBe('elle a = zij heeft');
        expect(frNlPairOf(ex('je', 0, 'heb'))).toBe("j'ai = ik heb");
        expect(frNlPairOf(ex('nous', 3, 'drinken', 'boire'))).toBe('nous buvons = wij drinken');
        expect(grammarOf(ex('nous', 3, 'hebben'))).toBe('avoir, 1ste persoon meervoud');
    });

    test('door elkaar: both directions; Nederlands → Frans as it was', () => {
        const dirs = new Set<string>();
        for (let seed = 1; seed < 100; seed++) dirs.add(makeFransExercise({ tense: 'present', mode: 'samen', verbs: ['avoir', 'être'], dir: 'mix' }, seeded(seed))!.dir ?? 'nl-fr');
        expect([...dirs].sort()).toEqual(['fr-nl', 'nl-fr']);
        const s = { tense: 'present' as const, mode: 'vervoegen' as const, verbs: ['avoir'] };
        expect(makeFransExercise({ ...s, dir: 'nl-fr' }, seeded(5))).toEqual(makeFransExercise(s, seeded(5)));
        expect(makeFransExercise(s, seeded(5))!.dir).toBeUndefined();
    });

    test('word lengths: the Dutch of a Frans → Nederlands card bounds its choices', () => {
        for (const t of FRANS_CARDS) for (const dir of ['fr-nl', 'mix'] as const) for (const c of FRANS_ZELF.choices(5, `frans:${t.id}`, dir)) {
            const v = c.vars[0];
            const max = fransWordChars(v);
            for (let seed = 1; seed < 120; seed++) {
                const ex = makeFransExercise(v.ov as never, seeded(seed))!;
                for (const w of ex.choices) expect(w.length, `${w} on ${c.key}`).toBeLessThanOrEqual(max);
            }
        }
    });
});

const st = () => useOefenStore.getState();
const cur = () => st().shown!.exercise as FransExercise;
const choiceOf = (dir: string, label: string, topic = 'frans:avoir-etre'): ZelfChoice => FRANS_ZELF.choices(5, topic, dir).find(c => c.label === label)!;

describe('Richting through the kiosk and the games', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null, missed: [] }); useSpelStore.getState().otherGame(); });
    afterEach(() => { vi.useRealTimers(); });

    test('the choices per direction: own keys (Nederlands → Frans keeps the old ones), the facet on each', () => {
        expect(FRANS_ZELF.facet!('frans:er')!.options.map(o => o.label.replace(/\s/g, ' '))).toEqual(['Nederlands → Frans', 'Frans → Nederlands', 'Door elkaar']);
        expect(FRANS_ZELF.facet!('frans:dagen')).toBeNull();
        expect(FRANS_ZELF.choices(5, 'frans:er').map(c => c.key)).toEqual(['5|frans:er|vervoegen', '5|frans:er|werkwoord', '5|frans:er|samen']);
        expect(FRANS_ZELF.choices(5, 'frans:er', 'fr-nl').map(c => c.key)).toEqual(['5|frans:er|vervoegen|fr-nl', '5|frans:er|werkwoord|fr-nl', '5|frans:er|samen|fr-nl']);
        expect(FRANS_ZELF.choices(5, 'frans:er', 'mix').every(c => c.facet === 'mix')).toBe(true);
    });

    test('a Frans → Nederlands run: Dutch on the buttons, the pair and the grammar after a fout', () => {
        vi.useFakeTimers();
        st().openZelf(buildZelfSessie(choiceOf('fr-nl', 'Alles samen'), { kind: 'count', n: 3 }, 0, 5));
        const ex = cur();
        expect(ex.dir).toBe('fr-nl');
        const choices = currentInput(st().sessie, st().shown)!.choices;
        expect(choices).toContain(ex.answer);
        st().choose(choices.find(c => c !== ex.answer)!);
        st().answer();
        expect(st().feedbackHint).toBe(frNlPairOf(ex));
        expect(st().stepsOffer!.map(l => stepLineText(l, String))).toEqual([frNlPairOf(ex), grammarOf(ex)]);
    });

    test('memory boards: one verb in one person once, whichever way it is asked', () => {
        useSpelStore.getState().start({ choice: choiceOf('mix', 'Eén werkwoord vervoegen', 'frans:er'), grade: 5, topicId: 'frans:er', meta: skinById('hartjes')!.meta, now: 1_000_000 });
        const s = useSpelStore.getState().sessie!;
        const round = skinById('hartjes')!.meta.round.board!;
        for (let i = 0; i < 10; i++) {
            const board = nextBoardOf(s, round, null, [], undefined, Math.random)!;
            const same = board.cells.map(c => c.question.same);
            expect(new Set(same).size).toBe(same.length);
        }
    });
});

describe('the Richting row on the Keuze screen', () => {
    beforeEach(() => { resetKiosk(); useSpelStore.getState().otherGame(); useSpelStore.getState().takePickerAt(); vi.spyOn(console, 'error').mockImplementation(() => { }); });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    test('a verb card shows it under the oefeningen, a word card does not; flipping it keeps the oefening', async () => {
        localStorage.setItem(GRADE_KEY, '5');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
        fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[0]);
        const row = screen.getByRole('group', { name: 'Richting' });
        const btn = (name: string) => within(row).getByRole('button', { name: new RegExp(`^${name.replace(' → ', '.→ ')}$`) });
        expect(btn('Nederlands → Frans').getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Alles samen' }));
        fireEvent.click(btn('Frans → Nederlands'));
        expect(btn('Frans → Nederlands').getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Alles samen' }).getAttribute('aria-pressed')).toBe('true');
        const oefenen = screen.queryByRole('button', { name: 'Oefenen' });
        if (oefenen) fireEvent.click(oefenen);
        fireEvent.click(screen.getByRole('button', { name: '3 oefeningen' }));
        fireEvent.click(screen.getByRole('button', { name: /Begin met oefenen/ }));
        expect((useOefenStore.getState().shown!.exercise as FransExercise).dir).toBe('fr-nl');
    });

    test('a word card has no Richting row', async () => {
        localStorage.setItem(GRADE_KEY, '6');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' }, { timeout: 5000 });
        fireEvent.click(within(screen.getByRole('region', { name: 'Frans' })).getAllByRole('button')[5]);
        expect(screen.queryByRole('group', { name: 'Richting' })).toBeNull();
    });
});
