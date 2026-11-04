// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import StappenplanWidget from '../board/components/widgets/StappenplanWidget';
import { stappenplanProps } from '../board/settings/listModel';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Stappenplan ⚙: row editor with colours, templates, numbering, tap-to-complete steps.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="plan"><StappenplanWidget widget={w} /></div><WidgetInspector widget={w} /></> : null;
}

afterEach(() => { cleanup(); localStorage.clear(); st().resetBoard(); });

describe('stappenplan settings', () => {
    test('an old board reads as before: its text, numbered, static, legacy colour', () => {
        const w: BoardWidget = { id: 'w', kind: 'stappenplan', x: 0, y: 0, w: 400, z: 1, props: { text: '# Plan\neen\n\ntwee', color: 'groen' } };
        expect(stappenplanProps(w)).toEqual({
            items: [{ text: '# Plan', color: null }, { text: 'een', color: null }, { text: 'twee', color: null }],
            numbered: true, tappable: false, done: [], checkStyle: 'doorstreep', bigTap: false,
        });
        const { container } = render(<StappenplanWidget widget={w} />);
        expect(container.querySelectorAll('button')).toHaveLength(0);
        expect(container.textContent).toBe('Plan1een2twee');
        expect((container.firstElementChild!.firstElementChild as HTMLElement).style.color).toBe('rgb(22, 101, 52)');
        expect(stappenplanProps({ ...w, props: {} }).items[0].text).toBe('# Zo werk je');
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'stappenplan', x: 0, y: 0, w: 400, z: 1, props: { list: 'nee', numbered: 0, tappable: 'ja', done: [1.5, 'a'], checkStyle: 3 } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        const p = stappenplanProps(f.pages[0].widgets[0]);
        expect(p).toMatchObject({ numbered: true, tappable: false, done: [], checkStyle: 'doorstreep', bigTap: false });
        expect(p.items[0].text).toBe('# Zo werk je');
    });

    test('panel edits reach the widget, steps tick when tappable, and survive a save/load', () => {
        const id = st().addWidget({ kind: 'stappenplan', x: 0, y: 0, w: 400, props: { text: '# Plan\nlees\nreken' } });
        render(<Board id={id} />);
        act(() => { fireEvent.change(screen.getByLabelText('Rij 3'), { target: { value: 'reken uit' } }); });
        act(() => { fireEvent.click(screen.getByLabelText('Kleur rij 2: Standaard')); });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Kleur rij 2' })).getByRole('button', { name: 'Rood' })); });
        expect(stappenplanProps(live(id)).items).toEqual([{ text: '# Plan', color: null }, { text: 'lees', color: '#b91c1c' }, { text: 'reken uit', color: null }]);
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Stappen afvinken (tik op een stap)' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Vervagen' })); });
        const plan = screen.getByTestId('plan');
        act(() => { fireEvent.click(within(plan).getAllByRole('button')[1]); });
        expect(live(id).props!.done).toEqual([2]);
        expect(stappenplanProps(live(id))).toMatchObject({ tappable: true, checkStyle: 'vervaag' });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Nummering' })); });
        expect(plan.textContent).toContain('✓ reken uit');
        saveBoardAutosave(st().pages, 0);
        expect(stappenplanProps(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(stappenplanProps(live(id)));
        act(() => { fireEvent.click(screen.getByText('Alles opnieuw (vinkjes weg)')); });
        expect(live(id).props!.done).toEqual([]);
    });

    test('a template replaces the rows', () => {
        const id = st().addWidget({ kind: 'stappenplan', x: 0, y: 0, w: 400 });
        render(<Board id={id} />);
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Cijferen' })); });
        expect(stappenplanProps(live(id)).items[0].text).toBe('# Cijferen');
    });
});
