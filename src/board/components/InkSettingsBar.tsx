import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import type { ArrowHeads, ShapeKind, StrokeTool } from '../boardTypes';

const SAVED_COLORS_KEY = 'rekenraak_board_colors_v1';
const DEFAULT_COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#fde047', '#ffffff'];
const PEN_WIDTHS = [2, 4, 7];
const MARKER_WIDTHS = [12, 18, 28];

function loadSavedColors(): string[] {
    try { const v = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
}

// Floating settings strip for the active ink tool: color swatches (defaults +
// teacher-saved), custom color picker with save, three stroke widths, and the
// lijn tool's arrowheads + dashed toggle or the vormen tool's shape + soft fill.
export default function InkSettingsBar({ tool }: { tool: StrokeTool }) {
    const cfg = useBoardStore((s) => s.inkSettings[tool]);
    const setInkSetting = useBoardStore((s) => s.setInkSetting);
    const drawOptions = useBoardStore((s) => s.drawOptions);
    const setDrawOptions = useBoardStore((s) => s.setDrawOptions);
    const [saved, setSaved] = useState<string[]>(loadSavedColors);

    const saveCustom = () => {
        // Max 8 saved colors, most recent first, no duplicates.
        const next = [cfg.color, ...saved.filter(c => c !== cfg.color)].slice(0, 8);
        setSaved(next);
        localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next));
    };

    const widths = tool === 'marker' ? MARKER_WIDTHS : PEN_WIDTHS;

    return (
        <div style={S.bar} onPointerDown={(e) => e.stopPropagation()}>
            {[...DEFAULT_COLORS, ...saved.filter(c => !DEFAULT_COLORS.includes(c))].map(c => (
                <button
                    key={c} type="button" aria-label={`Kleur ${c}`}
                    onClick={() => setInkSetting(tool, { color: c })}
                    style={{
                        ...S.swatch, background: c,
                        border: c === '#ffffff' ? '1px solid rgba(0,0,0,0.25)' : '1px solid transparent',
                        outline: cfg.color === c ? '3px solid var(--accent-purple)' : 'none',
                    }}
                />
            ))}
            {/* Custom color + save */}
            <label style={{ ...S.swatch, overflow: 'hidden', position: 'relative', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} title="Eigen kleur">
                <input type="color" value={cfg.color}
                    onChange={(e) => setInkSetting(tool, { color: e.target.value })}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            <button type="button" className="ui-hover" title="Kleur bewaren" aria-label="Kleur bewaren" style={S.saveBtn} onClick={saveCustom}>
                <Plus size={14} />
            </button>

            <div style={S.sep} />

            {widths.map(w => (
                <button
                    key={w} type="button" aria-label={`Dikte ${w}`}
                    onClick={() => setInkSetting(tool, { width: w })}
                    style={{ ...S.widthBtn, outline: cfg.width === w ? '3px solid var(--accent-purple)' : 'none' }}
                >
                    <span style={{ width: Math.min(w + 6, 28), height: Math.min(w + 6, 28), borderRadius: '50%', background: cfg.color, display: 'block', border: cfg.color === '#ffffff' ? '1px solid rgba(0,0,0,0.25)' : 'none' }} />
                </button>
            ))}

            {tool === 'line' && (
                <>
                    <div style={S.sep} />
                    {ARROW_OPTIONS.map(o => (
                        <button
                            key={o.value} type="button" className="ui-hover" title={o.label} aria-label={o.label}
                            aria-pressed={drawOptions.arrow === o.value}
                            onClick={() => setDrawOptions({ arrow: o.value })}
                            style={{ ...S.widthBtn, ...(drawOptions.arrow === o.value ? S.optOn : {}) }}
                        >
                            <LineIcon arrow={o.value} dashed={drawOptions.dashed} />
                        </button>
                    ))}
                    <button
                        type="button" className="ui-hover" title="Stippellijn" aria-label="Stippellijn"
                        aria-pressed={drawOptions.dashed}
                        onClick={() => setDrawOptions({ dashed: !drawOptions.dashed })}
                        style={{ ...S.widthBtn, ...(drawOptions.dashed ? S.optOn : {}) }}
                    >
                        <LineIcon arrow="none" dashed />
                    </button>
                </>
            )}

            {tool === 'shape' && (
                <>
                    <div style={S.sep} />
                    {SHAPE_OPTIONS.map(o => (
                        <button
                            key={o.value} type="button" className="ui-hover" title={o.label} aria-label={o.label}
                            aria-pressed={drawOptions.shape === o.value}
                            onClick={() => setDrawOptions({ shape: o.value })}
                            style={{ ...S.widthBtn, ...(drawOptions.shape === o.value ? S.optOn : {}) }}
                        >
                            <ShapeIcon kind={o.value} fill={drawOptions.fill} />
                        </button>
                    ))}
                    <button
                        type="button" className="ui-hover" title="Zachte vulling" aria-label="Zachte vulling"
                        aria-pressed={drawOptions.fill}
                        onClick={() => setDrawOptions({ fill: !drawOptions.fill })}
                        style={{ ...S.widthBtn, ...(drawOptions.fill ? S.optOn : {}) }}
                    >
                        <ShapeIcon kind="rect" fill />
                    </button>
                </>
            )}
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
    bar: {
        position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 40,
    } as React.CSSProperties,
    swatch: {
        width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', padding: 0,
        display: 'inline-block', flexShrink: 0,
    } as React.CSSProperties,
    saveBtn: {
        width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-main)',
    } as React.CSSProperties,
    sep: { width: '1px', alignSelf: 'stretch', margin: '2px 4px', background: 'var(--border-color)' } as React.CSSProperties,
    optOn: { outline: '3px solid var(--accent-purple)', background: 'var(--bg-active)' } as React.CSSProperties,
    widthBtn: {
        width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-color)', background: 'transparent',
    } as React.CSSProperties,
};
