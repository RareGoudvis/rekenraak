// Extent of the drawn content (leaf elements) in layout px, so a short sum is centred and scaled to
// the card instead of a 340 px box it fills only partly (a viewer may left-align or centre it).
// Width-100% leaves count as full width, which keeps those whole. The height includes what draws
// below the layout box: an underline under an inline digit (plaatswaarde) hangs under its line box,
// and the card's sizer (overflow hidden) cut it off, hiding which digit was asked.
export function usedExtent(inner: HTMLElement, fallbackW: number): { x: number; w: number; h: number } {
    const outer = inner.getBoundingClientRect();
    // Rects are post-transform; the layout width is not, so their ratio is the live scale.
    const scale = inner.offsetWidth ? outer.width / inner.offsetWidth : 0;
    let left = Infinity, right = -Infinity, bottom = -Infinity;
    inner.querySelectorAll<HTMLElement | SVGElement>('*').forEach((el) => {
        // A parent with its own text ("Een pil weegt ongeveer 500 <blank>.") is measured too,
        // or only its blank would count and the card would crop the sentence off.
        const ownText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '');
        // A tappable part (Phase C) counts whole: its padding carries the selection ring.
        if (el.children.length > 0 && !ownText && !(el instanceof SVGSVGElement) && !el.hasAttribute('data-kiosk-key')) return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) return;
        left = Math.min(left, r.left - outer.left);
        right = Math.max(right, r.right - outer.left);
        bottom = Math.max(bottom, r.bottom - outer.top);
    });
    const h = inner.offsetHeight;
    if (!(scale > 0) || right <= left) return { x: 0, w: fallbackW, h };
    // 4 px slack each side (2 below): italic glyphs and blank lines can draw past their box.
    const x = Math.max(0, Math.floor(left / scale) - 4);
    // Not capped at fallbackW: a fixed-width table (getalfunctie's tick columns) overflows the
    // 340 px box, and the card scales it down whole instead of cutting its last columns off.
    return { x, w: Math.ceil(right / scale) + 4 - x, h: Math.max(h, Math.ceil(bottom / scale) + 2) };
}
