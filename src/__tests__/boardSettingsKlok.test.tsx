// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen, within } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import KlokWidget from '../board/components/widgets/KlokWidget';
import BoardClockFace from '../board/components/widgets/BoardClockFace';
import AnalogClockSVG from '../components/viewer/AnalogClockSVG';
import { klokModel, digitalTime } from '../board/settings/klokModel';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Klok ⚙: analoog/digitaal/beide, set vs live time, seconds hand, 12/24 h, face style and
// size, minute numbers, 24-hour ring, hands, written time.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="k"><KlokWidget widget={w} dark={false} /></div><WidgetInspector widget={w} /></> : null;
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }); vi.setSystemTime(new Date(2026, 9, 9, 14, 5, 30)); });
afterEach(() => { vi.useRealTimers(); cleanup(); localStorage.clear(); st().resetBoard(); });

describe('klok model', () => {
    test('an old board reads as before, and the classic face draws the sheet clock exactly', () => {
        const w: BoardWidget = { id: 'w', kind: 'klok', x: 0, y: 0, w: 300, z: 1, props: { hours: 9, minutes: 0 } };
        expect(klokModel(w)).toMatchObject({ faceStyle: 'klassiek', faceSize: 'normaal', ring24: false, minuteNumbers: false, showSeconds: false, live: false, clock24: true });
        const strip = (el: Element) => el.outerHTML.replace(/ data-face-style="[^"]*"/, '');
        const sheet = render(<AnalogClockSVG hours={9} minutes={35} showHourHand showMinuteHand is24hour={false} size={240} />).container.firstElementChild!;
        const board = render(<BoardClockFace hours={9} minutes={35} seconds={null} showHourHand showMinuteHand ring24={false} minuteNumbers={false} faceStyle="klassiek" size={240} accent={null} />).container.firstElementChild!;
        expect(strip(board)).toBe(strip(sheet));
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'klok', x: 0, y: 0, w: 300, z: 1, props: { faceStyle: 'disco', faceSize: 9, ring24: 'ja', live: 1, clock24: null, showSeconds: 'x' } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(klokModel(f.pages[0].widgets[0])).toMatchObject({ faceStyle: 'klassiek', faceSize: 'normaal', ring24: false, live: false, clock24: true, showSeconds: false });
    });

    test('digital time in 24 and 12 hours', () => {
        expect(digitalTime(13, 5, null, true)).toBe('13:05');
        expect(digitalTime(13, 5, 9, true)).toBe('13:05:09');
        expect(digitalTime(13, 5, null, false)).toBe('1:05');
        expect(digitalTime(0, 30, null, false)).toBe('12:30');
    });
});

describe('klok settings', () => {
    test('panel edits reach the widget and survive a save/load', () => {
        const id = st().addWidget({ kind: 'klok', x: 0, y: 0, w: 300, props: { hours: 13, minutes: 45 } });
        const { container } = render(<Board id={id} />);
        const k = screen.getByTestId('k');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Beide' })); });
        expect(k.textContent).toContain('13:45');
        act(() => { fireEvent.click(screen.getByRole('button', { name: '1:45' })); });
        expect(k.textContent).toContain('1:45');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Kinder' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Minuten rond de klok (5, 10, …)' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: '24-uursring (13 tot 24)' })); });
        expect(k.querySelector('svg')!.getAttribute('data-face-style')).toBe('kinder');
        const labels = [...k.querySelectorAll('svg text')].map(t => t.textContent);
        expect(labels).toContain('55');
        expect(labels).toContain('24');
        // Live time: the real clock, a seconds hand, no dragging.
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Echte tijd' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Secondewijzer' })); });
        expect(k.textContent).toContain('2:05:30');
        expect(container.querySelector('[data-seconds-hand]')).not.toBeNull();
        act(() => { vi.advanceTimersByTime(2000); });
        expect(k.textContent).toContain('2:05:32');
        expect(klokModel(live(id))).toMatchObject({ showAnalog: true, showDigital: true, clock24: false, faceStyle: 'kinder', minuteNumbers: true, ring24: true, live: true, showSeconds: true, hours: 13, minutes: 45 });
        act(() => { fireEvent.click(within(screen.getByRole('group', { name: 'Grootte' })).getByRole('button', { name: 'Groot' })); });
        saveBoardAutosave(st().pages, 0);
        expect(klokModel(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(klokModel(live(id)));
    });

    test('the written time and the hands toggles', () => {
        const id = st().addWidget({ kind: 'klok', x: 0, y: 0, w: 300, props: { hours: 7, minutes: 45 } });
        render(<Board id={id} />);
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Geschreven tijd tonen' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'kwart voor 8' })); });
        expect(screen.getByTestId('k').textContent).toContain('kwart voor 8');
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Uurwijzer' })); });
        expect(klokModel(live(id)).showHourHand).toBe(false);
    });
});
