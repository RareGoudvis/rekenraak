import { useCallback, useRef } from 'react';

// A pill (a full-radius chip) whose text wraps to a second line would push the text into its round ends (owner
// 2026-11-18: "Maaltafels: Maal- en deeltafels van 1 tot 10"). The pill marks itself data-wrapped then, and the CSS turns
// it into a rounded rectangle with more room at the sides. Pure measuring + one small hook.

/** The line height in px of a computed style ('normal' = about 1.2 × the font size). */
export function lineHeightPx(lineHeight: string, fontSize: string): number {
    const fs = parseFloat(fontSize) || 16;
    const lh = parseFloat(lineHeight);
    if (!Number.isFinite(lh) || lh <= 0) return fs * 1.2;
    // A unitless line height comes back in px from getComputedStyle; a bare number is a factor anyway.
    return /px$/.test(lineHeight.trim()) ? lh : lh * fs;
}

/** More than one line of text in a content box this high (half a line of slack for icons and rounding). */
export const wrapsOver = (contentPx: number, linePx: number) => linePx > 0 && contentPx > linePx * 1.5;

/** Marks el data-wrapped while its text takes more than one line. */
function markWrap(el: HTMLElement) {
    const cs = getComputedStyle(el);
    const content = el.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (wrapsOver(content, lineHeightPx(cs.lineHeight, cs.fontSize))) el.dataset.wrapped = '';
    else delete el.dataset.wrapped;
}

/** A callback ref for a pill: data-wrapped follows its line count (kept up to date on resize). */
export function usePillWrap<T extends HTMLElement>() {
    const ro = useRef<ResizeObserver | null>(null);
    return useCallback((el: T | null) => {
        ro.current?.disconnect();
        ro.current = null;
        if (!el) return;
        markWrap(el);
        if (typeof ResizeObserver === 'undefined') return;
        ro.current = new ResizeObserver(() => markWrap(el));
        ro.current.observe(el);
    }, []);
}
