import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { VormleerExercise } from '../services/math/types';

// Covers the punt-lijn herkennen niveau 2/3 relation sentences and the hoeken
// 'meten' angle range — the parts of vormleerGenerator not exercised by name-only
// assertions elsewhere in the matrix sweep.

describe('vormleer punt-lijn niveau 2/3', () => {
    const concepts = ['punt', 'lijnstuk', 'evenwijdig', 'snijdend', 'loodrecht'];

    test('niveau 2 always carries exactly one relation with a valid label pair', () => {
        for (let i = 0; i < 20; i++) {
            const block = makeBlock('vormleer-punt-lijn', { constraints: { kind: 'punt-lijn', mode: 'herkennen', niveau: 2, concepts } });
            const data = generateFor(block) as VormleerExercise[];
            for (const ex of data) {
                expect(ex.relations, `exercise ${ex.id} has no relations at niveau 2`).toBeTruthy();
                expect(ex.relations!.length).toBe(1);
                const r = ex.relations![0];
                expect(['loodrecht', 'evenwijdig', 'snijdt', 'ligt-op']).toContain(r.kind);
                expect(r.answer.length).toBeGreaterThan(0);
                expect(r.before.length).toBeGreaterThan(0);
            }
        }
    });

    test('niveau 3 always carries two relations via two sub-exercises', () => {
        for (let i = 0; i < 20; i++) {
            const block = makeBlock('vormleer-punt-lijn', { constraints: { kind: 'punt-lijn', mode: 'herkennen', niveau: 3, concepts } });
            const data = generateFor(block) as VormleerExercise[];
            for (const ex of data) {
                expect(ex.subExercises, `exercise ${ex.id} has no subExercises at niveau 3`).toBeTruthy();
                expect(ex.subExercises!.length).toBe(2);
                expect(ex.relations!.length).toBe(2);
                for (const sub of ex.subExercises!) {
                    expect(sub.relations!.length).toBe(1);
                }
            }
        }
    });

    test('rechte labels are lowercase and skip the ambiguous l/o', () => {
        const block = makeBlock('vormleer-punt-lijn', { constraints: { kind: 'punt-lijn', mode: 'herkennen', niveau: 1, concepts: ['rechte'] }, block: { numberOfExercises: 30 } });
        const data = generateFor(block) as VormleerExercise[];
        for (const ex of data) {
            const label = ex.labels?.[0] ?? '';
            expect(label).toBe(label.toLowerCase());
            expect(label).not.toBe('l');
            expect(label).not.toBe('o');
        }
    });
});

describe('vormleer hoeken meten', () => {
    test('angles are multiples of 5 between 20 and 160 (or exactly 90)', () => {
        const block = makeBlock('vormleer-hoeken', { constraints: { kind: 'hoek', mode: 'meten' }, block: { numberOfExercises: 40 } });
        const data = generateFor(block) as VormleerExercise[];
        for (const ex of data) {
            expect(ex.angleDeg).toBeGreaterThanOrEqual(20);
            expect(ex.angleDeg).toBeLessThanOrEqual(160);
            expect((ex.angleDeg ?? 0) % 5).toBe(0);
        }
    });
});
