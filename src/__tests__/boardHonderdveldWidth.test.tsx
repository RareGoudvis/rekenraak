// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import WidgetFrame from '../board/components/WidgetFrame';
import { cardNaturalWidth, cardLayoutWidth } from '../board/settings/baseProps';
import { naturalWidth } from '../board/widgetSizing';
import { useBoardStore } from '../board/useBoardStore';
import type { BoardWidget } from '../board/boardTypes';

// A wide honderdveld (20 columns, big text) widens its card instead of shrinking below Normaal.
const hv = (props: Record<string, unknown> = {}, w = 470): BoardWidget => ({ id: 'hv', kind: 'honderdveld', x: 0, y: 0, w, z: 1, props });

afterEach(() => { cleanup(); useBoardStore.getState().resetBoard(); });

describe('cardNaturalWidth', () => {
    test('the default 10 x 10 and every other kind keep their natural width', () => {
        expect(cardNaturalWidth(hv())).toBe(naturalWidth('honderdveld'));
        expect(cardNaturalWidth(hv({ cols: 10, fontSize: 'xl' }))).toBe(naturalWidth('honderdveld'));
        expect(cardNaturalWidth({ id: 'k', kind: 'klok', x: 0, y: 0, w: 300, z: 1 })).toBe(naturalWidth('klok'));
    });
    test('20 columns grow it with the text scale, so the layout width never drops below the grid', () => {
        const normaal = cardNaturalWidth(hv({ cols: 20 }));
        const xl = cardNaturalWidth(hv({ cols: 20, fontSize: 'xl' }));
        expect(normaal).toBeGreaterThan(naturalWidth('honderdveld'));
        expect(xl / normaal).toBeCloseTo(1.5, 5);
        expect(cardLayoutWidth(hv({ cols: 20, fontSize: 'xl' }))).toBeCloseTo(normaal, 5);
    });
    test('more digits per cell need more room (400 cells reach 3 digits, a negative start 4)', () => {
        expect(cardNaturalWidth(hv({ cols: 20, start: -100, count: 100 }))).toBeGreaterThan(cardNaturalWidth(hv({ cols: 20, start: 1, count: 99 })));
    });
});

describe('WidgetFrame widens the card', () => {
    test('outer width = w x factor, the zoom stays what Normaal had', () => {
        const widget = hv({ cols: 20, fontSize: 'xl' });
        const factor = cardNaturalWidth(widget) / naturalWidth('honderdveld');
        const { container } = render(<WidgetFrame widget={widget} selected={false}><div /></WidgetFrame>);
        const frame = container.querySelector('[data-widget-frame]') as HTMLElement;
        expect(parseFloat(frame.style.width)).toBeCloseTo(470 * factor, 3);
        const zoomed = container.querySelector('[data-widget-body] > div') as HTMLElement;
        expect(parseFloat(zoomed.style.zoom)).toBeCloseTo((470 * factor - 2) / cardNaturalWidth(widget), 6);
    });
    test('a card that needs no widening is unchanged', () => {
        const { container } = render(<WidgetFrame widget={hv()} selected={false}><div /></WidgetFrame>);
        expect((container.querySelector('[data-widget-frame]') as HTMLElement).style.width).toBe('470px');
    });
});
