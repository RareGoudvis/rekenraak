// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { DAGEN, MAANDEN, WORD_CHOICE_COUNT, WORD_LISTS, makeWordExercise, orderLine, pairLine, wordChoiceChars, type WordExercise, type WordSettings } from '../talen/frans/woorden';
import { WOORD_CARDS, FRANS_WOORD_TYPE_ID } from '../talen/frans/woordCards';
import { FRANS_ZELF } from '../talen/frans/fransZelf';
import { buildZelfSessie, reviewSessieOf, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore, currentInput } from '../oefenen/useOefenStore';
import { kioskSupports } from '../services/oefenen/kiosk';
import { summary } from '../services/oefenen/stats';
import { stepLineText } from '../services/math/workedSteps';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { resetKiosk } from './helpers/oefenKiosk';

// Frans dagen en maanden: the word tables, the six choices both ways, a run through the kiosk and the games.

// Hand-written, as the owner gave them (2026-11-18): lowercase, accents exact, in order.
const DAGEN_TABLE = [
    ['lundi', 'maandag'], ['mardi', 'dinsdag'], ['mercredi', 'woensdag'], ['jeudi', 'donderdag'],
    ['vendredi', 'vrijdag'], ['samedi', 'zaterdag'], ['dimanche', 'zondag'],
];
const MAANDEN_TABLE = [
    ['janvier', 'januari'], ['février', 'februari'], ['mars', 'maart'], ['avril', 'april'], ['mai', 'mei'], ['juin', 'juni'],
    ['juillet', 'juli'], ['août', 'augustus'], ['septembre', 'september'], ['octobre', 'oktober'], ['novembre', 'november'], ['décembre', 'december'],
];

const seeded = (seed: number) => { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; };
const words = (lists: readonly string[], side: 'fr' | 'nl') => WORD_LISTS.filter(l => lists.includes(l.id)).flatMap(l => l.pairs.map(p => p[side]));
const listOfWord = (w: string) => WORD_LISTS.find(l => l.pairs.some(p => p.fr === w || p.nl === w))!.id;

describe('the word tables', () => {
    test('dagen and maanden exactly as written, lowercase, in order', () => {
        expect(DAGEN.pairs.map(p => [p.fr, p.nl])).toEqual(DAGEN_TABLE);
        expect(MAANDEN.pairs.map(p => [p.fr, p.nl])).toEqual(MAANDEN_TABLE);
        for (const l of WORD_LISTS) for (const p of l.pairs) {
            expect(p.fr).toBe(p.fr.toLowerCase());
            expect(p.nl).toBe(p.nl.toLowerCase());
        }
        // NFC: the accents are single code points, as a pupil's keyboard and the fonts expect.
        for (const w of words(['dagen', 'maanden'], 'fr')) expect(w).toBe(w.normalize('NFC'));
    });

    test('the explanation lines', () => {
        const ex = (list: string, index: number, dir: 'fr-nl' | 'nl-fr', shown: string, answer: string): WordExercise => ({ list, index, dir, shown, answer, choices: [] });
        expect(pairLine(ex('dagen', 2, 'fr-nl', 'mercredi', 'woensdag'))).toBe('mercredi = woensdag');
        expect(pairLine(ex('maanden', 7, 'nl-fr', 'augustus', 'août'))).toBe('augustus = août');
        expect(orderLine(ex('dagen', 2, 'fr-nl', 'mercredi', 'woensdag'))).toBe('woensdag is de 3de dag van de week.');
        expect(orderLine(ex('maanden', 7, 'nl-fr', 'augustus', 'août'))).toBe('augustus is de 8ste maand van het jaar.');
        expect(orderLine(ex('dagen', 0, 'fr-nl', 'lundi', 'maandag'))).toBe('maandag is de 1ste dag van de week.');
    });
});

describe('the questions', () => {
    const settingsOf = (lists: readonly string[], dir: WordSettings['dir']): WordSettings => ({ lists, dir });

    test('every card and direction: six distinct words in the answer\'s language, the answer among them', () => {
        for (const card of WOORD_CARDS.filter(c => c.lists.every(l => l === 'dagen' || l === 'maanden'))) for (const dir of ['fr-nl', 'nl-fr', 'mix'] as const) {
            const seen = new Set<string>();
            for (let seed = 1; seed < 300; seed++) {
                const ex = makeWordExercise(settingsOf(card.lists, dir), seeded(seed))!;
                expect(ex.choices).toHaveLength(WORD_CHOICE_COUNT);
                expect(new Set(ex.choices).size).toBe(WORD_CHOICE_COUNT);
                expect(ex.choices).toContain(ex.answer);
                if (dir !== 'mix') expect(ex.dir).toBe(dir);
                const [from, to] = ex.dir === 'fr-nl' ? ['fr', 'nl'] as const : ['nl', 'fr'] as const;
                const pair = WORD_LISTS.find(l => l.id === ex.list)!.pairs[ex.index];
                expect([ex.shown, ex.answer]).toEqual([pair[from], pair[to]]);
                for (const c of ex.choices) expect(words(card.lists, to)).toContain(c);
                seen.add(ex.dir);
            }
            expect([...seen].sort()).toEqual(dir === 'mix' ? ['fr-nl', 'nl-fr'] : [dir]);
        }
    });

    test('dagen en maanden: three distractors of the answer\'s own list, two of the other', () => {
        for (let seed = 1; seed < 200; seed++) {
            const ex = makeWordExercise({ lists: ['dagen', 'maanden'], dir: 'mix' }, seeded(seed))!;
            const own = ex.choices.filter(c => listOfWord(c) === ex.list);
            expect(own).toHaveLength(4);
        }
    });

    test('seeded: the same rng gives the same question', () => {
        const s = { lists: ['maanden'], dir: 'mix' } as const;
        expect(makeWordExercise(s, seeded(42))).toEqual(makeWordExercise(s, seeded(42)));
    });

    test('the longest choice word per direction (the narrow games read it)', () => {
        expect(wordChoiceChars({ lists: ['dagen'], dir: 'fr-nl' })).toBe(9);
        expect(wordChoiceChars({ lists: ['dagen'], dir: 'nl-fr' })).toBe(8);
        expect(wordChoiceChars({ lists: ['maanden'], dir: 'nl-fr' })).toBe(9);
        expect(wordChoiceChars({ lists: ['maanden'], dir: 'fr-nl' })).toBe(9);
    });
});

const st = () => useOefenStore.getState();
const cur = () => st().shown!.exercise as WordExercise;
const choiceOf = (topic: string, label: string, grade: 5 | 6 = 5): ZelfChoice => FRANS_ZELF.choices(grade, topic).find(c => c.label.replace(/\s/g, ' ') === label)!;

describe('through the kiosk', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null, missed: [] }); });
    afterEach(() => { vi.useRealTimers(); });

    test('a Dagen run: six buttons, the right pair after a fout, the results and Nakijken', () => {
        vi.useFakeTimers();
        const s = buildZelfSessie(choiceOf('frans:dagen', 'Frans → Nederlands'), { kind: 'count', n: 3 }, 0, 5);
        expect(s.types.every(t => t.typeId === FRANS_WOORD_TYPE_ID && kioskSupports(t.typeId, t.constraints))).toBe(true);
        st().openZelf(s);
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('choice');
        expect(info.choices).toHaveLength(6);

        const ex = cur();
        expect(DAGEN_TABLE.map(r => r[0])).toContain(ex.shown);
        st().choose(info.choices.find(c => c !== ex.answer)!);
        st().answer();
        expect(st().lastCorrect).toBe(false);
        expect(st().feedbackHint).toBe(`${ex.shown} = ${ex.answer}`);
        expect(st().stepsOffer!.map(l => stepLineText(l, String))).toEqual([pairLine(ex), orderLine(ex)]);
        st().skipFlash();
        expect(st().phase).toBe('steps');
        st().next();

        st().choose(cur().answer);
        st().answer();
        expect(st().lastCorrect).toBe(true);
        expect(st().feedbackHint).toBeNull();
        st().skipFlash();
        st().choose(cur().answer);
        st().answer();
        st().skipFlash();
        expect(st().phase).toBe('locked');
        const err = summary(st().run!.stats, st().sessie!).flatMap(r => r.errors)[0];
        expect(err.exercise).toBe(`${ex.shown} = ?`);
        expect(err.expected).toBe(ex.answer);

        st().openReview(reviewSessieOf(st().sessie!, 1), st().missed);
        expect(cur()).toEqual(ex);
    });

    test('Nederlands → Frans asks a Dutch month and offers French ones', () => {
        st().openZelf(buildZelfSessie(choiceOf('frans:maanden', 'Nederlands → Frans', 6), { kind: 'count', n: 3 }, 0, 6));
        const ex = cur();
        expect(MAANDEN_TABLE.map(r => r[1])).toContain(ex.shown);
        for (const c of currentInput(st().sessie, st().shown)!.choices) expect(MAANDEN_TABLE.map(r => r[0])).toContain(c);
    });
});

const sp = () => useSpelStore.getState();
const start = (choice: ZelfChoice, id: string): SpelStart => ({ choice, grade: 5, topicId: 'frans:dagen', meta: skinById(id)!.meta, now: 1_000_000 });

describe('in the games', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); sp().otherGame(); });

    test('every word choice plays; the narrow games only where the words fit, the keypad games through the choice pad', () => {
        for (const card of WOORD_CARDS.filter(c => c.lists.every(l => l === 'dagen' || l === 'maanden'))) for (const c of FRANS_ZELF.choices(5, `frans:${card.id}`)) {
            expect(choiceCanPlay(c, 5)).toBe(true);
            expect(spelContentOf(c, 5)).toMatchObject({ kind: 'choice', boards: ['pairs'] });
        }
        const ids = (topic: string, label: string) => skinsFor(SKINS, spelContentOf(choiceOf(topic, label), 5)!).map(s => s.meta.id);
        // donderdag (9) is too long for a present on the belt; mercredi, vendredi, dimanche (8) are not.
        const frNl = ids('frans:dagen', 'Frans → Nederlands');
        expect(frNl).toEqual(expect.arrayContaining(['ballonnen', 'zeehond', 'mollen', 'hartjes', 'voetbalkaartjes', 'spookhuis']));
        for (const small of ['pakjesband', 'brandweer', 'grijp', 'slalom']) expect(frNl).not.toContain(small);
        const nlFr = ids('frans:dagen', 'Nederlands → Frans');
        expect(nlFr).toContain('pakjesband');
        for (const small of ['brandweer', 'grijp', 'slalom']) expect(nlFr).not.toContain(small);
        // The keypad games take the words through the choice pad; the ones that need a number (a lock code, numbers only) stay out.
        for (const pad of ['pinguintoren', 'zombies', 'bom', 'kasteel', 'race']) expect(frNl).toContain(pad);
        for (const numeric of ['schatkist', 'eieren', 'honingraat']) expect(frNl).not.toContain(numeric);
    });

    test('a tap round: "mercredi = ?" on the sign, the exercise\'s own words, checked by the kiosk', () => {
        sp().start(start(choiceOf('frans:dagen', 'Frans → Nederlands'), 'ballonnen'));
        const q = sp().question!;
        const ex = q.exercise as WordExercise;
        expect(q.text).toBe(`${ex.shown} = ?`);
        expect(q.choices).toContain(ex.answer);
        for (const c of q.choices) expect(ex.choices).toContain(c);
        sp().answer(q.choices.find(c => c !== ex.answer)!);
        expect(sp().phase).toBe('wrong');
        sp().next();
        sp().answer(sp().question!.answer);
        expect(sp().phase).toBe('right');
    });

    test('Hoe los ik dit op? shows the whole list', () => {
        sp().start(start(choiceOf('frans:maanden', 'Door elkaar'), 'ballonnen'));
        sp().openHelp();
        const lines = sp().help!.lines!.map(l => stepLineText(l, String));
        expect(lines).toHaveLength(13);
        expect(lines[0]).toBe(`Zoek ${(sp().question!.exercise as WordExercise).shown} in de lijst.`);
        expect(lines[8]).toBe('août = augustus');
    });

    test('memory boards: a word and its translation, never one word asked both ways on a board', () => {
        sp().start(start(choiceOf('frans:dagen-maanden', 'Door elkaar'), 'hartjes'));
        const s = sp().sessie!;
        const round = skinById('hartjes')!.meta.round.board!;
        for (let i = 0; i < 20; i++) {
            const board = nextBoardOf(s, round, null, [], undefined, Math.random)!;
            expect(board.cells.length).toBeGreaterThanOrEqual(4);
            const ids = board.cells.map(c => { const ex = c.question.exercise as WordExercise; return `${ex.list}:${ex.index}`; });
            expect(new Set(ids).size).toBe(ids.length);
            for (const c of board.cells) {
                const ex = c.question.exercise as WordExercise;
                expect(c.question.pair!.sum.text).toBe(ex.shown);
                expect(c.question.pair!.answer.text).toBe(ex.answer);
            }
        }
    });
});
