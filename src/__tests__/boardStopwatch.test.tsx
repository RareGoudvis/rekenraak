// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cleanup, screen, fireEvent, act } from '@testing-library/react';
import { stopwatchProps, formatElapsed } from '../board/settings/stopwatchModel';
import StopwatchWidget from '../board/components/widgets/StopwatchWidget';
import { st, w, liveW, mountWidget, openPanel, click, slide, patch, expectRoundTrip } from './helpers/boardWidgetHarness';

// Stopwatch settings: defaults = the old mm:ss.t stopwatch, every option on the card, the ⚙ panel.
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    st().resetBoard();
});

describe('stopwatch model', () => {
    test('defaults: up, tenths, silent, no laps', () => {
        expect(stopwatchProps(w('stopwatch'))).toEqual({ precision: 'tienden', direction: 'op', fromSec: 60, bigDigits: false, soundAtStop: false, tone: 'piep', spaceKey: false, autoStart: false, showLaps: false, laps: [] });
    });
    test('junk falls back per field', () => {
        expect(stopwatchProps(w('stopwatch', { precision: 'ms', fromSec: 'lang', laps: 'x', tone: 'toeter' }))).toMatchObject({ precision: 'tienden', fromSec: 60, laps: [], tone: 'piep' });
    });
    test('formats seconds, tenths and hundredths', () => {
        expect(formatElapsed(83_456, 'seconden')).toEqual({ main: '01:23', sub: '' });
        expect(formatElapsed(83_456, 'tienden')).toEqual({ main: '01:23', sub: '.4' });
        expect(formatElapsed(83_456, 'honderdsten')).toEqual({ main: '01:23', sub: '.45' });
    });
});

describe('stopwatch widget', () => {
    test('laps are recorded into props, hundredths shown', () => {
        vi.useFakeTimers();
        const { live, container } = mountWidget('stopwatch', { showLaps: true, precision: 'honderdsten' }, StopwatchWidget);
        expect(container.textContent).toContain('00:00.00');
        act(() => { fireEvent.click(screen.getByLabelText('Start')); });
        act(() => { vi.advanceTimersByTime(1500); });
        act(() => { fireEvent.click(screen.getByLabelText('Ronde')); });
        expect(live().props!.laps).toHaveLength(1);
        expect(container.querySelector('[data-stopwatch-laps]')!.textContent).toContain('Ronde 1');
    });

    test('counts down from the start value; the space bar starts and stops', () => {
        vi.useFakeTimers();
        const { container } = mountWidget('stopwatch', { direction: 'af', fromSec: 90, spaceKey: true, precision: 'seconden' }, StopwatchWidget);
        expect(container.textContent).toContain('01:30');
        act(() => { fireEvent.keyDown(window, { code: 'Space' }); });
        act(() => { vi.advanceTimersByTime(2050); });
        expect(container.textContent).toContain('01:28');
        act(() => { fireEvent.keyDown(window, { code: 'Space' }); });
        act(() => { vi.advanceTimersByTime(3000); });
        expect(container.textContent).toContain('01:28');
    });

    test('the space bar is ignored while typing in a field', () => {
        const { container } = mountWidget('stopwatch', { spaceKey: true }, StopwatchWidget);
        const input = document.createElement('input');
        document.body.appendChild(input);
        act(() => { fireEvent.keyDown(input, { code: 'Space' }); });
        expect(screen.getByLabelText('Start')).toBeTruthy();
        input.remove();
        expect(container).toBeTruthy();
    });

    test('auto-start runs from mount; big digits grow', () => {
        vi.useFakeTimers();
        const { container } = mountWidget('stopwatch', { autoStart: true, bigDigits: true }, StopwatchWidget);
        expect(screen.getByLabelText('Stop')).toBeTruthy();
        const px = parseInt((container.querySelector('[data-stopwatch-digits]') as HTMLElement).style.fontSize);
        expect(px).toBeGreaterThan(52);
    });

    test('digits take the accent colour', () => {
        const { container } = mountWidget('stopwatch', { accent: '#166534' }, StopwatchWidget);
        expect((container.querySelector('[data-stopwatch-digits]') as HTMLElement).style.color).toBe('rgb(22, 101, 52)');
    });
});

describe('stopwatch panel', () => {
    test('every control writes the widget and survives save + load', () => {
        const id = openPanel('stopwatch');
        click('00:00.00');
        click('Aftellen');
        slide('Aftellen vanaf', 300);
        for (const s of ['Grote cijfers', 'Rondeknop tonen', 'Spatiebalk start en stopt', 'Meteen starten bij openen', 'Geluid bij stoppen']) click(s, 'switch');
        click('Gong');
        expect(stopwatchProps(liveW(id))).toMatchObject({ precision: 'honderdsten', direction: 'af', fromSec: 300, bigDigits: true, showLaps: true, spaceKey: true, autoStart: true, soundAtStop: true, tone: 'gong' });
        patch(id, { laps: [1000, 2500] });
        click('Rondes wissen (2)');
        expect(liveW(id).props!.laps).toEqual([]);
        expectRoundTrip(id);
    });
});
