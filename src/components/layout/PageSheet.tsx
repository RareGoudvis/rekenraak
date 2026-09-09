import type { ReactNode } from 'react';

// One printed page: its own header, a 6-column grid body, its own footer.
//
// This replaces the single-<table> sheet whose <thead>/<tfoot> Chrome repeated across
// printed pages. That trick was the only way to get a running header when the browser
// decided where pages broke. Now the packer decides, so each page can simply render its
// own chrome and end with `break-after: page` — far less fragile than the table hack, and
// it is what lets a page show real feedback on screen (a card, a number, its own footer).
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
    return (
        <div className="page-sheet" onClick={onBackgroundClick}>
            {/* Screen-only page label: teachers could not previously tell which page they
                were looking at, only where a dashed line fell. */}
            <div className="no-print page-sheet-tag">Pagina {index + 1} van {total}</div>

            <div className="page-sheet-head" style={{ marginBottom: `${contentGap}px` }}>{header}</div>

            <div
                className="page-sheet-body"
                style={{ gap: `${blockSpacing}px` }}
            >
                {children}
            </div>

            <div className="page-sheet-foot">{footer}</div>
        </div>
    );
}
