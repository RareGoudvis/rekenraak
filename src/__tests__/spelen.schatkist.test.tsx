// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinMeta, SkinPhase, SkinResult } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import Schatkist, { SchatkistEnding } from '../oefenen/spelen/skins/schatkist/Schatkist';
import { CHESTS, newHunt, nextChest, reveal, tryCode } from '../oefenen/spelen/skins/schatkist/code';
import { CRAB_AFTER, coinsOf, crabTarget, earnTo, gem, gemsOf, heapSlot, lootLine, newHeap, right, steal, wrong, HEAP_SLOTS, HEAP_X, HEAP_Y, SHORE, type Heap } from '../oefenen/spelen/skins/schatkist/heap';
import { DAY, HORIZON, SUNSET, skyAt, skyFor } from '../oefenen/spelen/skins/schatkist/sky';
import { resetKiosk } from './helpers/oefenKiosk';

// Schatkist round 4: the loot heap, the crab, the sun on the clock (Met tijd) and the open-ended timed hunt.

describe('the heap and the crab (pure)', () => {
    test('the heap follows the score: a coin per counted answer from the first one; a chest adds a gem; a right answer ends the wrong run', () => {
        let h = earnTo(newHeap(), 1);
        expect(h.items.map(l => l.kind)).toEqual(['coin']);
        // Paid out once: the same score adds nothing (met hulp never raises it).
        expect(earnTo(h, 1)).toBe(h);
        h = gem(earnTo(h, 3));
        expect(h.items.map(l => l.kind)).toEqual(['coin', 'coin', 'coin', 'gem']);
        expect(h.earned).toBe(3);
        h = wrong(h).heap;
        expect(h.run).toBe(1);
        expect(right(h).run).toBe(0);
        expect(new Set(h.items.map(l => l.id)).size).toBe(4);
    });

    test('the third wrong sum in a row sends the crab for the newest coin or gem; it is gone for good, the run starts over', () => {
        let h: Heap = gem(earnTo(newHeap(), 2));
        const newest = h.items[2];
        for (let i = 1; i < CRAB_AFTER; i++) {
            const w = wrong(h);
            expect(w.crab).toBeNull();
            h = w.heap;
        }
        const w = wrong(h);
        expect(w.crab).toEqual(newest);
        expect(w.heap.run).toBe(0);
        // Only the crab takes it: wrong() leaves the heap as it is.
        expect(w.heap.items).toHaveLength(3);
        h = steal(w.heap, newest.id);
        expect(h.items.map(l => l.kind)).toEqual(['coin', 'coin']);
        expect(h).toMatchObject({ stolen: 1, earned: 2 });
        expect(steal(h, newest.id)).toBe(h);
        expect(crabTarget(h)).toEqual(h.items[1]);
        // A stolen coin is not paid out again: the heap follows new answers only.
        h = earnTo(steal(h, h.items[1].id), 3);
        expect([coinsOf(h), gemsOf(h), h.stolen]).toEqual([2, 0, 2]);
    });

    test('an empty heap or a crab still busy: no crab, the run still starts over', () => {
        let h = newHeap();
        for (let i = 0; i < CRAB_AFTER - 1; i++) h = wrong(h).heap;
        expect(wrong(h)).toEqual({ heap: { ...h, run: 0 }, crab: null });
        h = earnTo(newHeap(), 1);
        for (let i = 0; i < CRAB_AFTER - 1; i++) h = wrong(h).heap;
        expect(wrong(h, true).crab).toBeNull();
        expect(wrong(h, true).heap.run).toBe(0);
    });

    test('the loot line: what is left, and what the crab took', () => {
        expect(lootLine(newHeap())).toBe('nog niets in je schat');
        expect(lootLine(earnTo(newHeap(), 1))).toBe('1 munt in je schat');
        const h = gem(earnTo(newHeap(), 9));
        expect(lootLine(h)).toBe('9 munten en 1 edelsteen in je schat');
        const robbed = steal(steal(h, h.items[3].id), h.items[4].id);
        expect(lootLine(robbed)).toBe('7 munten en 1 edelsteen in je schat, de krab pikte er 2');
    });

    test('the slots make a heap right of the chest that grows outwards and upwards; the crab dives in right of it', () => {
        const slots = Array.from({ length: HEAP_SLOTS }, (_, i) => heapSlot(i));
        expect(slots[0]).toEqual({ x: HEAP_X, y: HEAP_Y });
        expect(new Set(slots.map(p => `${p.x},${p.y}`)).size).toBe(HEAP_SLOTS);
        let top = HEAP_Y;
        for (const p of slots) {
            expect(p.y).toBeLessThanOrEqual(HEAP_Y);
            top = Math.min(top, p.y);
        }
        // A round's worth of coins stays clear of the chest (its right edge is x 280) and inside the island.
        for (const p of slots.slice(0, 40)) expect(p.x).toBeGreaterThan(286);
        for (const p of slots.slice(0, 40)) expect(p.x).toBeLessThan(400);
        expect(top).toBeLessThan(HEAP_Y - 30);
        // The first coin lies on the sand; the heap is at least two coins wide before it grows higher.
        expect(slots[0].y).toBe(HEAP_Y);
        expect(slots.slice(0, 3).filter(p => p.y === HEAP_Y).length).toBeGreaterThanOrEqual(2);
        expect(heapSlot(500)).toEqual(slots[HEAP_SLOTS - 1]);
        expect(SHORE.x).toBeGreaterThan(Math.max(...slots.slice(0, 20).map(p => p.x)));
        expect(SHORE.x).toBeLessThan(400);
    });
});

describe('the sky (pure)', () => {
    test('untimed: the day sun; timed: it rises from the sea, is high at half time and sets at the end', () => {
        expect(skyFor(null, null)).toBe(DAY);
        const dawn = skyAt(0);
        expect(dawn.y).toBeGreaterThan(HORIZON);
        expect(dawn).toMatchObject({ dawn: 1, dusk: 0 });
        const noon = skyAt(0.5);
        expect(noon.y).toBeLessThan(60);
        expect(noon).toMatchObject({ dawn: 0, dusk: 0 });
        const end = skyAt(1);
        expect(end.y).toBeGreaterThan(HORIZON);
        expect(end.dusk).toBe(1);
        expect(end.x).toBeGreaterThan(dawn.x);
        expect(skyFor(180_000, 180_000)).toEqual(dawn);
        expect(skyFor(90_000, 180_000)).toEqual(noon);
        expect(skyAt(2)).toEqual(end);
        // The end scene: half the sun still above the sea, the sky aglow.
        expect(SUNSET.y).toBeGreaterThan(HORIZON - 26);
        expect(SUNSET.y).toBeLessThan(HORIZON + 26);
        expect(SUNSET.dusk).toBeGreaterThan(0.85);
    });
});

describe('Met tijd and the hunt without an end', () => {
    test('the option: Zonder tijd by default; 3 or 5 minuten make the round timed (cap kept)', () => {
        const meta = skinById('schatkist')!.meta;
        expect(resolveMeta(meta)).toMatchObject({ timed: false, round: { cap: 60 }, chosen: { tijd: 'geen' } });
        expect(resolveMeta(meta).round.seconds).toBeUndefined();
        expect(resolveMeta(meta, { tijd: '3' })).toMatchObject({ timed: true, round: { cap: 60, seconds: 180 } });
        expect(resolveMeta(meta, { tijd: '5' })).toMatchObject({ timed: true, round: { seconds: 300 } });
    });

    test('a timed hunt opens chest after chest', () => {
        let h = newHunt();
        for (let c = 0; c < CHESTS + 2; c++) {
            h = tryCode(['1', '2', '3', '4'].reduce(reveal, h), '1234');
            h = nextChest(h, Infinity);
            expect(h).toMatchObject({ chest: c + 1, stage: 'sums' });
        }
    });
});

describe('on the real session', () => {
    let choice: ZelfChoice;
    const sp = () => useSpelStore.getState();
    beforeAll(async () => {
        const data = await loadEenvoudigData();
        choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    });
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        sp().takePickerAt();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

    const start = (meta: SkinMeta) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta }));
    const base = () => skinById('schatkist')!.meta;
    const rightOne = () => { act(() => sp().answer(sp().question!.answer)); act(() => sp().next()); };
    const wrongOne = () => { act(() => sp().answer(String(Number(sp().question!.answer) + 1))); act(() => sp().next()); };

    function Wired({ reducedMotion = false, onReport }: { reducedMotion?: boolean; onReport?(r: SkinResult): void }) {
        const st = useSpelStore();
        if (!st.question || !st.meta) return null;
        const progress = progressOf(st);
        return (
            <Schatkist question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
                phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
                onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={reducedMotion}
                onFinish={st.finish} onReport={onReport ?? st.report} />
        );
    }

    // React listens for the prefixed name where the environment has no AnimationEvent (jsdom): send both, it hears one.
    const stepEnd = (el: Element) => { fireEvent.animationEnd(el); fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true })); };
    const heapCoins = (c: HTMLElement) => c.querySelectorAll('.sk-hoard .sk-heap-coin').length;

    test('a coin per counted answer from the first sum of chest 1; three wrong in a row: the crab carries the newest into the sea; the score stays', () => {
        start(base());
        const { container } = render(<Wired />);
        rightOne();
        // The very first right answer is on the heap, long before a chest opens.
        expect(heapCoins(container)).toBe(1);
        act(() => sp().openHelp());
        act(() => sp().closeHelp());
        // Met hulp: a digit, no coin.
        rightOne();
        rightOne();
        expect(heapCoins(container)).toBe(2);
        expect(container.querySelectorAll('.sk-digit:not(.is-empty)')).toHaveLength(3);
        wrongOne();
        wrongOne();
        expect(container.querySelector('.sk-crab')).toBeNull();
        act(() => sp().answer(String(Number(sp().question!.answer) + 1)));
        const crab = () => container.querySelector('.sk-crab');
        expect(crab()!.classList.contains('is-come')).toBe(true);
        expect(heapCoins(container)).toBe(2);
        act(() => sp().next());
        // A leg's own animation ending is not the crab's step.
        stepEnd(container.querySelector('.sk-crab-shell')!);
        expect(crab()!.classList.contains('is-come')).toBe(true);
        stepEnd(crab()!);
        expect(crab()!.classList.contains('is-carry')).toBe(true);
        expect(crab()!.querySelector('.sk-crab-coin .sk-heap-coin')).not.toBeNull();
        expect(heapCoins(container)).toBe(1);
        stepEnd(crab()!);
        expect(crab()!.classList.contains('is-dive')).toBe(true);
        expect(crab()!.querySelector('.sk-splash')).not.toBeNull();
        stepEnd(crab()!);
        expect(crab()).toBeNull();
        // Gone for good, also after the next right answer; the score keeps the right answers.
        expect(heapCoins(container)).toBe(1);
        expect(sp().score).toBe(2);
        rightOne();
        expect(heapCoins(container)).toBe(2);
        expect(sp().score).toBe(3);
        // The run started over: two more wrong sums bring no crab.
        wrongOne();
        wrongOne();
        expect(crab()).toBeNull();
    });

    test('reduced motion: the loot is gone at once, the crab stands at the shore with it until the next sum', () => {
        start(base());
        const { container } = render(<Wired reducedMotion />);
        rightOne();
        wrongOne();
        wrongOne();
        act(() => sp().answer(String(Number(sp().question!.answer) + 1)));
        expect(container.querySelector('.sk-crab.is-still .sk-crab-coin')).not.toBeNull();
        expect(heapCoins(container)).toBe(0);
        expect(container.querySelector('.sk-hoard.is-settled')).not.toBeNull();
        act(() => sp().next());
        expect(container.querySelector('.sk-crab')).toBeNull();
        expect(heapCoins(container)).toBe(0);
    });

    test('an opened chest adds a gem; the end screen shows the heap as it was left', () => {
        start(base());
        const { container } = render(<Wired />);
        const digits: string[] = [];
        for (let i = 0; i < 4; i++) { digits.push(sp().question!.answer.slice(-1)); rightOne(); }
        for (const k of digits.join('')) fireEvent.keyDown(window, { key: k });
        fireEvent.keyDown(window, { key: 'Enter' });
        expect(container.querySelectorAll('.sk-gem')).toHaveLength(1);
        expect(heapCoins(container)).toBe(4);
        cleanup();
        const end = render(<SchatkistEnding outcome="done" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
        expect(end.container.querySelectorAll('.sk-hoard.is-settled .sk-heap-coin')).toHaveLength(4);
        expect(end.container.querySelectorAll('.sk-gem')).toHaveLength(1);
        // Untimed: the day sky.
        expect((end.container.querySelector('.sk-ending') as HTMLElement).style.getPropertyValue('--sk-dusk')).toBe('0%');
    });

    test('Met tijd: the sun follows the clock, chests go on past three, the end lines count them, a sunset at the end', () => {
        start(resolveMeta(base(), { tijd: '3' }));
        const reports: SkinResult[] = [];
        const { container, rerender } = render(<Wired onReport={r => { reports.push(r); sp().report(r); }} />);
        const sun = () => (container.querySelector('.sk-sun') as SVGElement).style.transform;
        const sky = (v: string) => (container.querySelector('.sk-root') as HTMLElement).style.getPropertyValue(v);
        expect(container.querySelector('.sk-root.is-timed')).not.toBeNull();
        expect(container.querySelector('.sk-chests')!.textContent).toBe('Kist 1');
        expect(sky('--sk-dawn')).toBe('100%');
        const first = sun();
        act(() => { vi.advanceTimersByTime(90_000); });
        rerender(<Wired onReport={r => { reports.push(r); sp().report(r); }} />);
        expect(sun()).not.toBe(first);
        expect(sky('--sk-dawn')).toBe('0%');
        for (let chest = 0; chest < CHESTS + 1; chest++) {
            const digits: string[] = [];
            for (let i = 0; i < 4; i++) { digits.push(sp().question!.answer.slice(-1)); rightOne(); }
            for (const k of digits.join('')) fireEvent.keyDown(window, { key: k });
            fireEvent.keyDown(window, { key: 'Enter' });
            act(() => { vi.advanceTimersByTime(2000); });
        }
        expect(sp().phase).not.toBe('end');
        expect(container.querySelector('.sk-chests')!.textContent).toBe(`Kist ${CHESTS + 2}`);
        expect(reports.at(-1)).toEqual({ lead: `${sp().score} juist, ${sp().score} munten en ${CHESTS + 1} edelstenen in je schat`, detail: `${CHESTS + 1} schatkisten open.` });
        act(() => { vi.advanceTimersByTime(90_000); });
        act(() => sp().answer(sp().question!.answer));
        expect(sp().phase).toBe('end');
        expect(sp().result?.detail).toBe(`${CHESTS + 1} schatkisten open.`);
        cleanup();
        const end = render(<SchatkistEnding outcome="done" progress={progressOf(sp())} options={{ tijd: '3' }} reducedMotion />);
        expect(Number.parseInt((end.container.querySelector('.sk-ending') as HTMLElement).style.getPropertyValue('--sk-dusk'))).toBeGreaterThan(85);
        expect(end.container.querySelectorAll('.sk-gem')).toHaveLength(CHESTS + 1);
    });
});
