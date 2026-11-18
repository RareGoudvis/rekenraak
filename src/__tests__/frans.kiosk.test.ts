// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, reviewSessieOf, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { currentInput } from '../oefenen/useOefenStore';
import { kioskFor, kioskSupports } from '../services/oefenen/kiosk';
import { summary } from '../services/oefenen/stats';
import { FRANS_ZELF, fransTopicOf } from '../talen/frans/fransZelf';
import { FRANS_CARDS, FRANS_TYPE_ID } from '../talen/frans/fransCards';
import { fullAnswerOf, grammarOf, type FransExercise } from '../talen/frans/questions';
import { stepLineText } from '../services/math/workedSteps';
import { resetKiosk } from './helpers/oefenKiosk';
import { zelfSubjectOf } from '../oefenen/zelf/zelfSubjects';

// The subject seam: a Frans Zelf choice runs through the kiosk store unchanged (six buttons, the check, the results,
// the explanation after a fout, Nakijken), and a maths topic never meets it.

const VERB_TOPICS = FRANS_CARDS.map(fransTopicOf);
const st = () => useOefenStore.getState();
const cur = () => st().shown!.exercise as FransExercise;
const choiceOf = (grade: 5 | 6, topic: string, label: string): ZelfChoice => FRANS_ZELF.choices(grade, topic).find(c => c.label === label)!;

beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null, missed: [] }); });
afterEach(() => { vi.useRealTimers(); });

describe('Frans through the kiosk', () => {
    test('Frans topics: leerjaar 5 and 6 only, three oefeningen per card, through the Zelf choicesFor', async () => {
        const data = await loadEenvoudigData();
        expect(FRANS_ZELF.topics.map(t => t.label)).toEqual(['avoir & être', 'Onregelmatig', 'Werkwoorden op -er', 'Op -ir en -re', 'Alles door elkaar', 'Dagen', 'Maanden', 'Dagen en maanden', 'Getallen tot 20', 'Tientallen tot 100', 'Getallen tot 100']);
        for (const t of FRANS_ZELF.topics) {
            expect(zelfSubjectOf(t.id)).toBe(FRANS_ZELF);
            expect(choicesFor(data, 4, t.id)).toEqual([]);
            const labels = VERB_TOPICS.includes(t.id) ? ['Eén werkwoord vervoegen', 'Welk werkwoord?', 'Alles samen']
                : /getallen|tientallen/.test(t.id) ? ['Cijfer → Frans', 'Frans → cijfer', 'Door elkaar'] : ['Frans → Nederlands', 'Nederlands → Frans', 'Door elkaar'];
            // The direction labels hold a no-break space before the arrow.
            for (const g of [5, 6] as const) expect(choicesFor(data, g, t.id).map(c => c.label.replace(/\s/g, ' '))).toEqual(labels);
        }
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
        expect(st().feedbackHint).toBe(fullAnswerOf(ex));
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
        expect(err.exercise).toBe(`${ex.subject.nl} (${ex.nl})`);
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
        const ex = { mode: 'vervoegen', verb: 'avoir' } as FransExercise;
        const ki = d.kioskInstruction as (e: unknown, c: Record<string, unknown>) => string;
        expect(ki(ex, {})).toBe('Vervoeg avoir. Kies de juiste vorm.');
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
