// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { loadInkSettings } from '../board/boardPersistence';
import { ERASER_RANGE, INK_WIDTH_RANGE, clampInkWidth } from '../board/boardTypes';
import { eraserCursor, stripColors } from '../board/inkGeometry';
import InkRail from '../board/components/InkRail';
import InkLayer from '../board/components/InkLayer';
import BoardRail from '../board/components/BoardRail';

// The rail's ink section (round 3, column in round 4): always visible, one column of standard colours
// + picker over a vertical size slider with the dot and number under it; it follows the active ink tool, the gom drives the slider, other tools grey it.
const st = () => useBoardStore.getState();
const slider = (name: string) => screen.getByRole('slider', { name }) as HTMLInputElement;
const section = (c: HTMLElement) => c.querySelector('[data-ink-rail]') as HTMLElement;
const swatchLabels = (c: HTMLElement) => [...c.querySelectorAll('[data-ink-swatches] button, [data-ink-swatches] input')].map(b => b.getAttribute('aria-label'));

beforeAll(() => {
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
});

beforeEach(() => {
    st().resetBoard();
    useBoardStore.setState({ tool: 'pen', inkSettings: loadInkSettings(), eraserSize: ERASER_RANGE.default });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('width clamp', () => {
    test('pen 2–10, marker 8–32, rounded', () => {
        expect(clampInkWidth('pen', 1)).toBe(2);
        expect(clampInkWidth('pen', 40)).toBe(10);
        expect(clampInkWidth('pen', 6.6)).toBe(7);
        expect(clampInkWidth('marker', 2)).toBe(8);
        expect(clampInkWidth('marker', 99)).toBe(32);
        expect(INK_WIDTH_RANGE.marker).toEqual({ min: 8, max: 32 });
    });

    test('the slider is always there and takes the active tool\'s range; it writes a clamped width', () => {
        render(<InkRail />);
        expect([slider('Dikte').min, slider('Dikte').max, slider('Dikte').value]).toEqual(['2', '10', '4']);
        act(() => { st().setTool('marker'); });
        const s = slider('Dikte');
        expect([s.min, s.max, s.value]).toEqual(['8', '32', '18']);
        act(() => { fireEvent.change(s, { target: { value: '30' } }); });
        expect(st().inkSettings.marker.width).toBe(30);
        expect(st().inkSettings.pen.width).toBe(4);
    });

    test('an old saved width outside the range shows clamped', () => {
        st().setInkSetting('pen', { width: 28 });
        render(<InkRail />);
        expect(slider('Dikte').value).toBe('10');
    });
});

describe('the swatches', () => {
    test('three standard colours per tool: Standaard / blauw / rood for the pen, the own default first otherwise', () => {
        expect(stripColors('pen')).toEqual({ auto: true, colors: ['#1d4ed8', '#dc2626'] });
        expect(stripColors('marker')).toEqual({ auto: false, colors: ['#fde047', '#1d4ed8', '#dc2626'] });
        expect(stripColors('shape')).toEqual({ auto: false, colors: ['#1d4ed8', '#dc2626', '#111827'] });
    });

    test('one column, top to bottom: A, blauw, rood, the picker; vormen get zwart instead of A', () => {
        const { container } = render(<InkRail />);
        expect(swatchLabels(container)).toEqual(['Standaardkleur (volgt het bord)', 'Kleur #1d4ed8', 'Kleur #dc2626', 'Eigen kleur']);
        act(() => { st().setTool('shape'); });
        expect(swatchLabels(container)).toEqual(['Kleur #1d4ed8', 'Kleur #dc2626', 'Kleur #111827', 'Eigen kleur']);
        expect(section(container).getAttribute('data-ink-rail')).toBe('shape');
        // A single column: the sizes (and its one track) come from the rail height in index.css.
        expect(container.querySelector('[data-ink-swatches]')!.className).toBe('board-ink-swatches');
        expect(container.querySelectorAll('[data-ink-swatches] .board-ink-swatch')).toHaveLength(4);
    });

    test('the size dot and the number sit under the slider, one above the other', () => {
        const { container } = render(<InkRail />);
        const kids = [...section(container).children];
        const part = (k: Element) => k.hasAttribute('data-ink-swatches') ? 'swatches' : k.hasAttribute('data-ink-preview') ? 'preview' : k.getAttribute('type');
        expect(kids.map(part)).toEqual(['swatches', 'range', 'preview']);
        const preview = kids[2] as HTMLElement;
        expect(preview.style.flexDirection).toBe('column');
        expect(preview.children[0].querySelector('[data-ink-dot]')).toBeTruthy();
        expect(preview.children[1].textContent).toBe('4');
        act(() => { st().setTool('eraser'); });
        expect(preview.children[1].textContent).toBe('14');
    });

    test('a swatch sets the active tool\'s colour only', () => {
        useBoardStore.setState({ tool: 'line' });
        render(<InkRail />);
        act(() => { fireEvent.click(screen.getByLabelText('Kleur #dc2626')); });
        expect(st().inkSettings.line.color).toBe('#dc2626');
        expect(st().inkSettings.pen.color).toBeNull();
    });

    test('a closed picker pick is kept; the last four show as chips only while the picker is open', () => {
        const { container } = render(<InkRail />);
        const picker = screen.getByLabelText('Eigen kleur');
        for (const c of ['#00ff00', '#ff00ff', '#00ffff', '#123456', '#654321']) {
            act(() => { fireEvent.change(picker, { target: { value: c } }); });
        }
        expect(st().inkSettings.pen.color).toBe('#654321');
        expect(container.querySelector('[data-ink-chips]')).toBeNull();
        act(() => { fireEvent.click(picker); });
        const chips = within(container.querySelector('[data-ink-chips]') as HTMLElement);
        expect(chips.getAllByTitle('Eerder gekozen kleur').map(b => b.getAttribute('aria-label')))
            .toEqual(['Kleur #654321', 'Kleur #123456', 'Kleur #00ffff', 'Kleur #ff00ff']);
        act(() => { fireEvent.click(chips.getByLabelText('Kleur #00ffff')); });
        expect(st().inkSettings.pen.color).toBe('#00ffff');
        expect(container.querySelector('[data-ink-chips]')).toBeNull();
        // Escape and a press outside close them too.
        act(() => { fireEvent.click(picker); });
        act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
        expect(container.querySelector('[data-ink-chips]')).toBeNull();
        act(() => { fireEvent.click(picker); });
        act(() => { fireEvent.pointerDown(document.body); });
        expect(container.querySelector('[data-ink-chips]')).toBeNull();
    });
});

describe('the state follows the tool', () => {
    test('gom: the slider is the gom size (8–40), the swatches are disabled', () => {
        const { container } = render(<InkRail />);
        act(() => { st().setTool('eraser'); });
        expect(section(container).getAttribute('data-ink-state')).toBe('eraser');
        const s = slider('Gomgrootte');
        expect([s.min, s.max, s.value, s.disabled]).toEqual(['8', '40', '14', false]);
        act(() => { fireEvent.change(s, { target: { value: '30' } }); });
        expect(st().eraserSize).toBe(30);
        expect((screen.getByLabelText('Kleur #1d4ed8') as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByLabelText('Eigen kleur') as HTMLInputElement).disabled).toBe(true);
    });

    test('a non-ink tool keeps the last ink tool\'s settings, greyed and read-only', () => {
        st().setInkSetting('marker', { width: 24 });
        const { container } = render(<InkRail />);
        act(() => { st().setTool('marker'); });
        act(() => { st().setTool('select'); });
        const sec = section(container);
        expect(sec.getAttribute('data-ink-state')).toBe('idle');
        expect(sec.getAttribute('data-ink-rail')).toBe('marker');
        expect(sec.style.opacity).toBe('0.5');
        const s = slider('Dikte');
        expect([s.value, s.disabled]).toEqual(['24', true]);
        expect((screen.getByLabelText('Kleur #fde047') as HTMLButtonElement).disabled).toBe(true);
    });

    test('in the rail: between the tools and undo, the Gom button only picks the tool', () => {
        useBoardStore.setState({ tool: 'select' });
        const { container } = render(<BoardRail addOpen={false} onToggleAdd={() => {}} />);
        const kids = [...(container.querySelector('[data-board-rail]') as HTMLElement).children];
        const ink = kids.findIndex(k => k.hasAttribute('data-ink-rail'));
        expect(kids[ink - 2].getAttribute('data-board-menu')).toBe('instruments');
        expect(kids[ink + 2].getAttribute('aria-label')).toBe('Ongedaan maken');
        fireEvent.click(screen.getByRole('button', { name: 'Gom' }));
        expect(st().tool).toBe('eraser');
        expect(container.querySelector('[data-rail-flyout]')).toBeNull();
        expect(slider('Gomgrootte').value).toBe('14');
    });
});

describe('the gom', () => {
    test('the cursor is a ring of the eraser\'s size, with a crosshair fallback', () => {
        const c = eraserCursor(20);
        expect(c).toMatch(/^url\("data:image\/svg\+xml,.*"\) 22 22, crosshair$/);
        expect(decodeURIComponent(c)).toContain('r="20"');
        useBoardStore.setState({ tool: 'eraser', eraserSize: 20 });
        const { container } = render(<InkLayer active />);
        expect((container.querySelector('svg') as SVGSVGElement).style.cursor).toContain('crosshair');
    });

    test('erasing reaches as far as the size says', () => {
        st().addStroke({ id: 'a', tool: 'pen', color: '#111827', width: 2, path: 'M 0 0 L 100 0', pts: [0, 0, 100, 0] });
        useBoardStore.setState({ tool: 'eraser', eraserSize: 10 });
        const { container } = render(<InkLayer active />);
        const svg = container.querySelector('svg')!;
        // 25 px below the line: out of reach at 10, inside at 30.
        act(() => { fireEvent.pointerDown(svg, { clientX: 50, clientY: 25, pointerId: 1 }); fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(st().pages[0].strokes).toHaveLength(1);
        act(() => { st().setEraserSize(30); });
        act(() => { fireEvent.pointerDown(svg, { clientX: 50, clientY: 25, pointerId: 1 }); fireEvent.pointerUp(svg, { pointerId: 1 }); });
        expect(st().pages[0].strokes).toHaveLength(0);
    });
});
