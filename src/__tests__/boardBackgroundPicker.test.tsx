// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, within, screen } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import BoardBottomBar from '../board/components/BoardBottomBar';
import { PATTERN_LABELS, BACKGROUND_SCALES, backgroundStyle } from '../board/backgrounds';

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

const bg = () => useBoardStore.getState().pages[useBoardStore.getState().activePageIdx].background;
const open = () => {
    render(<BoardBottomBar onOpenWiskunde={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Achtergrond' }));
    return screen.getByRole('dialog', { name: 'Achtergrond' });
};

describe('background picker', () => {
    test('lists a preview tile for every pattern, every scale and both board colours', () => {
        const dlg = open();
        for (const label of Object.values(PATTERN_LABELS)) expect(within(dlg).getByLabelText(`Patroon: ${label}`)).toBeTruthy();
        for (const sc of BACKGROUND_SCALES) expect(within(dlg).getByLabelText(`Grootte: ${sc.label}`)).toBeTruthy();
        expect(within(dlg).getByLabelText('Bord: Licht')).toBeTruthy();
        expect(within(dlg).getByLabelText('Bord: Donker')).toBeTruthy();
        expect(dlg.querySelectorAll('[data-bg-tile]')).toHaveLength(Object.keys(PATTERN_LABELS).length + BACKGROUND_SCALES.length + 2);
    });

    test('a click applies at once and keeps the popover open', () => {
        const dlg = open();
        fireEvent.click(within(dlg).getByLabelText('Patroon: Raster'));
        expect(bg().pattern).toBe('raster');
        fireEvent.click(within(dlg).getByLabelText('Grootte: Groot'));
        expect(bg().scale).toBe(1.5);
        fireEvent.click(within(dlg).getByLabelText('Bord: Donker'));
        expect(bg()).toEqual({ pattern: 'raster', scale: 1.5, dark: true });
        expect(within(dlg).getByLabelText('Bord: Donker').getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByRole('dialog', { name: 'Achtergrond' })).not.toBeNull();
    });

    test('Escape and a press outside close it', () => {
        open();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'Achtergrond' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Achtergrond' }));
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('dialog', { name: 'Achtergrond' })).toBeNull();
    });

    test('focus starts on the current pattern; arrows move between tiles and Enter picks', () => {
        const dlg = open();
        expect(document.activeElement).toBe(within(dlg).getByLabelText('Patroon: Blanco'));
        fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(within(dlg).getByLabelText('Patroon: Raster'));
        fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(within(dlg).getByLabelText('Patroon: Schrijflijnen (4)'));
        fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
        expect(bg().pattern).toBe('schrijflijnen4');
    });

    test('the ⚙ popup no longer carries the background section', () => {
        render(<BoardBottomBar onOpenWiskunde={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Bordinstellingen' }));
        expect(screen.queryByText('Cornell')).toBeNull();
        expect(screen.getByText('Raster uitlijnen')).toBeTruthy();
    });
});

describe('preview zoom', () => {
    test('zoom shrinks the pattern but never a line below 1px', () => {
        expect(backgroundStyle({ pattern: 'raster', dark: false }, 0.3).backgroundSize).toBe('12px 12px');
        for (const sc of BACKGROUND_SCALES) {
            for (const zoom of [1, 0.3]) {
                const img = String(backgroundStyle({ pattern: 'schrijflijnen4', dark: false, scale: sc.value }, zoom).backgroundImage);
                // Every "line A, line B" pair is a drawn line: B must be past A.
                const pairs = [...img.matchAll(/rgba\(30,64,175,0\.18\) (\d+)px,\s*rgba\(30,64,175,0\.18\) (\d+)px/g)];
                expect(pairs).toHaveLength(4);
                for (const [, a, b] of pairs) {
                    expect(Number(b)).toBeGreaterThan(Number(a));
                }
            }
        }
    });

    test('the Cornell cue column follows the preview zoom, not the pattern scale', () => {
        expect(String(backgroundStyle({ pattern: 'cornell', dark: false, scale: 1.5 }).backgroundImage)).toContain('transparent 239px');
        expect(String(backgroundStyle({ pattern: 'cornell', dark: false }, 0.3).backgroundImage)).toContain('transparent 71px');
    });
});
