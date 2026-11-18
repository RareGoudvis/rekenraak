import { describe, test, expect } from 'vitest';
import { mulberry32 } from '../oefenen/spelen/distractors';
import type { BoardCell } from '../oefenen/spelen/board/board';
import type { SpelQuestion } from '../oefenen/spelen/spelQuestion';
import { HIVE_BOARDS, viewAt, WASP, waspChoices, waspRule, waspSchedule, waspsGone, waspSums, waspVerdict } from '../oefenen/spelen/board/honingraat/hive';
import { LEVELS } from '../oefenen/spelen/levels/levels';
import { combDecor, combLayout } from '../oefenen/spelen/board/honingraat/comb';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { skinById } from '../oefenen/spelen/skins/registry';

// Honingraat's own rules (board/honingraat/hive.ts): comb and meadow in turn, the four levels, when the wasp
// comes, which sums it brings and how its battle is scored.

const q = (a: number, b: number, extra: Partial<SpelQuestion> = {}): SpelQuestion => ({
    slot: 0, exercise: {}, constraints: {}, key: `${a}+${b}`, kind: 'number', text: `${a} + ${b} = ?`, answer: String(a + b),
    choices: [String(a + b), String(a + b + 1), String(a + b - 1), String(a + b + 10)], ...extra,
});
const cell = (question: SpelQuestion, state: BoardCell['state'], match = false): BoardCell => ({ question, match, tries: 0, state, helped: false, logged: state !== 'open' });

describe('Honingraat: comb, meadow, comb …', () => {
    test('boards alternate, starting with a comb', () => {
        expect([0, 1, 2, 3, 4].map(viewAt)).toEqual(['comb', 'meadow', 'comb', 'meadow', 'comb']);
    });

    test('the four levels (flames only): three boards for Makkelijk and Normaal, five for Moeilijk and Onmogelijk; the round can end early', () => {
        const meta = skinById('honingraat')!.meta;
        expect(meta.canFail).toBe(true);
        expect(meta.options![0].choices.map(c => [c.value, c.icon])).toEqual([['makkelijk', {}], ['normaal', { flames: 1 }], ['moeilijk', { flames: 2 }], ['onmogelijk', { flames: 3 }]]);
        expect(LEVELS.map(l => resolveMeta(meta, { niveau: l }).round.board!.boards)).toEqual([3, 3, 5, 5]);
        expect(resolveMeta(meta, { niveau: 'moeilijk' }).round.board).toEqual({ kind: 'target', boards: HIVE_BOARDS.moeilijk, size: 13, strikes: 1 });
        expect(resolveMeta(meta).chosen).toEqual({ niveau: 'normaal' });
        // A remembered old Moeilijk stays Moeilijk; an unknown pick is Normaal.
        expect(resolveMeta(meta, { niveau: 'moeilijk' }).chosen).toEqual({ niveau: 'moeilijk' });
        expect(resolveMeta(meta, { niveau: 'heel moeilijk' }).chosen).toEqual({ niveau: 'normaal' });
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

describe('the wasp (Normaal and up)', () => {
    test('after every flower meadow: before every comb but the first, never after the last board', () => {
        expect(waspSchedule(5)).toEqual([2, 4]);
        expect(waspSchedule(3)).toEqual([2]);
        expect(waspSchedule(2)).toEqual([]);
        for (const f of waspSchedule(7)) {
            expect(viewAt(f)).toBe('comb');
            expect(viewAt(f - 1)).toBe('meadow');
        }
    });

    test('the battles per level: none on Makkelijk; 1, 2, 3 of 3 right; the Onmogelijk wasps grow per battle', () => {
        expect(waspRule('makkelijk', 0)).toBeNull();
        expect(waspRule('normaal', 0)).toEqual({ wasps: 1, sums: 3, need: 1 });
        expect(waspRule('normaal', 1)).toEqual({ wasps: 1, sums: 3, need: 1 });
        expect(waspRule('moeilijk', 1)).toEqual({ wasps: 1, sums: 3, need: 2 });
        expect(waspRule('onmogelijk', 0)).toEqual({ wasps: 1, sums: 3, need: 3 });
        expect(waspRule('onmogelijk', 1)).toEqual({ wasps: 2, sums: 6, need: 6 });
        expect(waspRule('onmogelijk', 2)).toEqual({ wasps: 3, sums: 9, need: 9 });
    });

    test('five sums from the boards played: untapped near misses first, then the wrong taps, then the finds; none twice', () => {
        const open = [q(8, 5), q(9, 5), q(7, 7)].map(x => cell(x, 'open'));
        const missed = [q(6, 6), q(9, 4)].map(x => cell(x, 'missed'));
        const found = [q(8, 7), q(9, 6), q(7, 8)].map(x => cell(x, 'solved', true));
        const sums = waspSums([...found, ...missed, open[0], ...open], mulberry32(3), 5);
        expect(sums).toHaveLength(5);
        expect(new Set(sums.map(s => s.key)).size).toBe(5);
        expect(waspSums([...found, ...missed, ...open], mulberry32(3), WASP.perWasp)).toHaveLength(3);
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

    test('enough right chases it off, one wrong too many lets it claim the nest, decided as soon as it is sure', () => {
        const normaal = waspRule('normaal', 0)!, moeilijk = waspRule('moeilijk', 0)!, swarm = waspRule('onmogelijk', 1)!;
        expect(waspVerdict([], normaal)).toBeNull();
        expect(waspVerdict([false, true], normaal)).toBe('chased');
        expect(waspVerdict([false, false], normaal)).toBeNull();
        expect(waspVerdict([false, false, false], normaal)).toBe('claimed');
        expect(waspVerdict([true], moeilijk)).toBeNull();
        expect(waspVerdict([true, false, true], moeilijk)).toBe('chased');
        expect(waspVerdict([false, false], moeilijk)).toBe('claimed');
        expect(waspVerdict([true, true, true, true, true], swarm)).toBeNull();
        expect(waspVerdict([true, true, true, true, true, true], swarm)).toBe('chased');
        expect(waspVerdict([true, true, true, true, false], swarm)).toBe('claimed');
        // A swarm's wasp flies off after its three right; a lone wasp only at the verdict.
        expect(waspsGone([true, true], swarm)).toBe(0);
        expect(waspsGone([true, true, true, true], swarm)).toBe(1);
        expect(waspsGone([true, true, true], waspRule('onmogelijk', 0)!)).toBe(0);
    });
});
