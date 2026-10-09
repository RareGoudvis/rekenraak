// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MijnBladenView from '../components/library/MijnBladenView';
import BibliotheekView from '../components/library/BibliotheekView';

// Ctrl+P with a full-screen library overlay open must print the sheet underneath, like the board.
beforeEach(() => { vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('library overlays never print', () => {
    test.each([['Mijn bladen', MijnBladenView], ['Bibliotheek', BibliotheekView]])('%s', (_name, View) => {
        const { container } = render(<View />);
        expect((container.firstElementChild as HTMLElement).classList.contains('no-print')).toBe(true);
    });
});
