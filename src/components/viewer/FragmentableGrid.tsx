import type { ReactNode, CSSProperties } from 'react';

interface Props {
    items: ReactNode[];
    cols: number;
    gridTemplateColumns?: string;   // override; default `repeat(cols, 1fr)`
    columnGap?: number;             // px
    rowGap?: number;                // px — vertical gap between rows
    justifyItems?: CSSProperties['justifyItems'];
    alignItems?: CSSProperties['alignItems'];
    /** The viewer renders its items smaller in a narrower cell than this one (a figure
        step, tighter gaps), so a probe here overstates what the next tier needs. */
    shrinks?: boolean;
}

// Renders items as a block stack of per-row grids. Chrome does NOT fragment a single
// grid/flex container across printed pages (the whole thing jumps to the next page);
// a block container DOES fragment between its children. Each row is break-inside:avoid
// so it never splits mid-row, but the block breaks cleanly between rows.
export default function FragmentableGrid({ items, cols, gridTemplateColumns, columnGap = 0, rowGap = 14, justifyItems, alignItems, shrinks }: Props) {
    const rows: ReactNode[][] = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    const cssCols = gridTemplateColumns ?? `repeat(${cols}, 1fr)`;
    return (
        // data-cols / data-shrinks tell PageSheet's width probe that a wide measurement here
        // came from a layout that gets narrower in a narrower cell (see probeIntrinsicWidth).
        <div data-cols={cols} data-shrinks={shrinks ? '1' : undefined}>
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
