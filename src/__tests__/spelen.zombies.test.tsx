// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import Zombies from '../oefenen/spelen/skins/zombies/Zombies';
import { DEFENCE, fearOf, shooterOf, zombieLevelOf } from '../oefenen/spelen/skins/zombies/defence';
import { SKINS } from '../oefenen/spelen/skins/registry';
import {
    RAMP, SHAMBLE, ZOMBIE, joinAt, offStreetAt, paceOf, shamble, shambleRate, speedAt, stepCloser, strideOf, targetSpeed, walk, zombieSpeed, type Walker,
} from '../oefenen/spelen/skins/zombies/walk';

// Zombies (round 4): every zombie walks on at its own pace (owner: "if they go too far, the others wait?"),
// a shamble cycle driven by the distance walked, and the pupil-paced balance that follows from it.

const DT = 1 / 60;
const at = (x: number, pace = 1, i = 0): Walker => ({ x, pace, v: targetSpeed(i, pace, ZOMBIE.speed) });
function run(line: Walker[], seconds: number, speed = ZOMBIE.speed, offAt?: number) {
    let l = line;
    let door = false;
    for (let t = 0; t < seconds; t += DT) {
        const s = walk(l, DT, speed, offAt);
        l = s.line;
        door ||= s.atDoor;
    }
    return { line: l, door };
}

describe('Zombies walk', () => {
    test('speed rises slowly with the streak and drops back', () => {
        expect(zombieSpeed(0)).toBe(ZOMBIE.speed);
        expect(zombieSpeed(3)).toBeCloseTo(ZOMBIE.speed * 1.3);
        expect(zombieSpeed(50)).toBe(zombieSpeed(ZOMBIE.maxStreak));
        expect(zombieSpeed(ZOMBIE.maxStreak)).toBeLessThan(ZOMBIE.speed * 2);
    });

    test('repro: the ones behind keep walking while the front one is far ahead (they never stop to wait)', () => {
        // Before round 4 a follower stood still at 60 % and the next one 24 % behind it until the front one was gone.
        let line = [at(40, 1, 0), at(64, paceOf(1), 1), at(88, paceOf(2), 2)];
        for (let t = 0; t < 8; t += DT) {
            const next = walk(line, DT, ZOMBIE.speed).line;
            next.forEach((z, i) => expect(z.x).toBeLessThan(line[i].x));
            line = next;
        }
        expect(line[1].x).toBeLessThan(64 - 8 * ZOMBIE.speed * ZOMBIE.follow * 0.85);
        expect(line[2].x).toBeLessThan(88 - 8 * ZOMBIE.speed * ZOMBIE.follow * 0.85);
    });

    test('each at its own pace: two followers far apart cover different distances', () => {
        const { line } = run([at(20, 1, 0), at(60, 0.9, 1), at(100, 1.08, 2)], 5);
        const d1 = 60 - line[1].x;
        const d2 = 100 - line[2].x;
        expect(d1).toBeCloseTo(5 * ZOMBIE.speed * ZOMBIE.follow * 0.9, 0);
        expect(d2).toBeCloseTo(5 * ZOMBIE.speed * ZOMBIE.follow * 1.08, 0);
        expect(d2).toBeGreaterThan(d1 * 1.1);
        expect(new Set([1, 2, 3, 4, 5, 6].map(paceOf)).size).toBeGreaterThan(3);
    });

    test('the front one stops at the door; one behind only slows to keep its distance, never passes', () => {
        const r = run([at(3, 1, 0), at(20, 1.08, 1), at(40, 1.08, 2)], 30);
        expect(r.door).toBe(true);
        expect(r.line[0].x).toBe(0);
        expect(r.line[1].x).toBeGreaterThanOrEqual(ZOMBIE.minGap - 1e-9);
        expect(r.line[2].x - r.line[1].x).toBeGreaterThanOrEqual(ZOMBIE.minGap - 1e-9);
    });

    test('a new pace eases in (no jump), and an unseen zombie runs in and arrives at its walking pace', () => {
        let line = [at(80)];
        let last: number = ZOMBIE.speed;
        for (let f = 0; f < 60; f++) {
            const before = line[0].x;
            line = walk(line, DT, zombieSpeed(ZOMBIE.maxStreak)).line;
            const v = (before - line[0].x) / DT;
            expect(Math.abs(v - last)).toBeLessThan(0.2);
            last = v;
        }
        expect(last).toBeGreaterThan(ZOMBIE.speed * 1.6);
        const off = offStreetAt(600, 160);
        const r = walk([at(off + 30)], 0.1, ZOMBIE.speed, off).line[0];
        expect(r.x).toBeCloseTo(off + 30 - ZOMBIE.enter * 0.1);
        expect(r.v).toBe(targetSpeed(0, 1, ZOMBIE.speed));
        expect(walk([at(off + 2)], 0.1, ZOMBIE.speed, off).line[0].x).toBe(off);
    });

    test('a wrong answer steps closer, never onto the door; newcomers come in from off screen', () => {
        expect(stepCloser(50)).toBe(50 - ZOMBIE.step);
        expect(stepCloser(10)).toBe(ZOMBIE.stepMin);
        expect(stepCloser(2)).toBe(2);
        expect(joinAt(null)).toBe(ZOMBIE.start);
        expect(joinAt(80, 130)).toBe(130);
        expect(joinAt(120, 130)).toBe(120 + ZOMBIE.gap);
        // A lane at 100 still shows the whole zombie: off screen starts a zombie width further.
        expect(offStreetAt(800, 160)).toBe(120);
        expect(offStreetAt(0, 0)).toBe(100 + ZOMBIE.gap);
    });

    test('balance: a slow pupil (10 s a sum) gets several sums before the first zombie gets through; a fast one never waits long for a sum', () => {
        const play = (every: number, streakUp: boolean, seconds: number) => {
            const off = offStreetAt(600, 160);
            let line = [0, 1, 2].map(i => ({ x: ZOMBIE.start + i * ZOMBIE.gap, pace: paceOf(i), v: targetSpeed(i, paceOf(i), ZOMBIE.speed) }));
            let id = 3;
            let streak = 0;
            let answered = 0;
            let firstMiss: number | null = null;
            let unseen = 0;
            let clock = 0;
            for (let t = 0; t < seconds; t += DT) {
                const s = walk(line, DT, zombieSpeed(streak), off);
                line = s.line;
                clock += DT;
                if (line[0].x > 100) unseen += DT;
                const through = s.atDoor;
                if (through || clock >= every) {
                    if (through && firstMiss === null) firstMiss = answered;
                    streak = through ? 0 : streakUp ? streak + 1 : 0;
                    answered++;
                    clock = 0;
                    const rest = line.slice(1);
                    const last = Math.max(...rest.map(z => z.x));
                    rest.push({ x: joinAt(last, off), pace: paceOf(id), v: targetSpeed(2, paceOf(id), zombieSpeed(streak)) });
                    id++;
                    line = rest;
                }
            }
            return { firstMiss, unseen, answered };
        };
        const slow = play(10, false, 180);
        expect(slow.firstMiss === null || slow.firstMiss >= 5).toBe(true);
        const fast = play(3, true, 180);
        expect(fast.firstMiss).toBeNull();
        // The sum is on screen nearly all the time even for the fastest pupil.
        expect(fast.unseen / fast.answered).toBeLessThan(0.6);
    });
});

describe('Zombies shamble', () => {
    test('the legs alternate, the cycle repeats every 1, and standing still is the neutral pose', () => {
        for (const p of [0.1, 0.3, 0.62, 0.9]) {
            const o = shamble(p, 1);
            expect(o.legA).toBeCloseTo(-o.legB);
            expect(shamble(p + 1, 1).legA).toBeCloseTo(o.legA);
            // Only the leg that swings forward lifts.
            expect(o.liftA === 0 || o.liftB === 0).toBe(true);
        }
        expect(shamble(0.25, 1).legA).toBeGreaterThan(10);
        expect(shamble(0.75, 1).legA).toBeLessThan(-10);
        const still = shamble(0.37, 0);
        for (const v of Object.values(still)) expect(Math.abs(v)).toBe(0);
    });

    test('smooth: a frame later the pose moves only a little (no snapping)', () => {
        const rate = SHAMBLE.maxRate;
        for (let p = 0; p < 3; p += 0.013) {
            const a = shamble(p, 1);
            const b = shamble(p + rate * DT, 1);
            for (const k of Object.keys(a) as (keyof typeof a)[]) expect(Math.abs(a[k] - b[k])).toBeLessThan(3);
        }
    });

    test('the step rate follows the pace in px and stays lively at every width; a stopped zombie does not step', () => {
        expect(shambleRate(0, 600, 160)).toBe(0);
        for (const [track, zombie] of [[110, 72], [300, 84], [580, 168], [900, 190]]) {
            const r = shambleRate(ZOMBIE.speed, track, zombie);
            expect(r).toBeGreaterThanOrEqual(SHAMBLE.minRate);
            expect(r).toBeLessThanOrEqual(SHAMBLE.maxRate);
            expect(shambleRate(zombieSpeed(ZOMBIE.maxStreak), track, zombie)).toBeGreaterThanOrEqual(r);
        }
        expect(strideOf(ZOMBIE.step, 600, 160)).toBeGreaterThan(0.5);
        expect(strideOf(0, 600, 160)).toBe(0);
    });
});

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: 180_000, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
});
const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
    question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
    onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
    progress: progressWith(), options: {}, events: createSpelEvents(), reducedMotion: false, ...over,
});

describe('Zombies skin: the walk on screen', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const lanes = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.zb-lane')];
    const xOf = (el: HTMLElement) => Number(el.dataset.x);
    const shownOf = (el: HTMLElement) => Number(/translateX\(([-\d.]+)%\)/.exec(el.style.transform)![1]);

    test('the whole line walks on at once, each its own way; the legs swing', () => {
        const { container } = render(<Zombies {...propsWith()} />);
        const start = lanes(container).map(xOf);
        expect(start).toEqual([ZOMBIE.start, ZOMBIE.start + ZOMBIE.gap, ZOMBIE.start + 2 * ZOMBIE.gap]);
        wait(6000);
        const moved = lanes(container).map((l, i) => start[i] - xOf(l));
        moved.forEach(d => expect(d).toBeGreaterThan(10));
        expect(new Set(moved.map(d => d.toFixed(1))).size).toBe(3);
        const legs = lanes(container).map(l => l.querySelector('[data-part=legA]')!.getAttribute('transform'));
        expect(legs.every(t => /rotate\(-?\d/.test(t ?? ''))).toBe(true);
        expect(new Set(legs).size).toBe(3);
    });

    test('a wrong answer: the game spot jumps a step, the drawn zombie lunges after it and catches up', () => {
        const events = createSpelEvents();
        const { container, rerender } = render(<Zombies {...propsWith({ events })} />);
        wait(500);
        const front = lanes(container)[0];
        const x = xOf(front);
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Zombies {...propsWith({ events, phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
        expect(xOf(front)).toBeCloseTo(x - ZOMBIE.step, 1);
        expect(shownOf(front)).toBeGreaterThan(xOf(front) + ZOMBIE.step / 2);
        wait(150);
        const mid = shownOf(front);
        expect(mid).toBeLessThan(x);
        expect(mid).toBeGreaterThan(xOf(front));
        wait(900);
        expect(shownOf(front)).toBeCloseTo(xOf(front), 1);
    });

    test('under help nothing moves, not even a leg; reduced motion: no walking cycle and an instant step', () => {
        const events = createSpelEvents();
        const { container, rerender } = render(<Zombies {...propsWith({ events })} />);
        wait(1000);
        rerender(<Zombies {...propsWith({ events, phase: 'help' })} />);
        const snap = () => lanes(container).map(l => `${l.style.transform}|${l.querySelector('[data-part=legA]')!.getAttribute('transform')}`).join();
        const held = snap();
        wait(3000);
        expect(snap()).toBe(held);
        cleanup();
        const still = render(<Zombies {...propsWith({ events, reducedMotion: true })} />);
        wait(2000);
        const front = lanes(still.container)[0];
        expect(xOf(front)).toBeLessThan(ZOMBIE.start - 5);
        expect(front.querySelector('[data-part=legA]')!.getAttribute('transform')).toBe('translate(0 0.00) rotate(0.00 40 98)');
        const x = xOf(front);
        act(() => events.emit('wrong', { given: '1', expected: '12' }));
        expect(shownOf(front)).toBeCloseTo(x - ZOMBIE.step, 1);
    });
});

describe('Zombies follow-up (owner 2026-11-15): no stun on a wrong answer, a speed ramp, fear and the blowdart', () => {
    test('speedAt: 100 % at the start, 150 % at 2:00, 200 % at 4:00, linear between, capped', () => {
        expect(speedAt(0)).toBe(1);
        expect(speedAt(60_000)).toBeCloseTo(1.25);
        expect(speedAt(120_000)).toBeCloseTo(1.5);
        expect(speedAt(180_000)).toBeCloseTo(1.75);
        expect(speedAt(240_000)).toBeCloseTo(2);
        expect(speedAt(600_000)).toBe(RAMP.max);
        expect(speedAt(-5)).toBe(1);
    });

    test('fear follows who is left: calm, worried after a catch, scared with two or fewer; the safe ones take turns with the dart', () => {
        expect([0, 3, 4, 5, 6, 7].map(h => fearOf('normaal', h))).toEqual(['calm', 'calm', 'worried', 'worried', 'scared', 'scared']);
        expect([0, 1, 2].map(h => fearOf('moeilijk', h))).toEqual(['calm', 'scared', 'scared']);
        expect([0, 1, 2, 3, 4, 5].map(n => shooterOf(5, n))).toEqual([0, 1, 2, 3, 4, 0]);
        expect([0, 1, 2].map(n => shooterOf(2, n))).toEqual([0, 1, 0]);
        expect(shooterOf(0, 3)).toBe(-1);
    });

    describe('on screen', () => {
        beforeEach(() => {
            vi.spyOn(console, 'error').mockImplementation(() => { });
            vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
        });
        afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
        const xs = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.zb-lane:not([data-zombie=down])')].map(l => Number(l.dataset.x));

        test('a wrong answer stuns no zombie: through the wrong flash every one walks on, the front one too', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...propsWith({ events })} />);
            wait(500);
            act(() => events.emit('wrong', { given: '11', expected: '12' }));
            rerender(<Zombies {...propsWith({ events, phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
            const before = xs(container);
            wait(300);
            xs(container).forEach((x, i) => expect(x).toBeLessThan(before[i]));
            expect(container.querySelector('.zb-dizzy')).toBeNull();
        });

        test('a right answer stops only the zombie it hits (a dart, stars); the rest walk on', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...propsWith({ events })} />);
            wait(500);
            act(() => events.emit('correct', { given: '12', streak: 1 }));
            rerender(<Zombies {...propsWith({ events, phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
            const before = xs(container);
            wait(300);
            const after = xs(container);
            expect(after[0]).toBe(before[0]);
            expect(after[1]).toBeLessThan(before[1]);
            expect(after[2]).toBeLessThan(before[2]);
            expect(container.querySelector('[data-zombie=front] .zb-zombie.is-flop .zb-dizzy')).not.toBeNull();
            expect(container.querySelector('.zb-dart')).not.toBeNull();
            expect(container.querySelector('.zb-sv.is-shooting')!.getAttribute('data-k')).toBe('0');
            // The next right answer: the next survivor in turn; the one knocked down lies on a moment, then goes.
            rerender(<Zombies {...propsWith({ events, question: { key: 'q2', text: '8 + 5 = ?', index: 1 } })} />);
            expect(container.querySelectorAll('[data-zombie=down]')).toHaveLength(1);
            act(() => events.emit('correct', { given: '13', streak: 2 }));
            rerender(<Zombies {...propsWith({ events, phase: 'right', question: { key: 'q2', text: '8 + 5 = ?', index: 1 }, feedback: { given: '13', expected: '13', correct: true } })} />);
            expect(container.querySelector('.zb-sv.is-shooting')!.getAttribute('data-k')).toBe('1');
            wait(1500);
            expect(container.querySelector('.zb-sv.is-shooting')).toBeNull();
            rerender(<Zombies {...propsWith({ events, question: { key: 'q3', text: '9 + 5 = ?', index: 2 } })} />);
            wait(1500);
            expect(container.querySelectorAll('[data-zombie=down]')).toHaveLength(0);
        });

        test('reduced motion: an instant hit, no dart flight; the group shows its fear and huddles when two are left', () => {
            const events = createSpelEvents();
            const { container } = render(<Zombies {...propsWith({ events, reducedMotion: true })} />);
            act(() => events.emit('correct', { given: '12', streak: 1 }));
            expect(container.querySelector('.zb-dart')).toBeNull();
            expect(container.querySelector('.zb-pfft')).toBeNull();
            expect((container.querySelector('.zb-root') as HTMLElement).style.getPropertyValue('--zb-hit')).toBe('0ms');
            cleanup();
            const crew = (misses: number) => {
                const r = render(<Zombies {...propsWith({ progress: progressWith({ misses }) })} />);
                const el = r.container.querySelector('.zb-crew')!;
                const out = { cls: el.className, sweat: el.querySelectorAll('[data-survivor=safe] .zb-sv-sweat').length };
                r.unmount();
                return out;
            };
            expect(crew(0).cls).toContain('is-calm');
            expect(crew(4).cls).toContain('is-worried');
            const scared = crew(6);
            expect(scared.cls).toContain('is-scared');
            expect(scared.sweat).toBe(2);
        });
    });

    test('balance with the ramp (owner numbers kept): a 6 s pupil never loses one in 3 minutes, an 8 s one not before 2 minutes, a 12 s one not in the first half minute', () => {
        const missesAt = (every: number) => {
            const DT2 = 1 / 30;
            const off = offStreetAt(600, 160);
            let line = [0, 1, 2].map(i => ({ x: ZOMBIE.start + i * ZOMBIE.gap, pace: paceOf(i), v: targetSpeed(i, paceOf(i), ZOMBIE.speed) }));
            let id = 3;
            let clock = 0;
            const misses: number[] = [];
            for (let t = 0; t < 180; t += DT2) {
                const s = walk(line, DT2, ZOMBIE.speed * speedAt(t * 1000), off);
                line = s.line;
                clock += DT2;
                if (s.atDoor || clock >= every) {
                    if (s.atDoor) misses.push(t);
                    clock = 0;
                    const rest = line.slice(1);
                    rest.push({ x: joinAt(Math.max(...rest.map(z => z.x)), off), pace: paceOf(id), v: targetSpeed(2, paceOf(id), ZOMBIE.speed) });
                    id++;
                    line = rest;
                }
            }
            return misses;
        };
        expect(missesAt(6)).toEqual([]);
        expect(missesAt(8).every(t => t > 120)).toBe(true);
        expect(missesAt(12)[0]).toBeGreaterThan(30);
    });
});

describe('Zombies Makkelijk (owner 2026-11-15): Normaal\'s defence at a steady speed', () => {
    test('the option: Makkelijk, Normaal, Moeilijk; Normaal stays the default', () => {
        const niveau = SKINS.find(s => s.meta.id === 'zombies')!.meta.options!.find(o => o.id === 'niveau')!;
        expect(niveau.choices.map(c => c.value)).toEqual(['makkelijk', 'normaal', 'moeilijk']);
        expect(niveau.choices.map(c => c.label)).toEqual(['Makkelijk', 'Normaal', 'Moeilijk']);
        expect(niveau.default).toBe('normaal');
        expect(zombieLevelOf({ niveau: 'makkelijk' })).toBe('makkelijk');
        expect(zombieLevelOf({})).toBe('normaal');
        expect(DEFENCE.makkelijk).toEqual(DEFENCE.normaal);
    });

    test('speedAt per mode: Makkelijk steady at 100 %, Normaal and Moeilijk ramp to 200 % at 4:00', () => {
        for (const t of [0, 60_000, 120_000, 240_000, 600_000]) expect(speedAt(t, 'makkelijk')).toBe(1);
        for (const level of ['normaal', 'moeilijk'] as const) {
            expect(speedAt(0, level)).toBe(1);
            expect(speedAt(120_000, level)).toBeCloseTo(1.5);
            expect(speedAt(240_000, level)).toBeCloseTo(2);
            expect(speedAt(600_000, level)).toBe(RAMP.max);
        }
    });

    test('on screen: Makkelijk has the five survivors and three barricades of Normaal', () => {
        const { container } = render(<Zombies {...propsWith({ options: { niveau: 'makkelijk' } })} />);
        expect(container.querySelector('[data-niveau=makkelijk].zb-root.is-normaal')).not.toBeNull();
        expect(container.querySelectorAll('[data-survivor=safe]')).toHaveLength(5);
        expect(container.querySelectorAll('[data-barricade=up]')).toHaveLength(3);
        cleanup();
    });

    test('a 12 s pupil on Makkelijk loses no zombie in the whole 3 minutes', () => {
        const DT2 = 1 / 30;
        const off = offStreetAt(600, 160);
        let line = [0, 1, 2].map(i => ({ x: ZOMBIE.start + i * ZOMBIE.gap, pace: paceOf(i), v: targetSpeed(i, paceOf(i), ZOMBIE.speed) }));
        let id = 3;
        let clock = 0;
        const misses: number[] = [];
        for (let t = 0; t < 180; t += DT2) {
            const s = walk(line, DT2, ZOMBIE.speed * speedAt(t * 1000, 'makkelijk'), off);
            line = s.line;
            clock += DT2;
            if (s.atDoor || clock >= 12) {
                if (s.atDoor) misses.push(t);
                clock = 0;
                const rest = line.slice(1);
                rest.push({ x: joinAt(Math.max(...rest.map(z => z.x)), off), pace: paceOf(id), v: targetSpeed(2, paceOf(id), ZOMBIE.speed) });
                id++;
                line = rest;
            }
        }
        expect(misses).toEqual([]);
    });
});
