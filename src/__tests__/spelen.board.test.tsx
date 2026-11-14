// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, usableVariants, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf, type SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { BREUK_LEAVES } from '../oefenen/spelen/content/breuken/breukPack';
import { useOefenStore } from '../oefenen/useOefenStore';
import { SPEL_BOARD_PAUSE_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { skinAccepts, skinsFor, NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import { targetBoardEq, targetBoardGt } from '../oefenen/spelen/board/board';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { mulberry32 } from '../oefenen/spelen/distractors';
import type { SpelEventName } from '../oefenen/spelen/events';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';

// Board rounds (Hartjes koppelen here, Honingraat in spelen.honingraat.test.tsx): several sums on screen, every pick checked per sum by the
// session, so mistakes go to the log and Nakijken replays exactly those sums.

let data: EenvoudigData;
let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const kiosk = () => useOefenStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];
const HARTJES = () => skinById('hartjes')!.meta;
const start = () => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: HARTJES() });
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
    log.length = 0;
    for (const name of ['correct', 'wrong', 'streak', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
});
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('board generation', () => {
    test('over every playable + / − card (leerjaar 1 to 3): six sums whose answers all differ, none shown twice', () => {
        const PAIRS = HARTJES().round.board!;
        let boards = 0;
        for (const g of [1, 2, 3] as const) {
            for (const topic of usableVariants(data, g).keys()) {
                for (const c of choicesFor(data, g, topic)) {
                    // Only what the picker offers Hartjes (not the klok); breuken pairs have their own suite (leerjaar 2 has only five different values).
                    if (!choiceCanPlay(c, g) || !skinAccepts(HARTJES().accepts, spelContentOf(c, g)!) || c.vars.some(v => (BREUK_LEAVES as readonly string[]).includes(v.leafId))) continue;
                    const s = { ...buildZelfSessie(c, { kind: 'count', n: 10 }, 0, g), total: undefined };
                    for (let seed = 0; seed < 3; seed++) {
                        const pairs = nextBoardOf(s, PAIRS, null, [], undefined, mulberry32(seed))!;
                        expect(pairs.cells, c.label).toHaveLength(PAIRS.size);
                        const answers = pairs.cells.map(x => x.question.answer);
                        expect(new Set(answers).size).toBe(answers.length);
                        expect(new Set(pairs.cells.map(x => x.question.key)).size).toBe(answers.length);
                        expect(Math.max(...answers.map(a => a.length))).toBeLessThanOrEqual(HARTJES().accepts.maxAnswerChars!);
                        const next = nextBoardOf(s, PAIRS, pairs, [], undefined, mulberry32(seed + 9))!;
                        const before = new Set(pairs.cells.map(x => x.question.key));
                        expect(next.cells.some(x => before.has(x.question.key))).toBe(false);
                        expect(next.index).toBe(1);
                        expect(nextBoardOf(s, PAIRS, next, [])).toBeNull();
                        boards += 2;
                    }
                }
            }
        }
        expect(boards).toBeGreaterThan(60);
    });

    test('equal target first; the "groter dan" fallback when no answer repeats, with the nearest sums below it', () => {
        const fake = (answer: number, i: number) => ({ key: `k${i}`, answer: String(answer), facts: { answer, operands: [answer, 0], op: '+' } }) as unknown as SpelQuestion;
        const spread = Array.from({ length: 40 }, (_, i) => fake(i * 7 + 3, i));
        expect(targetBoardEq(spread, 13, mulberry32(1))).toBeNull();
        const gt = targetBoardGt(spread, 13, mulberry32(1))!;
        expect(gt.target.kind).toBe('gt');
        expect(gt.target.n % 10).toBe(0);
        const lows = gt.cells.filter(c => !c.match).map(c => c.question.facts!.answer);
        expect(lows.every(a => a < gt.target.n)).toBe(true);
        // The nearest ones below the line, not just any small sums.
        const below = spread.map(q => q.facts!.answer).filter(a => a < gt.target.n).sort((a, b) => b - a);
        expect([...lows].sort((a, b) => b - a)).toEqual(below.slice(0, lows.length));
        const grouped = [...spread.slice(0, 20), fake(50, 90), fake(50, 91), fake(50, 92), fake(49, 93), fake(51, 94)];
        const eq = targetBoardEq(grouped, 13, mulberry32(2))!;
        expect(eq.target).toEqual({ kind: 'eq', n: 50 });
        expect(eq.cells.filter(c => !c.match).map(c => c.question.facts!.answer)).toEqual(expect.arrayContaining([49, 51]));
    });

    test('Hartjes sits in the registry, in Valentijn, and takes today\'s whole-number content', () => {
        expect(HARTJES()).toMatchObject({ input: 'board', timed: false, season: 'valentijn', accepts: { maxAnswerChars: 5 } });
        expect(HARTJES().accepts.kinds).toEqual(['number', 'choice']);
        expect(skinsFor(SKINS, NUMBER_CONTENT).map(s => s.meta.id)).toContain('hartjes');
    });
});

describe('Hartjes koppelen: the pairing and mistake rules', () => {
    const wrongFor = (i: number) => cells()[(i + 1) % cells().length].question.answer;

    test('a sum card first with a wrong answer twice logs that sum once; pairing it later adds no second line', () => {
        start();
        expect(sp().board!.cells).toHaveLength(6);
        expect(sp().question).toBeNull();
        sp().boardPick(0, wrongFor(0));
        expect(sp().mistakes).toHaveLength(0);
        expect(sp().history).toHaveLength(0);
        sp().boardPick(0, wrongFor(0));
        expect(sp().mistakes.map(m => m.question.key)).toEqual([cells()[0].question.key]);
        expect(sp().mistakes[0].given).toBe(wrongFor(0));
        expect(sp().history).toEqual([expect.objectContaining({ exerciseKey: cells()[0].question.key, correct: false })]);
        sp().boardPick(0, wrongFor(0));
        expect(sp().mistakes).toHaveLength(1);
        sp().boardPick(0, cells()[0].question.answer);
        expect(cells()[0].state).toBe('solved');
        expect(sp().history).toHaveLength(1);
        expect(sp().score).toBe(0);
        expect(log.filter(l => l.name === 'wrong')).toHaveLength(1);
        // Nakijken after the round: exactly that sum.
        vi.useFakeTimers();
        for (let i = 1; i < 6; i++) sp().boardPick(i, cells()[i].question.answer);
        vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS);
        for (let i = 0; i < 6; i++) sp().boardPick(i, cells()[i].question.answer);
        vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS);
        expect(sp().phase).toBe('end');
        const key = sp().mistakes[0].question.key;
        sp().nakijken();
        expect(kiosk().fixed!.map(f => f.exerciseKey)).toEqual([key]);
    });

    test('an answer card first (strike false), two sums, or two answers never count', () => {
        start();
        for (let k = 0; k < 5; k++) sp().boardPick(1, wrongFor(1), false);
        expect(sp().mistakes).toHaveLength(0);
        expect(cells()[1].tries).toBe(0);
        sp().boardPick(1, cells()[1].question.answer, false);
        expect(sp().score).toBe(1);
        expect(sp().streak).toBe(1);
        expect(sp().history).toEqual([expect.objectContaining({ exerciseKey: cells()[1].question.key, correct: true })]);
    });

    test('Hoe los ik dit op? explains the sum turned last and makes it met hulp; the round is 2 boards, then the end', () => {
        vi.useFakeTimers();
        start();
        sp().openHelp();
        expect(sp().phase).toBe('play');
        sp().boardFocus(2);
        expect(sp().question!.key).toBe(cells()[2].question.key);
        sp().openHelp();
        expect(sp().phase).toBe('help');
        expect(sp().helped).toBe(1);
        sp().closeHelp();
        sp().boardPick(2, wrongFor(2));
        sp().boardPick(2, wrongFor(2));
        // Met hulp: neither a point nor a mistake.
        expect(sp().mistakes).toHaveLength(0);
        for (let i = 0; i < 6; i++) sp().boardPick(i, cells()[i].question.answer);
        expect(sp().score).toBe(5);
        expect(sp().phase).toBe('right');
        const first = sp().board!;
        vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS);
        expect(sp().board!.index).toBe(1);
        expect(sp().board).not.toBe(first);
        expect(sp().question).toBeNull();
        expect(sp().board!.cells.some(c => first.cells.some(f => f.question.key === c.question.key))).toBe(false);
        for (let i = 0; i < 6; i++) sp().boardPick(i, cells()[i].question.answer);
        vi.advanceTimersByTime(SPEL_BOARD_PAUSE_MS);
        expect(sp().phase).toBe('end');
        expect(sp().history).toHaveLength(12);
        expect(sp().score).toBe(11);
        expect(log.at(-1)).toEqual({ name: 'end', payload: expect.objectContaining({ score: 11, mistakes: 0, helped: 1 }) });
    });
});

describe('Hartjes on the shell', () => {
    test('Hartjes: twelve closed hearts, no help until a sum is turned, a pair stays open, two sums turn back', async () => {
        act(() => start());
        render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Hartjes' });
        const cards = () => within(group).getAllByRole('button') as HTMLButtonElement[];
        expect(cards()).toHaveLength(12);
        expect(cards().every(b => b.getAttribute('aria-label') === 'Hartje, dicht')).toBe(true);
        expect(screen.queryByRole('button', { name: /Hoe los ik dit op/ })).toBeNull();
        expect(screen.getByLabelText('1 van 2')).toBeTruthy();
        const sums = () => cards().filter(b => b.classList.contains('is-sum'));
        const sumText = cells()[0].question.text.replace(/\s*=\s*\?$/, '');
        // Two sums: never a pick, both turn back.
        const [a, b] = sums();
        fireEvent.click(a);
        expect(screen.getByRole('button', { name: /Hoe los ik dit op/ })).toBeTruthy();
        fireEvent.click(b);
        expect(a.classList.contains('is-open') && b.classList.contains('is-open')).toBe(true);
        await waitFor(() => expect(a.classList.contains('is-open')).toBe(false), { timeout: 2500 });
        expect(sp().history).toHaveLength(0);
        // A sum with its own answer: a pair, both stay open.
        const card = (cell: number, side: 'sum' | 'answer') => group.querySelector<HTMLButtonElement>(`[data-cell="${cell}"].is-${side}`)!;
        fireEvent.click(card(0, 'sum'));
        expect(card(0, 'sum').getAttribute('aria-label')).toBe(sumText);
        fireEvent.click(card(0, 'answer'));
        expect(sp().board!.cells[0].state).toBe('solved');
        expect(sp().score).toBe(1);
        await waitFor(() => expect(cards().filter(x => /gevonden$/.test(x.getAttribute('aria-label')!))).toHaveLength(2), { timeout: 2500 });
    }, 15_000);
});
