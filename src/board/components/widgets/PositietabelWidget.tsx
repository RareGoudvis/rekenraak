import { positietabelProps, POSITIE_PLAATSEN, SALMON, digitAt, type PlaceColumn, type PlaceGroup } from '../../mathTools/positietabel';
import { cardLayoutWidth, useSetProps, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

const MONO = "'Azeret Mono', monospace";
// Soft hyphens after the prefixes so long names wrap inside a narrow column (honderd-duizend).
const breakable = (name: string) => name.replace(/^(honderd|tien|duizend)(?=\w)/, '$1­');

// Place-value table manipulative. The comma column renders between E and t automatically when
// decimal places are shown; a pre-filled number lands in row 1, typed digits in any editable cell.
export default function PositietabelWidget({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = positietabelProps(widget);
    // Accentkleur inks the digits (pre-filled and typed); the grid stays black.
    const ink = widgetAccent(widget) ?? '#111';
    const ordered = POSITIE_PLAATSEN.filter(k => p.columns.includes(k.key));
    const hasDecimals = ordered.some(k => k.exp < 0);
    // Same rule as before settings existed: any decimal place shown puts the comma before t.
    const hasComma = hasDecimals;
    const headerFill = (k: PlaceColumn) =>
        p.colorMode === 'groepen' ? p.groupColors[k.group] : p.colorMode === 'zalm' ? SALMON : '#fff';
    // Many columns share the same card width, so type shrinks to its column (3 columns = as before).
    // The width the frame really lays the card out at (less at a bigger text size), minus the 14px side padding.
    const budget = cardLayoutWidth(widget) - 28;
    const colW = (budget - (hasComma ? 18 : 0)) / Math.max(1, ordered.length);
    const digit = Math.min(p.digitSize, colW * 0.7);
    const cell: React.CSSProperties = {
        border: '1.5px solid #000', minHeight: `${Math.max(52, p.digitSize * 1.9)}px`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', minWidth: 0, overflow: 'hidden',
        fontFamily: MONO, fontSize: `${digit}px`, fontWeight: 700, boxSizing: 'border-box',
    };
    const labelSize = Math.min(20, colW * 0.42);
    const nameSize = Math.max(8, Math.min(11, colW / 8));
    const commaFirst = (k: PlaceColumn) => hasComma && k.exp === -1;
    const gridCols = ordered.map(k => (commaFirst(k) ? '18px minmax(0, 1fr)' : 'minmax(0, 1fr)')).join(' ');
    const writeCell = (key: string, v: string) => {
        const cells = { ...p.cells };
        const digit = v.replace(/\D/g, '').slice(-1);
        if (digit) cells[key] = digit; else delete cells[key];
        set({ cells });
    };

    const groupRow = () => {
        // One spanning header cell per run of same-group columns (the comma column joins the decimals).
        const runs: Array<{ group: PlaceGroup; span: number }> = [];
        ordered.forEach(k => {
            const span = commaFirst(k) ? 2 : 1;
            const last = runs[runs.length - 1];
            if (last && last.group === k.group) last.span += span; else runs.push({ group: k.group, span });
        });
        return runs.map((r, i) => (
            <div key={`g${i}`} data-place-group={r.group} style={{
                ...cell, gridColumn: `span ${r.span}`, minHeight: '30px', fontSize: `${Math.max(8, Math.min(13, (colW * r.span) / 7.5))}px`, fontWeight: 600,
                background: p.colorMode === 'groepen' ? p.groupColors[r.group] : '#fff',
            }}>{r.group}</div>
        ));
    };

    const rowCells = (isHeader: boolean, r: number) => ordered.flatMap((k) => {
        const cells: React.ReactNode[] = [];
        if (commaFirst(k)) {
            cells.push(
                <div key={`c${r}`} style={{ ...cell, border: 'none', fontSize: `${digit * 1.3}px` }}>
                    {isHeader ? '' : ','}
                </div>,
            );
        }
        if (isHeader) {
            cells.push(
                <div key={`${k.key}${r}`} style={{
                    ...cell, background: headerFill(k), minHeight: '40px', textAlign: 'center', fontSize: `${labelSize}px`,
                    ...(p.header !== 'afkorting' ? { flexDirection: 'column', fontSize: `${nameSize}px`, fontWeight: 600, lineHeight: 1.2, padding: '2px', hyphens: 'manual' } : {}),
                }}>
                    {p.header === 'beide' && <span style={{ fontSize: `${Math.min(18, labelSize)}px`, fontWeight: 700 }}>{k.label}</span>}
                    {p.header === 'afkorting' ? k.label : <span lang="nl">{breakable(k.name)}</span>}
                </div>,
            );
            return cells;
        }
        const key = `${r}:${k.key}`;
        const value = p.cells[key] ?? (r === 0 ? digitAt(p.number, k.exp) : '');
        cells.push(
            <div key={`${k.key}${r}`} style={{ ...cell, background: '#fff', color: ink }}>
                {p.editable ? (
                    <input
                        aria-label={`Rij ${r + 1} ${k.name}`} inputMode="numeric" value={value}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => writeCell(key, e.target.value)}
                        style={{ width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent', textAlign: 'center', font: 'inherit', color: 'inherit', padding: 0 }}
                    />
                ) : value}
            </div>,
        );
        return cells;
    });

    return (
        <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                {p.showGroups && groupRow()}
                {p.header !== 'geen' && rowCells(true, -1)}
                {Array.from({ length: p.rows }, (_, r) => rowCells(false, r))}
            </div>
        </div>
    );
}
