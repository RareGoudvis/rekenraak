import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

// One printed page: its own header, a 4-column grid body, its own footer.
//
// This replaces the single-<table> sheet whose <thead>/<tfoot> Chrome repeated across
// printed pages. That trick was the only way to get a running header when the browser
// decided where pages broke. The packer decides now, so each page simply renders its own
// chrome and ends with `break-after: page` — far less fragile than the table hack, and it
// is what lets a page show real feedback on screen (a card, a number, its own footer).
//
// SYNC: the geometry here must match blockLayout.ts, which budgets heights against it —
// A4 at 96dpi, 16mm side padding on the body.
export const PAGE_W_PX = 794;

interface Props {
    index: number;
    total: number;
    header: ReactNode;
    footer: ReactNode;
    /** Gap under the header, from docSettings.headerContentGap. */
    contentGap: number;
    /** Gap between blocks, from docSettings.blockSpacing. */
    blockSpacing: number;
    /** Horizontal gap. Wider than blockSpacing when the column rule is on, so the rule
        has air on both sides; the ROW gap stays blockSpacing, which is what the packer
        budgets against. */
    columnGap: number;
    children: ReactNode;
    onBackgroundClick?: () => void;
    /** Clicking the printed header / footer opens their settings — the sheet is the
        interface, not only a preview. Screen-only: the affordance is .no-print. */
    onHeaderClick?: () => void;
    onFooterClick?: () => void;
    /** Report the body's usable height back to the packer, which budgets pages against it. */
    onBodyMeasure?: (pageIndex: number, px: number) => void;
    /** Report one cell's rendered height and the block's intrinsic content width; the
        packer prefers both over its own per-type estimates. */
    onCellMeasure?: (blockId: string, width: number, px: number, intrinsicWidthPx?: number) => void;
    /** Blank px under the page's skyline, as the PACKER sees it for the width of the next
        page's first block. Given, it beats the measured tail: the packer knows exactly
        where that block would land, the DOM can only say where the ink stops. */
    tailPx?: number;
    /** Offer to split the block that starts the NEXT page, when this page ends in a big
        blank tail. Absent when there is no next page or its first block cannot be cut. */
    onSplitNext?: (tailPx: number, anchor: DOMRect) => void;
    /** The two ways out of "this block is taller than a page", offered by the banner on the
        block it actually measured: shrink it to fit, or cut it in two. */
    onFitBlock?: (blockId: string) => void;
    onSplitBlock?: (blockId: string, anchor: DOMRect) => void;
}

// Three row units of blank (blockLayout's 24px unit). Below that the tail is ordinary
// grid slack and a hint would be noise on every page.
const TAIL_HINT_PX = 72;

// The narrowest this block's content can get before it overflows, in layout px. There is
// no API for that, so it is probed: `min-content` on the ScaledBlock inner, read back, and
// the inline width restored — all inside one layout effect, so the browser never paints
// the probe. The cost is one forced reflow per cell per measure pass; the alternative
// (scrollWidth of a width:100% box) only ever reports the cell width back at us, which is
// why the width tiers had to be a hand-measured per-type table until now.
//
// scrollWidth inside a CSS `zoom` is in UNZOOMED local px, so it is multiplied by the
// REQUESTED scale (data-scale) rather than the applied one: the tier must hold at the size
// the teacher asked for, not at whatever the fit loop has backed off to this frame.
function probeIntrinsicWidth(cell: HTMLElement): number | undefined {
    const inner = cell.querySelector<HTMLElement>('[data-scaled-inner]');
    if (!inner) return undefined;
    const prev = inner.style.width;
    inner.style.width = 'min-content';
    const local = inner.scrollWidth;
    inner.style.width = prev;
    const scale = Number(inner.dataset.scale) || 1;
    return local > 0 ? local * scale : undefined;
}

// The height of the BLOCK, not of the grid cell around it. Grid items stretch to the
// height of the tallest item in their row, so a cell's own offsetHeight is its row's
// height — feeding that back to the packer made a short block claim the height of the tall
// one beside it, which is placement-dependent and therefore not a fact about the block:
// the packer moved it, it measured smaller, the packer moved it back, and the repack
// circuit breaker froze whichever value it happened to hold (splitsen read 553px as 914px
// in the 2026-09-13 height audit). `.print-block` carries the printed chrome (16px padding
// + 1px border top and bottom) INSIDE its box and 4px margins outside it, and all of that
// prints, so the block's own cost is its offsetHeight plus those margins.
function ownHeight(cell: HTMLElement): number {
    const inner = cell.firstElementChild as HTMLElement | null;
    if (!inner) return cell.offsetHeight;
    const cs = getComputedStyle(inner);
    return inner.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
}

export default function PageSheet({
    index, total, header, footer, contentGap, blockSpacing, columnGap, children, onBackgroundClick,
    onHeaderClick, onFooterClick, onBodyMeasure, onCellMeasure, onSplitNext, onFitBlock, onSplitBlock,
    tailPx: packedTailPx,
}: Props) {
    const bodyRef = useRef<HTMLDivElement>(null);
    // The positioning layer for the cells. The body itself carries the side padding, and
    // an absolutely positioned child resolves against its containing block's PADDING box —
    // hung off the body directly, every cell would start 53px too far left.
    const canvasRef = useRef<HTMLDivElement>(null);
    // The same pass that feeds real heights back to the packer also catches what it could
    // not prevent — a single block taller than one page. When that happens the page must
    // SAY so rather than clip in silence: print hides the overflow, and a teacher would
    // only find out on paper.
    const [overflowPx, setOverflowPx] = useState(0);
    // Blank space under the last block. Measured, never estimated — it is the whole
    // reason the teacher is being offered a split.
    const [tailPx, setTailPx] = useState(0);
    // The id of the ONE cell taller than the whole body, when there is one. That is a
    // different problem from a page that is a little over budget — moving the block
    // elsewhere cannot fix it — so the banner says something different about it, and it
    // holds the id so the fix can be offered on the block itself.
    const [oversizeBlockId, setOversizeBlockId] = useState<string | null>(null);

    useLayoutEffect(() => {
        const el = bodyRef.current;
        const canvas = canvasRef.current;
        if (!el || !canvas) return;
        const check = () => {
            // clientHeight is the body's usable box, not its content: it is the page budget.
            onBodyMeasure?.(index, el.clientHeight);
            // Measured on the GRID CELL — outside ScaledBlock's CSS zoom, so offsetHeight is
            // the height the grid actually gives the row. Children without a data-block-id
            // (the empty-sheet hero, the tail hint) are not blocks: they report nothing and
            // stay out of the tail measurement, so the hint cannot chase its own threshold.
            // The tail itself comes from rects divided back by the sheet zoom, so it is in
            // layout px whatever the sheet is scaled to.
            const bodyRect = el.getBoundingClientRect();
            const zoom = (bodyRect.width / (PAGE_W_PX - 2 * 53)) || 1;
            let lastBottom = bodyRect.top;
            let tallestCell = 0;
            let tallestId: string | null = null;
            for (const child of Array.from(canvas.children) as HTMLElement[]) {
                const blockId = child.dataset.blockId;
                const width = Number(child.dataset.width);
                if (!blockId || !(width > 0)) continue;
                const own = ownHeight(child);
                onCellMeasure?.(blockId, width, own, probeIntrinsicWidth(child));
                if (own > tallestCell) { tallestCell = own; tallestId = blockId; }
                // The TAIL, unlike the height, is about the row: a stretched cell ends
                // where its row ends, which is exactly the ink boundary the hint is about.
                lastBottom = Math.max(lastBottom, child.getBoundingClientRect().bottom);
            }
            setOversizeBlockId(tallestCell > el.clientHeight + 2 ? tallestId : null);
            // Cells are positioned, so the body has no flow left to overflow and
            // scrollHeight no longer answers this. The page runs over when the DEEPEST
            // block ends past the body — which is also the number the banner should say.
            const over = (lastBottom - bodyRect.bottom) / zoom;
            setOverflowPx(over > 2 ? Math.round(over) : 0);
            const tail = (bodyRect.bottom - lastBottom) / zoom;
            setTailPx(prev => (Math.abs(prev - tail) > 2 ? Math.round(tail) : prev));
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        for (const child of Array.from(canvas.children)) ro.observe(child);
        return () => ro.disconnect();
    });

    return (
        <div className={`page-sheet${overflowPx ? ' page-overflow' : ''}`} onClick={onBackgroundClick}>
            {/* Screen-only page label: teachers could previously only see where a dashed line
                fell, not which page they were looking at. */}
            <div className="no-print page-sheet-tag">Pagina {index + 1} van {total}</div>

            {overflowPx > 0 && (
                <div className="no-print page-sheet-warn" onClick={(e) => e.stopPropagation()}>
                    <WarningCircle size={15} weight="bold" aria-hidden="true" />
                    <span>{oversizeBlockId
                        ? 'Dit blok is groter dan één pagina. Ook op papier wordt het afgesneden.'
                        : `Deze pagina loopt ${overflowPx}px over. Verklein een blok, zet het smaller, of verplaats het.`}</span>
                    {/* The two fixes, on the block the banner just measured — the old text
                        named them and left the teacher to find them in the Opmaak tab. */}
                    {oversizeBlockId && onFitBlock && (
                        <button type="button" onClick={() => onFitBlock(oversizeBlockId)}>Verklein dit blok</button>
                    )}
                    {oversizeBlockId && onSplitBlock && (
                        <button type="button" onClick={(e) => onSplitBlock(oversizeBlockId, e.currentTarget.getBoundingClientRect())}>Splitsen</button>
                    )}
                </div>
            )}

            <div
                className={`page-sheet-head${onHeaderClick ? ' sheet-zone' : ''}`}
                style={{ marginBottom: `${contentGap}px` }}
                onClick={onHeaderClick ? (e) => { e.stopPropagation(); onHeaderClick(); } : undefined}
                title={onHeaderClick ? 'Koptekst aanpassen' : undefined}
            >
                {header}
                {onHeaderClick && <span className="no-print sheet-zone-hint">Koptekst aanpassen</span>}
            </div>

            {/* rowGap / columnGap no longer lay anything out — the packer does — but they
                stay declared so height-audit.mjs can check that the CSS and the packer
                still agree on the spacing a teacher set. */}
            <div ref={bodyRef} className="page-sheet-body" style={{ rowGap: `${blockSpacing}px`, columnGap: `${columnGap}px` }}>
                <div ref={canvasRef} className="page-sheet-canvas">{children}</div>
                {/* Never automatic: the page says what it sees and the teacher decides.
                    Absolutely positioned (see .page-tail-hint) and outside the canvas, so
                    it is never mistaken for a cell by the measure pass. */}
                {onSplitNext && (packedTailPx ?? tailPx) > TAIL_HINT_PX && (
                    <div
                        className="no-print page-tail-hint"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span>Het volgende blok past hier niet meer —</span>
                        <button type="button" onClick={(e) => onSplitNext(packedTailPx ?? tailPx, e.currentTarget.getBoundingClientRect())}>splitsen</button>
                    </div>
                )}
            </div>

            <div
                className={`page-sheet-foot${onFooterClick ? ' sheet-zone' : ''}`}
                onClick={onFooterClick ? (e) => { e.stopPropagation(); onFooterClick(); } : undefined}
                title={onFooterClick ? 'Voettekst aanpassen' : undefined}
            >
                {footer}
                {onFooterClick && <span className="no-print sheet-zone-hint">Voettekst aanpassen</span>}
            </div>
        </div>
    );
}
