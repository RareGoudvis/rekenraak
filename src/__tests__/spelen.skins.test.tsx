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
import { ZOMBIE, joinAt, stepCloser, walk, zombieSpeed } from '../oefenen/spelen/skins/zombies/walk';

// The skins as components: each registry entry renders, and the session's phase, progress and events
// drive what is drawn (blocks, wobble, the falling block, the paused look).

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, ...over,
});

function propsWith(over: Partial<SkinProps> = {}): SkinProps {
    return {
        question: { key: 'q1', text: '7 + 5 = ?', index: 0 },
        choices: ['12', '11', '13', '22'],
        phase: 'play', feedback: null,
        onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(),
        progress: progressWith(), events: createSpelEvents(), reducedMotion: false,
        ...over,
    };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Spelen skins', () => {
    test('every registry entry renders its skin (lazy) with the sum and its input', async () => {
        expect(SKINS.every(s => s.Component)).toBe(true);
        for (const { meta, Component } of SKINS) {
            const Skin = Component!;
            const p = propsWith({
                choices: meta.input === 'choice' ? ['12', '11', '13', '22'] : null,
                progress: progressWith({ goal: meta.round.goal ? { count: 0, target: meta.round.goal } : null, msLeft: meta.timed ? 60_000 : null }),
            });
            const { unmount } = render(<Suspense fallback={null}><Skin {...p} /></Suspense>);
            if (meta.input === 'keypad') expect(await screen.findByRole('group', { name: 'Cijfers' })).toBeTruthy();
            else expect(await screen.findByRole('group', { name: 'Kies het antwoord' })).toBeTruthy();
            expect(screen.getAllByText('7 + 5 = ?').length).toBeGreaterThan(0);
            unmount();
        }
    });

    test('Pinguïntoren: a block per climb step; right stacks with a drop-in, wrong wobbles and drops the top block', () => {
        const events = createSpelEvents();
        const at = (count: number, over: Partial<SkinProps> = {}) => propsWith({ events, choices: null, progress: progressWith({ goal: { count, target: 20 } }), ...over });
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
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Pinguintoren {...at(3, { phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
        expect(blocks()).toBe(3);
        expect(container.querySelector('.pt-tower.is-wobble-1')).not.toBeNull();
        expect(container.querySelectorAll('.pt-fall .pt-block')).toHaveLength(1);
        expect(container.querySelector('.is-new')).toBeNull();
        // A second mistake restarts the wobble with the other copy of the animation.
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        expect(container.querySelector('.pt-tower.is-wobble-0')).not.toBeNull();
        // Paused under "Hoe los ik dit op?"; still under reduced motion (no falling block).
        rerender(<Pinguintoren {...at(2, { phase: 'help', reducedMotion: true })} />);
        expect(container.querySelector('.pt-root.is-paused.is-still')).not.toBeNull();
        expect(container.querySelector('.pt-fall')).toBeNull();
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

    test('Zombies walk: speed rises slowly with the streak and drops back; the line keeps its gaps', () => {
        expect(zombieSpeed(0)).toBe(ZOMBIE.speed);
        expect(zombieSpeed(3)).toBeCloseTo(ZOMBIE.speed * 1.3);
        expect(zombieSpeed(50)).toBe(zombieSpeed(ZOMBIE.maxStreak));
        expect(zombieSpeed(ZOMBIE.maxStreak)).toBeLessThan(ZOMBIE.speed * 2);
        // The front reaches the door and stops there; the others wait a gap behind and never closer than nextMin.
        const a = walk([3, 40, 70], 1, 4);
        expect(a.atDoor).toBe(true);
        expect(a.xs[0]).toBe(0);
        expect(a.xs[1]).toBe(ZOMBIE.nextMin);
        expect(a.xs[2]).toBe(ZOMBIE.nextMin + ZOMBIE.gap);
        expect(walk([50, 90], 1, 4)).toEqual({ xs: [46, 86], atDoor: false });
        // Off the street they run in, so the next sum is soon on screen.
        expect(walk([130, 160], 1, 4).xs[0]).toBe(130 - ZOMBIE.enter);
        // A wrong answer: a step closer, never onto the door, never back.
        expect(stepCloser(50)).toBe(50 - ZOMBIE.step);
        expect(stepCloser(10)).toBe(ZOMBIE.stepMin);
        expect(stepCloser(2)).toBe(2);
        expect(joinAt(null)).toBe(ZOMBIE.start);
        expect(joinAt(80)).toBe(100 + ZOMBIE.gap);
        expect(joinAt(120)).toBe(120 + ZOMBIE.gap);
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
            // A faster walk with a streak.
            const x2 = frontX(container);
            rerender(<Zombies {...at(events, { progress: progressWith({ streak: 8, msLeft: 100_000 }) })} />);
            wait(1000);
            expect(x2 - frontX(container)).toBeGreaterThan((x1 - x2) * 1.5);
        });

        test('right flops the front one over; wrong brings it a step closer with a wobble; the next sum goes to the next one', () => {
            const events = createSpelEvents();
            const { container, rerender } = render(<Zombies {...at(events)} />);
            wait(500);
            const x = frontX(container);
            act(() => events.emit('wrong', { given: '11', expected: '12' }));
            rerender(<Zombies {...at(events, { phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
            expect(frontX(container)).toBeCloseTo(x - ZOMBIE.step, 1);
            expect(container.querySelector('[data-zombie=front] .zb-zombie.is-wobble-1')).not.toBeNull();
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
            expect(container.querySelectorAll('.zb-lane')).toHaveLength(ZOMBIE.count);
            expect(container.querySelector('.zb-sign.is-front')!.textContent).toBe('9 + 5 = ?');
        });

        test('at the door it bumps (boing) and the sum counts as a miss, once; nothing ends early', () => {
            const events = createSpelEvents();
            const onMiss = vi.fn();
            const { container } = render(<Zombies {...at(events, { onMiss })} />);
            wait(30_000);
            expect(onMiss).toHaveBeenCalledTimes(1);
            expect(container.querySelector('[data-zombie=front] .zb-zombie.is-boing')).not.toBeNull();
            expect(container.querySelector('.zb-house.is-bumped')).not.toBeNull();
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
});
