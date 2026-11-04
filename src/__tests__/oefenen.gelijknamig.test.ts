import { describe, test, expect } from 'vitest';
import type { BreukBewerkExercise } from '../services/math/types';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { seedConstraints, DEFAULT_BASE } from '../config/baseSettings';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { mulberry32 } from './helpers/limitHarness';

// Breuken gelijknamig maken (pupil-play pass 2026-10-10): "3/7 en 2/4" took only the kgv's 12/28 en
// 14/28, not 6/14 en 7/14. Any COMMON noemer counts: both breuken over one noemer, each equal to its
// own breuk. A noemer the teacher fixed (targetDen) is the one asked.

const d = kioskFor('breuken-bewerken')!;
const C = { subType: 'gelijknamig' };
const ex = (a: [number, number], b: [number, number], den: number): BreukBewerkExercise => ({
    id: 'g', subType: 'gelijknamig', isManuallyEdited: false,
    inputs: [{ n: a[0], d: a[1] }, { n: b[0], d: b[1] }],
    answers: [{ n: (a[0] * den) / a[1], d: den }, { n: (b[0] * den) / b[1], d: den }],
});
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

describe('the owner\'s example: 3/7 en 2/4', () => {
    const e = ex([3, 7], [2, 4], 28);
    test.each([[['12/28', '14/28']], [['6/14', '7/14']], [['24/56', '28/56']], [[' 06 / 14', '7/14']]])('%o counts', (given) => {
        expect(checkAnswer(d, e, C, given)).toBe(true);
    });
    test.each([[['6/14', '14/28']], [['3/7', '2/4']], [['6/14', '8/14']], [['6/14']], [['6/14', '']], [['1 6/14', '7/14']]])('%o does not', (given) => {
        expect(checkAnswer(d, e, C, given)).toBe(false);
    });
    test('a noemer the teacher fixed is the one asked', () => {
        const fixed = { ...C, targetDen: 28 };
        expect(checkAnswer(d, e, fixed, ['12/28', '14/28'])).toBe(true);
        expect(checkAnswer(d, e, fixed, ['6/14', '7/14'])).toBe(false);
    });
});

describe('200 seeds of the builder default', () => {
    test('the key, a smaller and a larger common noemer count; two noemers do not', () => {
        const leaf = listOefenLeaves().find(l => l.id === 'breuken-gelijknamig')!;
        const constraints = seedConstraints({ typeId: leaf.typeId, base: DEFAULT_BASE, override: leaf.constraints, leafId: leaf.id });
        const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
        const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
        let smaller = 0;
        for (let s = 1; s <= 200; s++) {
            const got = nextExercise(sessie, type, new Set(), mulberry32(s * 7919))!;
            const e = got.exercise as BreukBewerkExercise, c = got.constraints;
            const where = JSON.stringify(e);
            const key = e.answers.map(a => `${a.n}/${a.d}`);
            expect(checkAnswer(d, e, c, key), where).toBe(true);
            expect(checkAnswer(d, e, c, e.answers.map(a => `${a.n * 3}/${a.d * 3}`)), where).toBe(true);
            // The smallest common noemer of the breuken in lowest terms.
            const low = e.inputs.map(f => { const g = gcd(f.n, f.d); return { n: f.n / g, d: f.d / g }; });
            const L = lcm(low[0].d, low[1].d);
            if (L < e.answers[0].d) smaller++;
            expect(checkAnswer(d, e, c, low.map(f => `${(f.n * L) / f.d}/${L}`)), where).toBe(true);
            // Each right on its own, but over two noemers: not gelijknamig.
            expect(checkAnswer(d, e, c, [key[0], `${e.answers[1].n * 2}/${e.answers[1].d * 2}`]), where).toBe(false);
            expect(checkAnswer(d, e, c, [key[0], `${e.answers[1].n + 1}/${e.answers[1].d}`]), where).toBe(false);
        }
        expect(smaller).toBeGreaterThan(0);
    });
});
