import { useEffect, useState } from 'react';

// The panel is an overlay beside the left sidebar: it follows the sidebar's own right edge (the sidebar narrows at small widths).
export function useAsideRight(asideSelector = 'aside.app-panel-left'): number {
    const [right, setRight] = useState(286);
    useEffect(() => {
        const aside = document.querySelector(asideSelector);
        if (!aside) return;
        const measure = () => setRight(Math.round(aside.getBoundingClientRect().right));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(aside);
        window.addEventListener('resize', measure);
        return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
    }, [asideSelector]);
    return right;
}

export function useDrawerDismiss(open: boolean, close: () => void, asideSelector = 'aside.app-panel-left'): void {
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            // The sidebar keeps the panel open (its rows toggle it themselves); a click anywhere else dismisses it.
            if (!(e.target as Element | null)?.closest?.(`.ez-drawer, ${asideSelector}`)) close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open, close, asideSelector]);
}
