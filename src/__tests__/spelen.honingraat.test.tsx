// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, usableVariants, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { useOefenStore } from '../oefenen/useOefenStore';
import { SPEL_BOARD_PAUSE_MS, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { skinAccepts, skinsFor, NUMBER_CONTENT } from '../oefenen/spelen/accepts';
import { meetsTarget } from '../oefenen/spelen/board/board';
import { nextBoardOf } from '../oefenen/spelen/board/session';
import { combLayout, combRows } from '../oefenen/spelen/board/honingraat/comb';
import { mulberry32 } from '../oefenen/spelen/distractors';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';

// Honingraat: a board round (find every sum that makes the target). A wrong cell is a mistake at once,
// three combs, and Nakijken replays exactly the wrong cells.

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
                        const t = comb.target!;
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

    test('Honingraat sits in the registry, in Lente, and takes whole numbers only', () => {
        expect(HONING()).toMatchObject({ input: 'board', timed: false, season: 'lente', accepts: { kinds: ['number'] } });
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
