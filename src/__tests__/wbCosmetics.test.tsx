// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import KlokWidget from '../board/components/widgets/KlokWidget';
import GeldPalet from '../board/components/GeldPalet';
import WidgetInspector from '../board/components/WidgetInspector';
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
