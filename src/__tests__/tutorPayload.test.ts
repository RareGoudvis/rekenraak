import { describe, expect, it } from 'vitest';
import { decodeTutor, encodeTutorPage, TUTOR_HASH_PREFIX, TUTOR_URL, tutorUrlFor } from '../services/oefenen/tutorPayload';
import { packText } from '../services/oefenen/session';
import { qrMatrixOrNull, qrVersionOf } from '../services/qr';
import { REGISTRY } from '../config/exerciseRegistry';
import { workedSteps } from '../services/math/workedSteps';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, MathBlock } from '../services/math/types';

// Part D: the stappenhulp QR carries one page's hoofdrekenen sums, exactly, and nothing else.

const hasSteps = (typeId: string) => !!REGISTRY[typeId]?.steps;
const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const hr = (exercises: Equation[], typeId = 'hr-std-optellen'): MathBlock =>
    ({ ...makeBlock(typeId, { id: typeId }), exercises, itemNumbering: 'letter' });

describe('tutor payload', () => {
    it('round-trips the sums, numbering and titles; other blocks are left out', () => {
        const page = [
            { block: hr([eq(475, 368), eq(47, 8)]), n: 1, title: 'Reken uit.' },
            { block: makeBlock('klok-kloklezen', { id: 'klok' }), n: 2, title: 'Hoe laat?' },
            { block: hr([eq(500, 236, { operator: '-', answer: 264 }), eq(36, 4, { operator: 'x', answer: 9, missingTerm: 'operand2' })], 'hr-std-gemengd'), n: null, title: 'Gemengd' },
        ];
        const sheet = decodeTutor(TUTOR_HASH_PREFIX + encodeTutorPage(page, hasSteps)!);
        expect(sheet.groups.map(g => [g.n, g.title, g.numbering, g.items.length])).toEqual([[1, 'Reken uit.', 'letter', 2], [null, 'Gemengd', 'letter', 2]]);
        const [first] = sheet.groups[0].items;
        expect(first!.operands).toEqual([475, 368]);
        // The decoded sum gives the same steps as the sheet's own.
        expect(workedSteps(first!)).toEqual(workedSteps(eq(475, 368)));
        const punt = sheet.groups[1].items[1]!;
        expect([punt.operator, punt.missingIndex, punt.answer]).toEqual(['x', 1, 9]);
    });

    it('a page without hoofdrekenen has no payload; a breuk travels as a placeholder', () => {
        expect(encodeTutorPage([{ block: makeBlock('klok-kloklezen', { id: 'k' }), n: 1, title: '' }], hasSteps)).toBeNull();
        const breuk = { ...eq(1, 2), operands: [{ numerator: 1, denominator: 2 }, 3] } as unknown as Equation;
        const sheet = decodeTutor(encodeTutorPage([{ block: hr([breuk]), n: 1, title: '' }], hasSteps)!);
        expect(sheet.groups[0].items).toEqual([null]);
    });

    it('rejects broken, hostile and future payloads with a Dutch message', () => {
        expect(() => decodeTutor('#t=')).toThrow(/QR-code/);
        expect(() => decodeTutor('#t=!!!')).toThrow(/beschadigd/);
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([9, []])))).toThrow(/nieuwere versie/);
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([1, [[1, 'x', null, [['+', ['a', 2], -1]]]]])))).toThrow(/getallen/);
        expect(() => decodeTutor('#t=' + packText(' '.repeat(50_000)))).toThrow(/beschadigd/);
    });

    it('a full page of 50 sums up to 1000 fits the 30 mm QR (version 15 at most)', () => {
        let seed = 7;
        const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
        const sums = Array.from({ length: 50 }, () => { const a = 10 + rnd(500); return eq(a, 1 + rnd(1000 - a)); });
        const payload = encodeTutorPage([
            { block: hr(sums.slice(0, 25)), n: 1, title: 'Reken uit.' },
            { block: hr(sums.slice(25)), n: 2, title: 'Reken uit.' },
        ], hasSteps)!;
        const matrix = qrMatrixOrNull(TUTOR_URL + TUTOR_HASH_PREFIX + payload)!;
        expect(qrVersionOf(matrix)).toBeLessThanOrEqual(15);
    });

    it('the QR points at the tutor next to the editor that printed it (https only)', () => {
        expect(tutorUrlFor('https://feat-stappen.rekenraak.pages.dev')).toBe('https://feat-stappen.rekenraak.pages.dev/tutor.html');
        expect(tutorUrlFor('http://localhost:5173')).toBe(TUTOR_URL);
    });
});
