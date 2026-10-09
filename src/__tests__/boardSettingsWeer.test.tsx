// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import WeerWidget from '../board/components/widgets/WeerWidget';
import { weerModel, forecastUrl, beaufort, compass, windText } from '../board/settings/weerModel';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Weer ⚙: units, wind, forecast days, icon style, refresh interval, place name.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;
const WEATHER = {
    current: { temperature_2m: 12.4, weather_code: 3, wind_speed_10m: 22.6, wind_direction_10m: 225 },
    daily: {
        time: ['2026-10-09', '2026-10-10', '2026-10-11'], weather_code: [3, 61, 0],
        temperature_2m_min: [6.1, 7.2, 4.6], temperature_2m_max: [14.9, 13.1, 16.4],
        sunrise: ['2026-10-09T07:58'], sunset: ['2026-10-09T19:12'], precipitation_probability_max: [40], precipitation_sum: [1.2],
    },
};
let fetchMock: ReturnType<typeof vi.fn>;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="weer"><WeerWidget widget={w} dark={false} /></div><WidgetInspector widget={w} /></> : null;
}

const settle = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });

beforeEach(() => {
    fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(WEATHER) }));
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); cleanup(); localStorage.clear(); st().resetBoard(); });

describe('weer model', () => {
    test('an old board reads as before: °C, km/u, no wind, today only, emoji, fetched once, place shown', () => {
        const w: BoardWidget = { id: 'w', kind: 'weer', x: 0, y: 0, w: 360, z: 1, props: { lat: 51, lon: 4, placeName: 'Gent' } };
        expect(weerModel(w)).toMatchObject({ unit: 'C', windUnit: 'kmh', showWind: false, forecastDays: 0, iconStyle: 'emoji', refreshMin: 0, showPlace: true, showTemp: true });
        const url = forecastUrl(51, 4, weerModel(w));
        expect(url).toContain('forecast_days=1');
        expect(url).not.toContain('fahrenheit');
        expect(url).not.toContain('wind_speed_unit');
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'weer', x: 0, y: 0, w: 360, z: 1, props: { unit: 'K', windUnit: 'knopen', forecastDays: 9, iconStyle: 3, refreshMin: 7, showPlace: 0 } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(weerModel(f.pages[0].widgets[0])).toMatchObject({ unit: 'C', windUnit: 'kmh', forecastDays: 5, iconStyle: 'emoji', refreshMin: 0, showPlace: true });
    });

    test('wind helpers', () => {
        expect(beaufort(0)).toBe(0);
        expect(beaufort(22.6)).toBe(4);
        expect(beaufort(130)).toBe(12);
        expect(compass(225)).toBe('ZW');
        expect(compass(359)).toBe('N');
        expect(windText(22.6, 225, 'kmh')).toBe('ZW 23 km/u');
        expect(windText(22.6, null, 'bft')).toBe('4 Bft');
        expect(windText(6.2, 90, 'ms')).toBe('O 6 m/s');
    });
});

describe('weer settings', () => {
    test('panel edits reach the widget (and the request) and survive a save/load', async () => {
        const id = st().addWidget({ kind: 'weer', x: 0, y: 0, w: 360, props: { lat: 51, lon: 4, placeName: 'Gent' } });
        render(<Board id={id} />);
        await settle();
        const w = screen.getByTestId('weer');
        expect(w.textContent).toContain('12°C');
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Wind' })); });
        expect(w.textContent).toContain('ZW 23 km/u');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Beaufort' })); });
        await settle();
        expect(w.textContent).toContain('ZW 4 Bft');
        act(() => { fireEvent.change(screen.getByLabelText('Voorspelling'), { target: { value: '2' } }); });
        await settle();
        expect(String(fetchMock.mock.calls.at(-1)![0])).toContain('forecast_days=3');
        expect(w.querySelector('[data-weer-forecast]')!.children).toHaveLength(2);
        act(() => { fireEvent.click(screen.getByRole('button', { name: '°F' })); });
        await settle();
        expect(String(fetchMock.mock.calls.at(-1)![0])).toContain('temperature_unit=fahrenheit');
        expect(w.textContent).toContain('12°F');
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lijntekening' })); });
        expect(w.querySelector('svg[aria-label="bewolkt"]')).not.toBeNull();
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Plaatsnaam' })); });
        expect(w.textContent).not.toContain('Gent');
        act(() => { fireEvent.click(screen.getByRole('button', { name: '15 min' })); });
        expect(weerModel(live(id))).toMatchObject({ showWind: true, windUnit: 'bft', forecastDays: 2, unit: 'F', iconStyle: 'icoon', showPlace: false, refreshMin: 15 });
        saveBoardAutosave(st().pages, 0);
        expect(weerModel(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(weerModel(live(id)));
    });

    test('a refresh interval fetches again', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        const id = st().addWidget({ kind: 'weer', x: 0, y: 0, w: 360, props: { lat: 51, lon: 4, refreshMin: 15 } });
        render(<Board id={id} />);
        await settle();
        const before = fetchMock.mock.calls.length;
        act(() => { vi.advanceTimersByTime(15 * 60_000); });
        await settle();
        expect(fetchMock.mock.calls.length).toBe(before + 1);
    });
});
