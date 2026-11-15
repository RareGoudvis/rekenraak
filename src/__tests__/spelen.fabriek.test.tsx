// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, SPEL_FLASH_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { mulberry32 } from '../oefenen/spelen/distractors';
import Pakjesband, { FabriekEnding, FLY_MS, SPUTTER_MS } from '../oefenen/spelen/skins/pakjesband/Pakjesband';
import { PRESSURE, needleAngle, pressureAfter, pressureFrom, pressureMood, pressureOf, sputters } from '../oefenen/spelen/skins/pakjesband/pressure';
import { PRESENT_SHAPES, presentLooks } from '../oefenen/spelen/skins/pakjesband/presents';
import { resetKiosk } from './helpers/oefenKiosk';

// Speelgoedfabriek (skin id pakjesband): the pressure meter's tuning, the presents' looks, and the skin on the real session.

describe('the pressure meter', () => {
    test('a mistake heats one step, a right answer cools one step, within 0 and max', () => {
        expect(pressureAfter(0, 'right')).toBe(0);
        expect(pressureAfter(0, 'wrong')).toBe(PRESSURE.heat);
        expect(pressureAfter(PRESSURE.max, 'wrong')).toBe(PRESSURE.max);
        expect(pressureOf(['wrong', 'wrong', 'right', 'wrong'])).toBe(2);
        expect(sputters(pressureOf(Array(PRESSURE.max).fill('wrong')))).toBe(true);
        expect(sputters(pressureOf([...Array(PRESSURE.max - 1).fill('wrong'), 'right', 'wrong']))).toBe(false);
    });

    test('moods and the needle follow the steps', () => {
        expect([0, 1, 2, 3, 4, 5].map(pressureMood)).toEqual(['calm', 'calm', 'calm', 'warm', 'high', 'burst']);
        expect(needleAngle(0)).toBe(-110);
        expect(needleAngle(PRESSURE.max)).toBe(110);
        expect(needleAngle(99)).toBe(110);
    });

    test('from the session counts: mistakes heat, rights cool, counts going back start cold', () => {
        expect(pressureFrom(0, { right: 0, mistakes: 0 }, { right: 0, mistakes: 2 })).toBe(2);
        expect(pressureFrom(2, { right: 0, mistakes: 2 }, { right: 1, mistakes: 2 })).toBe(1);
        expect(pressureFrom(3, { right: 4, mistakes: 3 }, { right: 0, mistakes: 0 })).toBe(0);
    });

    // The owner's rule: a pupil who guesses sputters, a normal pupil does not (20 sums, four options).
    test('tuning: guessing sputters nearly always, 80 % right almost never', () => {
        const rate = (pRight: number, runs = 4000) => {
            const rng = mulberry32(17);
            let fails = 0;
            for (let r = 0; r < runs; r++) {
                let p = 0;
                for (let i = 0; i < 20 && !sputters(p); i++) p = pressureAfter(p, rng() < pRight ? 'right' : 'wrong');
                if (sputters(p)) fails++;
            }
            return fails / runs;
        };
        expect(rate(0.25)).toBeGreaterThan(0.95);
        expect(rate(0.5)).toBeGreaterThan(0.3);
        expect(rate(0.7)).toBeLessThan(0.08);
        expect(rate(0.8)).toBeLessThan(0.015);
        expect(rate(0.9)).toBeLessThan(0.003);
    });
});

describe('the presents', () => {
    test('four different shapes and colours, a ribbon in another colour, the same look for the same sum', () => {
        for (const key of ['a', 'b', 'q-17', '7 + 5', 'x'.repeat(30)]) {
            const looks = presentLooks(key);
            expect(looks).toHaveLength(4);
            expect(new Set(looks.map(l => l.shape)).size).toBe(4);
            expect(new Set(looks.map(l => l.fill)).size).toBe(4);
            expect(looks.every(l => l.ribbon !== l.fill && PRESENT_SHAPES.includes(l.shape) && l.size >= 0.86 && l.size <= 1)).toBe(true);
            expect(presentLooks(key)).toEqual(looks);
        }
        // Over many sums every shape turns up.
        const seen = new Set(Array.from({ length: 40 }, (_, i) => presentLooks(`k${i}`).map(l => l.shape)).flat());
        expect(seen.size).toBe(PRESENT_SHAPES.length);
    });
});

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
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = () => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('pakjesband')!.meta }));
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

function Wired({ still = false }: { still?: boolean }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Pakjesband question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={still} />
    );
}
const options = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).queryAllByRole('button', { hidden: true }) as HTMLButtonElement[];
const tap = (value: string) => fireEvent.click(options().find(b => !b.disabled && b.getAttribute('aria-label') === value)!);
const tapWrong = () => tap(sp().question!.choices.find(c => c !== sp().question!.answer)!);
const tapRight = () => tap(sp().question!.answer);

describe('the skin on the session', () => {
    test('registry: year-round, can sputter, its own end picture', () => {
        const entry = skinById('pakjesband')!;
        expect(entry.meta).toMatchObject({ label: 'Speelgoedfabriek', music: 'fabriek', canFail: true, failTitle: expect.stringContaining('sputtert') });
        expect(entry.meta.season).toBeUndefined();
        expect(entry.Ending).toBeDefined();
    });

    test('no keyboard hint badges on the presents; keys 1 to 4 still pick one', () => {
        start();
        const { container } = render(<Wired />);
        expect(container.querySelector('.pk-key')).toBeNull();
        expect(options().map(b => b.getAttribute('aria-label'))).toEqual(sp().question!.choices);
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(sp().phase).toBe('right');
    });

    test('a right present gets its stamp and flies into the crate; the crate counts it when it lands', () => {
        start();
        const { container } = render(<Wired />);
        tapRight();
        expect(container.querySelector('.pk-slot.is-down')).not.toBeNull();
        const flyer = container.querySelector('.pk-flyer')!;
        expect(flyer.querySelector('.pk-stamp')).not.toBeNull();
        expect(container.querySelectorAll('.pk-pile')).toHaveLength(0);
        // The next sum comes while it flies.
        wait(SPEL_FLASH_MS.right + 10);
        expect(sp().phase).toBe('play');
        expect(container.querySelector('.pk-flyer')).not.toBeNull();
        wait(FLY_MS);
        expect(container.querySelector('.pk-flyer')).toBeNull();
        expect(container.querySelectorAll('.pk-pile')).toHaveLength(1);
    });

    test('a wrong present bounces back; mistakes heat the gauge, right answers cool it', () => {
        start();
        const { container } = render(<Wired />);
        const root = () => container.querySelector('.pk-root')!;
        tapWrong();
        expect(container.querySelector('.pk-slot.is-bounce')).not.toBeNull();
        expect(sp().phase).toBe('wrong');
        for (let i = 0; i < 2; i++) { wait(SPEL_FLASH_MS.wrong + 10); tapWrong(); }
        expect(root().classList.contains('is-warm')).toBe(true);
        wait(SPEL_FLASH_MS.wrong + 10);
        tapWrong();
        expect(root().classList.contains('is-high')).toBe(true);
        wait(SPEL_FLASH_MS.wrong + 10);
        tapRight();
        expect(root().classList.contains('is-warm')).toBe(true);
        wait(SPEL_FLASH_MS.right + 10);
        // Back to 4 of 5: no sputter.
        tapWrong();
        expect(root().classList.contains('is-sputter')).toBe(false);
        wait(SPEL_FLASH_MS.wrong + 10);
        expect(sp().phase).toBe('play');
    });

    test('five mistakes in a row: the machine sputters, then the friendly early end', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < PRESSURE.max - 1; i++) { tapWrong(); wait(SPEL_FLASH_MS.wrong + 10); }
        tapWrong();
        expect(container.querySelector('.pk-root.is-sputter')).not.toBeNull();
        expect(container.querySelectorAll('.pk-pop-toy').length).toBeGreaterThan(4);
        wait(SPUTTER_MS - 50);
        expect(sp().phase).toBe('wrong');
        wait(60);
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('failed');
    });

    test('met hulp never heats the machine', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < PRESSURE.max; i++) {
            act(() => sp().openHelp());
            act(() => sp().closeHelp());
            tapWrong();
            wait(SPEL_FLASH_MS.wrong + 10);
        }
        expect(container.querySelector('.pk-root')!.classList.contains('is-calm')).toBe(true);
        expect(sp().phase).toBe('play');
    });

    test('reduced motion: no flight, the stamp shows on the present in place', () => {
        start();
        const { container } = render(<Wired still />);
        tapRight();
        expect(container.querySelector('.pk-flyer')).toBeNull();
        expect(container.querySelector('.pk-slot.is-down .pk-stamp')).not.toBeNull();
    });
});

describe('the end picture', () => {
    test('sputtered: dizzy eyes and toys on the floor; a full round: a happy machine and a full crate', () => {
        const progress = progressOf(sp());
        const { container, unmount } = render(<FabriekEnding outcome="failed" progress={progress} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.pk-ending.is-failed .pk-spiral')).not.toBeNull();
        expect(container.querySelectorAll('.pk-toy').length).toBeGreaterThan(4);
        unmount();
        const done = render(<FabriekEnding outcome="won" progress={progress} options={{}} reducedMotion />);
        expect(done.container.querySelector('.pk-ending.is-done .pk-happy-eye')).not.toBeNull();
        expect(done.container.querySelectorAll('.pk-pile').length).toBe(8);
    });
});
