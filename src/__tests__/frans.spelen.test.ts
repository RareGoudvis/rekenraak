// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import { useOefenStore } from '../oefenen/useOefenStore';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { FRANS_ZELF, fransTopicOf } from '../talen/frans/fransZelf';
import { FRANS_CARDS } from '../talen/frans/fransCards';
import type { FransExercise } from '../talen/frans/questions';
import { resetKiosk } from './helpers/oefenKiosk';
import type { ZelfChoice } from '../oefenen/zelf/zelfSessie';

// Frans in the games: words on the tap games and the memory boards, never on a keypad game; the session checks with
// the kiosk descriptor and Nakijken replays the mistakes in the kiosk.

const sp = () => useSpelStore.getState();
const choiceOf = (topic: string, label: string): ZelfChoice => FRANS_ZELF.choices(5, topic).find(c => c.label === label)!;
const start = (choice: ZelfChoice, id: string): SpelStart => ({ choice, grade: 5, topicId: 'frans:avoir-etre', meta: skinById(id)!.meta, now: 1_000_000 });

beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); sp().otherGame(); });

describe('Frans in the games', () => {
    test('every Frans choice plays; only tap and memory games take it', () => {
        for (const t of FRANS_ZELF.topics) for (const c of FRANS_ZELF.choices(5, t.id)) {
            expect(choiceCanPlay(c, 5)).toBe(true);
            expect(spelContentOf(c, 5)).toMatchObject({ kind: 'choice', boards: ['pairs'] });
        }
        const ids = (topic: string, mode: string) => skinsFor(SKINS, spelContentOf(choiceOf(topic, mode), 5)!).map(s => s.meta.id);
        const er = ids('frans:er', 'Alles samen');
        expect(er).toEqual(expect.arrayContaining(['ballonnen', 'zeehond', 'mollen', 'hartjes', 'voetbalkaartjes', 'spookhuis']));
        for (const keypad of ['pinguintoren', 'zombies', 'bom', 'kasteel', 'race', 'schatkist', 'eieren', 'honingraat']) expect(er).not.toContain(keypad);
        // "travaillent" is too long for a window, a present, a prize tag or a gate plate on a phone; "sommes" is not.
        for (const small of ['brandweer', 'pakjesband', 'grijp', 'slalom']) expect(er).not.toContain(small);
        expect(ids('frans:avoir-etre', 'Eén werkwoord vervoegen')).toEqual(expect.arrayContaining(['brandweer', 'pakjesband', 'grijp', 'slalom']));
    });

    test('a tap round: the sign marks the answer\'s place, the choices are the exercise\'s own, checked by the kiosk', () => {
        sp().start(start(choiceOf('frans:avoir-etre', 'Eén werkwoord vervoegen'), 'ballonnen'));
        const q = sp().question!;
        const ex = q.exercise as FransExercise;
        expect(q.text).toBe(`${ex.subject.nl} ? (${ex.nl})`);
        expect(q.choices).toHaveLength(4);
        expect(q.choices).toContain(ex.answer);
        for (const c of q.choices) expect(ex.choices).toContain(c);
        sp().answer(q.choices.find(c => c !== ex.answer)!);
        expect(sp().phase).toBe('wrong');
        expect(sp().mistakes).toHaveLength(1);
        sp().next();
        const q2 = sp().question!;
        sp().answer((q2.exercise as FransExercise).answer);
        expect(sp().phase).toBe('right');
    });

    test('Hoe los ik dit op? shows the pronoun and the verb\'s table', () => {
        sp().start(start(choiceOf('frans:avoir-etre', 'Eén werkwoord vervoegen'), 'ballonnen'));
        sp().openHelp();
        const lines = sp().help!.lines!;
        expect(lines).toHaveLength(7);
        expect(lines.every(l => l.aside)).toBe(true);
    });

    test('Nakijken after a game replays the mistakes in the kiosk', () => {
        sp().start({ ...start(choiceOf('frans:er', 'Alles samen'), 'ballonnen') });
        const q = sp().question!;
        sp().answer(q.choices.find(c => c !== q.answer)!);
        // End the round: answer the rest right.
        for (let i = 0; i < 40 && sp().phase !== 'end'; i++) { sp().next(); if (sp().question) sp().answer(sp().question!.answer); }
        expect(sp().phase).toBe('end');
        sp().nakijken();
        expect(useOefenStore.getState().phase).toBe('exercise');
        expect(useOefenStore.getState().shown!.exercise).toEqual(q.exercise);
    });

    test('memory boards: pairs of "subject (verb)" and its form, never two equal forms on a board', () => {
        sp().start(start(choiceOf('frans:er', 'Eén werkwoord vervoegen'), 'hartjes'));
        const s = sp().sessie!;
        const round = skinById('hartjes')!.meta.round.board!;
        for (let i = 0; i < 10; i++) {
            const board = nextBoardOf(s, round, null, [], undefined, Math.random)!;
            expect(board.cells.length).toBeGreaterThanOrEqual(4);
            const answers = board.cells.map(c => c.question.answer);
            expect(new Set(answers).size).toBe(answers.length);
            for (const c of board.cells) {
                const ex = c.question.exercise as FransExercise;
                expect(c.question.pair!.sum.text).toBe(`${ex.subject.nl} (${ex.nl})`);
                expect(c.question.pair!.answer.text).toBe(ex.answer);
            }
        }
    });
});

describe('Frans word lengths for the games', () => {
    test('a variant\'s wordChars bounds every choice it can make', async () => {
        const { fransWordChars } = await import('../talen/frans/fransPack');
        const { makeFransExercise } = await import('../talen/frans/questions');
        for (const t of FRANS_ZELF.topics.filter(x => FRANS_CARDS.map(fransTopicOf).includes(x.id))) for (const c of FRANS_ZELF.choices(5, t.id)) {
            const v = c.vars[0];
            const max = fransWordChars(v);
            for (let seed = 1; seed < 200; seed++) {
                let a = seed;
                const rng = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
                const ex = makeFransExercise(v.ov as never, rng)!;
                for (const w of ex.choices) expect(w.length, `${w} on ${c.key}`).toBeLessThanOrEqual(max);
            }
        }
    });
});
