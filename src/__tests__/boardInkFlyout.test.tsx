// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import { loadInkSettings } from '../board/boardPersistence';
import { ERASER_RANGE, INK_WIDTH_RANGE, clampInkWidth } from '../board/boardTypes';
import { eraserCursor, stripColors } from '../board/inkGeometry';
import InkFlyout from '../board/components/InkFlyout';
import InkLayer from '../board/components/InkLayer';
import BoardRail from '../board/components/BoardRail';

// The compact ink strip (round 2): three standard colours + picker + a size dot that opens a
// vertical slider, and the gom's own size slider and round cursor.
const st = () => useBoardStore.getState();
const slider = (name: string) => screen.getByRole('slider', { name }) as HTMLInputElement;

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

    test('the size dot opens a slider with the tool\'s range; the slider writes a clamped width', () => {
        render(<InkFlyout tool="marker" />);
        expect(screen.queryByRole('slider')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Dikte' }));
        const s = slider('Dikte instellen');
        expect([s.min, s.max, s.value]).toEqual(['8', '32', '18']);
        act(() => { fireEvent.change(s, { target: { value: '30' } }); });
        expect(st().inkSettings.marker.width).toBe(30);
        fireEvent.click(screen.getByRole('button', { name: 'Dikte' }));
        expect(screen.queryByRole('slider')).toBeNull();
    });

    test('an old saved width outside the range shows clamped', () => {
        st().setInkSetting('pen', { width: 28 });
        render(<InkFlyout tool="pen" />);
        fireEvent.click(screen.getByRole('button', { name: 'Dikte' }));
        expect(slider('Dikte instellen').value).toBe('10');
    });
});

describe('the strip', () => {
    test('three standard colours per tool: Standaard / blauw / rood for the pen, the own default first otherwise', () => {
        expect(stripColors('pen')).toEqual({ auto: true, colors: ['#1d4ed8', '#dc2626'] });
        expect(stripColors('marker')).toEqual({ auto: false, colors: ['#fde047', '#1d4ed8', '#dc2626'] });
        expect(stripColors('shape')).toEqual({ auto: false, colors: ['#1d4ed8', '#dc2626', '#111827'] });
    });

    test('one row: A, blauw, rood, the picker and the size dot', () => {
        const { container } = render(<InkFlyout tool="pen" />);
        const strip = container.querySelector('[data-ink-strip]') as HTMLElement;
        const labels = [...strip.querySelectorAll('button, input')].map(b => b.getAttribute('aria-label'));
        expect(labels).toEqual(['Standaardkleur (volgt het bord)', 'Kleur #1d4ed8', 'Kleur #dc2626', 'Eigen kleur', 'Dikte']);
    });

    test('a closed picker pick is kept as a small chip under the picker (the last four)', () => {
        const { container } = render(<InkFlyout tool="pen" />);
        const picker = screen.getByLabelText('Eigen kleur');
        for (const c of ['#00ff00', '#ff00ff', '#00ffff', '#123456', '#654321']) {
            act(() => { fireEvent.change(picker, { target: { value: c } }); });
        }
        expect(st().inkSettings.pen.color).toBe('#654321');
        const strip = container.querySelector('[data-ink-strip]') as HTMLElement;
        const chips = within(strip).getAllByTitle('Eerder gekozen kleur').map(b => b.getAttribute('aria-label'));
        expect(chips).toEqual(['Kleur #654321', 'Kleur #123456', 'Kleur #00ffff', 'Kleur #ff00ff']);
        act(() => { fireEvent.click(within(strip).getByLabelText('Kleur #00ffff')); });
        expect(st().inkSettings.pen.color).toBe('#00ffff');
    });
});

describe('the gom', () => {
    test('the rail\'s Gom opens its size slider (8–40)', () => {
        useBoardStore.setState({ tool: 'select' });
        render(<BoardRail addOpen={false} onToggleAdd={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Gom' }));
        expect(st().tool).toBe('eraser');
        const s = slider('Gomgrootte');
        expect([s.min, s.max, s.value]).toEqual(['8', '40', '14']);
        act(() => { fireEvent.change(s, { target: { value: '30' } }); });
        expect(st().eraserSize).toBe(30);
    });

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
