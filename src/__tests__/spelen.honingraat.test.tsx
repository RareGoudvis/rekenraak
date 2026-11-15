// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, usableVariants, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, SPEL_BOARD_PAUSE_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import Honingraat, { SCROLL_MS } from '../oefenen/spelen/board/honingraat/Honingraat';
import { WASP_MS } from '../oefenen/spelen/board/honingraat/hive';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinProps } from '../oefenen/spelen/skins/types';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { skinAccepts, skinsFor, NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import { meetsTarget, type NumberTarget } from '../oefenen/spelen/board/board';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { combLayout, combRows } from '../oefenen/spelen/board/honingraat/comb';
import { mulberry32 } from '../oefenen/spelen/distractors';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';

// Honingraat: a board round (find every sum that makes the target). A wrong cell is a mistake at once,
// three boards (comb, meadow, comb), and Nakijken replays exactly the wrong cells. Moeilijk: five boards and
// a wasp now and then (its own little fight, never logged), which can claim the nest (the early end).

let data: EenvoudigData;
let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const kiosk = () => useOefenStore.getState();
const HONING = () => skinById('honingraat')!.meta;
const start = () => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: HONING() });
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

describe('honeycomb generation', () => {
    test('over every playable + / − card (leerjaar 1 to 3): 3 to 5 sums to find, near misses never on the target', () => {
        const TARGET = HONING().round.board!;
        let boards = 0;
        for (const g of [1, 2, 3] as const) {
            for (const topic of usableVariants(data, g).keys()) {
                for (const c of choicesFor(data, g, topic)) {
                    // Honingraat takes + and − only (accepts.ops): a single tafel has too few sums for a comb.
                    if (!choiceCanPlay(c, g) || !skinAccepts(HONING().accepts, spelContentOf(c, g)!)) continue;
                    const s = { ...buildZelfSessie(c, { kind: 'count', n: 10 }, 0, g), total: undefined };
                    for (let seed = 0; seed < 3; seed++) {
                        const comb = nextBoardOf(s, TARGET, null, [], undefined, mulberry32(seed))!;
                        // Number cards get the number comb (a pack's comb has its own suite).
                        const t = comb.target as NumberTarget;
                        expect(comb.cells, c.label).toHaveLength(TARGET.size);
                        const hits = comb.cells.filter(x => x.match);
                        expect(hits.length).toBeGreaterThanOrEqual(3);
                        expect(hits.length).toBeLessThanOrEqual(5);
                        for (const x of comb.cells) {
                            expect(x.match).toBe(meetsTarget(x.question.facts!.answer, t));
                            if (!x.match) expect(x.question.facts!.answer).not.toBe(t.n);
                        }
                        // The next comb never repeats a sum of this one.
                        const next = nextBoardOf(s, TARGET, comb, [], undefined, mulberry32(seed + 9))!;
                        const before = new Set(comb.cells.map(x => x.question.key));
                        expect(next.cells.some(x => before.has(x.question.key))).toBe(false);
                        expect(next.index).toBe(1);
                        boards += 2;
                    }
                }
            }
        }
        expect(boards).toBeGreaterThan(60);
    });

    test('the comb: 4-5-4 cells that interlock', () => {
        expect(combRows(13)).toEqual([4, 5, 4]);
        expect(combRows(14)).toEqual([5, 4, 5]);
        const { cells: at, width } = combLayout(13);
        expect(width).toBe(5);
        expect(at[0].x).toBe(1);
        expect(at[4].x).toBe(0.5);
    });

    test('Honingraat sits in the registry, in Lente, and takes whole + − numbers and the breuken comb', () => {
        expect(HONING()).toMatchObject({ input: 'board', timed: false, season: 'lente', accepts: { kinds: ['number', 'choice'], ops: ['+', '-'], pictures: true, board: 'target' } });
        expect(skinsFor(SKINS, NUMBER_CONTENT).map(s => s.meta.id)).toContain('honingraat');
    });
});

describe('Honingraat: every wrong cell is a mistake, three combs, Nakijken gets those sums', () => {
    test('a wrong cell is logged at once with the claim, closes, and the comb clears when every match is filled', () => {
        vi.useFakeTimers();
        start();
        const wrongKeys: string[] = [];
        for (let comb = 0; comb < 3; comb++) {
            expect(sp().board!.index).toBe(comb);
            const t = sp().board!.target!;
            const miss = cells().findIndex(c => !c.match);
            wrongKeys.push(cells()[miss].question.key);
            sp().boardPick(miss, '');
            expect(cells()[miss].state).toBe('missed');
            expect(sp().mistakes.at(-1)!.given).toBe(t.kind === 'eq' ? String(t.n) : `meer dan ${t.n}`);
            // A closed cell takes no second pick.
            sp().boardPick(miss, '');
            expect(sp().mistakes).toHaveLength(comb + 1);
            expect(sp().question!.key).toBe(cells()[miss].question.key);
            cells().forEach((c, i) => { if (c.match) sp().boardPick(i, ''); });
            expect(sp().phase).toBe('right');
            vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS);
        }
        expect(sp().phase).toBe('end');
        expect(sp().mistakes.map(m => m.question.key)).toEqual(wrongKeys);
        expect(sp().history.filter(h => !h.correct).map(h => h.exerciseKey)).toEqual(wrongKeys);
        const mistakes = sp().mistakes.map(m => m.question);
        sp().nakijken();
        expect(kiosk().sessie!.title).toBe('Nakijken');
        expect(kiosk().fixed!.map(f => f.exerciseKey)).toEqual(mistakes.map(q => q.key));
        expect(kiosk().shown!.exercise).toEqual(mistakes[0].exercise);
    });
});

describe('Honingraat on the shell', () => {
    test('the target sign, a wrong cell shows its own answer, a right one fills with honey', async () => {
        act(() => start());
        render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Honingraat' });
        const t = sp().board!.target!;
        expect(screen.getByText(t.kind === 'eq' ? /Zoek alle sommen die/ : /Zoek alle sommen groter dan/)).toBeTruthy();
        expect(screen.getByLabelText('1 van 3')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Hoe los ik dit op/ })).toBeNull();
        const buttons = within(group).getAllByRole('button') as HTMLButtonElement[];
        expect(buttons).toHaveLength(13);
        const miss = cells().findIndex(c => !c.match);
        const hit = cells().findIndex(c => c.match);
        fireEvent.click(buttons[miss]);
        expect(buttons[miss].classList.contains('is-missed')).toBe(true);
        expect(buttons[miss].getAttribute('aria-label')).toContain(` is ${cells()[miss].question.answer}`);
        // Help explains the cell tapped last.
        expect(screen.getByRole('button', { name: /Hoe los ik dit op/ })).toBeTruthy();
        fireEvent.click(buttons[hit]);
        expect(buttons[hit].classList.contains('is-honey')).toBe(true);
        expect(sp().score).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
    });
});

describe('Honingraat round 4: the meadow, the scroll, the wasp', () => {
    // The skin on its own, fed from the store as SpelScreen feeds it (no lazy chunk, fake timers throughout).
    const props = (niveau: string, onFail = vi.fn()): SkinProps => ({
        question: null, choices: null, board: sp().board, onBoardPick: (cell, given, strike) => sp().boardPick(cell, given, strike),
        phase: sp().phase === 'end' ? 'play' : sp().phase as SkinProps['phase'], feedback: null, onAnswer: vi.fn(), onHelp: vi.fn(), onMiss: vi.fn(),
        onFail, sound: vi.fn(), progress: progressOf(sp()), options: { niveau }, events: sp().events, reducedMotion: false,
    });
    const startAt = (niveau: string) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(HONING(), { niveau }) });
    const fillBoard = () => cells().forEach((c, i) => { if (c.match) sp().boardPick(i, ''); });
    const solve = (text: string) => {
        const m = text.replace(/−/g, '-').replace(/\s/g, '').match(/^(\d+)([+-])(\d+)=/)!;
        return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
    };
    const dropValue = (d: HTMLElement) => Number(d.getAttribute('aria-label')!.replace(/\s/g, ''));

    // Fills the board, waits the session's pause, then the scroll to the next one.
    function nextBoard(rerender: (ui: React.ReactElement) => void, niveau: string, onFail = vi.fn()) {
        act(() => fillBoard());
        act(() => { vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS); });
        rerender(<Honingraat {...props(niveau, onFail)} />);
        act(() => { vi.advanceTimersByTime(SCROLL_MS); });
        rerender(<Honingraat {...props(niveau, onFail)} />);
    }

    test('the second board is a flower meadow: the old board scrolls away, a wrong flower wilts, a right one opens', () => {
        vi.useFakeTimers();
        act(() => startAt('normaal'));
        const { rerender, container } = render(<Honingraat {...props('normaal')} />);
        expect(screen.getByRole('group', { name: 'Honingraat' })).toBeTruthy();
        act(() => fillBoard());
        act(() => { vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS); });
        rerender(<Honingraat {...props('normaal')} />);
        // Both boards on screen while the scene scrolls, the bee flying between; the new one takes no taps yet.
        expect(container.querySelector('.hx-view.is-leaving')).toBeTruthy();
        expect(container.querySelector('.hx-traveller')).toBeTruthy();
        const flowers = within(screen.getByRole('group', { name: 'Bloemenweide' })).getAllByRole('button') as HTMLButtonElement[];
        expect(flowers).toHaveLength(13);
        expect(flowers.every(f => f.disabled)).toBe(true);
        act(() => { vi.advanceTimersByTime(SCROLL_MS); });
        rerender(<Honingraat {...props('normaal')} />);
        expect(container.querySelector('.hx-view.is-leaving')).toBeNull();
        const miss = cells().findIndex(c => !c.match);
        const hit = cells().findIndex(c => c.match);
        const flower = (i: number) => within(screen.getByRole('group', { name: 'Bloemenweide' })).getAllByRole('button')[i];
        fireEvent.click(flower(miss));
        rerender(<Honingraat {...props('normaal')} />);
        fireEvent.click(flower(hit));
        rerender(<Honingraat {...props('normaal')} />);
        expect(flower(miss).classList.contains('is-wilted')).toBe(true);
        expect(flower(miss).getAttribute('aria-label')).toContain(` is ${cells()[miss].question.answer}`);
        expect(flower(hit).classList.contains('is-open')).toBe(true);
        expect(sp().mistakes).toHaveLength(1);
        // Normaal: no wasp before the third board, a comb again.
        nextBoard(rerender, 'normaal');
        expect(screen.getByRole('group', { name: 'Honingraat' })).toBeTruthy();
        expect(screen.queryByLabelText('Een wesp!')).toBeNull();
    });

    test('Moeilijk: five boards; before the third a wasp brings five sums, four right chases it off and nothing is logged', () => {
        vi.useFakeTimers();
        act(() => startAt('moeilijk'));
        expect(progressOf(sp()).board).toEqual({ index: 0, total: 5 });
        const { rerender, container } = render(<Honingraat {...props('moeilijk')} />);
        nextBoard(rerender, 'moeilijk');
        expect(screen.queryByLabelText('Een wesp!')).toBeNull();
        nextBoard(rerender, 'moeilijk');
        expect(sp().board!.index).toBe(2);
        const card = screen.getByLabelText('Een wesp!');
        expect(within(card).getByText('Een wesp! Jaag hem weg.')).toBeTruthy();
        expect(container.querySelector('.hx-view.is-under-attack')!.hasAttribute('inert')).toBe(true);
        const before = sp().history.length;
        for (let k = 0; k < 4; k++) {
            const sum = container.querySelector('.hx-wasp-sum')!.textContent!;
            const drops = within(card).getAllByRole('button');
            expect(drops).toHaveLength(3);
            fireEvent.click(drops.find(d => dropValue(d) === solve(sum))!);
            act(() => { vi.advanceTimersByTime(WASP_MS.right); });
        }
        expect(within(card).getByText('Weggejaagd!')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(WASP_MS.chased); });
        expect(screen.queryByLabelText('Een wesp!')).toBeNull();
        expect(sp().history).toHaveLength(before);
        expect(sp().phase).toBe('play');
        const comb = within(screen.getByRole('group', { name: 'Honingraat' })).getAllByRole('button') as HTMLButtonElement[];
        expect(comb.some(b => !b.disabled)).toBe(true);
    });

    test('Moeilijk: two wrong drops and the wasp claims the nest, the friendly early end', () => {
        vi.useFakeTimers();
        act(() => startAt('moeilijk'));
        const onFail = vi.fn(() => sp().fail());
        const { rerender, container } = render(<Honingraat {...props('moeilijk', onFail)} />);
        nextBoard(rerender, 'moeilijk', onFail);
        nextBoard(rerender, 'moeilijk', onFail);
        const card = screen.getByLabelText('Een wesp!');
        for (let k = 0; k < 2; k++) {
            const sum = container.querySelector('.hx-wasp-sum')!.textContent!;
            fireEvent.click(within(card).getAllByRole('button').find(d => dropValue(d) !== solve(sum))!);
            act(() => { vi.advanceTimersByTime(WASP_MS.wrong); });
        }
        expect(within(card).getByText('De wesp pakt het nest!')).toBeTruthy();
        expect(onFail).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(WASP_MS.claimed); });
        expect(onFail).toHaveBeenCalledTimes(1);
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('failed');
    });
});
