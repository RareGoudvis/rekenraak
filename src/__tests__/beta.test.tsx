// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import BetaBadge from '../components/ui/BetaBadge';
import BetaCaption from '../components/ui/BetaCaption';
import BetaStrip from '../components/ui/BetaStrip';
import { useFirstRun } from '../hooks/useFirstRun';
import { BETA_MODULES } from '../config/beta';

beforeEach(() => localStorage.clear());

describe('beta', () => {
    it('badge follows the flag', () => {
        render(<BetaBadge module="oefenmodus" />);
        expect(screen.queryByTestId('beta-badge') !== null).toBe(BETA_MODULES.oefenmodus);
    });
    it('strip dismissal sticks per module', () => {
        const { unmount } = render(<BetaStrip module="bordmodus" />);
        fireEvent.click(screen.getByRole('button', { name: /sluiten/i }));
        expect(screen.queryByTestId('beta-strip')).toBeNull();
        unmount();
        render(<BetaStrip module="bordmodus" />);
        expect(screen.queryByTestId('beta-strip')).toBeNull();
        render(<BetaStrip module="oefenmodus" />);
        expect(screen.getByTestId('beta-strip')).toBeTruthy();
    });
    it('first run shows once', () => {
        const a = renderHook(() => useFirstRun('x'));
        expect(a.result.current.show).toBe(true);
        act(() => a.result.current.dismiss());
        expect(a.result.current.show).toBe(false);
        expect(renderHook(() => useFirstRun('x')).result.current.show).toBe(false);
    });
});

describe('BetaCaption', () => {
    it('one line naming every module in beta', () => {
        render(<BetaCaption />);
        const on = Object.values(BETA_MODULES).some(Boolean);
        const el = screen.queryByTestId('beta-caption');
        expect(el !== null).toBe(on);
        if (on) expect(el?.textContent).toMatch(/in bèta$/);
    });
});
