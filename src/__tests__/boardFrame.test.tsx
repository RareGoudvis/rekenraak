// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within, screen } from '@testing-library/react';
import BoardBottomBar from '../board/components/BoardBottomBar';
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

describe('headerless cards', () => {
    const bare: BoardWidget = { id: 'g1', kind: 'getallenlijn', x: 40, y: 40, w: 640, z: 1, props: { showHeader: false } };
    const seed = (w: BoardWidget) => {
        const st = useBoardStore.getState();
        useBoardStore.setState({ pages: st.pages.map((p, i) => (i === st.activePageIdx ? { ...p, widgets: [w] } : p)) });
    };
    const pill = (c: HTMLElement) => c.querySelector('[data-widget-pill]') as HTMLElement;
    const widgets = () => useBoardStore.getState().pages[useBoardStore.getState().activePageIdx].widgets;

    test('the controls pill stays hidden until hover, and hover reveals all controls', () => {
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        const frame = container.firstElementChild as HTMLElement;
        expect(pill(container).style.opacity).toBe('0');
        expect(pill(container).style.pointerEvents).toBe('none');
        fireEvent.pointerEnter(frame, { pointerType: 'mouse' });
        expect(pill(container).style.opacity).toBe('1');
        for (const label of ['Widget-instellingen', 'Dupliceren', 'Verwijderen']) {
            expect(within(pill(container)).getByLabelText(label)).toBeTruthy();
        }
        fireEvent.pointerLeave(frame, { pointerType: 'mouse' });
        expect(pill(container).style.opacity).toBe('0');
    });

    test('a selected card (tap / keyboard) shows the pill without hover, and its ⚙ opens the inspector', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected><div /></WidgetFrame>);
        expect(pill(container).style.opacity).toBe('1');
        fireEvent.click(within(pill(container)).getByLabelText('Widget-instellingen'));
        expect(useBoardStore.getState().inspectorOpen).toBe(true);
        expect(useBoardStore.getState().selectedWidgetId).toBe('g1');
    });

    test('keyboard focus inside the card reveals the pill', () => {
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        fireEvent.focus(within(pill(container)).getByLabelText('Dupliceren'));
        expect(pill(container).style.opacity).toBe('1');
    });

    test('delete in the pill removes the widget, exactly like the title-bar delete', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected><div /></WidgetFrame>);
        fireEvent.click(within(pill(container)).getByLabelText('Verwijderen'));
        expect(widgets()).toHaveLength(0);
    });

    test('a press on the pill does not start a body drag', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        fireEvent.pointerDown(within(pill(container)).getByLabelText('Dupliceren'));
        expect(useBoardStore.getState().selectedWidgetId).toBeNull();
    });

    test('the body is the drag handle in select mode', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        const frame = container.firstElementChild as HTMLElement;
        frame.setPointerCapture = () => {};
        fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(frame, { clientX: 160, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(frame, { pointerId: 1 });
        expect(useBoardStore.getState().selectedWidgetId).toBe('g1');
        expect([widgets()[0].x, widgets()[0].y]).toEqual([100, 70]);
    });

    test('with the title bar on, the controls live in the bar and there is no pill', () => {
        const withBar: BoardWidget = { ...bare, props: {} };
        const { container } = render(<WidgetFrame widget={withBar} selected><div /></WidgetFrame>);
        expect(pill(container)).toBeNull();
        expect(within(container).getByLabelText('Verwijderen')).toBeTruthy();
        expect(within(container).getByText('Getallenlijn')).toBeTruthy();
    });
});

describe('a dark board', () => {
    // The cards stay white paper on a black board, so their text must stay dark: white ink
    // (the pre-card look) made notes, names and the weather vanish.
    test('card text stays dark ink on a dark board', () => {
        const st = useBoardStore.getState();
        st.setBackground({ pattern: 'raster', dark: true });
        st.addWidget({ kind: 'tekst', x: 0, y: 0, w: 360, props: { text: 'hoi' } });
        st.addWidget({ kind: 'klok', x: 0, y: 0, w: 300, props: { showDigital: true } });
        st.addWidget({ kind: 'namen', x: 0, y: 0, w: 340, props: {} });
        const { container } = render(<BoardPageCanvas />);
        const bodies = [...container.querySelectorAll<HTMLElement>('[data-widget-body] *')];
        expect(bodies.length).toBeGreaterThan(0);
        const white = bodies.filter(el => /^(#fff|#ffffff|rgb(255, 255, 255))$/i.test(el.style.color));
        expect(white).toEqual([]);
        expect(container.querySelector('textarea')!.style.color).toBe('rgb(17, 17, 17)');
    });
});

describe('bottom bar on a narrow board', () => {
    // At 1280 px the exit button was cut off the right edge (BUGS 2026-10-08).
    test('below 1600 px the exit is an icon button and the bar wraps instead of clipping', () => {
        const real = window.matchMedia;
        window.matchMedia = ((q: string) => ({ ...real(q), matches: q.includes('1599px') })) as typeof window.matchMedia;
        try {
            const { container } = render(<BoardBottomBar onOpenWiskunde={() => { }} />);
            const exit = screen.getByRole('button', { name: 'Bordmodus verlaten' });
            expect(exit.textContent).toBe('');
            expect((container.firstElementChild as HTMLElement).style.flexWrap).toBe('wrap');
        } finally { window.matchMedia = real; }
    });
    test('a wide board keeps the labelled exit', () => {
        render(<BoardBottomBar onOpenWiskunde={() => { }} />);
        expect(screen.getByRole('button', { name: 'Bordmodus verlaten' }).textContent).toContain('Bordmodus verlaten');
    });
});
