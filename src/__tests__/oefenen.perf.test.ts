// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { useOefenStore } from '../oefenen/useOefenStore';
import { oefenStorageKey } from '../services/oefenen/stats';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// O16 (audit D12): every answer copies the history, stringifies the whole run and reloads all runs;
// next() rebuilds the seen-keys set. Quadratic per run, but cheap: this pins it at a long session.
const N = 1000;
const st = () => useOefenStore.getState();
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

beforeEach(resetKiosk);

describe('O16: a 1000-answer run stays cheap', () => {
    test(`answer + next at #${N} < 5 ms each, the stored run < 300 kB`, () => {
        st().load(hashOf(starterSessie({ id: 'perf1000', types: STARTER_TYPES.map(({ limit: _limit, ...t }) => t) })));
        st().start();
        const answerMs: number[] = [], nextMs: number[] = [];
        for (let i = 0; i < N; i++) {
            fillAnswer(i % 3 !== 0);
            let t0 = performance.now();
            st().answer();
            answerMs.push(performance.now() - t0);
            t0 = performance.now();
            st().next();
            nextMs.push(performance.now() - t0);
        }
        expect(st().run!.stats.history).toHaveLength(N);
        const stored = localStorage.getItem(oefenStorageKey('perf1000')) ?? '';
        // A window, not one sample: a GC pause must not fail the gate.
        const answerAt = avg(answerMs.slice(-20)), nextAt = avg(nextMs.slice(-20));
        expect(answerAt).toBeLessThan(5);
        expect(nextAt).toBeLessThan(5);
        expect(stored.length).toBeLessThan(300 * 1024);
    }, 5000);
});
