// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SheetPages from '../components/sheet/SheetPages';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { decodeTutor, encodeTutorPage, tutorPageMarks, tutorStepsOf, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { stepsFor } from '../services/stepsAvailability';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { PackedPage } from '../services/layout/pagePacker';
import type { MeasuredHeights } from '../hooks/useMeasuredHeights';
import type { SheetDnd } from '../hooks/useSheetDnd';
import type { Equation, MathBlock } from '../services/math/types';

// The footsteps mark on the sheet says which sums the stappenhulp opens with steps: one mark by the
// title when every sum does, one per sum when only some do, none at all with the QR off.

const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;
const eq = (a: number, b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: `${a}${extra.operator ?? '+'}${b}`, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false, ...extra });
const hr = (id: string, exercises: Equation[], typeId = 'hr-std-optellen', extra: Partial<MathBlock> = {}): MathBlock =>
    ({ ...makeBlock(typeId, { id }), exercises, instructionText: 'Reken uit.', ...extra });

const page = (blocks: MathBlock[]): PackedPage => ({
    blocks: blocks.map((block, i) => ({ block, width: 4, height: 6, spans: false, promoted: false, x: 0, y: i * 200, w: 4, h: 180 })),
    used: blocks.length * 8, fill: [0, 0, 0, 0], budgetPx: 916,
});
const measured: MeasuredHeights = {
    heightPxOf: () => undefined, pageBudgetPx: () => undefined, onCellMeasure: () => { }, intrinsicOf: () => undefined,
    intrinsicEntries: () => [], onBodyMeasure: () => { }, rowCutsOf: () => undefined, onRowsMeasure: () => { }, version: 0,
};
const dnd: SheetDnd = {
    fromId: null, overId: null, zone: null, isNoop: () => false,
    handleProps: () => ({ onPointerDown: () => { } }), blockProps: () => ({ onPointerDown: () => { } }),
};

function sheet(blocks: MathBlock[], tutorQr: boolean) {
    const base = useWorksheetStore.getState().docSettings;
    useWorksheetStore.setState({ blocks, docSettings: { ...base, tutorQr } });
    const order = Object.fromEntries(blocks.map((b, i) => [b.id, i + 1]));
    return render(<SheetPages packedPages={[page(blocks)]} blockOrder={order} measured={measured} dnd={dnd} onOpenSplit={() => { }} />).container;
}
const cell = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!;
const titleMarks = (root: HTMLElement, id: string) => cell(root, id).querySelectorAll('.print-opdracht .steps-glyph').length;
const sumMarks = (root: HTMLElement, id: string) => cell(root, id).querySelectorAll('.steps-glyph').length - titleMarks(root, id);

let snapshot: ReturnType<typeof useWorksheetStore.getState>;
beforeEach(() => { snapshot = useWorksheetStore.getState(); });
afterEach(() => { cleanup(); useWorksheetStore.setState(snapshot, true); });

describe('stappenhulp marks: the rule', () => {
    it('reads the QR as the pupil\'s phone does: a sum with steps opens, a fact without steps and a puntoefening do not', () => {
        const blocks = [{ block: hr('a', [eq(475, 368), eq(3, 4), eq(475, 368, { missingTerm: 'operand2' })]), n: 1, title: 'Reken uit.' }];
        expect(tutorPageMarks(blocks, hasSteps)).toEqual([[true, false, false]]);
        // Exactly what the tutor page decodes and opens.
        const decoded = decodeTutor(TUTOR_HASH_PREFIX + encodeTutorPage(blocks, hasSteps)!).groups[0].items;
        expect(decoded.map(it => tutorStepsOf(it) !== null)).toEqual([true, false, false]);
    });

    it('a block the QR leaves out (no sum with steps, or a type without steps) has no marks', () => {
        const cijferen = makeBlock('cijferen-optellen-nat', { id: 'c' });
        const withEx = { ...cijferen, exercises: generateFor(cijferen) } as MathBlock;
        const blocks = [
            { block: hr('p', [eq(475, 368, { missingTerm: 'operand2' })]), n: 1, title: 'x' },
            { block: withEx, n: 2, title: 'y' },
        ];
        expect(tutorPageMarks(blocks, hasSteps).map(m => m.some(Boolean))).toEqual([false, false]);
    });

    it('a preset block without steps is left out of the QR; the lean QR (a crammed page) keeps the same marks', () => {
        const tienvoud = hr('t', [eq(475, 368), eq(40, 30)], 'hr-std-optellen', { constraints: { ...makeBlock('hr-std-optellen').constraints, preset: 'tienvoud' } });
        const mixed = hr('m', [eq(475, 368), eq(3, 4), eq(236, 148)], 'hr-std-gemengd');
        const blocks = [{ block: mixed, n: 1, title: 'a' }, { block: tienvoud, n: 2, title: 'b' }];
        const full = tutorPageMarks(blocks, hasSteps);
        expect(full).toEqual([[true, false, true], [false, false]]);
        expect(tutorPageMarks(blocks, hasSteps, { greyed: false })).toEqual(full);
    });

    it('a codec type follows the sheet\'s own decision (breuk van een hoeveelheid)', () => {
        const b = makeBlock('breuken', { id: 'h', leafId: 'breuken-hoeveelheid', constraints: { subType: 'hoeveelheid' } });
        const block = { ...b, fractionExercises: generateFor(b) } as MathBlock;
        const marks = tutorPageMarks([{ block, n: 1, title: 'x', exercises: (block as unknown as { fractionExercises: unknown[] }).fractionExercises }], hasSteps)[0];
        expect(marks.length).toBeGreaterThan(0);
        expect(marks.every(Boolean)).toBe(true);
    });
});

describe('stappenhulp marks on the sheet', () => {
    const all = () => hr('all', [eq(475, 368), eq(236, 148)]);
    const some = () => hr('some', [eq(475, 368), eq(3, 4), eq(6, 1, { operator: 'x', answer: 6 })], 'hr-std-gemengd', { itemNumbering: 'letter' });
    const none = () => hr('none', [eq(3, 4), eq(5, 2)]);

    it('every sum with steps: one mark by the title, none on the sums', () => {
        const root = sheet([all(), some()], true);
        expect(titleMarks(root, 'all')).toBe(1);
        expect(sumMarks(root, 'all')).toBe(0);
    });

    it('only some sums with steps: a mark on each of those, none by the title', () => {
        const root = sheet([all(), some()], true);
        expect(titleMarks(root, 'some')).toBe(0);
        expect(sumMarks(root, 'some')).toBe(1);
        // The mark sits in the label column, before "a)", not in the answer space.
        const label = [...cell(root, 'some').querySelectorAll('span')].find(s => s.textContent === ' a)');
        expect(label?.querySelector('.steps-glyph')).not.toBeNull();
    });

    it('a block without steps gets none; the footer explains the mark', () => {
        const root = sheet([all(), none()], true);
        expect(cell(root, 'none').querySelectorAll('.steps-glyph').length).toBe(0);
        expect(root.querySelector('.tutor-qr-legend')?.textContent).toContain('hebben stappen');
        expect(root.querySelector('.tutor-qr-legend .steps-glyph')).not.toBeNull();
    });

    it('a hidden title: the sums carry their own marks', () => {
        const root = sheet([{ ...all(), showInstruction: false }], true);
        expect(sumMarks(root, 'all')).toBe(2);
    });

    it('QR off: no mark anywhere, and the sheet renders exactly as before', () => {
        const root = sheet([all(), some(), none()], false);
        expect(root.querySelectorAll('.steps-glyph').length).toBe(0);
        expect(root.querySelector('.tutor-qr-legend')).toBeNull();
    });
});
