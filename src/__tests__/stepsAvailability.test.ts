import { describe, expect, it } from 'vitest';
import { blockHasSteps, stepsFor } from '../services/stepsAvailability';
import { REGISTRY } from '../config/exerciseRegistry';
import { listOefenLeaves, rowMayHaveSteps, seedRowConstraints } from '../components/oefenen/oefenBuild';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, MathBlock } from '../services/math/types';

// One rule decides where worked steps are offered: the answer-key toggle, the stappenhulp QR
// (and its Inspector checkbox) and the Oefenmodus switch all ask it.

const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const withSums = (typeId: string, exercises: Equation[], constraints: Record<string, unknown> = {}): MathBlock => {
    const b = makeBlock(typeId);
    return { ...b, exercises, constraints: { ...b.constraints, ...constraints } } as MathBlock;
};

describe('steps availability', () => {
    it('a vrij optellen sum with two place parts has steps', () => {
        expect(stepsFor('hr-std-optellen', eq(475, 368), {})).not.toBeNull();
        expect(blockHasSteps(withSums('hr-std-optellen', [eq(475, 368)]))).toBe(true);
    });

    it('the preset decides: tienvoud has none, compenseren only for sums near a round number', () => {
        expect(blockHasSteps(withSums('hr-std-optellen', [eq(475, 368)], { preset: 'tienvoud' }))).toBe(false);
        expect(blockHasSteps(withSums('hr-std-optellen', [eq(475, 364)], { preset: 'compenseren' }))).toBe(false);
        expect(blockHasSteps(withSums('hr-std-optellen', [eq(140, 99)], { preset: 'compenseren' }))).toBe(true);
    });

    it('puntoefeningen and types without a strategy have none; a tafel has herhaalde optelling', () => {
        expect(blockHasSteps(withSums('hr-std-optellen', [eq(475, 368, { missingTerm: 'operand2' })]))).toBe(false);
        expect(blockHasSteps(withSums('hr-std-vermenigvuldigen', [eq(6, 7, { operator: 'x', answer: 42 })]))).toBe(true);
        expect(blockHasSteps(makeBlock('klok-kloklezen'))).toBe(false);
    });

    it('the Oefenmodus switch: optellen, tafel and klok rows can show steps, a type without a strategy cannot', () => {
        const leaves = listOefenLeaves();
        const row = (id: string) => {
            const leaf = leaves.find(l => l.id === id)!;
            expect(leaf, id).toBeTruthy();
            return { leaf, constraints: seedRowConstraints(leaf, 3) };
        };
        expect(rowMayHaveSteps(row('hr-std-optellen-nat'))).toBe(true);
        expect(rowMayHaveSteps(row('hr-std-vermenigvuldigen-nat'))).toBe(true);
        expect(rowMayHaveSteps(row('klok-analoog-lezen'))).toBe(true);
        // Any leaf whose type has no steps key, so the case survives other types gaining steps.
        const none = leaves.find(l => !REGISTRY[l.typeId]?.steps)!;
        expect(rowMayHaveSteps({ leaf: none, constraints: seedRowConstraints(none, 3) })).toBe(false);
    });
});
