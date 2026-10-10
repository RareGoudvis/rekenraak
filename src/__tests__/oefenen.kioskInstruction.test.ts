import { describe, test, expect } from 'vitest';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import type { BlockConstraints } from '../services/math/constraintTypes';
import type { FractionExercise } from '../services/math/types';
import { seedConstraints } from '../config/baseSettings';
import { resolveInstruction } from '../config/instructionPresets';
import { kioskCapableLeaves, kioskInstructionOf } from '../services/oefenen/kiosk';
import { nextExercise } from '../services/oefenen/scheduler';
import { gradeBase, mulberry32 } from './helpers/limitHarness';

// Pen verbs: the pupil taps or types, so the card must not tell them to draw on it, nor to
// answer "in woorden" (the kiosk only takes typed digits). Word boundaries keep descriptive
// "onderstreepte cijfer" / "gekleurd" legal.
const PEN_VERB = /\b(omcirkel|kleur|teken|onderstreep|zet een kruisje|kruis aan|in woorden)\b/i;
// Owner call 2: the pupil types on a keypad or keyboard, so the card says "Typ …", never "Schrijf …".
const WRITE_VERB = /\bschrijf\b/i;
// Owner call (O22): breuken kleuren says "Kleur 3/6 in.": a tapped part does turn coloured on the card.
const KLEUR_BREUK = /^Kleur \d+\/\d+ in\.$/;

type Shown = { leafId: string; grade: number | null; exercise: unknown; shown: string };

// The card header of 8 seeded draws per kiosk-capable leaf at L-, L3, L6.
function headers(): Shown[] {
    const out: Shown[] = [];
    for (const leaf of kioskCapableLeaves()) {
        for (const grade of [null, 3, 6] as const) {
            const constraints = seedConstraints({ typeId: leaf.typeId, base: gradeBase(grade), override: { ...leaf.defaultConstraints }, grade, leafId: leaf.id });
            const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
            const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
            for (let seed = 1; seed <= 8; seed++) {
                const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 31 + 7))!;
                const paper = resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, got.constraints as BlockConstraints);
                out.push({ leafId: leaf.id, grade, exercise: got.exercise, shown: kioskInstructionOf(leaf.typeId, got.exercise, got.constraints, paper) });
            }
        }
    }
    return out;
}
const ALL = headers();

describe('kiosk instruction wording', () => {
    test('no kiosk-capable leaf shows a pen verb in the card header (bar the owner\'s "Kleur 3/6 in.")', () => {
        for (const h of ALL) if (!KLEUR_BREUK.test(h.shown)) expect(h.shown, `${h.leafId} L${h.grade}`).not.toMatch(PEN_VERB);
    });

    test('no kiosk-capable leaf says "schrijf" in the card header (call 2: "Typ …")', () => {
        const bad = [...new Set(ALL.filter(h => WRITE_VERB.test(h.shown)).map(h => `${h.leafId}: ${h.shown}`))];
        expect(bad).toEqual([]);
        expect(ALL.find(h => h.leafId === 'romeinse-schrijven')?.shown).toBe('Typ in Romeinse cijfers.');
        // A setting-dependent paper wording (maateenheid schrijven) follows the same rule.
        expect(kioskInstructionOf('maateenheid', {}, { answerMode: 'schrijven' }, 'Schrijf de passende maateenheid.')).toBe('Typ de passende maateenheid.');
    });

    test('klok analoog lezen asks for a typed time, the only answer the card takes', () => {
        const lezen = ALL.filter(h => h.leafId === 'klok-analoog-lezen');
        expect(lezen.length).toBeGreaterThan(0);
        for (const h of lezen) expect(h.shown, `L${h.grade}`).toBe('Lees de klok en typ de tijd (uu:mm).');
    });

    test('breuken kleuren names only the fraction, never how many parts to tap (O22)', () => {
        const kleuren = ALL.filter(h => h.leafId === 'breuken-kleuren');
        expect(kleuren.length).toBeGreaterThan(0);
        for (const h of kleuren) {
            const ex = h.exercise as FractionExercise;
            expect(h.shown).toBe(`Kleur ${ex.numerator}/${ex.denominator} in.`);
        }
    });
});
