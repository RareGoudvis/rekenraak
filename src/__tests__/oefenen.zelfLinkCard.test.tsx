// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import ZelfLinkCard from '../components/oefenen/ZelfLinkCard';
import ModalShell from '../components/ui/ModalShell';

// The builder's Zelf oefenen card: the QR opens in its own dialog (the card never grows),
// Escape closes only that dialog and the focus returns to the QR-code button.

afterEach(cleanup);

describe('ZelfLinkCard', () => {
    test('QR-code opens a dialog with the code and the link; Escape closes only it, focus back on the button', () => {
        let builderClosed = false;
        render(<ModalShell onClose={() => { builderClosed = true; }}><ZelfLinkCard /></ModalShell>);
        const card = screen.getByRole('region', { name: 'Zelf oefenen voor leerlingen' });
        expect(card.querySelector('canvas')).toBeNull();
        const qrBtn = screen.getByRole('button', { name: 'QR-code' });
        qrBtn.focus();
        fireEvent.click(qrBtn);
        const dialog = screen.getByRole('dialog', { name: 'QR-code Zelf oefenen' });
        expect(dialog.querySelector('canvas')).not.toBeNull();
        expect(dialog.textContent).toContain('/kind.html');
        // The card itself holds no QR: it keeps its size.
        expect(card.querySelector('canvas')).toBeNull();
        fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
        expect(screen.queryByRole('dialog', { name: 'QR-code Zelf oefenen' })).toBeNull();
        expect(builderClosed).toBe(false);
        expect(document.activeElement).toBe(qrBtn);
    });

    test('Sluiten closes the dialog', () => {
        render(<ZelfLinkCard />);
        fireEvent.click(screen.getByRole('button', { name: 'QR-code' }));
        fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
