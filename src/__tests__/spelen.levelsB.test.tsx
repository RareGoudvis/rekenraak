// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import { createSpelEvents } from '../oefenen/spelen/events';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta, SkinPhase, SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { OPTIONS_KEY, loadChoices, resolveMeta } from '../oefenen/spelen/skins/options';
import { LEVELS } from '../oefenen/spelen/levels/levels';
import Bever from '../oefenen/spelen/skins/bever/Bever';
import Bom from '../oefenen/spelen/skins/bom/Bom';
import { BOM_LEVELS, bomBursts } from '../oefenen/spelen/skins/bom/penalty';
import { MOLE, moleUpMs } from '../oefenen/spelen/skins/mollen/moles';
import Pinguintoren from '../oefenen/spelen/skins/pinguintoren/Pinguintoren';
import Zeehond from '../oefenen/spelen/skins/zeehond/Zeehond';
import { DIVE_MS } from '../oefenen/spelen/skins/zeehond/pod';
import { resetKiosk } from './helpers/oefenKiosk';

// The difficulty round (owner 2026-11-17): the clock per sum (levels/sumClock.ts, its own test spelen.sumClock) in Bever,
// Zeehondjes and Pinguïntoren, Bom's four levels (no time lost / −3 s / −5 s / PUF at the third mistake), the
// moles' up-time following the clock, and the level rows of these games. Zombies' levels: spelen.zombies.test.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const meta = (id: string) => skinById(id)!.meta;
const startWith = (m: SkinMeta, now?: number): SpelStart => ({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: m, now });
const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
});
const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
    question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
    onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
    progress: progressWith(), options: {}, events: createSpelEvents(), ...over,
});
const fakeFrames = () => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] });
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

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
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('the level rows', () => {
    test('Zombies, Bever, Zeehondjes, Mollen and Pinguïntoren: the four levels about time; Bom: flames only', () => {
        for (const id of ['zombies', 'bever', 'zeehond', 'mollen', 'pinguintoren']) {
            const row = meta(id).options!.find(o => o.id === 'niveau')!;
            expect(row.choices.map(c => c.value)).toEqual([...LEVELS]);
            expect(row.choices.map(c => c.icon)).toEqual([{ clock: 'off' }, { clock: 'on' }, { clock: 'on', flames: 1 }, { clock: 'on', flames: 2 }]);
            expect(row.default).toBe('normaal');
        }
        const bom = meta('bom').options!.find(o => o.id === 'niveau')!;
        expect(bom.choices.map(c => c.icon)).toEqual([{}, { flames: 1 }, { flames: 2 }, { flames: 3 }]);
    });

    test('an old pick carries over: Moeilijk stays Moeilijk, Zombies\' Makkelijk stays, anything else is Normaal', () => {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ bever: { niveau: 'moeilijk' }, zombies: { niveau: 'makkelijk' }, zeehond: { niveau: 'heel moeilijk' }, bom: { tijd: '5', doel: '20' } }));
        expect(loadChoices(meta('bever'))).toEqual({ niveau: 'moeilijk' });
        expect(loadChoices(meta('zombies'))).toEqual({ niveau: 'makkelijk' });
        expect(loadChoices(meta('zeehond'))).toEqual({ niveau: 'normaal' });
        expect(loadChoices(meta('mollen'))).toEqual({ niveau: 'normaal' });
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '5', doel: '20', niveau: 'normaal' });
    });
});

describe('Bever: the clock per sum from Normaal up', () => {
    test('Normaal: a sum left 12 s is a mistake (onMiss, a wave); help holds it; Makkelijk has no clock', () => {
        fakeFrames();
        const onMiss = vi.fn();
        const at = (p: Partial<SkinProps>) => propsWith({ onMiss, progress: progressWith({ msLeft: 180_000, msTotal: 180_000 }), options: { niveau: 'normaal' }, ...p });
        const { container, rerender } = render(<Bever {...at({})} />);
        expect(container.querySelector('.bv-ring[role=timer]')!.getAttribute('aria-label')).toBe('12 seconden per som');
        wait(6_000);
        rerender(<Bever {...at({ phase: 'help' })} />);
        wait(30_000);
        expect(onMiss).not.toHaveBeenCalled();
        rerender(<Bever {...at({})} />);
        wait(5_500);
        expect(onMiss).not.toHaveBeenCalled();
        wait(1_000);
        expect(onMiss).toHaveBeenCalledTimes(1);
        wait(20_000);
        expect(onMiss).toHaveBeenCalledTimes(1);
        cleanup();
        const easy = render(<Bever {...at({ options: { niveau: 'makkelijk' } })} />);
        expect(easy.container.querySelector('.bv-ring')).toBeNull();
        wait(60_000);
        expect(onMiss).toHaveBeenCalledTimes(1);
    });

    test('on the session a time-out is a counted mistake', () => {
        sp().start(startWith(resolveMeta(meta('bever'), { niveau: 'onmogelijk' })));
        sp().miss();
        expect(sp().mistakes).toHaveLength(1);
        expect(sp().misses).toBe(1);
    });
});

describe('Pinguïntoren: time up = the ice cracks', () => {
    test('Normaal and up a sum has the clock (onMiss when it runs out); Makkelijk never', () => {
        fakeFrames();
        const onMiss = vi.fn();
        const at = (niveau: string) => propsWith({ onMiss, options: { niveau }, progress: progressWith({ goal: { count: 4, target: 20 } }) });
        const { container } = render(<Pinguintoren {...at('moeilijk')} />);
        expect(container.querySelector('.pt-ring')).not.toBeNull();
        wait(12_200);
        expect(onMiss).toHaveBeenCalledTimes(1);
        cleanup();
        const easy = render(<Pinguintoren {...at('makkelijk')} />);
        expect(easy.container.querySelector('.pt-ring')).toBeNull();
        wait(60_000);
        expect(onMiss).toHaveBeenCalledTimes(1);
    });

    test('on the session a time-out takes a block off the climb, like a mistake', () => {
        sp().start(startWith(resolveMeta(meta('pinguintoren'), { niveau: 'normaal' })));
        sp().answer(sp().question!.answer);
        sp().next();
        sp().answer(sp().question!.answer);
        sp().next();
        expect(sp().climb).toBe(2);
        sp().miss();
        expect(sp().climb).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
    });
});

describe('Zeehondjes: time up = the seals dive and come back with the next sum', () => {
    function Wired({ niveau }: { niveau: string }) {
        const st = useSpelStore();
        if (!st.question || !st.meta) return null;
        const progress = progressOf(st);
        return (
            <Zeehond question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
                phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
                onFail={() => st.fail()} sound={() => { }} progress={progress} options={{ niveau }} events={st.events} />
        );
    }
    const seals = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).getAllByRole('button') as HTMLButtonElement[];

    test('Normaal: after 12 s a mistake, every seal under water for DIVE_MS, then up again with the next sum', () => {
        fakeFrames();
        act(() => sp().start(startWith(resolveMeta(meta('zeehond'), { niveau: 'normaal' }))));
        const { container } = render(<Wired niveau="normaal" />);
        const first = sp().question!.key;
        expect(container.querySelector('.zh-ring')).not.toBeNull();
        wait(11_000);
        expect(sp().misses).toBe(0);
        wait(1_200);
        expect(sp().misses).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
        expect(container.querySelector('.zh-root.is-diving')).not.toBeNull();
        // The next sum comes after the wrong flash, while they are still under; a tap there does nothing.
        wait(1_700);
        expect(sp().question!.key).not.toBe(first);
        expect(container.querySelector('.zh-root.is-diving')).not.toBeNull();
        expect(seals().every(b => b.disabled)).toBe(true);
        wait(DIVE_MS);
        expect(container.querySelector('.zh-root.is-diving')).toBeNull();
        expect(seals().some(b => !b.disabled)).toBe(true);
        // The new sum's clock only started when they came up.
        wait(10_000);
        expect(sp().misses).toBe(1);
    });

    test('Makkelijk: no clock, no dive', () => {
        fakeFrames();
        act(() => sp().start(startWith(resolveMeta(meta('zeehond'), { niveau: 'makkelijk' }))));
        const { container } = render(<Wired niveau="makkelijk" />);
        expect(container.querySelector('.zh-ring')).toBeNull();
        wait(60_000);
        expect(sp().misses).toBe(0);
        expect(container.querySelector('.zh-root.is-diving')).toBeNull();
        fireEvent.click(seals()[0]);
        expect(sp().history).toHaveLength(1);
    });
});

describe('Bom: no time lost, −3 s, −5 s, or PUF at the third mistake', () => {
    test('the level patches the penalty; Onmogelijk bursts at three counted mistakes', () => {
        expect(LEVELS.map(l => resolveMeta(meta('bom'), { niveau: l }).round.wrongPenaltyMs)).toEqual([0, 3000, 5000, 5000]);
        expect(BOM_LEVELS.onmogelijk.strikes).toBe(3);
        expect([2, 3].map(m => bomBursts('onmogelijk', m))).toEqual([false, true]);
        expect(bomBursts('moeilijk', 30)).toBe(false);
        expect(meta('bom').canFail).toBe(true);
    });

    test('on the session: Makkelijk loses no time; Moeilijk 5 s', () => {
        const t0 = 1_000_000;
        sp().start(startWith(resolveMeta(meta('bom'), { niveau: 'makkelijk' }), t0));
        const end0 = sp().endsAt!;
        sp().answer(String(Number(sp().question!.answer) + 1), t0 + 1000);
        expect(sp().endsAt).toBe(end0);
        expect(sp().mistakes).toHaveLength(1);
        sp().start(startWith(resolveMeta(meta('bom'), { niveau: 'moeilijk' }), t0));
        sp().answer(String(Number(sp().question!.answer) + 1), t0 + 1000);
        expect(sp().endsAt).toBe(end0 - 5000);
    });

    test('the skin: "−5s" on Moeilijk, nothing on Makkelijk; Onmogelijk\'s three sparks and the early end, never under help', () => {
        const wrong = { phase: 'wrong' as const, feedback: { given: '11', expected: '12', correct: false } };
        const at = (niveau: string, mistakes: number, p: Partial<SkinProps> = {}) => propsWith({ options: { niveau }, progress: progressWith({ msLeft: 120_000, msTotal: 180_000, mistakes, goal: { count: 0, target: 10 } }), ...p });
        const hard = render(<Bom {...at('moeilijk', 0)} />);
        hard.rerender(<Bom {...at('moeilijk', 1, wrong)} />);
        expect(hard.container.querySelector('.bom-minus')!.textContent).toBe('−5s');
        expect(hard.container.querySelector('.bom-strikes')).toBeNull();
        cleanup();
        const easy = render(<Bom {...at('makkelijk', 0)} />);
        easy.rerender(<Bom {...at('makkelijk', 1, wrong)} />);
        expect(easy.container.querySelector('.bom-minus')).toBeNull();
        expect(easy.container.querySelector('.bom-display.is-hit')).toBeNull();
        cleanup();
        const onFail = vi.fn();
        const o = render(<Bom {...at('onmogelijk', 2, { onFail })} />);
        expect(o.container.querySelectorAll('.bom-strike')).toHaveLength(3);
        expect(o.container.querySelectorAll('.bom-strike.is-out')).toHaveLength(2);
        expect(onFail).not.toHaveBeenCalled();
        o.rerender(<Bom {...at('onmogelijk', 3, { onFail, phase: 'help' })} />);
        expect(onFail).not.toHaveBeenCalled();
        o.rerender(<Bom {...at('onmogelijk', 3, { onFail, ...wrong })} />);
        expect(onFail).toHaveBeenCalledTimes(1);
        o.rerender(<Bom {...at('onmogelijk', 4, { onFail })} />);
        expect(onFail).toHaveBeenCalledTimes(1);
    });

    test('on the session the early end reads friendly: PUF! Drie foutjes.', () => {
        sp().start(startWith(resolveMeta(meta('bom'), { niveau: 'onmogelijk' })));
        sp().fail();
        expect(sp().outcome).toBe('failed');
        expect(meta('bom').failTitle).toBe('PUF! Drie foutjes.');
    });
});

describe('Mollen: how long a mole stays up follows the clock', () => {
    test('Makkelijk: a steady, longer pop-up; the others shrink with their clock, never under its floor', () => {
        for (const t of [0, 60_000, 600_000]) expect(moleUpMs('makkelijk', t)).toBe(MOLE.easyUpMs);
        expect(MOLE.easyUpMs).toBeGreaterThan(MOLE.upMs);
        for (const l of ['normaal', 'moeilijk', 'onmogelijk'] as const) {
            expect(moleUpMs(l, 0)).toBeCloseTo(MOLE.upMs * MOLE.levelUp[l]);
            expect(moleUpMs(l, 60_000)).toBeCloseTo(MOLE.upMs * MOLE.levelUp[l] * 11 / 12);
        }
        // Each level starts quicker, so the three differ from the first mole on.
        expect([moleUpMs('normaal', 0), moleUpMs('moeilijk', 0), moleUpMs('onmogelijk', 0)].map(Math.round)).toEqual([2500, 2000, 1625]);
        // At the end of the two minutes: Normaal and Moeilijk at 10 s of the clock's 12, Onmogelijk at 9 s.
        expect([moleUpMs('normaal', 120_000), moleUpMs('moeilijk', 120_000), moleUpMs('onmogelijk', 120_000)].map(Math.round)).toEqual([2083, 1667, 1219]);
        expect(moleUpMs('onmogelijk', 600_000)).toBeCloseTo(MOLE.upMs * 0.65 * 4 / 12);
    });
});
