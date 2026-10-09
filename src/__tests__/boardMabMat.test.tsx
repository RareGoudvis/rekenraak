// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { mabmatProps, wisselUp, wisselDown, expandedForm, MAB_DEFAULT_COLORS } from '../board/mathTools/mabmat';
import MabMatWidget from '../board/components/widgets/MabMatWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import { saveWidgetDefaults, loadWidgetDefaults } from '../board/settings/widgetDefaults';
import type { BoardWidget } from '../board/boardTypes';

const w = (props?: Record<string, unknown>): BoardWidget => ({ id: 'mm', kind: 'mabmat', x: 0, y: 0, w: 560, z: 1, props });

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

function mount(props: Record<string, unknown>) {
    const id = useBoardStore.getState().addWidget({ kind: 'mabmat', x: 0, y: 0, w: 560, props });
    const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
    const utils = render(<MabMatWidget widget={live()} />);
    const rerender = () => utils.rerender(<MabMatWidget widget={live()} />);
    const click = (label: string) => { act(() => { fireEvent.click(utils.getByLabelText(label)); }); rerender(); };
    return { ...utils, live, click, rerender };
}

describe('mabmat model', () => {
    test('old boards: counts, style and total read as before; new props default off', () => {
        expect(mabmatProps(w({ d: 1, h: 2, t: 3, e: 4, mabStyle: 'symbolic', showTotal: true }))).toMatchObject({
            counts: { d: 1, h: 2, t: 3, e: 4 }, mabStyle: 'symbolic', showTotal: true,
            places: ['d', 'h', 't', 'e'], colorScheme: 'standaard', showButtons: true, showWissel: false, tapAdds: false, autoWissel: false, expanded: 'geen', size: 1,
        });
    });

    test('junk reads as defaults', () => {
        const p = mabmatProps(w({ d: -4, e: 99, places: ['x'], mabStyle: 'lego', placeColors: { e: 'geel' }, size: 9, expanded: 1 }));
        expect(p).toMatchObject({ counts: { d: 0, h: 0, t: 0, e: 20 }, places: ['d', 'h', 't', 'e'], mabStyle: 'mab-color', size: 2, expanded: 'geen' });
        expect(p.placeColors.e).toBe(MAB_DEFAULT_COLORS.e);
    });

    test('wissel: 10 → 1 up, 1 → 10 down, refused at the edges', () => {
        expect(wisselUp({ d: 0, h: 0, t: 0, e: 12 }, 'e')).toEqual({ d: 0, h: 0, t: 1, e: 2 });
        expect(wisselUp({ d: 0, h: 0, t: 0, e: 9 }, 'e')).toBeNull();
        expect(wisselUp({ d: 10, h: 0, t: 0, e: 0 }, 'd')).toBeNull();
        expect(wisselDown({ d: 0, h: 0, t: 2, e: 3 }, 't')).toEqual({ d: 0, h: 0, t: 1, e: 13 });
        expect(wisselDown({ d: 0, h: 0, t: 1, e: 15 }, 't')).toBeNull();
        expect(expandedForm({ d: 1, h: 0, t: 3, e: 4 }, 'plaatsen')).toBe('1 D + 3 T + 4 E');
        expect(expandedForm({ d: 1, h: 0, t: 3, e: 4 }, 'waarden')).toBe('1 000 + 30 + 4');
    });
});

describe('mabmat widget', () => {
    test('+ adds, the inwissel button trades ten units for a ten', () => {
        const { click, live } = mount({ e: 9, showWissel: true });
        click('E erbij');
        expect(mabmatProps(live()).counts.e).toBe(10);
        click('10 E inwisselen');
        expect(mabmatProps(live()).counts).toMatchObject({ t: 1, e: 0 });
        click('1 T ontbinden');
        expect(mabmatProps(live()).counts).toMatchObject({ t: 0, e: 10 });
    });

    test('autoWissel trades on the tenth block; tapAdds makes the column a + button', () => {
        const { click, live, container, rerender } = mount({ e: 9, autoWissel: true, tapAdds: true });
        click('E erbij');
        expect(mabmatProps(live()).counts).toMatchObject({ t: 1, e: 0 });
        act(() => { fireEvent.click(container.querySelector('[data-mab-column="h"]')!); });
        rerender();
        expect(mabmatProps(live()).counts.h).toBe(1);
    });

    test('places subset, expanded form and no buttons', () => {
        const { container, queryByLabelText } = mount({ places: ['t', 'e'], t: 2, e: 5, expanded: 'waarden', showButtons: false });
        expect(container.querySelectorAll('[data-mab-place]')).toHaveLength(2);
        expect(container.querySelector('[data-mab-expanded]')!.textContent).toBe('20 + 5');
        expect(queryByLabelText('E erbij')).toBeNull();
    });
});

describe('mabmat persistence', () => {
    test('settings round-trip through the board file', () => {
        const props = { places: ['h', 't', 'e'], colorScheme: 'eigen', placeColors: { h: '#111111' }, tapAdds: true, autoWissel: true, expanded: 'plaatsen', size: 1.4, h: 3 };
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ ...w(), props }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        const p = mabmatProps(parseBoardFile(json)!.pages[0].widgets[0]);
        expect(p).toMatchObject({ places: ['h', 't', 'e'], colorScheme: 'eigen', tapAdds: true, autoWissel: true, expanded: 'plaatsen', size: 1.4 });
        expect(p.placeColors.h).toBe('#111111');
        expect(p.counts.h).toBe(3);
    });
});

function Inspector({ id }: { id: string }) {
    const x = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(v => v.id === id));
    return x ? <WidgetInspector widget={x} /> : null;
}

describe('mabmat panel', () => {
    test('places, style, colours, controls, display and "leg het getal" write the store', () => {
        expect(WIDGET_SETTINGS.mabmat).toBeTruthy();
        expect(SELF_SCALED_FONT.has('mabmat')).toBe(true);
        const id = useBoardStore.getState().addWidget({ kind: 'mabmat', x: 0, y: 0, w: 560 });
        const live = () => mabmatProps(useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!);
        render(<Inspector id={id} />);
        const section = (name: string) => within(screen.getByRole('region', { name }));

        act(() => { fireEvent.click(screen.getByLabelText('Kolom duizendtallen')); });
        expect(live().places).toEqual(['h', 't', 'e']);
        act(() => { fireEvent.click(section('Blokjes').getByText('Stippen')); });
        act(() => { fireEvent.click(section('Blokjes').getByText('Eigen kleur per plaats')); });
        expect(live()).toMatchObject({ mabStyle: 'symbolic', colorScheme: 'eigen' });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur eenheden' })).getByLabelText('Kleur #d8b4fe')); });
        expect(live().placeColors.e).toBe('#d8b4fe');

        act(() => { fireEvent.click(screen.getByLabelText('Tik op een kolom = blokje erbij')); });
        act(() => { fireEvent.click(screen.getByLabelText('Automatisch inwisselen bij 10')); });
        act(() => { fireEvent.click(screen.getByLabelText('Knoppen inwisselen / ontbinden')); });
        act(() => { fireEvent.click(section('Tonen').getByText('100 + 20')); });
        expect(live()).toMatchObject({ tapAdds: true, autoWissel: true, showWissel: true, expanded: 'waarden' });

        act(() => { fireEvent.change(screen.getByLabelText('Leg het getal'), { target: { value: '2304' } }); });
        expect(live().counts).toEqual({ d: 2, h: 3, t: 0, e: 4 });
        act(() => { fireEvent.click(screen.getByText('Alles wissen')); });
        expect(live().counts).toEqual({ d: 0, h: 0, t: 0, e: 0 });
    });

    test('an old board shows no exchange buttons (opt-in), as before', () => {
        const { queryByLabelText } = mount({ h: 2, t: 13, e: 4 });
        expect(queryByLabelText('10 T inwisselen')).toBeNull();
        expect(queryByLabelText('1 H ontbinden')).toBeNull();
    });

    test('the laid blocks are per-card state: never in a saved standaard', () => {
        saveWidgetDefaults('mabmat', { mabStyle: 'symbolic', d: 1, h: 2, t: 3, e: 4 });
        expect(loadWidgetDefaults('mabmat')).toEqual({ mabStyle: 'symbolic' });
        localStorage.clear();
    });
});
