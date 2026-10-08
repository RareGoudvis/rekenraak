// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetFrame from '../board/components/WidgetFrame';
import BoardPageCanvas from '../board/components/BoardPageCanvas';
import WhiteboardView from '../board/components/WhiteboardView';
import type { BoardWidget } from '../board/boardTypes';

// jsdom has no layout, so these pin the CSS contract the Playwright pass verified on screen:
// a card never runs past the board's bottom edge, and board content never climbs over popups.
afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

const widget: BoardWidget = { id: 'w1', kind: 'tekst', x: 40, y: 300, w: 360, z: 1, props: { text: 'hoi' } };

describe('tall cards', () => {
    test('the frame is capped to the board below its top and the body scrolls', () => {
        const { container } = render(<WidgetFrame widget={widget} selected><div style={{ height: 3000 }} /></WidgetFrame>);
        const frame = container.firstElementChild as HTMLElement;
        expect(frame.style.maxHeight.replace('calc(', '')).toContain('100% - 308px');
        const body = container.querySelector('[data-widget-body]') as HTMLElement;
        expect(body.style.overflowY).toBe('auto');
        expect(body.style.minHeight).toBe('0px');
        // The grip stays a direct child of the capped frame, so it is always inside it.
        expect(frame.querySelector(':scope > [aria-label="Grootte aanpassen"]')).not.toBeNull();
    });
});

describe('stacking', () => {
    test('the board and its widget layer are their own stacking contexts', () => {
        const { container } = render(<BoardPageCanvas />);
        const canvas = container.querySelector('[data-board-canvas]') as HTMLElement;
        const layer = container.querySelector('[data-widget-layer]') as HTMLElement;
        expect(canvas.style.isolation).toBe('isolate');
        expect(layer.style.isolation).toBe('isolate');
    });
});

describe('print', () => {
    test('the board overlay is out of the print tree, so printing with it open prints the sheet', () => {
        const { container } = render(<WhiteboardView />);
        expect((container.firstElementChild as HTMLElement).classList.contains('no-print')).toBe(true);
    });
});
