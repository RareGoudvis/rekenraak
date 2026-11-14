// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { spelSessieOf, useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import type { SpelEventName } from '../oefenen/spelen/events';
import { resetKiosk } from './helpers/oefenKiosk';
import { stepsFor } from '../services/stepsAvailability';

// The Spelen session: one try per question, a wrong answer is logged, "Hoe los ik dit op?" pauses
// and counts as met hulp, and Nakijken replays exactly the logged mistakes in the Oefenen kiosk.

const BALLONNEN: SkinMeta = { id: 'ballonnen', label: 'Ballonnen', input: 'choice', timed: false, round: { questions: 20 } };
const TIMED: SkinMeta = { id: 'klok', label: 'Op tijd', input: 'keypad', timed: true, round: { seconds: 60 } };

let data: EenvoudigData;
let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const kiosk = () => useOefenStore.getState();
const startWith = (meta: SkinMeta, now = 1_000_000): SpelStart => ({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta, now });
const wrongOf = (answer: string) => String(Number(answer) + 1);
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

beforeAll(async () => {
    data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});

beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    useSpelStore.getState().otherGame();
    log.length = 0;
    for (const name of ['correct', 'wrong', 'help', 'streak', 'timeUp', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
});
afterEach(() => { offs.splice(0).forEach(off => off()); vi.useRealTimers(); });

describe('Spelen session', () => {
    test('a game asks the same sums as Oefenen: the session types are the choice unchanged', () => {
        const oefen = buildZelfSessie(choice, { kind: 'count', n: 10 }, 0, 2);
        const spel = spelSessieOf({ ...startWith(BALLONNEN), now: 0 });
        expect(spel.types).toEqual(oefen.types);
        expect(spel.total).toBe(20);
        expect(spel.timerMin).toBeUndefined();
        expect(spel.noSteps).toBeUndefined();
    });

    test('right, wrong, one try, streaks and the events', () => {
        sp().start(startWith(BALLONNEN));
        const q1 = sp().question!;
        expect(sp().phase).toBe('play');
        expect(q1.choices).toHaveLength(4);
        expect(q1.choices).toContain(q1.answer);
        sp().answer(q1.answer);
        expect(sp().phase).toBe('right');
        expect(sp().score).toBe(1);
        expect(sp().streak).toBe(1);
        // One try: a second tap during the flash does nothing.
        sp().answer(wrongOf(q1.answer));
        expect(sp().history).toHaveLength(1);
        sp().next();
        const q2 = sp().question!;
        expect(q2.key).not.toBe(q1.key);
        sp().answer(wrongOf(q2.answer));
        expect(sp().phase).toBe('wrong');
        expect(sp().feedback).toEqual({ given: wrongOf(q2.answer), expected: q2.answer, correct: false });
        expect(sp().streak).toBe(0);
        expect(sp().bestStreak).toBe(1);
        expect(sp().mistakes.map(m => m.question.key)).toEqual([q2.key]);
        expect(log.map(e => e.name)).toEqual(['correct', 'streak', 'wrong', 'streak']);
        expect(log[1].payload).toEqual({ count: 1 });
    });

    test('the flash moves on by itself; no lives: many wrong answers never end the round early', () => {
        vi.useFakeTimers();
        sp().start(startWith(BALLONNEN));
        for (let i = 0; i < 10; i++) {
            sp().answer(wrongOf(sp().question!.answer));
            vi.advanceTimersByTime(2000);
        }
        expect(sp().phase).toBe('play');
        expect(sp().mistakes).toHaveLength(10);
    });

    test('Hoe los ik dit op? pauses with the steps and counts the question as met hulp', () => {
        sp().start(startWith(BALLONNEN));
        const q = sp().question!;
        sp().openHelp();
        expect(sp().phase).toBe('help');
        expect(sp().help?.lines).toEqual(stepsFor(sp().sessie!.types[q.slot].typeId, q.exercise, q.constraints));
        // Paused: no answer goes in.
        sp().answer(q.answer);
        expect(sp().history).toHaveLength(0);
        sp().closeHelp();
        expect(sp().phase).toBe('play');
        expect(sp().question).toBe(q);
        sp().answer(wrongOf(q.answer));
        expect(sp().helped).toBe(1);
        expect(sp().mistakes).toHaveLength(0);
        expect(sp().score).toBe(0);
        expect(log.map(e => e.name)).toEqual(['help', 'wrong']);
        // A helped right answer is no point either, and leaves the streak alone.
        sp().next();
        sp().answer(sp().question!.answer);
        sp().next();
        sp().openHelp(); sp().closeHelp();
        sp().answer(sp().question!.answer);
        expect(sp().score).toBe(1);
        expect(sp().streak).toBe(1);
        expect(sp().helped).toBe(2);
    });

    test('20 questions end the round; the end event carries the numbers', () => {
        sp().start(startWith(BALLONNEN));
        for (let i = 0; i < 20; i++) {
            const q = sp().question!;
            if (i === 4) { sp().openHelp(); sp().closeHelp(); }
            sp().answer(i % 5 === 1 ? wrongOf(q.answer) : q.answer);
            sp().next();
        }
        expect(sp().phase).toBe('end');
        expect(sp().history).toHaveLength(20);
        expect(log.at(-1)).toEqual({ name: 'end', payload: { score: 15, bestStreak: 4, mistakes: 4, helped: 1 } });
    });

    test('a timed round: the clock stops while paused, then time up ends it', () => {
        const t0 = 1_000_000;
        sp().start(startWith(TIMED, t0));
        expect(sp().sessie!.total).toBeUndefined();
        sp().openHelp(t0 + 10_000);
        sp().tick(t0 + 200_000);
        expect(sp().phase).toBe('help');
        sp().closeHelp(t0 + 100_000);
        expect(sp().endsAt).toBe(t0 + 150_000);
        sp().tick(t0 + 149_000);
        expect(sp().phase).toBe('play');
        sp().tick(t0 + 150_000);
        expect(sp().phase).toBe('end');
        expect(log.map(e => e.name)).toEqual(['help', 'timeUp', 'end']);
    });

    test('Nakijken replays exactly the mistakes, same numbers, in the Oefenen kiosk with steps after a fout', () => {
        sp().start(startWith(BALLONNEN));
        for (let i = 0; i < 20; i++) {
            const q = sp().question!;
            sp().answer([3, 8, 15].includes(i) ? wrongOf(q.answer) : q.answer);
            sp().next();
        }
        const mistakes = sp().mistakes.map(m => m.question);
        expect(mistakes).toHaveLength(3);
        sp().nakijken();
        expect(sp().phase).toBe('idle');
        expect(kiosk().sessie!.title).toBe('Nakijken');
        expect(kiosk().sessie!.total).toBe(3);
        expect(kiosk().sessie!.id).toMatch(/^zelf-/);
        for (const [i, q] of mistakes.entries()) {
            expect(kiosk().phase).toBe('exercise');
            expect(kiosk().shown!.exerciseKey).toBe(q.key);
            expect(kiosk().shown!.exercise).toEqual(q.exercise);
            kiosk().setField(0, i === 0 ? wrongOf(q.answer) : q.answer);
            kiosk().answer();
            // The existing steps after a fout, where the sum has them (47 + 8 has none yet).
            const steps = stepsFor(kiosk().sessie!.types[q.slot].typeId, q.exercise, q.constraints);
            expect(kiosk().stepsOffer).toEqual(i === 0 ? steps : null);
            if (i === 0 && steps) { kiosk().skipFlash(); expect(kiosk().phase).toBe('steps'); }
            kiosk().next();
        }
        expect(kiosk().phase).toBe('locked');
        expect(kiosk().run!.stats.history.map(h => h.exerciseKey)).toEqual(mistakes.map(q => q.key));
    });

    test('a review sum with steps waits on the steps panel after the fout', () => {
        sp().start(startWith(BALLONNEN));
        const q = sp().question!;
        const exercise = { id: 'r1', operands: [47, 25], operator: '+', answer: 72, isManuallyEdited: false, missingTerm: 'result' };
        useOefenStore.getState().openReview({ ...sp().sessie!, title: 'Nakijken', total: 1 }, [{ slot: q.slot, exercise, exerciseKey: 'r1', constraints: q.constraints }]);
        kiosk().setField(0, '62');
        kiosk().answer();
        expect(kiosk().stepsOffer?.length).toBeGreaterThan(0);
        kiosk().skipFlash();
        expect(kiosk().phase).toBe('steps');
        kiosk().next();
        expect(kiosk().phase).toBe('locked');
    });

    test('Oefenen is unchanged after a review: a normal zelf run draws from the scheduler again', () => {
        sp().start(startWith(BALLONNEN));
        sp().answer(wrongOf(sp().question!.answer));
        for (let i = 1; i < 20; i++) { sp().next(); sp().answer(sp().question!.answer); }
        sp().next();
        sp().nakijken();
        expect(kiosk().fixed).toHaveLength(1);
        kiosk().openZelf(buildZelfSessie(choice, { kind: 'count', n: 5 }, 0, 2));
        expect(kiosk().fixed).toBeNull();
        for (let i = 0; i < 5; i++) {
            expect(kiosk().phase).toBe('exercise');
            kiosk().setField(0, '0'); kiosk().answer(); kiosk().next();
        }
        expect(kiosk().phase).toBe('locked');
        expect(kiosk().run!.stats.history).toHaveLength(5);
    });

    test('Ander spel and Terug reopen the picker on this choice', () => {
        sp().start(startWith(BALLONNEN));
        sp().otherGame();
        expect(sp().phase).toBe('idle');
        expect(sp().takePickerAt()?.choice.key).toBe(choice.key);
        expect(sp().takePickerAt()).toBeNull();
    });
});
