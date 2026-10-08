// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import WidgetFrame from '../board/components/WidgetFrame';
import { WIDGET_SETTINGS } from '../board/settings/registry';
import { ListEditor, ItemInput } from '../board/settings/controls';
import { fontScale, fontSizeKey, widgetAccent, SELF_SCALED_FONT } from '../board/settings/baseProps';
import { BOARD_DEFAULTS_KEY, loadWidgetDefaults, saveWidgetDefaults } from '../board/settings/widgetDefaults';
import { parseBoardFile, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import { NATURAL_W, KINDS_WITH_SETTINGS } from '../board/widgetSizing';
import type { BoardWidget, WidgetKind } from '../board/boardTypes';

// The settings mechanism: registry lookup, the baseline every kind shares, the teacher's
// saved standaard per kind, and the strict-but-forgiving prop reading of old boards.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

beforeAll(() => {
    HTMLElement.prototype.setPointerCapture ??= () => {};
    HTMLElement.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
});

function openPanel(kind: WidgetKind, props?: Record<string, unknown>) {
    const id = st().addWidget({ kind, x: 0, y: 0, w: NATURAL_W[kind], props });
    const utils = render(<Inspector id={id} />);
    return { id, ...utils };
}

// Re-renders with the live widget, as WhiteboardView does.
function Inspector({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <WidgetInspector widget={w} /> : null;
}

describe('registry', () => {
    test('every kind but exercise has the ⚙ and a baseline panel; registered kinds add their own', () => {
        expect(new Set(KINDS_WITH_SETTINGS)).toEqual(new Set(Object.keys(NATURAL_W)));
        for (const kind of Object.keys(WIDGET_SETTINGS) as WidgetKind[]) expect(NATURAL_W[kind]).toBeGreaterThan(0);
        for (const kind of (Object.keys(NATURAL_W) as WidgetKind[]).filter(k => k !== 'exercise')) {
            const { unmount } = openPanel(kind);
            expect(screen.getByRole('region', { name: 'Kaart' })).toBeTruthy();
            expect(screen.getByText('Bewaar als mijn standaard')).toBeTruthy();
            unmount();
        }
    });
});

describe('baseline', () => {
    test('titel, titelbalk, tekstgrootte and accentkleur write the widget props', () => {
        const { id } = openPanel('tekst', { text: 'hoi' });
        act(() => { fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Huiswerk' } }); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Titelbalk tonen' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'XL' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Rood' })); });
        expect(live(id).props).toMatchObject({ text: 'hoi', title: 'Huiswerk', showHeader: false, fontSize: 'xl', accent: '#b91c1c' });
        // A typed hex counts; a junk one is ignored.
        const hex = screen.getByLabelText('Eigen kleur (hex)');
        act(() => { fireEvent.change(hex, { target: { value: 'zz' } }); fireEvent.blur(hex); });
        expect(live(id).props!.accent).toBe('#b91c1c');
        act(() => { fireEvent.change(hex, { target: { value: '0f766e' } }); fireEvent.blur(hex); });
        expect(live(id).props!.accent).toBe('#0f766e');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Standaard' })); });
        expect(widgetAccent(live(id))).toBeNull();
    });

    test('the frame paints the accent dot and zooms a non-self-scaled kind by the font size', () => {
        const w: BoardWidget = { id: 'w', kind: 'tekst', x: 0, y: 0, w: 362, z: 1, props: { accent: '#166534', fontSize: 'groot' } };
        expect(SELF_SCALED_FONT.has('tekst')).toBe(false);
        const { container } = render(<WidgetFrame widget={w} selected={false}><p>x</p></WidgetFrame>);
        const header = container.firstElementChild!.firstElementChild as HTMLElement;
        expect((header.firstElementChild as HTMLElement).style.background).toBe('rgb(22, 101, 52)');
        const inner = container.querySelector('[data-widget-body] > div > div') as HTMLElement;
        expect(inner.style.zoom).toBe('1.25');
    });

    test.each([
        [undefined, 'normaal', 1], ['klein', 'klein', 0.85], ['xl', 'xl', 1.5], ['reuze', 'normaal', 1], [3, 'normaal', 1],
    ])('fontSize %s reads as %s', (raw, key, scale) => {
        const w: BoardWidget = { id: 'w', kind: 'klok', x: 0, y: 0, w: 300, z: 1, props: { fontSize: raw } };
        expect(fontSizeKey(w)).toBe(key);
        expect(fontScale(w)).toBe(scale);
    });

    test.each([['#AbCdEf', '#AbCdEf'], ['red', null], ['#12345', null], [12, null], [undefined, null]])('accent %s reads as %s', (raw, out) => {
        expect(widgetAccent({ id: 'w', kind: 'klok', x: 0, y: 0, w: 300, z: 1, props: { accent: raw } })).toBe(out);
    });
});

describe('mijn standaard', () => {
    test('save → new widgets of that kind start from it (caller props win, transient state stays out); Vergeet clears', () => {
        const { id } = openPanel('checklist', { items: 'a\nb', checked: [0], round: true });
        act(() => { fireEvent.click(screen.getByText('Bewaar als mijn standaard')); });
        expect(JSON.parse(localStorage.getItem(BOARD_DEFAULTS_KEY)!)).toEqual({ checklist: { items: 'a\nb', round: true } });
        const fresh = st().addWidget({ kind: 'checklist', x: 0, y: 0, w: 360, props: { round: false } });
        expect(live(fresh).props).toEqual({ items: 'a\nb', round: false });
        // Other kinds are untouched.
        const other = st().addWidget({ kind: 'klok', x: 0, y: 0, w: 300 });
        expect(live(other).props).toBeUndefined();
        expect(live(id).props!.checked).toEqual([0]);
        act(() => { fireEvent.click(screen.getByText('Vergeet')); });
        expect(loadWidgetDefaults('checklist')).toBeNull();
    });

    test('Standaard herstellen asks once, then resets to the saved standaard (an image stays)', () => {
        saveWidgetDefaults('afbeelding', { title: 'Plaat' });
        const { id } = openPanel('afbeelding', { src: 'data:x', title: 'Oud', fontSize: 'xl' });
        act(() => { fireEvent.click(screen.getByText('Terug naar mijn standaard')); });
        expect(live(id).props!.title).toBe('Oud');
        act(() => { fireEvent.click(screen.getByText('Ja, terugzetten')); });
        expect(live(id).props).toEqual({ title: 'Plaat', src: 'data:x' });
    });

    test('garbage under the defaults key reads as no standaard', () => {
        localStorage.setItem(BOARD_DEFAULTS_KEY, '{nope');
        expect(loadWidgetDefaults('klok')).toBeNull();
        localStorage.setItem(BOARD_DEFAULTS_KEY, JSON.stringify({ klok: 'x', datum: [] }));
        expect(loadWidgetDefaults('klok')).toBeNull();
        expect(loadWidgetDefaults('datum')).toBeNull();
        const id = st().addWidget({ kind: 'klok', x: 0, y: 0, w: 300 });
        expect(live(id).props).toBeUndefined();
    });
});

describe('old and junk boards', () => {
    test('props that are not an object load as none; junk baseline keys read as defaults', () => {
        const base = { id: 'w', kind: 'datum', x: 0, y: 0, w: 340, z: 1 };
        const widgets = [{ ...base, props: 'x' }, { ...base, id: 'w2', props: [1] }, { ...base, id: 'w3', props: { fontSize: 'huge', accent: 'blue', title: 7 } }];
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets, strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        const [a, b, c] = f.pages[0].widgets;
        expect(a.props).toEqual({});
        expect(b.props).toEqual({});
        expect(fontScale(c)).toBe(1);
        expect(widgetAccent(c)).toBeNull();
    });
});

describe('ListEditor', () => {
    function Harness({ initial }: { initial: string[] }) {
        const [items, setItems] = useState(initial);
        return (
            <>
                <ListEditor label="Items" items={items} onChange={setItems} newItem={() => 'nieuw'} itemName={(it) => it}
                    bulk={{ toText: (xs) => xs.join('\n'), fromText: (t) => t.split('\n').map(s => s.trim()).filter(Boolean) }}
                    renderItem={(it, update, i) => <ItemInput label={`Item ${i + 1}`} value={it} onChange={update} />} />
                <output data-testid="out">{items.join('|')}</output>
            </>
        );
    }
    const out = () => screen.getByTestId('out').textContent;

    test('edit, move, remove, add and paste a list, all by button', () => {
        render(<Harness initial={['a', 'b', 'c']} />);
        fireEvent.change(screen.getByLabelText('Item 2'), { target: { value: 'B' } });
        expect(out()).toBe('a|B|c');
        fireEvent.click(screen.getByLabelText('B omhoog'));
        expect(out()).toBe('B|a|c');
        expect((screen.getByLabelText('B omhoog') as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByLabelText('c omlaag'));
        expect(out()).toBe('B|a|c');
        fireEvent.click(screen.getByLabelText('a verwijderen'));
        expect(out()).toBe('B|c');
        fireEvent.click(screen.getByText('Toevoegen'));
        expect(out()).toBe('B|c|nieuw');
        fireEvent.click(screen.getByText('Plak een lijst'));
        const area = screen.getByLabelText('Plak een lijst') as HTMLTextAreaElement;
        expect(area.value).toBe('B\nc\nnieuw');
        fireEvent.change(area, { target: { value: ' Ana \n\nBert' } });
        fireEvent.click(screen.getByText('Lijst overnemen'));
        expect(out()).toBe('Ana|Bert');
        expect(within(document.body).getByText('Items (2)')).toBeTruthy();
    });
});
