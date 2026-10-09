// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetFrame from '../board/components/WidgetFrame';
import PositietabelWidget from '../board/components/widgets/PositietabelWidget';
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

describe('the fit settles', () => {
    test('a pixel of glyph rounding under the zoom (618 / 619 px) does not flip the fit forever', () => {
        let n = 0;
        spies[1].mockImplementation(function (this: HTMLElement) {
            if (!this.querySelector('[data-test-w]')) return BODY_W;
            return this.style.zoom ? 618 + (n++ % 2) : 590;
        });
        const err = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { container } = render(<WidgetFrame widget={card('honderdveld', { props: { fontSize: 'xl' } })} selected={false}><div data-test-w="1" /></WidgetFrame>);
        expect(err).not.toHaveBeenCalled();
        err.mockRestore();
        expect(fitOf(container)).toBeGreaterThan(0.48);
        expect(fitOf(container)).toBeLessThan(0.53);
    });
});

describe('positietabel sizes its type to the width it really gets', () => {
    // At XL the frame lays the card out at 480 / 1.5 px, not 480: thirteen columns sized for 452 px
    // clipped their labels and digits. Header type is min(20, column × 0.42).
    const ALL = ['Mrd', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E', 't', 'h', 'd'];
    const labelPx = (fontSize: string) => {
        const w = card('positietabel', { w: 480, props: { fontSize, columns: ALL, digitSize: 40, header: 'afkorting' } });
        const { getByText } = render(<PositietabelWidget widget={w} />);
        const px = parseFloat(getByText('Mrd').style.fontSize);
        cleanup();
        return px;
    };

    test('normaal keeps the 452 px budget', () => {
        expect(labelPx('normaal')).toBeCloseTo(((452 - 18) / 13) * 0.42, 2);
    });

    test('XL budgets 480 / 1.5 − 28 px', () => {
        expect(labelPx('xl')).toBeCloseTo(((480 / 1.5 - 28 - 18) / 13) * 0.42, 2);
    });
});
