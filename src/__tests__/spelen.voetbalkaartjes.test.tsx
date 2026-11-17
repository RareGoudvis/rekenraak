// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { PAIR_HIT_MS, PAIRS_SIZE } from '../oefenen/spelen/board/hartjes/hearts';
import { NO_BOARDS, followBoards, wijGoals } from '../oefenen/spelen/board/voetbalkaartjes/score';
import type { SpelBoard } from '../oefenen/spelen/board/board';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import type { SkinChoices, SkinProps } from '../oefenen/spelen/skins/types';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';
import { useOefenStore } from '../oefenen/useOefenStore';

// Voetbalkaartjes: Hartjes koppelen's memory with footballs (the same board and component), a Wij – Zij scoreboard,
// a ball going flat after a logged mistake, and the pair moment: a ball into a net, the score ticking up.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const META = () => skinById('voetbalkaartjes')!.meta;
const start = (picked: SkinChoices = {}) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(META(), picked) });
const cells = () => sp().board!.cells;
const wrongFor = (i: number) => cells()[(i + 1) % cells().length].question.answer;
const card = (root: HTMLElement, cell: number, side: 'sum' | 'answer') => root.querySelector<HTMLButtonElement>(`.hj-slot [data-cell="${cell}"].is-${side}`)!;
const fakeBoard = (key: string, solved: number, size = 6) => ({ key, cells: Array.from({ length: size }, (_, i) => ({ state: i < solved ? 'solved' : 'open' })) }) as unknown as SpelBoard;

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Voetbalkaartjes: the registry and the score, pure', () => {
    test('its own tile: year-round, Zoeken en koppelen, sport music, Normaal / Moeilijk, the Hartjes board round', () => {
        const m = META();
        expect(m).toMatchObject({ label: 'Voetbalkaartjes', input: 'board', timed: false, music: 'sport' });
        expect(m.season).toBeUndefined();
        expect(gameGroupOf(m)).toBe('zoeken');
        expect(m.options!.map(o => o.id)).toEqual(['niveau']);
        expect(m.round.board).toEqual(skinById('hartjes')!.meta.round.board);
        expect(m.accepts).toEqual(skinById('hartjes')!.meta.accepts);
        expect(resolveMeta(m, { niveau: 'moeilijk' }).round.board!.size).toBe(PAIRS_SIZE.moeilijk);
        expect(m.sounds).toMatchObject({ wrong: null, caught: 'whoosh', launch: 'zwoesj' });
        expect(GAME_BLURB.voetbalkaartjes).toBeTruthy();
    });

    test('every pair found is a goal for Wij, over both boards; the same board counts once', () => {
        const one = followBoards(NO_BOARDS, fakeBoard('a', 0));
        expect(wijGoals(one, fakeBoard('a', 0))).toBe(0);
        expect(wijGoals(one, fakeBoard('a', 4))).toBe(4);
        expect(followBoards(one, fakeBoard('a', 6))).toBe(one);
        const two = followBoards(one, fakeBoard('b', 0, 5));
        expect(two).toEqual({ key: 'b', cells: 5, before: 6 });
        expect(wijGoals(two, fakeBoard('b', 3, 5))).toBe(9);
        expect(wijGoals(two, null)).toBe(6);
    });
});

describe('Voetbalkaartjes: the game', () => {
    test('balls on a pitch, "Bal, dicht", the scoreboard at Wij 0 – Zij 0; no hearts', async () => {
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Ballen' });
        const all = within(group).getAllByRole('button');
        expect(all).toHaveLength(12);
        expect(all.every(b => b.getAttribute('aria-label') === 'Bal, dicht')).toBe(true);
        expect(container.querySelector('.hj-root.is-ball .hj-pitch')).toBeTruthy();
        expect(container.querySelector('.hj-deco')).toBeNull();
        expect(group.querySelectorAll('.hj-ball')).toHaveLength(24);
        expect(screen.getByRole('img', { name: 'Wij 0, Zij 0' })).toBeTruthy();
    }, 15_000);

    test('a logged mistake flattens the sum\'s ball (its own cue: caught), the first strike does nothing', async () => {
        const Voetbalkaartjes = (await import('../oefenen/spelen/board/voetbalkaartjes/Voetbalkaartjes')).default;
        act(() => start());
        const sound = vi.fn();
        const props = { board: sp().board, phase: 'play', onBoardPick: vi.fn(), onBoardFocus: vi.fn(), sound, options: {} } as unknown as SkinProps;
        const { rerender } = render(<Voetbalkaartjes {...props} />);
        const group = screen.getByRole('group', { name: 'Ballen' });
        act(() => sp().boardPick(0, wrongFor(0)));
        rerender(<Voetbalkaartjes {...props} board={sp().board} />);
        expect(sound).not.toHaveBeenCalledWith('caught');
        act(() => sp().boardPick(0, wrongFor(0)));
        rerender(<Voetbalkaartjes {...props} board={sp().board} />);
        expect(sound).toHaveBeenCalledWith('caught');
        expect(sp().mistakes).toHaveLength(1);
        expect(card(group, 0, 'sum').querySelector('.hj-ball.is-broken .hj-ball-crease')).toBeTruthy();
        // Zij never scores, not even on a mistake.
        expect(screen.getByRole('img', { name: 'Wij 0, Zij 0' })).toBeTruthy();
    });

    test('a found pair: the cards fly together, a ball goes into the net with confetti and Goal!, and Wij ticks up as it goes in', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Ballen' });
        fireEvent.click(card(group, 1, 'sum'));
        fireEvent.click(card(group, 1, 'answer'));
        const moment = container.querySelector('.hj-moment.is-ball')!;
        expect(moment).toBeTruthy();
        expect(moment.querySelectorAll('.hj-ghost .hj-ball')).toHaveLength(2);
        expect(moment.querySelectorAll('.hj-net .hj-goalnet')).toHaveLength(2);
        expect(moment.querySelector('.hj-kick .hj-ball')).toBeTruthy();
        // The ball is not in yet.
        expect(screen.getByRole('img', { name: 'Wij 0, Zij 0' })).toBeTruthy();
        act(() => { vi.advanceTimersByTime(PAIR_HIT_MS + 20); });
        expect(screen.getByText('Goal!')).toBeTruthy();
        expect(moment.querySelector('.spel-burst.is-pieces')).toBeTruthy();
        expect(screen.getByRole('img', { name: 'Wij 1, Zij 0' })).toBeTruthy();
        // A second pair while the first moment still plays: the taps never wait.
        fireEvent.click(card(group, 2, 'sum'));
        fireEvent.click(card(group, 2, 'answer'));
        act(() => { vi.advanceTimersByTime(PAIR_HIT_MS + 20); });
        expect(screen.getByRole('img', { name: 'Wij 2, Zij 0' })).toBeTruthy();
        act(() => { vi.advanceTimersByTime(2000); });
        expect(container.querySelector('.hj-moment')).toBeNull();
    }, 15_000);

    test('the goals carry over to the second board', async () => {
        act(() => start());
        render(<SpelScreen />);
        await screen.findByRole('group', { name: 'Ballen' });
        const first = cells().length;
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => { for (let i = 0; i < first; i++) sp().boardPick(i, cells()[i].question.answer); });
        act(() => { vi.advanceTimersByTime(2500); });
        expect(sp().board!.index).toBe(1);
        expect(screen.getByRole('img', { name: `Wij ${first}, Zij 0` })).toBeTruthy();
        act(() => sp().boardPick(0, cells()[0].question.answer));
        act(() => { vi.advanceTimersByTime(PAIR_HIT_MS + 20); });
        expect(screen.getByRole('img', { name: `Wij ${first + 1}, Zij 0` })).toBeTruthy();
    }, 15_000);
});
