// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, SPEL_BOARD_PAUSE_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import Honingraat, { SCROLL_MS } from '../oefenen/spelen/board/honingraat/Honingraat';
import { WASP_MS } from '../oefenen/spelen/board/honingraat/hive';
import { BOSS, bossDue, bossLeft, bossLength, bossRule, bossSums, bossVerdict } from '../oefenen/spelen/board/honingraat/boss';
import { HIVE_SOUNDS, playHive } from '../oefenen/spelen/board/honingraat/sounds';
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../oefenen/spelen/sound';
import type { BoardCell, SpelBoard } from '../oefenen/spelen/board/board';
import type { SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinProps, SkinResult } from '../oefenen/spelen/skins/types';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resetKiosk } from './helpers/oefenKiosk';

// Honingraat's Wespenkoningin (Moeilijk, Onmogelijk): after the last board the session waits (BoardRound.finale) while
// she fights for the honey. Right = a sting, her bar drops; wrong = she grabs a pot. Her bar empty: she flees (won);
// her last pot: she flies off with the honey (the friendly fail). Like the wasp battles, her sums are never logged.

const q = (a: number, b: number): SpelQuestion => ({
    slot: 0, exercise: {}, constraints: {}, key: `${a}+${b}`, kind: 'number', text: `${a} + ${b} = ?`, answer: String(a + b),
    choices: [String(a + b), String(a + b + 1), String(a + b - 1), String(a + b + 10)],
});
const cell = (question: SpelQuestion, state: BoardCell['state'], match = false): BoardCell => ({ question, match, tries: 0, state, helped: false, logged: state !== 'open' });

describe('the queen\'s rules (boss.ts)', () => {
    test('only Moeilijk and Onmogelijk: 6 hits / 3 pots and 8 hits / 2 pots', () => {
        expect(bossRule('makkelijk')).toBeNull();
        expect(bossRule('normaal')).toBeNull();
        expect(bossRule('moeilijk')).toEqual({ hits: BOSS.hits.moeilijk, pots: BOSS.pots.moeilijk });
        expect(bossRule('moeilijk')).toEqual({ hits: 6, pots: 3 });
        expect(bossRule('onmogelijk')).toEqual({ hits: 8, pots: 2 });
        expect(bossLength(bossRule('moeilijk')!)).toBe(8);
        expect(bossLength(bossRule('onmogelijk')!)).toBe(9);
    });

    test('the registry: a finale on the queen\'s levels only', () => {
        const meta = skinById('honingraat')!.meta;
        expect(resolveMeta(meta, { niveau: 'moeilijk' }).round.board!.finale).toBe(true);
        expect(resolveMeta(meta, { niveau: 'onmogelijk' }).round.board!.finale).toBe(true);
        expect(resolveMeta(meta, { niveau: 'normaal' }).round.board!.finale).toBeUndefined();
        expect(resolveMeta(meta, { niveau: 'makkelijk' }).round.board!.finale).toBeUndefined();
    });

    test('she comes when the last board is full, not before', () => {
        const cells = [cell(q(8, 5), 'solved', true), cell(q(9, 4), 'solved', true), cell(q(7, 7), 'open')];
        const board = (index: number, cs: BoardCell[]): SpelBoard => ({ key: `b${index}`, index, cells: cs, target: { kind: 'eq', n: 13 }, focus: null });
        expect(bossDue(board(4, cells), 5)).toBe(true);
        expect(bossDue(board(3, cells), 5)).toBe(false);
        expect(bossDue(board(4, [...cells, cell(q(6, 7), 'open', true)]), 5)).toBe(false);
        expect(bossDue(null, 5)).toBe(false);
    });

    test('her sums: enough for the longest fight, untapped near misses first; a short pool goes round again', () => {
        const rule = bossRule('moeilijk')!;
        const open = Array.from({ length: 10 }, (_, i) => cell(q(i, 3), 'open'));
        const found = Array.from({ length: 5 }, (_, i) => cell(q(i, 9), 'solved', true));
        const sums = bossSums([...found, ...open], mulberry32(2), rule);
        expect(sums).toHaveLength(8);
        expect(new Set(sums.map(s => s.key)).size).toBe(8);
        expect(sums.every(s => open.some(c => c.question.key === s.key))).toBe(true);
        const short = bossSums([cell(q(1, 1), 'open'), cell(q(2, 2), 'solved', true)], mulberry32(2), rule);
        expect(short).toHaveLength(8);
        expect(new Set(short.map(s => s.key)).size).toBe(2);
        expect(bossSums([], mulberry32(2), rule)).toEqual([]);
    });

    test('the verdict as soon as it is sure: her bar empty = fled, her last pot = robbed', () => {
        const m = bossRule('moeilijk')!, o = bossRule('onmogelijk')!;
        expect(bossVerdict([], m)).toBeNull();
        expect(bossVerdict([true, true, true, true, true], m)).toBeNull();
        expect(bossVerdict([true, false, true, true, false, true, true, true], m)).toBe('fled');
        expect(bossVerdict([false, false], m)).toBeNull();
        expect(bossVerdict([false, true, false, false], m)).toBe('robbed');
        expect(bossVerdict([false, false], o)).toBe('robbed');
        expect(bossVerdict(Array(8).fill(true), o)).toBe('fled');
        expect(bossLeft([true, false, true], m)).toEqual({ health: 4, pots: 2 });
        expect(bossLeft([false, false, false, false], m)).toEqual({ health: 6, pots: 0 });
    });

    test('her own sounds: every one a recipe under the shared on / off', () => {
        class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } value = 0; }
        class Node { connect<T>(n: T) { return n; } }
        let made = 0;
        class Ctx {
            state = 'running'; currentTime = 0; sampleRate = 8000; destination = new Node();
            resume() { return Promise.resolve(); }
            createGain() { return Object.assign(new Node(), { gain: new Param() }); }
            createBiquadFilter() { return Object.assign(new Node(), { type: '', frequency: new Param(), Q: new Param() }); }
            createOscillator() { made++; return Object.assign(new Node(), { type: '', frequency: new Param(), start() { }, stop() { } }); }
            createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
            createBufferSource() { made++; return Object.assign(new Node(), { buffer: null, start() { }, stop() { } }); }
        }
        const g = globalThis as unknown as { AudioContext?: unknown };
        g.AudioContext = Ctx;
        localStorage.setItem(SOUND_KEY, '0');
        resetSoundForTests();
        setSoundOn(true);
        expect(HIVE_SOUNDS).toEqual(['queen', 'sting', 'ouch', 'grab', 'fled', 'robbed']);
        for (const s of HIVE_SOUNDS) {
            const before = made;
            playHive(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playHive('queen');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});

let data: EenvoudigData;
let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const HONING = () => skinById('honingraat')!.meta;
const cells = () => sp().board!.cells;

beforeAll(async () => {
    data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('the session waits for the queen (BoardRound.finale)', () => {
    const startAt = (niveau: string) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(HONING(), { niveau }) });
    const fillBoard = () => cells().forEach((c, i) => { if (c.match) sp().boardPick(i, ''); });

    test('Moeilijk: the full last board stays in play; Normaal ends as before', () => {
        vi.useFakeTimers();
        startAt('moeilijk');
        for (let b = 0; b < 5; b++) { fillBoard(); vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS); }
        expect(sp().phase).toBe('play');
        expect(sp().board!.index).toBe(4);
        sp().finish({ title: 'De koningin is gevlucht!' });
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('won');
        startAt('normaal');
        for (let b = 0; b < 3; b++) { fillBoard(); vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS); }
        expect(sp().phase).toBe('end');
    });
});

describe('Honingraat: the Wespenkoningin on the screen', () => {
    const props = (niveau: string, extra: Partial<SkinProps> = {}): SkinProps => ({
        question: null, choices: null, board: sp().board, onBoardPick: (c, given, strike) => sp().boardPick(c, given, strike),
        phase: sp().phase === 'end' ? 'play' : sp().phase as SkinProps['phase'], feedback: null, onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(),
        onFail: () => sp().fail(), onFinish: (r: SkinResult) => sp().finish(r), onReport: (r: SkinResult) => sp().report(r),
        sound: vi.fn(), progress: progressOf(sp()), options: { niveau }, events: sp().events, ...extra,
    });
    const startAt = (niveau: string) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(HONING(), { niveau }) });
    const fillBoard = () => cells().forEach((c, i) => { if (c.match) sp().boardPick(i, ''); });
    const solve = (text: string) => {
        const m = text.replace(/−/g, '-').replace(/\s/g, '').match(/^(\d+)([+-])(\d+)=/)!;
        return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
    };
    const dropValue = (d: HTMLElement) => Number(d.getAttribute('aria-label')!.replace(/\s/g, ''));
    // Picks a right (true) or wrong (false) drop for the sum on the card.
    function pick(container: HTMLElement, card: HTMLElement, ok: boolean) {
        const sum = container.querySelector('.hx-wasp-sum')!.textContent!;
        fireEvent.click(within(card).getAllByRole('button').find(d => (dropValue(d) === solve(sum)) === ok)!);
    }

    // Plays every board (each wasp battle won), up to the queen's entrance.
    function toQueen(niveau: string, boards = 5) {
        const { rerender, container } = render(<Honingraat {...props(niveau)} />);
        const again = () => rerender(<Honingraat {...props(niveau)} />);
        for (let b = 0; b < boards; b++) {
            act(() => fillBoard());
            act(() => { vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS); });
            again();
            if (b === boards - 1) break;
            act(() => { vi.advanceTimersByTime(SCROLL_MS); });
            again();
            const wasp = screen.queryByLabelText(/wesp/);
            while (wasp && screen.queryByLabelText(/wesp/) && !within(wasp).queryByText('Weggejaagd!')) {
                pick(container, wasp, true);
                act(() => { vi.advanceTimersByTime(WASP_MS.right); });
            }
            if (wasp) { act(() => { vi.advanceTimersByTime(WASP_MS.chased); }); again(); }
        }
        return { container, again };
    }

    test('Moeilijk: the intro, a hit, a grab, and six hits send her off with a sore bottom: the round is won', () => {
        vi.useFakeTimers();
        act(() => startAt('moeilijk'));
        const { container, again } = toQueen('moeilijk');
        const card = screen.getByLabelText('De Wespenkoningin');
        // The intro: her name in big letters, no drops yet, the board behind her takes no taps.
        expect(within(card).getByText('De koningin komt eraan!')).toBeTruthy();
        expect(within(card).getByText('Raak haar 6 keer voor ze je 3 potten pakt!')).toBeTruthy();
        expect(within(card).queryAllByRole('button')).toHaveLength(0);
        expect(container.querySelector('.hx-view.is-under-attack')!.hasAttribute('inert')).toBe(true);
        expect(screen.getByLabelText('Koningin: nog 6 van 6')).toBeTruthy();
        expect(screen.getByLabelText('Nog 3 potten honing')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(BOSS.ms.intro); });
        expect(within(card).getByText('Raak de koningin!')).toBeTruthy();
        expect(within(card).getAllByRole('button')).toHaveLength(3);
        const before = sp().history.length;

        // A hit: the swarm stings, her bar drops.
        pick(container, card, true);
        expect(container.querySelector('.hx-boss.is-hit .hx-q-swarm')).toBeTruthy();
        expect(screen.getByLabelText('Koningin: nog 5 van 6')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(BOSS.ms.hit); });
        // A grab: she takes a pot and carries it.
        pick(container, card, false);
        expect(container.querySelector('.hx-boss.is-grab')).toBeTruthy();
        expect(screen.getByLabelText('Nog 2 potten honing')).toBeTruthy();
        expect(container.querySelectorAll('.hx-q-carried-pot')).toHaveLength(1);
        act(() => { vi.advanceTimersByTime(BOSS.ms.grab); });
        for (let k = 0; k < 5; k++) {
            pick(container, card, true);
            act(() => { vi.advanceTimersByTime(BOSS.ms.hit); });
        }
        expect(within(card).getByText('Ze vlucht! De honing is gered!')).toBeTruthy();
        expect(container.querySelector('.hx-boss.is-fled')).toBeTruthy();
        expect(sp().phase).toBe('play');
        act(() => { vi.advanceTimersByTime(BOSS.ms.fled); });
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('won');
        expect(sp().result!.title).toBe('De koningin is gevlucht!');
        // Never logged, as the wasp battles: the sums were asked on the boards.
        expect(sp().history).toHaveLength(before);
        again();
    });

    test('Onmogelijk: two wrong and she flies off with the honey, the friendly early end', () => {
        vi.useFakeTimers();
        act(() => startAt('onmogelijk'));
        const { container } = toQueen('onmogelijk');
        const card = screen.getByLabelText('De Wespenkoningin');
        expect(within(card).getByText('Raak haar 8 keer voor ze je 2 potten pakt!')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(BOSS.ms.intro); });
        pick(container, card, false);
        act(() => { vi.advanceTimersByTime(BOSS.ms.grab); });
        pick(container, card, false);
        expect(screen.getByLabelText('Nog 0 potten honing')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(BOSS.ms.grab); });
        expect(within(card).getByText('Oei! Ze vliegt weg met de honing!')).toBeTruthy();
        expect(container.querySelectorAll('.hx-boss.is-robbed .hx-q-carried-pot')).toHaveLength(2);
        expect(sp().phase).toBe('play');
        act(() => { vi.advanceTimersByTime(BOSS.ms.robbed); });
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('failed');
        expect(sp().result!.title).toBe('Oei! De koningin heeft de honing. Nog eens?');
    });

    test('"Hoe los ik dit op?" pauses her, as in a battle', () => {
        vi.useFakeTimers();
        act(() => startAt('moeilijk'));
        const { again } = toQueen('moeilijk');
        act(() => sp().openHelp());
        expect(sp().phase).toBe('help');
        again();
        act(() => { vi.advanceTimersByTime(BOSS.ms.intro * 2); });
        expect(screen.getByText('De koningin komt eraan!')).toBeTruthy();
        act(() => sp().closeHelp());
        again();
        act(() => { vi.advanceTimersByTime(BOSS.ms.intro); });
        expect(screen.getByText('Raak de koningin!')).toBeTruthy();
    });

    test('Normaal: no queen, the round ends after the last board', () => {
        vi.useFakeTimers();
        act(() => startAt('normaal'));
        toQueen('normaal', 3);
        expect(sp().phase).toBe('end');
        expect(screen.queryByLabelText('De Wespenkoningin')).toBeNull();
    });
});
