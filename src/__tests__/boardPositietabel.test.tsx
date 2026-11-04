// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { positietabelProps, digitAt, SALMON, DEFAULT_GROUP_COLORS } from '../board/mathTools/positietabel';
import PositietabelWidget from '../board/components/widgets/PositietabelWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import { saveWidgetDefaults, loadWidgetDefaults } from '../board/settings/widgetDefaults';
import type { BoardWidget } from '../board/boardTypes';

const w = (props?: Record<string, unknown>): BoardWidget => ({ id: 'pt', kind: 'positietabel', x: 0, y: 0, w: 480, z: 1, props });

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

function mount(props: Record<string, unknown>) {
    const id = useBoardStore.getState().addWidget({ kind: 'positietabel', x: 0, y: 0, w: 480, props });
    const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
    const utils = render(<PositietabelWidget widget={live()} />);
    const rerender = () => utils.rerender(<PositietabelWidget widget={live()} />);
    return { ...utils, live, rerender };
}

describe('positietabel model', () => {
    test('old boards keep columns + rows; new props default to the old look', () => {
        expect(positietabelProps(w())).toMatchObject({ columns: ['H', 'T', 'E'], rows: 3, header: 'afkorting', colorMode: 'zalm', number: '', editable: false, showGroups: false, digitSize: 20 });
        expect(positietabelProps(w({ columns: ['D', 'X', 't'], rows: 0 }))).toMatchObject({ columns: ['D', 't'], rows: 1 });
        expect(positietabelProps(w({ columns: ['X'], rows: 50 }))).toMatchObject({ columns: ['H', 'T', 'E'], rows: 8 });
        // Columns always come out in place order, whatever order they were toggled in.
        expect(positietabelProps(w({ columns: ['E', 'Mrd', 'd', 'M'] })).columns).toEqual(['Mrd', 'M', 'E', 'd']);
    });

    test('junk reads as defaults', () => {
        const p = positietabelProps(w({ header: 'x', colorMode: 1, number: '12a', cells: { '0:E': '5', 'bad': '1', '1:T': 7 }, groupColors: { eenheden: 'geel' }, digitSize: 999 }));
        expect(p).toMatchObject({ header: 'afkorting', colorMode: 'zalm', number: '', cells: { '0:E': '5' }, digitSize: 48 });
        expect(p.groupColors.eenheden).toBe(DEFAULT_GROUP_COLORS.eenheden);
    });

    test('a pre-filled number lands in its place columns', () => {
        expect(digitAt('3047', 3)).toBe('3');
        expect(digitAt('3047', 2)).toBe('0');
        expect(digitAt('3047', 4)).toBe('');
        expect(digitAt('12,5', -1)).toBe('5');
        expect(digitAt('12,5', -2)).toBe('');
        expect(positietabelProps(w({ number: '12.75' })).number).toBe('12,75');
    });
});

describe('positietabel widget', () => {
    test('default table: salmon header, comma before t only with decimals', () => {
        const { container } = mount({ columns: ['H', 'T', 'E', 't', 'h'] });
        expect(container.textContent).toContain(',');
        expect(container.innerHTML).toContain('rgb(244, 203, 184)');   // SALMON
        expect(SALMON).toBe('#f4cbb8');
    });

    test('pre-filled number in row 1; editable cells write one digit to the store', () => {
        const { container, live, getByLabelText, rerender } = mount({ columns: ['D', 'H', 'T', 'E'], number: '2504', editable: true });
        const inputs = container.querySelectorAll('input');
        expect(Array.from(inputs).slice(0, 4).map(i => i.value)).toEqual(['2', '5', '0', '4']);
        act(() => { fireEvent.change(getByLabelText('Rij 2 tiental'), { target: { value: '7' } }); });
        expect(positietabelProps(live()).cells).toEqual({ '1:T': '7' });
        rerender();
        act(() => { fireEvent.change(getByLabelText('Rij 2 tiental'), { target: { value: '' } }); });
        expect(positietabelProps(live()).cells).toEqual({});
    });

    test('group row and names header', () => {
        const { container } = mount({ columns: ['TD', 'D', 'H', 'T', 'E'], showGroups: true, header: 'naam', colorMode: 'groepen' });
        expect(container.querySelectorAll('[data-place-group]')).toHaveLength(2);
        // Names carry a soft hyphen after the prefix (wraps in narrow columns).
        expect(container.textContent!.replace(/­/g, '')).toContain('tienduizend');
    });
});

describe('positietabel persistence', () => {
    test('settings round-trip through the board file', () => {
        const props = { columns: ['M', 'D', 'E'], header: 'beide', colorMode: 'groepen', groupColors: { miljoenen: '#123456' }, number: '1000001', editable: true, cells: { '2:E': '9' } };
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ ...w(), props }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        const p = positietabelProps(parseBoardFile(json)!.pages[0].widgets[0]);
        expect(p).toMatchObject({ columns: ['M', 'D', 'E'], header: 'beide', colorMode: 'groepen', number: '1000001', editable: true, cells: { '2:E': '9' } });
        expect(p.groupColors.miljoenen).toBe('#123456');
    });
});

function Inspector({ id }: { id: string }) {
    const x = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(v => v.id === id));
    return x ? <WidgetInspector widget={x} /> : null;
}

describe('positietabel panel', () => {
    test('places, rows, header, colours, number and editable cells write the store', () => {
        expect(WIDGET_SETTINGS.positietabel).toBeTruthy();
        const id = useBoardStore.getState().addWidget({ kind: 'positietabel', x: 0, y: 0, w: 480 });
        const live = () => positietabelProps(useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!);
        render(<Inspector id={id} />);
        const section = (name: string) => within(screen.getByRole('region', { name }));

        act(() => { fireEvent.click(screen.getByLabelText('Kolom duizendtal')); });
        expect(live().columns).toEqual(['D', 'H', 'T', 'E']);
        act(() => { fireEvent.click(section('Plaatsen').getByText('kommagetal')); });
        expect(live().columns).toEqual(['T', 'E', 't', 'h', 'd']);
        act(() => { fireEvent.click(section('Plaatsen').getByText('tot Mrd')); });
        expect(live().columns).toHaveLength(10);

        act(() => { fireEvent.click(section('Kop').getByText('Beide')); });
        act(() => { fireEvent.click(section('Kleur').getByText('Per klasse')); });
        expect(live()).toMatchObject({ header: 'beide', colorMode: 'groepen' });
        // One colour row per klasse that has a column on the table.
        expect(screen.getAllByRole('group', { name: /miljarden|miljoenen|duizenden|eenheden/ })).toHaveLength(4);

        act(() => { fireEvent.change(screen.getByLabelText('Getal in de eerste rij (leeg = lege tabel)'), { target: { value: '3 408' } }); });
        expect(live().number).toBe('3408');
        act(() => { fireEvent.click(section('Getal en cijfers').getByText('Heel groot')); });
        expect(live().digitSize).toBe(40);
    });

    test('typed cells are per-card state: never in a saved standaard', () => {
        expect(saveWidgetDefaults('positietabel', { columns: ['D', 'H', 'T', 'E'], cells: { '0:E': '4' }, editable: true })).toBe(true);
        expect(loadWidgetDefaults('positietabel')).toEqual({ columns: ['D', 'H', 'T', 'E'], editable: true });
        localStorage.clear();
    });
});
