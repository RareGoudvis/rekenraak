// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cleanup, screen, fireEvent, act } from '@testing-library/react';
import { ademProps, nextAdemPhase, ademPhaseSec } from '../board/settings/ademModel';
import AdemWidget from '../board/components/widgets/AdemWidget';
import { st, w, liveW, mountWidget, openPanel, click, slide, typeIn, expectRoundTrip } from './helpers/boardWidgetHarness';

// Breathing settings: defaults = the old 4-4-4 circle, phases, shapes, cycles, the ⚙ panel.
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    st().resetBoard();
});

describe('adem model', () => {
    test('defaults: endless 4-4-4 circle with Dutch guide text', () => {
        expect(ademProps(w('adem'))).toMatchObject({ inSec: 4, holdSec: 4, outSec: 4, holdOutSec: 0, cycles: 0, shape: 'cirkel', color: '', guideText: true, labelIn: 'Adem in…', soundCue: false, speed: 1 });
    });
    test('junk falls back per field', () => {
        expect(ademProps(w('adem', { inSec: 'snel', shape: 'ster', speed: 9 }))).toMatchObject({ inSec: 4, shape: 'cirkel', speed: 2 });
    });
    test('skips zero holds and wraps after the out-hold; speed shortens phases', () => {
        const box = ademProps(w('adem', { holdOutSec: 4 }));
        expect(nextAdemPhase('uit', box)).toEqual({ phase: 'leeg', wraps: false });
        expect(nextAdemPhase('leeg', box)).toEqual({ phase: 'in', wraps: true });
        expect(nextAdemPhase('in', ademProps(w('adem', { holdSec: 0 }))).phase).toBe('uit');
        expect(ademPhaseSec('in', ademProps(w('adem', { speed: 2 })))).toBe(2);
    });
});

describe('adem widget', () => {
    test('square shape, custom label, finite cycles end with Klaar', () => {
        vi.useFakeTimers();
        const { container } = mountWidget('adem', { shape: 'vierkant', inSec: 1, holdSec: 0, outSec: 1, cycles: 1, labelIn: 'Snuif de bloem' }, AdemWidget);
        expect(container.querySelector('[data-adem-shape="vierkant"]')).toBeTruthy();
        act(() => { fireEvent.click(screen.getByText('Start')); });
        expect(container.textContent).toContain('Snuif de bloem');
        act(() => { vi.advanceTimersByTime(1000); });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(container.textContent).toContain('Klaar!');
    });

    test('flower shape renders petals', () => {
        const { container } = mountWidget('adem', { shape: 'bloem' }, AdemWidget);
        expect(container.querySelectorAll('[data-adem-shape="bloem"] ellipse')).toHaveLength(6);
    });

    test('guide text off hides the phase words', () => {
        const { container } = mountWidget('adem', { guideText: false }, AdemWidget);
        act(() => { fireEvent.click(screen.getByText('Start')); });
        expect(container.textContent).not.toContain('Adem in');
    });
});

describe('adem panel', () => {
    test('every control writes the widget and survives save + load', () => {
        const id = openPanel('adem');
        click('Doos 4-4-4-4');
        slide('Adem uit', 6.5);
        slide('Snelheid', 1.5);
        slide('Aantal ademhalingen', 5);
        click('Bloem');
        click('Hemelsblauw');
        typeIn('Bij inademen', 'Ruik aan de bloem');
        click('Zacht geluid bij elke stap', 'switch');
        expect(ademProps(liveW(id))).toMatchObject({ inSec: 4, holdSec: 4, outSec: 6.5, holdOutSec: 4, speed: 1.5, cycles: 5, shape: 'bloem', color: '#0ea5e9', labelIn: 'Ruik aan de bloem', soundCue: true });
        click('Tekst tonen', 'switch');
        expect(screen.queryByLabelText('Bij inademen')).toBeNull();
        expectRoundTrip(id);
    });
});
