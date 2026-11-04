// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { useOefenStore } from '../oefenen/useOefenStore';
import type { Equation } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { fillAnswer, hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Gemengd "om de beurt" in the kiosk: each exercise is a one-exercise block, so the sheet's
// cycle (exercise i gets variant i % n) always gave the first variant. The slot's own count
// now picks the turn, also after a reload and with another type in between.

const st = () => useOefenStore.getState();

const gemengd = (over: Partial<OefenType> = {}): OefenType => ({
    typeId: 'hr-std-gemengd', leafId: 'hr-std-gemengd-nat', label: 'Gemengd',
    constraints: { numberType: 'natural', maxGetal: 100, variants: ['+', '-', 'x', ':'], mix: 'cycle' }, limit: 8, weight: 1, ...over,
});

const shownVariant = () => (st().shown!.exercise as Equation).variant;

// Answers the card right and moves on, returning the variant that was on it.
function answerOne(): string | undefined {
    const v = shownVariant();
    fillAnswer(true);
    st().answer();
    st().next();
    return v;
}

beforeEach(resetKiosk);

describe('gemengd om de beurt', () => {
    test('4 answers → + − × :, then round again', () => {
        st().load(hashOf(starterSessie({ types: [gemengd()] })));
        st().start();
        expect(Array.from({ length: 8 }, answerOne)).toEqual(['+', '-', 'x', ':', '+', '-', 'x', ':']);
    });

    test('a reload keeps the turn', () => {
        const hash = hashOf(starterSessie({ types: [gemengd()] }));
        st().load(hash);
        st().start();
        expect([answerOne(), answerOne()]).toEqual(['+', '-']);
        resetKioskKeepStorage();
        st().load(hash);
        expect(shownVariant()).toBe('x');
    });

    test('another type in between does not shift the turn', () => {
        const other: OefenType = { typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat', label: 'Optellen', constraints: { numberType: 'natural', maxGetal: 100 }, limit: 4, weight: 1 };
        st().load(hashOf(starterSessie({ types: [gemengd({ limit: 4 }), other] })));
        st().start();
        const seen: Array<string | undefined> = [];
        for (let i = 0; i < 8; i++) {
            const slot = st().shown!.slot;
            const v = answerOne();
            if (slot === 0) seen.push(v);
        }
        expect(seen).toEqual(['+', '-', 'x', ':']);
    });
});

// A page reload: the store is rebuilt from scratch, localStorage survives.
function resetKioskKeepStorage() {
    useOefenStore.setState({ sessie: null, error: null, phase: 'start', run: null, shown: null, input: [''], field: 0, lastCorrect: null, statsFrom: 'exercise' });
}
