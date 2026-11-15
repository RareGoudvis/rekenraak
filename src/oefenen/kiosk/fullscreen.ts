import { useEffect, useState } from 'react';

// Fullscreen hides the browser chrome on a tablet; refused or unsupported is fine.
export function tryFullscreen() {
    try {
        const p = document.documentElement.requestFullscreen?.();
        if (p) p.catch(() => { /* refused: keep going in the window */ });
    } catch { /* unsupported (iOS Safari) */ }
}

// A pupil on a tablet has no Esc: leaving an oefening or game gives the browser chrome back.
export function exitFullscreen() {
    try {
        if (!document.fullscreenElement) return;
        const p = document.exitFullscreen?.();
        if (p) p.catch(() => { /* already out */ });
    } catch { /* unsupported */ }
}

// True while the page is fullscreen; the button only shows then (iPhone Safari never is).
export function useFullscreen(): boolean {
    const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
    useEffect(() => {
        const sync = () => setOn(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', sync);
        sync();
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);
    return on;
}
