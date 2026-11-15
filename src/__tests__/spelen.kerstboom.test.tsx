// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import Kerstboom from '../oefenen/spelen/skins/kerstboom/Kerstboom';
import { DROP_AFTER, droppable, startDrops, stepDrops, type DropState } from '../oefenen/spelen/skins/kerstboom/drops';
import {
    DECOR, DECOR_ALL, PRESENTS, VIEW_H, VIEW_W, VIEW_X, decorAt, floorSpot, presentsFor, rollSpin,
} from '../oefenen/spelen/skins/kerstboom/tree';
import { createSpelEvents } from '../oefenen/spelen/events';
import type { SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';

// Kerstboom versieren, round 4: the decorations, the presents, and the fallen bauble (drops.ts).

afterEach(() => { cleanup(); vi.useRealTimers(); });

// The counters after an answer, the way the session moves them (goalKeep: a mistake leaves the climb alone).
const ok = (s: DropState, hung: number) => stepDrops(s, { right: s.right + 1, mistakes: s.mistakes, hung });
const oops = (s: DropState, hung: number) => stepDrops(s, { right: s.right, mistakes: s.mistakes + 1, hung });

describe('the decorations', () => {
    test('14 before the star, in variety: baubles in 3 shapes, 3 patterns and 4+ colours, light strings, tinsel, canes, a little star', () => {
        expect(DECOR).toHaveLength(DECOR_ALL - 1);
        const baubles = DECOR.flatMap(d => (d.kind === 'bauble' ? [d] : []));
        expect(new Set(baubles.map(b => b.shape)).size).toBe(3);
        expect(new Set(baubles.map(b => b.pattern)).size).toBeGreaterThanOrEqual(4);
        expect(new Set(baubles.map(b => b.c)).size).toBeGreaterThanOrEqual(4);
        expect(DECOR.filter(d => d.kind === 'lights').length).toBeGreaterThanOrEqual(2);
        for (const kind of ['tinsel', 'cane', 'starlet'] as const) expect(DECOR.some(d => d.kind === kind)).toBe(true);
        // Something new within the first four answers: never four baubles in a row.
        expect(new Set(DECOR.slice(0, 4).map(d => d.kind)).size).toBeGreaterThanOrEqual(3);
    });

    test('every decoration and present sits inside the room', () => {
        for (const d of DECOR) {
            const [x, y] = decorAt(d);
            expect(x).toBeGreaterThan(VIEW_X);
            expect(x).toBeLessThan(VIEW_X + VIEW_W);
            expect(y).toBeGreaterThan(0);
            expect(y).toBeLessThan(VIEW_H);
        }
        for (const p of PRESENTS) expect(p.base).toBeLessThanOrEqual(VIEW_H);
    });

    test('presents pile up through the round, all of them under the finished tree', () => {
        const counts = Array.from({ length: DECOR_ALL + 1 }, (_, h) => presentsFor(h).length);
        expect(counts[0]).toBe(0);
        for (let h = 1; h < counts.length; h++) expect(counts[h]).toBeGreaterThanOrEqual(counts[h - 1]);
        expect(counts[DECOR_ALL]).toBe(PRESENTS.length);
        expect(counts[7]).toBeGreaterThan(1);
        expect(counts[7]).toBeLessThan(PRESENTS.length);
    });

    test('fallen baubles get their own floor spots, inside the room; round ones roll, the others lie on their side', () => {
        const xs = Array.from({ length: 8 }, (_, n) => floorSpot(n));
        expect(new Set(xs).size).toBe(8);
        for (const x of Array.from({ length: 16 }, (_, n) => floorSpot(n))) {
            expect(x).toBeGreaterThan(VIEW_X);
            expect(x).toBeLessThan(VIEW_X + VIEW_W);
        }
        expect(rollSpin(0, 'round')).toBe(0);
        expect(Math.sign(rollSpin(60, 'round'))).toBe(-1);
        expect(Math.sign(rollSpin(-60, 'round'))).toBe(1);
        for (const dx of [-120, -20, 0, 35, 140]) expect(Math.abs(rollSpin(dx, 'drop') % 180)).toBe(90);
    });
});

describe('the fallen bauble (drops.ts)', () => {
    test(`${DROP_AFTER} counted mistakes in a row knock the newest hung bauble off; one does not`, () => {
        expect(DROP_AFTER).toBe(2);
        let s = startDrops();
        for (let i = 0; i < 4; i++) s = ok(s, i + 1);
        s = oops(s, 4);
        expect(s.fallen).toEqual([]);
        s = oops(s, 4);
        // Hung 0..3 = bauble, tinsel, bauble, cane: the newest bauble is spot 2.
        expect(s.gaps).toEqual([2]);
        expect(s.fallen).toEqual([{ spot: 2, n: 0 }]);
        expect(s.run).toBe(0);
    });

    test('a right answer between two mistakes breaks the run', () => {
        let s = ok(ok(startDrops(), 1), 2);
        s = oops(s, 2);
        s = ok(s, 3);
        s = oops(s, 3);
        expect(s.fallen).toEqual([]);
    });

    test('no progress lost: the next right answer hangs a fresh bauble in the gap; the fallen one stays on the floor', () => {
        let s = startDrops();
        for (let i = 0; i < 6; i++) s = ok(s, i + 1);
        s = oops(oops(s, 6), 6);
        expect(s.gaps).toEqual([5]);
        s = ok(s, 7);
        expect(s.gaps).toEqual([]);
        expect(s.refilled).toEqual([5]);
        expect(s.fallen).toHaveLength(1);
        // The next answer is ordinary again.
        s = ok(s, 8);
        expect(s.refilled).toEqual([]);
    });

    test('six in a row: three baubles fall, the newest first; with none left on the tree nothing more falls', () => {
        let s = startDrops();
        for (let i = 0; i < 6; i++) s = ok(s, i + 1);
        for (let i = 0; i < 6; i++) s = oops(s, 6);
        expect(s.fallen.map(f => f.spot)).toEqual([5, 2, 0]);
        expect(s.fallen.map(f => f.n)).toEqual([0, 1, 2]);
        expect(droppable(6, s.gaps)).toBeNull();
        expect(oops(oops(s, 6), 6).fallen).toHaveLength(3);
    });

    test('nothing hangs yet (or only lights and garlands): nothing falls', () => {
        let s = oops(oops(startDrops(), 0), 0);
        expect(s.fallen).toEqual([]);
        expect(s.run).toBe(0);
        expect(droppable(0, [])).toBeNull();
        expect(droppable(2, [0])).toBeNull();
        s = oops(s, 0);
        expect(s.run).toBe(1);
    });

    test('met hulp: an uncounted answer leaves the run alone; a new round on the same screen starts an empty floor', () => {
        let s = ok(startDrops(), 1);
        s = oops(s, 1);
        // A helped wrong answer: neither counter moves, so nothing changes (the same state object).
        expect(stepDrops(s, { right: s.right, mistakes: s.mistakes, hung: 1 })).toBe(s);
        s = oops(s, 1);
        expect(s.fallen).toHaveLength(1);
        const fresh = stepDrops(s, { right: 0, mistakes: 0, hung: 0 });
        expect(fresh).toEqual(startDrops());
    });
});

describe('on screen', () => {
    const progress = (right: number, mistakes: number): SkinProgress => ({
        answered: right + mistakes, total: 30, score: right, streak: 0, bestStreak: 0, msLeft: null,
        goal: { count: right, target: 15 }, right, mistakes, misses: 0, msTotal: null,
    });

    function setup(reducedMotion: boolean) {
        const sound = vi.fn();
        const props = (right: number, mistakes: number): SkinProps => ({
            question: { key: `q${right}-${mistakes}`, text: '7 + 5 = ?', index: right + mistakes }, choices: null, phase: 'play', feedback: null,
            onAnswer: () => { }, onHelp: () => { }, onMiss: () => { }, onFail: () => { }, sound, progress: progress(right, mistakes), options: {},
            events: createSpelEvents(), reducedMotion,
        });
        const view = render(<Kerstboom {...props(0, 0)} />);
        return { ...view, props, sound };
    }

    test('two mistakes in a row: a bauble leaves the tree, lies on the floor with a tink, and the next right answer fills the gap', () => {
        vi.useFakeTimers();
        const { container, rerender, props, sound } = setup(false);
        const decor = () => container.querySelectorAll('.kb-decor').length;
        rerender(<Kerstboom {...props(5, 0)} />);
        expect(decor()).toBe(5);
        rerender(<Kerstboom {...props(5, 1)} />);
        expect(container.querySelector('.kb-fall')).toBeNull();
        rerender(<Kerstboom {...props(5, 2)} />);
        expect(decor()).toBe(4);
        expect(container.querySelectorAll('.kb-fall')).toHaveLength(1);
        expect(sound).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(600); });
        expect(sound).toHaveBeenCalledWith('hit');
        rerender(<Kerstboom {...props(6, 2)} />);
        expect(decor()).toBe(6);
        expect(container.querySelectorAll('.kb-fall')).toHaveLength(1);
        expect(container.querySelectorAll('.kb-decor.is-new')).toHaveLength(2);
    });

    test('presents arrive with the decorations; no number in the scene art', () => {
        const { container, rerender, props } = setup(true);
        expect(container.querySelectorAll('.kb-present')).toHaveLength(0);
        rerender(<Kerstboom {...props(9, 0)} />);
        expect(container.querySelectorAll('.kb-present')).toHaveLength(presentsFor(9).length);
        expect(container.querySelector('.kb-world')!.textContent).toBe('');
    });
});
