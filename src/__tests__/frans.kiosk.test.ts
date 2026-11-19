// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, reviewSessieOf, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { currentInput } from '../oefenen/useOefenStore';
import { kioskFor, kioskSupports } from '../services/oefenen/kiosk';
import { summary } from '../services/oefenen/stats';
import { FRANS_ZELF } from '../talen/frans/fransZelf';
import { FRANS_TYPE_ID } from '../talen/frans/fransCards';
import { DEFAULT_PICKS, savePicks } from '../talen/frans/fransPicks';
import { pickOf } from './helpers/fransChoices';
import { fullAnswerOf, grammarOf, type FransExercise } from '../talen/frans/questions';
import { stepLineText } from '../services/math/workedSteps';
import { resetKiosk } from './helpers/oefenKiosk';
import { zelfSubjectOf } from '../oefenen/zelf/zelfSubjects';

// The subject seam: a Frans Zelf choice runs through the kiosk store unchanged (six buttons, the check, the results,
// the explanation after a fout, Nakijken), and a maths topic never meets it.

const st = () => useOefenStore.getState();
const cur = () => st().shown!.exercise as FransExercise;
const choiceOf = (grade: 5 | 6, topic: string, label: string): ZelfChoice => pickOf(topic, label, grade);

beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null, missed: [] }); });
afterEach(() => { vi.useRealTimers(); });

describe('Frans through the kiosk', () => {
    test('Frans topics: leerjaar 5 and 6 only, three cards, each one choice made from the device\'s last pick', async () => {
        const data = await loadEenvoudigData();
        localStorage.clear();
        expect(FRANS_ZELF.topics.map(t => t.label)).toEqual(['Werkwoorden', 'Dagen en maanden', 'Getallen']);
        for (const t of FRANS_ZELF.topics) {
            expect(zelfSubjectOf(t.id)).toBe(FRANS_ZELF);
            expect(choicesFor(data, 4, t.id)).toEqual([]);
            for (const g of [5, 6] as const) expect(choicesFor(data, g, t.id)).toHaveLength(1);
        }
        // The defaults: avoir and être, vervoegen, Nederlands → Frans.
        const verbs = choicesFor(data, 5, 'frans:werkwoorden')[0];
        expect(verbs.vars[0].ov).toMatchObject({ verbs: ['être', 'avoir'], mode: 'vervoegen', dir: 'nl-fr' });
        // Another pick on this device: the card plays that one.
        savePicks({ ...DEFAULT_PICKS, getallen: { set: 'tientallen', dir: 'fr-nl' } });
        expect(choicesFor(data, 6, 'frans:getallen')[0].vars[0].ov).toEqual({ lists: ['tientallen'], dir: 'fr-nl' });
        localStorage.clear();
        // A maths topic is no subject's.
        expect(zelfSubjectOf('Hoofdrekenen · Optellen')).toBeNull();
    });

    test('a session: six choice buttons, right and wrong checked, the results and the explanation', () => {
        vi.useFakeTimers();
        const s = buildZelfSessie(choiceOf(5, 'frans:avoir-etre', 'Eén werkwoord vervoegen'), { kind: 'count', n: 3 }, 0, 5);
        expect(s.types.every(t => t.typeId === FRANS_TYPE_ID && kioskSupports(t.typeId, t.constraints))).toBe(true);
        st().openZelf(s);
        expect(st().phase).toBe('exercise');
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('choice');
        expect(info.choices).toHaveLength(6);
        expect(info.choices).toContain(cur().answer);

        // 1: right.
        st().choose(cur().answer);
        st().answer();
        expect(st().lastCorrect).toBe(true);
        expect(st().stepsOffer).toBeNull();
        st().skipFlash();

        // 2: wrong: the flash shows the full answer, the steps panel the explanation (answer + grammar line).
        const ex = cur();
        st().choose(currentInput(st().sessie, st().shown)!.choices.find(c => c !== ex.answer)!);
        st().answer();
        expect(st().lastCorrect).toBe(false);
        expect(st().feedbackHint).toBe(`${fullAnswerOf(ex)} – ${grammarOf(ex)}`);
        expect(st().stepsOffer!.map(l => stepLineText(l, String))).toEqual([fullAnswerOf(ex), grammarOf(ex)]);
        st().skipFlash();
        expect(st().phase).toBe('steps');
        st().next();

        // 3: right, then the run ends with its results.
        st().choose(cur().answer);
        st().answer();
        st().skipFlash();
        expect(st().phase).toBe('locked');
        const rows = summary(st().run!.stats, st().sessie!);
        const made = rows.reduce((a, r) => a + r.made, 0);
        expect(made).toBe(3);
        expect(rows.reduce((a, r) => a + r.correct, 0)).toBe(2);
        const err = rows.flatMap(r => r.errors)[0];
        expect(err.exercise).toBe(`${ex.subject.fr} (${ex.nl})`);
        expect(err.expected).toBe(ex.answer);

        // Nakijken replays exactly the missed question.
        expect(st().missed).toHaveLength(1);
        st().openReview(reviewSessieOf(st().sessie!, 1), st().missed);
        expect(st().phase).toBe('exercise');
        expect(cur()).toEqual(ex);
    });

    test('welk werkwoord: infinitives on the buttons, the full answer also after a right one', () => {
        vi.useFakeTimers();
        st().openZelf(buildZelfSessie(choiceOf(6, 'frans:alles', 'Welk werkwoord?'), { kind: 'count', n: 3 }, 0, 6));
        const ex = cur();
        expect(ex.mode).toBe('werkwoord');
        expect(currentInput(st().sessie, st().shown)!.choices).toContain(ex.verb);
        st().choose(ex.answer);
        st().answer();
        expect(st().lastCorrect).toBe(true);
        expect(st().feedbackHint).toBe(fullAnswerOf(ex));
    });

    test('the card instruction names what to do per oefening', () => {
        const d = kioskFor(FRANS_TYPE_ID)!;
        const ex = { mode: 'vervoegen', verb: 'avoir', tense: 'present' } as FransExercise;
        const ki = d.kioskInstruction as (e: unknown, c: Record<string, unknown>) => string;
        expect(ki(ex, {})).toBe('Vervoeg avoir. Kies de juiste vorm.');
        expect(ki({ ...ex, tense: 'futurProche' }, {})).toBe('Vervoeg avoir in de futur proche. Kies de juiste vorm.');
        expect(ki({ ...ex, tense: 'passeCompose' }, {})).toBe('Vervoeg avoir in de passé composé. Kies de juiste vorm.');
        expect(ki({ ...ex, mode: 'werkwoord' }, {})).toMatch(/infinitief/);
    });

    test('a run never repeats a question while the card has fresh ones', () => {
        st().openZelf(buildZelfSessie(choiceOf(5, 'frans:er', 'Alles samen'), { kind: 'count', n: 20 }, 0, 5));
        const keys = new Set<string>();
        for (let i = 0; i < 20; i++) {
            if (st().phase !== 'exercise') break;
            keys.add(st().shown!.exerciseKey);
            st().choose(cur().answer);
            st().answer();
            st().next();
        }
        expect(keys.size).toBe(20);
    });
});
