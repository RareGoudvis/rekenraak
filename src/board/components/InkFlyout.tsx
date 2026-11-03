import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import type { ArrowHeads, ShapeKind, StrokeTool } from '../boardTypes';
import { DEFAULT_INK, INK_FOLLOWS_BOARD, inkColor } from '../boardTypes';

const SAVED_COLORS_KEY = 'rekenraak_board_colors_v1';
// Board ink, not UI chrome (UI-GUIDE §3 worksheet-ink): the eight pens on the tray.
const DEFAULT_COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#fde047', '#ffffff'];
const PEN_WIDTHS = [2, 4, 7];
const MARKER_WIDTHS = [12, 18, 28];

function loadSavedColors(): string[] {
    try { const v = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
}

// The active ink tool's settings as a flyout growing out of the rail beside its button (Zijrail
// design): colours in a 4-wide grid (Standaard first for pen / lijn, then the eight defaults, the
// teacher's saved ones, a custom picker and its save), widths in a row; lijn / vormen add their
// tool choice and options on top. The rail positions it; this is only its body.
export default function InkFlyout({ tool }: { tool: StrokeTool }) {
    const cfg = useBoardStore((s) => s.inkSettings[tool]);
    const dark = useBoardStore((s) => s.pages[s.activePageIdx].background.dark);
    const color = inkColor(cfg, tool, dark);
    const follows = INK_FOLLOWS_BOARD.includes(tool);
    // The ringed palette swatch: the picked colour; a default that cannot change is its swatch too.
    const ringed = cfg.color ?? (follows ? null : color);
    const setInkSetting = useBoardStore((s) => s.setInkSetting);
    const setTool = useBoardStore((s) => s.setTool);
    const drawOptions = useBoardStore((s) => s.drawOptions);
    const setDrawOptions = useBoardStore((s) => s.setDrawOptions);
    const [saved, setSaved] = useState<string[]>(loadSavedColors);

    const saveCustom = () => {
        // Max 8 saved colors, most recent first, no duplicates.
        const next = [color, ...saved.filter(c => c !== color)].slice(0, 8);
        setSaved(next);
        localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next));
    };

    const widths = tool === 'marker' ? MARKER_WIDTHS : PEN_WIDTHS;
    const lines = tool === 'line' || tool === 'shape';

    return (
        <div data-ink-flyout={tool} style={S.body}>
            {lines && (
                <>
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
                    <div style={S.sep} />
                </>
            )}

            <div style={S.grid}>
                {follows && (
                    <button
                        type="button" data-ink-default aria-label="Standaardkleur (volgt het bord)" aria-pressed={cfg.color === null}
                        title="Standaard: zwart op een licht bord, wit op een donker bord"
                        onClick={() => setInkSetting(tool, { color: null })}
                        style={{
                            ...S.swatch, ...S.autoSwatch, background: DEFAULT_INK[tool][dark ? 'dark' : 'light'],
                            color: DEFAULT_INK[tool][dark ? 'light' : 'dark'],
                            border: dark ? '1px solid var(--border-color)' : '1px solid transparent',
                            outline: cfg.color === null ? RING : 'none',
                        }}
                    >A</button>
                )}
                {[...DEFAULT_COLORS, ...saved.filter(c => !DEFAULT_COLORS.includes(c))].map(c => (
                    <button
                        key={c} type="button" aria-label={`Kleur ${c}`} aria-pressed={ringed === c}
                        onClick={() => setInkSetting(tool, { color: c })}
                        style={{
                            ...S.swatch, background: c,
                            border: c === '#ffffff' ? '1px solid var(--border-color)' : '1px solid transparent',
                            outline: ringed === c ? RING : 'none',
                        }}
                    />
                ))}
                {/* Custom colour + save */}
                <label style={{ ...S.swatch, overflow: 'hidden', position: 'relative', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} title="Eigen kleur">
                    <input type="color" value={color} aria-label="Eigen kleur"
                        onChange={(e) => setInkSetting(tool, { color: e.target.value })}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
                <button type="button" className="ui-hover" title="Kleur bewaren" aria-label="Kleur bewaren" style={S.saveBtn} onClick={saveCustom}>
                    <Plus size={16} />
                </button>
            </div>

            <div style={S.sep} />

            <div style={S.row}>
                {widths.map(w => (
                    <button
                        key={w} type="button" aria-label={`Dikte ${w}`} aria-pressed={cfg.width === w}
                        onClick={() => setInkSetting(tool, { width: w })}
                        style={{ ...S.optBtn, ...(cfg.width === w ? S.optOn : {}) }}
                    >
                        <span style={{ width: Math.min(w + 6, 28), height: Math.min(w + 6, 28), borderRadius: '50%', background: color, display: 'block', border: color === '#ffffff' ? '1px solid var(--border-color)' : 'none' }} />
                    </button>
                ))}
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

// The swatch ring: a surface-coloured gap, then the accent (mockup: 3px gap, 2px ring).
const RING = '3px solid var(--accent)';

const S = {
    body: { display: 'flex', flexDirection: 'column', gap: '8px' } as React.CSSProperties,
    row: { display: 'flex', gap: '6px' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 40px)', gap: '8px' } as React.CSSProperties,
    // The "A" of Standaard sits in the other default colour, so it reads on either fill.
    autoSwatch: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-ui)',
    } as React.CSSProperties,
    swatch: {
        width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', padding: 0, outlineOffset: '2px',
        display: 'inline-block', flexShrink: 0, boxSizing: 'border-box',
    } as React.CSSProperties,
    saveBtn: {
        width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-main)',
    } as React.CSSProperties,
    sep: { height: '1px', background: 'var(--border-color)' } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2): soft fill + 1px accent ring.
    optOn: { background: 'var(--accent-soft)', boxShadow: 'inset 0 0 0 1px var(--accent)', borderColor: 'var(--accent)' } as React.CSSProperties,
    optBtn: {
        width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-color)', background: 'transparent',
    } as React.CSSProperties,
};
