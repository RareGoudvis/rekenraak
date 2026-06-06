import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Sub-pixel margin so a block measured as "just fits" can't clip a hair off the right
// edge when Chrome rasterizes the PDF (offsetWidth/scrollWidth are integer-rounded).
const SAFETY = 0.97;
// Ratio dead-band — stops micro-thrash around the fixed point.
const EPS = 0.005;

// Scales a block's body via CSS `zoom`, but AUTO-FITS to the available width so an
// enlarged wide block (Cijfer grid, getallenas number line) can never overflow and clip
// in print. `zoom` magnifies layout (it can't reflow), so a too-wide block is capped to
// the largest zoom that still fits.
//
// The wrapper MUST stay width:100% + position:static + overflow:visible:
//  - width:100% — viewers collapse if shrink-wrapped (FragmentableGrid rows spread full width)
//  - position:static — keeps abs-positioned child SVGs out of THIS wrapper's containing
//    block, so their width still surfaces (via their in-flow px-width parent) into scrollWidth
//  - overflow:visible — so scrollWidth reports the overflow instead of clipping it
//
// SYNC/convention: a wide viewer must box its SVG in an in-flow element of the SVG's width
// (CijferViewer / GetallenasViewer already do) — else scrollWidth can't see it to cap it.
export function ScaledBlock({ scale, children }: { scale: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [applied, setApplied] = useState(scale);
    // Last parent content width — distinguishes a genuine resize (regeneration / panel
    // resize) from a size change our own zoom caused, so the observer can't self-loop.
    const prevAvail = useRef(-1);

    // (a) When the request changes, restart the fit from the requested scale.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset before the measure pass
    useLayoutEffect(() => { setApplied(scale); }, [scale]);

    // (b) After each paint, back off if the content overflows. `r = scrollWidth/clientWidth`
    // is dimensionless, so the applied-zoom factor cancels and the ratio is reliable despite
    // Chrome's `zoom` skewing absolute measurements. Only ever DECREASES applied (floored at
    // 1, so an already-overflowing-at-1 block is never shrunk further) → converges, no oscillation.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.scrollWidth / el.clientWidth;
        if (r > 1 + EPS) {
            const next = Math.max(1, Math.min(scale, (applied / r) * SAFETY));
            if (Math.abs(next - applied) > 1e-4) setApplied(next);
        }
    }, [applied, scale]);

    // (c) Re-fit on genuine layout changes (content regeneration grows/shrinks scrollWidth;
    // panel/window resize changes available width). Gate on parent content width so our own
    // zoom-induced size change doesn't retrigger the fit.
    useLayoutEffect(() => {
        const el = ref.current;
        const parent = el?.parentElement;
        if (!el || !parent) return;
        const availOf = (p: HTMLElement) => {
            const cs = getComputedStyle(p);
            return p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        };
        prevAvail.current = availOf(parent);
        const ro = new ResizeObserver(() => {
            const a = availOf(parent);
            if (Math.abs(a - prevAvail.current) < 0.5) return;   // self-induced → ignore
            prevAvail.current = a;
            setApplied(scale);                                   // genuine → restart fit
        });
        ro.observe(parent);
        ro.observe(el);
        return () => ro.disconnect();
    }, [scale]);

    return (
        <div ref={ref} style={{ zoom: applied, width: '100%', display: 'block', position: 'static', overflow: 'visible' }}>
            {children}
        </div>
    );
}
