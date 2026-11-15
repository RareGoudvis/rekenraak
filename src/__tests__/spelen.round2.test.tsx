// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, cleanup, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import { skinById, SKINS } from '../oefenen/spelen/skins/registry';
import type { SkinMeta, SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { OPTIONS_KEY, choicesOf, loadChoices, resolveMeta } from '../oefenen/spelen/skins/options';
import { createSpelEvents } from '../oefenen/spelen/events';
import SpelOptions from '../oefenen/spelen/SpelOptions';
import SpelEnd from '../oefenen/spelen/SpelEnd';
import Bom, { BomEnding } from '../oefenen/spelen/skins/bom/Bom';
import { clockText, fuseLeft, fusePoint, isHurry } from '../oefenen/spelen/skins/bom/fuse';
import Bever, { BeverEnding } from '../oefenen/spelen/skins/bever/Bever';
import { BEVER, damBreaks, damHeight, waterLevel, type BeverLevel } from '../oefenen/spelen/skins/bever/water';
import Zombies, { ZombiesEnding } from '../oefenen/spelen/skins/zombies/Zombies';
import { DEFENCE, defenceAfter, hitOf } from '../oefenen/spelen/skins/zombies/defence';
import { resetKiosk } from './helpers/oefenKiosk';

// Spelen round 2: the pre-start options screen (remembered per skin), the friendly early end (canFail skins
// only), Bom (N right before the clock), the Bever water model and the Zombies' barricades and survivors.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const meta = (id: string) => skinById(id)!.meta;
const startWith = (m: SkinMeta, now = Date.now()): SpelStart => ({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: m, now });
const wrongOf = (answer: string) => String(Number(answer) + 1);
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

const progressWith = (over: Partial<SkinProgress> = {}): SkinProgress => ({
    answered: 0, total: null, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null, ...over,
});
const propsWith = (over: Partial<SkinProps> = {}): SkinProps => ({
    question: { key: 'q1', text: '7 + 5 = ?', index: 0 }, choices: null, phase: 'play', feedback: null,
    onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
    progress: progressWith(), options: {}, events: createSpelEvents(), reducedMotion: false, ...over,
});

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    log.length = 0;
    for (const name of ['timeUp', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
    vi.spyOn(console, 'error').mockImplementation(() => { });
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
});
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Pre-start options', () => {
    test('only Bom, Bever, Zombies, Voetbal, Kasteel, Schatkist, Race, Hartjes, Zeehondjes and Honingraat have options; picks patch the round, unknown picks fall back to the default', () => {
        expect(SKINS.filter(s => s.meta.options?.length && !['bom', 'bever', 'zombies', 'voetbal', 'kasteel', 'schatkist', 'race', 'hartjes', 'zeehond', 'honingraat'].includes(s.meta.id))).toEqual([]);
        const bom = meta('bom');
        expect(resolveMeta(bom).round).toEqual({ seconds: 180, goal: 10, goalKeep: true, wrongPenaltyMs: 3000 });
        const big = resolveMeta(bom, { tijd: '5', doel: '50' });
        expect(big.round).toEqual({ seconds: 300, goal: 50, goalKeep: true, wrongPenaltyMs: 3000 });
        expect(big.chosen).toEqual({ tijd: '5', doel: '50' });
        expect(choicesOf(bom, { tijd: '7', doel: 'x' })).toEqual({ tijd: '3', doel: '10' });
        // A skin without options is passed through untouched.
        expect(resolveMeta(meta('ballonnen'))).toBe(meta('ballonnen'));
    });

    test('the screen: defaults preselected, one tap on Start; the last pick is remembered per skin', () => {
        const onPick = vi.fn();
        const onBack = vi.fn();
        render(<SpelOptions meta={meta('bom')} onStart={onPick} onBack={onBack} />);
        expect(screen.getByRole('heading', { name: 'Bom' })).toBeTruthy();
        // The game's picture above its name, as on the game cards.
        expect(document.querySelector('.spel-options-thumb img')!.getAttribute('src')).toMatch(/thumbs\/bom\.webp$/);
        expect(screen.getByRole('button', { name: '3 minuten' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: '10 juist' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: '5 minuten' }));
        fireEvent.click(screen.getByRole('button', { name: '20 juist' }));
        expect(screen.getByRole('button', { name: '3 minuten' }).getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(onPick).toHaveBeenCalledTimes(1);
        expect(onPick.mock.calls[0][0]).toMatchObject({ id: 'bom', round: { seconds: 300, goal: 20 }, chosen: { tijd: '5', doel: '20' } });
        cleanup();
        render(<SpelOptions meta={meta('bom')} onStart={onPick} onBack={onBack} />);
        expect(screen.getByRole('button', { name: '5 minuten' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: '20 juist' }).getAttribute('aria-pressed')).toBe('true');
        // Ander spel goes back (to the Keuze screen's games).
        fireEvent.click(screen.getByRole('button', { name: /Ander spel/ }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    test('broken or blocked storage: the defaults, never a throw', () => {
        localStorage.setItem(OPTIONS_KEY, '{nope');
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '3', doel: '10' });
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ bom: 'x' }));
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '3', doel: '10' });
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ bom: { tijd: '5', doel: '7' } }));
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '5', doel: '10' });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '3', doel: '10' });
    });
});

describe('The friendly early end', () => {
    // A stand-in canFail skin, so the session rule is tested apart from Bever and Zombies.
    const CAN_FAIL: SkinMeta = { id: 'proef', label: 'Proef', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'Gehouden!', accepts: { kinds: ['number'] } };

    test('a canFail skin ends the round as failed; the end screen says Oei! Nog eens? with the mistakes and Nakijken', () => {
        sp().start(startWith(CAN_FAIL));
        sp().answer(sp().question!.answer); sp().next();
        sp().answer(wrongOf(sp().question!.answer));
        sp().fail();
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('failed');
        expect(log.at(-1)).toMatchObject({ name: 'end', payload: { score: 1, mistakes: 1, outcome: 'failed' } });
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Oei! Nog eens?' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Nakijken/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Opnieuw spelen/ })).toBeTruthy();
    });

    test('no early end anywhere else: fail() does nothing for other skins, under help or after the end', () => {
        for (const m of SKINS.map(s => resolveMeta(s.meta)).filter(m => !m.canFail)) {
            sp().start(startWith(m));
            sp().fail();
            expect(sp().phase).toBe('play');
        }
        // Owner-approved early ends; the Speelgoedfabriek's machine sputters (2026-11-15); Race only in Benzine (an empty tank); Honingraat's wasp in Moeilijk.
        expect(SKINS.filter(s => s.meta.canFail && !['bever', 'zombies', 'kasteel', 'pakjesband', 'race', 'honingraat'].includes(s.meta.id))).toEqual([]);
        sp().start(startWith(CAN_FAIL));
        sp().openHelp();
        sp().fail();
        expect(sp().phase).toBe('help');
        sp().closeHelp();
        sp().fail();
        expect(sp().outcome).toBe('failed');
        sp().fail();
        expect(log.filter(e => e.name === 'end')).toHaveLength(1);
    });

    test('a canFail skin that holds out till the clock wins, under its own title', () => {
        const t0 = 1_000_000;
        sp().start(startWith(CAN_FAIL, t0));
        sp().tick(t0 + 180_000);
        expect(sp().outcome).toBe('won');
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Gehouden!' })).toBeTruthy();
    });
});

describe('Bom', () => {
    test('N right before time runs out defuses it; a wrong answer costs nothing but time', () => {
        vi.useFakeTimers();
        sp().start(startWith(resolveMeta(meta('bom'), { doel: '10' })));
        let n = 0;
        while (sp().phase !== 'end') {
            const q = sp().question!;
            sp().answer(n % 4 === 1 ? wrongOf(q.answer) : q.answer);
            n++;
            vi.advanceTimersByTime(2000);
        }
        expect(sp().climb).toBe(10);
        // Three mistakes on the way, and none took a segment back.
        expect(sp().mistakes.length).toBe(3);
        expect(sp().outcome).toBe('won');
        expect(sp().history).toHaveLength(13);
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Ontmanteld!' })).toBeTruthy();
    });

    test('a counted wrong answer costs 3 s on the 3 and the 5 minute round, a right one or a helped one nothing', () => {
        for (const tijd of ['3', '5']) {
            const t0 = 1_000_000;
            sp().start(startWith(resolveMeta(meta('bom'), { tijd, doel: '10' }), t0));
            const end0 = sp().endsAt!;
            sp().answer(wrongOf(sp().question!.answer), t0 + 1000);
            expect(sp().endsAt).toBe(end0 - 3000);
            sp().next(t0 + 2000);
            sp().answer(sp().question!.answer, t0 + 3000);
            expect(sp().endsAt).toBe(end0 - 3000);
            sp().next(t0 + 4000);
            sp().openHelp(t0 + 5000);
            sp().closeHelp(t0 + 6000);
            sp().answer(wrongOf(sp().question!.answer), t0 + 7000);
            expect(sp().endsAt! - end0).toBe(1000 - 3000);
        }
    });

    test('time up before N: lost, "Bijna! x van N"; help pauses the clock', () => {
        const t0 = 1_000_000;
        sp().start(startWith(resolveMeta(meta('bom'), { tijd: '3', doel: '20' }), t0));
        expect(sp().endsAt).toBe(t0 + 180_000);
        for (let i = 0; i < 3; i++) { sp().answer(sp().question!.answer, t0 + i * 1000); sp().next(t0 + i * 1000); }
        sp().openHelp(t0 + 60_000);
        sp().tick(t0 + 400_000);
        expect(sp().phase).toBe('help');
        sp().closeHelp(t0 + 100_000);
        expect(sp().endsAt).toBe(t0 + 220_000);
        sp().tick(t0 + 219_000);
        expect(sp().phase).toBe('play');
        sp().tick(t0 + 220_000);
        expect(sp().outcome).toBe('lost');
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'Bijna! 3 van 20' })).toBeTruthy();
    });

    test('the fuse burns down with the clock and the spark rides its end; a hurry in the last 30 s', () => {
        expect(fuseLeft(180_000, 180_000)).toBe(1);
        expect(fuseLeft(90_000, 180_000)).toBe(0.5);
        expect(fuseLeft(0, 180_000)).toBe(0);
        expect(fusePoint(0)).toEqual({ x: 148, y: 72 });
        expect(fusePoint(1).x).toBeCloseTo(256, 0);
        expect(isHurry(31_000)).toBe(false);
        expect(isHurry(30_000)).toBe(true);
        expect(isHurry(0)).toBe(false);
        expect(clockText(180_000)).toBe('3:00');
        expect(clockText(9_100)).toBe('0:10');
    });

    test('the skin: the clock on the bomb, one segment per right answer, the hurry class, still under help', () => {
        const at = (over: Partial<SkinProgress>, p: Partial<SkinProps> = {}) => propsWith({ progress: progressWith({ msLeft: 120_000, msTotal: 180_000, goal: { count: 0, target: 10 }, ...over }), ...p });
        const { container, rerender } = render(<Bom {...at({})} />);
        expect(container.querySelector('.bom-display text')!.textContent).toBe('2:00');
        expect(container.querySelectorAll('.bom-seg')).toHaveLength(10);
        rerender(<Bom {...at({ goal: { count: 1, target: 10 } }, { phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
        expect(container.querySelectorAll('.bom-seg.is-done')).toHaveLength(1);
        expect(container.querySelector('.bom-seg.is-new')).not.toBeNull();
        expect(container.querySelector('.bom-sign-answer')!.textContent).toBe('12');
        expect(container.querySelector('.bom-root.is-hurry')).toBeNull();
        rerender(<Bom {...at({ msLeft: 20_000, goal: { count: 1, target: 10 } }, { phase: 'help' })} />);
        expect(container.querySelector('.bom-root.is-hurry.is-paused')).not.toBeNull();
        // 50 segments go on two rows of 25.
        rerender(<Bom {...at({ goal: { count: 0, target: 50 } })} />);
        expect(container.querySelectorAll('.bom-seg')).toHaveLength(50);
        expect((container.querySelector('.bom-bar') as HTMLElement).style.getPropertyValue('--bom-cols')).toBe('25');
    });

    test('the endings: a smiling bomb with a flag, or the PUF! cloud', () => {
        const { container, rerender } = render(<BomEnding outcome="won" progress={progressWith()} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.bom-flag')).not.toBeNull();
        expect(screen.queryByText('PUF!')).toBeNull();
        rerender(<BomEnding outcome="lost" progress={progressWith()} options={{}} reducedMotion />);
        expect(screen.getByText('PUF!')).toBeTruthy();
        expect(container.querySelector('.bom-cloud')).not.toBeNull();
    });
});

describe('Bever', () => {
    test('Normaal or Moeilijk before the start, remembered apart from the other skins', () => {
        expect(resolveMeta(meta('bever'), { niveau: 'moeilijk' })).toMatchObject({ round: { seconds: 180 }, chosen: { niveau: 'moeilijk' } });
        expect(meta('bever').canFail).toBe(true);
        localStorage.setItem(OPTIONS_KEY, JSON.stringify({ bom: { tijd: '5', doel: '20' }, bever: { niveau: 'heel moeilijk' } }));
        expect(loadChoices(meta('bever'))).toEqual({ niveau: 'normaal' });
        render(<SpelOptions meta={meta('bever')} onStart={vi.fn()} onBack={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Normaal' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Moeilijk' }));
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(loadChoices(meta('bever'))).toEqual({ niveau: 'moeilijk' });
        expect(loadChoices(meta('bom'))).toEqual({ tijd: '5', doel: '20' });
    });

    test('held till the clock: De dam houdt!', () => {
        const t0 = 1_000_000;
        sp().start(startWith(resolveMeta(meta('bever')), t0));
        sp().tick(t0 + 180_000);
        render(<SpelEnd />);
        expect(screen.getByRole('heading', { name: 'De dam houdt!' })).toBeTruthy();
    });

    // A simulated L2 pupil: one answer every minS–maxS seconds, pRight right; seeded, so the numbers are stable.
    function mulberry32(seed: number) {
        return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }
    function holds(level: BeverLevel, rnd: () => number, minS = 6, maxS = 8, pRight = 0.8): boolean {
        let t = 0; let right = 0; let mistakes = 0;
        for (;;) {
            t += minS + (maxS - minS) * rnd();
            // The water is highest just before an answer lands.
            if (damBreaks(waterLevel(level, Math.min(t, 180) * 1000, mistakes), damHeight(right))) return false;
            if (t > 180) return true;
            if (rnd() < pRight) right++;
            else if (damBreaks(waterLevel(level, t * 1000, ++mistakes), damHeight(right))) return false;
        }
    }
    const holdRate = (level: BeverLevel, minS?: number, maxS?: number, pRight?: number) => {
        const rnd = mulberry32(42);
        let held = 0;
        for (let i = 0; i < 1000; i++) if (holds(level, rnd, minS, maxS, pRight)) held++;
        return held / 1000;
    };

    test('the tuning: an average L2 pupil holds the dam on Normaal; Moeilijk is tight', () => {
        expect(holdRate('normaal')).toBeGreaterThanOrEqual(0.92);
        const hard = holdRate('moeilijk');
        expect(hard).toBeGreaterThan(0.3);
        expect(hard).toBeLessThan(0.75);
        // A quick, sure pupil holds even Moeilijk; Moeilijk: a mistake raises the water much more and it rises faster.
        expect(holdRate('moeilijk', 4, 6, 0.9)).toBeGreaterThan(0.85);
        expect(BEVER.levels.moeilijk.wave).toBeGreaterThanOrEqual(2 * BEVER.levels.normaal.wave);
        expect(BEVER.levels.moeilijk.rise).toBeGreaterThan(BEVER.levels.normaal.rise);
        expect(waterLevel('normaal', 0, 0)).toBeLessThan(damHeight(0));
    });

    test('the skin: a stick per right answer; water over the dam calls the early end once, never under help', () => {
        const onFail = vi.fn();
        const at = (over: Partial<SkinProgress>, p: Partial<SkinProps> = {}) => propsWith({ onFail, progress: progressWith({ msLeft: 120_000, msTotal: 180_000, ...over }), ...p });
        const { container, rerender } = render(<Bever {...at({ right: 3 })} />);
        expect(container.querySelectorAll('.bv-dam .bv-stick')).toHaveLength(BEVER.dam0 + 3);
        rerender(<Bever {...at({ right: 4 }, { phase: 'right', feedback: { given: '12', expected: '12', correct: true } })} />);
        expect(container.querySelectorAll('.bv-dam .bv-stick')).toHaveLength(BEVER.dam0 + 4);
        expect(container.querySelector('.bv-stick.is-new')).not.toBeNull();
        expect(onFail).not.toHaveBeenCalled();
        // Many mistakes: the water is over the dam. Under help nothing happens; back in play, the dam breaks.
        rerender(<Bever {...at({ right: 4, mistakes: 12 }, { phase: 'help' })} />);
        expect(onFail).not.toHaveBeenCalled();
        rerender(<Bever {...at({ right: 4, mistakes: 12 }, { phase: 'wrong', feedback: { given: '1', expected: '12', correct: false } })} />);
        expect(onFail).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.bv-wave')).not.toBeNull();
        rerender(<Bever {...at({ right: 4, mistakes: 13 })} />);
        expect(onFail).toHaveBeenCalledTimes(1);
    });

    test('the level comes from the options; the endings: a party, or the beaver on its log', () => {
        expect(waterLevel('moeilijk', 60_000, 2)).toBeGreaterThan(waterLevel('normaal', 60_000, 2));
        const onFail = vi.fn();
        // Same time and mistakes: on Moeilijk the water is over, on Normaal it is not.
        const p = progressWith({ msLeft: 120_000, msTotal: 180_000, right: 2, mistakes: 3 });
        render(<Bever {...propsWith({ onFail, progress: p, options: { niveau: 'normaal' } })} />);
        expect(onFail).not.toHaveBeenCalled();
        cleanup();
        render(<Bever {...propsWith({ onFail, progress: p, options: { niveau: 'moeilijk' } })} />);
        expect(onFail).toHaveBeenCalledTimes(1);
        cleanup();
        const { container, rerender } = render(<BeverEnding outcome="won" progress={p} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.bv-hat')).not.toBeNull();
        rerender(<BeverEnding outcome="failed" progress={p} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.bv-log')).not.toBeNull();
    });
});

describe('Zombies: survivors behind barricades', () => {
    test('Normaal: three barricades first, then five survivors; Moeilijk: three survivors, no barricades', () => {
        expect(DEFENCE).toEqual({ makkelijk: { survivors: 5, barricades: 3 }, normaal: { survivors: 5, barricades: 3 }, moeilijk: { survivors: 3, barricades: 0 } });
        expect([1, 2, 3, 4, 5, 6, 7, 8].map(h => hitOf('normaal', h))).toEqual(['barricade', 'barricade', 'barricade', 'caught', 'caught', 'caught', 'caught', 'last']);
        expect([1, 2, 3].map(h => hitOf('moeilijk', h))).toEqual(['caught', 'caught', 'last']);
        expect(defenceAfter('normaal', 4)).toEqual({ barricades: 0, survivors: 4, caught: 1 });
        expect(defenceAfter('normaal', 20)).toEqual({ barricades: 0, survivors: 0, caught: 5 });
    });

    describe('the skin', () => {
        beforeEach(() => { vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] }); });
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

        test('the camp shows what still stands; a catch turns a survivor into a silly zombie', () => {
            const at = (misses: number, niveau = 'normaal') => propsWith({ options: { niveau }, progress: progressWith({ msLeft: 180_000, misses }) });
            const { container, rerender } = render(<Zombies {...at(0)} />);
            const count = (sel: string) => container.querySelectorAll(sel).length;
            expect(count('[data-barricade=up]')).toBe(3);
            expect(count('[data-survivor=safe]')).toBe(5);
            rerender(<Zombies {...at(2)} />);
            expect(count('[data-barricade=up]')).toBe(1);
            expect(count('.zb-bar.is-broken')).toBe(2);
            rerender(<Zombies {...at(4)} />);
            expect(count('[data-barricade=up]')).toBe(0);
            expect(count('[data-survivor=caught]')).toBe(1);
            // The one nearest the barricade, drawn as a zombie with googly eyes.
            expect(container.querySelector('.zb-crew > .zb-sv:last-child')!.getAttribute('data-survivor')).toBe('caught');
            expect(container.querySelector('.zb-sv.is-caught .zb-eye')).not.toBeNull();
            cleanup();
            const m = render(<Zombies {...at(0, 'moeilijk')} />);
            expect(m.container.querySelectorAll('[data-barricade]')).toHaveLength(0);
            expect(m.container.querySelectorAll('[data-survivor=safe]')).toHaveLength(3);
        });

        test('Moeilijk: a catch voices itself; the last survivor caught ends the round early', () => {
            const onMiss = vi.fn();
            const onFail = vi.fn();
            const sound = vi.fn();
            const props = (misses: number) => propsWith({ onMiss, onFail, sound, options: { niveau: 'moeilijk' }, progress: progressWith({ msLeft: 180_000, misses }) });
            const first = render(<Zombies {...props(0)} />);
            wait(30_000);
            expect(onMiss).toHaveBeenCalledTimes(1);
            expect(sound).toHaveBeenCalledWith('caught');
            expect(onFail).not.toHaveBeenCalled();
            first.unmount();
            render(<Zombies {...props(2)} />);
            wait(30_000);
            expect(onMiss).toHaveBeenCalledTimes(2);
            expect(onFail).toHaveBeenCalledTimes(1);
            expect(sound).toHaveBeenCalledTimes(1);
        });

        test('the session: zombies through count as misses; all caught = failed; survivors at the end = won', () => {
            const zombies = resolveMeta(meta('zombies'), { niveau: 'moeilijk' });
            sp().start(startWith(zombies));
            for (let i = 0; i < 3; i++) { sp().miss(); sp().next(); }
            expect(sp().misses).toBe(3);
            expect(sp().mistakes).toHaveLength(3);
            sp().fail();
            expect(sp().outcome).toBe('failed');
        });
    });

    test('the endings: survivors cheer, the caught ones dance as zombies', async () => {
        const { container, rerender } = render(<ZombiesEnding outcome="won" progress={progressWith({ misses: 4 })} options={{ niveau: 'normaal' }} reducedMotion={false} />);
        expect(container.querySelectorAll('[data-survivor=safe]')).toHaveLength(4);
        expect(container.querySelectorAll('.zb-sv.is-dance')).toHaveLength(1);
        rerender(<ZombiesEnding outcome="failed" progress={progressWith({ misses: 3 })} options={{ niveau: 'moeilijk' }} reducedMotion />);
        expect(container.querySelectorAll('[data-survivor=safe]')).toHaveLength(0);
        expect(container.querySelector('.zb-ending.is-still')).not.toBeNull();
        // The end screen loads the skin's Ending lazily.
        const Ending = skinById('zombies')!.Ending!;
        cleanup();
        render(<Suspense fallback={null}><Ending outcome="won" progress={progressWith()} options={{}} reducedMotion={false} /></Suspense>);
        await waitFor(() => expect(document.querySelector('.zb-party')).not.toBeNull());
    });
});
