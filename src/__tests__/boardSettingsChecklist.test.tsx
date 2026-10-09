// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import ChecklistWidget from '../board/components/widgets/ChecklistWidget';
import { checklistProps } from '../board/settings/listModel';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Checklist ⚙: item editor with colours, templates, tick style, big tap, numbering, reset.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><ChecklistWidget widget={w} /><WidgetInspector widget={w} /></> : null;
}

afterEach(() => { cleanup(); localStorage.clear(); st().resetBoard(); });

describe('checklist settings', () => {
    test('an old board reads as before: its newline items, square boxes, strike + fade', () => {
        const w: BoardWidget = { id: 'w', kind: 'checklist', x: 0, y: 0, w: 360, z: 1, props: { items: 'a\n\nb', checked: [1] } };
        expect(checklistProps(w)).toEqual({
            items: [{ text: 'a', color: null }, { text: 'b', color: null }], checked: [1],
            round: false, checkStyle: 'doorstreep', bigTap: false, numbered: false,
        });
        expect(checklistProps({ ...w, props: {} }).items.map(i => i.text)).toEqual(['boek klaar', 'potlood klaar', 'aan de slag!']);
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'checklist', x: 0, y: 0, w: 360, z: 1, props: { list: [{ text: 4, color: 'groen' }, 'los', null], checked: ['x', -1, 2], checkStyle: 'boem', bigTap: 'ja', numbered: 1 } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(checklistProps(f.pages[0].widgets[0])).toEqual({
            items: [{ text: '', color: null }, { text: 'los', color: null }, { text: '', color: null }], checked: [2],
            round: false, checkStyle: 'doorstreep', bigTap: false, numbered: false,
        });
    });

    test('panel edits reach the widget and survive a save/load', () => {
        const id = st().addWidget({ kind: 'checklist', x: 0, y: 0, w: 360, props: { items: 'boek\npotlood', checked: [0] } });
        const { container } = render(<Board id={id} />);
        // A text edit keeps the ticks; adding a row restarts them.
        act(() => { fireEvent.change(screen.getByLabelText('Item 2'), { target: { value: 'gom' } }); });
        expect(live(id).props).toMatchObject({ list: [{ text: 'boek', color: null }, { text: 'gom', color: null }], checked: [0] });
        act(() => { fireEvent.click(screen.getByText('Item toevoegen')); });
        act(() => { fireEvent.change(screen.getByLabelText('Item 3'), { target: { value: 'schaar' } }); });
        expect(live(id).props!.checked).toEqual([]);
        // Colour per row.
        act(() => { fireEvent.click(screen.getByLabelText('Kleur item 1: Standaard')); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur item 1' })).getByRole('button', { name: 'Paars' })); });
        expect(checklistProps(live(id)).items[0].color).toBe('#6b21a8');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Enkel vinkje' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Grote tikvakken' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Nummering' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Rond' })); });
        expect(checklistProps(live(id))).toMatchObject({ checkStyle: 'vink', bigTap: true, numbered: true, round: true });
        // The widget: numbered rows, a tap ticks without striking (Enkel vinkje).
        expect(container.textContent).toContain('3. schaar');
        const row = container.querySelector('button[aria-pressed]') as HTMLElement;
        expect(row.textContent).toBe('1. boek');
        act(() => { fireEvent.click(row); });
        expect(live(id).props!.checked).toEqual([0]);
        expect((row.lastElementChild as HTMLElement).style.textDecoration).toBe('none');
        act(() => { fireEvent.click(screen.getByText('Alles opnieuw (vinkjes weg)')); });
        expect(live(id).props!.checked).toEqual([]);
        // Round-trip.
        saveBoardAutosave(st().pages, 0);
        const back = loadBoardAutosave()!.pages[0].widgets[0];
        expect(checklistProps(back)).toEqual(checklistProps(live(id)));
    });

    test('a template replaces the list and the title', () => {
        const id = st().addWidget({ kind: 'checklist', x: 0, y: 0, w: 360, props: { checked: [1] } });
        render(<Board id={id} />);
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Opruimen' })); });
        expect(live(id).props!.title).toBe('Opruimen');
        expect(checklistProps(live(id)).items[0].text).toBe('bank leeg');
        expect(live(id).props!.checked).toEqual([]);
    });
});
