// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cleanup, screen, fireEvent, act } from '@testing-library/react';
import { parseBoardFile } from '../board/boardPersistence';
import { timerProps, formatRemaining } from '../board/settings/timerModel';
import TimerWidget from '../board/components/widgets/TimerWidget';
import { st, w, liveW, mountWidget, openPanel, click, slide, typeIn, expectRoundTrip, boardFile } from './helpers/boardWidgetHarness';

// Timer settings: defaults = the old green pie, every option on the card, the ⚙ panel, and
// the parser's per-field clean-up of a saved timer.
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    st().resetBoard();
});

describe('timer model', () => {
    test('defaults: 5 min pie, mm:ss, flash, silent, pause allowed', () => {
        expect(timerProps(w('timer'))).toMatchObject({ durationSec: 300, color: '', progress: 'taart', display: 'mmss', flashOnEnd: true, endSound: 'geen', allowPause: true, autoRestart: false, warnEnabled: false, inputMode: 'paneel', presets: [1, 2, 5, 10, 15], showPresets: false });
    });
    test('junk falls back per field', () => {
        expect(timerProps(w('timer', { durationSec: -9, progress: 'donut', warnColor: 5, presets: [2, 'x', -1] }))).toMatchObject({ durationSec: 5, progress: 'taart', warnColor: '#dc2626', presets: [2, 0.25] });
    });
    test('formats mm:ss or rounded-up minutes', () => {
        expect(formatRemaining(125, 'mmss')).toBe('02:05');
        expect(formatRemaining(125, 'minuten')).toBe('3 min');
        expect(formatRemaining(42, 'minuten')).toBe('42 s');
        expect(formatRemaining(42, 'geen')).toBe('');
    });
});

describe('parseBoardFile cleans settings props on load', () => {
    test('an old board loads unchanged', () => {
        const old = [
            { id: 'a', kind: 'timer', x: 0, y: 0, w: 300, z: 1, props: { durationSec: 120, color: '#1d4ed8', title: 'Stil werken' } },
            { id: 'c', kind: 'timer', x: 0, y: 0, w: 300, z: 2 },
        ];
        expect(parseBoardFile(boardFile(old))!.pages[0].widgets).toEqual(old);
    });
    test('junk settings are dropped, good ones and foreign keys survive', () => {
        const f = parseBoardFile(boardFile([{ id: 'a', kind: 'timer', x: 0, y: 0, w: 300, z: 1, props: { durationSec: 'lang', progress: 'ring', title: 'T', showHeader: false } }]))!;
        expect(f.pages[0].widgets[0].props).toEqual({ progress: 'ring', title: 'T', showHeader: false });
    });
});

describe('timer widget', () => {
    test.each(['taart', 'ring', 'balk', 'zandloper'])('%s progress renders', (progress) => {
        const { container } = mountWidget('timer', { progress, durationSec: 90 }, TimerWidget);
        expect(container.querySelector(`[data-timer-face="${progress}"]`)).toBeTruthy();
        expect(container.textContent).toContain('01:30');
    });

    test('keypad sets the duration, presets on the card, pause can be locked', () => {
        const { live, container } = mountWidget('timer', { inputMode: 'toetsen', showPresets: true, allowPause: false, presets: [3, 0.5] }, TimerWidget);
        for (const k of ['1', '3', '0']) act(() => { fireEvent.click(screen.getByLabelText(k)); });
        expect(container.textContent).toContain('01:30');
        act(() => { fireEvent.click(screen.getByLabelText('Tijd instellen')); });
        expect(live().props!.durationSec).toBe(90);
        act(() => { fireEvent.click(screen.getByText('30 s')); });
        expect(live().props!.durationSec).toBe(30);
        act(() => { fireEvent.click(screen.getByLabelText('Start')); });
        expect((screen.getByLabelText('Pauze') as HTMLButtonElement).disabled).toBe(true);
    });

    test('draaien on a bar gives − and + minute buttons', () => {
        const { live } = mountWidget('timer', { inputMode: 'draaien', progress: 'balk', durationSec: 300 }, TimerWidget);
        act(() => { fireEvent.click(screen.getByLabelText('Minuut meer')); });
        expect(live().props!.durationSec).toBe(360);
    });

    test('warn colour in the last stretch, auto-restart loops', () => {
        vi.useFakeTimers();
        const { container } = mountWidget('timer', { durationSec: 10, warnEnabled: true, warnSec: 5, warnColor: '#7c3aed', autoRestart: true, progress: 'balk' }, TimerWidget);
        act(() => { fireEvent.click(screen.getByLabelText('Start')); });
        act(() => { vi.advanceTimersByTime(6000); });
        expect(container.innerHTML).toContain('rgb(124, 58, 237)');
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.getByLabelText('Pauze')).toBeTruthy();   // still running after the end
    });

    test('minutes-only display', () => {
        const { container } = mountWidget('timer', { durationSec: 125, display: 'minuten' }, TimerWidget);
        expect(container.textContent).toContain('3 min');
    });
});

describe('timer panel', () => {
    test('every control writes the widget and survives save + load', () => {
        const id = openPanel('timer');
        slide('Tijd', 600);
        expect(liveW(id).props!.durationSec).toBe(600);
        click('2 min');
        expect(liveW(id).props!.durationSec).toBe(120);
        click(/Snelkeuze$/);
        typeIn('Snelkeuze 6 in minuten', '45');
        click('Snelkeuzes op de timer', 'switch');
        click('Toetsen');
        click('Zandloper');
        click('Minuten');
        click('Violet');
        click('Andere kleur op het einde', 'switch');
        slide('Vanaf nog', 120);
        click('Bel');
        slide('Herhalen', 3);
        for (const s of ['Knipperen bij nul', 'Automatisch opnieuw starten', 'Pauzeren toegestaan']) click(s, 'switch');
        expect(timerProps(liveW(id))).toMatchObject({
            presets: [1, 2, 5, 10, 15, 45], showPresets: true, inputMode: 'toetsen', progress: 'zandloper', display: 'minuten', color: '#7c3aed',
            warnEnabled: true, warnSec: 120, endSound: 'bel', endRepeat: 3, flashOnEnd: false, autoRestart: true, allowPause: false,
        });
        expectRoundTrip(id);
    });
});
