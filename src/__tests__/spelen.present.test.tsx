// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { setThousandsSeparator } from '../services/math/formatters';
import { answerTextOf, formatEuro, formatSpelNumber, rijFoldOf, rijText, signChunks, signFitOf, WRAP_CHARS } from '../oefenen/spelen/spelFormat';
import { SpelLine, SpelRij, SpelSign } from '../oefenen/spelen/SpelVisual';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { spelChoiceOf, spelQuestionOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import type { Leerjaar } from '../config/gradePresets';
import { buildZelfSessie, choicesFor } from '../oefenen/zelf/zelfSessie';
import { nextExercise } from '../services/oefenen/scheduler';
import { mulberry32 } from '../oefenen/spelen/distractors';

// How the games write values and question lines (owner 2026-11-15): Flemish notation, one helper for every shown
// answer, sign lines that wrap only between words, and a getallenrij as number tiles.

afterEach(() => { cleanup(); setThousandsSeparator(' '); useSpelStore.setState({ question: null }); });

describe('spelFormat', () => {
    test('numbers in sheet notation: true minus, decimal comma, thousands', () => {
        setThousandsSeparator(' ');
        expect(formatSpelNumber('-9')).toBe('−9');
        expect(formatSpelNumber('−9')).toBe('−9');
        expect(formatSpelNumber('1.5')).toBe('1,5');
        expect(formatSpelNumber('1,5')).toBe('1,5');
        expect(formatSpelNumber('12000')).toBe('12 000');
        expect(formatSpelNumber('-1234.25')).toBe('−1 234,25');
        expect(formatSpelNumber('0')).toBe('0');
        // Words and pictures' values pass as they are.
        expect(formatSpelNumber('half drie')).toBe('half drie');
        expect(formatSpelNumber('<')).toBe('<');
    });

    test('an amount keeps its cents', () => {
        expect(formatEuro('7.5')).toBe('7,50');
        expect(formatEuro('7,5')).toBe('7,50');
        expect(formatEuro('12')).toBe('12,00');
    });

    test('answerTextOf: the choice\'s own view, an amount with cents, else the number', () => {
        const money = { text: 'Je betaalt € 4,50 met € 10. Je krijgt € ? terug.', choices: ['5.5', '4.5'], views: [{ text: '5,50', label: '5,50' }, { text: '4,50', label: '4,50' }] };
        expect(answerTextOf(money, '5.5')).toBe('5,50');
        // Typed in another spelling, or not one of the choices: still with its cents.
        expect(answerTextOf(money, '5,5')).toBe('5,50');
        expect(answerTextOf(money, '6,5')).toBe('6,50');
        const minus = { text: '−3, −1, ?, 3', choices: ['1', '-1'], views: [{ text: '1', label: '1' }, { text: '−1', label: '−1' }] };
        expect(answerTextOf(minus, '-1')).toBe('−1');
        // No views (a plain sum; a keypad skin without the session): the number in sheet notation.
        expect(answerTextOf({ text: '9 − 18 = ?', choices: [] }, '-9')).toBe('−9');
        expect(answerTextOf(null, '2500')).toBe('2 500');
        expect(answerTextOf({ text: 'Hoe laat is het?', choices: ['a'], views: [{ text: 'half drie', label: 'half drie' }] }, 'a')).toBe('half drie');
        expect(answerTextOf(null, '')).toBe('');
    });

    test('sign lines wrap between words, never inside a sum, after € or between a number and its unit', () => {
        expect(signChunks('7 + 5 = ?')).toEqual(['7 + 5 = ?']);
        expect(signChunks('Je betaalt € 4,50 met € 10. Je krijgt € ? terug.')).toEqual(['Je', 'betaalt', '€ 4,50', 'met', '€ 10.', 'Je', 'krijgt', '€ ?', 'terug.']);
        expect(signChunks('Omtrek van een rechthoek van 6 cm bij 4 cm: ? cm')).toEqual(['Omtrek', 'van', 'een', 'rechthoek', 'van', '6 cm', 'bij', '4 cm: ? cm']);
        expect(signChunks('491 ≈ ? (op tiental)')).toEqual(['491 ≈ ?', '(op', 'tiental)']);
        expect(signChunks('Een hoek van 62° is een ?')).toEqual(['Een', 'hoek', 'van', '62°', 'is', 'een ?']);
    });

    test('a keypad sign fits the longer of the sum and the sum with its answer; a sentence wraps but never cuts its longest part', () => {
        expect(signFitOf({ text: '7 + 5 = ?' }, '12')).toEqual({ chars: 10, wrap: false });
        expect(signFitOf({ text: '4 000 000 + 2 000 000 = ?' }, '6 000 000').wrap).toBe(false);
        const long = signFitOf({ text: 'In 195 517 353 is de 5 bij de honderdduizendtallen ? waard' }, '500 000');
        expect(long.wrap).toBe(true);
        // "honderdduizendtallen 500 000" stays one part: the font fits it.
        expect(long.chars).toBeGreaterThanOrEqual('honderdduizendtallen 500 000'.length);
        expect(signFitOf({ text: 'Je betaalt € 4,50 met € 10. Je krijgt € ? terug.' }, '5,50')).toEqual({ chars: WRAP_CHARS, wrap: true });
        // A zombie's narrow sign: a long sum breaks before "=", a short one never.
        expect(signChunks('4 000 000 + 2 000 000 = ?'.replace(/(\d) (?=000)/g, '$1\u202F'), true)).toHaveLength(2);
        expect(signChunks('7 + 5 = ?', true)).toHaveLength(1);
        // A rij: its (first) row of tiles.
        expect(signFitOf({ text: '', visual: { kind: 'rij', items: ['2', '?', '4'] } }, '3').chars).toBe(11);
    });

    test('a rij folds by how much it holds; its line has no bars', () => {
        expect(rijFoldOf(['3', '4', '5', '6', '?', '8'])).toBe('one');
        expect(rijFoldOf(['18', '17', '16', '?', '14', '13'])).toBe('one');
        expect(rijFoldOf(['120', '130', '140', '?', '160', '170'])).toBe('fold');
        expect(rijFoldOf(['125 000', '130 000', '135 000', '?', '145 000', '150 000'])).toBe('two');
        expect(rijText(['3', '4', '?', '6'])).toBe('3, 4, ?, 6');
        // Kommagetallen take a semicolon, as in class ("0,5; 1; 1,5").
        expect(rijText(['0,5', '1', '?'])).toBe('0,5; 1; ?');
    });
});

describe('the shared sign', () => {
    test('a rij as tiles with one open tile, the answer in it on the flash', () => {
        const { container, rerender } = render(<SpelRij items={['3', '4', '5', '6', '?', '8']} />);
        const tiles = [...container.querySelectorAll('.spel-rij-tile')];
        expect(tiles.map(t => t.textContent)).toEqual(['3', '4', '5', '6', '?', '8']);
        expect(container.querySelectorAll('.spel-rij-tile.is-open')).toHaveLength(1);
        expect(container.querySelector('.spel-rij')!.getAttribute('aria-label')).toBe('3, 4, 5, 6, ?, 8');
        expect(container.querySelector('.spel-rij')!.className).toContain('is-one');
        rerender(<SpelRij items={['3', '4', '?']} answer={<b className="x-answer">5</b>} />);
        expect(container.querySelector('.spel-rij-tile.is-open.is-filled .x-answer')!.textContent).toBe('5');
    });

    test('SpelSign draws a rij question as tiles and fills the open one with the right answer', () => {
        const question = { key: 'r', text: '3, 4, ?, 6', visual: { kind: 'rij' as const, items: ['3', '4', '?', '6'] } };
        const { container } = render(<SpelSign question={question} feedback={{ expected: '5' }} flash choices={['5', '7']} answerClassName="pt-sign-answer" />);
        expect(container.querySelector('.spel-rij-tile.is-open .pt-sign-answer')!.textContent).toBe('5');
        // No bars, no line: only the tiles.
        expect(container.textContent).toBe('3456');
    });

    test('a keypad skin (no choices) shows the right answer as the session\'s question reads it', () => {
        const q = { key: 'k', text: 'Je betaalt € 4,50 met € 10. Je krijgt € ? terug.', choices: ['5.5', '4.5'], views: [{ text: '5,50', label: '5,50' }, { text: '4,50', label: '4,50' }] } as unknown as SpelQuestion;
        useSpelStore.setState({ question: q });
        const { container } = render(<SpelSign question={{ key: 'k', text: q.text }} feedback={{ expected: '5.5' }} flash answerClassName="a" />);
        expect(container.querySelector('.a')!.textContent).toBe('5,50');
        expect(container.textContent).toBe('Je betaalt € 4,50 met € 10. Je krijgt € 5,50 terug.');
        cleanup();
        // A negative answer gets the true minus, not "-9".
        const n = render(<SpelSign question={{ key: 'n', text: '−4 − 5 = ?' }} feedback={{ expected: '-9' }} flash answerClassName="a" />);
        expect(n.container.querySelector('.a')!.textContent).toBe('−9');
    });

    test('SpelLine keeps the text and puts each unbreakable part in its own nowrap chunk', () => {
        const { container } = render(<p><SpelLine text="Omtrek van een vierkant met zijden van 4 cm: ? cm" /></p>);
        expect(container.textContent).toBe('Omtrek van een vierkant met zijden van 4 cm: ? cm');
        expect([...container.querySelectorAll('.spel-line-chunk')].pop()!.textContent).toBe('4 cm: ? cm');
        // Words in the pupil font, numbers in the number font; a sum with units stays one chunk marked whole.
        expect(container.querySelector('.spel-line-chunk.is-word')!.textContent).toBe('Omtrek');
        cleanup();
        const t = render(<p><SpelLine text="? + 11 u 12 min = 20:43" /></p>);
        expect(t.container.querySelectorAll('.spel-line-chunk')).toHaveLength(1);
        expect(t.container.querySelector('.spel-line-chunk.is-whole')!.textContent).toBe('? + 11 u 12 min = 20:43');
    });
});

describe('the content behind the sign', () => {
    let data: EenvoudigData;
    beforeAll(async () => { data = await loadEenvoudigData(); });
    const questions = (grade: number, topic: string, label: string, n = 20) => {
        const c = choicesFor(data, grade as Leerjaar, topic).find(x => x.label === label)!;
        const s = buildZelfSessie(spelChoiceOf(c, grade), { kind: 'count', n: 10 }, 7, grade);
        const rng = mulberry32(grade);
        const out: SpelQuestion[] = [];
        for (let i = 0; i < n * 3 && out.length < n; i++) {
            const slot = i % s.types.length;
            const made = nextExercise(s, s.types[slot], new Set(), rng);
            const q = made && spelQuestionOf(s.types[slot], slot, made);
            if (q) out.push(q);
        }
        return out;
    };

    test('getallenrijen, patronen and veelvouden ask a row of tiles with one open place; the line has no bars or dashes', () => {
        const all = [
            ...questions(1, 'Tellen en getallenrijen', 'Tellen'), ...questions(3, 'Tellen en getallenrijen', 'Patronen'),
            ...questions(4, 'Deelbaarheid', 'Delers en veelvouden'),
        ];
        expect(all.length).toBeGreaterThan(30);
        for (const q of all) {
            expect(q.visual?.kind, q.text).toBe('rij');
            const items = (q.visual as { items: string[] }).items;
            expect(items.filter(x => x === '?'), q.text).toHaveLength(1);
            expect(q.text, q.text).toBe(rijText(items));
            expect(q.text, q.text).not.toMatch(/[|–]/);
        }
    });

    test('afronden at leerjaar 6 names the millions in words ("op miljard"), never the sheet shorthand 1MLD', () => {
        const qs = questions(6, 'Vergelijken, ordenen, afronden', 'Afronden', 60);
        expect(qs.length).toBeGreaterThan(20);
        for (const q of qs) expect(q.text, q.text).not.toMatch(/\(op \d+M(LD)?\)/);
    });

    test('schatten names the place in words, never the sheet letter', () => {
        for (const q of questions(3, 'Schatten en controleren', 'Schatten')) expect(q.text, q.text).toMatch(/\(op (tiental|honderdtal|duizendtal)\)$/);
    });
});
