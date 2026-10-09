// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { parseGeldPalet, loadGeldPalet, geldItemProps, geldItemWidth, GELD_PALET_KEY, DEFAULT_GELD_PALET, GELD_CATALOGUE } from '../board/mathTools/geld';
import GeldPalet from '../board/components/GeldPalet';
import GeldItemWidget from '../board/components/widgets/GeldItemWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import type { BoardWidget } from '../board/boardTypes';

// The geld dock's settings are per device (localStorage); a dropped piece carries its own
// style / caption, and its size is the frame width (the frame zooms content by w / 100).
const st = () => useBoardStore.getState();
const coins = () => st().pages[st().activePageIdx].widgets.filter(w => w.kind === 'geld-item');

beforeAll(() => {
    HTMLElement.prototype.setPointerCapture ??= () => {};
    HTMLElement.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
    useBoardStore.setState({ gridSize: 40 });
});

function mountDock() {
    return render(<div data-board-canvas><GeldPalet /></div>);
}

function drop(container: HTMLElement, index: number, x: number, y: number) {
    const item = container.querySelectorAll<HTMLElement>('[data-geld-palet-item]')[index];
    act(() => { fireEvent.pointerDown(item, { clientX: x, clientY: y, pointerId: 1 }); });
    act(() => { fireEvent.pointerMove(item, { clientX: x + 3, clientY: y + 7, pointerId: 1 }); });
    act(() => { fireEvent.pointerUp(item, { clientX: x + 3, clientY: y + 7, pointerId: 1 }); });
}

describe('geld model', () => {
    test('palette settings default to today\'s dock; junk reads as defaults', () => {
        expect(parseGeldPalet(null)).toEqual(DEFAULT_GELD_PALET);
        expect(DEFAULT_GELD_PALET.denoms).toHaveLength(15);
        expect(parseGeldPalet({ denoms: [1, 7, 50000], style: 'goud', size: 99, snap: 'ja' })).toEqual({ ...DEFAULT_GELD_PALET, denoms: [50000, 1], size: 2 });
        expect(parseGeldPalet({ denoms: [] }).denoms).toHaveLength(15);
        localStorage.setItem(GELD_PALET_KEY, '{oops');
        expect(loadGeldPalet()).toEqual(DEFAULT_GELD_PALET);
    });

    test('an old dropped piece reads as before; unknown denominations fall back', () => {
        const w = (props: Record<string, unknown>): BoardWidget => ({ id: 'g', kind: 'geld-item', x: 0, y: 0, w: 74, z: 1, props });
        expect(geldItemProps(w({ denom: 5000, type: 'bill', geldStyle: 'realistisch' }))).toEqual({ denom: 5000, type: 'bill', style: 'realistisch', showLabel: false });
        expect(geldItemProps(w({ denom: 3 }))).toMatchObject({ denom: 100, type: 'euro-coin', style: 'tekening' });
        expect(geldItemWidth('bill', 1)).toBe(110);
        expect(geldItemWidth('cent-coin', 1.5)).toBe(111);
    });

    test('a piece with a caption shows its amount', () => {
        const { container } = render(<GeldItemWidget widget={{ id: 'g', kind: 'geld-item', x: 0, y: 0, w: 74, z: 1, props: { denom: 50, showLabel: true } }} />);
        expect(container.querySelector('[data-geld-label]')!.textContent).toBe('€0,50');
    });

    test('a saved board keeps the piece settings', () => {
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ id: 'g', kind: 'geld-item', x: 1, y: 2, w: 148, z: 1, props: { denom: 200, type: 'euro-coin', geldStyle: 'realistisch', showLabel: true } }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        const w = parseBoardFile(json)!.pages[0].widgets[0];
        expect(geldItemProps(w)).toEqual({ denom: 200, type: 'euro-coin', style: 'realistisch', showLabel: true });
        expect(w.w).toBe(148);
    });
});

describe('geld dock', () => {
    test('the ⚙ panel picks denominations, style, caption, size; the dock follows and remembers', () => {
        const { container } = mountDock();
        act(() => { fireEvent.click(screen.getByLabelText('Palet-instellingen')); });
        const panel = within(container.querySelector<HTMLElement>('[data-geld-palet-settings]')!);
        act(() => { fireEvent.click(panel.getByText('Biljetten')); });
        expect(container.querySelectorAll('[data-geld-palet-item]')).toHaveLength(7);
        act(() => { fireEvent.click(panel.getByLabelText('€500 in het palet')); });
        expect(container.querySelectorAll('[data-geld-palet-item]')).toHaveLength(6);
        act(() => { fireEvent.click(panel.getByText('Echt')); });
        act(() => { fireEvent.click(panel.getByLabelText('Bedrag onder elk stuk')); });
        act(() => { fireEvent.change(panel.getByLabelText('Grootte van nieuwe stukken'), { target: { value: '1.5' } }); });
        expect(loadGeldPalet()).toMatchObject({ denoms: [20000, 10000, 5000, 2000, 1000, 500], style: 'realistisch', showLabels: true, size: 1.5 });

        drop(container, 0, 300, 200);
        expect(coins()).toHaveLength(1);
        expect(coins()[0]).toMatchObject({ w: 165, props: { denom: 20000, type: 'bill', geldStyle: 'realistisch', showLabel: true, showHeader: false } });

        act(() => { fireEvent.click(panel.getByText('Palet terugzetten')); });
        expect(loadGeldPalet()).toEqual(DEFAULT_GELD_PALET);
        expect(container.querySelectorAll('[data-geld-palet-item]')).toHaveLength(GELD_CATALOGUE.length);
    });

    test('snap drops on the grid; "tel samen" sums the page; the page can be cleared', () => {
        localStorage.setItem(GELD_PALET_KEY, JSON.stringify({ snap: true, showSum: true }));
        const { container } = mountDock();
        drop(container, 7, 205, 133);   // €2
        drop(container, 9, 290, 61);    // 50c
        const placed = coins();
        expect(placed.map(c => [c.x % 40, c.y % 40])).toEqual([[0, 0], [0, 0]]);
        expect(container.querySelector('[data-geld-sum]')!.textContent).toContain('€2,50');
        act(() => { fireEvent.click(screen.getByLabelText('Palet-instellingen')); });
        act(() => { fireEvent.click(screen.getByText('Al het geld van deze pagina wissen')); });
        expect(coins()).toHaveLength(0);
        expect(container.querySelector('[data-geld-sum]')!.textContent).toContain('€0');
    });
});
