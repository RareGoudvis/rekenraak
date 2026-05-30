import type { ReactNode, CSSProperties } from 'react';

interface Props {
    items: ReactNode[];
    cols: number;
    gridTemplateColumns?: string;   // override; default `repeat(cols, 1fr)`
    columnGap?: number;             // px
    rowGap?: number;                // px — vertical gap between rows
    justifyItems?: CSSProperties['justifyItems'];
    alignItems?: CSSProperties['alignItems'];
}

// Renders items as a block stack of per-row grids. Chrome does NOT fragment a single
// grid/flex container across printed pages (the whole thing jumps to the next page);
// a block container DOES fragment between its children. Each row is break-inside:avoid
// so it never splits mid-row, but the block breaks cleanly between rows.
export default function FragmentableGrid({ items, cols, gridTemplateColumns, columnGap = 0, rowGap = 14, justifyItems, alignItems }: Props) {
    const rows: ReactNode[][] = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    const cssCols = gridTemplateColumns ?? `repeat(${cols}, 1fr)`;
    return (
        <div>
            {rows.map((row, r) => (
                <div key={r} className="print-row" style={{
                    display: 'grid',
                    gridTemplateColumns: cssCols,
                    columnGap: `${columnGap}px`,
                    justifyItems,
                    alignItems,
                    breakInside: 'avoid',
                    marginBottom: r < rows.length - 1 ? `${rowGap}px` : undefined,
                }}>
                    {row}
                </div>
            ))}
        </div>
    );
}
