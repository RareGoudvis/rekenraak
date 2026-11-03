import { useBoardStore } from '../useBoardStore';
import type { ArrowHeads, ShapeKind } from '../boardTypes';

// Lijn / vormen options beside the rail's lijn+vormen button: the tool choice (lijn or one of the
// three vormen) and its options (arrow heads, dashed / soft fill). Colour and width live in the
// rail's own ink section (InkRail), always visible. The rail positions it; this is only its body.
export default function LinesFlyout({ tool }: { tool: 'line' | 'shape' }) {
    const setTool = useBoardStore((s) => s.setTool);
    const drawOptions = useBoardStore((s) => s.drawOptions);
    const setDrawOptions = useBoardStore((s) => s.setDrawOptions);

    return (
        <div data-lines-flyout={tool} style={S.body}>
            {/* Lijn and the three vormen in one row: the rail has one button for both tools. */}
            <div style={S.row}>
                <button type="button" className="ui-hover" title="Lijn / pijl (L) — Shift: 45°-stappen" aria-label="Lijn / pijl (L) — Shift: 45°-stappen"
                    aria-pressed={tool === 'line'} onClick={() => setTool('line')}
                    style={{ ...S.optBtn, ...(tool === 'line' ? S.optOn : {}) }}>
                    <LineIcon arrow={drawOptions.arrow} dashed={drawOptions.dashed} />
                </button>
                {SHAPE_OPTIONS.map(o => {
                    const on = tool === 'shape' && drawOptions.shape === o.value;
                    return (
                        <button key={o.value} type="button" className="ui-hover" title={o.label} aria-label={o.label}
                            aria-pressed={on} onClick={() => { setDrawOptions({ shape: o.value }); setTool('shape'); }}
                            style={{ ...S.optBtn, ...(on ? S.optOn : {}) }}>
                            <ShapeIcon kind={o.value} fill={drawOptions.fill} />
                        </button>
                    );
                })}
            </div>
            <div style={S.row}>
                {tool === 'line' ? (
                    <>
                        {ARROW_OPTIONS.map(o => (
                            <button key={o.value} type="button" className="ui-hover" title={o.label} aria-label={o.label}
                                aria-pressed={drawOptions.arrow === o.value} onClick={() => setDrawOptions({ arrow: o.value })}
                                style={{ ...S.optBtn, ...(drawOptions.arrow === o.value ? S.optOn : {}) }}>
                                <LineIcon arrow={o.value} dashed={drawOptions.dashed} />
                            </button>
                        ))}
                        <button type="button" className="ui-hover" title="Stippellijn" aria-label="Stippellijn"
                            aria-pressed={drawOptions.dashed} onClick={() => setDrawOptions({ dashed: !drawOptions.dashed })}
                            style={{ ...S.optBtn, ...(drawOptions.dashed ? S.optOn : {}) }}>
                            <LineIcon arrow="none" dashed />
                        </button>
                    </>
                ) : (
                    <button type="button" className="ui-hover" title="Zachte vulling" aria-label="Zachte vulling"
                        aria-pressed={drawOptions.fill} onClick={() => setDrawOptions({ fill: !drawOptions.fill })}
                        style={{ ...S.optBtn, ...(drawOptions.fill ? S.optOn : {}) }}>
                        <ShapeIcon kind="rect" fill />
                    </button>
                )}
            </div>
        </div>
    );
}

const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
    { value: 'rect', label: 'Rechthoek (Shift: vierkant)' },
    { value: 'ellipse', label: 'Ellips (Shift: cirkel)' },
    { value: 'triangle', label: 'Driehoek (Shift: gelijkzijdig)' },
];

// Mini preview of each shape option, outline in the text colour, soft fill when that is on.
function ShapeIcon({ kind, fill }: { kind: ShapeKind; fill: boolean }) {
    const look = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinejoin: 'round' as const, fill: fill ? 'currentColor' : 'none', fillOpacity: fill ? 0.25 : undefined };
    return (
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ color: 'var(--text-main)' }}>
            {kind === 'rect' && <rect x="4" y="6" width="18" height="14" {...look} />}
            {kind === 'ellipse' && <ellipse cx="13" cy="13" rx="9.5" ry="7.5" {...look} />}
            {kind === 'triangle' && <path d="M 13 4.5 L 22.5 21 L 3.5 21 Z" {...look} />}
        </svg>
    );
}

const ARROW_OPTIONS: { value: ArrowHeads; label: string }[] = [
    { value: 'none', label: 'Lijn zonder pijlpunt' },
    { value: 'end', label: 'Pijl (punt aan het einde)' },
    { value: 'both', label: 'Dubbele pijl' },
];

// Mini preview of the line style on each option button, drawn in the text colour.
function LineIcon({ arrow, dashed }: { arrow: ArrowHeads; dashed: boolean }) {
    return (
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ color: 'var(--text-main)' }}>
            <path d="M 5 21 L 21 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={dashed ? '3.5 4' : undefined} />
            {arrow !== 'none' && <path d="M 21 5 L 13.5 7.5 L 18.5 12.5 Z" fill="currentColor" />}
            {arrow === 'both' && <path d="M 5 21 L 7.5 13.5 L 12.5 18.5 Z" fill="currentColor" />}
        </svg>
    );
}

const S = {
    body: { display: 'flex', flexDirection: 'column', gap: '8px' } as React.CSSProperties,
    row: { display: 'flex', gap: '6px' } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2): soft fill + 1px accent ring.
    optOn: { background: 'var(--accent-soft)', boxShadow: 'inset 0 0 0 1px var(--accent)', borderColor: 'var(--accent)' } as React.CSSProperties,
    optBtn: {
        width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-color)', background: 'transparent',
    } as React.CSSProperties,
};
