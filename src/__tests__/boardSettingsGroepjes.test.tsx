// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import GroepjesWidget from '../board/components/widgets/GroepjesWidget';
import { groepjesModel, dealGroups, groupLabel, groupsAsText } from '../board/settings/groepjesModel';
import { saveClassList } from '../board/settings/namenModel';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Groepjesmaker ⚙: names source, size or count, rules, labels/colours/animals, animation,
// lockable groups, re-deal, text export.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;
const CLASS = ['Ana', 'Bert', 'Cas', 'Dina', 'Eli', 'Fien'];

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="g"><GroepjesWidget widget={w} /></div><WidgetInspector widget={w} /></> : null;
}

beforeEach(() => saveClassList(CLASS));
afterEach(() => { cleanup(); localStorage.clear(); st().resetBoard(); });

const w = (props: Record<string, unknown>): BoardWidget => ({ id: 'w', kind: 'groepjes', x: 0, y: 0, w: 460, z: 1, props });

describe('groepjes model', () => {
    test('an old board reads as before: class list, numbered, blue, no animation, no result yet', () => {
        expect(groepjesModel(w({ groups: 2 }))).toMatchObject({ source: 'klas', showNumbers: true, colored: false, emoji: false, animate: false, result: null, locked: [], groups: 2, mode: 'aantal' });
        expect(SELF_SCALED_FONT.has('groepjes')).toBe(true);
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { ...w({ source: 3, names: 'x', showNumbers: 0, colored: 'ja', result: [['Ana'], 'Bert'], locked: [0] }) };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(groepjesModel(f.pages[0].widgets[0])).toMatchObject({ source: 'klas', names: [], showNumbers: true, colored: false, result: null, locked: [] });
        expect(groepjesModel(w({ result: [['Ana', 4]], locked: [0, 3, -1] }))).toMatchObject({ result: [['Ana']], locked: [0] });
    });

    test('a locked group keeps its place and members on a re-deal', () => {
        const m = groepjesModel(w({ groups: 3, result: [['Ana', 'Bert'], ['Cas', 'Dina'], ['Eli', 'Fien']], locked: [1] }));
        for (let k = 0; k < 20; k++) {
            const r = dealGroups(CLASS, m);
            expect(r.groups[1]).toEqual(['Cas', 'Dina']);
            expect(r.locked).toEqual([1]);
            expect(r.groups.flat().sort()).toEqual([...CLASS].sort());
            expect(r.groups).toHaveLength(3);
        }
        // A locked group whose names left the list drops out; the lock indexes follow.
        const gone = dealGroups(['Ana', 'Bert', 'Eli', 'Fien'], groepjesModel(w({ groups: 2, result: [['Cas', 'Dina'], ['Ana', 'Bert']], locked: [0, 1] })));
        expect(gone.groups.map(x => [...x].sort())).toEqual([['Ana', 'Bert'], ['Eli', 'Fien']]);
        expect(gone.locked).toEqual([0]);
    });

    test('labels and text export', () => {
        expect(groupLabel({ showNumbers: true, emoji: false }, 0)).toBe('Groep 1');
        expect(groupLabel({ showNumbers: false, emoji: true }, 1)).toBe('🐻');
        expect(groupLabel({ showNumbers: false, emoji: false }, 1)).toBe('');
        expect(groupsAsText([['Ana', 'Bert'], ['Cas']], { showNumbers: false, emoji: false })).toBe('Groep 1: Ana, Bert\nGroep 2: Cas');
    });
});

describe('groepjes settings', () => {
    test('deal from the widget, lock a group, re-deal from the panel; the result survives a save/load', () => {
        const id = st().addWidget({ kind: 'groepjes', x: 0, y: 0, w: 460, props: { groups: 3 } });
        render(<Board id={id} />);
        const g = screen.getByTestId('g');
        act(() => { fireEvent.click(within(g).getByText('Maak groepen')); });
        const first = groepjesModel(live(id)).result!;
        expect(first).toHaveLength(3);
        act(() => { fireEvent.click(within(g).getByLabelText('Groep 2 vastzetten')); });
        expect(groepjesModel(live(id)).locked).toEqual([1]);
        act(() => { fireEvent.click(within(screen.getByRole('region', { name: 'Groepen' })).getByText('Opnieuw verdelen')); });
        expect(groepjesModel(live(id)).result![1]).toEqual(first[1]);
        expect((screen.getByLabelText('Groepen als tekst') as HTMLTextAreaElement).value).toContain(`Groep 2: ${first[1].join(', ')}`);
        saveBoardAutosave(st().pages, 0);
        expect(groepjesModel(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(groepjesModel(live(id)));
        act(() => { fireEvent.click(screen.getByText('Alles losmaken (1)')); });
        expect(groepjesModel(live(id)).locked).toEqual([]);
    });

    test('labels, colours, animals and an own list reach the widget', () => {
        const id = st().addWidget({ kind: 'groepjes', x: 0, y: 0, w: 460, props: { result: [['Ana', 'Bert'], ['Cas']] } });
        render(<Board id={id} />);
        const g = screen.getByTestId('g');
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Dier per groep' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Groepsnummers' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Kleur per groep' })); });
        expect(g.textContent).toContain('🦊');
        expect(g.textContent).not.toContain('Groep 1');
        expect(groepjesModel(live(id))).toMatchObject({ emoji: true, showNumbers: false, colored: true });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Eigen lijst' })); });
        act(() => { fireEvent.click(screen.getByText('Naam toevoegen')); });
        act(() => { fireEvent.change(screen.getByLabelText('Naam 1'), { target: { value: 'Zoë' } }); });
        expect(groepjesModel(live(id))).toMatchObject({ source: 'eigen', names: ['Zoë'] });
        expect(g.textContent).toContain('Voeg namen toe');
    });
});
