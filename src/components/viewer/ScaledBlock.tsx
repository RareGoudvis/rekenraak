import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PAGE_BODY_PX } from '../../services/layout/blockLayout';
import { FIT_FLOOR, nextZoom } from './scaledBlockFit';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from './BlockWidthContext';

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
// `availableWidthPx` is the printable width of the cell this block sits in. It defaults to
// a full-width block, so today's single-column sheet is unchanged; the page model passes the
// real per-cell width once blocks can be half or third width.
export function ScaledBlock({ scale, availableWidthPx = FULL_BLOCK_WIDTH_PX, fitToPage = false, pageBudgetPx = PAGE_BODY_PX, children }: { scale: number; availableWidthPx?: number; fitToPage?: boolean; pageBudgetPx?: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [applied, setApplied] = useState(scale);
    // Last parent content width — distinguishes a genuine resize (regeneration / panel
    // resize) from a size change our own zoom caused, so the observer can't self-loop.
    const prevAvail = useRef(-1);

    // (a) When the request changes, restart the fit from the requested scale.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset before the measure pass
    useLayoutEffect(() => { setApplied(scale); }, [scale]);

    // (b) After each paint, back off if the content overflows. Two ratios, both
    // dimensionless so the applied-zoom factor cancels and they stay reliable despite
    // Chrome's `zoom` skewing absolute measurements:
    //  - width: scrollWidth/clientWidth, floored at 1 — a block that still overflows at
    //    zoom 1 is too wide for its column, which is the packer's tier to fix, not ours;
    //  - height (only with `fitToPage`): offsetHeight inside a CSS `zoom` is UNZOOMED
    //    local px, so the rendered height is offsetHeight × applied.
    // Both only ever DECREASE applied → converges, no oscillation.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        let next = nextZoom(applied, el.scrollWidth / el.clientWidth, 1);
        if (fitToPage && pageBudgetPx > 0) {
            next = Math.min(next, nextZoom(applied, (el.offsetHeight * applied) / pageBudgetPx, FIT_FLOOR));
        }
        if (next < applied - 1e-4) setApplied(Math.min(next, scale));
    }, [applied, scale, fitToPage, pageBudgetPx]);

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

    // `data-scaled-inner` marks the element PageSheet probes for the block's intrinsic
    // content width (its `min-content` width), which is what decides the narrowest column
    // this block may sit in. `data-scale` is the REQUESTED zoom, not the applied one: the
    // width tier has to hold at the size the teacher asked for, even while the fit loop is
    // still backing off. SYNC: PageSheet.tsx measure pass, blockLayout.minWidthUnits.
    return (
        <div ref={ref} data-scaled-inner="" data-scale={scale} style={{ zoom: applied, width: '100%', display: 'block', position: 'static', overflow: 'visible' }}>
            <BlockWidthProvider value={availableWidthPx}>{children}</BlockWidthProvider>
        </div>
    );
}
