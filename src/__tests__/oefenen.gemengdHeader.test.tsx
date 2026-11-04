// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { buildSessie, listOefenLeaves, type BuilderSettings } from '../components/oefenen/oefenBuild';
import type { BreukBewerkExercise } from '../services/math/types';
import { fillAnswer, hashOf, resetKiosk } from './helpers/oefenKiosk';

// Gemengd getal ↔ breuk under 'beide': the block mixes both ways, the sheet says "Schrijf als
// gemengd getal of als breuk.", and the kiosk card names the way of the ONE exercise it shows,
// through the builder → link → pupil chain (the frozen default wording gives way to it).

const st = () => useOefenStore.getState();
const SETTINGS: BuilderSettings = { id: 'gemengd-header', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };

beforeEach(resetKiosk);
afterEach(cleanup);

describe('breuken gemengd under beide', () => {
    const leaf = listOefenLeaves().find(l => l.id === 'breuken-gemengd')!;
    const linkOf = (constraints: Record<string, unknown>, instruction?: string) => {
        const { sessie } = buildSessie([{ key: 'r0', leaf, constraints, limit: 12, weight: 1 }], SETTINGS);
        if (instruction) sessie.types[0].instruction = instruction;
        return hashOf(sessie);
    };

    test('the card header follows each exercise', () => {
        st().load(linkOf({ ...leaf.constraints, direction: 'beide' }));
        expect(st().sessie!.types[0].instruction).toBe('Schrijf als gemengd getal of als breuk.');
        st().start();
        const { container } = render(<OefenApp />);
        const ways = new Set<string>();
        for (let i = 0; i < 12 && st().shown; i++) {
            const ex = st().shown!.exercise as BreukBewerkExercise;
            expect(container.querySelector('.kiosk-instruction')!.textContent).toBe(ex.direction === 'naar-breuk' ? 'Typ als breuk.' : 'Typ als gemengd getal.');
            ways.add(ex.direction!);
            act(() => { fillAnswer(true); st().answer(); st().next(); });
        }
        expect(ways.size).toBe(2);
    });

    test("a teacher's own wording still wins", () => {
        st().load(linkOf({ ...leaf.constraints, direction: 'beide' }, 'Zet om.'));
        st().start();
        const { container } = render(<OefenApp />);
        expect(container.querySelector('.kiosk-instruction')!.textContent).toBe('Zet om.');
    });
});
