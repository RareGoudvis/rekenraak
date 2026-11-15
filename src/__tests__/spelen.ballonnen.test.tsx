// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { createSpelEvents } from '../oefenen/spelen/events';
import Ballonnen from '../oefenen/spelen/skins/ballonnen/Ballonnen';
import { BIRD, LANDS, birdAt, birdFlight, birdStart, nextLand, slotState, type SlotInput } from '../oefenen/spelen/skins/ballonnen/scenery';

// Ballonnen round 4: the bird that switches the landscape (never an answer), the wrong-answer moment
// (pfff, zigzag away, the scene shakes, the right balloon glows) and no keyboard badges in the scene.

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

describe('Ballonnen scenery', () => {
    test('the bird cycles grasland → besneeuwde bergen → palmstrand → grasland', () => {
        expect(LANDS).toEqual(['gras', 'bergen', 'strand']);
        expect(nextLand('gras')).toBe('bergen');
        expect(nextLand('bergen')).toBe('strand');
        expect(nextLand('strand')).toBe('gras');
    });

    test('the bird comes by soon after the start, then now and then; flights never overlap', () => {
        expect(birdFlight(0)).toBeNull();
        expect(birdFlight(BIRD.firstS - 0.01)).toBeNull();
        expect(birdFlight(BIRD.firstS + 1)).toMatchObject({ k: 0, dir: 1 });
        for (let k = 1; k < 40; k++) {
            const gap = birdStart(k) - birdStart(k - 1);
            expect(gap).toBeGreaterThan(BIRD.flyS + 8);
            expect(gap).toBeLessThan(BIRD.gapS + 2 * BIRD.jitterS + 0.01);
        }
        // Every moment of a long round: at most one bird, the right flight, and p runs 0..1.
        let flights = 0;
        let prev: number | null = null;
        for (let t = 0; t < 600; t += 0.05) {
            const f = birdFlight(t);
            if (f && f.k !== prev) flights++;
            if (f) {
                expect(t).toBeGreaterThanOrEqual(birdStart(f.k));
                expect(f.p).toBeGreaterThanOrEqual(0);
                expect(f.p).toBeLessThan(1);
                expect(f.dir).toBe(f.k % 2 === 0 ? 1 : -1);
            }
            prev = f ? f.k : null;
        }
        expect(flights).toBeGreaterThanOrEqual(25);
    });

    test('the bird crosses under the sign, from one edge to the other, and covers any balloon lane only briefly', () => {
        const w = 1024, top = 152, bw = 64, bh = 48, balW = 143;
        const right = { k: 0, p: 0, dir: 1 as const };
        expect(birdAt(right, w, top, bw, bh).x).toBeCloseTo(-bw);
        expect(birdAt({ ...right, p: 0.999 }, w, top, bw, bh).x).toBeGreaterThan(w - bw - 2);
        const left = { k: 1, p: 0, dir: -1 as const };
        expect(birdAt(left, w, top, bw, bh).x).toBeCloseTo(w);
        for (let p = 0; p < 1; p += 0.01) expect(birdAt({ ...right, p }, w, top, bw, bh).y).toBeGreaterThanOrEqual(top);
        // Seconds the bird overlaps a lane's balloon box (lane 2, centre at 5/8 of the width).
        const lane = [w * 0.625 - balW / 2, w * 0.625 + balW / 2];
        let covered = 0;
        for (let p = 0; p < 1; p += 0.001) {
            const { x } = birdAt({ ...right, p }, w, top, bw, bh);
            if (x + bw > lane[0] && x < lane[1]) covered += 0.001 * BIRD.flyS;
        }
        expect(covered).toBeLessThan(1.2);
    });

    test('after a wrong pick the picked balloon deflates, the right one shows itself, the rest step back', () => {
        const wrong: SlotInput = { picked: 1, fresh: null, answer: 0, flash: true, correct: false };
        expect([0, 1, 2, 3].map(i => slotState(i, wrong))).toEqual(['answer', 'deflate', 'rest', 'rest']);
        const right: SlotInput = { picked: 0, fresh: null, answer: 0, flash: true, correct: true };
        expect([0, 1, 2, 3].map(i => slotState(i, right))).toEqual(['popped', 'rest', 'rest', 'rest']);
        const next: SlotInput = { picked: null, fresh: 1, answer: -1, flash: false, correct: false };
        expect([0, 1, 2, 3].map(i => slotState(i, next))).toEqual(['idle', 'fresh', 'idle', 'idle']);
    });
});

describe('Ballonnen skin', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
        // jsdom has no layout: give the sky, the balloons and the bird a size.
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('bal') ? 224 : 40; });
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(140);
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const landOf = (c: HTMLElement) => c.querySelector<HTMLElement>('.bal-sky')!.dataset.land;

    test('a wrong pick: the balloon deflates, the scene shakes, the right balloon glows; nothing red, no key badges', () => {
        const events = createSpelEvents();
        const onAnswer = vi.fn();
        const { container, rerender } = render(<Ballonnen {...propsWith({ events, onAnswer })} />);
        expect(container.querySelector('.bal-key')).toBeNull();
        // The aria labels stay and keys 1–4 still pick.
        expect([...container.querySelectorAll('.bal')].map(b => b.getAttribute('aria-label'))).toEqual(['12', '11', '13', '22']);
        fireEvent.keyDown(window, { key: '2' });
        expect(onAnswer).toHaveBeenCalledWith('11');
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Ballonnen {...propsWith({ events, onAnswer, phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
        const slots = [...container.querySelectorAll('.bal-slot')];
        expect(slots[1].classList.contains('is-deflate')).toBe(true);
        expect(slots[0].classList.contains('is-answer')).toBe(true);
        expect(slots[0].querySelector('.bal-glow')).not.toBeNull();
        expect(container.querySelector('.bal-scene')!.classList.contains('spel-shake')).toBe(true);
        // The air puffs out of the knot.
        expect(slots[1].querySelector('.spel-burst.is-smoke')).not.toBeNull();
    });

    test('reduced motion: no shake and no puff, the deflated balloon is just shown; the bird sits on the ground', () => {
        const events = createSpelEvents();
        const { container, rerender } = render(<Ballonnen {...propsWith({ events, reducedMotion: true })} />);
        fireEvent.pointerDown(container.querySelectorAll('.bal')[1], { button: 0 });
        act(() => events.emit('wrong', { given: '11', expected: '12' }));
        rerender(<Ballonnen {...propsWith({ events, reducedMotion: true, phase: 'wrong', feedback: { given: '11', expected: '12', correct: false } })} />);
        expect(container.querySelector('.bal-scene')!.classList.contains('spel-shake')).toBe(false);
        expect(container.querySelector('.spel-burst')).toBeNull();
        expect(container.querySelector('.bal-sky.is-still .bal-slot.is-deflate')).not.toBeNull();
        expect(container.querySelector<HTMLElement>('.bal-bird')!.dataset.k).toBe('perch');
    });

    test('tapping the bird switches the landscape round the three, never answers and never counts', () => {
        const onAnswer = vi.fn();
        const sound = vi.fn();
        const { container } = render(<Ballonnen {...propsWith({ onAnswer, sound, reducedMotion: true })} />);
        const bird = container.querySelector<HTMLElement>('.bal-bird')!;
        const start = landOf(container);
        const seen = [start];
        for (let n = 0; n < 3; n++) {
            fireEvent.pointerDown(bird, { button: 0 });
            seen.push(landOf(container));
        }
        expect(seen).toEqual([start, nextLand(start as never), nextLand(nextLand(start as never)), start]);
        expect(onAnswer).not.toHaveBeenCalled();
        expect(sound).toHaveBeenCalledWith('flip');
        expect(container.querySelectorAll('.bal-land.is-on')).toHaveLength(1);
    });

    test('the flying bird: away between flights, in the air on schedule, a tap sends it off once; help freezes it', () => {
        const onAnswer = vi.fn();
        const { container, rerender } = render(<Ballonnen {...propsWith({ onAnswer })} />);
        const bird = container.querySelector<HTMLElement>('.bal-bird')!;
        const start = landOf(container);
        wait(1000);
        expect(bird.dataset.k).toBe('');
        // A tap on an empty sky changes nothing.
        fireEvent.pointerDown(bird, { button: 0 });
        expect(landOf(container)).toBe(start);
        wait((BIRD.firstS + 1) * 1000);
        expect(bird.dataset.k).toBe('0');
        const at = bird.style.transform;
        wait(200);
        expect(bird.style.transform).not.toBe(at);
        fireEvent.pointerDown(bird, { button: 0 });
        expect(landOf(container)).toBe(nextLand(start as never));
        expect(bird.dataset.flee).toBe('1');
        // A second tap on the fleeing bird does nothing.
        fireEvent.pointerDown(bird, { button: 0 });
        expect(landOf(container)).toBe(nextLand(start as never));
        expect(onAnswer).not.toHaveBeenCalled();
        rerender(<Ballonnen {...propsWith({ onAnswer, phase: 'help' })} />);
        wait(16);
        const frozen = bird.style.transform;
        wait(1500);
        expect(bird.style.transform).toBe(frozen);
    });
});
