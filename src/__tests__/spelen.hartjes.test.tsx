// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, usableVariants, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { BREUK_LEAVES } from '../oefenen/spelen/content/breuken/breukPack';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { skinAccepts } from '../oefenen/spelen/accepts';
import { buildBoard, pairsBoard } from '../oefenen/spelen/board/board';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { cardLook, gridOf, lookOf, PAIRS_SIZE } from '../oefenen/spelen/board/hartjes/hearts';
import { mulberry32 } from '../oefenen/spelen/distractors';
import type { SkinChoices, SkinProps } from '../oefenen/spelen/skins/types';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';
import { useOefenStore } from '../oefenen/useOefenStore';

// Hartjes koppelen round 4: Normaal (12 cards) and Moeilijk (16), the Voetballen look, and a sum's card after its
// logged mistake (broken, then patched once paired). The pairing and logging rules themselves: spelen.board.test.tsx.

let data: EenvoudigData;
let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const HARTJES = () => skinById('hartjes')!.meta;
const metaWith = (picked: SkinChoices) => resolveMeta(HARTJES(), picked);
const start = (picked: SkinChoices) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: metaWith(picked) });
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
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Hartjes: the rules for the cards, pure', () => {
    test('a sum card is whole until its logged mistake, broken while open, patched once paired', () => {
        expect(cardLook({ tries: 0, state: 'open' })).toBe('whole');
        expect(cardLook({ tries: 1, state: 'open' })).toBe('whole');
        expect(cardLook({ tries: 1, state: 'solved' })).toBe('whole');
        expect(cardLook({ tries: 2, state: 'open' })).toBe('broken');
        expect(cardLook({ tries: 3, state: 'open' })).toBe('broken');
        expect(cardLook({ tries: 2, state: 'solved' })).toBe('patched');
    });

    test('cards per row: 12 = 4 × 3 wide, 3 × 4 on a phone; 16 = 6 + 6 + 4 wide, 4 × 4 upright, 3 across a tall phone; fewer pairs still fit', () => {
        expect(gridOf(12)).toEqual({ landscape: { cols: 4, rows: 3 }, portrait: { cols: 3, rows: 4 }, tall: { cols: 3, rows: 4 }, short: { cols: 6, rows: 2 } });
        expect(gridOf(16)).toEqual({ landscape: { cols: 6, rows: 3 }, portrait: { cols: 4, rows: 4 }, tall: { cols: 3, rows: 6 }, short: { cols: 8, rows: 2 } });
        expect(gridOf(14).landscape).toEqual({ cols: 5, rows: 3 });
        expect(gridOf(10).landscape).toEqual({ cols: 4, rows: 3 });
        expect(gridOf(6).landscape).toEqual({ cols: 3, rows: 2 });
    });

    test('the options: Hartjes or Voetballen, Normaal 6 pairs or Moeilijk 8; the default round stays Normaal', () => {
        expect(HARTJES().round.board).toEqual({ kind: 'pairs', boards: 2, size: 6, strikes: 2 });
        expect(metaWith({}).round.board!.size).toBe(PAIRS_SIZE.normaal);
        expect(metaWith({ niveau: 'moeilijk' }).round.board).toEqual({ kind: 'pairs', boards: 2, size: 8, strikes: 2 });
        expect(metaWith({ look: 'voetballen', niveau: 'moeilijk' }).chosen).toEqual({ look: 'voetballen', niveau: 'moeilijk' });
        expect(lookOf({ look: 'voetballen' })).toBe('voetballen');
        expect(lookOf({})).toBe('hartjes');
        expect(lookOf({ look: 'iets anders' })).toBe('hartjes');
        // The Valentijn shelf tag stays on the one tile (the hearts picture).
        expect(HARTJES().season).toBe('valentijn');
    });
});

describe('Hartjes Moeilijk: 16 cards', () => {
    test('over every playable + / − card (leerjaar 1 to 3): eight sums whose answers all differ, or fewer when a card has fewer', () => {
        const round = metaWith({ niveau: 'moeilijk' }).round.board!;
        let boards = 0, full = 0;
        for (const g of [1, 2, 3] as const) {
            for (const topic of usableVariants(data, g).keys()) {
                for (const c of choicesFor(data, g, topic)) {
                    if (!choiceCanPlay(c, g) || !skinAccepts(HARTJES().accepts, spelContentOf(c, g)!) || c.vars.some(v => (BREUK_LEAVES as readonly string[]).includes(v.leafId))) continue;
                    const s = { ...buildZelfSessie(c, { kind: 'count', n: 10 }, 0, g), total: undefined };
                    for (let seed = 0; seed < 2; seed++) {
                        const b = nextBoardOf(s, round, null, [], undefined, mulberry32(seed))!;
                        expect(b, c.label).not.toBeNull();
                        expect(b.cells.length).toBeGreaterThanOrEqual(3);
                        expect(b.cells.length).toBeLessThanOrEqual(8);
                        const answers = b.cells.map(x => x.question.answer);
                        expect(new Set(answers).size).toBe(answers.length);
                        boards++;
                        if (b.cells.length === 8) full++;
                    }
                }
            }
        }
        expect(boards).toBeGreaterThan(30);
        expect(full / boards).toBeGreaterThan(.9);
    });

    test('a pool with too few different answers: as many pairs as there are, none below three', () => {
        const fake = (answer: number, i: number) => ({ key: `k${i}`, kind: 'number', answer: String(answer) }) as unknown as SpelQuestion;
        const five = Array.from({ length: 40 }, (_, i) => fake(i % 5, i));
        const round = metaWith({ niveau: 'moeilijk' }).round.board!;
        expect(pairsBoard(five, 8, mulberry32(1))).toHaveLength(5);
        expect(buildBoard(round, five, 0, mulberry32(1))!.cells).toHaveLength(5);
        const two = Array.from({ length: 40 }, (_, i) => fake(i % 2, i));
        expect(buildBoard(round, two, 0, mulberry32(1))).toBeNull();
    });

    test('the store deals 8 sums per board, and the shell shows 16 cards', async () => {
        act(() => start({ niveau: 'moeilijk' }));
        expect(cells()).toHaveLength(8);
        render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Hartjes' });
        expect(within(group).getAllByRole('button')).toHaveLength(16);
    }, 15_000);
});

describe('Hartjes: a broken heart, a plaster, and the Voetballen look', () => {
    const wrongFor = (i: number) => cells()[(i + 1) % cells().length].question.answer;
    const card = (root: HTMLElement, cell: number, side: 'sum' | 'answer') => root.querySelector<HTMLButtonElement>(`[data-cell="${cell}"].is-${side}`)!;

    test('the second wrong answer on a sum breaks its heart (only the sum\'s card), pairing it later patches it', async () => {
        act(() => start({}));
        render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Hartjes' });
        act(() => sp().boardPick(0, wrongFor(0)));
        expect(card(group, 0, 'sum').classList.contains('is-whole')).toBe(true);
        act(() => sp().boardPick(0, wrongFor(0)));
        expect(sp().mistakes).toHaveLength(1);
        expect(card(group, 0, 'sum').classList.contains('is-broken')).toBe(true);
        expect(card(group, 0, 'sum').querySelectorAll('.hj-heart.is-broken .hj-half')).toHaveLength(4);
        expect(card(group, 0, 'answer').classList.contains('is-whole')).toBe(true);
        expect(group.querySelectorAll('.is-broken.hj-card')).toHaveLength(1);
        act(() => sp().boardPick(0, cells()[0].question.answer));
        expect(card(group, 0, 'sum').classList.contains('is-patched')).toBe(true);
        expect(card(group, 0, 'sum').querySelectorAll('.hj-plaster')).toHaveLength(2);
        // Still one logged line for that sum.
        expect(sp().history.filter(h => h.exerciseKey === cells()[0].question.key)).toHaveLength(1);
    }, 15_000);

    test('Voetballen: balls on a pitch, "Bal, dicht"; a mistake flattens the ball with its own cue, a pair says Goal!', async () => {
        act(() => start({ look: 'voetballen' }));
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Ballen' });
        const all = within(group).getAllByRole('button');
        expect(all).toHaveLength(12);
        expect(all.every(b => b.getAttribute('aria-label') === 'Bal, dicht')).toBe(true);
        expect(container.querySelector('.hj-root.is-ball .hj-pitch')).toBeTruthy();
        expect(container.querySelector('.hj-deco')).toBeNull();
        expect(group.querySelectorAll('.hj-ball')).toHaveLength(24);
        act(() => { sp().boardPick(0, wrongFor(0)); sp().boardPick(0, wrongFor(0)); });
        expect(card(group, 0, 'sum').querySelector('.hj-ball.is-broken .hj-ball-crease')).toBeTruthy();
        fireEvent.click(card(group, 1, 'sum'));
        fireEvent.click(card(group, 1, 'answer'));
        expect(screen.getByText('Goal!')).toBeTruthy();
    }, 15_000);

    test('the skin voices a break itself: hit for a heart, caught for a ball; never for a first strike', async () => {
        const Hartjes = (await import('../oefenen/spelen/board/hartjes/Hartjes')).default;
        for (const [look, cue] of [['hartjes', 'hit'], ['voetballen', 'caught']] as const) {
            act(() => start({ look }));
            const sound = vi.fn();
            const props = { board: sp().board, phase: 'play', onBoardPick: vi.fn(), onBoardFocus: vi.fn(), sound, reducedMotion: true, options: { look } } as unknown as SkinProps;
            const { rerender } = render(<Hartjes {...props} />);
            act(() => sp().boardPick(0, wrongFor(0)));
            rerender(<Hartjes {...props} board={sp().board} />);
            expect(sound).not.toHaveBeenCalledWith(cue);
            act(() => sp().boardPick(0, wrongFor(0)));
            rerender(<Hartjes {...props} board={sp().board} />);
            expect(sound).toHaveBeenCalledWith(cue);
            cleanup();
        }
        expect(HARTJES().sounds).toMatchObject({ wrong: null, hit: 'krak', caught: 'whoosh' });
    });
});
