// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { breukvizProps, coloredParts, wholesFor } from '../board/mathTools/breukviz';
import BreukvizWidget from '../board/components/widgets/BreukvizWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import type { BoardWidget } from '../board/boardTypes';

const w = (props?: Record<string, unknown>): BoardWidget => ({ id: 'bv', kind: 'breukviz', x: 0, y: 0, w: 300, z: 1, props });

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

function mount(props: Record<string, unknown>) {
    const id = useBoardStore.getState().addWidget({ kind: 'breukviz', x: 0, y: 0, w: 300, props });
    const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
    const utils = render(<BreukvizWidget widget={live()} />);
    const rerender = () => utils.rerender(<BreukvizWidget widget={live()} />);
    const parts = () => utils.container.querySelectorAll('[data-kiosk-key]');
    const tapPart = (i: number) => { act(() => { fireEvent.click(parts()[i]); }); rerender(); };
    return { ...utils, live, parts, tapPart };
}

describe('breukviz model', () => {
    test('old boards: top-level n/d become one fraction; "lijn" is the strip', () => {
        const p = breukvizProps(w({ n: 3, d: 8, shape: 'lijn' }));
        expect(p.shape).toBe('strook');
        expect(p.fractions).toEqual([{ n: 3, d: 8, parts: null, color: '#93c5fd' }]);
        expect(p).toMatchObject({ labels: true, labelStyle: 'breuk', equivalent: 1, mixed: false, stambreuk: false });
        expect(breukvizProps(w()).fractions[0]).toMatchObject({ n: 1, d: 4 });
        expect(breukvizProps(w({ d: 6, n: 5, stambreuk: true })).fractions[0].n).toBe(1);
    });

    test('junk reads as defaults; n stays within one whole unless mixed', () => {
        expect(breukvizProps(w({ shape: 'ster', fractions: 'x', labels: 'ja', equivalent: 99 }))).toMatchObject({ shape: 'cirkel', labels: true, equivalent: 6 });
        expect(breukvizProps(w({ d: 4, n: 9 })).fractions[0].n).toBe(4);
        const mixed = breukvizProps(w({ d: 4, n: 9, mixed: true })).fractions[0];
        expect(mixed.n).toBe(9);
        expect(wholesFor(mixed)).toBe(3);
        expect(breukvizProps(w({ fractions: [{ n: 1, d: 2, parts: [0, 0, 7, -1, 'a'] }] })).fractions[0]).toMatchObject({ n: 1, parts: [0] });
    });

    test('tapped parts win over n', () => {
        const f = breukvizProps(w({ fractions: [{ n: 1, d: 6, parts: [1, 3, 5] }] })).fractions[0];
        expect(f.n).toBe(3);
        expect(coloredParts(f)).toEqual([1, 3, 5]);
    });
});

describe('breukviz taps', () => {
    test('tapping a part colours it and the fraction follows', () => {
        const { tapPart, live, parts } = mount({ fractions: [{ n: 1, d: 4 }] });
        expect(parts()).toHaveLength(4);
        tapPart(2);
        expect(breukvizProps(live()).fractions[0]).toMatchObject({ n: 2, parts: [0, 2] });
        tapPart(0);
        expect(breukvizProps(live()).fractions[0]).toMatchObject({ n: 1, parts: [2] });
    });

    test('equivalent split draws d·k parts; a tap colours a whole original part', () => {
        const { tapPart, live, parts, container } = mount({ fractions: [{ n: 1, d: 3 }], equivalent: 2, shape: 'strook' });
        expect(parts()).toHaveLength(6);
        tapPart(5);
        expect(breukvizProps(live()).fractions[0]).toMatchObject({ n: 2, parts: [0, 2] });
        expect(container.textContent).toContain('=');
    });

    test('stambreuk parts are not tappable; several fractions sit side by side', () => {
        expect(mount({ stambreuk: true, d: 5 }).parts()).toHaveLength(0);
        cleanup();
        const { container } = mount({ fractions: [{ n: 1, d: 2 }, { n: 2, d: 4 }, { n: 3, d: 6 }], shape: 'rechthoek' });
        expect(container.querySelectorAll('[data-breuk-item]')).toHaveLength(3);
    });

    test('number line: a tap on a tick sets n', () => {
        const { container, live } = mount({ fractions: [{ n: 1, d: 4 }], shape: 'getallenlijn' });
        act(() => { fireEvent.click(container.querySelector('[data-breuk-tick="3"]')!); });
        expect(breukvizProps(live()).fractions[0]).toMatchObject({ n: 3, parts: null });
    });
});

describe('breukviz persistence', () => {
    test('settings round-trip through the board file', () => {
        const props = { shape: 'rechthoek', mixed: true, labelStyle: 'gemengd', equivalent: 3, fractions: [{ n: 5, d: 4, color: '#fca5a5' }, { n: 1, d: 2, parts: [1], color: '#86efac' }] };
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ ...w(), props }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        const p = breukvizProps(parseBoardFile(json)!.pages[0].widgets[0]);
        expect(p).toMatchObject({ shape: 'rechthoek', mixed: true, labelStyle: 'gemengd', equivalent: 3 });
        expect(p.fractions).toEqual([{ n: 5, d: 4, parts: null, color: '#fca5a5' }, { n: 1, d: 2, parts: [1], color: '#86efac' }]);
    });
});

function Inspector({ id }: { id: string }) {
    const x = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(v => v.id === id));
    return x ? <WidgetInspector widget={x} /> : null;
}

describe('breukviz panel', () => {
    test('shape, fractions list, mixed, equivalent and label write the store', () => {
        expect(WIDGET_SETTINGS.breukviz).toBeTruthy();
        expect(SELF_SCALED_FONT.has('breukviz')).toBe(true);
        const id = useBoardStore.getState().addWidget({ kind: 'breukviz', x: 0, y: 0, w: 300, props: { n: 1, d: 4 } });
        const live = () => breukvizProps(useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!);
        render(<Inspector id={id} />);
        const section = (name: string) => within(screen.getByRole('region', { name }));

        act(() => { fireEvent.click(section('Vorm').getByText('Rechthoek')); });
        expect(live().shape).toBe('rechthoek');

        act(() => { fireEvent.click(screen.getByText('Breuk toevoegen')); });
        expect(live().fractions).toHaveLength(2);
        expect(live().fractions[1]).toMatchObject({ n: 1, d: 2 });
        act(() => { fireEvent.change(screen.getAllByLabelText('Noemer (aantal delen)')[1], { target: { value: '8' } }); });
        act(() => { fireEvent.change(screen.getAllByLabelText('Teller (gekleurde delen)')[1], { target: { value: '3' } }); });
        expect(live().fractions[1]).toMatchObject({ n: 3, d: 8, parts: null });

        act(() => { fireEvent.click(screen.getByLabelText('Meer dan één geheel (gemengde getallen)')); });
        act(() => { fireEvent.change(screen.getAllByLabelText('Teller (gekleurde delen)')[0], { target: { value: '7' } }); });
        expect(live()).toMatchObject({ mixed: true });
        expect(live().fractions[0].n).toBe(7);

        act(() => { fireEvent.change(screen.getByLabelText('Elk deel opsplitsen in'), { target: { value: '2' } }); });
        act(() => { fireEvent.click(section('Label').getByText('Gemengd')); });
        expect(live()).toMatchObject({ equivalent: 2, labelStyle: 'gemengd' });

        act(() => { fireEvent.click(screen.getByText('Alle kleuren wissen')); });
        expect(live().fractions.map(f => f.n)).toEqual([0, 0]);
    });
});
