// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import OverButton from '../oefenen/zelf/OverPage';
import { FEEDBACK_URL, SHEETS_URL, STORED_ITEMS } from '../oefenen/zelf/overContent';
import { PUPIL_KEYS } from '../oefenen/zelf/pupilStorage';
import { oefenStorageKey } from '../services/oefenen/stats';
import { resetKiosk } from './helpers/oefenKiosk';

const dialog = () => screen.getByRole('dialog', { name: 'Over RekenRaak' });
const openOver = () => fireEvent.click(screen.getByRole('button', { name: 'Over' }));

beforeEach(() => {
    resetKiosk();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Over page (Zelf home)', () => {
    test('the home has a quiet Over button that opens the page for parents', async () => {
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        openOver();
        const d = dialog();
        expect(d.getAttribute('aria-modal')).toBe('true');
        for (const h of ['Wat is dit?', 'Gratis, zonder account, zonder reclame', 'Wat wordt er bewaard?', 'Wis mijn gegevens', 'Voor volwassenen: vragen of ideeën?']) {
            expect(within(d).getByRole('heading', { name: h })).toBeTruthy();
        }
        expect(within(d).getAllByRole('listitem').map(li => li.textContent)).toEqual([...STORED_ITEMS]);
        const sheets = within(d).getByRole('link', { name: /rekenbladen op rekenraak\.be/ });
        const form = within(d).getByRole('link', { name: /formulier/ });
        expect(sheets.getAttribute('href')).toBe(SHEETS_URL);
        expect(form.getAttribute('href')).toBe(FEEDBACK_URL);
        for (const a of [sheets, form]) {
            expect(a.getAttribute('target')).toBe('_blank');
            expect(a.getAttribute('rel')).toMatch(/noopener/);
        }
        // The Frans paragraph waits for later.
        expect(d.textContent).not.toMatch(/Frans/);
    });

    test('focus starts on Sluiten, stays inside, and goes back to Over on close', async () => {
        render(<OverButton onWiped={() => { }} />);
        const opener = screen.getByRole('button', { name: 'Over' });
        openOver();
        const close = within(dialog()).getByRole('button', { name: 'Sluiten' });
        expect(document.activeElement).toBe(close);
        const focusables = [...dialog().querySelectorAll<HTMLElement>('a[href], button')];
        const last = focusables[focusables.length - 1];
        fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(last);
        fireEvent.keyDown(last, { key: 'Tab' });
        expect(document.activeElement).toBe(close);
        fireEvent.click(close);
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(document.activeElement).toBe(opener);
    });

    test('Escape and the back gesture close it, without leaving a history entry behind', async () => {
        render(<OverButton onWiped={() => { }} />);
        const marked = () => !!(history.state as Record<string, unknown> | null)?.rekenraakOver;
        openOver();
        // Its own history entry: the back gesture pops it, Sluiten / Escape pop it too.
        expect(marked()).toBe(true);
        fireEvent.keyDown(dialog(), { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(marked()).toBe(false);
        openOver();
        dialog();
        history.back();
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(marked()).toBe(false);
    });

    test('Wis mijn gegevens asks first, then clears only the pupil keys', async () => {
        const onWiped = vi.fn();
        for (const k of PUPIL_KEYS) localStorage.setItem(k, 'pupil');
        localStorage.setItem(oefenStorageKey('zelf-abc123'), '{}');
        localStorage.setItem('rekenraak_autosave_v1', 'werkblad');
        localStorage.setItem('rekenraak_oefen_sessies_v1', 'bibliotheek');
        render(<OverButton onWiped={onWiped} />);
        openOver();
        const d = dialog();
        fireEvent.click(within(d).getByRole('button', { name: 'Wis mijn gegevens' }));
        // Nee: nothing happens.
        fireEvent.click(within(d).getByRole('button', { name: 'Nee' }));
        expect(localStorage.getItem('rekenraak_zelf_leerjaar_v1')).toBe('pupil');
        expect(within(d).queryByRole('button', { name: 'Ja, wis alles' })).toBeNull();
        expect(document.activeElement).toBe(within(d).getByRole('button', { name: 'Wis mijn gegevens' }));
        fireEvent.click(within(d).getByRole('button', { name: 'Wis mijn gegevens' }));
        expect(within(d).getByText(/Zeker\?/)).toBeTruthy();
        fireEvent.click(within(d).getByRole('button', { name: 'Ja, wis alles' }));
        expect(within(d).getByRole('status').textContent).toMatch(/Alles is gewist/);
        for (const k of PUPIL_KEYS) expect(localStorage.getItem(k)).toBeNull();
        expect(localStorage.getItem(oefenStorageKey('zelf-abc123'))).toBeNull();
        expect(localStorage.getItem('rekenraak_autosave_v1')).toBe('werkblad');
        expect(localStorage.getItem('rekenraak_oefen_sessies_v1')).toBe('bibliotheek');
        expect(onWiped).not.toHaveBeenCalled();
        fireEvent.click(within(d).getByRole('button', { name: 'Sluiten' }));
        await waitFor(() => expect(onWiped).toHaveBeenCalledTimes(1));
    });
});
