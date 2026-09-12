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
}

export default function PageSheet({
    index, total, header, footer, contentGap, blockSpacing, columnGap, children, onBackgroundClick,
    onHeaderClick, onFooterClick, onBodyMeasure, onCellMeasure,
}: Props) {
    const bodyRef = useRef<HTMLDivElement>(null);
    // The same pass that feeds real heights back to the packer also catches what it could
    // not prevent — a single block taller than one page. When that happens the page must
    // SAY so rather than clip in silence: print hides the overflow, and a teacher would
    // only find out on paper.
    const [overflowPx, setOverflowPx] = useState(0);

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
            // (the empty-sheet hero) are not blocks and report nothing.
            for (const child of Array.from(el.children) as HTMLElement[]) {
                const blockId = child.dataset.blockId;
                const width = Number(child.dataset.width);
                if (blockId && width > 0) onCellMeasure?.(blockId, width, child.offsetHeight);
            }
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
                    <span>Deze pagina loopt {overflowPx}px over. Verklein een blok, zet het smaller, of verplaats het.</span>
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
