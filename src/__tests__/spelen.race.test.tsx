// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { createSpelEvents } from '../oefenen/spelen/events';
import type { SkinProps } from '../oefenen/spelen/skins/types';
import Race from '../oefenen/spelen/skins/race/Race';
import SpelEnd from '../oefenen/spelen/SpelEnd';
import { RACE, boostCar, brakeCar, drive, formatRaceTime, ghostAt, startCar, type RaceCar } from '../oefenen/spelen/skins/race/track';
import { RACE_RECORDS_KEY, loadBest, raceResult, saveIfBest, wipeRecords } from '../oefenen/spelen/skins/race/records';
import { resetKiosk } from './helpers/oefenKiosk';

// Race: the car's boost, turbo, brake and finish; the ghost record per card (try/catch storage) and
// "Wis mijn scores"; the skin's loop and its finish handing the result to the end screen.

const run = (c: RaceCar, sec: number, dt = 0.05) => { for (let t = 0; t < sec - 1e-9; t += dt) c = drive(c, dt); return c; };

describe('Race track', () => {
    test('on its own the car drives at base speed and always finishes', () => {
        const c = run(startCar(), 10);
        expect(c.x).toBeCloseTo(RACE.base * 10, 5);
        expect(c.t).toBeCloseTo(10, 5);
        expect(c.trace).toHaveLength(21);
        expect(c.trace[4]).toBe(Math.round(RACE.base * 2));
        const done = run(startCar(), RACE.length / RACE.base + 1, 0.25);
        expect(done.x).toBe(RACE.length);
        expect(done.finishedAt).toBeCloseTo(RACE.length / RACE.base, 3);
        // Past the line nothing moves any more.
        expect(drive(done, 0.2)).toBe(done);
    });

    test('a right answer boosts, five in a row is turbo, a mistake brakes and drops the boost', () => {
        const plain = run(boostCar(startCar(), 1), 3);
        expect(plain.x).toBeCloseTo(RACE.base * 3 + RACE.boost, 5);
        const turbo = run(boostCar(startCar(), RACE.turboAt), 3);
        expect(turbo.x).toBeCloseTo(RACE.base * 3 + RACE.turbo, 5);
        expect(RACE.turbo).toBeGreaterThan(RACE.boost);
        // A boost is handed out over about a second, not all at once.
        expect(drive(boostCar(startCar(), 1), 0.1).x).toBeCloseTo(RACE.base * 0.1 + RACE.boostRate * 0.1, 5);

        const braked = brakeCar(boostCar(startCar(), 1));
        expect(braked.boost).toBe(0);
        const stood = run(braked, 1.4);
        expect(stood.x).toBeCloseTo(0, 5);
        expect(stood.t).toBeCloseTo(1.4, 5);
        expect(run(stood, 1).x).toBeCloseTo(RACE.base, 5);
    });

    test('a long frame never jumps the car; the ghost follows its trace to the finish', () => {
        expect(drive(startCar(), 5).x).toBeCloseTo(RACE.base * RACE.maxDt, 5);
        const best = run(boostCar(startCar(), 1), RACE.length / RACE.base, 0.25);
        const ghost = { ms: best.finishedAt! * 1000, trace: best.trace };
        expect(ghostAt(ghost, 0)).toBe(0);
        expect(ghostAt(ghost, 0.25)).toBeCloseTo((best.trace[0] + best.trace[1]) / 2, 5);
        expect(ghostAt(ghost, best.finishedAt!)).toBe(RACE.length);
        expect(ghostAt(ghost, 9999)).toBe(RACE.length);
        const nearEnd = ghostAt(ghost, best.finishedAt! - 0.1);
        expect(nearEnd).toBeGreaterThan(best.trace[best.trace.length - 1] - 1);
        expect(nearEnd).toBeLessThan(RACE.length);
        expect(formatRaceTime(83_420)).toBe('1:23,4');
        expect(formatRaceTime(5_000)).toBe('0:05,0');
    });
});

describe('Race records', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    test('the best run per card: first, slower, faster; other cards untouched', () => {
        expect(loadBest('race:a')).toBeNull();
        expect(saveIfBest('race:a', { ms: 90_000, trace: [0, 1.6, 3.2] })).toEqual({ isNew: true, before: null });
        expect(loadBest('race:a')).toEqual({ ms: 90_000, trace: [0, 2, 3] });
        const slower = saveIfBest('race:a', { ms: 95_000, trace: [0] });
        expect(slower.isNew).toBe(false);
        expect(slower.before!.ms).toBe(90_000);
        expect(loadBest('race:a')!.ms).toBe(90_000);
        expect(saveIfBest('race:a', { ms: 80_000, trace: [0, 5] }).isNew).toBe(true);
        expect(loadBest('race:a')!.ms).toBe(80_000);
        expect(loadBest('race:b')).toBeNull();
        saveIfBest('race:b', { ms: 70_000, trace: [0] });
        expect(loadBest('race:a')!.ms).toBe(80_000);
    });

    test('the end line: a new record, the gap to the record', () => {
        const first = raceResult(83_400, { isNew: true, before: null });
        expect(first).toMatchObject({ title: 'Finish!', lead: 'Je tijd: 1:23,4', detail: 'Nieuw record!' });
        expect(raceResult(80_000, { isNew: true, before: { ms: 83_200, trace: [] } }).detail).toBe('Nieuw record! 3,2 s sneller dan je vorige record.');
        expect(raceResult(86_000, { isNew: false, before: { ms: 83_400, trace: [] } }).detail).toBe('Je record is 1:23,4. Nu 2,6 s trager.');
    });

    test('broken or blocked storage never throws: no ghost, the race still counts', () => {
        localStorage.setItem(RACE_RECORDS_KEY, '{not json');
        expect(loadBest('race:a')).toBeNull();
        localStorage.setItem(RACE_RECORDS_KEY, JSON.stringify({ 'race:a': { ms: 'x', trace: [] } }));
        expect(loadBest('race:a')).toBeNull();
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(loadBest('race:a')).toBeNull();
        expect(saveIfBest('race:a', { ms: 1000, trace: [0] })).toEqual({ isNew: true, before: null });
        expect(() => wipeRecords()).not.toThrow();
    });

    test('Wis mijn scores clears every card', () => {
        saveIfBest('race:a', { ms: 1000, trace: [0] });
        saveIfBest('race:b', { ms: 2000, trace: [0] });
        wipeRecords();
        expect(loadBest('race:a')).toBeNull();
        expect(loadBest('race:b')).toBeNull();
    });
});

describe('Race skin and session', () => {
    let choice: ZelfChoice;
    let frames: FrameRequestCallback[] = [];
    // Runs the queued animation frames at time t (ms).
    const frameAt = (t: number) => act(() => { const due = frames; frames = []; due.forEach(f => f(t)); });
    const sp = () => useSpelStore.getState();

    beforeAll(async () => {
        const data = await loadEenvoudigData();
        choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    });
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        frames = [];
        vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.push(f); return frames.length; });
        vi.stubGlobal('cancelAnimationFrame', () => { frames = []; });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

    const props = (over: Partial<SkinProps> = {}): SkinProps => ({
        question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), events: createSpelEvents(), reducedMotion: false,
        progress: { answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null },
        runKey: 'race:test', onFinish: vi.fn(), ...over,
    });
    const xOf = (c: HTMLElement) => Number((c.querySelector('.rc-root') as HTMLElement).dataset.x);

    test('the registry entry: a keypad game, no countdown, an unseen question cap', () => {
        const meta = skinById('race')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: false, round: { cap: 60 } });
        sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta });
        expect(sp().sessie!.total).toBeUndefined();
        for (let i = 0; i < 60; i++) { sp().answer('999'); sp().next(); }
        expect(sp().phase).toBe('end');
        expect(sp().history).toHaveLength(60);
        expect(sp().result).toBeNull();
    });

    test('finish() ends the round with the skin\'s result; the end screen shows it and wipes with two taps', () => {
        const meta = skinById('race')!.meta;
        sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta });
        sp().answer(sp().question!.answer);
        const wipe = vi.fn();
        sp().finish({ title: 'Finish!', lead: 'Je tijd: 1:23,4', detail: 'Nieuw record!', wipe });
        expect(sp().phase).toBe('end');
        // After the end, a second finish does nothing.
        sp().finish({ title: 'x', lead: 'y' });
        expect(sp().result!.title).toBe('Finish!');
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Finish!' })).toBeTruthy();
        expect(screen.getByText('Je tijd: 1:23,4')).toBeTruthy();
        expect(screen.getByText('Nieuw record!')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Wis mijn scores/ }));
        expect(wipe).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Ja, wissen' }));
        expect(wipe).toHaveBeenCalledOnce();
        expect(screen.getByText('Je scores zijn gewist.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Wis mijn scores/ })).toBeNull();
    });

    test('the loop: drives, boosts on correct, brakes on wrong, waits under help; the ghost from this card only', () => {
        const events = createSpelEvents();
        const { container, rerender } = render(<Race {...props({ events })} />);
        expect(container.querySelector('.rc-car.is-ghost')).toBeNull();
        frameAt(0);
        frameAt(1000);
        expect(xOf(container)).toBeCloseTo(RACE.base * RACE.maxDt, 1);
        act(() => events.emit('correct', { given: '12', streak: 1 }));
        expect(container.querySelector('.rc-car.is-me.is-boost')).not.toBeNull();
        const before = xOf(container);
        for (let t = 1100; t <= 2600; t += 100) frameAt(t);
        expect(xOf(container)).toBeCloseTo(before + RACE.base * 1.6 + RACE.boost, 0);
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(container.querySelector('.rc-car.is-me.is-brake')).not.toBeNull();
        const stopped = xOf(container);
        frameAt(2700); frameAt(2800);
        expect(xOf(container)).toBeCloseTo(stopped, 3);
        rerender(<Race {...props({ events, phase: 'help' })} />);
        for (let t = 2900; t <= 6000; t += 100) frameAt(t);
        expect(xOf(container)).toBeCloseTo(stopped, 3);
        expect(container.querySelector('.rc-root.is-paused')).not.toBeNull();
        // Turbo: a flame at 5 in a row.
        rerender(<Race {...props({ events, progress: { ...props().progress, streak: 5 } })} />);
        expect(container.querySelector('.rc-flame')).not.toBeNull();
        expect(screen.getByText('Turbo!')).toBeTruthy();
        cleanup();

        saveIfBest('race:other', { ms: 50_000, trace: [0] });
        const a = render(<Race {...props()} />);
        expect(a.container.querySelector('.rc-car.is-ghost')).toBeNull();
        a.unmount();
        saveIfBest('race:test', { ms: 60_000, trace: [0, 10, 20] });
        const b = render(<Race {...props()} />);
        expect(b.container.querySelector('.rc-car.is-ghost')).not.toBeNull();
        expect(b.container.querySelector('.rc-meter-dot.is-ghost')).not.toBeNull();
    });

    test('at the finish: the record is saved per card and onFinish gets the time after a short hold', () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const onFinish = vi.fn();
        const { container } = render(<Race {...props({ onFinish })} />);
        frameAt(0);
        let t = 0;
        while (!container.querySelector('.rc-root.is-done') && t < 400_000) { t += 250; frameAt(t); }
        expect(container.querySelector('.rc-root.is-done')).not.toBeNull();
        expect(screen.getByText('Finish!')).toBeTruthy();
        expect(onFinish).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(1500); });
        expect(onFinish).toHaveBeenCalledOnce();
        const res = onFinish.mock.calls[0][0];
        expect(res).toMatchObject({ title: 'Finish!', detail: 'Nieuw record!' });
        expect(res.lead).toBe(`Je tijd: ${formatRaceTime(loadBest('race:test')!.ms)}`);
        expect(loadBest('race:test')!.ms).toBeCloseTo((RACE.length / RACE.base) * 1000, -2);
        // The keypad is off once the car is over the line.
        expect((screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement).disabled).toBe(true);
    });
});
