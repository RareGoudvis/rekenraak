import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PAGE_BODY_PX } from '../../services/layout/blockLayout';
import { FIT_FLOOR, WIDTH_FIT_FLOOR, nextZoom } from './scaledBlockFit';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX, answerSpaceVar } from './BlockWidthContext';

// Scales a block's body via CSS `zoom`. It renders at the zoom the teacher ASKED for
// (global bodyFontScale x the per-block override) and nothing here quietly takes that
// away: a block whose content is wider than its column is WIDENED by the measured clamp
// and the packer (`promoted`, with the Inspector saying why), not shrunk. A quarter-width
// block silently rendering at 77% beside an identical half-width one at 100% is a
// font-size mismatch on a printed worksheet, which is never what a teacher wants.
//
// The two back-offs that remain are both opt-in, per block:
//  - `fitToPage`  — height: shrink until the block fits one page (floor FIT_FLOOR)
//  - `fitToWidth` — width: shrink until the content fits the column (floor WIDTH_FIT_FLOOR),
//    and the block then carries a `.no-print` badge saying how far it was shrunk.
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
export function ScaledBlock({ scale, availableWidthPx = FULL_BLOCK_WIDTH_PX, fitToPage = false, fitToWidth = false, pageBudgetPx = PAGE_BODY_PX, answerSpacePx, children }: { scale: number; availableWidthPx?: number; fitToPage?: boolean; fitToWidth?: boolean; pageBudgetPx?: number; answerSpacePx?: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [applied, setApplied] = useState(scale);
    // Last parent content width — distinguishes a genuine resize (regeneration / panel
    // resize) from a size change our own zoom caused, so the observer can't self-loop.
    const prevAvail = useRef(-1);

    // (a) When the request changes, restart the fit from the requested scale.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset before the measure pass
    useLayoutEffect(() => { setApplied(scale); }, [scale]);

    // (b) After each paint, back off if the teacher asked for a back-off. Both ratios are
    // dimensionless so the applied-zoom factor cancels and they stay reliable despite
    // Chrome's `zoom` skewing absolute measurements:
    //  - width (only with `fitToWidth`): scrollWidth/clientWidth. WITHOUT it nothing
    //    happens — a block that overflows its column is the clamp's and the packer's to
    //    widen, not ours to shrink;
    //  - height (only with `fitToPage`): offsetHeight inside a CSS `zoom` is UNZOOMED
    //    local px, so the rendered height is offsetHeight × applied.
    // Both only ever DECREASE applied → converges, no oscillation.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        let next = applied;
        if (fitToWidth) {
            next = Math.min(next, nextZoom(applied, el.scrollWidth / el.clientWidth, WIDTH_FIT_FLOOR));
        }
        if (fitToPage && pageBudgetPx > 0) {
            next = Math.min(next, nextZoom(applied, (el.offsetHeight * applied) / pageBudgetPx, FIT_FLOOR));
        }
        if (next < applied - 1e-4) setApplied(Math.min(next, scale));
    }, [applied, scale, fitToWidth, fitToPage, pageBudgetPx]);

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
    // The badge makes an opted-in shrink VISIBLE on screen (never on paper): the teacher
    // switched the fit on, so the mismatch with the neighbouring blocks is a choice, but it
    // still has to be one they can see. It sits OUTSIDE `data-scaled-inner`, absolutely
    // positioned against `.print-block`, so it costs the block no height and cannot widen
    // the min-content probe PageSheet takes off the inner.
    const shrunk = applied < scale - 1e-4;
    return (
        <>
            <div ref={ref} data-scaled-inner="" data-scale={scale} style={{
                zoom: applied, width: '100%', display: 'block', position: 'static', overflow: 'visible',
                // Per-block writing space: redeclares the sheet's --sheet-answer-h for this
                // subtree only, so the viewers' calc() factors pick it up unchanged.
                ...(answerSpacePx != null ? { ['--sheet-answer-h' as string]: answerSpaceVar(answerSpacePx) } : {}),
            }}>
                <BlockWidthProvider value={availableWidthPx}>{children}</BlockWidthProvider>
            </div>
            {shrunk && fitToWidth && (
                <div className="no-print" style={{
                    position: 'absolute', top: '2px', right: 0, pointerEvents: 'none',
                    fontSize: '10px', fontFamily: 'Azeret Mono, monospace', letterSpacing: '0.5px',
                    color: 'var(--accent-purple)',
                }}>
                    verkleind tot {Math.round((applied / scale) * 100)} %
                </div>
            )}
        </>
    );
}
