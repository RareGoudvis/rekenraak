import { useCallback, useSyncExternalStore } from 'react';

// The screen's shape for the "Draai je toestel" prompt (RotatePrompt.tsx).

// A phone held upright: portrait and narrow (a portrait tablet still has room for a game).
export const UPRIGHT_PHONE = '(orientation: portrait) and (max-width: 600px)';
export const PORTRAIT = '(orientation: portrait)';

/** Whether a media query matches, live (false where matchMedia is missing: tests, old browsers). */
export function useMedia(query: string): boolean {
    const subscribe = useCallback((onChange: () => void) => {
        if (typeof window === 'undefined' || !window.matchMedia) return () => {};
        const mq = window.matchMedia(query);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [query]);
    return useSyncExternalStore(subscribe, () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches, () => false);
}
