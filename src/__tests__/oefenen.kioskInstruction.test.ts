import { describe, test, expect } from 'vitest';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import type { BlockConstraints } from '../services/math/constraintTypes';
import { seedConstraints } from '../config/baseSettings';
import { resolveInstruction } from '../config/instructionPresets';
import { kioskCapableLeaves, kioskInstructionOf } from '../services/oefenen/kiosk';
import { nextExercise } from '../services/oefenen/scheduler';
import { gradeBase, mulberry32 } from './helpers/limitHarness';

// Pen verbs: the pupil taps or types, so the card must not tell them to draw on it.
// Word boundaries keep descriptive "onderstreepte cijfer" / "gekleurd" legal.
const PEN_VERB = /\b(omcirkel|kleur|teken|onderstreep|zet een kruisje|kruis aan)\b/i;

describe('kiosk instruction wording', () => {
    test('no kiosk-capable leaf shows a pen verb in the card header', () => {
        for (const leaf of kioskCapableLeaves()) {
            for (const grade of [null, 3, 6] as const) {
                const constraints = seedConstraints({ typeId: leaf.typeId, base: gradeBase(grade), override: { ...leaf.defaultConstraints }, grade, leafId: leaf.id });
                const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
                const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
                for (let seed = 1; seed <= 8; seed++) {
                    const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 31 + 7))!;
                    const paper = resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, got.constraints as BlockConstraints);
                    const shown = kioskInstructionOf(leaf.typeId, got.exercise, got.constraints, paper);
                    expect(shown, `${leaf.id} L${grade}`).not.toMatch(PEN_VERB);
                }
            }
        }
    });
});
