// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOefenStore, FLASH_MS } from '../oefenen/useOefenStore';
import { decodeSessie, encodeSessie, sessieContentHash } from '../services/oefenen/session';
import type { Equation } from '../services/math/types';
import type { OefenSessie } from '../services/oefenen/types';
import { fillAnswer, hashOf, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// Oefenmodus "Toon de stappen" (Part C): after a FINAL fout on a sum with worked steps the card
// waits; never during a retry, never in testmodus, never when the teacher switched it off.

const st = () => useOefenStore.getState();
const OPTELLEN = { ...STARTER_TYPES[0], constraints: { numberType: 'natural', maxGetal: 1000 }, limit: 3 };
const sessie = (over: Partial<OefenSessie> = {}) => starterSessie({ types: [OPTELLEN], noSteps: undefined, ...over });

// Puts 475 + 368 on the card, so the draw does not decide whether steps exist.
function show475() {
    const cur = st().shown!;
    const exercise: Equation = { id: 'x', operands: [475, 368], operator: '+', answer: 843, isManuallyEdited: false };
    const shown = { ...cur, exercise, exerciseKey: 'k475' };
    useOefenStore.setState({ shown, run: { ...st().run!, current: shown } });
}

beforeEach(() => { resetKiosk(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('steps after a fout', () => {
    test('a final fout waits on the steps instead of moving on; next() moves on', () => {
        st().load(hashOf(sessie()));
        st().start();
        show475();
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().stepsOffer?.length).toBe(8);
        vi.advanceTimersByTime(FLASH_MS.fout * 3);
        expect(st().phase).toBe('steps');
        expect(st().shown!.exerciseKey).toBe('k475');
        st().next();
        expect(st().phase).toBe('exercise');
        expect(st().stepsOffer).toBeNull();
    });

    test('juist, testmodus and the teacher switch never offer steps', () => {
        for (const over of [{}, { testMode: true }, { noSteps: true as const }]) {
            resetKiosk();
            st().load(hashOf(sessie(over)));
            st().start();
            show475();
            fillAnswer(Object.keys(over).length === 0);
            st().answer();
            expect(st().stepsOffer).toBeNull();
        }
    });

    test('2 kansen: no steps on the retry, only after the second fout', () => {
        st().load(hashOf(sessie({ attempts: 2 })));
        st().start();
        show475();
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('retry');
        expect(st().stepsOffer).toBeNull();
        vi.advanceTimersByTime(FLASH_MS.retry);
        fillAnswer(false); st().answer();
        expect(st().stepsOffer).not.toBeNull();
    });
});

describe('the link', () => {
    test('noSteps travels in the link and old links stay as they were', () => {
        const off = sessie({ noSteps: true });
        expect(decodeSessie(encodeSessie(off)!).noSteps).toBe(true);
        const on = sessie();
        expect(decodeSessie(encodeSessie(on)!).noSteps).toBeUndefined();
        // A session without the switch keeps its id fingerprint (pupils' stored runs).
        expect(sessieContentHash(on)).toBe(sessieContentHash({ ...on, noSteps: undefined }));
        expect(sessieContentHash(off)).not.toBe(sessieContentHash(on));
    });
});
