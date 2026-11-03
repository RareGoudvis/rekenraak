// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within, screen } from '@testing-library/react';
import BoardRail from '../board/components/BoardRail';
import BoardTopPill from '../board/components/BoardTopPill';
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

const seed = (w: BoardWidget) => {
    const st = useBoardStore.getState();
    useBoardStore.setState({ pages: st.pages.map((p, i) => (i === st.activePageIdx ? { ...p, widgets: [w] } : p)) });
};
const widgets = () => useBoardStore.getState().pages[useBoardStore.getState().activePageIdx].widgets;
const bar = (c: HTMLElement) => c.querySelector('[data-card-bar]') as HTMLElement;

describe('the title bar (no hover anywhere)', () => {
    test('every card has its bar on screen without hover: title, Instellingen and Meer', () => {
        const { container } = render(<WidgetFrame widget={widget} selected={false}><div /></WidgetFrame>);
        expect(container.querySelector('[data-widget-pill]')).toBeNull();
        const b = bar(container);
        expect(b.style.opacity).toBe('');
        expect(within(b).getByText('Notitie')).toBeTruthy();
        for (const label of ['Instellingen', 'Meer']) expect(within(b).getByLabelText(label)).toBeTruthy();
        // Nieuw and Oplossing are math-card buttons only.
        expect(within(b).queryByLabelText('Nieuwe oefeningen')).toBeNull();
        expect(within(b).queryByLabelText('Oplossing tonen')).toBeNull();
        // Digibord touch targets.
        for (const btn of within(b).getAllByRole('button')) expect(btn.style.width).toBe('40px');
    });

    test('a math card adds Nieuw and Oplossing tonen, in that order before Instellingen', () => {
        const { container } = render(
            <WidgetFrame widget={{ ...widget, kind: 'exercise' }} selected={false} onRegenerate={() => {}} onToggleAnswer={() => {}}><div /></WidgetFrame>);
        const labels = within(bar(container)).getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(labels).toEqual(['Nieuwe oefeningen', 'Oplossing tonen', 'Instellingen', 'Meer']);
    });

    test('Meer: Doorzichtig, Kleiner / Groter, Dupliceren, Verwijderen', () => {
        seed(widget);
        const { container } = render(<WidgetFrame widget={widget} selected><div /></WidgetFrame>);
        fireEvent.click(within(bar(container)).getByLabelText('Meer'));
        const menu = screen.getByRole('menu', { name: 'Meer' });
        fireEvent.click(within(menu).getByText('Groter'));
        expect(widgets()[0].w).toBe(Math.round(360 * 1.2));
        fireEvent.click(within(menu).getByText('Kleiner'));
        expect(widgets()[0].w).toBe(Math.round(Math.round(360 * 1.2) / 1.2));
        fireEvent.click(within(menu).getByText('Dupliceren'));
        expect(widgets()).toHaveLength(2);
        expect(screen.queryByRole('menu')).toBeNull();
        fireEvent.click(within(bar(container)).getByLabelText('Meer'));
        fireEvent.click(within(screen.getByRole('menu')).getByText('Verwijderen'));
        expect(widgets().map(w => w.id)).not.toContain('w1');
    });

    test('the Meer menu closes on Escape and on a press outside, not on one inside', () => {
        render(<WidgetFrame widget={widget} selected><div /></WidgetFrame>);
        fireEvent.click(screen.getByLabelText('Meer'));
        fireEvent.pointerDown(within(screen.getByRole('menu')).getByText('Groter'));
        expect(screen.queryByRole('menu')).not.toBeNull();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        fireEvent.click(screen.getByLabelText('Meer'));
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    test('Doorzichtig in Meer sets the per-card flag, and again clears it', () => {
        seed(widget);
        const { container, rerender } = render(<WidgetFrame widget={widget} selected><div /></WidgetFrame>);
        fireEvent.click(within(bar(container)).getByLabelText('Meer'));
        fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Doorzichtig/ }));
        expect(widgets()[0].props?.transparent).toBe(true);
        rerender(<WidgetFrame widget={widgets()[0]} selected><div /></WidgetFrame>);
        fireEvent.click(within(bar(container)).getByLabelText('Meer'));
        fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Doorzichtig/ }));
        expect(widgets()[0].props?.transparent).toBe(false);
    });

    test('a tap on the title selects; a second tap on the selected card edits it', () => {
        seed(widget);
        const { container, rerender } = render(<WidgetFrame widget={widget} selected={false}><div /></WidgetFrame>);
        const title = () => container.querySelector('[data-card-title]') as HTMLElement;
        fireEvent.pointerDown(title(), { pointerId: 1 });
        fireEvent.pointerUp(title(), { pointerId: 1 });
        expect(useBoardStore.getState().selectedWidgetId).toBe('w1');
        expect(container.querySelector('input[aria-label="Titel"]')).toBeNull();
        rerender(<WidgetFrame widget={widget} selected><div /></WidgetFrame>);
        fireEvent.pointerDown(title(), { pointerId: 1 });
        fireEvent.pointerUp(title(), { pointerId: 1 });
        expect(container.querySelector('input[aria-label="Titel"]')).not.toBeNull();
    });

    test('the bar is the drag handle', () => {
        seed(widget);
        const { container } = render(<WidgetFrame widget={widget} selected={false}><div /></WidgetFrame>);
        fireEvent.pointerDown(bar(container), { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(bar(container), { clientX: 160, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(bar(container), { pointerId: 1 });
        expect([widgets()[0].x, widgets()[0].y]).toEqual([100, 330]);
    });
});

describe('transparent cards', () => {
    const glass: BoardWidget = { ...widget, props: { text: 'hoi', transparent: true } };
    const card = (c: HTMLElement) => c.querySelector('[data-widget-card]') as HTMLElement;

    test('no background, border or shadow; the bar hides until the card is selected', () => {
        const { container } = render(<WidgetFrame widget={glass} selected={false}><div /></WidgetFrame>);
        expect(card(container).style.background).toBe('transparent');
        expect(card(container).style.boxShadow).toBe('none');
        expect(card(container).style.borderColor).toBe('transparent');
        expect(bar(container).style.opacity).toBe('0');
        expect(bar(container).style.pointerEvents).toBe('none');
    });

    test('selected: the bar floats above the card at ~55 % and the card gets a dashed ring', () => {
        const { container } = render(<WidgetFrame widget={glass} selected><div /></WidgetFrame>);
        expect(bar(container).style.opacity).toBe('0.55');
        expect(bar(container).style.position).toBe('absolute');
        expect(card(container).style.outline).toContain('dashed');
        // Floating, not in the card: selecting never shifts the content down.
        expect(card(container).contains(bar(container))).toBe(false);
    });

    test('a math card can be transparent too', () => {
        const { container } = render(
            <WidgetFrame widget={{ ...glass, kind: 'exercise' }} selected onRegenerate={() => {}} onToggleAnswer={() => {}}><div /></WidgetFrame>);
        expect(card(container).style.background).toBe('transparent');
        expect(within(bar(container)).getByLabelText('Nieuwe oefeningen')).toBeTruthy();
    });

    test('a transparent card drags from its body', () => {
        seed(glass);
        const { container } = render(<WidgetFrame widget={glass} selected={false}><div /></WidgetFrame>);
        const frame = container.firstElementChild as HTMLElement;
        fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(frame, { clientX: 160, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(frame, { pointerId: 1 });
        expect(useBoardStore.getState().selectedWidgetId).toBe('w1');
        expect([widgets()[0].x, widgets()[0].y]).toEqual([100, 330]);
    });
});

describe('titleless cards (Titelbalk tonen off)', () => {
    const bare: BoardWidget = { id: 'g1', kind: 'getallenlijn', x: 40, y: 40, w: 640, z: 1, props: { showHeader: false } };

    test('the bar is hidden until the card is selected, then shown in full', () => {
        seed(bare);
        const { container, rerender } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        expect(bar(container).style.opacity).toBe('0');
        rerender(<WidgetFrame widget={bare} selected><div /></WidgetFrame>);
        expect(bar(container).style.opacity).toBe('1');
        fireEvent.click(within(bar(container)).getByLabelText('Instellingen'));
        expect(useBoardStore.getState().inspectorOpen).toBe(true);
        expect(useBoardStore.getState().selectedWidgetId).toBe('g1');
    });

    test('keyboard focus inside the card reveals the bar', () => {
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        fireEvent.focus(within(bar(container)).getByLabelText('Meer'));
        expect(bar(container).style.opacity).toBe('1');
    });

    test('a press on a bar button selects the card but does not start a drag', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        const more = within(bar(container)).getByLabelText('Meer');
        fireEvent.pointerDown(more, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(container.firstElementChild as HTMLElement, { clientX: 160, clientY: 130, pointerId: 1 });
        expect(useBoardStore.getState().selectedWidgetId).toBe('g1');
        expect([widgets()[0].x, widgets()[0].y]).toEqual([40, 40]);
    });

    test('the body is the drag handle in select mode', () => {
        seed(bare);
        const { container } = render(<WidgetFrame widget={bare} selected={false}><div /></WidgetFrame>);
        const frame = container.firstElementChild as HTMLElement;
        fireEvent.pointerDown(frame, { clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(frame, { clientX: 160, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(frame, { pointerId: 1 });
        expect(useBoardStore.getState().selectedWidgetId).toBe('g1');
        expect([widgets()[0].x, widgets()[0].y]).toEqual([100, 70]);
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

describe('the rail (Zijrail)', () => {
    const rail = () => render(<BoardRail addOpen={false} onToggleAdd={() => { }} />);
    const labels = (c: HTMLElement) => [...c.querySelectorAll(':scope > nav button, :scope > nav > div > button')]
        .map(b => b.getAttribute('aria-label'));

    test('top → bottom: Bordinstellingen, tools, undo / redo, Toevoegen last', () => {
        const { container } = rail();
        expect(labels(container)).toEqual([
            'Bordinstellingen', 'Selecteren', 'Pen', 'Markeerstift', 'Gom', 'Tekst (tik op het bord)',
            'Lijn en vormen', 'Meetinstrumenten', 'Ongedaan maken', 'Opnieuw', 'Toevoegen',
        ]);
    });

    test('the rail and its flyouts sit above the inspectors and the add panel', () => {
        const { container } = rail();
        const nav = container.querySelector('[data-board-rail]') as HTMLElement;
        expect(nav.style.position).toBe('relative');
        // BoardInspector / WidgetInspector 50, add panel 60
        expect(Number(nav.style.zIndex)).toBeGreaterThan(60);
        expect(nav.style.width).toBe('72px');
    });

    test('pen: picking it opens its flyout, tapping it again closes it, another tool closes it', () => {
        rail();
        const flyout = () => document.querySelector('[data-ink-flyout="pen"]');
        fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
        expect(useBoardStore.getState().tool).toBe('pen');
        expect(flyout()).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
        expect(flyout()).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
        expect(flyout()).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Gom' }));
        expect(flyout()).toBeNull();
        expect(useBoardStore.getState().tool).toBe('eraser');
    });

    test('lijn en vormen: one button, the flyout picks lijn or a shape', () => {
        rail();
        fireEvent.click(screen.getByRole('button', { name: 'Lijn en vormen' }));
        expect(useBoardStore.getState().tool).toBe('line');
        fireEvent.click(screen.getByRole('button', { name: 'Ellips (Shift: cirkel)' }));
        expect(useBoardStore.getState().tool).toBe('shape');
        expect(useBoardStore.getState().drawOptions.shape).toBe('ellipse');
        expect(screen.getByRole('button', { name: 'Zachte vulling' })).toBeTruthy();
    });

    test('no hover anywhere: the top-right pill carries its words in labels', () => {
        render(<BoardTopPill />);
        for (const n of ['Vorige pagina', 'Volgende pagina', 'Bewaren', 'Bordmodus verlaten']) {
            const b = screen.getByRole('button', { name: n });
            expect(b.textContent).toBe('');
            expect(b.getAttribute('title')).toBeTruthy();
        }
        expect(screen.getByText('1 / 1')).toBeTruthy();
    });
});
