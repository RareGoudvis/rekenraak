// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { cleanup, act, fireEvent, render } from '@testing-library/react';
import { tekstProps } from '../board/settings/tekstModel';
import TekstWidget from '../board/components/widgets/TekstWidget';
import BoardPageCanvas from '../board/components/BoardPageCanvas';
import { st, w, liveW, mountWidget, openPanel, click, slide, expectRoundTrip } from './helpers/boardWidgetHarness';

// Note settings: defaults = the old 26px mono textarea; style, bullets, notebook lines, the panel.
afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
});

describe('tekst model', () => {
    test('defaults: 26px mono, left, transparent, no bullets or lines', () => {
        expect(tekstProps(w('tekst'))).toMatchObject({ textPx: 26, font: 'mono', align: 'left', bg: '', bullets: 'geen', lines: false, wrap: 'terugloop', padding: 0, bold: false, italic: false });
    });
    test('junk falls back per field', () => {
        expect(tekstProps(w('tekst', { textPx: 'groot', align: 'justify', bg: 'geel' }))).toMatchObject({ textPx: 26, align: 'left', bg: '' });
    });
});

describe('tekst widget', () => {
    test('a note placed with the T tool takes the typing at once; one reloaded later does not', () => {
        st().setTool('text');
        const { container, unmount } = render(<BoardPageCanvas />);
        act(() => { fireEvent.pointerDown(container.querySelector('[data-board-canvas]')!, { clientX: 200, clientY: 150 }); });
        const ta = container.querySelector('textarea')!;
        expect(document.activeElement).toBe(ta);
        expect(st().tool).toBe('select');
        unmount();
        act(() => { st().selectWidget(null); });
        const again = render(<BoardPageCanvas />);
        expect(document.activeElement).not.toBe(again.container.querySelector('textarea'));
    });

    test('the default is the old textarea; dark ink on the white card', () => {
        const { container } = mountWidget('tekst', { text: 'hoi' }, (p) => <TekstWidget widget={p.widget} />);
        const ta = container.querySelector('textarea')!;
        expect(ta.style.fontSize).toBe('26px');
        expect(ta.style.color).toBe('rgb(17, 17, 17)');
    });

    test('bullets render a list and a tap swaps to the textarea; style options apply', () => {
        const { container } = mountWidget('tekst', { text: 'een\ntwee', bullets: 'nummers', bold: true, align: 'center', textPx: 40, lines: true }, (p) => <TekstWidget widget={p.widget} />);
        expect(container.querySelectorAll('ol li')).toHaveLength(2);
        const view = container.querySelector('[data-tekst-view]') as HTMLElement;
        expect(view.style.fontWeight).toBe('700');
        expect(view.style.textAlign).toBe('center');
        expect(view.style.backgroundImage).toContain('repeating-linear-gradient');
        act(() => { fireEvent.click(view); });
        expect(container.querySelector('textarea')).toBeTruthy();
    });

    test('the accent colours the text', () => {
        const { container } = mountWidget('tekst', { text: 'hoi', accent: '#b91c1c' }, (p) => <TekstWidget widget={p.widget} />);
        expect(container.querySelector('textarea')!.style.color).toBe('rgb(185, 28, 28)');
    });
});

describe('tekst panel', () => {
    test('every control writes the widget, survives save + load, and a reset keeps the text', () => {
        const id = openPanel('tekst', { text: 'boek\npen' });
        slide('Lettergrootte', 48);
        click('Gewoon');
        click('Vet');
        click('Schuin');
        click('Rechts');
        click('Lichtgeel');
        slide('Binnenmarge', 12);
        click('Eén regel');
        click('• Bolletjes');
        click('Lijntjes (schrift)', 'switch');
        click('Rode lijn');
        expect(tekstProps(liveW(id))).toMatchObject({ text: 'boek\npen', textPx: 48, font: 'sans', bold: true, italic: true, align: 'right', bg: '#fef08a', padding: 12, wrap: 'eenregel', bullets: 'bolletjes', lines: true, lineColor: '#fca5a5' });
        expectRoundTrip(id);
        click('Standaard herstellen');
        click('Ja, terugzetten');
        expect(liveW(id).props).toEqual({ text: 'boek\npen' });
    });
});
