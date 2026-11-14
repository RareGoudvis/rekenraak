// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore, type SpelStart } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import { skinById, SKINS } from '../oefenen/spelen/skins/registry';
import type { SkinMeta, SkinProgress, SkinProps } from '../oefenen/spelen/skins/types';
import { OPTIONS_KEY, choicesOf, loadChoices, resolveMeta } from '../oefenen/spelen/skins/options';
import { createSpelEvents } from '../oefenen/spelen/events';
import GamePicker from '../oefenen/spelen/GamePicker';
import SpelEnd from '../oefenen/spelen/SpelEnd';
import Bom, { BomEnding } from '../oefenen/spelen/skins/bom/Bom';
import { clockText, fuseLeft, fusePoint, isHurry } from '../oefenen/spelen/skins/bom/fuse';
import { resetKiosk } from './helpers/oefenKiosk';

// Spelen round 2: the pre-start options screen (remembered per skin), the friendly early end (canFail skins
// only) and Bom (N right before the clock).

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
    test('only Bom, Bever and Zombies have options; picks patch the round, unknown picks fall back to the default', () => {
        expect(SKINS.filter(s => s.meta.options?.length && !['bom', 'bever', 'zombies'].includes(s.meta.id))).toEqual([]);
        const bom = meta('bom');
        expect(resolveMeta(bom).round).toEqual({ seconds: 180, goal: 10, goalKeep: true });
        const big = resolveMeta(bom, { tijd: '5', doel: '50' });
        expect(big.round).toEqual({ seconds: 300, goal: 50, goalKeep: true });
        expect(big.chosen).toEqual({ tijd: '5', doel: '50' });
        expect(choicesOf(bom, { tijd: '7', doel: 'x' })).toEqual({ tijd: '3', doel: '10' });
        // A skin without options is passed through untouched.
        expect(resolveMeta(meta('ballonnen'))).toBe(meta('ballonnen'));
    });

    test('the screen: defaults preselected, one tap on Start; the last pick is remembered per skin', () => {
        const onPick = vi.fn();
        render(<GamePicker onPick={onPick} />);
        fireEvent.click(screen.getByRole('button', { name: 'Bom, op tijd' }));
        expect(screen.getByRole('heading', { name: 'Bom' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '3 minuten' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: '10 juist' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: '5 minuten' }));
        fireEvent.click(screen.getByRole('button', { name: '20 juist' }));
        expect(screen.getByRole('button', { name: '3 minuten' }).getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(onPick).toHaveBeenCalledTimes(1);
        expect(onPick.mock.calls[0][0]).toMatchObject({ id: 'bom', round: { seconds: 300, goal: 20 }, chosen: { tijd: '5', doel: '20' } });
        cleanup();
        render(<GamePicker onPick={onPick} />);
        fireEvent.click(screen.getByRole('button', { name: 'Bom, op tijd' }));
        expect(screen.getByRole('button', { name: '5 minuten' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: '20 juist' }).getAttribute('aria-pressed')).toBe('true');
        // Ander spel goes back to the tiles.
        fireEvent.click(screen.getByRole('button', { name: /Ander spel/ }));
        expect(screen.getByRole('group', { name: 'Kies een spel' })).toBeTruthy();
        // A skin without options starts at once.
        cleanup();
        onPick.mockClear();
        render(<GamePicker onPick={onPick} />);
        fireEvent.click(screen.getByRole('button', { name: 'Ballonnen' }));
        expect(onPick).toHaveBeenCalledWith(meta('ballonnen'));
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
    const CAN_FAIL: SkinMeta = { id: 'proef', label: 'Proef', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'Gehouden!' };

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
        expect(SKINS.filter(s => s.meta.canFail && !['bever', 'zombies'].includes(s.meta.id))).toEqual([]);
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
