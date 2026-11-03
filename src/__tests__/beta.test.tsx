// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import BetaBadge from '../components/ui/BetaBadge';
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
