// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { canStop, useOefenStore } from '../oefenen/useOefenStore';
import { loadRuns } from '../services/oefenen/stats';
import type { OefenSessie } from '../services/oefenen/types';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// Stoppen: an endless session (no limit, no timer) is the only kind the pupil may end; the card
// on screen is dropped uncounted and the locked end screen survives a reload.

const st = () => useOefenStore.getState();
const endless = (over: Partial<OefenSessie> = {}) => starterSessie({ types: STARTER_TYPES.map(t => ({ ...t, limit: undefined })), ...over });

beforeEach(resetKiosk);

describe('stop()', () => {
    test('ends an endless run: the card on screen is not counted, finishedAt set, locked, persisted', () => {
        const s = endless();
        st().load(hashOf(s));
        st().start();
        for (const right of [true, false]) { fillAnswer(right); st().answer(); st().next(); }
        // A third exercise is on screen, typed but not checked: it must not count.
        fillAnswer(true);
        expect(st().run!.current).toBeDefined();
        st().stop();
        expect(st().phase).toBe('locked');
        expect(st().shown).toBeNull();
        const run = st().run!;
        expect(run.done).toBe(true);
        expect(run.current).toBeUndefined();
        expect(run.stats.finishedAt).toBeTypeOf('number');
        expect(run.stats.history).toHaveLength(2);
        const stored = loadRuns(s.id);
        expect(stored).toHaveLength(1);
        expect(stored[0].done).toBe(true);
        expect(stored[0].current).toBeUndefined();
        expect(stored[0].stats.history).toHaveLength(2);
    });

    test('a reload keeps the stopped run on its end screen', () => {
        const s = endless();
        st().load(hashOf(s));
        st().start();
        fillAnswer(true); st().answer(); st().next();
        st().stop();
        // The store rebuilt from the link, storage untouched (a page reload).
        useOefenStore.setState({ sessie: null, run: null, shown: null, phase: 'start' });
        st().load(hashOf(s));
        expect(st().phase).toBe('locked');
        expect(st().run!.done).toBe(true);
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('works from the feedback flash, the retry flash and the Resultaten peek', () => {
        for (const phase of ['feedback', 'retry', 'stats'] as const) {
            resetKiosk();
            st().load(hashOf(endless({ attempts: 2 })));
            st().start();
            fillAnswer(phase !== 'retry');
            if (phase === 'stats') st().openStats();
            else st().answer();
            expect(st().phase).toBe(phase);
            st().stop();
            expect(st().phase).toBe('locked');
            // Only the answered exercise counts; the retry's wrong first try never became an answer.
            expect(st().run!.stats.history).toHaveLength(phase === 'feedback' ? 1 : 0);
        }
    });

    test('also under testmodus and statsLocked (the Resultaten peek is hidden there, Stoppen is not)', () => {
        st().load(hashOf(endless({ testMode: true, statsLocked: true })));
        st().start();
        expect(canStop(st().sessie!, st().run)).toBe(true);
        st().stop();
        expect(st().phase).toBe('locked');
    });

    test('no-op with a timer, with a limit on every type, with a total, and once done', () => {
        for (const s of [endless({ timerMin: 5 }), starterSessie(), endless({ total: 10 })]) {
            resetKiosk();
            st().load(hashOf(s));
            st().start();
            expect(canStop(st().sessie!, st().run)).toBe(false);
            st().stop();
            expect(st().phase).toBe('exercise');
            expect(st().run!.done).toBe(false);
        }
        resetKiosk();
        st().load(hashOf(endless()));
        st().start();
        st().stop();
        const done = st().run;
        expect(canStop(st().sessie!, done)).toBe(false);
        st().stop();
        expect(st().run).toBe(done);
    });

    test('no-op before the run starts', () => {
        st().load(hashOf(endless()));
        expect(st().phase).toBe('start');
        st().stop();
        expect(st().phase).toBe('start');
        expect(st().run).toBeNull();
    });
});
