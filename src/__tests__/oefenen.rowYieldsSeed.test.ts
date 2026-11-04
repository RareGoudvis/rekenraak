import { describe, expect, test, vi, afterEach } from 'vitest';
import { listOefenLeaves, rowYields } from '../components/oefenen/oefenBuild';
import { deadSlots } from '../services/oefenen/scheduler';
import { OEFEN_VERSION, type OefenSessie, type OefenType } from '../services/oefenen/types';

afterEach(() => vi.restoreAllMocks());

// The pre-flight must not depend on Math.random: the same row is dead or alive every time
// (it once flaked in the gate on a row that yields only for a rare draw).
describe('rowYields is deterministic', () => {
    const leaf = listOefenLeaves().find(l => l.id === 'hr-std-delen-dec')!;
    const row = () => ({ leaf, constraints: { ...leaf.constraints, maxGetal: 1e9, operandMax: [20, 20, 20, 20] } });

    test('the verdict is the same under every Math.random stream', () => {
        const verdicts = new Set<boolean>();
        for (const seed of [0.001, 0.2, 0.5, 0.8, 0.999]) {
            vi.spyOn(Math, 'random').mockReturnValue(seed);
            verdicts.add(rowYields(row()));
            vi.restoreAllMocks();
        }
        // Real randomness, many fresh rows (the verdict cache is per constraints object).
        for (let i = 0; i < 40; i++) verdicts.add(rowYields(row()));
        expect(verdicts.size).toBe(1);
    });

    test('it agrees with the kiosk\'s own dead-slot probe', () => {
        const r = row();
        const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints: r.constraints, weight: 100 };
        const s: OefenSessie = { v: OEFEN_VERSION, id: 'x', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
        expect(rowYields(r)).toBe(!deadSlots(s).has(0));
    });
});
