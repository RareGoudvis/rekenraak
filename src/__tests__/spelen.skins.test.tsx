// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, cleanup, screen, act, fireEvent } from '@testing-library/react';
import { SKINS } from '../oefenen/spelen/skins/registry';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import Pinguintoren from '../oefenen/spelen/skins/pinguintoren/Pinguintoren';
import { towerScale } from '../oefenen/spelen/skins/pinguintoren/tower';
import Zombies from '../oefenen/spelen/skins/zombies/Zombies';
import { ZOMBIE } from '../oefenen/spelen/skins/zombies/walk';
import Ballonnen from '../oefenen/spelen/skins/ballonnen/Ballonnen';
import { FLOAT, floatAt, floatPace, floatPath, phaseAt, readableAt, type FloatGeom } from '../oefenen/spelen/skins/ballonnen/float';

// The skins as components: each registry entry renders, and the session's phase, progress and events
// drive what is drawn (blocks, wobble, the falling block, the paused look).

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
});

function propsWith(over: Partial<SkinProps> = {}): SkinProps {
    return {
        question: { key: 'q1', text: '7 + 5 = ?', index: 0 },
        choices: ['12', '11', '13', '22'],
        phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
        progress: progressWith(), options: {}, events: createSpelEvents(), reducedMotion: false,
        ...over,
    };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Spelen skins', () => {
    test('every registry entry renders its skin (lazy) with the sum and its input', async () => {
        expect(SKINS.every(s => s.Component || s.Screen)).toBe(true);
        // A Screen game (Touwtrekken) and the board games (spelen.board.test.tsx) have their own suites.
        for (const { meta, Component } of SKINS.filter(s => s.Component && s.meta.input !== 'board')) {
            const Skin = Component!;
            const p = propsWith({
                choices: meta.input === 'choice' ? ['12', '11', '13', '22'] : null,
                progress: progressWith({ goal: meta.round.goal ? { count: 0, target: meta.round.goal } : null, msLeft: meta.timed ? 60_000 : null }),
            });
            const { unmount } = render(<Suspense fallback={null}><Skin {...p} /></Suspense>);
            // 5 s: a cold lazy load of a big skin (Voetbal, Kasteel) can pass the 1 s default under a busy gate.
            if (meta.input === 'keypad') expect(await screen.findByRole('group', { name: 'Cijfers' }, { timeout: 5000 })).toBeTruthy();
            else expect(await screen.findByRole('group', { name: 'Kies het antwoord' }, { timeout: 5000 })).toBeTruthy();
            expect(screen.getAllByText('7 + 5 = ?').length).toBeGreaterThan(0);
            unmount();
        }
    });

    test('Pinguïntoren: a block per climb step; right stacks with a drop-in, wrong wobbles and cracks the lowest blocks', () => {
        const events = createSpelEvents();
        const at = (count: number, over: Partial<SkinProps> = {}, mistakes = 0) => propsWith({ events, choices: null, progress: progressWith({ goal: { count, target: 20 }, mistakes }), ...over });
        const { container, rerender } = render(<Pinguintoren {...at(3)} />);
        const blocks = () => container.querySelectorAll('.pt-tower .pt-block').length;
        expect(blocks()).toBe(3);
        expect(container.querySelector('.is-new')).toBeNull();
        rerender(<Pinguintoren {...at(4, { phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
        expect(blocks()).toBe(4);
        expect(container.querySelector('.pt-block.is-new')).not.toBeNull();
        expect(container.querySelector('.pt-hop')).not.toBeNull();
        // The sign shows the sum with its answer during the flash.
        expect(container.querySelector('.pt-sign-answer')?.textContent).toBe('12');
        // A counted mistake (the climb one down): the two lowest blocks crack; the block it owes stays (spelen.pinguintoren.test.tsx).
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Pinguintoren {...at(3, { phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } }, 1)} />);
        expect(blocks()).toBe(4);
        expect(container.querySelector('.pt-tower.is-wobble-1')).not.toBeNull();
        expect(container.querySelectorAll('.pt-tower .spel-cracks')).toHaveLength(2);
        expect(container.querySelector('.is-new')).toBeNull();
        // A second mistake restarts the wobble with the other copy of the animation.
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(container.querySelector('.pt-tower.is-wobble-0')).not.toBeNull();
        // Paused under "Hoe los ik dit op?"; still under reduced motion (the break without flying halves).
        rerender(<Pinguintoren {...at(2, { phase: 'help', reducedMotion: true }, 2)} />);
        expect(container.querySelector('.pt-root.is-paused.is-still')).not.toBeNull();
        expect(blocks()).toBe(2);
        expect(container.querySelector('.pt-half')).toBeNull();
    });

    test('Pinguïntoren: the keypad answers through the session, only while playing', () => {
        const onAnswer = vi.fn();
        const { rerender } = render(<Pinguintoren {...propsWith({ onAnswer, choices: null })} />);
        fireEvent.keyDown(window, { key: '1' });
        fireEvent.keyDown(window, { key: '2' });
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onAnswer).toHaveBeenCalledWith('12');
        rerender(<Pinguintoren {...propsWith({ onAnswer, choices: null, question: { key: 'q2', text: '8 + 5 = ?', index: 1 }, phase: 'help' })} />);
        fireEvent.keyDown(window, { key: '3' });
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    test('Pinguïntoren: the camera zooms out as the tower grows, and shows the goal line near the top', () => {
        expect(towerScale(0, 20)).toBe(1);
        expect(towerScale(5, 20)).toBe(1);
        expect(towerScale(12, 20)).toBeLessThan(1);
        // Near the goal the zoom also fits the flag; it never grows back while climbing.
        const scales = Array.from({ length: 21 }, (_, n) => towerScale(n, 20));
        expect(scales.every((s, i) => i === 0 || s <= scales[i - 1])).toBe(true);
    });

    describe('Zombies skin', () => {
        beforeEach(() => { vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] }); });
        const frontX = (c: HTMLElement) => Number(c.querySelector('[data-zombie=front]')!.getAttribute('data-x'));
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
        const at = (events: ReturnType<typeof createSpelEvents>, over: Partial<SkinProps> = {}) =>
            propsWith({ events, choices: null, progress: progressWith({ msLeft: 180_000 }), ...over });

        test('the front zombie carries the sum, the others a question mark; they walk only while the sum waits, never under help', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...at(events)} />);
            const signs = [...container.querySelectorAll('.zb-sign')].map(el => el.textContent);
            expect(signs).toEqual(['7 + 5 = ?', '?', '?']);
            expect(frontX(container)).toBe(ZOMBIE.start);
            wait(1000);
            const x1 = frontX(container);
            expect(x1).toBeLessThan(ZOMBIE.start - 3);
            // Hoe los ik dit op: everything holds still, the CSS too.
            rerender(<Zombies {...at(events, { phase: 'help' })} />);
            wait(5000);
            expect(frontX(container)).toBe(x1);
            expect(container.querySelector('.zb-root.is-paused')).not.toBeNull();
            rerender(<Zombies {...at(events)} />);
            wait(1000);
            expect(frontX(container)).toBeLessThan(x1);
            // A faster walk with a streak (eased in, never a jump).
            rerender(<Zombies {...at(events, { progress: progressWith({ streak: 8, msLeft: 100_000 }) })} />);
            wait(1000);
            const x2 = frontX(container);
            wait(1000);
            expect(x2 - frontX(container)).toBeGreaterThan((ZOMBIE.start - x1) * 1.5);
        });

        test('right flops the front one over; wrong brings it a step closer (no stun); the next sum goes to the next one', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...at(events)} />);
            wait(500);
            const x = frontX(container);
            act(() => events.emit('wrong', { given: '11', expected: '12' }));
            rerender(<Zombies {...at(events, { phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
            expect(frontX(container)).toBeCloseTo(x - ZOMBIE.step, 1);
            // No wobble: a wrong answer stuns no zombie (owner 2026-11-15); it only steps closer.
            expect(container.querySelector('.zb-zombie[class*=wobble]')).toBeNull();
            // The flash shows the right answer on the sign.
            expect(container.querySelector('.zb-sign.is-front')!.textContent).toBe('7 + 5 = 12');
            // Same zombie, next sum.
            const id = container.querySelector('[data-zombie=front]');
            rerender(<Zombies {...at(events, { question: { key: 'q2', text: '8 + 5 = ?', index: 1 } })} />);
            expect(container.querySelector('[data-zombie=front]')).toBe(id);
            expect(container.querySelector('.zb-sign.is-front')!.textContent).toBe('8 + 5 = ?');
            act(() => events.emit('correct', { given: '13', streak: 1 }));
            rerender(<Zombies {...at(events, { phase: 'right', question: { key: 'q2', text: '8 + 5 = ?', index: 1 }, feedback: { given: '13', expected: '13', correct: true } })} />);
            expect(container.querySelector('[data-zombie=front] .zb-zombie.is-flop')).not.toBeNull();
            expect(container.querySelectorAll('.zb-smoke .zb-puff').length).toBeGreaterThan(0);
            rerender(<Zombies {...at(events, { question: { key: 'q3', text: '9 + 5 = ?', index: 2 } })} />);
            expect(container.querySelector('[data-zombie=front]')).not.toBe(id);
            expect(container.querySelectorAll('.zb-lane:not([data-zombie=down])')).toHaveLength(ZOMBIE.count);
            expect(container.querySelector('.zb-sign.is-front')!.textContent).toBe('9 + 5 = ?');
        });

        test('at the barricade it bumps (boing) and the sum counts as a miss, once; the first one only breaks a barricade', () => {
            const events = createSpelEvents();
            const onMiss = vi.fn();
            const onFail = vi.fn();
            const sound = vi.fn();
            const { container } = render(<Zombies {...at(events, { onMiss, onFail, sound })} />);
            wait(30_000);
            expect(onMiss).toHaveBeenCalledTimes(1);
            expect(sound).toHaveBeenCalledWith('barricade');
            expect(onFail).not.toHaveBeenCalled();
            expect(container.querySelector('[data-zombie=front] .zb-zombie.is-boing')).not.toBeNull();
            expect(frontX(container)).toBe(0);
        });

        test('reduced motion: no smoke and no stars', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...at(events, { reducedMotion: true })} />);
            act(() => events.emit('correct', { given: '12', streak: 1 }));
            rerender(<Zombies {...at(events, { reducedMotion: true, phase: 'right' })} />);
            expect(container.querySelector('.zb-root.is-still .zb-zombie.is-flop')).not.toBeNull();
            expect(container.querySelector('.zb-smoke')).toBeNull();
        });
    });

    describe('Ballonnen float', () => {
        // Measured stages: iPad landscape (1024 × 768, 1180 × 820), iPad portrait, phone upright and on its side.
        const STAGES: Record<string, FloatGeom> = {
            '1024x768': { w: 1024, h: 714, bw: 143, bh: 229, numAt: 77, numHalf: 22, top: 152 },
            '1180x820': { w: 1180, h: 764, bw: 150, bh: 240, numAt: 81, numHalf: 23, top: 157 },
            '768x1024': { w: 768, h: 970, bw: 107, bh: 171, numAt: 58, numHalf: 18, top: 152 },
            '390x844': { w: 390, h: 796, bw: 68, bh: 109, numAt: 37, numHalf: 12, top: 118 },
            '740x360': { w: 740, h: 306, bw: 64, bh: 102, numAt: 34, numHalf: 12, top: 120 },
        };

        test.each(Object.keys(STAGES))('%s: at least three numbers readable at every moment of a long round', key => {
            const g = STAGES[key];
            const path = floatPath(g);
            for (let tau = 0; tau < 400; tau += 0.05) {
                const n = [0, 1, 2, 3].filter(i => readableAt(path, i, tau)).length;
                if (n < 3) throw new Error(`${key}: ${n} readable at ${tau.toFixed(2)} s`);
            }
        });

        test('a loop rises bottom to top and wraps out of sight; steady in the band; a crossing takes 8 to 12 s', () => {
            const g = STAGES['1024x768'];
            const path = floatPath(g);
            // Starts just under the stage, ends just over it: the wrap is never on screen.
            expect(path.yAt(0)).toBeCloseTo(g.h, 0);
            expect(path.yAt(0.9999)).toBeLessThan(-g.bh + 2);
            const ys = Array.from({ length: 200 }, (_, k) => path.yAt(k / 200));
            expect(ys.every((y, k) => k === 0 || y < ys[k - 1])).toBe(true);
            // A steady pace inside the band (no speed-up while the number can be read).
            const [d0, d1] = path.band;
            const inBand = Array.from({ length: 198 }, (_, k) => k / 200).filter(p => path.dAt(p) > d0 + 2 && path.dAt(p + 0.005) < d1 - 2);
            const steps = inBand.map(p => path.dAt(p + 0.005) - path.dAt(p));
            expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(0.05 * Math.max(...steps));
            // A loop is a crossing plus the quick wrap; faster with the streak, at most 20 %.
            expect(FLOAT.loopS / floatPace(0)).toBeGreaterThanOrEqual(8);
            expect(FLOAT.loopS / floatPace(0)).toBeLessThanOrEqual(12);
            expect(FLOAT.loopS / floatPace(100)).toBeGreaterThanOrEqual(8);
            expect(floatPace(5)).toBeGreaterThan(floatPace(0));
        });

        test('each balloon keeps its own lane and pace; reduced motion stands still inside the band', () => {
            const g = STAGES['1024x768'];
            const path = floatPath(g);
            const xs = [0, 1, 2, 3].map(i => floatAt(g, path, i, 3).x);
            expect(xs.every((x, i) => i === 0 || x - xs[i - 1] > g.bw)).toBe(true);
            // Different paces: the four phase steps over one second are not all the same.
            const step = [0, 1, 2, 3].map(i => +((phaseAt(i, 4) - phaseAt(i, 3) + 1) % 1).toFixed(3));
            expect(new Set(step).size).toBeGreaterThan(1);
            for (const i of [0, 1, 2, 3]) {
                const d = g.h - floatAt(g, path, i, null).y;
                expect(d).toBeGreaterThan(path.band[0]);
                expect(d).toBeLessThan(path.band[1]);
            }
        });
    });

    describe('Ballonnen skin', () => {
        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
            // jsdom has no layout: give the sky and the balloons a size.
            vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
            vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('bal') ? 224 : 40; });
            vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(140);
        });
        const ys = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.bal-slot')].map(el => Number(el.dataset.y));
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

        test('the balloons rise while the sum waits and freeze under help', () => {
            const { container, rerender } = render(<Ballonnen {...propsWith()} />);
            const a = ys(container);
            expect(a.every(Number.isFinite)).toBe(true);
            wait(1000);
            const b = ys(container);
            expect(b.filter((y, i) => y < a[i]).length).toBeGreaterThanOrEqual(3);
            rerender(<Ballonnen {...propsWith({ phase: 'help' })} />);
            wait(16);
            const c = ys(container);
            wait(3000);
            expect(ys(container)).toEqual(c);
            expect(container.querySelector('.bal-sky.is-paused')).not.toBeNull();
        });

        test('a tap counts on pointer down; the next question keeps the balloons and swaps the numbers; the popped one comes back', () => {
            const onAnswer = vi.fn();
            const { container, rerender } = render(<Ballonnen {...propsWith({ onAnswer })} />);
            const slots = [...container.querySelectorAll('.bal-slot')];
            fireEvent.pointerDown(container.querySelectorAll('.bal')[0], { button: 0 });
            expect(onAnswer).toHaveBeenCalledWith('12');
            rerender(<Ballonnen {...propsWith({ onAnswer, phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
            expect(container.querySelector('.bal-slot.is-popped')).toBe(slots[0]);
            rerender(<Ballonnen {...propsWith({ onAnswer, question: { key: 'q2', text: '8 + 5 = ?', index: 1 }, choices: ['14', '13', '3', '12'] })} />);
            expect([...container.querySelectorAll('.bal-slot')]).toEqual(slots);
            expect([...container.querySelectorAll('.bal-num')].map(n => n.textContent)).toEqual(['14', '13', '3', '12']);
            expect(container.querySelector('.bal-slot.is-fresh')).toBe(slots[0]);
            // Keys 1–4 still pick by balloon number.
            fireEvent.keyDown(window, { key: '2' });
            expect(onAnswer).toHaveBeenLastCalledWith('13');
        });
    });
});
