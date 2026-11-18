import { useLayoutEffect, useRef, useState } from 'react';

// The race scenes are H units high; their width follows the band's shape (measured), so the course always
// fills the band edge to edge, from a phone held sideways to a whiteboard.

export const bandWidthOf = (h: number, aspect: number) => Math.round(h * Math.max(2.2, Math.min(7, aspect)));

/** A ref for the scene's svg and its width in scene units (h high). */
export function useBandWidth(h: number, fallbackAspect = 3.4) {
    const ref = useRef<SVGSVGElement>(null);
    const [w, setW] = useState(() => bandWidthOf(h, fallbackAspect));
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setW(bandWidthOf(h, r.width / r.height)); };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [h]);
    return [ref, w] as const;
}
