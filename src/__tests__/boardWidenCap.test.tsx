// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import WidgetFrame from '../board/components/WidgetFrame';
import { cardNaturalWidth } from '../board/settings/baseProps';
import { capWidenedWidth } from '../board/widgetSizing';
import { useBoardStore } from '../board/useBoardStore';
import type { BoardWidget } from '../board/boardTypes';

afterEach(() => { cleanup(); vi.restoreAllMocks(); useBoardStore.getState().resetBoard(); });

// A 20-column honderdveld at XL widens its card to ~909 px; it must stay inside a narrower board.
const wide = (x: number): BoardWidget => ({ id: 'hv', kind: 'honderdveld', x, y: 0, w: 470, z: 1, props: { cols: 20, fontSize: 'xl' } });

describe('a widened card stays inside the board', () => {
    test('capWidenedWidth: only widened cards, only when measured, never below the floor', () => {
        expect(capWidenedWidth(909, true, 140, 900)).toBe(752);
        expect(capWidenedWidth(909, true, 0, 1280)).toBe(909);
        expect(capWidenedWidth(909, true, 800, 900)).toBe(240);
        expect(capWidenedWidth(470, false, 140, 300)).toBe(470);
        expect(capWidenedWidth(909, true, 140, 0)).toBe(909);
    });

    test('WidgetFrame at x = 140 on a 900 px board: right edge inside the board, the zoom shrinks', () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(900);
        const widget = wide(140);
        const { container } = render(<div><WidgetFrame widget={widget} selected={false}><div /></WidgetFrame></div>);
        const w = parseFloat((container.querySelector('[data-widget-frame]') as HTMLElement).style.width);
        expect(140 + w).toBeLessThanOrEqual(900);
        const zoomed = container.querySelector('[data-widget-body] > div') as HTMLElement;
        expect(parseFloat(zoomed.style.zoom)).toBeCloseTo((w - 2) / cardNaturalWidth(widget), 6);
    });

    test('on a wide board the card keeps its widened size', () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1920);
        const { container } = render(<div><WidgetFrame widget={wide(140)} selected={false}><div /></WidgetFrame></div>);
        expect(parseFloat((container.querySelector('[data-widget-frame]') as HTMLElement).style.width)).toBeGreaterThan(900);
    });
});
