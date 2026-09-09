import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

// One printed page: its own header, a 6-column grid body, its own footer.
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
    children: ReactNode;
    onBackgroundClick?: () => void;
}

export default function PageSheet({
    index, total, header, footer, contentGap, blockSpacing, children, onBackgroundClick,
}: Props) {
    const bodyRef = useRef<HTMLDivElement>(null);
    // Heights are budgeted, not measured, so an estimate can be wrong. When it is, the page
    // must SAY so rather than clip in silence — print hides the overflow, and a teacher
    // would only find out on paper.
    const [overflowPx, setOverflowPx] = useState(0);

    useLayoutEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const check = () => {
            const over = el.scrollHeight - el.clientHeight;
            setOverflowPx(over > 2 ? Math.round(over) : 0);
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

            <div className="page-sheet-head" style={{ marginBottom: `${contentGap}px` }}>{header}</div>

            <div ref={bodyRef} className="page-sheet-body" style={{ gap: `${blockSpacing}px` }}>
                {children}
            </div>

            <div className="page-sheet-foot">{footer}</div>
        </div>
    );
}
