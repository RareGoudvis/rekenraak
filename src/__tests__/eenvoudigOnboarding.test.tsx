// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, renderHook } from '@testing-library/react';
import { useBootLoad } from '../hooks/useBootLoad';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { TOUR_SEEN_KEY } from '../hooks/useOnboarding';
import { DEFAULT_MODE_KEY } from '../services/eenvoudigMode';
import TourOverlay from '../components/onboarding/TourOverlay';
import WelcomeModal from '../components/onboarding/WelcomeModal';
import UpgradeModal from '../components/onboarding/UpgradeModal';
import EenvoudigBanner, { EENVOUDIG_BANNER_KEY } from '../components/onboarding/EenvoudigBanner';

beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    useWorksheetStore.setState({ curriculum: null, sidebarTab: 'oefeningen' });
});
afterEach(cleanup);

describe('boot defaulting', () => {
    test('brand-new teacher starts on Eenvoudig', () => {
        renderHook(() => useBootLoad());
        expect(useWorksheetStore.getState().sidebarTab).toBe('eenvoudig');
    });
    test('tour seen, no choice: Uitgebreid', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        renderHook(() => useBootLoad());
        expect(useWorksheetStore.getState().sidebarTab).toBe('oefeningen');
    });
    test('a saved choice wins over the tour key', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        localStorage.setItem(DEFAULT_MODE_KEY, 'eenvoudig');
        renderHook(() => useBootLoad());
        expect(useWorksheetStore.getState().sidebarTab).toBe('eenvoudig');
    });
});

describe('tour', () => {
    test('switches to Uitgebreid but never saves a mode, and restores the tab on close', () => {
        useWorksheetStore.setState({ sidebarTab: 'eenvoudig' });
        let closed = false;
        render(<TourOverlay onClose={() => { closed = true; }} />);
        expect(useWorksheetStore.getState().sidebarTab).toBe('oefeningen');
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Overslaan' }));
        expect(closed).toBe(true);
        expect(useWorksheetStore.getState().sidebarTab).toBe('eenvoudig');
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBeNull();
    });
});

describe('welcome and upgrade', () => {
    test('welcome saves the pick and applies it', () => {
        render(<WelcomeModal onClose={() => {}} onStartTour={() => {}} />);
        fireEvent.click(screen.getByRole('radio', { name: /Uitgebreid/ }));
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBe('oefeningen');
        expect(useWorksheetStore.getState().sidebarTab).toBe('oefeningen');
    });
    test('skipping the welcome pins the shown default (Eenvoudig) before the tour key flips it', () => {
        render(<WelcomeModal onClose={() => {}} onStartTour={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Overslaan' }));
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBe('eenvoudig');
    });
    test('upgrade preselects Uitgebreid for a returning teacher and saves a switch', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        render(<UpgradeModal onClose={() => {}} onOpenReleaseNotes={() => {}} />);
        expect(screen.getByRole('radio', { name: /Uitgebreid/ }).getAttribute('aria-checked')).toBe('true');
        fireEvent.click(screen.getByRole('radio', { name: /Eenvoudig/ }));
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBe('eenvoudig');
        expect(useWorksheetStore.getState().sidebarTab).toBe('eenvoudig');
    });
});

describe('banner', () => {
    test('only on Eenvoudig, and dismissal sticks', () => {
        const { unmount } = render(<EenvoudigBanner />);
        expect(screen.queryByTestId('eenvoudig-banner')).toBeNull();
        cleanup();
        useWorksheetStore.setState({ sidebarTab: 'eenvoudig' });
        render(<EenvoudigBanner />);
        const banner = screen.getByTestId('eenvoudig-banner');
        expect(banner.className).toContain('no-print');
        fireEvent.click(screen.getByRole('button', { name: 'Verbergen' }));
        expect(localStorage.getItem(EENVOUDIG_BANNER_KEY)).toBe('1');
        cleanup();
        render(<EenvoudigBanner />);
        expect(screen.queryByTestId('eenvoudig-banner')).toBeNull();
        unmount();
    });
});
