import { expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useBoardStore } from '../../board/useBoardStore';
import { BOARD_FORMAT_VERSION, parseBoardFile } from '../../board/boardPersistence';
import WidgetInspector from '../../board/components/WidgetInspector';
import type { BoardWidget, WidgetKind } from '../../board/boardTypes';

// Shared harness for the per-widget settings suites: a widget straight from props, a widget
// rendered live from the store, its ⚙ panel, and a board save + load through the parser.

export const st = () => useBoardStore.getState();
export const liveW = (id: string) => st().pages[st().activePageIdx].widgets.find(x => x.id === id)!;
export const w = (kind: WidgetKind, props: Record<string, unknown> = {}): BoardWidget => ({ id: `w-${kind}`, kind, x: 0, y: 0, w: 320, z: 1, props });

// The widget rendered from the store, so its own writes (laps, rolls, keypad) re-render it.
export function mountWidget(kind: WidgetKind, props: Record<string, unknown>, View: (p: { widget: BoardWidget }) => React.ReactNode) {
    const id = st().addWidget({ kind, x: 0, y: 0, w: 320, props });
    function Live() {
        const widget = useBoardStore((s) => s.pages[0].widgets.find(x => x.id === id)!);
        return <>{View({ widget })}</>;
    }
    return { ...render(<Live />), id, live: () => liveW(id) };
}

export function openPanel(kind: WidgetKind, props?: Record<string, unknown>) {
    const id = st().addWidget({ kind, x: 0, y: 0, w: 320, props });
    // Re-renders with the live widget, as WhiteboardView does.
    function Inspector() {
        const widget = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
        return widget ? <WidgetInspector widget={widget} /> : null;
    }
    render(<Inspector />);
    return id;
}

export const click = (name: string | RegExp, role: 'button' | 'switch' = 'button') => act(() => { fireEvent.click(screen.getByRole(role, { name })); });
export const slide = (label: string, value: number) => act(() => { fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } }); });
export const typeIn = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); });
export const patch = (id: string, props: Record<string, unknown>) => act(() => { st().updateWidget(id, { props: { ...liveW(id).props, ...props } }); });

// Save the board as a file and read it back: everything a panel wrote must survive the parser.
export function expectRoundTrip(id: string) {
    const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: st().pages }))!;
    expect(f.pages[0].widgets.find(x => x.id === id)!.props).toEqual(liveW(id).props);
}

// Board file with one page of the given widgets.
export const boardFile = (widgets: unknown[]) =>
    JSON.stringify({ version: BOARD_FORMAT_VERSION, exportedAt: 'x', pages: [{ id: 'p', widgets, strokes: [], background: { pattern: 'blanco', dark: false } }] });
