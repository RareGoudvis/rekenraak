// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { emptyStats, loadRuns, loadRunsFor, saveRun } from '../services/oefenen/stats';
import { sessieContentHash } from '../services/oefenen/session';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// A session id shipped again with other content (a composer before the id-per-content fix, or any
// reused id) must not resume, list or mislabel the runs made for the first content: those stay
// stored, out of sight, and come back when the first link is opened again.

const st = () => useOefenStore.getState();
const A = starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 3 }, { ...STARTER_TYPES[1], limit: 3 }] });
const B = starterSessie({ types: [{ ...STARTER_TYPES[2], limit: 1 }] });

beforeEach(resetKiosk);
afterEach(cleanup);

// A run of A left mid-exercise on this device (the pupil closed the tab).
function runOfAInProgress() {
    st().load(hashOf(A));
    st().start();
    act(() => { fillAnswer(true); st().answer(); st().next(); });
    return st().run!;
}

// The page reloaded on another link (the store is rebuilt; storage stays).
function reloadOn(s: typeof A) {
    useOefenStore.setState({ sessie: null, run: null, shown: null, phase: 'start' });
    st().load(hashOf(s));
}

describe('runs per content under one session id', () => {
    test('a new run carries the content hash', () => {
        const run = runOfAInProgress();
        expect(run.hash).toBe(sessieContentHash(A));
        expect(loadRuns(A.id)[0].hash).toBe(sessieContentHash(A));
    });

    test('same id, other content: the start screen, no resume of the other run', () => {
        runOfAInProgress();
        expect(A.id).toBe(B.id);
        reloadOn(B);
        expect(st().phase).toBe('start');
        expect(st().run).toBeNull();
        expect(st().shown).toBeNull();
        expect(loadRunsFor(B)).toHaveLength(0);
        // Hidden, never deleted.
        expect(loadRuns(B.id)).toHaveLength(1);
    });

    test('same content: resumes on the same exercise', () => {
        const run = runOfAInProgress();
        const card = st().shown!.exerciseKey;
        reloadOn(A);
        expect(st().phase).toBe('exercise');
        expect(st().run!.index).toBe(run.index);
        expect(st().shown!.exerciseKey).toBe(card);
    });

    test('a run of B never overwrites the hidden run of A, and Vorige keren lists only B', () => {
        const a = runOfAInProgress();
        reloadOn(B);
        st().start();
        expect(st().run!.index).toBeGreaterThan(a.index);
        act(() => { fillAnswer(true); st().answer(); st().next(); });
        expect(st().phase).toBe('locked');
        st().restart();
        act(() => { fillAnswer(false); st().answer(); st().next(); });
        render(<OefenApp />);
        expect(screen.getByRole('heading', { name: 'Klaar!' })).toBeTruthy();
        // One earlier run of B; A's run is not among them.
        expect(screen.getAllByRole('button', { name: /juist/ })).toHaveLength(1);
        expect(screen.getByRole('button', { name: /1 van 1 juist/ })).toBeTruthy();
        cleanup();

        // A's link again: its own run comes back, mid-exercise.
        reloadOn(A);
        expect(st().phase).toBe('exercise');
        expect(st().run!.index).toBe(a.index);
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('Wissen under B keeps A\'s hidden run', () => {
        runOfAInProgress();
        reloadOn(B);
        st().start();
        act(() => { fillAnswer(true); st().answer(); st().next(); });
        st().clear();
        expect(loadRunsFor(B)).toHaveLength(0);
        expect(loadRunsFor(A)).toHaveLength(1);
    });

    test('a run stored before the hash (no hash) is shown for any content', () => {
        const stats = emptyStats(A, Date.UTC(2026, 8, 1, 10));
        stats.finishedAt = stats.startedAt + 60_000;
        saveRun(A.id, { index: 0, stats, done: true });
        reloadOn(B);
        expect(st().phase).toBe('locked');
        expect(loadRunsFor(B)).toHaveLength(1);
    });
});
