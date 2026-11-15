// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { decodeTutor, encodeTutorPage, TUTOR_HASH_PREFIX, type TutorPageBlock } from '../services/oefenen/tutorPayload';
import { unpackText, packText } from '../services/oefenen/packText';
import { decodeSessie } from '../services/oefenen/session';
import { TUTOR_OEFEN_COUNT, isTutorSessie, tutorOefenHash } from '../services/oefenen/tutorOefenLink';
import { tutorOefenRow, tutorOefenType } from '../components/sheet/tutorOefen';
import { tutorQrPick } from '../components/sheet/tutorQrPick';
import { isZelfSessie } from '../oefenen/zelf/zelfSessie';
import { stepsFor } from '../services/stepsAvailability';
import { makeBlock, generateFor } from './helpers/makeBlock';
import TutorApp from '../tutor/TutorApp';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { resetKiosk } from './helpers/oefenKiosk';
import type { Equation, MathBlock } from '../services/math/types';

// "Nog meer van deze oefening": the stappenhulp QR also carries each block's Oefenmodus settings, and the
// tutor page opens the kiosk on new sums of that block's type and settings.

const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;
const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: `${a}${b}`, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });

const optellen = (): MathBlock => ({ ...makeBlock('hr-std-optellen', { id: 'o', leafId: 'hr-std-optellen-nat', constraints: { numberType: 'natural' } }), leafId: 'hr-std-optellen-nat', exercises: [eq(475, 368), eq(3, 4)], itemNumbering: 'letter' });
const tafels = (): MathBlock => ({ ...makeBlock('hr-std-vermenigvuldigen', { id: 't', constraints: { numberType: 'natural', multiplicationMode: 'tafels', selectedTables: [7] } }), exercises: [eq(3, 7, { operator: 'x', answer: 21 })] });
// Klok lezen in digital: has steps, but the kiosk cannot practise it (KLOK_KIOSK.supported).
function klokDigitaal(): MathBlock {
    const b = makeBlock('klok-kloklezen', { id: 'k', constraints: { clockType: 'digitaal', exerciseMode: 'lezen' } });
    return { ...b, exercises: generateFor(b) } as MathBlock;
}
const pageOf = (blocks: MathBlock[], rows = true): TutorPageBlock[] =>
    blocks.map((block, i) => ({ block, n: i + 1, title: 'Reken uit.', exercises: (block as { exercises?: unknown[] }).exercises, oefen: rows ? tutorOefenRow(block) : null }));
const versionOf = (payload: string) => (JSON.parse(unpackText(payload, 20_000)!) as unknown[])[0];

// Made by the stappenhulp encoder as it was before 2026-11-15 (rc-oefenen 00b63c1): optellen 475 + 368, 3 + 4 (letters),
// tafel 3 × 7, leerjaar 3. Printed sheets carry exactly this; it must keep decoding, without a button.
const OLD_PAYLOAD = 'BWFDCCUAGAIAJPZCLMXYFHQ234QXNYIKRMJ4II4FE3QPHPLCTBRCMD6MAE3LXLLU5WVD2CFXLLWUDFBJZWKGKVLG4GSBUHUJ7U4M2X5QGT3XRBEJ7AIFKKP2AM';

describe('the block → Oefenmodus row', () => {
    it('optellen and tafels get their kiosk row; a block the kiosk cannot practise gets none', () => {
        expect(tutorOefenType(optellen())).toMatchObject({ typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat' });
        expect(tutorOefenType(tafels())).toMatchObject({ typeId: 'hr-std-vermenigvuldigen', leafId: 'hr-std-vermenigvuldigen-nat', constraints: { selectedTables: [7] } });
        expect(tutorOefenRow(optellen())).not.toBeNull();
        expect(tutorOefenRow(klokDigitaal())).toBeNull();
        // Settings the kiosk supports but that yield nothing (no tijdstype ticked) get nothing either.
        const leeg = makeBlock('klok-kloklezen', { id: 'k0', constraints: { clockType: 'analoog', exerciseMode: 'lezen', timeTypes: [] } });
        expect(tutorOefenRow(leeg)).toBeNull();
    });

    it('the row is the Oefenmodus link\'s own: the hash decodes in the kiosk to that one type, 10 oefeningen, steps on', () => {
        const block = tafels();
        const sessie = decodeSessie(tutorOefenHash(tutorOefenRow(block)!, 3, Date.UTC(2026, 10, 15, 9, 30, 12)));
        const want = tutorOefenType(block)!;
        expect(sessie.types).toHaveLength(1);
        expect(sessie.types[0]).toMatchObject({ typeId: want.typeId, leafId: want.leafId, label: want.label, weight: 100 });
        expect(sessie.types[0].constraints).toEqual(want.constraints);
        expect(sessie).toMatchObject({ total: TUTOR_OEFEN_COUNT, grade: 3, testMode: false, statsLocked: false, createdAt: Date.UTC(2026, 10, 15, 9, 30) });
        expect(sessie.noSteps).toBeUndefined();
        expect(sessie.timerMin).toBeUndefined();
        // A Zelf run for the kiosk (Nakijken, Andere oefening), marked as from the sheet; the same block keeps its id.
        expect(isZelfSessie(sessie) && isTutorSessie(sessie)).toBe(true);
        expect(decodeSessie(tutorOefenHash(tutorOefenRow(block)!, 3)).id).toBe(sessie.id);
        expect(decodeSessie(tutorOefenHash(tutorOefenRow(optellen())!, 3)).id).not.toBe(sessie.id);
    });
});

describe('tutor payload v2', () => {
    it('round trip: each block with a kiosk row carries it, the non-kiosk block carries none; the sums are unchanged', () => {
        const blocks = [optellen(), tafels(), klokDigitaal()];
        const more = encodeTutorPage(pageOf(blocks), hasSteps, { grade: 3, oefen: true })!;
        expect(versionOf(more)).toBe(2);
        const sheet = decodeTutor(TUTOR_HASH_PREFIX + more);
        expect(sheet.groups.map(g => !!g.oefen)).toEqual([true, true, false]);
        expect(sheet.groups[0].oefen).toEqual(tutorOefenRow(blocks[0]));
        expect(sheet.groups[1].oefen).toEqual(tutorOefenRow(blocks[1]));
        const plain = decodeTutor(TUTOR_HASH_PREFIX + encodeTutorPage(pageOf(blocks), hasSteps, { grade: 3 })!);
        expect(sheet.groups.map(g => g.items)).toEqual(plain.groups.map(g => g.items));
        expect(sheet.grade).toBe(3);
    });

    it('without settings the payload stays v1, byte for byte what the sheet printed before', () => {
        // The very page OLD_PAYLOAD was made from.
        const page = (rows: boolean): TutorPageBlock[] => [
            { block: optellen(), n: 1, title: 'Reken uit.', oefen: rows ? tutorOefenRow(optellen()) : null },
            { block: tafels(), n: 2, title: 'Tafels', oefen: rows ? tutorOefenRow(tafels()) : null },
        ];
        expect(encodeTutorPage(page(false), () => true, { grade: 3 })).toBe(OLD_PAYLOAD);
        // Rows present but not asked for: still v1. Asked for on a page where no block has one: nothing to add.
        expect(encodeTutorPage(page(true), () => true, { grade: 3 })).toBe(OLD_PAYLOAD);
        expect(versionOf(encodeTutorPage(page(true), () => true, { grade: 3, oefen: true })!)).toBe(2);
        expect(encodeTutorPage(pageOf([klokDigitaal()]), hasSteps, { oefen: true })).toBeNull();
    });

    it('an old printed payload still decodes, with its steps and without a button', () => {
        const sheet = decodeTutor(TUTOR_HASH_PREFIX + OLD_PAYLOAD);
        expect(sheet.grade).toBe(3);
        expect(sheet.groups.map(g => [g.n, g.title, g.items.length, g.oefen])).toEqual([[1, 'Reken uit.', 2, undefined], [2, 'Tafels', 1, undefined]]);
        expect(sheet.groups[0].items[0]).toMatchObject({ kind: 'sum', steps: true, eq: { operands: [475, 368] } });
    });

    it('a v1 payload with a 5th group slot is refused, a v2 row that is not a row only loses the button, a v3 asks for an update', () => {
        const group = [1, 'x', null, [[475, 368]]];
        expect(() => decodeTutor(packText(JSON.stringify([1, [[...group, [5]]]])))).toThrow(/opdracht/);
        expect(decodeTutor(packText(JSON.stringify([2, [[...group, { nope: 1 }]]]))).groups[0].oefen).toBeUndefined();
        expect(decodeTutor(packText(JSON.stringify([2, [[...group, [5]]]]))).groups[0].oefen).toEqual([5]);
        expect(() => decodeTutor(packText(JSON.stringify([3, [group]])))).toThrow(/nieuwere versie/);
    });

    it('the fallback chain: full + settings → full → lean → none', () => {
        const small = encodeTutorPage(pageOf([optellen()], false), hasSteps)!;
        const withRows = encodeTutorPage(pageOf([optellen()]), hasSteps, { oefen: true })!;
        // Far past QR version 13: nothing fits.
        const huge = 'A'.repeat(1500);
        expect(tutorQrPick(small, small, withRows)).toBe('more');
        expect(tutorQrPick(small, small, huge)).toBe('full');
        expect(tutorQrPick(huge, small, huge)).toBe('lean');
        expect(tutorQrPick(huge, huge, huge)).toBeNull();
        expect(tutorQrPick(small, small)).toBe('full');
        expect(tutorQrPick(null, null, withRows)).toBeNull();
    });
});

describe('the stappenhulp button', () => {
    beforeEach(() => { localStorage.clear(); });
    afterEach(() => { cleanup(); window.location.hash = ''; });

    it('shows per block with settings, in the list and on its sums\' steps, and links to the kiosk on that block', () => {
        const blocks = [optellen(), tafels(), klokDigitaal()];
        window.location.hash = TUTOR_HASH_PREFIX + encodeTutorPage(pageOf(blocks), hasSteps, { grade: 2, oefen: true })!;
        render(<TutorApp />);
        const links = screen.getAllByRole('link', { name: /Nog meer van deze oefening/ });
        expect(links.map(l => l.getAttribute('aria-label'))).toEqual(['Nog meer van deze oefening (opdracht 1)', 'Nog meer van deze oefening (opdracht 2)']);
        const href = links[1].getAttribute('href')!;
        expect(href.startsWith('/oefenen.html#oefen=')).toBe(true);
        const sessie = decodeSessie(href.slice('/oefenen.html'.length));
        expect(sessie.types.map(t => t.leafId)).toEqual(['hr-std-vermenigvuldigen-nat']);
        expect(sessie.types[0].constraints).toEqual(tutorOefenType(blocks[1])!.constraints);
        expect(sessie.grade).toBe(2);
        // On a sum's own page: the button of its block.
        fireEvent.click(screen.getByRole('button', { name: /475 \+ 368/ }));
        expect(screen.getByRole('link', { name: /opdracht 1/ }).getAttribute('href')).toBe(links[0].getAttribute('href'));
    });

    it('an old sheet\'s QR shows no button, its sums still open', () => {
        window.location.hash = TUTOR_HASH_PREFIX + OLD_PAYLOAD;
        render(<TutorApp />);
        expect(screen.queryByRole('link', { name: /Nog meer/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /475 \+ 368/ }));
        expect(screen.getByRole('button', { name: 'Toon de eerste stap' })).toBeTruthy();
    });
});

describe('the kiosk end screen of a stappenhulp run', () => {
    beforeEach(() => { resetKiosk(); vi.spyOn(console, 'error').mockImplementation(() => { }); });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    it('leads back to the sheet, and still offers Andere oefening', () => {
        const st = useOefenStore.getState;
        st().load(tutorOefenHash(tutorOefenRow(optellen())!, 2));
        expect(st().phase).toBe('start');
        st().start();
        useOefenStore.setState(s => ({ phase: 'locked', run: { ...s.run!, done: true } }));
        const assign = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign } as Location);
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: 'Terug naar je blad' }));
        expect(assign).toHaveBeenCalledWith('/tutor.html');
        expect(screen.getByRole('button', { name: 'Andere oefening' }).className).not.toMatch(/primary/);
    });
});
