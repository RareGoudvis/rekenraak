import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import type { StrokeTool } from '../boardTypes';

const SAVED_COLORS_KEY = 'rekenraak_board_colors_v1';
const DEFAULT_COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#fde047', '#ffffff'];
const PEN_WIDTHS = [2, 4, 7];
const MARKER_WIDTHS = [12, 18, 28];

function loadSavedColors(): string[] {
    try { const v = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
}

// Floating settings strip for the active ink tool: color swatches (defaults +
// teacher-saved), custom color picker with save, and three stroke widths.
export default function InkSettingsBar({ tool }: { tool: StrokeTool }) {
    const cfg = useBoardStore((s) => s.inkSettings[tool]);
    const setInkSetting = useBoardStore((s) => s.setInkSetting);
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
        </div>
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
    widthBtn: {
        width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-color)', background: 'transparent',
    } as React.CSSProperties,
};
