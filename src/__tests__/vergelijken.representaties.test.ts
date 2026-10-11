import { describe, test, expect } from 'vitest';
import type { VergelijkenExercise } from '../services/math/types';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { seedConstraints, DEFAULT_BASE } from '../config/baseSettings';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor } from '../services/oefenen/kiosk';
import { generateFor, makeBlock } from './helpers/makeBlock';
import { mulberry32 } from './helpers/limitHarness';

// Vergelijken breuken & kommagetallen (kiosk triage 2026-10-10): a breuk under 2 against a kommagetal
// of 0,1–9,9 was "<" nearly every time. The two sides are now drawn in one magnitude (the same whole
// part, so both under 1 for a proper breuk) with about a fifth equal, so <, = and > all occur.

const SEEDS = 200;
const d = kioskFor('vergelijken')!;
const answerOf = (e: VergelijkenExercise) => d.answerOf(e, { subType: 'representaties' })[0];

function share(exs: VergelijkenExercise[]) {
    const n: Record<string, number> = { '<': 0, '=': 0, '>': 0 };
    for (const e of exs) n[answerOf(e)]++;
    return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v / exs.length]));
}

function kioskDraws(over: Record<string, unknown> = {}): VergelijkenExercise[] {
    const leaf = listOefenLeaves().find(l => l.id === 'vergelijken-representaties')!;
    const constraints = seedConstraints({ typeId: leaf.typeId, base: DEFAULT_BASE, override: { ...leaf.constraints, ...over }, leafId: leaf.id });
    const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
    const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
    return Array.from({ length: SEEDS }, (_, s) => nextExercise(sessie, type, new Set(), mulberry32(s * 104729 + 1))!.exercise as VergelijkenExercise);
}

const COMBOS: Array<Record<string, unknown>> = [
    {},
    { leftRep: 'kommagetal', rightRep: 'breuk' },
    { leftRep: 'breuk', rightRep: 'woorden' },
    { leftRep: 'kommagetal', rightRep: 'plaatswaarde', decimalPlaces: 2 },
];

describe('vergelijken representaties: <, = and > all occur', () => {
    test.each(COMBOS)('kiosk, 200 seeds %o: no answer above 60 %, each one present', (over) => {
        const s = share(kioskDraws(over));
        for (const k of ['<', '=', '>']) {
            expect(s[k], `${k} ${JSON.stringify(s)}`).toBeLessThanOrEqual(0.6);
            expect(s[k], `${k} ${JSON.stringify(s)}`).toBeGreaterThan(0.08);
        }
    });

    test('the sheet block draws the same spread', () => {
        const exs: VergelijkenExercise[] = [];
        for (let i = 0; i < 40; i++) {
            const block = makeBlock('vergelijken', { constraints: { subType: 'representaties', leftRep: 'breuk', rightRep: 'kommagetal', maxGetal: 10, decimalPlaces: 1 } });
            exs.push(...(generateFor(block) as VergelijkenExercise[]));
        }
        const s = share(exs);
        for (const k of ['<', '=', '>']) expect(s[k], JSON.stringify(s)).toBeLessThanOrEqual(0.6);
    });

    test('a kommagetal side keeps its decimals and the pair shares its whole part', () => {
        for (const e of kioskDraws()) {
            expect(e.aFrac, JSON.stringify(e)).toBeDefined();
            expect(Number.isInteger(e.b), JSON.stringify(e)).toBe(false);
            expect(Math.floor(e.b!), JSON.stringify(e)).toBe(Math.floor(e.a! + 1e-9));
        }
    });
});
