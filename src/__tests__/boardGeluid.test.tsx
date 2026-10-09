// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { cleanup, act, fireEvent, screen } from '@testing-library/react';
import { geluidProps, rmsToLevel, bandOf, DEFAULT_POSTER_LEVELS } from '../board/settings/geluidModel';
import GeluidWidget from '../board/components/widgets/GeluidWidget';
import { st, w, liveW, mountWidget, openPanel, click, slide, typeIn, expectRoundTrip } from './helpers/boardWidgetHarness';

// Noise settings: defaults = the owner's tap poster; the microphone meter (no mic in jsdom), the
// level scale, the ⚙ panel for both modes.
afterEach(() => {
    cleanup();
    localStorage.clear();
    st().resetBoard();
});

describe('geluid model', () => {
    test('defaults: the poster with the owner levels', () => {
        const m = geluidProps(w('geluid'));
        expect(m).toMatchObject({ mode: 'poster', level: 0, showDesc: true, display: 'balk', warnAt: 50, alarmAt: 75, muted: false, calibration: 0 });
        expect(m.posterLevels).toEqual(DEFAULT_POSTER_LEVELS);
    });
    test('junk falls back; a crossed threshold pair keeps orange below red', () => {
        expect(geluidProps(w('geluid', { display: 'meter', warnAt: 90, alarmAt: 60, posterLevels: [] }))).toMatchObject({ display: 'balk', warnAt: 55, alarmAt: 60, posterLevels: DEFAULT_POSTER_LEVELS });
        expect(geluidProps(w('geluid', { posterLevels: [{ title: 'A', color: 'rood' }, 5] })).posterLevels).toEqual([{ title: 'A', desc: '', color: '#e5e7eb' }]);
    });
    test('level scale and bands', () => {
        expect(rmsToLevel(1, 5)).toBe(100);
        expect(rmsToLevel(0.001, 5)).toBe(0);
        expect(rmsToLevel(0.001, 10)).toBeGreaterThan(0);
        expect(rmsToLevel(0.1, 5, 30)).toBeLessThan(rmsToLevel(0.1, 5));
        const m = geluidProps(w('geluid'));
        expect([bandOf(10, m), bandOf(60, m), bandOf(90, m)]).toEqual(['stil', 'let-op', 'te-luid']);
    });
});

describe('geluid widget', () => {
    test('custom poster rows replace the owner poster; a tap picks the level', () => {
        const { container, live } = mountWidget('geluid', { posterLevels: [{ title: 'Stil', desc: '', color: '#ffffff' }, { title: 'Praten', desc: 'zacht', color: '#00ff00' }], level: 1 }, GeluidWidget);
        expect(container.textContent).toContain('Praten');
        expect(container.textContent).not.toContain('Fluisterstem');
        act(() => { fireEvent.click(screen.getByText('Stil')); });
        expect(live().props!.level).toBe(0);
    });

    test.each(['balk', 'verkeerslicht', 'smiley'])('meter %s renders and survives a browser without a microphone', async (display) => {
        const { container } = mountWidget('geluid', { mode: 'meter', display }, GeluidWidget);
        expect(container.querySelector(`[data-geluid-display="${display}"]`)).toBeTruthy();
        act(() => { fireEvent.click(screen.getByText('Start meten')); });
        await act(async () => { await Promise.resolve(); });
        expect(container.textContent).toMatch(/microfoon/i);
    });
});

describe('geluid panel', () => {
    test('poster rows and the meter settings write the widget and survive save + load', () => {
        const id = openPanel('geluid');
        click(/Niveau$/);
        typeIn('Naam niveau 5', 'Feest');
        click('Uitleg tonen', 'switch');
        expect(geluidProps(liveW(id)).posterLevels).toHaveLength(6);
        expect(geluidProps(liveW(id)).posterLevels[5].title).toBe('Feest');
        click('Meter (microfoon)');
        click('Smiley');
        slide('Gevoeligheid', 8);
        slide('Rood vanaf', 40);   // below orange: orange follows down
        expect(geluidProps(liveW(id))).toMatchObject({ mode: 'meter', display: 'smiley', sensitivity: 8, alarmAt: 40, warnAt: 35, showDesc: false });
        click('Geluidssignaal', 'switch');
        click('Xylofoon');
        click('Piek even vasthouden', 'switch');
        click('Kalibreer nu');
        expect(typeof liveW(id).props!.calibrateAt).toBe('number');
        click('Enkel beeld, nooit geluid', 'switch');
        expect(geluidProps(liveW(id))).toMatchObject({ alarmSound: true, alarmTone: 'xylofoon', peakHold: false, muted: true });
        expectRoundTrip(id);
    });
});
