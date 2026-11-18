// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import { skinById } from '../oefenen/spelen/skins/registry';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import Frituur, { FrituurEnding } from '../oefenen/spelen/skins/frituur/Frituur';
import { DogG, PersonG } from '../oefenen/spelen/skins/frituur/art';
import { UfoG, VisitorG } from '../oefenen/spelen/skins/frituur/visitors';
import {
    FRITUUR, KINDS, NO_PATIENCE, ORDERS, VISITORS, customerOf, isEndless, isVisitor, headTopOf, helpedTitle, isLow, newCounter, nextSum, patienceFor, patienceShare, serve, tick, timedOut,
    walkOff, wrongOrder, wrongOrderOf,
} from '../oefenen/spelen/skins/frituur/rule';
import { FRITUUR_BEST_KEY, frituurResult, loadBest, saveIfBest, wipeBest } from '../oefenen/spelen/skins/frituur/records';
import { FRITUUR_SOUNDS, playFrituur } from '../oefenen/spelen/skins/frituur/sounds';
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../oefenen/spelen/sound';

// Frituur (Spelen round 6): the queue at the counter (rule.ts: patience, serving, wrong orders, walking off), the
// best per card and length (records.ts), the registry row, and the scene reacting to the session's events.

// The shared clock's first 12 s: every customer's patience at the start of a round (Normaal and up).
const START_MS = 12_000;

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: 180_000, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: 180_000, ...over,
});
const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
    question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
    onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
    progress: progressWith(), options: { tijd: '3' }, events: createSpelEvents(), ...over,
});
const rootOf = (c: HTMLElement) => c.querySelector('.fr-root')!;

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('Frituur: the queue', () => {
    test('patience = the short-round clock: 12 / 10 / 8 s the first minute, then the shared ramp; Makkelijk has no bar', () => {
        expect(patienceFor('normaal', 0)).toBe(START_MS);
        expect(patienceFor('moeilijk', 59_000)).toBe(10_000);
        expect(patienceFor('onmogelijk', 59_000)).toBe(8_000);
        expect(patienceFor('normaal', 60_000)).toBe(11_000);
        expect(patienceFor('moeilijk', 150_000)).toBe(7_000);
        expect(patienceFor('onmogelijk', 300_000)).toBe(4_000);
        expect(patienceFor('makkelijk', 0)).toBe(NO_PATIENCE);
        expect(patienceFor('makkelijk', 300_000)).toBe(NO_PATIENCE);
    });

    test('Makkelijk: a customer without a bar waits forever, but a wrong order still walks them off', () => {
        const c = newCounter(4, NO_PATIENCE);
        expect(isEndless(c.patience)).toBe(true);
        const later = tick(c, 600_000);
        expect(later).toBe(c);
        expect(timedOut(later)).toBe(false);
        expect(patienceShare(later.patience)).toBe(1);
        expect(isLow(later.patience)).toBe(false);
        const w = wrongOrder(c, NO_PATIENCE);
        expect(w.queue[0].id).toBe(1);
        expect(w.leaving.at(-1)!.mood).toBe('tantrum');
        expect(isEndless(w.patience)).toBe(true);
    });

    test('customers are seeded, varied, and never the same kind twice in a row; a wrong order is never what they asked', () => {
        expect(customerOf(42, 7, null)).toEqual(customerOf(42, 7, null));
        const seen = new Set<string>();
        let visitors = 0, all = 0;
        for (let seed = 1; seed < 60; seed++) {
            let prev: ReturnType<typeof customerOf>['kind'] | null = null;
            for (let id = 0; id < 30; id++) {
                const c = customerOf(seed, id, prev);
                expect(c.kind).not.toBe(prev);
                expect(ORDERS).toContain(c.order);
                // Only visitors order the green alien sauce.
                if (c.order === 'slijm') expect(['alien', 'drieoog', 'monster']).toContain(c.kind);
                seen.add(c.kind);
                visitors += isVisitor(c.kind) ? 1 : 0;
                all++;
                prev = c.kind;
            }
        }
        // Every person and every visitor shows up; about one customer in four is a visitor.
        expect([...seen].sort()).toEqual([...new Set([...KINDS, ...VISITORS])].sort());
        expect(visitors / all).toBeGreaterThan(FRITUUR.visitorChance - 0.06);
        expect(visitors / all).toBeLessThan(FRITUUR.visitorChance + 0.06);
        for (const v of VISITORS) expect(headTopOf(v)).toBeGreaterThan(0);
        for (const o of ORDERS) for (let n = 0; n < 12; n++) expect(wrongOrderOf(o, n)).not.toBe(o);
    });

    test('a new counter: three in the queue, the first one with full patience after a short grace', () => {
        const c = newCounter(9);
        expect(c.queue).toHaveLength(FRITUUR.queue);
        expect(c.queue.map(q => q.id)).toEqual([0, 1, 2]);
        expect(patienceShare(c.patience)).toBe(1);
        // The grace goes first, then the bar.
        const a = tick(c, FRITUUR.graceMs);
        expect(a.patience.left).toBe(START_MS);
        const b = tick(a, 3000);
        expect(b.patience.left).toBe(START_MS - 3000);
        expect(timedOut(b)).toBe(false);
        expect(timedOut(tick(b, 60_000))).toBe(true);
        expect(isLow(tick(b, START_MS * (1 - FRITUUR.lowAt) - 2900).patience)).toBe(true);
    });

    test('a right answer serves them (the bar stops) and they leave happy on the next sum; the next steps up', () => {
        const c = tick(newCounter(3), 5000);
        const s = serve(c);
        expect(s.served).toBe(true);
        expect(s.servedCount).toBe(1);
        expect(serve(s)).toBe(s);
        expect(tick(s, 60_000)).toBe(s);
        expect(timedOut(tick(s, 60_000))).toBe(false);
        const n = nextSum(s, 9_000);
        expect(n.leaving).toEqual([{ customer: c.queue[0], mood: 'happy' }]);
        expect(n.queue.map(q => q.id)).toEqual([1, 2, 3]);
        expect(n.served).toBe(false);
        // The next customer's patience is the clock as they step up.
        expect(n.patience.total).toBe(9_000);
        // No serve: a new sum leaves the queue as it is (a wrong answer keeps the customer).
        expect(nextSum(c, 0)).toBe(c);
    });

    test('a wrong order: a little strop with the wrong snack and off they go; the next one steps up with a full bar', () => {
        const c = newCounter(5);
        const w1 = wrongOrder(c);
        expect(w1.queue[0].id).toBe(1);
        expect(w1.leaving.at(-1)).toEqual({ customer: c.queue[0], mood: 'tantrum', snack: wrongOrderOf(c.queue[0].order, c.nextId) });
        expect(w1.leaving.at(-1)!.snack).not.toBe(c.queue[0].order);
        expect(w1.wrongs).toBe(0);
        expect(patienceShare(w1.patience)).toBe(1);
    });

    test('walking off keeps only the last few leavers; the end title counts the customers helped', () => {
        let c = newCounter(1);
        for (let i = 0; i < 6; i++) c = walkOff(c, 'grumpy', 0);
        expect(c.leaving).toHaveLength(FRITUUR.leaving);
        expect(c.queue.map(q => q.id)).toEqual([6, 7, 8]);
        expect(helpedTitle(1)).toBe('Je hielp 1 klant!');
        expect(helpedTitle(12)).toBe('Je hielp 12 klanten!');
        expect(helpedTitle(0)).not.toMatch(/0/);
        // A kid's head is lower than a grown-up's: the bar floats above whoever is at the counter.
        expect(headTopOf('kind')).toBeGreaterThan(headTopOf('papa'));
    });
});

describe('Frituur: the best on this device', () => {
    test('kept per key when beaten, wiped on request, and storage trouble never breaks a round', () => {
        expect(loadBest('a|3')).toBe(0);
        saveIfBest('a|3', 5);
        saveIfBest('a|3', 3);
        expect(loadBest('a|3')).toBe(5);
        expect(loadBest('a|5')).toBe(0);
        expect(frituurResult(7, 5)).toMatchObject({ title: 'Je hielp 7 klanten!', detail: expect.stringMatching(/^Nieuw record!/) });
        expect(frituurResult(4, 5).detail).toBe('Je record is 5 klanten.');
        expect(frituurResult(3, 0).detail).toBe('Nieuw record!');
        expect(frituurResult(0, 0).detail).toBeUndefined();
        frituurResult(1, 1).wipe!();
        expect(localStorage.getItem(FRITUUR_BEST_KEY)).toBeNull();
        localStorage.setItem(FRITUUR_BEST_KEY, '{nope');
        expect(loadBest('a|3')).toBe(0);
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
        expect(() => saveIfBest('a|3', 9)).not.toThrow();
        spy.mockRestore();
        expect(() => wipeBest()).not.toThrow();
    });
});

describe('Frituur: the registry row', () => {
    test('a timed keypad game in Op tijd: 3 or 5 minutes, music gek, any number content, no early end, no win title', () => {
        const skin = skinById('frituur')!;
        expect(skin.meta).toMatchObject({ input: 'keypad', timed: true, music: 'gek', round: { seconds: 180 }, accepts: { kinds: ['number'] } });
        expect(skin.meta.canFail).toBeFalsy();
        expect(skin.meta.winTitle).toBeUndefined();
        expect(gameGroupOf(skin.meta)).toBe('tijd');
        expect(skin.meta.options![0].choices.map(c => c.label)).toEqual(['3 minuten', '5 minuten']);
        // The four levels, about time: a crossed-out clock, a clock, a clock and flames.
        expect(skin.meta.options![1].choices.map(c => [c.value, c.icon])).toEqual([
            ['makkelijk', { clock: 'off' }], ['normaal', { clock: 'on' }], ['moeilijk', { clock: 'on', flames: 1 }], ['onmogelijk', { clock: 'on', flames: 2 }],
        ]);
        expect(resolveMeta(skin.meta).chosen).toEqual({ tijd: '3', niveau: 'normaal' });
        expect(resolveMeta(skin.meta, { tijd: '5' }).round.seconds).toBe(300);
        expect(GAME_BLURB.frituur).toBeTruthy();
        expect(skin.Component).toBeTruthy();
        expect(skin.Ending).toBeTruthy();
    });

    test('its own sounds are recipes that play under the shared on / off', () => {
        class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } value = 0; }
        class Node { connect<T>(n: T) { return n; } }
        let made = 0;
        class Ctx {
            state = 'running'; currentTime = 0; sampleRate = 8000; destination = new Node();
            resume() { return Promise.resolve(); }
            createGain() { return Object.assign(new Node(), { gain: new Param() }); }
            createBiquadFilter() { return Object.assign(new Node(), { type: '', frequency: new Param(), Q: new Param() }); }
            createOscillator() { made++; return Object.assign(new Node(), { type: '', frequency: new Param(), start() { }, stop() { } }); }
            createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
            createBufferSource() { made++; return Object.assign(new Node(), { buffer: null, start() { }, stop() { } }); }
        }
        const g = globalThis as unknown as { AudioContext?: unknown };
        g.AudioContext = Ctx;
        localStorage.setItem(SOUND_KEY, '0');
        resetSoundForTests();
        setSoundOn(true);
        expect(FRITUUR_SOUNDS).toEqual(['sizzle', 'ding', 'yum', 'huh', 'grumble', 'strop', 'wail', 'woef']);
        for (const s of FRITUUR_SOUNDS) {
            const before = made;
            playFrituur(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playFrituur('ding');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});

describe('Frituur: the scene', () => {
    test('the frituur, three customers, the sum in a speech bubble and a patience bar over the first one', () => {
        const { container } = render(<Frituur {...propsWith()} />);
        expect(container.querySelector('.fr-name')!.textContent).toBe('FRITUUR');
        expect(container.querySelectorAll('.fr-cust:not(.fr-leaver)')).toHaveLength(3);
        expect(container.querySelector('.fr-bubble')!.textContent).toContain('7 + 5 = ?');
        expect(container.querySelector('.fr-patience')).not.toBeNull();
        expect(container.querySelector('.fr-tally')!.getAttribute('aria-label')).toBe('0 klanten geholpen');
    });

    test('a right answer: the order goes over the counter; on the next sum they leave eating and the queue steps up', () => {
        const events = createSpelEvents();
        const onReport = vi.fn();
        const { container, rerender } = render(<Frituur {...propsWith({ events, onReport, runKey: 'k' })} />);
        expect(onReport).toHaveBeenLastCalledWith(expect.objectContaining({ title: helpedTitle(0) }));
        const firstId = container.querySelector('.fr-cust.is-slot-0');
        act(() => { events.emit('correct', { given: '12', streak: 1 }); });
        rerender(<Frituur {...propsWith({ events, onReport, runKey: 'k', phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
        expect(rootOf(container).classList.contains('is-served')).toBe(true);
        expect(container.querySelector('.fr-cust.is-served .fr-held')).not.toBeNull();
        expect(container.querySelector('.fr-patience')).toBeNull();
        expect(onReport).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Je hielp 1 klant!', detail: 'Nieuw record!' }));
        expect(loadBest('k|3')).toBe(1);
        rerender(<Frituur {...propsWith({ events, onReport, runKey: 'k', question: { key: 'q2', text: '3 + 4 = ?', index: 1 }, progress: progressWith({ right: 1, score: 1, streak: 1 }) })} />);
        expect(container.querySelector('.fr-leaver.is-happy')).not.toBeNull();
        expect(container.querySelector('.fr-cust.is-slot-0')).not.toBe(firstId);
        expect(container.querySelectorAll('.fr-cust:not(.fr-leaver)')).toHaveLength(3);
        expect(container.querySelector('.fr-tally')!.getAttribute('aria-label')).toBe('1 klant geholpen');
    });

    test('a wrong answer: the wrong snack goes to the customer, a little strop, and the next steps up', () => {
        const events = createSpelEvents();
        const { container, rerender } = render(<Frituur {...propsWith({ events })} />);
        const front = container.querySelector('.fr-cust.is-slot-0')!;
        act(() => { events.emit('wrong', { given: '11', expected: '12' }); });
        rerender(<Frituur {...propsWith({ events, phase: 'wrong', feedback: { given: '11', expected: '12', correct: false }, progress: progressWith({ mistakes: 1 }) })} />);
        expect(container.querySelector('.fr-wrong-order')).toBeNull();
        expect(rootOf(container).classList.contains('is-wrong')).toBe(true);
        expect(container.querySelector('.fr-leaver.is-tantrum .fr-storm')).not.toBeNull();
        expect(container.querySelector('.fr-leaver.is-tantrum .fr-toss')).not.toBeNull();
        expect(container.querySelector('.fr-cust.is-slot-0')).not.toBe(front);
        // The cook shrugs, sorry.
        expect(container.querySelector('.fr-kiosk.is-shrug')).not.toBeNull();
    });

    test('an empty bar walks the customer off grumbling and calls onMiss once; help and the flashes freeze the bar', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
        const onMiss = vi.fn();
        const { container, rerender } = render(<Frituur {...propsWith({ onMiss, phase: 'help' })} />);
        act(() => { vi.advanceTimersByTime(30_000); });
        expect(onMiss).not.toHaveBeenCalled();
        rerender(<Frituur {...propsWith({ onMiss })} />);
        act(() => { vi.advanceTimersByTime(START_MS - 300); });
        expect(onMiss).not.toHaveBeenCalled();
        expect(container.querySelector('.fr-patience.is-low')).not.toBeNull();
        expect(container.querySelector('.fr-cust.is-slot-0.is-low .fr-fume')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(FRITUUR.graceMs + 600); });
        expect(onMiss).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.fr-leaver.is-grumpy')!.textContent).toContain('Hmpf!');
        // The session flashes the answer now: the next customer's bar waits.
        rerender(<Frituur {...propsWith({ onMiss, phase: 'wrong', feedback: { given: '', expected: '12', correct: false } })} />);
        act(() => { vi.advanceTimersByTime(60_000); });
        expect(onMiss).toHaveBeenCalledTimes(1);
    });

    test('Makkelijk: no patience bar, nobody walks off however long it takes; the best is kept per level', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
        const onMiss = vi.fn();
        const events = createSpelEvents();
        const { container } = render(<Frituur {...propsWith({ onMiss, events, runKey: 'k', options: { tijd: '3', niveau: 'makkelijk' } })} />);
        expect(container.querySelector('.fr-patience')).toBeNull();
        act(() => { vi.advanceTimersByTime(120_000); });
        expect(onMiss).not.toHaveBeenCalled();
        act(() => { events.emit('correct', { given: '12', streak: 1 }); });
        expect(loadBest('k|3|makkelijk')).toBe(1);
        expect(loadBest('k|3')).toBe(0);
    });

    test('the end picture: the frituur with happy customers eating', () => {
        const { container } = render(<FrituurEnding outcome="done" progress={progressWith()} options={{}} />);
        expect(container.querySelector('.fr-ending .fr-kiosk')).not.toBeNull();
        expect(container.querySelectorAll('.fr-ending .fr-person.is-happy, .fr-ending .fr-visitor.is-happy')).toHaveLength(3);
    });

    test('every visitor draws in every pose, with its happy moment and its own strop; aliens park a UFO', () => {
        for (const kind of VISITORS) {
            for (const pose of ['wait', 'low', 'served', 'happy', 'grumpy', 'tantrum', 'frown'] as const) {
                const { container, unmount } = render(<svg><VisitorG kind={kind} pose={pose} item="friet" /></svg>);
                const g = container.querySelector(`.fr-visitor.is-${kind}.is-${pose}`);
                expect(g, `${kind} ${pose}`).not.toBeNull();
                if (pose === 'served') expect(g!.querySelector('.fr-held'), kind).not.toBeNull();
                unmount();
            }
        }
        const served = (kind: (typeof VISITORS)[number], sel: string) => {
            const { container, unmount } = render(<svg><VisitorG kind={kind} pose="served" item="slijm" /></svg>);
            expect(container.querySelector(sel), kind).not.toBeNull();
            unmount();
        };
        served('alien', '.fr-v-halo');
        served('octopus', '.fr-v-juggle');
        served('draak', '.fr-v-heart');
        const { container } = render(<svg><UfoG pose="wait" /></svg>);
        expect(container.querySelectorAll('.fr-ufo-light').length).toBeGreaterThan(2);
    });

    test('a person in a strop flails both arms; a kid cries, opa shakes his cane, the dog barks', () => {
        const { container, rerender } = render(<svg><PersonG kind="kind" look={0} pose="tantrum" /></svg>);
        expect(container.querySelectorAll('.fr-limb.is-l').length).toBeGreaterThan(0);
        expect(container.querySelector('.fr-tears')).not.toBeNull();
        rerender(<svg><PersonG kind="opa" look={0} pose="tantrum" /></svg>);
        expect(container.querySelector('.fr-cane.fr-limb')).not.toBeNull();
        rerender(<svg><DogG pose="tantrum" /></svg>);
        expect(container.querySelector('.fr-dog.is-tantrum .fr-mouth-open')).not.toBeNull();
    });
});
