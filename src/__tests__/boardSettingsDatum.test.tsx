// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import WidgetInspector from '../board/components/WidgetInspector';
import DatumWidget from '../board/components/widgets/DatumWidget';
import { datumModel, formatDate, isoWeek, dayOfYear, season, daysUntil, countdownText } from '../board/settings/datumModel';
import { SELF_SCALED_FONT } from '../board/settings/baseProps';
import { parseBoardFile, saveBoardAutosave, loadBoardAutosave, BOARD_FORMAT_VERSION } from '../board/boardPersistence';
import type { BoardWidget } from '../board/boardTypes';

// Datum ⚙: format, letter case, year, week number, day of year, season, countdown, tint.
const st = () => useBoardStore.getState();
const live = (id: string) => st().pages[st().activePageIdx].widgets.find(w => w.id === id)!;

function Board({ id }: { id: string }) {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets.find(x => x.id === id));
    return w ? <><div data-testid="d"><DatumWidget widget={w} /></div><WidgetInspector widget={w} /></> : null;
}

// Friday 9 October 2026, 08:30 — ISO week 41, day 282, autumn.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 9, 8, 30)); });
afterEach(() => { vi.useRealTimers(); cleanup(); localStorage.clear(); st().resetBoard(); });

describe('datum model', () => {
    test('an old board reads as before: long date with year, capitalised weekday, tinted, no extras', () => {
        const w: BoardWidget = { id: 'w', kind: 'datum', x: 0, y: 0, w: 340, z: 1, props: { color: 'groen' } };
        expect(datumModel(w)).toMatchObject({ format: 'lang', textCase: 'normaal', showYear: true, showWeek: false, showDayOfYear: false, showSeason: false, countdownDate: null, tint: true, color: 'groen' });
        const { container } = render(<DatumWidget widget={w} />);
        expect(container.textContent).toBe('vrijdag9 oktober 2026');
        expect((container.firstElementChild!.firstElementChild as HTMLElement).style.color).toBe('rgb(22, 101, 52)');
        expect(SELF_SCALED_FONT.has('datum')).toBe(true);
    });

    test('junk keys read as defaults after a load', () => {
        const widget = { id: 'w', kind: 'datum', x: 0, y: 0, w: 340, z: 1, props: { format: 'x', textCase: 1, showYear: 0, countdownDate: '2026-13-45', countdownLabel: '  ', tint: null } };
        const f = parseBoardFile(JSON.stringify({ version: BOARD_FORMAT_VERSION, pages: [{ id: 'p', widgets: [widget], strokes: [], background: { pattern: 'blanco', dark: false } }] }))!;
        expect(datumModel(f.pages[0].widgets[0])).toMatchObject({ format: 'lang', textCase: 'normaal', showYear: true, countdownDate: null, countdownLabel: 'de vakantie', tint: true });
    });

    test('date helpers', () => {
        const d = new Date(2026, 9, 9);
        expect(formatDate(d, { format: 'numeriek', showYear: true })).toBe('09/10/2026');
        expect(formatDate(d, { format: 'numeriek', showYear: false })).toBe('09/10');
        expect(formatDate(d, { format: 'lang', showYear: false })).toBe('9 oktober');
        expect(isoWeek(d)).toBe(41);
        expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
        expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
        expect(dayOfYear(d)).toBe(282);
        expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
        expect(season(d).name).toBe('herfst');
        expect(season(new Date(2026, 11, 21)).name).toBe('winter');
        expect(season(new Date(2026, 2, 21)).name).toBe('lente');
        expect(season(new Date(2026, 5, 21)).name).toBe('zomer');
        expect(daysUntil(d, '2026-10-31')).toBe(22);
        expect(countdownText(1, 'de vakantie')).toBe('Nog 1 dag tot de vakantie');
        expect(countdownText(0, 'het schoolfeest')).toBe('Vandaag: het schoolfeest!');
        expect(countdownText(-2, 'x')).toBeNull();
    });
});

describe('datum settings', () => {
    test('panel edits reach the widget and survive a save/load', () => {
        const id = st().addWidget({ kind: 'datum', x: 0, y: 0, w: 340 });
        render(<Board id={id} />);
        const d = screen.getByTestId('d');
        act(() => { fireEvent.click(screen.getByRole('button', { name: '09/10' })); });
        act(() => { fireEvent.click(screen.getByRole('button', { name: 'MAANDAG' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Weeknummer' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Dag van het jaar' })); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Seizoen' })); });
        act(() => { fireEvent.change(screen.getByLabelText('Datum (bv. eerste vakantiedag)'), { target: { value: '2026-10-31' } }); });
        act(() => { fireEvent.change(screen.getByLabelText('Aftellen tot'), { target: { value: 'de herfstvakantie' } }); });
        act(() => { fireEvent.click(screen.getByRole('switch', { name: 'Gekleurde achtergrond' })); });
        expect(d.textContent).toContain('09/10/2026');
        expect(d.textContent).toContain('week 41');
        expect(d.textContent).toContain('dag 282 van het jaar');
        expect(d.textContent).toContain('herfst');
        expect(d.querySelector('[data-datum-countdown]')!.textContent).toBe('Nog 22 dagen tot de herfstvakantie');
        expect((d.firstElementChild!.firstElementChild as HTMLElement).style.textTransform).toBe('uppercase');
        expect(datumModel(live(id))).toMatchObject({ format: 'numeriek', textCase: 'hoofdletters', showWeek: true, tint: false, countdownDate: '2026-10-31' });
        saveBoardAutosave(st().pages, 0);
        expect(datumModel(loadBoardAutosave()!.pages[0].widgets[0])).toEqual(datumModel(live(id)));
        act(() => { fireEvent.click(screen.getByText('Aftellen weghalen')); });
        expect(d.querySelector('[data-datum-countdown]')).toBeNull();
    });
});
