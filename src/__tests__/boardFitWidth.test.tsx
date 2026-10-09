// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetFrame from '../board/components/WidgetFrame';
import { cardFitZoom } from '../board/widgetSizing';
import type { BoardWidget } from '../board/boardTypes';

// A card whose content is wider than its body (an exercise at Tekstgrootte 200 %, a 20-column
// honderdveld at XL, a positietabel at Heel groot) shrinks the content to fit, instead of the
// body's overflow-x: hidden cutting it off on the right. jsdom has no layout: widths are mocked.
const BODY_W = 330;
let spies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
    spies = [
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return BODY_W; }),
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
            const wide = this.querySelector<HTMLElement>('[data-test-w]');
            return wide ? Math.max(BODY_W, Number(wide.dataset.testW)) : BODY_W;
        }),
    ];
});
afterEach(() => {
    cleanup();
    spies.forEach(s => s.mockRestore());
    useBoardStore.getState().resetBoard();
});

const card = (kind: BoardWidget['kind'], extra: Partial<BoardWidget> = {}): BoardWidget =>
    ({ id: 'c1', kind, x: 0, y: 0, w: 660, z: 1, props: {}, ...extra });
const fitOf = (c: HTMLElement) => Number((c.querySelector('[data-widget-fit]') as HTMLElement).style.zoom || 1);

describe('cardFitZoom', () => {
    test('1 when the content fits (or overflows by under a pixel), else the ratio with a safety margin', () => {
        expect(cardFitZoom(330, 330)).toBe(1);
        expect(cardFitZoom(330.4, 330)).toBe(1);
        expect(cardFitZoom(660, 330)).toBeCloseTo(0.485, 3);
        expect(cardFitZoom(0, 0)).toBe(1);
    });
});

describe('cards shrink overflowing content', () => {
    test('an exercise card at 200 % whose rows run 330 px past the body', () => {
        const { container } = render(<WidgetFrame widget={card('exercise', { scale: 2 })} selected={false}><div data-test-w="660" /></WidgetFrame>);
        expect(fitOf(container)).toBeCloseTo(0.485, 3);
    });

    test('a honderdveld at XL that is 1.8x its body', () => {
        const { container } = render(<WidgetFrame widget={card('honderdveld', { props: { fontSize: 'xl' } })} selected={false}><div data-test-w="594" /></WidgetFrame>);
        expect(fitOf(container)).toBeCloseTo(0.539, 3);
    });

    test('content that fits keeps its size, and a regenerated narrower content grows back', () => {
        const { container, rerender } = render(<WidgetFrame widget={card('positietabel')} selected={false}><div data-test-w="500" /></WidgetFrame>);
        expect(fitOf(container)).toBeLessThan(1);
        rerender(<WidgetFrame widget={card('positietabel')} selected={false}><div data-test-w="300" /></WidgetFrame>);
        expect(fitOf(container)).toBe(1);
    });
});
