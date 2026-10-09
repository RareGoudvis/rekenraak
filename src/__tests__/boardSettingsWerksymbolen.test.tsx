// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import WerksymbolenWidget from '../board/components/widgets/WerksymbolenWidget';
import { werksymbolenModel, WERKSETS_KEY, loadWerksets } from '../board/settings/werksymbolenModel';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Werksymbolen ⚙: symbol list (icon, colour, name), active now, layout, size, labels, sets.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="ws"><WerksymbolenWidget widget={w} /></div><WidgetInspector widget={w} /></> : null;
}

afterEach(() => { cleanup(); localStorage.clear(); st().resetBoard(); });

describe('werksymbolen settings', () => {
    test('an old board reads as before: enabled built-ins, single active, vertical, icon only', () => {
        const w: BoardWidget = { id: 'w', kind: 'werksymbolen', x: 0, y: 0, w: 440, z: 1, props: { enabled: ['stil', 'samen'], active: 'samen', vertical: true, iconOnly: true } };
        const m = werksymbolenModel(w);
        expect(m.symbols.map(s => [s.key, s.label, s.icon, s.color])).toEqual([['stil', 'Stil werken', 'stil', null], ['samen', 'Samenwerken', 'samen', null]]);
        expect(m).toMatchObject({ active: ['samen'], multi: false, layout: 'kolom', columns: 3, size: 'normaal', showLabel: false, onlyActive: false });
        expect(werksymbolenModel({ ...w, props: {} })).toMatchObject({ active: ['stil'], layout: 'raster' });
        expect(werksymbolenModel({ ...w, props: {} }).symbols).toHaveLength(5);
        const { container } = render(<WerksymbolenWidget widget={w} />);
        const tile = screen.getByRole('button', { name: 'Samenwerken' });
        expect(tile.style.background).toBe('rgb(239, 68, 68)');
        expect((container.firstElementChild as HTMLElement).style.flexDirection).toBe('column');
        expect(SELF_SCALED_FONT.has('werksymbolen')).toBe(true);
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'werksymbolen', x: 0, y: 0, w: 440, z: 1, props: { symbols: [null, { label: 3, icon: 'raket', color: 'rood' }], active: 7, layout: 'cirkel', columns: 99, size: 'reus', multi: 'ja' } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        const m = werksymbolenModel(f.pages[0].widgets[0]);
        expect(m.symbols).toEqual([{ key: 's1', label: '', icon: 'ster', color: null }]);
        expect(m).toMatchObject({ active: ['stil'], multi: false, layout: 'raster', columns: 5, size: 'normaal' });
        expect(werksymbolenModel({ ...f.pages[0].widgets[0], props: { symbols: [] } }).symbols).toHaveLength(5);
    });

    test('panel edits reach the widget and survive a save/load', () => {
        const id = st().addWidget({ kind: 'werksymbolen', x: 0, y: 0, w: 440 });
        render(<Board id={id} />);
        const ws = screen.getByTestId('ws');
        // Rename, recolour and re-icon the first symbol.
        act(() => { fireEvent.change(screen.getByLabelText('Naam symbool 1'), { target: { value: 'Stilte' } }); });
        act(() => { fireEvent.click(screen.getByLabelText('Kleur symbool 1: Standaard')); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur symbool 1' })).getByRole('button', { name: 'Blauw' })); });
        act(() => { fireEvent.click(screen.getByLabelText('Icoon symbool 1: Stil')); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Icoon symbool 1' })).getByRole('button', { name: 'Koptelefoon' })); });
        expect(werksymbolenModel(live(id)).symbols[0]).toEqual({ key: 'stil', label: 'Stilte', icon: 'koptelefoon', color: '#1e40af' });
        expect(within(ws).getByRole('button', { name: 'Stilte' }).style.background).toBe('rgb(30, 64, 175)');
        // Add a symbol, then several active at once.
        act(() => { fireEvent.click(screen.getByText('Symbool toevoegen')); });
        expect(werksymbolenModel(live(id)).symbols).toHaveLength(6);
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Meerdere tegelijk actief' })); });
        act(() => { fireEvent.click(within(ws).getByRole('button', { name: 'Samenwerken' })); });
        expect(werksymbolenModel(live(id)).active).toEqual(['stil', 'samen']);
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Enkel het actieve symbool tonen' })); });
        expect(within(ws).getAllByRole('button')).toHaveLength(2);
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Eén rij' })); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Grootte' })).getByRole('button', { name: 'Groot' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Naam tonen' })); });
        expect(werksymbolenModel(live(id))).toMatchObject({ layout: 'rij', size: 'groot', showLabel: false, onlyActive: true, multi: true });
        saveBoardAutosave(st().pages, 0);
        expect(werksymbolenModel(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(werksymbolenModel(live(id)));
    });

    test('named sets: a built-in replaces the symbols; an own set is saved app-wide and deleted', () => {
        const id = st().addWidget({ kind: 'werksymbolen', x: 0, y: 0, w: 440 });
        render(<Board id={id} />);
        act(() => { fireEvent.click(within(screen.getByRole('region', { name: 'Sets' })).getByRole('button', { name: 'Stil werken' })); });
        expect(werksymbolenModel(live(id)).symbols.map(s => s.key)).toEqual(['stil', 'fluisteren', 'juf']);
        expect(live(id).props!.title).toBe('Stil werken');
        act(() => { fireEvent.change(screen.getByLabelText('Naam voor deze set'), { target: { value: 'Hoekenwerk' } }); });
        act(() => { fireEvent.click(screen.getByText('Bewaar symbolen als set')); });
        expect(loadWerksets().map(s => s.name)).toEqual(['Hoekenwerk']);
        expect(JSON.parse(localStorage.getItem(WERKSETS_KEY)!)[0].symbols).toHaveLength(3);
        act(() => { fireEvent.click(screen.getByLabelText('Set Hoekenwerk verwijderen')); });
        expect(loadWerksets()).toEqual([]);
    });
});
