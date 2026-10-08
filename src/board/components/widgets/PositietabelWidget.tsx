import { positietabelProps, POSITIE_KOLOMMEN } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

const SALMON = '#f4cbb8';   // same header tint as the worksheet place-value tables

// Empty place-value table (writing manipulative). Comma column renders between
// E and t automatically when decimal columns are enabled.
export default function PositietabelWidget({ widget }: { widget: BoardWidget }) {
    const p = positietabelProps(widget);
    const ordered = POSITIE_KOLOMMEN.filter(k => p.columns.includes(k.key));
    const hasDecimals = ordered.some(k => k.key === 't' || k.key === 'h');
    const cell: React.CSSProperties = {
        border: '1.5px solid #000', minHeight: '52px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Azeret Mono', monospace", fontSize: '20px', fontWeight: 700, boxSizing: 'border-box',
    };
    const commaCol = hasDecimals ? 1 : 0;
    const gridCols = ordered.map(k => (k.key === 't' && commaCol ? '18px 1fr' : '1fr')).join(' ');

    const rowCells = (isHeader: boolean, r: number) => ordered.flatMap((k) => {
        const cells: React.ReactNode[] = [];
        if (k.key === 't' && hasDecimals) {
            cells.push(
                <div key={`c${r}`} style={{ ...cell, border: 'none', fontSize: '26px' }}>
                    {isHeader ? '' : ','}
                </div>,
            );
        }
        cells.push(
            <div key={`${k.key}${r}`} style={{ ...cell, ...(isHeader ? { backgroundColor: SALMON, minHeight: '40px' } : { background: '#fff' }) }}>
                {isHeader ? k.label : ''}
            </div>,
        );
        return cells;
    });

    return (
        <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                {rowCells(true, -1)}
                {Array.from({ length: p.rows }, (_, r) => rowCells(false, r))}
            </div>
        </div>
    );
}
