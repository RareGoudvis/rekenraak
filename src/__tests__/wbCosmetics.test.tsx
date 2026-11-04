// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import KlokWidget from '../board/components/widgets/KlokWidget';
import GeldPalet from '../board/components/GeldPalet';
import WidgetInspector from '../board/components/WidgetInspector';
import BoardAddPanel from '../board/components/BoardAddPanel';
import BoardRail from '../board/components/BoardRail';
import { addBasicWidget } from '../board/addWidgets';
import { makeBoardBlock } from '../board/boardBlocks';
import WhiteboardView from '../board/components/WhiteboardView';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import { REGISTRY } from '../config/exerciseRegistry';
import type { BoardWidget } from '../board/boardTypes';

// Bordmodus cosmetics from BUGS.md: each test failed before its fix.
afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

describe('drag surfaces do not select text', () => {
    test('the clock face', () => {
        const w: BoardWidget = { id: 'k', kind: 'klok', x: 0, y: 0, w: 260, z: 1, props: {} };
        const { container } = render(<KlokWidget widget={w} />);
        expect((container.querySelector('[data-klok-face]') as HTMLElement).style.userSelect).toBe('none');
    });

    test('the money palette bills and coins', () => {
        const { container } = render(<GeldPalet />);
        const items = [...container.querySelectorAll<HTMLElement>('[data-geld-palet-item]')];
        expect(items.length).toBeGreaterThan(10);
        for (const el of items) expect(el.style.userSelect).toBe('none');
    });
});

describe('add panel search', () => {
    // The card previews mount lazily on intersection; jsdom has no observer, and the search needs none.
    beforeEach(() => { vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} }); });
    afterEach(() => { vi.unstubAllGlobals(); });

    test('"klok" finds the klok exercise variants and the clock tool', () => {
        const { getByPlaceholderText, getAllByRole, queryByText } = render(<BoardAddPanel onClose={() => {}} />);
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'klok' } });
        expect(queryByText('Niets gevonden.')).toBeNull();
        const labels = getAllByRole('button').map(b => b.textContent?.trim());
        expect(labels).toContain('Klok');
        expect(labels).toContain('Analoge klok · Lezen');
        expect(labels).toContain('Digitale klok · Tekenen');
    });

    test('the panel closes on Escape and on a press outside it, not on one inside', () => {
        const onClose = vi.fn();
        const { getByPlaceholderText, getByText } = render(<BoardAddPanel onClose={onClose} />);
        fireEvent.pointerDown(getByPlaceholderText('Zoeken…'));
        fireEvent.pointerDown(getByText('Klasbeheer'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.pointerDown(document.body);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    test('a typeId finds its row and adding a found tool puts it on the board', () => {
        const onClose = vi.fn();
        const { getByPlaceholderText, getByRole, queryByText } = render(<BoardAddPanel onClose={onClose} />);
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'kloklezen' } });
        expect(queryByText('Niets gevonden.')).toBeNull();
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'klok' } });
        fireEvent.click(getByRole('button', { name: 'Klok' }));
        const s = useBoardStore.getState();
        expect(s.pages[s.activePageIdx].widgets.map(w => w.kind)).toEqual(['klok']);
        expect(onClose).toHaveBeenCalled();
    });
});

describe('add panel tabs', () => {
    beforeEach(() => { vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} }); });
    afterEach(() => { vi.unstubAllGlobals(); });

    test("the five tabs, and each widget sits in the owner's category", () => {
        const { getAllByRole, getByRole, queryByRole } = render(<BoardAddPanel onClose={() => {}} />);
        expect(getAllByRole('tab').map(t => t.textContent)).toEqual(['Rekenblok', 'Rekentool', 'Klasbeheer', 'Dagritme', 'Extra']);
        const tiles = (tab: string) => {
            fireEvent.click(getByRole('tab', { name: tab }));
            return getAllByRole('button').filter(b => !b.getAttribute('role') && !b.getAttribute('aria-label')).map(b => (b.querySelector('[data-widget-preview]') ? b.lastElementChild : b)?.textContent?.trim());
        };
        expect(tiles('Klasbeheer')).toEqual(expect.arrayContaining(['Namenkiezer', 'Groepjesmaker', 'Geluidsniveau', 'Timer', 'Stopwatch', 'Checklist', 'Werksymbolen', 'Stappenplan']));
        expect(tiles('Dagritme')).toEqual(expect.arrayContaining(['Datum', 'Weer', 'Ademhaling']));
        expect(tiles('Extra')).toEqual(['Afbeelding']);
        expect(tiles('Rekentool')).toEqual(expect.arrayContaining(['Getallenlijn', 'Honderdveld', 'MAB-materiaal']));
        // Rekenblok = the exercise catalog, with its domain chips.
        fireEvent.click(getByRole('tab', { name: 'Rekenblok' }));
        expect(queryByRole('button', { name: 'Alles' })).not.toBeNull();
    });

    test('adding a widget switches to Selecteren and closes the panel', () => {
        useBoardStore.getState().setTool('pen');
        const onClose = vi.fn();
        const { getByRole, getByText } = render(<BoardAddPanel onClose={onClose} />);
        fireEvent.click(getByRole('tab', { name: 'Klasbeheer' }));
        fireEvent.click(getByText('Timer'));
        const s = useBoardStore.getState();
        expect(s.pages[s.activePageIdx].widgets.map(w => w.kind)).toEqual(['timer']);
        expect(s.tool).toBe('select');
        expect(onClose).toHaveBeenCalled();
    });

    test('a math tile adds a one-exercise card titled live by leaf and max', () => {
        const onClose = vi.fn();
        const { getByPlaceholderText, getAllByRole } = render(<BoardAddPanel onClose={onClose} />);
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'hr-std-optellen' } });
        fireEvent.click(getAllByRole('button').find(b => /· Natuurlijke getallen$/.test(b.textContent ?? ''))!);
        const w = useBoardStore.getState().pages[0].widgets[0];
        expect(w.kind).toBe('exercise');
        expect(w.block!.numberOfExercises).toBe(1);
        expect(w.props?.title).toBeUndefined();
        expect(onClose).toHaveBeenCalled();
    });

    test('an old favourite id for the dropped Tekst tile vanishes silently', () => {
        localStorage.setItem('rekenraak_board_favorites_v1', JSON.stringify(['tekst', 'datum']));
        const { getByLabelText } = render(<BoardAddPanel onClose={() => {}} />);
        const favs = getByLabelText('Favorieten');
        expect(within(favs).queryByRole('button', { name: /Tekst/ })).toBeNull();
        expect(within(favs).queryByRole('button', { name: /Datum/ })).not.toBeNull();
        localStorage.removeItem('rekenraak_board_favorites_v1');
    });

    test('a star makes a favourite that shows on top of every tab and adds in one tap', () => {
        localStorage.removeItem('rekenraak_board_favorites_v1');
        const { getByRole, getByLabelText } = render(<BoardAddPanel onClose={() => {}} />);
        fireEvent.click(getByRole('tab', { name: 'Dagritme' }));
        fireEvent.click(getByLabelText('Favoriet Datum'));
        fireEvent.click(getByRole('tab', { name: 'Rekenblok' }));
        const favs = getByLabelText('Favorieten');
        fireEvent.click(within(favs).getByRole('button', { name: /Datum/ }));
        expect(useBoardStore.getState().pages[0].widgets.map(w => w.kind)).toEqual(['datum']);
        localStorage.removeItem('rekenraak_board_favorites_v1');
    });
});

describe('rail flyouts', () => {
    test('the board settings popup closes on Escape and on a press outside, not on one inside', () => {
        const { getByRole, queryByText, getByText } = render(<BoardRail addOpen={false} onToggleAdd={() => {}} />);
        const gear = getByRole('button', { name: 'Bordinstellingen' });
        fireEvent.click(gear);
        expect(queryByText('Raster uitlijnen')).not.toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(queryByText('Raster uitlijnen')).toBeNull();

        fireEvent.click(gear);
        fireEvent.pointerDown(getByText('Raster uitlijnen'));
        expect(queryByText('Raster uitlijnen')).not.toBeNull();
        fireEvent.pointerDown(document.body);
        expect(queryByText('Raster uitlijnen')).toBeNull();

        // The ⚙ itself still toggles: a press on it is inside, its click closes.
        fireEvent.click(gear);
        fireEvent.pointerDown(gear);
        fireEvent.click(gear);
        expect(queryByText('Raster uitlijnen')).toBeNull();
    });

    test('the other popups share the same close rules', () => {
        const { getByRole, queryByText } = render(<BoardRail addOpen={false} onToggleAdd={() => {}} />);
        for (const name of ['Meetinstrumenten', 'Lijn en vormen']) {
            fireEvent.click(getByRole('button', { name }));
            expect(document.querySelector('[data-rail-flyout]')).not.toBeNull();
            fireEvent.pointerDown(document.body);
            expect(document.querySelector('[data-rail-flyout]')).toBeNull();
        }
        expect(queryByText('Alles verbergen')).toBeNull();
    });
});

describe('new card placement', () => {
    const positions = () => {
        const s = useBoardStore.getState();
        return s.pages[s.activePageIdx].widgets.map(w => `${w.x},${w.y}`);
    };

    test('twelve adds land on twelve different spots; the 6th no longer covers the 1st', () => {
        for (let i = 0; i < 12; i++) addBasicWidget('tekst', {}, 300);
        const p = positions();
        expect(p[5]).not.toBe(p[0]);
        expect(new Set(p).size).toBe(12);
    });

    test('a spot freed by moving a card away is the next one used', () => {
        for (let i = 0; i < 3; i++) addBasicWidget('tekst', {}, 300);
        const s = useBoardStore.getState();
        const second = s.pages[s.activePageIdx].widgets[1];
        const freed = `${second.x},${second.y}`;
        s.updateWidget(second.id, { x: 900, y: 500 });
        addBasicWidget('tekst', {}, 300);
        expect(positions()[3]).toBe(freed);
    });
});

describe('board Aantal', () => {
    afterEach(() => { useWorksheetStore.getState().clearDraftBlocks(); });

    test('the count applies to the card at once: fewer cuts the tail, more keeps the rest and tops up', () => {
        const block = makeBoardBlock('cijferen-optellen-nat', { override: { operator: '+', numberType: 'natural' }, leafId: 'cijferen-optellen-nat', base: DEFAULT_BASE, grade: null })!;
        const board = useBoardStore.getState();
        const id = board.addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block, showAnswer: false });
        board.selectWidget(id);
        board.setInspectorOpen(true);
        const { container } = render(<WhiteboardView />);
        const exercises = () => {
            const b = useBoardStore.getState().pages[0].widgets.find(w => w.id === id)!.block!;
            return b[REGISTRY[b.typeId].exerciseField as keyof typeof b] as unknown as Array<{ id: string }>;
        };
        // A board card starts with one exercise (owner call); Aantal grows it from there.
        expect(exercises()).toHaveLength(1);
        // Not the rail's ink slider: the inspector's Aantal.
        const slider = container.querySelector('input[type="range"]:not(.board-ink-range)') as HTMLInputElement;
        act(() => { fireEvent.change(slider, { target: { value: '9' } }); });
        const first = exercises().map(e => e.id);
        expect(first.length).toBe(9);

        act(() => { fireEvent.change(slider, { target: { value: '2' } }); });
        expect(exercises().map(e => e.id)).toEqual(first.slice(0, 2));

        act(() => { fireEvent.change(slider, { target: { value: '5' } }); });
        expect(exercises().length).toBe(5);
        expect(exercises().slice(0, 2).map(e => e.id)).toEqual(first.slice(0, 2));
    });
});

describe('widget settings', () => {
    test('the Werksymbolen panel renders its symbol rows without a React key warning', () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const w: BoardWidget = { id: 'ws', kind: 'werksymbolen', x: 0, y: 0, w: 300, z: 1, props: {} };
        render(<WidgetInspector widget={w} />);
        const keyWarnings = errors.mock.calls.filter(c => c.some(a => typeof a === 'string' && a.includes('unique "key"')));
        errors.mockRestore();
        expect(keyWarnings).toEqual([]);
    });
});
