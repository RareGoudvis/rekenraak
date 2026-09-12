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
export const PAGE_H_PX = 1123;

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
    /** Report one cell's rendered height; the packer prefers it over its own estimate. */
    onCellMeasure?: (blockId: string, width: number, px: number) => void;
    /** Grid row the tail hint sits on — one past the last row the packer filled. */
    tailRow?: number;
    /** Offer to split the block that starts the NEXT page, when this page ends in a big
        blank tail. Absent when there is no next page or its first block cannot be cut. */
    onSplitNext?: (tailPx: number, anchor: DOMRect) => void;
}

// Three row units of blank (blockLayout's 24px unit). Below that the tail is ordinary
// grid slack and a hint would be noise on every page.
const TAIL_HINT_PX = 72;

export default function PageSheet({
    index, total, header, footer, contentGap, blockSpacing, columnGap, children, onBackgroundClick,
    onHeaderClick, onFooterClick, onBodyMeasure, onCellMeasure, tailRow, onSplitNext,
}: Props) {
    const bodyRef = useRef<HTMLDivElement>(null);
    // The same pass that feeds real heights back to the packer also catches what it could
    // not prevent — a single block taller than one page. When that happens the page must
    // SAY so rather than clip in silence: print hides the overflow, and a teacher would
    // only find out on paper.
    const [overflowPx, setOverflowPx] = useState(0);
    // Blank space under the last block. Measured, never estimated — it is the whole
    // reason the teacher is being offered a split.
    const [tailPx, setTailPx] = useState(0);
    // True when ONE cell is taller than the whole body. That is a different problem from
    // a page that is a little over budget — moving the block elsewhere cannot fix it —
    // so the banner says something different about it.
    const [oversizeBlock, setOversizeBlock] = useState(false);

    useLayoutEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const check = () => {
            const over = el.scrollHeight - el.clientHeight;
            setOverflowPx(over > 2 ? Math.round(over) : 0);
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
            for (const child of Array.from(el.children) as HTMLElement[]) {
                const blockId = child.dataset.blockId;
                const width = Number(child.dataset.width);
                if (!blockId || !(width > 0)) continue;
                onCellMeasure?.(blockId, width, child.offsetHeight);
                tallestCell = Math.max(tallestCell, child.offsetHeight);
                lastBottom = Math.max(lastBottom, child.getBoundingClientRect().bottom);
            }
            setOversizeBlock(tallestCell > el.clientHeight + 2);
            const tail = (bodyRect.bottom - lastBottom) / zoom;
            setTailPx(prev => (Math.abs(prev - tail) > 2 ? Math.round(tail) : prev));
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        for (const child of Array.from(el.children)) ro.observe(child);
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
                    <span>{oversizeBlock
                        ? 'Dit blok is groter dan één pagina. Ook op papier wordt het afgesneden — splits het blok (✂) of zet "Verklein om op één pagina te passen" aan.'
                        : `Deze pagina loopt ${overflowPx}px over. Verklein een blok, zet het smaller, of verplaats het.`}</span>
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

            <div ref={bodyRef} className="page-sheet-body" style={{ rowGap: `${blockSpacing}px`, columnGap: `${columnGap}px` }}>
                {children}
                {/* Never automatic: the page says what it sees and the teacher decides.
                    Explicitly placed one row past the last cell — auto-placement would
                    backfill a gap in an earlier row. */}
                {onSplitNext && tailPx > TAIL_HINT_PX && (
                    <div
                        className="no-print page-tail-hint"
                        style={{ gridRow: tailRow, gridColumn: '1 / -1' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span>Het volgende blok past hier niet meer —</span>
                        <button type="button" onClick={(e) => onSplitNext(tailPx, e.currentTarget.getBoundingClientRect())}>splitsen</button>
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
