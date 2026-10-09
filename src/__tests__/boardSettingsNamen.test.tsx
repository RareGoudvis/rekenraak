// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import NamenWidget from '../board/components/widgets/NamenWidget';
import { namenProps, pickNames, saveClassList } from '../board/settings/namenModel';
import { NAMES_KEY } from '../board/widgetSizing';
import { BOARD_DEFAULTS_KEY } from '../board/settings/widgetDefaults';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Namenkiezer ⚙: class list or own list editor, sort, one/several names or a wheel,
// skip picked names, show them, animation, restart.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="namen"><NamenWidget widget={w} /></div><WidgetInspector widget={w} /></> : null;
}

beforeEach(() => saveClassList(['Ana', 'Bert', 'Cas']));
afterEach(() => { cleanup(); localStorage.clear(); saveClassList([]); st().resetBoard(); });

describe('namen model', () => {
    test('an old board reads as before: class list, one name, no repeats, animated', () => {
        const w: BoardWidget = { id: 'w', kind: 'namen', x: 0, y: 0, w: 340, z: 1 };
        expect(namenProps(w)).toEqual({ source: 'klas', names: [], mode: 'een', count: 1, noRepeat: true, showPicked: false, animate: true, picked: [], current: [] });
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'namen', x: 0, y: 0, w: 340, z: 1, props: { source: 'x', names: 'Ana', mode: 'wiel', count: 9.5, noRepeat: 0, animate: null, picked: [1, 'Ana'], current: 'Bert' } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(namenProps(f.pages[0].widgets[0])).toEqual({ source: 'klas', names: [], mode: 'een', count: 1, noRepeat: true, showPicked: false, animate: true, picked: ['Ana'], current: [] });
    });

    test('picks skip names that had a turn, then the round starts over', () => {
        const all = ['A', 'B', 'C'];
        let picked: string[] = [];
        const seen: string[] = [];
        for (let i = 0; i < 3; i++) { const r = pickNames(all, picked, 1, true); seen.push(...r.chosen); picked = r.picked; }
        expect([...seen].sort()).toEqual(all);
        const next = pickNames(all, picked, 2, true);
        expect(next.chosen).toHaveLength(2);
        expect(next.picked).toEqual(next.chosen);
        expect(pickNames(all, ['A'], 2, false).picked).toEqual(['A']);
        expect(pickNames([], [], 1, true).chosen).toEqual([]);
    });
});

describe('namen settings', () => {
    test('editing the class list reaches the widget at once; sort; own list', () => {
        const id = st().addWidget({ kind: 'namen', x: 0, y: 0, w: 340, props: { mode: 'rad', animate: false } });
        const { container } = render(<Board id={id} />);
        expect(container.querySelectorAll('[data-namen-wheel] g path')).toHaveLength(3);
        act(() => { fireEvent.click(screen.getByText('Naam toevoegen')); });
        act(() => { fireEvent.change(screen.getByLabelText('Naam 4'), { target: { value: 'Abel' } }); });
        expect(localStorage.getItem(NAMES_KEY)).toBe('Ana\nBert\nCas\nAbel');
        expect(container.querySelectorAll('[data-namen-wheel] g path')).toHaveLength(4);
        act(() => { fireEvent.click(screen.getByText('Sorteer A-Z')); });
        expect(localStorage.getItem(NAMES_KEY)).toBe('Abel\nAna\nBert\nCas');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Eigen lijst' })); });
        act(() => { fireEvent.click(screen.getByText('Plak een klaslijst')); });
        act(() => { fireEvent.change(screen.getByLabelText('Plak een klaslijst'), { target: { value: 'Zoë\n\nYara ' } }); });
        act(() => { fireEvent.click(screen.getByText('Lijst overnemen')); });
        expect(namenProps(live(id))).toMatchObject({ source: 'eigen', names: ['Zoë', 'Yara'] });
        expect(container.querySelectorAll('[data-namen-wheel] g path')).toHaveLength(2);
    });

    test('several names per pick, picked names shown and kept across a save/load, restart', () => {
        const id = st().addWidget({ kind: 'namen', x: 0, y: 0, w: 340 });
        render(<Board id={id} />);
        act(() => { fireEvent.change(screen.getByLabelText('Namen per keer'), { target: { value: '2' } }); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Animatie' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Gekozen namen tonen' })); });
        const w = screen.getByTestId('namen');
        act(() => { fireEvent.click(within(w).getByText('Kies 2 namen')); });
        const p = namenProps(live(id));
        expect(p.current).toHaveLength(2);
        expect(p.picked).toEqual(p.current);
        expect(within(w).getByLabelText('Al gekozen').textContent).toBe(p.picked.join(''));
        saveBoardAutosave(st().pages, 0);
        expect(namenProps(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(p);
        // Picked names stay out of a saved standaard.
        act(() => { fireEvent.click(screen.getByText('Bewaar als mijn standaard')); });
        expect(JSON.parse(localStorage.getItem(BOARD_DEFAULTS_KEY)!).namen).toEqual({ count: 2, animate: false, showPicked: true });
        act(() => { fireEvent.click(within(w).getByText('Opnieuw')); });
        expect(namenProps(live(id))).toMatchObject({ picked: [], current: [] });
    });
});
