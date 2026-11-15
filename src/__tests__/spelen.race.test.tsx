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
import { RACE, boostCar, drive, formatRaceTime, ghostAt, glideCar, resumeCar, startCar, stopCar, type RaceCar } from '../oefenen/spelen/skins/race/track';
import { RACE_KM_KEY, RACE_RECORDS_KEY, benzineResult, loadBest, loadBestKm, raceResult, saveIfBest, saveIfFarther, wipeRecords } from '../oefenen/spelen/skins/race/records';
import { FUEL, askLeft, formatKm, fuelRight, fuelStation, fuelTakesAnswers, fuelTick, fuelWrong, isStationQuestion, startFuel, stationAfter, stationProgress } from '../oefenen/spelen/skins/race/benzine';
import { BENZINE_SEGMENT, LANDS, gateOf, landOf, pinnedOf, raceModeOf, routeOf, segmentAt } from '../oefenen/spelen/skins/race/route';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { resetKiosk } from './helpers/oefenKiosk';

// Race: the car's boost, turbo, stop and finish; Benzine's cans, stations and kilometres; the landscapes; the ghost record per card (try/catch storage) and
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

    test('a right answer boosts, five in a row is turbo; a mistake stops the car until the next right answer', () => {
        const plain = run(boostCar(startCar(), 1), 3);
        expect(plain.x).toBeCloseTo(RACE.base * 3 + RACE.boost, 5);
        const turbo = run(boostCar(startCar(), RACE.turboAt), 3);
        expect(turbo.x).toBeCloseTo(RACE.base * 3 + RACE.turbo, 5);
        expect(RACE.turbo).toBeGreaterThan(RACE.boost);
        // A boost is handed out over most of a second, not all at once.
        expect(drive(boostCar(startCar(), 1), 0.1).x).toBeCloseTo(RACE.base * 0.1 + RACE.boostRate * 0.1, 5);

        const stopped = stopCar(boostCar(startCar(), 1));
        expect(stopped.boost).toBe(0);
        // Owner 2026-11-15: it stays stopped (the clock runs), it never restarts by itself.
        const later = run(stopped, 30);
        expect(later.x).toBeCloseTo(0, 5);
        expect(later.t).toBeCloseTo(30, 5);
        expect(later.stopped).toBe(true);
        const off = run(boostCar(later, 1), 3);
        expect(off.stopped).toBe(false);
        expect(off.x).toBeCloseTo(RACE.base * 3 + RACE.boost, 5);
        expect(run(resumeCar(later), 1).x).toBeCloseTo(RACE.base, 5);
    });

    test('a glide slows down to a stop exactly where it was told (the pump, an empty tank)', () => {
        const g = glideCar(boostCar(run(startCar(), 2), 1), 40, 1.5);
        expect(g.boost).toBe(0);
        const half = run(g, 0.75);
        // Ease-out: three quarters of the way at half the time.
        expect(half.x - g.x).toBeCloseTo(30, 0);
        const end = run(g, 3);
        expect(end.x).toBeCloseTo(g.x + 40, 5);
        expect(end.stopped).toBe(true);
        expect(end.glide).toBeNull();
        // No finish line in Benzine: the car drives past 1000 m.
        let far = startCar();
        for (let i = 0; i < 2000; i++) far = drive(far, 0.25, Infinity);
        expect(far.x).toBeGreaterThan(RACE.length);
        expect(far.finishedAt).toBeNull();
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
        progress: { answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null },
        runKey: 'race:test', onFinish: vi.fn(), onFail: vi.fn(), sound: vi.fn(), options: {}, ...over,
    });
    const xOf = (c: HTMLElement) => Number((c.querySelector('.rc-root') as HTMLElement).dataset.x);

    test('the registry entry: a keypad game, no countdown, an unseen question cap; Tijdrit or Benzine', () => {
        const meta = skinById('race')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: false, round: { cap: 60 }, canFail: true });
        expect(meta.options?.[0]).toMatchObject({ id: 'modus', default: 'tijdrit' });
        expect(resolveMeta(meta, { modus: 'benzine' }).round.cap).toBe(80);
        expect(raceModeOf({})).toBe('tijdrit');
        expect(raceModeOf({ modus: 'benzine' })).toBe('benzine');
        expect(skinById('race')!.Ending).toBeTruthy();
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
        // Stopped until the next right answer, however long that takes.
        for (let t = 2700; t <= 9000; t += 100) frameAt(t);
        expect(xOf(container)).toBeCloseTo(stopped, 3);
        rerender(<Race {...props({ events, phase: 'help' })} />);
        for (let t = 9100; t <= 12000; t += 100) frameAt(t);
        expect(xOf(container)).toBeCloseTo(stopped, 3);
        expect(container.querySelector('.rc-root.is-paused')).not.toBeNull();
        rerender(<Race {...props({ events })} />);
        act(() => events.emit('correct', { given: '12', streak: 1 }));
        for (let t = 12100; t <= 13000; t += 100) frameAt(t);
        expect(xOf(container)).toBeGreaterThan(stopped + 10);
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
    test('Benzine: a mistake costs a can and the car drives on; a station question is timed; an empty tank ends the round', () => {
        const events = createSpelEvents();
        const onMiss = vi.fn();
        const onFail = vi.fn();
        const onReport = vi.fn();
        const base = { events, onMiss, onFail, onReport, options: { modus: 'benzine' } };
        const { container, rerender } = render(<Race {...props(base)} />);
        const cans = () => screen.getByRole('img', { name: /jerrycans/ }).getAttribute('aria-label');
        expect(cans()).toBe('Nog 3 van 3 jerrycans benzine');
        expect(container.querySelector('.rc-meter')).toBeNull();
        expect(screen.getByText('0,00 km')).toBeTruthy();
        frameAt(0);
        for (let t = 100; t <= 2000; t += 100) frameAt(t);
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(cans()).toBe('Nog 2 van 3 jerrycans benzine');
        const x0 = xOf(container);
        for (let t = 2100; t <= 3000; t += 100) frameAt(t);
        expect(xOf(container)).toBeGreaterThan(x0);
        // Met hulp: a wrong answer after help costs nothing.
        act(() => events.emit('help', {}));
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(cans()).toBe('Nog 2 van 3 jerrycans benzine');

        // The 11th question (10 answered) is the station's.
        rerender(<Race {...props({ ...base, question: { key: 'q10', text: '8 + 6 = ?', index: 10 }, progress: { ...props().progress, answered: 10 } })} />);
        expect(screen.getByText('Tankstation!')).toBeTruthy();
        expect(screen.queryByText('8 + 6 = ?')).toBeNull();
        expect((screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement).disabled).toBe(true);
        let t = 3000;
        const until = (ms: number) => { const end = t + ms; while (t < end) { t += 100; frameAt(t); } };
        until(FUEL.pullMs);
        expect(screen.getAllByText('Maak je klaar!').length).toBeGreaterThan(0);
        until(FUEL.readyMs);
        expect(screen.getByText('8 + 6 = ?')).toBeTruthy();
        expect(screen.getByRole('timer', { name: 'Tijd aan de pomp' })).toBeTruthy();
        const atPump = xOf(container);
        until(FUEL.askMs - 500);
        expect(xOf(container)).toBeCloseTo(atPump, 3);
        expect(onMiss).not.toHaveBeenCalled();
        until(600);
        expect(onMiss).toHaveBeenCalledOnce();
        // The session turns the miss into a wrong answer: no refill, the car drives on.
        act(() => events.emit('wrong', { given: '', expected: '14' }));
        expect(cans()).toBe('Nog 2 van 3 jerrycans benzine');
        expect(screen.getByText('Te laat! Rij maar verder.')).toBeTruthy();
        until(1000);
        expect(xOf(container)).toBeGreaterThan(atPump);

        // Two more counted mistakes: the tank runs dry, the car rolls to a stop, then the friendly end.
        rerender(<Race {...props({ ...base, question: { key: 'q11', text: '5 + 7 = ?', index: 11 } })} />);
        act(() => events.emit('wrong', { given: '1', expected: '12' }));
        act(() => events.emit('wrong', { given: '1', expected: '12' }));
        expect(cans()).toBe('Nog 0 van 3 jerrycans benzine');
        expect(screen.getByText('De tank is leeg!')).toBeTruthy();
        until(FUEL.sputterMs + FUEL.emptyMs - 300);
        expect(onFail).not.toHaveBeenCalled();
        until(500);
        expect(onFail).toHaveBeenCalledOnce();
        const last = onReport.mock.calls.at(-1)![0];
        expect(last).toMatchObject({ title: 'De tank is leeg!', detail: 'Nieuw record!' });
        expect(last.lead).toBe(`Je reed ${formatKm(xOf(container))}`);
        expect(loadBestKm('race:test')).toBeCloseTo(xOf(container), -1);
    });

    test('Benzine: right at the pump fills every can', () => {
        const events = createSpelEvents();
        const base = { events, options: { modus: 'benzine' } };
        const { container, rerender } = render(<Race {...props(base)} />);
        act(() => events.emit('wrong', { given: '1', expected: '12' }));
        rerender(<Race {...props({ ...base, question: { key: 'q10', text: '8 + 6 = ?', index: 10 } })} />);
        frameAt(0);
        for (let t = 100; t <= FUEL.pullMs + FUEL.readyMs + 200; t += 100) frameAt(t);
        act(() => events.emit('correct', { given: '14', streak: 1 }));
        expect(screen.getByRole('img', { name: /jerrycans/ }).getAttribute('aria-label')).toBe('Nog 3 van 3 jerrycans benzine');
        expect(screen.getByText('Vol getankt!')).toBeTruthy();
        // The car waits at the pump while the fuel runs, then drives off with a boost.
        const at = xOf(container);
        let t = FUEL.pullMs + FUEL.readyMs + 200;
        for (const end = t + FUEL.refillMs - 200; t < end; t += 100) frameAt(t);
        expect(xOf(container)).toBeCloseTo(at, 3);
        for (const end = t + 1000; t < end; t += 100) frameAt(t);
        expect(xOf(container)).toBeGreaterThan(at + RACE.base);
    });
});

describe('Race Benzine: stations, cans, kilometres', () => {
    test('stations after 10 answers, each next gap 5 longer: 10, 25, 45, 70, 100', () => {
        expect([0, 1, 2, 3, 4].map(stationAfter)).toEqual([10, 25, 45, 70, 100]);
        const stations = Array.from({ length: 101 }, (_, i) => i).filter(isStationQuestion);
        expect(stations).toEqual([10, 25, 45, 70, 100]);
        expect(isStationQuestion(0)).toBe(false);
        expect(stationProgress(0)).toEqual({ done: 0, of: 10 });
        expect(stationProgress(9)).toEqual({ done: 9, of: 10 });
        expect(stationProgress(10)).toEqual({ done: 0, of: 15 });
        expect(stationProgress(30)).toEqual({ done: 5, of: 20 });
    });

    test('a counted mistake costs a can, met hulp costs nothing, the last can sputters to empty', () => {
        let f = startFuel();
        expect(f.cans).toBe(FUEL.cans);
        f = fuelWrong(f, true);
        expect(f).toMatchObject({ cans: 2, phase: 'drive' });
        expect(fuelWrong(f, false)).toBe(f);
        f = fuelWrong(fuelWrong(f, true), true);
        expect(f).toMatchObject({ cans: 0, phase: 'sputter' });
        expect(fuelTakesAnswers(f)).toBe(false);
        // Nothing more to lose, and no station while running dry.
        expect(fuelWrong(f, true)).toBe(f);
        expect(fuelStation(f)).toBe(f);
        f = fuelTick(f, FUEL.sputterMs);
        expect(f.phase).toBe('empty');
    });

    test('a station: pull in, Maak je klaar!, a timed sum; right fills all cans, wrong or late drives on', () => {
        let f = fuelWrong(fuelWrong(startFuel(), true), true);
        expect(f.cans).toBe(1);
        f = fuelStation(f);
        expect(f).toMatchObject({ phase: 'pull', stations: 1 });
        expect(fuelTakesAnswers(f)).toBe(false);
        f = fuelTick(f, FUEL.pullMs);
        expect(f.phase).toBe('ready');
        f = fuelTick(f, FUEL.readyMs);
        expect(f.phase).toBe('ask');
        expect(fuelTakesAnswers(f)).toBe(true);
        expect(askLeft(f)).toBe(FUEL.askMs);
        f = fuelTick(f, 4000);
        expect(askLeft(f)).toBe(FUEL.askMs - 4000);
        const full = fuelRight(f);
        expect(full).toMatchObject({ cans: 3, phase: 'refill', refills: 1, lastStation: 'vol' });
        expect(fuelTick(full, FUEL.refillMs).phase).toBe('drive');
        // Wrong at the pump: no refill and no can lost either; late reads as late.
        expect(fuelWrong(f, true)).toMatchObject({ cans: 1, phase: 'drive', lastStation: 'mis' });
        expect(fuelWrong(f, true, true)).toMatchObject({ cans: 1, phase: 'drive', lastStation: 'laat' });
        // A right answer on the road changes nothing in the tank.
        expect(fuelRight(startFuel())).toEqual(startFuel());
    });

    test('kilometres, the farthest run per card, and the end lines', () => {
        localStorage.clear();
        expect(formatKm(0)).toBe('0,00 km');
        expect(formatKm(1234)).toBe('1,23 km');
        expect(formatKm(999.9)).toBe('0,99 km');
        expect(loadBestKm('race:a')).toBeNull();
        saveIfFarther('race:a', 1500);
        saveIfFarther('race:a', 900);
        expect(loadBestKm('race:a')).toBe(1500);
        saveIfFarther('race:a', 2100);
        expect(loadBestKm('race:a')).toBe(2100);
        expect(benzineResult(1500, null, true)).toMatchObject({ title: 'De tank is leeg!', lead: 'Je reed 1,50 km', detail: 'Nieuw record!' });
        expect(benzineResult(2500, 2100, false)).toMatchObject({ title: 'Wat een rit!', detail: 'Nieuw record! 0,40 km verder dan je vorige record.' });
        expect(benzineResult(1000, 2100, true).detail).toBe('Je record is 2,10 km.');
        // Wis mijn scores clears both modes.
        saveIfBest('race:a', { ms: 1000, trace: [0] });
        wipeRecords();
        expect(loadBestKm('race:a')).toBeNull();
        expect(loadBest('race:a')).toBeNull();
        expect(localStorage.getItem(RACE_KM_KEY)).toBeNull();
        localStorage.setItem(RACE_KM_KEY, '{oops');
        expect(loadBestKm('race:a')).toBeNull();
    });

    test('the route: Tijdrit 3 different landscapes over the track, Benzine all 6 round and round; dev pins', () => {
        const seq = [0.1, 0.7, 0.3, 0.9, 0.5, 0.2, 0.8, 0.4];
        let k = 0;
        const rand = () => seq[k++ % seq.length];
        const t = routeOf('tijdrit', rand);
        expect(t.lands).toHaveLength(3);
        expect(new Set(t.lands).size).toBe(3);
        expect(segmentAt(t, 0)).toBe(0);
        expect(segmentAt(t, RACE.length / 3 + 1)).toBe(1);
        expect(segmentAt(t, RACE.length)).toBe(2);
        expect(gateOf(t, 0)).toBeNull();
        expect(gateOf(t, 1)).not.toBeNull();
        expect(gateOf(t, 2)).not.toBe(gateOf(t, 1));
        expect(gateOf(t, 3)).toBeNull();
        const b = routeOf('benzine', rand);
        expect([...b.lands].sort()).toEqual([...LANDS].sort());
        expect(segmentAt(b, BENZINE_SEGMENT * 7 + 1)).toBe(7);
        expect(landOf(b, 7)).toBe(b.lands[1]);
        expect(gateOf(b, 40)).not.toBeNull();
        const pin = pinnedOf('?raceLand=stad,sneeuw,nope&raceGate=brug');
        expect(pin).toEqual({ lands: ['stad', 'sneeuw'], gate: 'brug' });
        const p = routeOf('tijdrit', Math.random, pin.lands, pin.gate);
        expect(p.lands.slice(0, 2)).toEqual(['stad', 'sneeuw']);
        expect(gateOf(p, 1)).toBe('brug');
        expect(pinnedOf('')).toEqual({ lands: [], gate: null });
    });
});
