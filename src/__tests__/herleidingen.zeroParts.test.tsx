// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { HerleidingExercise, MathBlock } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor } from '../services/oefenen/kiosk';
import { currentInput, useOefenStore } from '../oefenen/useOefenStore';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Owner decision 2026-10-10: a compound answer's zero parts are dropped from the key ("71 dl", not
// "71 dl 0 cl 0 ml") while the sheet keeps a blank per part; in the kiosk a zero part is right
// typed as 0 or left empty.

const ex = (from: Array<[number, string]>, to: Array<[number, string]>): HerleidingExercise => ({
    id: 'h', format: 'enkel-samengesteld', blank: 'number', isManuallyEdited: false,
    fromParts: from.map(([value, key]) => ({ value, key })), toParts: to.map(([value, key]) => ({ value, key })),
});
const ZERO = ex([[7100, 'ml']], [[71, 'dl'], [0, 'cl'], [0, 'ml']]);
const INHOUD = { measure: 'inhoud', units: ['l', 'dl', 'cl', 'ml'] };
const block = (e: HerleidingExercise, extra: Record<string, unknown> = {}) =>
    ({ id: 'b', typeId: 'herleidingen', constraints: { ...INHOUD, ...extra }, herleidingExercises: [e] }) as unknown as MathBlock;
const solutionTexts = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLElement>('span')].filter(s => s.style.color === 'var(--ink-solution)').map(s => s.textContent);

afterEach(cleanup);

describe('sheet: zero parts', () => {
    test('the key prints 71 dl, without 0 cl 0 ml', () => {
        const { container } = render(<HerleidingenViewer block={block(ZERO)} showSolutions />);
        expect(solutionTexts(container)).toEqual(['71']);
        expect(container.textContent).toContain('dl');
        expect(container.textContent).not.toContain('cl');
    });
    test('writeUnits: the key prints the unit of the kept part only', () => {
        const { container } = render(<HerleidingenViewer block={block(ZERO, { writeUnits: true })} showSolutions />);
        expect(solutionTexts(container)).toEqual(['71', 'dl']);
    });
    test('the sheet keeps a blank for every part', () => {
        const { container } = render(<HerleidingenViewer block={block(ZERO)} showSolutions={false} />);
        expect(solutionTexts(container)).toEqual([]);
        expect(container.textContent).toContain('dl');
        expect(container.textContent).toContain('cl');
        // The given side is 7 100 ml, so 'ml' shows twice: once given, once beside its blank.
        expect(container.textContent!.match(/ml/g)?.length).toBe(2);
    });
    test('a part that is not zero stays in the key', () => {
        const { container } = render(<HerleidingenViewer block={block(ex([[7105, 'ml']], [[71, 'dl'], [0, 'cl'], [5, 'ml']]))} showSolutions />);
        expect(solutionTexts(container)).toEqual(['71', '5']);
    });
});

describe('kiosk: a zero part is 0 or empty', () => {
    const d = kioskFor('herleidingen')!;
    test.each<[string[], boolean]>([
        [['71', '0', '0'], true],
        [['71', '', ''], true],
        [['71', '0', ''], true],
        [['71', '', '0'], true],
        [['', '0', '0'], false],
        [['', '', ''], false],
        [['71', '5', ''], false],
        [['70', '', ''], false],
    ])('%j → %s', (given, right) => {
        expect(checkAnswer(d, ZERO, INHOUD, given)).toBe(right);
    });
    test('a part that is not zero may not be left empty', () => {
        const e = ex([[7105, 'ml']], [[71, 'dl'], [0, 'cl'], [5, 'ml']]);
        expect(checkAnswer(d, e, INHOUD, ['71', '', '5'])).toBe(true);
        expect(checkAnswer(d, e, INHOUD, ['71', '', ''])).toBe(false);
    });
});

function compoundType(): OefenType {
    const leaf = flattenLeaves().find(l => l.id === 'herleidingen-inhoud')!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, formats: ['enkel-samengesteld'], compoundMode: 'volledig' }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId: leaf.id, label: 'Herleiden', constraints, limit: 3, weight: 1 };
}

describe('kiosk store: Controleer takes a compound with empty fields', () => {
    const st = () => useOefenStore.getState();
    beforeEach(resetKiosk);

    test('one field typed is enough to check; none is not', () => {
        st().load(hashOf(starterSessie({ types: [compoundType()] })));
        st().start();
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('multi-number');
        expect(info.labels.length).toBeGreaterThan(1);
        expect(info.blankFieldsOk).toBe(true);
        st().answer();
        expect(st().phase).toBe('exercise');
        // The top part is never zero: type it alone and leave the rest empty.
        st().setField(0, '1');
        st().answer();
        expect(st().phase).not.toBe('exercise');
    });
});
