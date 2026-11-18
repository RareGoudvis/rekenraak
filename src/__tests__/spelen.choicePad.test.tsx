// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import type { Leerjaar } from '../config/gradePresets';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { PAD_CHOICES, PAD_MAX_WORD_CHARS, PAD_PICTURE_CHOICES, padPlays, skinsFor } from '../oefenen/spelen/accepts';
import { padRoundOf, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, wrongChoiceOf } from '../oefenen/spelen/duel/rules';
import SpelChoicePad from '../oefenen/spelen/SpelChoicePad';
import SpelKeypad from '../oefenen/spelen/SpelKeypad';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import Touwtrekken from '../oefenen/spelen/skins/touwtrekken/Touwtrekken';
import { FRANS_ZELF } from '../talen/frans/fransZelf';
import { fransWordChars } from '../talen/frans/fransPack';
import type { FransExercise } from '../talen/frans/questions';
import { useOefenStore } from '../oefenen/useOefenStore';
import { resetKiosk } from './helpers/oefenKiosk';

// The choice pad (owner 2026-11-18): a keypad game on word choices (Frans) swaps its keypad for the exercise's own
// choices as big buttons; numbers keep the keypad exactly as it was.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    useSpelStore.getState().otherGame();
    // jsdom has no matchMedia; the shell reads the upright phone through it.
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); useDuelStore.getState().stop(); });

const sp = () => useSpelStore.getState();
const du = () => useDuelStore.getState();
const frans = (topic: string, label: string): ZelfChoice => FRANS_ZELF.choices(5, topic).find(c => c.label === label)!;
const allFrans = () => ([5, 6] as Leerjaar[]).flatMap(g => FRANS_ZELF.topics.flatMap(t => FRANS_ZELF.choices(g, t.id).map(c => ({ grade: g, topic: t.id, choice: c }))));
const KEYPAD = SKINS.filter(s => s.meta.input === 'keypad').map(s => s.meta.id);
// Every keypad game takes the pad but the digit lock: Schatkist builds its code from the answers' digits.
const PAD_GAMES = KEYPAD.filter(id => id !== 'schatkist');
const DUELS = SKINS.filter(s => s.meta.players === '1-2').map(s => s.meta.id);
const WHOLE = (): SpelFrom => {
    const c = choicesFor(data, 2 as Leerjaar, 'Hoofdrekenen · Optellen').find(x => x.label === 'Met brug')!;
    return { choice: c, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
};

describe('SpelChoicePad', () => {
    const CHOICES = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
    test('renders the six choices; a tap (pointerdown) is the answer; a keyboard click answers too', () => {
        const onAnswer = vi.fn();
        render(<SpelChoicePad choices={CHOICES} questionKey="q1" disabled={false} onAnswer={onAnswer} />);
        const pad = screen.getByRole('group', { name: 'Kies het antwoord' });
        expect(within(pad).getAllByRole('button').map(b => b.textContent)).toEqual(CHOICES);
        fireEvent.pointerDown(within(pad).getByRole('button', { name: 'avons' }));
        expect(onAnswer).toHaveBeenLastCalledWith('avons');
        // A mouse click after the pointerdown never answers twice.
        fireEvent.click(within(pad).getByRole('button', { name: 'avons' }), { detail: 1 });
        expect(onAnswer).toHaveBeenCalledOnce();
        fireEvent.click(within(pad).getByRole('button', { name: 'ont' }), { detail: 0 });
        expect(onAnswer).toHaveBeenLastCalledWith('ont');
    });

    test('disabled while flashing: no answer; the tapped choice struck through, the right one marked', () => {
        const onAnswer = vi.fn();
        const { rerender } = render(<SpelChoicePad choices={CHOICES} questionKey="q1" disabled onAnswer={onAnswer}
            feedback={{ given: 'as', expected: 'avons', correct: false }} />);
        const key = (name: string) => screen.getByRole('button', { name });
        fireEvent.pointerDown(key('ai'));
        expect(onAnswer).not.toHaveBeenCalled();
        expect(key('ai')).toHaveProperty('disabled', true);
        expect(key('as').className).toContain('is-wrong');
        expect(key('avons').className).toContain('is-answer');
        rerender(<SpelChoicePad choices={CHOICES} questionKey="q1" disabled onAnswer={onAnswer} feedback={{ given: 'avons', expected: 'avons', correct: true }} />);
        expect(key('avons').className).toContain('is-right');
        // The next question: nothing marked, every choice free.
        rerender(<SpelChoicePad choices={CHOICES} questionKey="q2" disabled={false} onAnswer={onAnswer} />);
        expect(screen.getAllByRole('button').every(b => !/is-(right|wrong|answer|picked)/.test(b.className) && !(b as HTMLButtonElement).disabled)).toBe(true);
    });
});

describe('which games take word choices', () => {
    test('Frans: every keypad game through the pad (Schatkist and the eggs stay out), the tap and memory games as before', () => {
        for (const { grade, choice } of allFrans()) {
            const content = spelContentOf(choice, grade)!;
            const ids = skinsFor(SKINS, content).map(s => s.meta.id);
            expect(ids, choice.key).toEqual(expect.arrayContaining([...PAD_GAMES, 'ballonnen', 'zeehond', 'mollen', 'hartjes']));
            expect(ids, choice.key).not.toContain('schatkist');
            expect(ids, choice.key).not.toContain('eieren');
            expect(ids, choice.key).not.toContain('honingraat');
            for (const id of PAD_GAMES) expect(padRoundOf(skinById(id)!.meta, { choice, grade }), `${id} ${choice.key}`).toBe(true);
        }
        expect(PAD_GAMES).toEqual(expect.arrayContaining([...DUELS, 'pinguintoren', 'zombies', 'bom', 'bever', 'race', 'voetbal', 'prent', 'kerstboom', 'frituur', 'aquarium']));
        expect(DUELS).toHaveLength(11);
    });

    test('every Frans word fits a pad button (PAD_MAX_WORD_CHARS)', () => {
        for (const { choice } of allFrans()) expect(fransWordChars(choice.vars[0]), choice.key).toBeLessThanOrEqual(PAD_MAX_WORD_CHARS);
    });

    test('the pad takes words, pictures and numbers to pick from; no numbers to type, no word past the button', () => {
        const pad = skinById('pinguintoren')!.meta.accepts;
        expect(padPlays(pad, { kind: 'choice', wordChars: 11 })).toBe(true);
        expect(padPlays(pad, { kind: 'choice', pictures: true })).toBe(true);
        expect(padPlays(pad, { kind: 'choice', answerChars: 4 })).toBe(false);
        // Het grootste getal: its numbers are the question's own, up to "1 000 000 000" on a button.
        expect(padPlays(pad, { kind: 'choice', answerChars: 10, padNumbers: true })).toBe(true);
        expect(padPlays(pad, { kind: 'choice', answerChars: 11, padNumbers: true })).toBe(false);
        expect(padPlays(pad, { kind: 'choice', wordChars: PAD_MAX_WORD_CHARS + 1 })).toBe(false);
        expect(padPlays(pad, { kind: 'number', digitsOnly: true })).toBe(false);
        expect(padPlays(skinById('schatkist')!.meta.accepts, { kind: 'choice', wordChars: 5 })).toBe(false);
        expect(padPlays(skinById('ballonnen')!.meta.accepts, { kind: 'choice', wordChars: 5 })).toBe(false);
    });

    test('maths unchanged: whole sums are no pad round, the keypad shows its digits and field', () => {
        const from = WHOLE();
        for (const id of KEYPAD) expect(padRoundOf(skinById(id)!.meta, from), id).toBe(false);
        sp().start({ ...from, meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
        expect(sp().pad).toBe(false);
        expect(sp().question!.choices).toHaveLength(4);
        render(<SpelKeypad questionKey={sp().question!.key} onAnswer={vi.fn()} />);
        expect(screen.getByLabelText('Jouw antwoord')).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
        expect(document.querySelector('.spel-pad')).toBeNull();
    });

    test('any word content plays on the pad, not only Frans: Groter of kleiner (< = >) in Bom', () => {
        const topic = 'Vergelijken, ordenen, afronden';
        const choice = choicesFor(data, 1 as Leerjaar, topic).find(x => x.label === 'Groter of kleiner')!;
        sp().start({ choice, grade: 1, topicId: topic, meta: skinById('bom')!.meta, now: Date.now() });
        expect(sp().pad).toBe(true);
        const q = sp().question!;
        expect([...q.choices].sort()).toEqual(['<', '=', '>']);
        render(<SpelKeypad questionKey={q.key} onAnswer={a => sp().answer(a)} />);
        act(() => { fireEvent.pointerDown(screen.getByRole('button', { name: q.views![q.choices.indexOf(q.answer)].label })); });
        expect(sp().phase).toBe('right');
    });
});

describe('pictures, symbols and numbers to pick on the pad', () => {
    const find = (g: number, topic: string, label: string) => choicesFor(data, g as Leerjaar, topic).find(x => x.label === label)!;

    test('Klok lezen and the breuken pictures: every pad game, four choices, the kiosk checks a tap, in a solo game and a duel', () => {
        for (const [g, topic, label] of [[1, 'Klok en kalender', 'Klok lezen'], [3, 'Klok en kalender', 'Wijzers tekenen'], [3, 'Breuken', 'Breuk in een figuur'], [4, 'Breuken', 'Breuken vergelijken']] as const) {
            const choice = find(g, topic, label);
            const ids = skinsFor(SKINS, spelContentOf(choice, g)!).map(s => s.meta.id);
            expect(ids, label).toEqual(expect.arrayContaining(PAD_GAMES));
            expect(ids).not.toContain('schatkist');
            sp().start({ choice, grade: g, topicId: topic, meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
            expect(sp().pad).toBe(true);
            // Four at most (a breuk comparison has its three < = >).
            expect(sp().question!.choices.length, label).toBeLessThanOrEqual(PAD_PICTURE_CHOICES);
            sp().answer(sp().question!.answer, 1_000_100);
            expect(sp().phase, label).toBe('right');
            const meta = resolveMeta(skinById('kasteel')!.meta, { spelers: '2' });
            du().begin({ meta, from: { choice, grade: g, topicId: topic }, rule: {}, config: { players: 2, level: 'makkelijk', lives: 5, bestOf: 1, stream: 'own', readyMs: 0 } });
            const l = du().sides.left.question!;
            expect(l.choices.length).toBeLessThanOrEqual(PAD_PICTURE_CHOICES);
            du().answer('left', l.choices.find(c => c !== l.answer)!);
            expect(du().sides.left.feedback!.correct).toBe(false);
            du().stop();
        }
    });

    test('a picture pad draws its faces on the keys, four of them, 2 × 2', () => {
        const choice = find(3, 'Klok en kalender', 'Wijzers tekenen');
        sp().start({ choice, grade: 3, topicId: 'Klok en kalender', meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
        const q = sp().question!;
        render(<SpelKeypad questionKey={q.key} onAnswer={a => sp().answer(a)} />);
        const pad = document.querySelector('.spel-pad')!;
        expect(pad.className).toContain('is-pictures');
        expect(pad.querySelectorAll('.spel-pad-key.is-picture svg.spel-klok')).toHaveLength(4);
        act(() => { fireEvent.pointerDown(screen.getByRole('button', { name: q.views![q.choices.indexOf(q.answer)].label })); });
        expect(sp().phase).toBe('right');
    });

    test('< = > on the pad: one row of three big symbols', () => {
        const choice = find(2, 'Vergelijken, ordenen, afronden', 'Groter of kleiner');
        sp().start({ choice, grade: 2, topicId: 'Vergelijken, ordenen, afronden', meta: skinById('pinguintoren')!.meta, now: 1_000_000 });
        render(<SpelKeypad questionKey={sp().question!.key} onAnswer={vi.fn()} />);
        const pad = document.querySelector('.spel-pad')!;
        expect(pad.className).toContain('is-symbols');
        expect([...pad.querySelectorAll('button')].map(b => b.textContent)).toEqual(['<', '=', '>']);
    });

    test('Grootste of kleinste: the numbers to pick from on the pad, to leerjaar 6 ("1 000 000 000" fits a key); a sum never', () => {
        for (const g of [1, 4, 6] as const) {
            const choice = find(g, 'Vergelijken, ordenen, afronden', 'Grootste of kleinste');
            expect(spelContentOf(choice, g)).toMatchObject({ kind: 'choice', padNumbers: true });
            expect(skinsFor(SKINS, spelContentOf(choice, g)!).map(s => s.meta.id), `leerjaar ${g}`).toEqual(expect.arrayContaining(PAD_GAMES));
            sp().start({ choice, grade: g, topicId: 'Vergelijken, ordenen, afronden', meta: skinById('bom')!.meta, now: 1_000_000 });
            expect(sp().pad).toBe(true);
            const q = sp().question!;
            const nums = (q.exercise as { numbers: number[] }).numbers;
            expect(q.choices.map(c => Number(c.replace(/\s/g, '').replace(',', '.'))).sort((a, b) => a - b)).toEqual([...new Set(nums)].sort((a, b) => a - b));
            // On the keys in the sheet's number font, as on the sign.
            const { unmount } = render(<SpelKeypad questionKey={q.key} onAnswer={vi.fn()} />);
            expect(document.querySelector('.spel-pad')!.className).toContain('is-numbers');
            unmount();
            sp().answer(q.answer, 1_000_100);
            expect(sp().phase).toBe('right');
        }
        expect(padRoundOf(skinById('bom')!.meta, WHOLE())).toBe(false);
    });
});

describe('every Frans card through every newly opened game', () => {
    test('solo games: six choices of the exercise\'s own, a right and a wrong answer checked by the kiosk', () => {
        const solo = PAD_GAMES.filter(id => !DUELS.includes(id));
        for (const { grade, topic, choice } of allFrans()) for (const id of solo) {
            sp().start({ choice, grade: grade as Leerjaar, topicId: topic, meta: skinById(id)!.meta, now: 1_000_000 });
            expect(sp().pad, id).toBe(true);
            const q = sp().question!;
            const ex = q.exercise as FransExercise;
            expect(q.choices, `${id} ${choice.key}`).toHaveLength(Math.min(PAD_CHOICES, ex.choices.length));
            expect([...q.choices].sort()).toEqual([...ex.choices].sort());
            sp().answer(q.choices.find(c => c !== q.answer)!, 1_000_100);
            expect(sp().phase).toBe('wrong');
            sp().next(1_000_200);
            sp().answer(sp().question!.answer, 1_000_300);
            expect(sp().phase, `${id} ${choice.key}`).toBe('right');
        }
    });

    test('duels: both sides get six choices; a right tap and a wrong tap; the bot misses with one of the choices', () => {
        for (const { grade, topic, choice } of allFrans()) for (const id of DUELS) {
            const meta = resolveMeta(skinById(id)!.meta, { spelers: '2' });
            du().begin({ meta, from: { choice, grade: grade as Leerjaar, topicId: topic }, rule: {}, config: { players: 2, level: 'makkelijk', lives: 5, bestOf: 1, stream: 'own', readyMs: 0 } });
            expect(du().pad, id).toBe(true);
            const l = du().sides.left.question!, r = du().sides.right.question!;
            expect(l.choices).toHaveLength(Math.min(PAD_CHOICES, (l.exercise as FransExercise).choices.length));
            expect(r.choices).toHaveLength(Math.min(PAD_CHOICES, (r.exercise as FransExercise).choices.length));
            du().answer('left', l.answer);
            du().answer('right', r.choices.find(c => c !== r.answer)!);
            expect(du().sides.left.feedback!.correct, `${id} ${choice.key}`).toBe(true);
            expect(du().sides.right.feedback!.correct).toBe(false);
            du().stop();
        }
        const q = { answer: 'avons', choices: ['ai', 'avons', 'ont'] };
        for (const x of [0, 0.4, 0.99]) expect(['ai', 'ont']).toContain(wrongChoiceOf(q, () => x));
    });
});

describe('playing through the pad', () => {
    test('a solo game (Pinguïntoren): the pad in the keypad\'s place, a tap answers, the flash marks it, Hoe los ik dit op? works', async () => {
        sp().start({ choice: frans('frans:avoir-etre', 'Eén werkwoord vervoegen'), grade: 5, topicId: 'frans:avoir-etre', meta: skinById('pinguintoren')!.meta, now: Date.now() });
        render(<SpelScreen />);
        const pad = await screen.findByRole('group', { name: 'Kies het antwoord' });
        expect(screen.queryByLabelText('Jouw antwoord')).toBeNull();
        const q = sp().question!;
        expect(within(pad).getAllByRole('button')).toHaveLength(q.choices.length);
        act(() => { fireEvent.pointerDown(within(pad).getByRole('button', { name: q.answer })); });
        expect(sp().phase).toBe('right');
        expect(within(pad).getByRole('button', { name: q.answer }).className).toContain('is-right');
        // The sign shows the word where the ? was.
        expect(document.querySelector('.pt-sign-answer')!.textContent).toBe(q.answer);
        act(() => { sp().next(); });
        const q2 = sp().question!;
        act(() => { fireEvent.pointerDown(within(screen.getByRole('group', { name: 'Kies het antwoord' })).getByRole('button', { name: q2.choices.find(c => c !== q2.answer)! })); });
        expect(sp().phase).toBe('wrong');
        expect(document.querySelector('.spel-pad-key.is-answer')!.textContent).toBe(q2.answer);
        act(() => { sp().next(); });
        fireEvent.click(screen.getByRole('button', { name: /Hoe los ik dit op/ }));
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(sp().help!.lines).toBeTruthy();
    });

    test('a duel (Touwtrekken, 2 spelers): a pad per half, both tap in the same tick', () => {
        vi.useFakeTimers();
        const from: SpelFrom = { choice: frans('frans:er', 'Alles samen'), grade: 5, topicId: 'frans:er' };
        render(<Touwtrekken meta={resolveMeta(skinById('touwtrekken')!.meta, { spelers: '2', levens: '5' })} from={from} onExit={vi.fn()} />);
        act(() => { vi.advanceTimersByTime(DUEL_TIMING.readyMs); });
        const blauw = screen.getByRole('group', { name: 'Keuzes Blauw' });
        const oranje = screen.getByRole('group', { name: 'Keuzes Oranje' });
        const l = du().sides.left.question!, r = du().sides.right.question!;
        expect(within(blauw).getAllByRole('button')).toHaveLength(l.choices.length);
        act(() => {
            fireEvent.pointerDown(within(blauw).getByRole('button', { name: l.answer }), { pointerId: 1, pointerType: 'touch' });
            fireEvent.pointerDown(within(oranje).getByRole('button', { name: r.choices.find(c => c !== r.answer)! }), { pointerId: 2, pointerType: 'touch' });
        });
        expect(du().sides.left.right).toBe(1);
        expect(du().sides.right.wrong).toBe(1);
        expect(screen.getByText('Trek!')).toBeTruthy();
        expect(within(oranje).getByRole('button', { name: r.answer }).className).toContain('is-answer');
        act(() => { vi.advanceTimersByTime(DUEL_TIMING.flashWrong); });
        expect(within(screen.getByRole('group', { name: 'Keuzes Oranje' })).getAllByRole('button').some(b => b.className.includes('is-'))).toBe(false);
    });

    test('a duel against the computer: one pad, the computer\'s miss is one of its choices', () => {
        vi.useFakeTimers();
        const from: SpelFrom = { choice: frans('frans:er', 'Alles samen'), grade: 5, topicId: 'frans:er' };
        render(<Touwtrekken meta={resolveMeta(skinById('touwtrekken')!.meta, { spelers: '1', niveau: 'makkelijk' })} from={from} onExit={vi.fn()} />);
        // Deterministic and always wrong: a draw of 0 is under every level's miss chance.
        useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0 } }));
        act(() => { vi.advanceTimersByTime(DUEL_TIMING.readyMs); });
        expect(screen.getByRole('group', { name: 'Keuzes Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Keuzes Computer' })).toBeNull();
        const r = du().sides.right.question!;
        for (let i = 0; i < 100 && !du().sides.right.feedback; i++) act(() => { vi.advanceTimersByTime(200); });
        const fb = du().sides.right.feedback!;
        expect(fb.correct).toBe(false);
        expect(r.choices.filter(c => c !== r.answer)).toContain(fb.given);
        // The computer's card shows the word it tapped.
        expect(document.querySelector('.duel-half.is-right')!.textContent).toContain(fb.given);
    });
});
