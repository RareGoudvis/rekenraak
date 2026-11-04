// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, renderHook, act } from '@testing-library/react';
import UpgradeModal from '../components/onboarding/UpgradeModal';
import { useBootLoad } from '../hooks/useBootLoad';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { RELEASE_SEEN_KEY, UPGRADE_SEEN_KEY } from '../services/persistence';
import { RELEASE_VERSION } from '../config/version';
import { TOUR_SEEN_KEY } from '../hooks/useOnboarding';
import { UPGRADE_HIGHLIGHTS } from '../config/upgradeNotes';

const OLD = 'v0.5-2026-05-31';

beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    useWorksheetStore.setState({ curriculum: null, view: 'editor', oefenBuilderOpen: false });
});
afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.boot;
    vi.restoreAllMocks();
});

describe('upgrade modal gate', () => {
    test('a brand-new user (no tour key) does not see it', () => {
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.upgradeVisible).toBe(false);
    });

    test('a returning 1.0.x user (tour key + old seen-key) sees it', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        localStorage.setItem(RELEASE_SEEN_KEY, OLD);
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.upgradeVisible).toBe(true);
    });

    test('a returning user without a seen-key sees it', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.upgradeVisible).toBe(true);
    });

    test('closing hides it and writes the key; a reload stays quiet', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        const first = renderHook(() => useBootLoad());
        act(() => first.result.current.closeUpgrade());
        expect(first.result.current.upgradeVisible).toBe(false);
        expect(localStorage.getItem(UPGRADE_SEEN_KEY)).toBe(RELEASE_VERSION);
        first.unmount();
        const second = renderHook(() => useBootLoad());
        expect(second.result.current.upgradeVisible).toBe(false);
    });

    test('never on the bord page', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        document.documentElement.dataset.boot = 'bord';
        const { result } = renderHook(() => useBootLoad());
        expect(result.current.upgradeVisible).toBe(false);
    });
});

describe('upgrade modal content', () => {
    const open = () => {
        const onClose = vi.fn();
        const onOpenReleaseNotes = vi.fn();
        render(<UpgradeModal onClose={onClose} onOpenReleaseNotes={onOpenReleaseNotes} />);
        return { onClose, onOpenReleaseNotes };
    };

    test('Probeer Bordmodus opens the board and closes', () => {
        const { onClose } = open();
        fireEvent.click(screen.getByRole('button', { name: 'Probeer Bordmodus' }));
        expect(useWorksheetStore.getState().view).toBe('whiteboard');
        expect(onClose).toHaveBeenCalled();
    });

    test('Probeer Oefenmodus opens the builder and closes', () => {
        const { onClose } = open();
        fireEvent.click(screen.getByRole('button', { name: 'Probeer Oefenmodus' }));
        expect(useWorksheetStore.getState().oefenBuilderOpen).toBe(true);
        expect(onClose).toHaveBeenCalled();
    });

    test('"Alles wat nieuw is" closes and opens the release notes', () => {
        const { onClose, onOpenReleaseNotes } = open();
        fireEvent.click(screen.getByRole('button', { name: 'Alles wat nieuw is' }));
        expect(onClose).toHaveBeenCalled();
        expect(onOpenReleaseNotes).toHaveBeenCalled();
    });

    test('a locked curriculum hides the Oefenmodus card', () => {
        useWorksheetStore.setState({ curriculum: { locked: true } as never });
        open();
        expect(screen.queryByRole('button', { name: 'Probeer Oefenmodus' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Probeer Bordmodus' })).toBeTruthy();
    });

    test('every highlight stays short', () => {
        expect(UPGRADE_HIGHLIGHTS.length).toBeGreaterThanOrEqual(4);
        for (const h of UPGRADE_HIGHLIGHTS) expect(h.length, h).toBeLessThanOrEqual(160);
    });
});
