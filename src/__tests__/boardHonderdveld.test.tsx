// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { honderdveldProps, highlightColor } from '../board/mathTools/honderdveld';
import HonderdveldWidget from '../board/components/widgets/HonderdveldWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import type { BoardWidget } from '../board/boardTypes';

const w = (props?: Record<string, unknown>): BoardWidget => ({ id: 'hv', kind: 'honderdveld', x: 0, y: 0, w: 470, z: 1, props });

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

function mount(props: Record<string, unknown>) {
    const id = useBoardStore.getState().addWidget({ kind: 'honderdveld', x: 0, y: 0, w: 470, props });
    const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
    const utils = render(<HonderdveldWidget widget={live()} />);
    const rerender = () => utils.rerender(<HonderdveldWidget widget={live()} />);
    const tap = (n: number) => { act(() => { fireEvent.click(utils.container.querySelector(`[data-cell="${n}"]`)!); }); rerender(); };
    return { ...utils, live, tap };
}

describe('honderdveld model', () => {
    test('old boards: start + palette-index marks read as colours, 10 × 10', () => {
        const p = honderdveldProps(w({ start: 0, marks: { 5: 1, 7: 4, 9: 9 } }));
        expect(p).toMatchObject({ start: 0, count: 100, cols: 10, paint: 'cyclus', tapMode: 'kleuren', hidden: [], highlights: [] });
        expect(p.marks).toEqual({ 5: '#fde047', 7: '#fca5a5' });
    });

    test('junk reads as defaults; ranges are clamped', () => {
        expect(honderdveldProps(w({ start: 'x', count: 9999, cols: 0, paint: 'paars', tapMode: 'gum', highlights: 'even', marks: { a: '#fff' } })))
            .toMatchObject({ start: 1, count: 400, cols: 2, paint: 'cyclus', tapMode: 'kleuren', highlights: [], marks: {} });
    });

    test('highlight sets layer in list order', () => {
        const sets = [{ rule: 'even' as const, n: 0, color: '#aaaaaa' }, { rule: 'veelvoud' as const, n: 5, color: '#bbbbbb' }];
        expect(highlightColor(4, sets)).toBe('#aaaaaa');
        expect(highlightColor(10, sets)).toBe('#bbbbbb');
        expect(highlightColor(7, sets)).toBeNull();
        expect(highlightColor(23, [{ rule: 'eindigt', n: 3, color: '#cccccc' }])).toBe('#cccccc');
        expect(highlightColor(-3, [{ rule: 'oneven', n: 0, color: '#dddddd' }])).toBe('#dddddd');
    });
});

describe('honderdveld taps', () => {
    test('cyclus steps yellow → green → … → clear (the original behaviour)', () => {
        const { tap, live } = mount({});
        tap(12);
        expect(honderdveldProps(live()).marks).toEqual({ 12: '#fde047' });
        tap(12);
        expect(honderdveldProps(live()).marks).toEqual({ 12: '#86efac' });
        tap(12); tap(12); tap(12);
        expect(honderdveldProps(live()).marks).toEqual({});
    });

    test('a picked paint colour toggles on/off', () => {
        const { tap, live } = mount({ paint: '#d8b4fe' });
        tap(40);
        expect(honderdveldProps(live()).marks).toEqual({ 40: '#d8b4fe' });
        tap(40);
        expect(honderdveldProps(live()).marks).toEqual({});
    });

    test('verbergen blanks the number; range and row width follow the settings', () => {
        const { tap, live, container } = mount({ tapMode: 'verbergen', start: 1, count: 120, cols: 12 });
        expect(container.querySelectorAll('[data-cell]')).toHaveLength(120);
        tap(77);
        expect(honderdveldProps(live()).hidden).toEqual([77]);
        expect(container.querySelector('[data-cell="77"]')!.textContent).toBe('');
    });
});

describe('honderdveld persistence', () => {
    test('settings round-trip through the board file', () => {
        const props = { start: 0, count: 120, cols: 5, highlights: [{ rule: 'veelvoud', n: 3, color: '#86efac' }], hidden: [4], paint: '#93c5fd' };
        const json = JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ ...w(), props }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        expect(honderdveldProps(parseBoardFile(json)!.pages[0].widgets[0])).toMatchObject(props);
    });
});

function Inspector({ id }: { id: string }) {
    const x = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(v => v.id === id));
    return x ? <WidgetInspector widget={x} /> : null;
}

describe('honderdveld panel', () => {
    test('range, row width, patterns, tap colour and invullen write the store', () => {
        expect(WIDGET_SETTINGS.honderdveld).toBeTruthy();
        const id = useBoardStore.getState().addWidget({ kind: 'honderdveld', x: 0, y: 0, w: 470, props: { marks: { 3: 1 } } });
        const live = () => honderdveldProps(useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!);
        render(<Inspector id={id} />);
        const section = (name: string) => within(screen.getByRole('region', { name }));

        act(() => { fireEvent.click(section('Bereik').getByText('1 – 120')); });
        expect(live()).toMatchObject({ start: 1, count: 120 });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Getallen' })).getByText('Eigen')); });
        act(() => { fireEvent.change(screen.getByLabelText('Startgetal'), { target: { value: '201' } }); });
        expect(live()).toMatchObject({ start: 201, count: 120 });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Vakjes per rij' })).getByText('5')); });
        expect(live().cols).toBe(5);

        act(() => { fireEvent.click(screen.getByText('Patroon toevoegen')); });
        expect(live().highlights).toEqual([{ rule: 'veelvoud', n: 5, color: '#fde047' }]);
        act(() => { fireEvent.change(screen.getByLabelText('Veelvoud van'), { target: { value: '3' } }); });
        expect(live().highlights[0].n).toBe(3);

        const tapColours = within(screen.getByRole('group', { name: 'Tikkleur' }));
        act(() => { fireEvent.click(tapColours.getByLabelText('Kleur #d8b4fe')); });
        expect(live().paint).toBe('#d8b4fe');
        act(() => { fireEvent.click(screen.getByText('Wis getikte kleuren (1)')); });
        expect(live().marks).toEqual({});

        act(() => { fireEvent.click(screen.getByText('Verberg 10 willekeurig')); });
        expect(live().hidden).toHaveLength(10);
        act(() => { fireEvent.click(screen.getByText('Toon alles (10)')); });
        expect(live().hidden).toEqual([]);
    });
});
