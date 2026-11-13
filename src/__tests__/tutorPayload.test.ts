import { describe, expect, it } from 'vitest';
import { decodeTutor, encodeTutorPage, TUTOR_HASH_PREFIX, TUTOR_URL, tutorUrlFor } from '../services/oefenen/tutorPayload';
import { packText } from '../services/oefenen/session';
import { qrMatrixOrNull, qrVersionOf } from '../services/qr';
import { stepsFor } from '../services/stepsAvailability';
import { breukHoeveelheidSteps, workedSteps } from '../services/math/workedSteps';
import { makeBlock } from './helpers/makeBlock';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';
import type { TutorItem } from '../services/oefenen/tutorPayload';

// Part D: the stappenhulp QR carries one page's hoofdrekenen sums and breuken van een hoeveelheid, exactly, and nothing else.

// The sheet's own rule: steps under the block's settings (SheetPages passes the same).
const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;
const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const sumOf = (item: TutorItem | null | undefined): Equation => {
    if (item?.kind !== 'sum') throw new Error('not a sum');
    return item.eq;
};
const hr = (exercises: Equation[], typeId = 'hr-std-optellen'): MathBlock =>
    ({ ...makeBlock(typeId, { id: typeId }), exercises, itemNumbering: 'letter' });

describe('tutor payload', () => {
    it('round-trips the sums with steps on their printed labels; a sum without steps is carried greyed, a block without any is left out', () => {
        const page = [
            { block: hr([eq(475, 368), eq(47, 8)]), n: 1, title: 'Reken uit.' },
            { block: makeBlock('klok-kloklezen', { id: 'klok' }), n: 2, title: 'Hoe laat?' },
            // A puntoefening never has steps; 500 − 236 (a brug on a 0 digit) does since 2026-11-13.
            { block: hr([eq(500, 236, { operator: '-', answer: 264 }), eq(36, 4, { operator: 'x', answer: 9, missingTerm: 'operand2' })], 'hr-std-gemengd'), n: 3, title: 'Gemengd' },
        ];
        const sheet = decodeTutor(TUTOR_HASH_PREFIX + encodeTutorPage(page, hasSteps)!);
        expect(sheet.groups.map(g => [g.n, g.title, g.numbering, g.items.length])).toEqual([[1, 'Reken uit.', 'letter', 2], [3, 'Gemengd', 'letter', 2]]);
        const [first, second] = sheet.groups[0].items;
        expect(sumOf(first).operands).toEqual([475, 368]);
        expect(first!.steps).toBe(true);
        // The decoded sum gives the same steps as the sheet's own.
        expect(workedSteps(sumOf(first))).toEqual(workedSteps(eq(475, 368)));
        // 47 + 8 has no steps: listed as b) with its numbers, never opened.
        expect(second).toMatchObject({ kind: 'sum', steps: false, eq: { operands: [47, 8], answer: 55 } });
    });

    it('follows the block preset: a compenseren sum carries its strategy, so the tutor shows compenseren, not rijgen', () => {
        const block = hr([eq(199, 46), eq(475, 368)]);
        const compenseren = { ...block, constraints: { ...block.constraints, preset: 'compenseren' } } as MathBlock;
        const sheet = decodeTutor(encodeTutorPage([{ block: compenseren, n: 1, title: '' }], hasSteps)!);
        // 199 + 46 is not near a round number: shown without steps (and without the strategy); 475 + 368 = 475 + 370 − 2.
        const [none, item] = sheet.groups[0].items;
        expect(none).toMatchObject({ steps: false, eq: { operands: [199, 46] } });
        expect(sumOf(none).variant).toBeUndefined();
        expect(sumOf(item).variant).toBe('+:compenseren');
        expect(workedSteps(sumOf(item))).toEqual(workedSteps(eq(475, 368), { preset: 'compenseren' }));
    });

    it('× and : sums decode with their real answer', () => {
        const sheet = decodeTutor(encodeTutorPage([{ block: hr([eq(5, 65, { operator: 'x', answer: 325 }), eq(2340, 3, { operator: ':', answer: 780 })], 'hr-std-gemengd'), n: 1, title: '' }], hasSteps)!);
        expect(sheet.groups[0].items.map(i => sumOf(i).answer)).toEqual([325, 780]);
        expect(workedSteps(sumOf(sheet.groups[0].items[0]))).toEqual(workedSteps(eq(5, 65, { operator: 'x' })));
    });

    it('a breuk van een hoeveelheid travels as t/n van g and opens the same breukvragen as Oefenmodus', () => {
        const frac = (t: number, n: number, g: number): FractionExercise => ({ id: 'f', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, isManuallyEdited: false });
        const block = { ...makeBlock('breuken', { id: 'b' }), itemNumbering: 'letter' } as MathBlock;
        // 2/3 van 10 does not divide: shown without steps; a kleuren breuk cannot be carried: a placeholder.
        const exercises = [frac(1, 5, 20), frac(1, 3, 12), frac(2, 3, 10), { ...frac(1, 4, 0), subType: 'kleuren' }];
        const payload = encodeTutorPage([{ block, n: 4, title: 'Bereken de breuk van de hoeveelheid.', exercises }], hasSteps)!;
        const [g] = decodeTutor(TUTOR_HASH_PREFIX + payload).groups;
        expect(g.title).toBe('Bereken de breuk van de hoeveelheid.');
        expect(g.items.map(i => (i ? [i.kind, i.steps] : null))).toEqual([['hoeveelheid', true], ['hoeveelheid', true], ['hoeveelheid', false], null]);
        const first = g.items[0]!;
        if (first.kind !== 'hoeveelheid') throw new Error('kind');
        expect(breukHoeveelheidSteps(first.ex)).toEqual(breukHoeveelheidSteps(frac(1, 5, 20)));
        // Only no-steps breuken on a page: no QR content at all.
        expect(encodeTutorPage([{ block, n: 1, title: '', exercises: [frac(2, 3, 10)] }], hasSteps)).toBeNull();
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([1, [[1, 'x', null, [['h', 1, 'a', 3]]]]])))).toThrow(/breuk/);
    });

    it('decodes a QR printed before no-steps sums and breuken travelled exactly as before', () => {
        // Built by encodeTutorPage of 2026-11-12: plain sums, 0 placeholders, − × : met rest, compenseren, cijfer numbering.
        const printed = '#t=LWHL2DWCGAGIIXYFPHWRKJP5JFFF7AE5GXFFIDBKUQAZKVHC6FY2QGHIMDFWO73XWLJXAUTU4I54PXJSUY6YCAVHYQZ6LC5WGCG7CUDQSXK5BLPR33FQYOXSYTYXUFT4DBXZOFNHKJ5FG5OQKY6KKFUS32ZDU5DIP65BOXMZRWXBXBL23WUJZL2AP57VBEMDNWF5U5AZINOEEAAV7XYJRHQ4L46HHJFP275Q6';
        expect(decodeTutor(printed).groups).toEqual([{"n": 1, "title": "Reken uit.", "numbering": "letter", "items": [{"kind": "sum", "eq": {"id": "", "operands": [117, 646], "operator": "+", "isManuallyEdited": false, "answer": 763}, "steps": true}, null, {"kind": "sum", "eq": {"id": "", "operands": [271, 156], "operator": "+", "isManuallyEdited": false, "answer": 427}, "steps": true}]}, {"n": 2, "title": "Gemengd", "numbering": "cijfer", "items": [{"kind": "sum", "eq": {"id": "", "operands": [428, 176], "operator": "-", "isManuallyEdited": false, "answer": 252}, "steps": true}, {"kind": "sum", "eq": {"id": "", "operands": [98, 5], "operator": "x", "isManuallyEdited": false, "answer": 490}, "steps": true}, {"kind": "sum", "eq": {"id": "", "operands": [26, 5], "operator": ":", "isManuallyEdited": false, "answer": 5, "remainder": 1}, "steps": true}, {"kind": "sum", "eq": {"id": "", "operands": [2340, 3], "operator": ":", "isManuallyEdited": false, "answer": 780}, "steps": true}, null]}, {"n": null, "title": "", "numbering": "letter", "items": [{"kind": "sum", "eq": {"id": "", "operands": [475, 368], "operator": "+", "isManuallyEdited": false, "answer": 843, "variant": "+:compenseren"}, "steps": true}, null]}]);
    });

    it('a no-steps sum travels as the text it reads: puntoefeningen, chains and kommagetallen come back the same', () => {
        const sums = [
            eq(475, 368),
            eq(36, 4, { operator: 'x', answer: 144, missingTerm: 'operand2' }),
            { ...eq(12, 5), operands: [12, 5, 3], operators: ['+', '-'], answer: 14 } as Equation,
            eq(0.6, 3, { operator: 'x', answer: 1.8 }),
        ];
        // Only 475 + 368 opens, so the block travels; the other three are greyed.
        const payload = encodeTutorPage([{ block: hr(sums, 'hr-std-gemengd'), n: 1, title: '' }], (_b, ex) => ex === sums[0])!;
        const [, punt, chain, komma] = decodeTutor(payload).groups[0].items;
        expect(punt).toMatchObject({ steps: false, eq: { operands: [36, 0], missingIndex: 1, answer: 144 } });
        expect(sumOf(chain)).toMatchObject({ operands: [12, 5, 3], operators: ['+', '-'] });
        expect(sumOf(komma).operands).toEqual([0.6, 3]);
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([1, [[1, 'x', null, ['1+2+3+4+5+6']]]])))).toThrow(/oefening/);
    });

    it('rejects an unknown strategy', () => {
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([1, [[1, 'x', null, [['+', [1, 2], -1, null, 'evil']]]]])))).toThrow(/strategie/);
    });

    it('a page without sums that have steps has no payload; a breuk operand is never carried', () => {
        expect(encodeTutorPage([{ block: makeBlock('klok-kloklezen', { id: 'k' }), n: 1, title: '' }], hasSteps)).toBeNull();
        const breuk = { ...eq(1, 2), operands: [{ numerator: 1, denominator: 2 }, 3] } as unknown as Equation;
        expect(encodeTutorPage([{ block: hr([breuk]), n: 1, title: '' }], hasSteps)).toBeNull();
        const sheet = decodeTutor(encodeTutorPage([{ block: hr([breuk, eq(475, 368)]), n: 1, title: '' }], hasSteps)!);
        expect(sheet.groups[0].items[0]).toBeNull();
        expect(sheet.groups[0].items[1]).toMatchObject({ steps: true });
    });

    it('rejects broken, hostile and future payloads with a Dutch message', () => {
        expect(() => decodeTutor('#t=')).toThrow(/QR-code/);
        expect(() => decodeTutor('#t=!!!')).toThrow(/beschadigd/);
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([9, []])))).toThrow(/nieuwere versie/);
        expect(() => decodeTutor('#t=' + packText(JSON.stringify([1, [[1, 'x', null, [['+', ['a', 2], -1]]]]])))).toThrow(/getallen/);
        expect(() => decodeTutor('#t=' + packText(' '.repeat(50_000)))).toThrow(/beschadigd/);
    });

    it('a full page of 50 sums up to 1000 fits the 26 mm QR (version 13 at most)', () => {
        let seed = 7;
        const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
        const sums = Array.from({ length: 50 }, () => { const a = 10 + rnd(500); return eq(a, 1 + rnd(1000 - a)); });
        const payload = encodeTutorPage([
            { block: hr(sums.slice(0, 25)), n: 1, title: 'Reken uit.' },
            { block: hr(sums.slice(25)), n: 2, title: 'Reken uit.' },
        ], hasSteps)!;
        const matrix = qrMatrixOrNull(TUTOR_URL + TUTOR_HASH_PREFIX + payload)!;
        expect(qrVersionOf(matrix)).toBeLessThanOrEqual(13);
    });

    it('a crammed page whose greyed sums push it past version 13 still gets a QR without them (TutorQr falls back to lean)', () => {
        let seed = 11;
        const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n; };
        const mixed = Array.from({ length: 50 }, (_, i) => {
            const a = 100 + rnd(900), b = 1 + rnd(99);
            return i % 3 === 0 ? eq(a, b) : i % 3 === 1 ? eq(a, b, { operator: '-', answer: a - b }) : eq(b, 1 + rnd(9), { operator: 'x', answer: 0 });
        });
        const page = [
            { block: hr(mixed.slice(0, 25), 'hr-std-gemengd'), n: 1, title: 'Reken uit.' },
            { block: hr([...mixed.slice(25), eq(475, 368)], 'hr-std-gemengd'), n: 2, title: 'Reken uit.' },
        ];
        const version = (p: string) => qrVersionOf(qrMatrixOrNull(TUTOR_URL + TUTOR_HASH_PREFIX + p)!);
        const full = encodeTutorPage(page, hasSteps)!;
        const lean = encodeTutorPage(page, hasSteps, { greyed: false })!;
        expect(version(full)).toBeGreaterThan(13);
        expect(version(lean)).toBeLessThanOrEqual(13);
        // Lean is the old wire: every no-steps sum a 0 placeholder, the sums with steps unchanged.
        const items = decodeTutor(TUTOR_HASH_PREFIX + lean).groups.flatMap(g => g.items);
        expect(items.every(i => i === null || i.steps)).toBe(true);
        expect(items.filter(i => i === null).length).toBeGreaterThan(0);
    });

    it('the QR points at the tutor next to the editor that printed it (https only)', () => {
        expect(tutorUrlFor('https://feat-stappen.rekenraak.pages.dev')).toBe('https://feat-stappen.rekenraak.pages.dev/tutor.html');
        expect(tutorUrlFor('http://localhost:5173')).toBe(TUTOR_URL);
    });
});
