// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { cellPlanOf, useOefenStore } from '../oefenen/useOefenStore';
import { EMPTY_INTERACTION } from '../components/viewer/ViewerInteractionContext';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';
import type { CijferExercise } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { KIOSK_LEAF_TABLE_V1 } from '../services/oefenen/kiosk';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';

// O12: the physical keyboard on a fill-cells card. Tab / Shift+Tab step through the grid's cells
// (carries too) and leave it at both ends in DOM order; Escape jumps to the keypad.

const st = () => useOefenStore.getState();

const TABBABLE = 'input:not([disabled]), button:not([disabled]), [tabindex]';

// jsdom has no focus traversal: a Tab the page did not prevent moves to the next tabbable in DOM order, as a browser does.
function tab(shift = false) {
    const from = document.activeElement as HTMLElement;
    const notPrevented = fireEvent.keyDown(from, { key: 'Tab', shiftKey: shift });
    if (!notPrevented) return;
    const all = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(el => el.tabIndex >= 0);
    act(() => all[all.indexOf(from) + (shift ? -1 : 1)]?.focus());
}

const focusedKey = () => (document.activeElement as HTMLElement | null)?.getAttribute('data-kiosk-key') ?? null;

// 345 + 278: three columns, so the grid is a2 c1 a1 c0 a0 (right to left, each carry after its column).
const SUM: CijferExercise = { id: 'kb', operands: [345, 278], operator: '+', answer: 623, remainder: 0, isManuallyEdited: false };

function startGrid() {
    const cijfer = { typeId: 'cijferen-optellen-nat', leafId: 'cijferen-optellen-nat', label: 'Cijferen', constraints: { operator: '+', numberType: 'natural' }, limit: 2, weight: 1 };
    st().load(hashOf(starterSessie({ types: [cijfer] })));
    st().start();
    useOefenStore.setState({ shown: { ...st().shown!, exercise: SUM }, interaction: EMPTY_INTERACTION, activeCell: 'a2' });
    render(<OefenApp />);
}

beforeEach(() => resetKiosk());
afterEach(() => cleanup());

describe('fill-cells keyboard route', () => {
    test('the first cell has the focus', () => {
        startGrid();
        expect(focusedKey()).toBe('a2');
    });

    test('Tab walks a2 → c1 → a1 → c0 → a0, then leaves the grid for the keypad', () => {
        startGrid();
        const seen = [focusedKey()];
        for (let i = 0; i < 4; i++) { tab(); seen.push(focusedKey()); }
        expect(seen).toEqual(['a2', 'c1', 'a1', 'c0', 'a0']);
        tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: '7' }));
        // The keypad still types into the cell the pupil left.
        expect(st().activeCell).toBe('a0');
    });

    test('Shift+Tab steps back inside the grid and leaves it before the first cell', () => {
        startGrid();
        tab(); tab();
        expect(focusedKey()).toBe('a1');
        tab(true);
        expect(focusedKey()).toBe('c1');
        tab(true);
        expect(focusedKey()).toBe('a2');
        tab(true);
        expect(document.activeElement?.getAttribute('data-kiosk-cell')).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /Resultaten/ }));
    });

    test('Shift+Tab from the keypad comes back to the last cell, not a cell further in', () => {
        startGrid();
        for (let i = 0; i < 5; i++) tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: '7' }));
        tab(true);
        expect(focusedKey()).toBe('a0');
    });

    test('Escape moves the focus to the keypad', () => {
        startGrid();
        tab();
        fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: '7' }));
        expect(st().activeCell).toBe('c1');
    });

    test('Escape on a tap-multi card (no keypad) moves the focus to Controleer', () => {
        const even = flattenLeaves().find(l => l.id === 'even-oneven-rooster')!;
        st().load(hashOf(starterSessie({ types: [{ typeId: even.typeId, leafId: even.id, label: 'x', constraints: makeDraftBlock(even.typeId, even.defaultConstraints ?? {}).constraints as Record<string, unknown>, limit: 2, weight: 1 }] })));
        st().start();
        render(<OefenApp />);
        const part = document.querySelector<HTMLElement>('.kiosk-card-col [role="button"]')!;
        act(() => part.focus());
        fireEvent.keyDown(part, { key: 'Escape' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Controleer' }));
    });

    test('Enter still walks the answer cells only (carries are skipped)', () => {
        startGrid();
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(focusedKey()).toBe('a1');
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(focusedKey()).toBe('a0');
    });
});

describe('moveCell', () => {
    test('stops at both ends and says whether it moved', () => {
        const cijfer = { typeId: 'cijferen-optellen-nat', leafId: 'cijferen-optellen-nat', label: 'Cijferen', constraints: { operator: '+', numberType: 'natural' }, limit: 2, weight: 1 };
        st().load(hashOf(starterSessie({ types: [cijfer] })));
        st().start();
        useOefenStore.setState({ shown: { ...st().shown!, exercise: SUM }, activeCell: 'a0' });
        expect(st().moveCell(1)).toBe(false);
        expect(st().activeCell).toBe('a0');
        expect(st().moveCell(-1)).toBe(true);
        expect(st().activeCell).toBe('c0');
        useOefenStore.setState({ activeCell: 'a2' });
        expect(st().moveCell(-1)).toBe(false);
        expect(st().activeCell).toBe('a2');
    });
});

// The browser leaves the grid from the first / last cell in DOM order, so the Tab route only
// reaches the keypad if every viewer draws its cells in the descriptor's key order.
describe('every fill-cells leaf draws its cells in key order', () => {
    const leaves = flattenLeaves().filter(l => KIOSK_LEAF_TABLE_V1.includes(l.id));
    test.each(leaves.map(l => [l.id, l] as const))('%s', (_id, leaf) => {
        const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.id, constraints: makeDraftBlock(leaf.typeId, leaf.defaultConstraints ?? {}).constraints as Record<string, unknown>, limit: 5, weight: 1 };
        for (let i = 0; i < 5; i++) {
            resetKiosk();
            st().load(hashOf(starterSessie({ types: [type] })));
            st().start();
            const plan = cellPlanOf(st().sessie, st().shown);
            if (!plan) return;
            const { container, unmount } = render(<OefenApp />);
            const drawn = [...container.querySelectorAll('[data-kiosk-cell]')].map(el => el.getAttribute('data-kiosk-key'));
            expect(drawn).toEqual(plan.keys);
            unmount();
        }
    });
});

// O13: a screen reader tells the cells apart by role and column.
describe('cijfer cells have a name per role and column', () => {
    const labelsOf = (leafId: string, exercise: CijferExercise) => {
        resetKiosk();
        const leaf = flattenLeaves().find(l => l.id === leafId)!;
        const type: OefenType = { typeId: leaf.typeId, leafId, label: leafId, constraints: makeDraftBlock(leaf.typeId, leaf.defaultConstraints ?? {}).constraints as Record<string, unknown>, limit: 2, weight: 1 };
        st().load(hashOf(starterSessie({ types: [type] })));
        st().start();
        useOefenStore.setState({ shown: { ...st().shown!, exercise }, interaction: EMPTY_INTERACTION, activeCell: null });
        const { container, unmount } = render(<OefenApp />);
        const labels = [...container.querySelectorAll('[data-kiosk-cell]')].map(el => el.getAttribute('aria-label'));
        unmount();
        expect(labels).not.toContain('Vul in');
        expect(new Set(labels).size).toBe(labels.length);
        return labels;
    };
    const ex = (operator: CijferExercise['operator'], operands: number[], answer: number, remainder = 0, decimalPlaces = 0): CijferExercise =>
        ({ id: 'n', operands, operator, answer, remainder, decimalPlaces, isManuallyEdited: false });

    test('optellen: answer and carry per column', () => {
        expect(labelsOf('cijferen-optellen-nat', SUM)).toEqual([
            'Antwoord eenheden', 'Onthouden tientallen', 'Antwoord tientallen', 'Onthouden honderdtallen', 'Antwoord honderdtallen',
        ]);
    });

    test('optellen with decimals names the decimal columns', () => {
        expect(labelsOf('cijferen-optellen-dec', ex('+', [2.5, 1.25], 3.75, 0, 2))).toEqual([
            'Antwoord honderdsten', 'Onthouden tienden', 'Antwoord tienden', 'Onthouden eenheden', 'Antwoord eenheden',
        ]);
    });

    test('aftrekken: the exchange cell above each column, then its answer', () => {
        expect(labelsOf('cijferen-aftrekken-nat', ex('-', [52, 17], 35))).toEqual([
            'Lenen eenheden', 'Antwoord eenheden', 'Lenen tientallen', 'Antwoord tientallen',
        ]);
    });

    test('vermenigvuldigen: one-digit multiplier carries, multi-digit partial products', () => {
        expect(labelsOf('cijferen-vermenigvuldigen-nat', ex('x', [123, 4], 492))).toEqual([
            'Antwoord eenheden', 'Onthouden tientallen', 'Antwoord tientallen', 'Onthouden honderdtallen', 'Antwoord honderdtallen',
        ]);
        const many = labelsOf('cijferen-vermenigvuldigen-nat', ex('x', [123, 45], 5535));
        expect(many).toContain('Deelproduct 1 eenheden');
        expect(many).toContain('Deelproduct 2 duizendtallen');
        expect(many.at(-1)).toBe('Antwoord duizendtallen');
    });

    test('delen: quotient columns, then the rest', () => {
        expect(labelsOf('cijferen-delen-nat', ex(':', [845, 5], 169))).toEqual([
            'Quotiënt honderdtallen', 'Quotiënt tientallen', 'Quotiënt eenheden', 'Rest',
        ]);
    });
});
