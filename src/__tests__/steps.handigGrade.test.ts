import { describe, expect, it } from 'vitest';
import { decodeSessie, encodeSessie, parseSessie, sessieContentHash } from '../services/oefenen/session';
import { decodeTutor, encodeTutorPage } from '../services/oefenen/tutorPayload';
import { handigFor, stepsFor } from '../services/stepsAvailability';
import { buildSessie, listOefenLeaves } from '../components/oefenen/oefenBuild';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, MathBlock } from '../services/math/types';

// Ontbinden is leerjaar 6 (owner, 2026-11-13): the leerjaar travels in the Oefenmodus link (flag bits 5–7) and in the
// stappenhulp QR (a 3rd wire slot), and only handig rekenen reads it.

const mul = (a: number, b: number): Equation => ({ id: 'x', operands: [a, b], operator: 'x', answer: a * b, isManuallyEdited: false });
const names = (grade?: number) => handigFor('hr-std-vermenigvuldigen', mul(25, 32), {}, grade).map(h => h.name);

function sessie(grade?: number | null) {
    const leaf = listOefenLeaves().find(l => l.typeId === 'hr-std-vermenigvuldigen')!;
    return buildSessie([{ key: 'r0', leaf, constraints: makeBlock(leaf.typeId, { leafId: leaf.id }).constraints as Record<string, unknown>, weight: 100 }], {
        id: 'k3x9q2ab', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false, grade,
    }).sessie;
}

describe('handig rekenen follows the pupil\'s leerjaar', () => {
    it('ontbinden only for leerjaar 6; unknown leerjaar never gets it', () => {
        expect(names()).not.toContain('Ontbinden');
        expect(names(5)).not.toContain('Ontbinden');
        expect(names(6)).toContain('Ontbinden');
    });

    it('the Oefenmodus link carries the leerjaar, and a link without it decodes as unknown', () => {
        const six = sessie(6);
        expect(six.grade).toBe(6);
        expect(decodeSessie(`#oefen=${encodeSessie(six)}`).grade).toBe(6);
        expect(decodeSessie(`#oefen=${encodeSessie(sessie(null))}`).grade).toBeUndefined();
        // The leerjaar never changes what is practised, so the session (and its pupils' runs) keeps its id.
        expect(sessieContentHash(six)).toBe(sessieContentHash(sessie(null)));
        expect(() => parseSessie({ ...six, grade: 7 })).toThrow(/leerjaar/);
    });

    it('the stappenhulp QR carries the leerjaar; a QR without it decodes as unknown', () => {
        const block = { ...makeBlock('hr-std-vermenigvuldigen', { id: 'm' }), exercises: [mul(5, 65)] } as MathBlock;
        const has = (b: MathBlock, ex: unknown) => stepsFor(b.typeId, ex, b.constraints) !== null;
        const page = [{ block, n: 1, title: '' }];
        expect(decodeTutor(encodeTutorPage(page, has, { grade: 6 })!).grade).toBe(6);
        expect(decodeTutor(encodeTutorPage(page, has, { grade: null })!).grade).toBeUndefined();
        expect(decodeTutor(encodeTutorPage(page, has)!).grade).toBeUndefined();
    });
});
