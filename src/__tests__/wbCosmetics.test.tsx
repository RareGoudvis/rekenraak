// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import KlokWidget from '../board/components/widgets/KlokWidget';
import GeldPalet from '../board/components/GeldPalet';
import WidgetInspector from '../board/components/WidgetInspector';
import BoardAddModal from '../board/components/BoardAddModal';
import type { BoardWidget } from '../board/boardTypes';

// Bordmodus cosmetics from BUGS.md: each test failed before its fix.
afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

describe('drag surfaces do not select text', () => {
    test('the clock face', () => {
        const w: BoardWidget = { id: 'k', kind: 'klok', x: 0, y: 0, w: 260, z: 1, props: {} };
        const { container } = render(<KlokWidget widget={w} dark={false} />);
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
