// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { getallenlijnProps, numberLineTicks, tickLabel } from '../board/mathTools/getallenlijn';
import GetallenlijnWidget from '../board/components/widgets/GetallenlijnWidget';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import type { BoardWidget } from '../board/boardTypes';

// The number line's settings model: every prop defaults (old boards look as before), the
// taps write markers / jumps / blanked labels into the store, and a junk file reads as defaults.
const w = (props?: Record<string, unknown>): BoardWidget => ({ id: 'gl', kind: 'getallenlijn', x: 0, y: 0, w: 640, z: 1, props });

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

function mount(props: Record<string, unknown>) {
    const id = useBoardStore.getState().addWidget({ kind: 'getallenlijn', x: 0, y: 0, w: 640, props });
    const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
    const utils = render(<GetallenlijnWidget widget={live()} />);
    const rerender = () => utils.rerender(<GetallenlijnWidget widget={live()} />);
    const tap = (v: number) => { act(() => { fireEvent.click(utils.container.querySelector(`[data-tick="${v}"]`)!); }); rerender(); };
    return { ...utils, live, tap };
}

describe('getallenlijn model', () => {
    test('an old board (min/max/ticks/labels only) keeps its ticks and look', () => {
        const g = getallenlijnProps(w());
        expect(g).toMatchObject({ min: 0, max: 100, step: 10, labels: 'alles', arrows: 'rechts', orientation: 'horizontaal', numberType: 'natuurlijk', tapMode: 'geen', labelEvery: 1 });
        expect(numberLineTicks(g)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
        expect(numberLineTicks(getallenlijnProps(w({ min: 0, max: 20, ticks: 5 })))).toEqual([0, 5, 10, 15, 20]);
        // Pre-settings number inputs could store strings.
        expect(getallenlijnProps(w({ min: '5', max: '15' }))).toMatchObject({ min: 5, max: 15 });
    });

    test('junk falls back to defaults; min/max swap; ticks are capped', () => {
        const g = getallenlijnProps(w({ min: 'x', max: null, step: -3, arrows: 'raar', orientation: 7, numberType: {}, markers: 'nee', jumps: [{ from: 1 }], hidden: ['a', 3], inkColor: 'red' }));
        expect(g).toMatchObject({ min: 0, max: 100, arrows: 'rechts', orientation: 'horizontaal', numberType: 'natuurlijk', markers: [], jumps: [], hidden: [3], inkColor: '#dc2626' });
        expect(getallenlijnProps(w({ min: 50, max: 10 }))).toMatchObject({ min: 10, max: 50 });
        expect(numberLineTicks(getallenlijnProps(w({ min: 0, max: 1000, step: 1 }))).length).toBeLessThanOrEqual(101);
    });

    test('decimal and fraction ticks', () => {
        const dec = getallenlijnProps(w({ min: 0, max: 1, step: 0.1, numberType: 'kommagetal' }));
        expect(numberLineTicks(dec)).toHaveLength(11);
        expect(tickLabel(0.3, dec)).toBe('0,3');
        expect(tickLabel(1, dec)).toBe('1,0');
        const br = getallenlijnProps(w({ min: 0, max: 2, numberType: 'breuk', fractionDen: 4 }));
        expect(numberLineTicks(br)).toHaveLength(9);
        expect(tickLabel(0.75, br)).toEqual(['3', '4']);
        expect(tickLabel(1, br)).toBe('1');
        expect(tickLabel(-5, getallenlijnProps(w({ min: -10, max: 10 })))).toBe('−5');
    });
});

describe('getallenlijn taps', () => {
    test('markeren toggles a coloured marker on the tapped tick', () => {
        const { tap, live, container } = mount({ tapMode: 'markeren', inkColor: '#2563eb' });
        tap(30);
        expect(getallenlijnProps(live()).markers).toEqual([{ value: 30, color: '#2563eb' }]);
        expect(container.querySelectorAll('[data-marker]')).toHaveLength(1);
        tap(30);
        expect(getallenlijnProps(live()).markers).toEqual([]);
    });

    test('springen chains jumps: every landing is the next start', () => {
        const { tap, live, container } = mount({ tapMode: 'springen' });
        tap(10); tap(30); tap(60);
        expect(getallenlijnProps(live()).jumps.map(j => [j.from, j.to])).toEqual([[10, 30], [30, 60]]);
        expect(container.textContent).toContain('+20');
        expect(container.textContent).toContain('+30');
    });

    test('verbergen blanks a label (invul-vakje) and brings it back', () => {
        const { tap, live, container } = mount({ tapMode: 'verbergen' });
        tap(40);
        expect(getallenlijnProps(live()).hidden).toEqual([40]);
        expect(container.querySelectorAll('[data-hidden-label]')).toHaveLength(1);
        tap(40);
        expect(getallenlijnProps(live()).hidden).toEqual([]);
    });

    test('no tap mode = no hit targets (pen-only line, as before)', () => {
        const { container } = mount({});
        expect(container.querySelectorAll('[data-tick]')).toHaveLength(0);
    });
});

describe('getallenlijn persistence', () => {
    test('a saved board round-trips its settings; junk props read as defaults', () => {
        const props = { min: -10, max: 10, step: 2, tapMode: 'markeren', markers: [{ value: 4, color: '#16a34a' }], jumps: [{ from: 0, to: 4, color: '#2563eb' }], arrows: 'beide', orientation: 'verticaal' };
        const file = (p: unknown) => JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets: [{ ...w(), props: p }], strokes: [], background: { pattern: 'blanco', dark: false } }] });
        const back = parseBoardFile(file(props))!.pages[0].widgets[0];
        expect(getallenlijnProps(back)).toMatchObject({ min: -10, max: 10, step: 2, arrows: 'beide', orientation: 'verticaal', markers: [{ value: 4, color: '#16a34a' }] });
        const junk = parseBoardFile(file({ markers: [{ value: 'x' }], jumps: 'no', step: 'nope', orientation: 'diagonaal' }))!.pages[0].widgets[0];
        expect(getallenlijnProps(junk)).toMatchObject({ markers: [], jumps: [], step: 10, orientation: 'horizontaal' });
    });
});

// Re-renders with the live widget, as WhiteboardView does.
function Inspector({ id }: { id: string }) {
    const x = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(v => v.id === id));
    return x ? <WidgetInspector widget={x} /> : null;
}

describe('getallenlijn panel', () => {
    test('registered, self-scaled, and every section writes the store', () => {
        expect(WIDGET_SETTINGS.getallenlijn).toBeTruthy();
        expect(SELF_SCALED_FONT.has('getallenlijn')).toBe(true);
        const id = useBoardStore.getState().addWidget({ kind: 'getallenlijn', x: 0, y: 0, w: 640 });
        const live = () => useBoardStore.getState().pages[0].widgets.find(x => x.id === id)!;
        render(<Inspector id={id} />);
        const section = (name: string) => within(screen.getByRole('region', { name }));

        act(() => { fireEvent.change(screen.getByLabelText('Van'), { target: { value: '-20' } }); });
        act(() => { fireEvent.change(screen.getByLabelText('Tot'), { target: { value: '20' } }); });
        act(() => { fireEvent.change(screen.getByLabelText('Stap tussen streepjes'), { target: { value: '5' } }); });
        expect(numberLineTicks(getallenlijnProps(live()))).toEqual([-20, -15, -10, -5, 0, 5, 10, 15, 20]);

        act(() => { fireEvent.click(section('Bereik').getByText('Breuk')); });
        expect(getallenlijnProps(live()).numberType).toBe('breuk');
        act(() => { fireEvent.click(section('Bereik').getByText('Natuurlijk')); });
        act(() => { fireEvent.click(section('Lijn').getByText('Beide')); });
        act(() => { fireEvent.click(section('Lijn').getByText('Verticaal')); });
        act(() => { fireEvent.click(section('Tikken op de lijn').getByText('Sprong')); });
        expect(getallenlijnProps(live())).toMatchObject({ arrows: 'beide', orientation: 'verticaal', tapMode: 'springen' });

        act(() => { fireEvent.change(screen.getByLabelText('Vanaf'), { target: { value: '0' } }); });
        act(() => { fireEvent.change(screen.getByLabelText('Sprong van (+/−)'), { target: { value: '5' } }); });
        act(() => { fireEvent.click(screen.getByText('Sprongen tekenen')); });
        expect(getallenlijnProps(live()).jumps.map(j => [j.from, j.to])).toEqual([[0, 5], [5, 10], [10, 15]]);
        act(() => { fireEvent.click(screen.getByText('Wis sprongen (3)')); });
        expect(getallenlijnProps(live()).jumps).toEqual([]);

        act(() => { fireEvent.click(screen.getByText('Enkel uiteinden')); });
        expect(getallenlijnProps(live()).hidden).toHaveLength(7);
        act(() => { fireEvent.click(screen.getByText('Toon alle (7)')); });
        expect(getallenlijnProps(live()).hidden).toEqual([]);
    });
});
