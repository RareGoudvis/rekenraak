// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { packWire } from '../services/oefenen/session';
import { resetKiosk } from './helpers/oefenKiosk';

// O15 (audit D11): a link whose title inflates to 50 MB took 4.7 s and rendered the title as an
// off-screen h1. A 1 MB one is enough to show the bound: error screen at once, title never drawn.

beforeAll(() => {
    // Warm React and jsdom on an ordinary broken link, so the clock below times the bomb only.
    useOefenStore.getState().load('#oefen=kapot');
    render(<OefenApp />);
    cleanup();
});
beforeEach(resetKiosk);
afterEach(cleanup);

describe('O15: a title bomb lands on the error screen', () => {
    test.each([
        ['1 MB title', 'A'.repeat(1 << 20)],
        ['81-char title', 'A'.repeat(81)],
    ])('%s → ErrorScreen within 100 ms, no title rendered', (_name, title) => {
        const hash = `#oefen=${packWire([1, 'bomb1', 1, 0, [[5]], title])}`;
        const t0 = performance.now();
        useOefenStore.getState().load(hash);
        render(<OefenApp />);
        const ms = performance.now() - t0;
        expect(screen.getByRole('alert').textContent).toMatch(/ongeldig/);
        expect(document.body.textContent).not.toContain('AAAAAAAAAA');
        expect(useOefenStore.getState().sessie).toBeNull();
        expect(ms).toBeLessThan(100);
    });
});
