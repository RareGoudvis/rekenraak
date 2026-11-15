// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../config/eenvoudig/nav';
import type { Leerjaar } from '../config/gradePresets';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { skinsFor } from '../oefenen/spelen/accepts';
import { canSubmit, keyOfKeyboard, typeKey } from '../oefenen/spelen/keypadInput';
import { choiceCanPlay, kioskAnswerOf, spelContentOf, spelKeysOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { useDuelStore } from '../oefenen/spelen/skins/touwtrekken/duelStore';
import SpelKeypad from '../oefenen/spelen/SpelKeypad';
import DuelKeypad from '../oefenen/spelen/skins/touwtrekken/DuelKeypad';

// The game keypads' comma and minus (round 4): shown from the round's content, typed by the kiosk's rules, checked with
// the kiosk's own normalisation, and the content gate that lets kommagetallen, geld and negatives into the keypad games.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); useDuelStore.getState().stop(); });

const choice = (g: number, topic: string, label: string): ZelfChoice => {
    const c = choicesFor(data, g as Leerjaar, topic).find(x => x.label === label);
    if (!c) throw new Error(`no choice ${g} ${topic} ${label}`);
    return c;
};
const KOMMA = [5, 'Hoofdrekenen · Vermenigvuldigen', 'Kommagetallen'] as const;
const MINUS = [4, 'Negatieve getallen', 'Terugtellen voorbij nul'] as const;
const GELD = [2, 'Geld', 'Geld teruggeven'] as const;
const WHOLE = [2, 'Hoofdrekenen · Optellen', 'Met brug'] as const;
const KEYPAD_GAMES = ['pinguintoren', 'zombies', 'bom', 'bever', 'race', 'voetbal', 'touwtrekken', 'kasteel'];
const sp = () => useSpelStore.getState();
const start = ([g, topic, label]: readonly [number, string, string], skin = 'pinguintoren') =>
    sp().start({ choice: choice(g, topic, label), grade: g as Leerjaar, topicId: topic, meta: skinById(skin)!.meta, now: 1_000_000 });
// The answer as a pupil types it: the comma for the point, the true minus.
const typed = (answer: string) => answer.replace('.', ',').replace('-', '−');

describe('typing rules', () => {
    test('digits; one comma ("0," first); a minus only in front; nothing past the cap', () => {
        const run = (keys: string, shown: readonly (',' | '-')[], max?: number) => [...keys].reduce((v, k) => typeKey(v, k === '<' ? 'back' : k, shown, max), '');
        expect(run('12,5', [','])).toBe('12,5');
        expect(run('1,2,5', [','])).toBe('1,25');
        expect(run(',5', [','])).toBe('0,5');
        expect(run('-3', ['-'])).toBe('-3');
        expect(run('3-', ['-'])).toBe('3');
        expect(run('--3', ['-'])).toBe('-3');
        expect(run('-,5', [',', '-'])).toBe('-0,5');
        expect(run('1,5', [])).toBe('15');
        expect(run('-3', [])).toBe('3');
        expect(run('12,5<<', [','])).toBe('12');
        expect(run('1234567890123', [','])).toBe('123456789012');
        expect(run('12345', [','], 4)).toBe('1234');
        expect(canSubmit('-')).toBe(false);
        expect(canSubmit('0,')).toBe(true);
        expect(canSubmit('')).toBe(false);
    });

    test('a physical keyboard: "," and "." type the comma, "-" the minus, only when the keypad shows them', () => {
        expect(keyOfKeyboard('.', [','])).toBe(',');
        expect(keyOfKeyboard(',', [','])).toBe(',');
        expect(keyOfKeyboard('-', ['-'])).toBe('-');
        expect(keyOfKeyboard('.', [])).toBeNull();
        expect(keyOfKeyboard('-', [','])).toBeNull();
        expect(keyOfKeyboard('7', [])).toBe('7');
        expect(keyOfKeyboard('a', [',', '-'])).toBeNull();
    });
});

describe('the content gate', () => {
    test('kommagetallen, geld and negatives play in every keypad game but the digit lock (and the eggs)', () => {
        for (const [spec, keys] of [[KOMMA, [',']], [GELD, [',']], [MINUS, ['-']]] as const) {
            const [g, t, l] = spec;
            const c = choice(g, t, l);
            expect(choiceCanPlay(c, g), l).toBe(true);
            const content = spelContentOf(c, g)!;
            expect(content, l).toMatchObject({ kind: 'number', keys });
            expect(content.digitsOnly, l).toBeUndefined();
            const ids = skinsFor(SKINS, content).map(s => s.meta.id);
            expect(ids, l).toEqual(expect.arrayContaining(KEYPAD_GAMES));
            expect(ids, l).not.toContain('schatkist');
            expect(ids, l).not.toContain('eieren');
            expect(spelKeysOf(c, g)).toEqual(keys);
        }
    });

    test('whole-number sums keep a digits-only keypad and every game they had', () => {
        const [g, t, l] = WHOLE;
        const c = choice(g, t, l);
        expect(spelKeysOf(c, g)).toEqual([]);
        expect(spelContentOf(c, g)).toMatchObject({ kind: 'number', digitsOnly: true });
        expect(skinsFor(SKINS, spelContentOf(c, g)!).map(s => s.meta.id)).toEqual(expect.arrayContaining(['schatkist', 'eieren', ...KEYPAD_GAMES]));
    });

    test('coverage: Zelf oefenen choices a keypad game plays, per leerjaar (11 / 25 / 36 / 27 / 30 / 28 before the comma and minus)', () => {
        const topics = EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => t.hasCards).map(t => t.id);
        const count = (g: number) => topics.flatMap(t => choicesFor(data, g as Leerjaar, t))
            .filter(c => choiceCanPlay(c, g) && skinsFor(SKINS, spelContentOf(c, g)!).some(s => s.meta.id === 'pinguintoren')).length;
        const floor = [11, 27, 38, 39, 43, 45];
        [1, 2, 3, 4, 5, 6].forEach((g, i) => expect(count(g), `leerjaar ${g}`).toBeGreaterThanOrEqual(floor[i]));
    });
});

describe('the answer check: the kiosk normalisation', () => {
    const checks = (q: SpelQuestion, given: string) => {
        const d = kioskFor(sp().sessie!.types[q.slot].typeId)!;
        return checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, given), sp().sessie!.types[q.slot].exactForm);
    };

    test('a kommagetal: 1,5 = 1,50 = 1.5; a wrong digit is wrong', () => {
        start(KOMMA);
        const q = sp().question!;
        expect(q.kind).toBe('number');
        const comma = typed(q.answer);
        for (const given of [comma, q.answer, comma.includes(',') ? `${comma}0` : `${comma},0`, ` ${comma} `]) expect(checks(q, given), given).toBe(true);
        expect(checks(q, typed(String(Number(q.answer) + 1)))).toBe(false);
    });

    test('geld: 5,5 and 5,50 reach the kiosk as its euro + cent fields', () => {
        start(GELD);
        const q = sp().question!;
        const euros = Number(q.answer);
        expect(checks(q, euros.toFixed(2).replace('.', ','))).toBe(true);
        expect(checks(q, typed(q.answer))).toBe(true);
        expect(checks(q, (euros + 0.01).toFixed(2).replace('.', ','))).toBe(false);
    });

    test('a negative answer: -3 and −3 both; 3 is not', () => {
        start(MINUS);
        let q = sp().question!;
        // Draw on (answering right) until the row asks a number below zero.
        for (let i = 0; i < 40 && Number(q.answer) >= 0; i++) {
            sp().answer(q.answer, 1_000_100 + i);
            sp().next(1_000_200 + i);
            q = sp().question!;
        }
        expect(Number(q.answer)).toBeLessThan(0);
        expect(checks(q, q.answer)).toBe(true);
        expect(checks(q, typed(q.answer))).toBe(true);
        expect(checks(q, q.answer.slice(1))).toBe(false);
    });
});

describe('SpelKeypad and DuelKeypad', () => {
    beforeEach(() => { sp().otherGame(); });

    test('the keys follow the round: "," for kommagetallen, "−" for negatives, digits only for whole sums', () => {
        for (const [spec, want] of [[KOMMA, [',']], [MINUS, ['−']], [WHOLE, []]] as const) {
            start(spec);
            const { unmount } = render(<SpelKeypad onAnswer={() => { }} questionKey="q1" />);
            const pad = screen.getByRole('group', { name: 'Cijfers' });
            const extra = within(pad).queryAllByRole('button').map(b => b.textContent).filter(t => t === ',' || t === '−');
            expect(extra, spec[2]).toEqual(want);
            unmount();
        }
    });

    test('a physical keyboard types the comma with "." and the minus with "-", Enter sends it', () => {
        start(KOMMA);
        const onAnswer = vi.fn();
        render(<SpelKeypad onAnswer={onAnswer} questionKey="q1" />);
        for (const k of ['1', '.', '2', ',', '5', '-']) act(() => { fireEvent.keyDown(window, { key: k }); });
        expect(screen.getByLabelText('Jouw antwoord').textContent).toBe('1,25');
        act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
        expect(onAnswer).toHaveBeenCalledWith('1,25');
        cleanup();
        start(MINUS);
        const onMinus = vi.fn();
        render(<SpelKeypad onAnswer={onMinus} questionKey="q2" />);
        for (const k of ['-', '4']) act(() => { fireEvent.keyDown(window, { key: k }); });
        expect(screen.getByLabelText('Jouw antwoord').textContent).toBe('−4');
        act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
        expect(onMinus).toHaveBeenCalledWith('−4');
    });

    test('Touwtrekken: both keypads get the round\'s comma, typed by pointer', () => {
        const [g, t, l] = KOMMA;
        useDuelStore.getState().setup({ meta: skinById('touwtrekken')!.meta, from: { choice: choice(g, t, l), grade: g as Leerjaar, topicId: t } });
        const onAnswer = vi.fn();
        render(<DuelKeypad label="Cijfers links" questionKey="d1" disabled={false} onAnswer={onAnswer} />);
        const pad = screen.getByRole('group', { name: 'Cijfers links' });
        const key = (k: string) => pad.querySelector<HTMLButtonElement>(`button[data-key="${k}"]`)!;
        expect(key(',')).toBeTruthy();
        expect(key('-')).toBeNull();
        for (const k of ['3', ',', ',', '7', 'ok']) fireEvent.pointerDown(key(k));
        expect(onAnswer).toHaveBeenCalledWith('3,7');
    });
});

describe('a kommagetal card in Pinguïntoren, end to end', () => {
    beforeEach(() => { sp().otherGame(); });

    test('typed on the keypad with the comma key: right climbs, wrong slides back, the flash shows a number', () => {
        start(KOMMA);
        const keypad = () => screen.getByRole('group', { name: 'Cijfers' });
        const press = (ch: string) => fireEvent.click(within(keypad()).getByRole('button', { name: ch === '<' ? 'Laatste teken wissen' : ch }));
        const answerBy = (value: string) => {
            const q = sp().question!;
            const { unmount } = render(<SpelKeypad onAnswer={g => sp().answer(g, 1_000_100)} questionKey={q.key} disabled={sp().phase !== 'play'} />);
            for (const ch of value) press(ch === '−' ? '−' : ch);
            fireEvent.click(within(keypad()).getByRole('button', { name: 'Controleer' }));
            unmount();
        };
        const q1 = sp().question!;
        expect(q1.kind).toBe('number');
        // With a trailing zero when it has a comma (1,50 for 1,5).
        const right = typed(q1.answer);
        answerBy(right.includes(',') ? `${right}0` : right);
        expect(sp().feedback).toMatchObject({ correct: true });
        expect(Number.isFinite(Number(sp().feedback!.expected))).toBe(true);
        expect(sp().climb).toBe(1);
        sp().next(1_000_200);
        const q2 = sp().question!;
        answerBy(typed(String(Number(q2.answer) + 1)));
        expect(sp().feedback).toMatchObject({ correct: false, expected: q2.answer });
        expect(sp().climb).toBe(0);
        expect(sp().mistakes).toHaveLength(1);
    });
});
