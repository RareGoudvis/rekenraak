import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Equation } from '../services/math/types';
import type { OefenRun, OefenSessie } from '../services/oefenen/types';
import { MAX_RUNS, clearRuns, emptyStats, loadRuns, nextRunIndex, oefenStorageKey, recordAnswer, saveRun, summary } from '../services/oefenen/stats';

const sessie: OefenSessie = {
    v: 1, id: 'stat1', createdAt: 0, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
    types: [
        { typeId: 'hr-std-delen', leafId: 'hr-std-delen-nat', label: 'Delen', constraints: { numberType: 'natural', multiplicationMode: 'met_rest' }, weight: 1 },
        { typeId: 'vergelijken', leafId: 'vergelijken-getallen', label: 'Vergelijken', constraints: { subType: 'getallen' }, weight: 1 },
    ],
};

const rest: Equation = { id: 'a', operands: [23, 5], operator: ':', answer: 4, remainder: 3, isManuallyEdited: false };
const cmp = { id: 'b', a: 1200, b: 980, isManuallyEdited: false };

// In-memory localStorage (the suites run in node); `quota` makes setItem throw past N chars.
function stubStorage(quota = Infinity) {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => {
            if (v.length > quota) throw new DOMException('full', 'QuotaExceededError');
            map.set(k, v);
        },
        removeItem: (k: string) => { map.delete(k); },
    });
    return map;
}

const run = (index: number, extra = ''): OefenRun => ({ index, stats: { ...emptyStats(sessie, index), history: [] }, done: false, ...(extra && { timerEndsAt: extra.length }) });

describe('recordAnswer + summary', () => {
    test('counts per slot, error rows keep the exercise, the given and the expected answer', () => {
        let s = emptyStats(sessie, 0);
        s = recordAnswer(s, 0, 'hr-std-delen', rest, ['4', '3'], true, 1200, sessie.types[0].constraints, 10);
        s = recordAnswer(s, 0, 'hr-std-delen', rest, ['4', '2'], false, 900, sessie.types[0].constraints, 20);
        s = recordAnswer(s, 1, 'vergelijken', cmp, '<', false, 500, sessie.types[1].constraints, 30);
        s = recordAnswer(s, 1, 'vergelijken', cmp, '>', true, 400, sessie.types[1].constraints, 40);
        expect(s.perType[0]).toMatchObject({ made: 2, correct: 1, wrong: 1 });
        expect(s.perType[0].errors).toEqual([{ exercise: '23 : 5 = ? r ?', given: '4 r 2', expected: '4 r 3', at: 20 }]);
        expect(s.perType[1].errors).toEqual([{ exercise: '1 200 ? 980', given: '<', expected: '>', at: 30 }]);
        expect(s.history.map(h => [h.slot, h.correct, h.ms])).toEqual([[0, true, 1200], [0, false, 900], [1, false, 500], [1, true, 400]]);
        expect(s.history[0].exerciseKey).toBe(s.history[1].exerciseKey);
        const rows = summary(s, sessie);
        expect(rows.map(r => [r.label, r.made, r.correct, r.wrong, r.pct])).toEqual([['Delen', 2, 1, 1, 50], ['Vergelijken', 2, 1, 1, 50]]);
    });
    test('nothing made → pct null; the input object is never mutated', () => {
        const s = emptyStats(sessie, 0);
        const frozen = JSON.stringify(s);
        recordAnswer(s, 1, 'vergelijken', cmp, '>', true, 1, {}, 1);
        expect(JSON.stringify(s)).toBe(frozen);
        expect(summary(s, sessie).every(r => r.pct === null)).toBe(true);
    });
});

describe('persistence', () => {
    let map: Map<string, string>;
    beforeEach(() => { map = stubStorage(); });
    afterEach(() => { vi.unstubAllGlobals(); });

    test('save, load, replace by index', () => {
        expect(loadRuns('stat1')).toEqual([]);
        expect(saveRun('stat1', run(0))).toBe(true);
        expect(saveRun('stat1', { ...run(0), done: true })).toBe(true);
        expect(loadRuns('stat1')).toHaveLength(1);
        expect(loadRuns('stat1')[0].done).toBe(true);
        expect(map.has(oefenStorageKey('stat1'))).toBe(true);
        expect(oefenStorageKey('stat1')).toBe('rekenraak_oefen_stat1');
    });
    test('keeps the last 5 runs', () => {
        for (let i = 0; i < 8; i++) saveRun('stat1', run(i));
        const runs = loadRuns('stat1');
        expect(runs.map(r => r.index)).toEqual([3, 4, 5, 6, 7]);
        expect(runs).toHaveLength(MAX_RUNS);
        expect(nextRunIndex(runs)).toBe(8);
        expect(nextRunIndex([])).toBe(0);
    });
    test('sessions do not share runs; clear removes only its own', () => {
        saveRun('stat1', run(0));
        saveRun('other', run(0));
        clearRuns('stat1');
        expect(loadRuns('stat1')).toEqual([]);
        expect(loadRuns('other')).toHaveLength(1);
    });
    test('unreadable storage → []', () => {
        map.set(oefenStorageKey('stat1'), '{broken');
        expect(loadRuns('stat1')).toEqual([]);
    });
});

describe('quota', () => {
    afterEach(() => { vi.unstubAllGlobals(); });
    test('a full quota drops the oldest runs first and keeps the current one', () => {
        const one = JSON.stringify({ v: 1, runs: [run(0)] }).length;
        stubStorage(one * 2.5);
        for (let i = 0; i < 4; i++) expect(saveRun('q', run(i))).toBe(true);
        expect(loadRuns('q').map(r => r.index)).toEqual([2, 3]);
    });
    test('nothing fits → false, no throw', () => {
        stubStorage(10);
        expect(saveRun('q', run(0))).toBe(false);
    });
    test('no localStorage at all → [] and false', () => {
        vi.stubGlobal('localStorage', undefined);
        expect(loadRuns('q')).toEqual([]);
        expect(saveRun('q', run(0))).toBe(false);
        expect(() => clearRuns('q')).not.toThrow();
    });
});
