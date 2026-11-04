import { describe, test, expect } from 'vitest';
import type { ControleExercise } from '../services/math/types';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { seedConstraints, DEFAULT_BASE } from '../config/baseSettings';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor } from '../services/oefenen/kiosk';
import { mulberry32 } from './helpers/limitHarness';

// Controleren in the kiosk (triage 2026-10-10: 12 of 12 "juist"): a one-exercise block always took
// the sheet's first row, and the sheet plants its wrong answers on the odd rows ('helft'). Each kiosk
// exercise now flips its own coin, so juist / fout is a real decision; 'geen' and 'alles' still hold.

const SEEDS = 200;

function draws(leafId: string, over: Record<string, unknown> = {}): ControleExercise[] {
    const leaf = listOefenLeaves().find(l => l.id === leafId)!;
    const constraints = seedConstraints({ typeId: leaf.typeId, base: DEFAULT_BASE, override: { ...leaf.constraints, ...over }, leafId });
    const type: OefenType = { typeId: leaf.typeId, leafId, label: leaf.label, constraints, weight: 1 };
    const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
    return Array.from({ length: SEEDS }, (_, s) => nextExercise(sessie, type, new Set(), mulberry32(s * 7919 + 13))!.exercise as ControleExercise);
}

describe.each(['controleren-negenproef', 'controleren-omgekeerde'])('%s', (leafId) => {
    test('about half of the shown sums are wrong, each a plausible slip the proef catches', () => {
        const all = draws(leafId);
        const wrong = all.filter(e => e.shownAnswer !== e.correctAnswer);
        expect(wrong.length / SEEDS).toBeGreaterThan(0.35);
        expect(wrong.length / SEEDS).toBeLessThan(0.65);
        for (const e of wrong) {
            expect([1, 10, 20, 100]).toContain(Math.abs(e.shownAnswer - e.correctAnswer));
            // The negenproef must be able to catch it.
            expect((e.shownAnswer - e.correctAnswer) % 9).not.toBe(0);
        }
        const d = kioskFor('controleren')!;
        const answers = new Set(all.map(e => d.answerOf(e, {})[0]));
        expect([...answers].sort()).toEqual(['fout', 'juist']);
    });
    test('the teacher\'s "geen" and "alles" still hold', () => {
        expect(draws(leafId, { foutAandeel: 'geen' }).every(e => e.shownAnswer === e.correctAnswer)).toBe(true);
        expect(draws(leafId, { foutAandeel: 'alles' }).every(e => e.shownAnswer !== e.correctAnswer)).toBe(true);
    });
});
