// Fullscreen hides the browser chrome on a tablet; refused or unsupported is fine.
export function tryFullscreen() {
    try {
        const p = document.documentElement.requestFullscreen?.();
        if (p) p.catch(() => { /* refused: keep going in the window */ });
    } catch { /* unsupported (iOS Safari) */ }
}
