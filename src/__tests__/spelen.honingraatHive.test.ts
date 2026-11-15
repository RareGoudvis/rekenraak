import { describe, test, expect } from 'vitest';
import { mulberry32 } from '../oefenen/spelen/distractors';
import type { BoardCell } from '../oefenen/spelen/board/board';
import type { SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { MOEILIJK_BOARDS, viewAt, WASP, waspChoices, waspSchedule, waspSums, waspVerdict } from '../oefenen/spelen/board/honingraat/hive';
import { combDecor, combLayout } from '../oefenen/spelen/board/honingraat/comb';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { skinById } from '../oefenen/spelen/skins/registry';

// Honingraat's own rules (board/honingraat/hive.ts): comb and meadow in turn, when the wasp comes in Moeilijk,
// which sums it brings and how its challenge is scored.

const q = (a: number, b: number, extra: Partial<SpelQuestion> = {}): SpelQuestion => ({
    slot: 0, exercise: {}, constraints: {}, key: `${a}+${b}`, kind: 'number', text: `${a} + ${b} = ?`, answer: String(a + b),
    choices: [String(a + b), String(a + b + 1), String(a + b - 1), String(a + b + 10)], ...extra,
});
const cell = (question: SpelQuestion, state: BoardCell['state'], match = false): BoardCell => ({ question, match, tries: 0, state, helped: false, logged: state !== 'open' });

describe('Honingraat: comb, meadow, comb …', () => {
    test('boards alternate, starting with a comb', () => {
        expect([0, 1, 2, 3, 4].map(viewAt)).toEqual(['comb', 'meadow', 'comb', 'meadow', 'comb']);
    });

    test('Normaal keeps three boards, Moeilijk plays five and the round can end early', () => {
        const meta = skinById('honingraat')!.meta;
        expect(meta.canFail).toBe(true);
        expect(resolveMeta(meta, { niveau: 'normaal' }).round.board!.boards).toBe(3);
        expect(resolveMeta(meta, { niveau: 'moeilijk' }).round.board).toEqual({ kind: 'target', boards: MOEILIJK_BOARDS, size: 13, strikes: 1 });
        expect(resolveMeta(meta).chosen).toEqual({ niveau: 'normaal' });
    });

    test('the comb\'s wax rim never covers a cell to find', () => {
        for (const n of [13, 14]) {
            const taken = new Set(combLayout(n).cells.map(c => `${c.x}|${c.y}`));
            const decor = combDecor(n);
            expect(decor.length).toBeGreaterThan(8);
            for (const d of decor) expect(taken.has(`${d.x}|${d.y}`)).toBe(false);
            expect(new Set(decor.map(d => d.kind))).toEqual(new Set(['wax', 'honey', 'capped', 'egg', 'larva']));
        }
    });
});

describe('the wasp (Moeilijk)', () => {
    test('after the second filled board always, later now and then; only before a comb, never two in a row, never after the last', () => {
        const seen = new Set<string>();
        for (let seed = 0; seed < 200; seed++) {
            const at = waspSchedule(MOEILIJK_BOARDS, mulberry32(seed));
            seen.add(at.join(','));
            expect(at[0]).toBe(2);
            for (const f of at) {
                expect(viewAt(f)).toBe('comb');
                expect(f).toBeLessThan(MOEILIJK_BOARDS);
            }
            at.slice(1).forEach((f, i) => expect(f - at[i]).toBeGreaterThanOrEqual(2));
        }
        // Now and then: some rounds get a second wasp, some do not.
        expect(seen).toEqual(new Set(['2', '2,4']));
        expect(waspSchedule(3, mulberry32(1))).toEqual([2]);
        expect(waspSchedule(2, mulberry32(1))).toEqual([]);
    });

    test('five sums from the boards played: untapped near misses first, then the wrong taps, then the finds; none twice', () => {
        const open = [q(8, 5), q(9, 5), q(7, 7)].map(x => cell(x, 'open'));
        const missed = [q(6, 6), q(9, 4)].map(x => cell(x, 'missed'));
        const found = [q(8, 7), q(9, 6), q(7, 8)].map(x => cell(x, 'solved', true));
        const sums = waspSums([...found, ...missed, open[0], ...open], mulberry32(3));
        expect(sums).toHaveLength(WASP.sums);
        expect(new Set(sums.map(s => s.key)).size).toBe(WASP.sums);
        expect(new Set(sums.slice(0, 3).map(s => s.key))).toEqual(new Set(open.map(c => c.question.key)));
        expect(new Set(sums.slice(3).map(s => s.key))).toEqual(new Set(missed.map(c => c.question.key)));
    });

    test('three drops: the answer and two others, never equal in value; a breuken comb borrows the other sums\' answers', () => {
        for (let seed = 0; seed < 30; seed++) {
            const c = waspChoices(q(8, 5), [], mulberry32(seed));
            expect(c).toHaveLength(3);
            expect(c.map(x => x.value)).toContain('13');
            expect(new Set(c.map(x => x.value)).size).toBe(3);
        }
        const breuk = (n: number, d: number, low: string): SpelQuestion => ({
            ...q(0, 0), key: `b${n}/${d}`, kind: 'choice', text: `Vereenvoudig: ${n}/${d} = ?`, answer: low, choices: [low], same: low,
            pair: { sum: { text: `${n}/${d}`, label: `${n}/${d}` }, answer: { text: low, label: low } },
        });
        const others = [breuk(2, 4, '1/2'), breuk(3, 6, '1/2'), breuk(3, 5, '3/5'), breuk(4, 9, '4/9')];
        const c = waspChoices(breuk(4, 8, '1/2'), others, mulberry32(4));
        expect(c.map(x => x.value).sort()).toEqual(['1/2', '3/5', '4/9']);
        expect(c.find(x => x.value === '1/2')!.text).toBe('1/2');
    });

    test('4 right chases it off, a second wrong one lets it claim the nest, decided as soon as it is sure', () => {
        expect(waspVerdict([])).toBeNull();
        expect(waspVerdict([true, true, true])).toBeNull();
        expect(waspVerdict([true, false, true])).toBeNull();
        expect(waspVerdict([true, true, true, true])).toBe('chased');
        expect(waspVerdict([true, false, true, true, true])).toBe('chased');
        expect(waspVerdict([false, false])).toBe('claimed');
        expect(waspVerdict([true, true, false, true, false])).toBe('claimed');
    });
});
