// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { frenchNumber, GETALLEN_100, GETALLEN_20, TIENTALLEN } from '../talen/frans/getallen';
import { flashLine, makeWordExercise, otherFormLine, pairLine, tableOf, wordChoiceChars, type WordExercise, type WordPair } from '../talen/frans/woorden';
import { FRANS_ZELF } from '../talen/frans/fransZelf';
import { buildZelfSessie, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore, currentInput } from '../oefenen/useOefenStore';
import { stepLineText } from '../services/math/workedSteps';
import { choiceCanPlay, padRoundOf, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { resetKiosk } from './helpers/oefenKiosk';
import { mulberry32 } from '../oefenen/spelen/distractors';

// French numbers 0 to 100: the hand-written table (traditional spelling, both forms of 70 and 90), the questions
// both ways, a run through the kiosk and the games (Frans → cijfer also on the keypads).

// Written out by hand, in the traditional spelling; the second form where Belgium says it otherwise.
const TABLE: readonly (readonly [string] | readonly [string, string])[] = [
    ['zéro'], ['un'], ['deux'], ['trois'], ['quatre'], ['cinq'], ['six'], ['sept'], ['huit'], ['neuf'],
    ['dix'], ['onze'], ['douze'], ['treize'], ['quatorze'], ['quinze'], ['seize'], ['dix-sept'], ['dix-huit'], ['dix-neuf'],
    ['vingt'], ['vingt et un'], ['vingt-deux'], ['vingt-trois'], ['vingt-quatre'], ['vingt-cinq'], ['vingt-six'], ['vingt-sept'], ['vingt-huit'], ['vingt-neuf'],
    ['trente'], ['trente et un'], ['trente-deux'], ['trente-trois'], ['trente-quatre'], ['trente-cinq'], ['trente-six'], ['trente-sept'], ['trente-huit'], ['trente-neuf'],
    ['quarante'], ['quarante et un'], ['quarante-deux'], ['quarante-trois'], ['quarante-quatre'], ['quarante-cinq'], ['quarante-six'], ['quarante-sept'], ['quarante-huit'], ['quarante-neuf'],
    ['cinquante'], ['cinquante et un'], ['cinquante-deux'], ['cinquante-trois'], ['cinquante-quatre'], ['cinquante-cinq'], ['cinquante-six'], ['cinquante-sept'], ['cinquante-huit'], ['cinquante-neuf'],
    ['soixante'], ['soixante et un'], ['soixante-deux'], ['soixante-trois'], ['soixante-quatre'], ['soixante-cinq'], ['soixante-six'], ['soixante-sept'], ['soixante-huit'], ['soixante-neuf'],
    ['soixante-dix', 'septante'], ['soixante et onze', 'septante et un'], ['soixante-douze', 'septante-deux'], ['soixante-treize', 'septante-trois'],
    ['soixante-quatorze', 'septante-quatre'], ['soixante-quinze', 'septante-cinq'], ['soixante-seize', 'septante-six'], ['soixante-dix-sept', 'septante-sept'],
    ['soixante-dix-huit', 'septante-huit'], ['soixante-dix-neuf', 'septante-neuf'],
    ['quatre-vingts'], ['quatre-vingt-un'], ['quatre-vingt-deux'], ['quatre-vingt-trois'], ['quatre-vingt-quatre'], ['quatre-vingt-cinq'], ['quatre-vingt-six'],
    ['quatre-vingt-sept'], ['quatre-vingt-huit'], ['quatre-vingt-neuf'],
    ['quatre-vingt-dix', 'nonante'], ['quatre-vingt-onze', 'nonante et un'], ['quatre-vingt-douze', 'nonante-deux'], ['quatre-vingt-treize', 'nonante-trois'],
    ['quatre-vingt-quatorze', 'nonante-quatre'], ['quatre-vingt-quinze', 'nonante-cinq'], ['quatre-vingt-seize', 'nonante-six'], ['quatre-vingt-dix-sept', 'nonante-sept'],
    ['quatre-vingt-dix-huit', 'nonante-huit'], ['quatre-vingt-dix-neuf', 'nonante-neuf'],
    ['cent'],
];

const seeded = (seed: number) => mulberry32(seed * 7919 + 13);
const valueOf = (word: string): number => TABLE.findIndex(t => t.includes(word));
const isBelgian = (word: string) => TABLE.some(t => t[1] === word);
const isFrench70or90 = (word: string) => TABLE.some(t => t.length === 2 && t[0] === word);

describe('the number table', () => {
    test('0 to 100 exactly as written, both forms where Belgium differs', () => {
        expect(TABLE).toHaveLength(101);
        for (let n = 0; n <= 100; n++) {
            expect(frenchNumber(n, 'fr'), String(n)).toBe(TABLE[n][0]);
            expect(frenchNumber(n, 'be'), String(n)).toBe(TABLE[n][1] ?? TABLE[n][0]);
        }
        expect(() => frenchNumber(101)).toThrow();
    });

    test('the lists: 0 to 20, the tens, 0 to 100; the pairs carry the Belgian form as alt', () => {
        expect(GETALLEN_20.pairs.map(p => p.nl)).toEqual(Array.from({ length: 21 }, (_, i) => String(i)));
        expect(TIENTALLEN.pairs.map(p => p.nl)).toEqual(['10', '20', '30', '40', '50', '60', '70', '80', '90', '100']);
        expect(GETALLEN_100.pairs).toHaveLength(101);
        const p = (n: number): WordPair => GETALLEN_100.pairs[n];
        expect(p(72)).toEqual({ fr: 'soixante-douze', nl: '72', alt: 'septante-deux' });
        expect(p(80)).toEqual({ fr: 'quatre-vingts', nl: '80' });
        expect(TIENTALLEN.pairs.filter(x => x.alt).map(x => x.nl)).toEqual(['70', '90']);
    });
});

describe('the number questions', () => {
    const lists = ['getallen20', 'tientallen', 'getallen100'];

    test('six distinct choices with the answer, one form per question, never both forms of a number', () => {
        for (const list of lists) for (const dir of ['fr-nl', 'nl-fr', 'mix'] as const) {
            const forms = new Set<boolean>();
            for (let seed = 1; seed < 400; seed++) {
                const ex = makeWordExercise({ lists: [list], dir }, seeded(seed))!;
                expect(ex.choices).toHaveLength(6);
                expect(new Set(ex.choices).size).toBe(6);
                expect(ex.choices).toContain(ex.answer);
                const n = Number(ex.dir === 'fr-nl' ? ex.answer : ex.shown);
                const word = ex.dir === 'fr-nl' ? ex.shown : ex.answer;
                expect(valueOf(word)).toBe(n);
                if (ex.dir === 'nl-fr') {
                    // Every choice a number word of the list, all in the question's own form.
                    const values = ex.choices.map(valueOf);
                    expect(values.every(v => v >= 0)).toBe(true);
                    expect(new Set(values).size).toBe(6);
                    for (const c of ex.choices) expect(ex.be ? !isFrench70or90(c) : !isBelgian(c), `${c} in a ${ex.be ? 'be' : 'fr'} question`).toBe(true);
                } else {
                    for (const c of ex.choices) expect(c).toMatch(/^\d+$/);
                    expect(ex.be ? !isFrench70or90(ex.shown) : !isBelgian(ex.shown)).toBe(true);
                }
                if (TABLE[n].length === 2) forms.add(!!ex.be);
            }
            if (list !== 'getallen20') expect([...forms].sort()).toEqual([false, true]);
        }
    });

    test('distractors close to the answer: 17 brings its traps, 72 its neighbours and tens', () => {
        for (let seed = 1; seed < 100; seed++) {
            const ex = makeWordExercise({ lists: ['getallen100'], dir: 'fr-nl' }, seeded(seed))!;
            const n = Number(ex.answer);
            const others = ex.choices.map(Number).filter(v => v !== n);
            // Every distractor within its tens, a ten away, or a named trap (17 / 70, 77 / 17, 27 / 72).
            for (const v of others) {
                const near = Math.abs(v - n) <= 10 || Math.floor(v / 10) === Math.floor(n / 10) || v % 10 === n % 10
                    || (v % 10 === Math.floor(n / 10) && Math.floor(v / 10) === n % 10) || [60, 70, 80, 90].includes(v) || (v >= 10 && v < 20);
                expect(near, `${v} for ${n}`).toBe(true);
            }
        }
        // 17 asked in French: at least two of its traps among the choices.
        let tested = 0;
        for (let seed = 1; seed < 4000 && tested < 5; seed++) {
            const ex = makeWordExercise({ lists: ['getallen100'], dir: 'nl-fr' }, seeded(seed))!;
            if (ex.shown !== '17') continue;
            tested++;
            const traps = [7, 27, 70, 71, 77, 97].map(v => frenchNumber(v, ex.be ? 'be' : 'fr'));
            expect(ex.choices.filter(c => traps.includes(c)).length).toBeGreaterThanOrEqual(2);
        }
        expect(tested).toBe(5);
    });

    test('the explanation names the other form; the help shows the tens', () => {
        const ex: WordExercise = { list: 'getallen100', index: 72, dir: 'nl-fr', shown: '72', answer: 'soixante-douze', choices: [] };
        expect(pairLine(ex)).toBe('72 = soixante-douze');
        expect(otherFormLine(ex)).toBe('In België ook: septante-deux.');
        expect(otherFormLine({ ...ex, be: true, answer: 'septante-deux' })).toBe('In Frankrijk: soixante-douze.');
        expect(otherFormLine({ ...ex, index: 14, shown: '14', answer: 'quatorze' })).toBeNull();
        expect(tableOf(ex)).toEqual(Array.from({ length: 10 }, (_, i) => `${70 + i} = ${TABLE[70 + i][0]}`));
        expect(tableOf({ ...ex, be: true })[2]).toBe('72 = septante-deux');
        expect(tableOf({ ...ex, index: 100, shown: '100', answer: 'cent' })).toHaveLength(11);
        expect(tableOf({ ...ex, list: 'getallen20', index: 20, shown: '20', answer: 'vingt' })).toHaveLength(11);
    });

    test('the longest words: tot 20 fits the present belt, tot 100 only the wide games', () => {
        expect(wordChoiceChars({ lists: ['getallen20'], dir: 'nl-fr' })).toBe(8);
        expect(wordChoiceChars({ lists: ['getallen100'], dir: 'nl-fr' })).toBe('quatre-vingt-dix-sept'.length);
    });
});

const st = () => useOefenStore.getState();
const cur = () => st().shown!.exercise as WordExercise;
const choiceOf = (topic: string, label: string): ZelfChoice => FRANS_ZELF.choices(5, topic).find(c => c.label.replace(/\s/g, ' ') === label)!;

describe('numbers through the kiosk', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null, missed: [] }); });
    afterEach(() => { vi.useRealTimers(); });

    test('the cards and their ways', () => {
        for (const t of ['frans:getallen-20', 'frans:tientallen', 'frans:getallen-100']) {
            expect(FRANS_ZELF.choices(5, t).map(c => c.label.replace(/\s/g, ' '))).toEqual(['Cijfer → Frans', 'Frans → cijfer', 'Door elkaar']);
        }
    });

    test('a fout shows the pair and the other form', () => {
        vi.useFakeTimers();
        // Seeded until a 70s or 90s number comes up.
        for (let seed = 0; seed < 60; seed++) {
            resetKiosk();
            st().openZelf(buildZelfSessie(choiceOf('frans:tientallen', 'Cijfer → Frans'), { kind: 'count', n: 3 }, seed, 5));
            const ex = cur();
            if (!['70', '90'].includes(ex.shown)) continue;
            st().choose(currentInput(st().sessie, st().shown)!.choices.find(c => c !== ex.answer)!);
            st().answer();
            expect(st().feedbackHint).toBe(flashLine(ex));
            expect(flashLine(ex)).toBe(ex.be ? `${ex.shown} = ${ex.answer} (in Frankrijk: ${TABLE[Number(ex.shown)][0]})` : `${ex.shown} = ${ex.answer} (in België ook: ${TABLE[Number(ex.shown)][1]})`);
            expect(st().stepsOffer!.map(l => stepLineText(l, String))).toEqual([pairLine(ex), otherFormLine(ex)]);
            return;
        }
        throw new Error('no 70 or 90 drawn');
    });
});

const sp = () => useSpelStore.getState();
const start = (choice: ZelfChoice, id: string): SpelStart => ({ choice, grade: 5, topicId: 'frans:getallen-100', meta: skinById(id)!.meta, now: 1_000_000 });

describe('numbers in the games', () => {
    beforeEach(() => { resetKiosk(); useOefenStore.setState({ fixed: null }); sp().otherGame(); });

    test('Frans → cijfer is a number: the keypad games take it as typed; Cijfer → Frans plays the word games', () => {
        const ids = (topic: string, label: string) => skinsFor(SKINS, spelContentOf(choiceOf(topic, label), 5)!).map(s => s.meta.id);
        for (const t of ['frans:getallen-20', 'frans:tientallen', 'frans:getallen-100']) for (const c of FRANS_ZELF.choices(5, t)) expect(choiceCanPlay(c, 5)).toBe(true);
        expect(spelContentOf(choiceOf('frans:getallen-100', 'Frans → cijfer'), 5)).toMatchObject({ kind: 'number', digitsOnly: true, answerChars: 3 });
        const typed = ids('frans:getallen-100', 'Frans → cijfer');
        expect(typed).toEqual(expect.arrayContaining(['pinguintoren', 'ballonnen', 'hartjes']));
        const words = ids('frans:getallen-100', 'Cijfer → Frans');
        expect(words).toEqual(expect.arrayContaining(['ballonnen', 'hartjes']));
        expect(ids('frans:getallen-20', 'Cijfer → Frans')).toContain('pakjesband');
        // The choice pad: the short words to 20 on the keypad games, the long ones to 100 only in the tap games.
        const pin = skinById('pinguintoren')!.meta;
        expect(padRoundOf(pin, { choice: choiceOf('frans:getallen-20', 'Cijfer → Frans'), grade: 5 })).toBe(true);
        expect(padRoundOf(pin, { choice: choiceOf('frans:getallen-100', 'Cijfer → Frans'), grade: 5 })).toBe(false);
        expect(padRoundOf(pin, { choice: choiceOf('frans:getallen-100', 'Frans → cijfer'), grade: 5 })).toBe(false);
    });

    test('a keypad round: "soixante-douze = ?" on the sign, the typed number checked', () => {
        sp().start(start(choiceOf('frans:getallen-100', 'Frans → cijfer'), 'pinguintoren'));
        const q = sp().question!;
        const ex = q.exercise as WordExercise;
        expect(q.kind).toBe('number');
        expect(q.text).toBe(`${ex.shown} = ?`);
        expect(q.answer).toBe(ex.answer);
        sp().answer(String(Number(ex.answer) + 1));
        expect(sp().phase).toBe('wrong');
        sp().next();
        sp().answer(sp().question!.answer);
        expect(sp().phase).toBe('right');
    });

    test('memory boards: a number and its word, one number once', () => {
        sp().start(start(choiceOf('frans:getallen-100', 'Door elkaar'), 'hartjes'));
        const s = sp().sessie!;
        const round = skinById('hartjes')!.meta.round.board!;
        for (let i = 0; i < 10; i++) {
            const board = nextBoardOf(s, round, null, [], undefined, Math.random)!;
            const ids = board.cells.map(c => (c.question.exercise as WordExercise).index);
            expect(new Set(ids).size).toBe(ids.length);
            for (const c of board.cells) expect(c.question.pair!.answer.text).toBe((c.question.exercise as WordExercise).answer);
        }
    });
});
