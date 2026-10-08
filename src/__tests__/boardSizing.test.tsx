// @vitest-environment jsdom
import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import {
    NATURAL_W, TITLE_DEFAULTS, KINDS_WITH_SETTINGS, naturalWidth, widgetTitle,
    klokProps, weerProps, datumProps, DATUM_COLORS, dobbelProps, ademProps, groepjesProps,
    checklistItems, werksymbolenProps, WERKSYMBOLEN,
    loadNames, NAMES_KEY,
} from '../board/widgetSizing';
import { staggerPos, addBasicWidget } from '../board/addWidgets';
import { TOOL_CATALOG, runTool } from '../board/toolCatalog';
import { useBoardStore } from '../board/useBoardStore';
import WidgetFrame from '../board/components/WidgetFrame';
import type { BoardWidget, WidgetKind } from '../board/boardTypes';

// Widget sizing is a uniform zoom (frame zoom = inner width / natural width), so the maths
// lives in plain numbers: natural widths, the add-time width, the grip, the height cap.
const ALL_KINDS = Object.keys(NATURAL_W) as WidgetKind[];
const w = (kind: WidgetKind, props?: Record<string, unknown>): BoardWidget => ({ id: 'w', kind, x: 0, y: 0, w: 300, z: 1, props });

beforeAll(() => {
    // jsdom has no pointer capture; the frame calls it on every drag start.
    HTMLElement.prototype.setPointerCapture ??= () => {};
    HTMLElement.prototype.releasePointerCapture ??= () => {};
});

afterEach(() => {
    cleanup();
    localStorage.clear();
    useBoardStore.getState().resetBoard();
    useBoardStore.setState({ gridSnap: false, gridSize: 40, tool: 'select' });
});

describe('natural widths and titles', () => {
    test('every kind has a natural width, a default title, and an unknown kind falls back', () => {
        for (const k of ALL_KINDS) {
            expect(naturalWidth(k)).toBeGreaterThan(0);
            expect(TITLE_DEFAULTS[k]).toBeTruthy();
        }
        expect(naturalWidth('bogus' as WidgetKind)).toBe(400);
        expect(widgetTitle(w('bogus' as WidgetKind))).toBe('Widget');
        expect(KINDS_WITH_SETTINGS.every((k) => ALL_KINDS.includes(k))).toBe(true);
    });

    test('a typed title wins; blank or non-string falls back to the kind default', () => {
        expect(widgetTitle(w('klok', { title: 'Speeltijd' }))).toBe('Speeltijd');
        expect(widgetTitle(w('klok', { title: '   ' }))).toBe('Klok');
        expect(widgetTitle(w('klok', { title: 7 }))).toBe('Klok');
        expect(widgetTitle(w('timer'))).toBe('Timer');
    });

    test.each(TOOL_CATALOG.filter((t) => t.w != null).map((t) => [t.id, t] as const))(
        'catalogue tool %s adds at its natural width (zoom ≈ 1)', (_id, def) => {
            expect(def.w).toBe(naturalWidth(def.kind as WidgetKind));
        });
});

describe('initial size per widget kind', () => {
    test.each(TOOL_CATALOG.map((t) => [t.id, t] as const))('runTool(%s)', (_id, def) => {
        const ok = runTool(def);
        const s = useBoardStore.getState();
        if (def.kind === 'afbeelding-picker') {
            expect(ok).toBe(false);
            expect(s.pages[0].widgets).toHaveLength(0);
            return;
        }
        expect(ok).toBe(true);
        if (def.kind === 'geld-palet') {
            expect(s.geldPaletOpen).toBe(true);
            expect(s.pages[0].widgets).toHaveLength(0);
            useBoardStore.setState({ geldPaletOpen: false });
            return;
        }
        const added = s.pages[0].widgets[0];
        expect(added.kind).toBe(def.kind);
        expect(added.w).toBe(def.w ?? 340);
        expect(added.props).toEqual(def.props ?? {});
        // A fresh props object, so editing one widget never edits the catalogue entry.
        if (def.props) expect(added.props).not.toBe(def.props);
        expect(s.selectedWidgetId).toBe(added.id);
    });

    test('addBasicWidget defaults to 320 px wide', () => {
        addBasicWidget('tekst');
        expect(useBoardStore.getState().pages[0].widgets[0].w).toBe(320);
    });
});

describe('stagger', () => {
    test('consecutive adds step 40 px right and down from (60, 40)', () => {
        const seen: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 5; i++) {
            seen.push(staggerPos());
            addBasicWidget('tekst');
        }
        expect(seen).toEqual([0, 1, 2, 3, 4].map((i) => ({ x: 60 + i * 40, y: 40 + i * 40 })));
        const placed = useBoardStore.getState().pages[0].widgets.map((x) => ({ x: x.x, y: x.y }));
        expect(placed).toEqual(seen);
    });

    test('the stagger counts the active page only', () => {
        for (let i = 0; i < 3; i++) addBasicWidget('tekst');
        useBoardStore.getState().addPage();
        expect(staggerPos()).toEqual({ x: 60, y: 40 });
    });

    // Fixed 2026-10-08 (WB3): a new card takes the first free stagger slot.
    test('the 6th widget does not land exactly on the 1st', () => {
        for (let i = 0; i < 6; i++) addBasicWidget('tekst');
        const ws = useBoardStore.getState().pages[0].widgets;
        expect({ x: ws[5].x, y: ws[5].y }).not.toEqual({ x: ws[0].x, y: ws[0].y });
    });
});

describe('the frame: zoom, height cap, grip', () => {
    function mount(widget: Omit<BoardWidget, 'id' | 'z'>) {
        const id = useBoardStore.getState().addWidget(widget);
        const live = () => useBoardStore.getState().pages[0].widgets.find((x) => x.id === id)!;
        const utils = render(<WidgetFrame widget={live()} selected={true}><div>inhoud</div></WidgetFrame>);
        const rerender = () => utils.rerender(<WidgetFrame widget={live()} selected={true}><div>inhoud</div></WidgetFrame>);
        return { ...utils, id, live, rerender };
    }
    const zoomOf = (el: Element | null) => Number((el as HTMLElement).style.zoom);

    test.each(ALL_KINDS)('%s: body zoom = (w − 2) / natural width; the text zoom keeps the layout width', (kind) => {
        const { container } = mount({ kind, x: 0, y: 0, w: 500, scale: 1.25 });
        const body = container.querySelector('[data-widget-body]')!;
        const outer = body.firstElementChild as HTMLElement;
        const inner = outer.firstElementChild as HTMLElement;
        expect(zoomOf(outer)).toBeCloseTo(498 / NATURAL_W[kind], 6);
        expect(outer.style.width).toBe(`${NATURAL_W[kind]}px`);
        expect(zoomOf(inner)).toBe(1.25);
        expect(parseFloat(inner.style.width)).toBeCloseTo(NATURAL_W[kind] / 1.25, 3);
    });

    test.each([[0, 8], [300, 308], [2000, 2008]])('height cap at y = %i: never below 140 px, else the board minus top minus 8', (y, gap) => {
        const { container } = mount({ kind: 'tekst', x: 0, y, w: 360 });
        const frame = container.firstElementChild as HTMLElement;
        // jsdom drops max()/calc() it cannot evaluate: read the declaration we wrote.
        const mh = frame.style.maxHeight || frame.getAttribute('style')!.match(/max-height:\s*([^;]+)/)![1];
        expect(mh).toContain('140px');
        expect(mh).toContain(`100% - ${gap}px`);
    });

    test('grip drag: width follows dx, height is never written, the min width is 150', () => {
        const { container, live, rerender } = mount({ kind: 'klok', x: 10, y: 10, w: 300 });
        const grip = container.querySelector('[aria-label="Grootte aanpassen"]')!;
        act(() => { fireEvent.pointerDown(grip, { clientX: 100, clientY: 100, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(grip, { clientX: 160.4, clientY: 900, pointerId: 1 }); });
        expect(live().w).toBe(360);
        expect(live().x).toBe(10);
        expect(live().y).toBe(10);
        act(() => { fireEvent.pointerMove(grip, { clientX: -5000, clientY: 0, pointerId: 1 }); });
        expect(live().w).toBe(150);
        act(() => { fireEvent.pointerUp(grip, { pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(grip, { clientX: 400, clientY: 0, pointerId: 1 }); });
        expect(live().w).toBe(150);
        rerender();
        const body = container.querySelector('[data-widget-body]')!.firstElementChild;
        expect(zoomOf(body)).toBeCloseTo(148 / NATURAL_W.klok, 6);
    });

    test('title-bar drag moves by dx/dy, clamps at the board edge and snaps to the grid', () => {
        const { container, live } = mount({ kind: 'tekst', x: 100, y: 100, w: 360 });
        const header = container.querySelector('[data-widget-body]')!.previousElementSibling!;
        act(() => { fireEvent.pointerDown(header, { clientX: 0, clientY: 0, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(header, { clientX: 33.6, clientY: -12.2, pointerId: 1 }); });
        expect({ x: live().x, y: live().y }).toEqual({ x: 134, y: 88 });
        act(() => { fireEvent.pointerMove(header, { clientX: -500, clientY: -500, pointerId: 1 }); });
        expect({ x: live().x, y: live().y }).toEqual({ x: 0, y: 0 });
        act(() => { fireEvent.pointerUp(header, { pointerId: 1 }); });

        useBoardStore.setState({ gridSnap: true, gridSize: 40 });
        const snapped = render(<WidgetFrame widget={live()} selected={true}><div /></WidgetFrame>);
        const h2 = snapped.container.querySelector('[data-widget-body]')!.previousElementSibling!;
        act(() => { fireEvent.pointerDown(h2, { clientX: 0, clientY: 0, pointerId: 2 }); });
        act(() => { fireEvent.pointerMove(h2, { clientX: 61, clientY: 99, pointerId: 2 }); });
        expect({ x: live().x, y: live().y }).toEqual({ x: 80, y: 80 });
    });

    test('starting a drag selects the card and brings it to the front', () => {
        useBoardStore.getState().addWidget({ kind: 'tekst', x: 0, y: 0, w: 360 });
        useBoardStore.getState().addWidget({ kind: 'tekst', x: 0, y: 0, w: 360 });
        const { container, id, live } = mount({ kind: 'tekst', x: 0, y: 0, w: 360 });
        useBoardStore.getState().selectWidget(null);
        useBoardStore.getState().bringToFront(useBoardStore.getState().pages[0].widgets[0].id);
        const header = container.querySelector('[data-widget-body]')!.previousElementSibling!;
        act(() => { fireEvent.pointerDown(header, { clientX: 0, clientY: 0, pointerId: 1 }); });
        const zs = useBoardStore.getState().pages[0].widgets.map((x) => x.z);
        expect(live().z).toBe(Math.max(...zs));
        expect(useBoardStore.getState().selectedWidgetId).toBe(id);
    });

    test('the hand tool drags from anywhere and does not select', () => {
        useBoardStore.setState({ tool: 'hand' });
        const { container, live } = mount({ kind: 'tekst', x: 50, y: 50, w: 360 });
        useBoardStore.getState().selectWidget(null);
        const frame = container.firstElementChild!;
        act(() => { fireEvent.pointerDown(frame, { clientX: 0, clientY: 0, pointerId: 1 }); });
        act(() => { fireEvent.pointerMove(frame, { clientX: 20, clientY: 30, pointerId: 1 }); });
        expect({ x: live().x, y: live().y }).toEqual({ x: 70, y: 80 });
        expect(useBoardStore.getState().selectedWidgetId).toBeNull();
    });
});

describe('prop normalisers', () => {
    test('klok defaults and overrides', () => {
        expect(klokProps(w('klok'))).toEqual({ hours: 9, minutes: 0, showAnalog: true, showDigital: false, showText: false, textStyle: 'digitaal', showHourHand: true, showMinuteHand: true });
        expect(klokProps(w('klok', { hours: '7', minutes: 45, showAnalog: false, textStyle: 'tekst', showHourHand: false }))).toMatchObject({ hours: 7, minutes: 45, showAnalog: false, textStyle: 'tekst', showHourHand: false });
    });

    test('weer defaults', () => {
        expect(weerProps(w('weer'))).toEqual({ showWeather: true, showTemp: true, showMinMax: false, showSun: false, showRainPct: false, showRainMm: false });
        expect(weerProps(w('weer', { showTemp: false, showSun: true }))).toMatchObject({ showTemp: false, showSun: true });
    });

    test('datum: unknown colour falls back to blauw', () => {
        expect(datumProps(w('datum'))).toEqual({ showWeekday: true, showDate: true, showTime: false, showSeconds: false, color: 'blauw' });
        expect(datumProps(w('datum', { color: 'roze' })).color).toBe('blauw');
        for (const c of Object.keys(DATUM_COLORS)) expect(datumProps(w('datum', { color: c })).color).toBe(c);
    });

    test('dobbelsteen clamps count 1-3 and sides 2-20, parses the custom list', () => {
        expect(dobbelProps(w('dobbelsteen'))).toEqual({ count: 1, sides: 6, custom: [] });
        expect(dobbelProps(w('dobbelsteen', { count: 0, sides: 1 }))).toMatchObject({ count: 1, sides: 2 });
        expect(dobbelProps(w('dobbelsteen', { count: 9, sides: 99 }))).toMatchObject({ count: 3, sides: 20 });
        expect(dobbelProps(w('dobbelsteen', { custom: ' rood \n\n blauw\n' })).custom).toEqual(['rood', 'blauw']);
    });

    test('adem: in/out ≥ 1, hold ≥ 0', () => {
        expect(ademProps(w('adem'))).toEqual({ inSec: 4, holdSec: 4, outSec: 4 });
        expect(ademProps(w('adem', { inSec: 0, holdSec: -3, outSec: -1 }))).toEqual({ inSec: 1, holdSec: 0, outSec: 1 });
    });

    test('groepjes: mode, minimum 2, rule text', () => {
        expect(groepjesProps(w('groepjes'))).toEqual({ mode: 'aantal', groups: 3, size: 4, mustTogether: '', cannotTogether: '' });
        expect(groepjesProps(w('groepjes', { mode: 'grootte', groups: 1, size: 0, mustTogether: 'A, B', cannotTogether: 5 }))).toEqual({ mode: 'grootte', groups: 2, size: 2, mustTogether: 'A, B', cannotTogether: '' });
    });

    test('checklist: default list, trimmed lines', () => {
        expect(checklistItems(w('checklist'))).toEqual(['boek klaar', 'potlood klaar', 'aan de slag!']);
        expect(checklistItems(w('checklist', { items: ' a \n\n b ' }))).toEqual(['a', 'b']);
    });

    test('werksymbolen: defaults show every mode', () => {
        expect(werksymbolenProps(w('werksymbolen'))).toEqual({ active: 'stil', vertical: false, iconOnly: false, enabled: WERKSYMBOLEN.map((m) => m.key) });
        expect(werksymbolenProps(w('werksymbolen', { active: 'buur', vertical: true, iconOnly: true, enabled: ['buur'] }))).toEqual({ active: 'buur', vertical: true, iconOnly: true, enabled: ['buur'] });
    });

    test('the class list is one name per non-blank line', () => {
        expect(loadNames()).toEqual([]);
        localStorage.setItem(NAMES_KEY, ' Ana \n\nBert\n  \nCas');
        expect(loadNames()).toEqual(['Ana', 'Bert', 'Cas']);
    });
});
