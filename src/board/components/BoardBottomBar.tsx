import { Cursor, PenNib, Highlighter, Eraser, ArrowUpRight, Shapes, Ruler, GridFour, PaintRoller, Plus, CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';

interface Props {
    onAdd: () => void;
}

// Bottom toolbar of the whiteboard (replaces the TopBar in bordmodus). Digibord-first:
// every control is a ≥44px touch target, no hover-only affordances.
// P1 ships the chrome with only 'select' live; ink/shape tools activate in P2/P3.
export default function BoardBottomBar({ onAdd }: Props) {
    const setView = useWorksheetStore((s) => s.setView);

    // P1: selection is the only tool; the rest are visible-but-disabled placeholders
    // so the final layout is judgeable from day 1.
    const tools = [
        { key: 'select', icon: Cursor, label: 'Selecteren', enabled: true, active: true },
        { key: 'pen', icon: PenNib, label: 'Pen (binnenkort)', enabled: false, active: false },
        { key: 'marker', icon: Highlighter, label: 'Markeerstift (binnenkort)', enabled: false, active: false },
        { key: 'eraser', icon: Eraser, label: 'Gom (binnenkort)', enabled: false, active: false },
        { key: 'line', icon: ArrowUpRight, label: 'Lijn / pijl (binnenkort)', enabled: false, active: false },
        { key: 'shape', icon: Shapes, label: 'Vormen (binnenkort)', enabled: false, active: false },
        { key: 'instrument', icon: Ruler, label: 'Meetinstrumenten (binnenkort)', enabled: false, active: false },
    ];

    return (
        <div className="mac-vibrant" style={S.bar}>
            {/* Add exercise / widget — the board's primary action. */}
            <button type="button" className="ui-hover" style={S.addBtn} aria-label="Toevoegen aan bord" onClick={onAdd}>
                <Plus size={18} /> Toevoegen
            </button>

            <div style={S.sep} />

            {/* Tools */}
            <div style={S.group}>
                {tools.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        className={t.enabled ? 'ui-hover' : undefined}
                        title={t.label}
                        aria-label={t.label}
                        disabled={!t.enabled}
                        style={{ ...S.toolBtn, ...(t.active ? S.toolActive : {}), ...(!t.enabled ? S.toolDisabled : {}) }}
                    >
                        <t.icon size={22} weight={t.active ? 'fill' : 'regular'} />
                    </button>
                ))}
            </div>

            <div style={S.sep} />

            {/* Board setup */}
            <div style={S.group}>
                <button type="button" title="Achtergrond (binnenkort)" aria-label="Achtergrond" disabled style={{ ...S.toolBtn, ...S.toolDisabled }}>
                    <PaintRoller size={22} />
                </button>
                <button type="button" title="Raster uitlijnen (binnenkort)" aria-label="Raster uitlijnen" disabled style={{ ...S.toolBtn, ...S.toolDisabled }}>
                    <GridFour size={22} />
                </button>
            </div>

            <div style={{ flex: 1 }} />

            {/* Pagination */}
            <div style={S.group}>
                <button type="button" title="Vorige pagina" aria-label="Vorige pagina" disabled style={{ ...S.toolBtn, ...S.toolDisabled }}>
                    <CaretLeft size={22} />
                </button>
                <span style={S.pageLabel}>1 / 1</span>
                <button type="button" title="Volgende pagina" aria-label="Volgende pagina" disabled style={{ ...S.toolBtn, ...S.toolDisabled }}>
                    <CaretRight size={22} />
                </button>
                <button type="button" title="Pagina toevoegen (binnenkort)" aria-label="Pagina toevoegen" disabled style={{ ...S.toolBtn, ...S.toolDisabled }}>
                    <Plus size={22} />
                </button>
            </div>

            <div style={S.sep} />

            {/* Exit */}
            <button type="button" className="ui-hover" style={S.exitBtn} onClick={() => setView('editor')}>
                <X size={18} /> Bordmodus verlaten
            </button>
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-panel)',
        flexShrink: 0,
    } as React.CSSProperties,
    group: { display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
    // 44px = minimum comfortable digibord touch target.
    toolBtn: {
        width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '10px', border: '1px solid transparent', background: 'transparent',
        color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    toolActive: {
        background: 'var(--bg-active)', border: '1px solid var(--accent-purple)',
    } as React.CSSProperties,
    toolDisabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    sep: { width: '1px', alignSelf: 'stretch', margin: '6px 2px', background: 'var(--border-color)' } as React.CSSProperties,
    pageLabel: {
        fontFamily: "'Azeret Mono', monospace", fontSize: '13px', color: 'var(--text-main)',
        minWidth: '52px', textAlign: 'center', userSelect: 'none',
    } as React.CSSProperties,
    exitBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '44px', padding: '0 16px', borderRadius: '10px',
        border: '1px solid var(--border-color)', background: 'transparent',
        color: 'var(--text-main)', cursor: 'pointer',
        fontSize: '13px', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
    addBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '44px', padding: '0 18px', borderRadius: '10px',
        border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
        color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600,
        fontSize: '13px', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
};
