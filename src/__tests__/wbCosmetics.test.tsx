// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import KlokWidget from '../board/components/widgets/KlokWidget';
import GeldPalet from '../board/components/GeldPalet';
import WidgetInspector from '../board/components/WidgetInspector';
import BoardAddModal from '../board/components/BoardAddModal';
import BoardBottomBar from '../board/components/BoardBottomBar';
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
        const { getByPlaceholderText, getAllByRole, queryByText } = render(<BoardAddModal onClose={() => {}} />);
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'klok' } });
        expect(queryByText('Geen oefeningen gevonden.')).toBeNull();
        const labels = getAllByRole('button').map(b => b.textContent?.trim());
        expect(labels).toContain('Klok');
        expect(labels).toContain('Analoge klok · Lezen');
        expect(labels).toContain('Digitale klok · Tekenen');
    });

    test('the panel closes on Escape and on a press outside it, not on one inside', () => {
        const onClose = vi.fn();
        const { getByPlaceholderText, getByText } = render(<BoardAddModal onClose={onClose} />);
        fireEvent.pointerDown(getByPlaceholderText('Zoeken…'));
        fireEvent.pointerDown(getByText('Wiskunde toevoegen'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.pointerDown(document.body);
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    test('a typeId finds its row and adding a found tool puts it on the board', () => {
        const onClose = vi.fn();
        const { getByPlaceholderText, getByRole, queryByText } = render(<BoardAddModal onClose={onClose} />);
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'kloklezen' } });
        expect(queryByText('Geen oefeningen gevonden.')).toBeNull();
        fireEvent.change(getByPlaceholderText('Zoeken…'), { target: { value: 'klok' } });
        fireEvent.click(getByRole('button', { name: 'Klok' }));
        const s = useBoardStore.getState();
        expect(s.pages[s.activePageIdx].widgets.map(w => w.kind)).toEqual(['klok']);
        expect(onClose).toHaveBeenCalled();
    });
});

describe('bottom bar popups', () => {
    test('the board settings popup closes on Escape and on a press outside, not on one inside', () => {
        const { getByRole, queryByText, getByText } = render(<BoardBottomBar onOpenWiskunde={() => {}} />);
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
        const { getByRole, queryByText } = render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        fireEvent.click(getByRole('button', { name: 'Toevoegen aan bord' }));
        expect(queryByText('Categorieën')).not.toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(queryByText('Categorieën')).toBeNull();
        fireEvent.click(getByRole('button', { name: 'Bewaren' }));
        expect(queryByText('Bord bewaren als…')).not.toBeNull();
        fireEvent.pointerDown(document.body);
        expect(queryByText('Bord bewaren als…')).toBeNull();
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
        const first = exercises().map(e => e.id);
        expect(first.length).toBe(block.numberOfExercises);
        expect(first.length).toBeGreaterThan(2);

        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        act(() => { fireEvent.change(slider, { target: { value: '2' } }); });
        expect(exercises().map(e => e.id)).toEqual(first.slice(0, 2));

        act(() => { fireEvent.change(slider, { target: { value: '9' } }); });
        expect(exercises().length).toBe(9);
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
