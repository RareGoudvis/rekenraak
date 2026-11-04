// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore, UNSUPPORTED_ONLY } from '../oefenen/useOefenStore';
import { hashOf, resetKiosk, starterSessie, fillAnswer } from './helpers/oefenKiosk';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { emptyStats, oefenStorageKey, saveRun, viablePlannedTotal, viableTypes } from '../services/oefenen/stats';
import { nextType, retiredSlots, unsupportedSlots } from '../services/oefenen/scheduler';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import * as session from '../services/oefenen/session';

// Owner decision 3 (2026-10-11): an OLD link may carry a type the kiosk no longer supports
// (lengte-meten: `supported()` false). It is retired like a dead slot, never served, left out
// of the counts; a session with nothing else shows the ErrorScreen.

// Lets a test hand load() a session whose type has no descriptor at all: decode refuses one.
vi.mock('../services/oefenen/session', async (orig) => {
    const actual = await orig<typeof import('../services/oefenen/session')>();
    return { ...actual, decodeSessie: vi.fn(actual.decodeSessie) };
});

const st = () => useOefenStore.getState();

function leafType(leafId: string, limit = 3): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    return { typeId: leaf.typeId, leafId, label: leaf.label, constraints: makeDraftBlock(leaf.typeId, leaf.defaultConstraints ?? {}).constraints as Record<string, unknown>, limit, weight: 1 };
}

const OPTELLEN: OefenType = { typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat', label: 'Optellen', constraints: { numberType: 'natural', maxGetal: 100 }, limit: 3, weight: 1 };
const GONE: OefenType = { typeId: 'weg-uit-de-app', leafId: 'weg-uit-de-app', label: 'Verdwenen', constraints: {}, limit: 3, weight: 1 };

const oldLink = (types: OefenType[], over: Partial<OefenSessie> = {}) => starterSessie({ id: 'oud', types, ...over });

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
    resetKiosk();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => {
    cleanup();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
});

describe('scheduler: unsupported slots are retired', () => {
    test('lengte-meten + optellen: slot 0 unsupported, never drawn, not counted', () => {
        const s = oldLink([leafType('lengte-meten'), OPTELLEN]);
        expect([...unsupportedSlots(s)]).toEqual([0]);
        expect(retiredSlots(s).has(0)).toBe(true);
        expect(viableTypes(s).map(t => t.typeId)).toEqual(['hr-std-optellen']);
        expect(viablePlannedTotal(s)).toBe(3);
        for (const mode of ['afwisselen', 'willekeurig'] as const) {
            const m = oldLink([leafType('lengte-meten'), OPTELLEN], { mode });
            expect(nextType(m, [], () => 0)?.slot).toBe(1);
        }
    });

    test('a type with no descriptor is retired the same way', () => {
        const s = oldLink([GONE, OPTELLEN]);
        expect([...unsupportedSlots(s)]).toEqual([0]);
        expect(viableTypes(s)).toHaveLength(1);
        expect(nextType(s, [], () => 0)?.slot).toBe(1);
    });
});

describe('kiosk: an old link with an unsupported type', () => {
    test('lengte-meten + optellen → 1 soort, the note, only additions served', () => {
        st().load(hashOf(oldLink([leafType('lengte-meten'), OPTELLEN])));
        expect(st().error).toBeNull();
        render(<OefenApp />);
        expect(screen.getByText(/^1 soort · 3 oefeningen$/)).toBeTruthy();
        expect(screen.getByText('1 soort kan niet op dit toestel en wordt overgeslagen.')).toBeTruthy();
        expect(screen.queryByText('Lengte meten')).toBeNull();
        cleanup();

        st().start();
        for (let i = 0; i < 3; i++) {
            expect(st().shown?.slot).toBe(1);
            fillAnswer(true); st().answer(); st().next();
        }
        expect(st().phase).toBe('locked');
        expect(st().run!.stats.history.every(h => h.slot === 1)).toBe(true);
        render(<OefenApp />);
        expect(screen.getByText('3 van 3 juist')).toBeTruthy();
        // The retired type made nothing this run: no row for it.
        expect(screen.queryByText('Lengte meten')).toBeNull();
    });

    test('two unsupported types: plural note', () => {
        st().load(hashOf(oldLink([leafType('lengte-meten'), leafType('omtrek'), OPTELLEN])));
        render(<OefenApp />);
        expect(screen.getByText('2 soorten kunnen niet op dit toestel en worden overgeslagen.')).toBeTruthy();
    });

    test('a supported session shows no note', () => {
        st().load(hashOf(starterSessie()));
        render(<OefenApp />);
        expect(screen.queryByText(/kan niet op dit toestel|kunnen niet op dit toestel/)).toBeNull();
    });

    test('lengte-meten alone → ErrorScreen, stored runs untouched', () => {
        const s = oldLink([leafType('lengte-meten')]);
        const old = { index: 0, done: true, stats: { ...emptyStats(s, 1), perType: { 0: { made: 2, correct: 1, wrong: 1, errors: [] } } } };
        saveRun('oud', old);
        const before = localStorage.getItem(oefenStorageKey('oud'));
        st().load(hashOf(s));
        expect(st().error).toBe(UNSUPPORTED_ONLY);
        expect(st().sessie).toBeNull();
        render(<OefenApp />);
        const alert = screen.getByRole('alert').textContent ?? '';
        expect(alert).toContain('Deze oefeningen kunnen niet op het toestel. Vraag je leerkracht om een nieuwe link.');
        // The message already says whom to ask: no second "share again" line.
        expect(alert).not.toMatch(/opnieuw te delen/);
        expect(localStorage.getItem(oefenStorageKey('oud'))).toBe(before);
    });

    test('a type with no descriptor (simulated) takes the same path', () => {
        const decode = vi.mocked(session.decodeSessie);
        decode.mockImplementationOnce(() => oldLink([GONE, OPTELLEN]));
        st().load('#oefen=X');
        render(<OefenApp />);
        expect(screen.getByText('1 soort kan niet op dit toestel en wordt overgeslagen.')).toBeTruthy();
        cleanup();
        st().start();
        expect(st().shown?.slot).toBe(1);

        decode.mockImplementationOnce(() => oldLink([GONE], { id: 'weg' }));
        st().load('#oefen=X');
        expect(st().error).toBe(UNSUPPORTED_ONLY);
    });

    test('a stored run resting on the unsupported card moves on; its old stats stay', () => {
        const s = oldLink([leafType('lengte-meten'), OPTELLEN]);
        const stats = { ...emptyStats(s, Date.now()), perType: { 0: { made: 1, correct: 1, wrong: 0, errors: [] }, 1: { made: 0, correct: 0, wrong: 0, errors: [] } } };
        // Saved before the update: the pupil was looking at a lengte-meten card.
        saveRun('oud', { index: 0, done: false, stats, current: { slot: 0, exercise: {}, exerciseKey: 'k', shownAt: 0, constraints: {} } as never });
        st().load(hashOf(s));
        expect(st().phase).toBe('exercise');
        expect(st().shown?.slot).toBe(1);
        expect(st().run!.stats.perType[0]).toEqual({ made: 1, correct: 1, wrong: 0, errors: [] });
        // A slot with made answers keeps its stats row.
        st().openStats();
        render(<OefenApp />);
        expect(screen.getByText('Lengte meten')).toBeTruthy();
    });
});
