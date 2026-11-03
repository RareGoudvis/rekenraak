import { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../useBoardStore';
import type { ArrowHeads, ShapeKind, StrokeTool } from '../boardTypes';
import { DEFAULT_INK, ERASER_RANGE, INK_WIDTH_RANGE, clampInkWidth, inkColor } from '../boardTypes';
import { stripColors } from '../inkGeometry';

const SAVED_COLORS_KEY = 'rekenraak_board_colors_v1';
// The picker's own colours under it: the last four the teacher picked (the list keeps eight).
const SHOWN_CUSTOM = 4;
const KEPT_CUSTOM = 8;

function loadSavedColors(): string[] {
    try { const v: unknown = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : []; }
    catch { return []; }
}

// The active ink tool's settings as a compact strip beside the rail (owner: "3 standard colours
// + picker and click to open size"): Standaard / blauw / rood, the rainbow picker with the last
// custom colours under it, and a size dot that opens a vertical slider. Lijn / vormen add their
// tool choice and options on top. The rail positions it; this is only its body.
export default function InkFlyout({ tool }: { tool: StrokeTool }) {
    const cfg = useBoardStore((s) => s.inkSettings[tool]);
    const dark = useBoardStore((s) => s.pages[s.activePageIdx].background.dark);
    const color = inkColor(cfg, tool, dark);
    const setInkSetting = useBoardStore((s) => s.setInkSetting);
    const setTool = useBoardStore((s) => s.setTool);
    const drawOptions = useBoardStore((s) => s.drawOptions);
    const setDrawOptions = useBoardStore((s) => s.setDrawOptions);
    const [saved, setSaved] = useState<string[]>(loadSavedColors);
    const [sizeOpen, setSizeOpen] = useState(false);
    const pickerRef = useRef<HTMLInputElement>(null);

    const { auto, colors } = stripColors(tool);
    // The ringed swatch: the picked colour; an untouched non-following default is its own swatch.
    const ringed = cfg.color ?? (auto ? null : color);
    const custom = saved.filter(c => !colors.includes(c)).slice(0, SHOWN_CUSTOM);
    const pickerOn = ringed !== null && !colors.includes(ringed) && !custom.includes(ringed);
    const width = clampInkWidth(tool, cfg.width);

    // The native picker fires input while dragging and change once on close: only a closed pick
    // becomes a saved colour, so the list is not flooded with every hue passed on the way.
    useEffect(() => {
        const el = pickerRef.current;
        if (!el) return;
        const keep = () => {
            const next = [el.value, ...loadSavedColors().filter(c => c !== el.value)].slice(0, KEPT_CUSTOM);
            try { localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next)); } catch { /* quota: kept this session */ }
            setSaved(next);
        };
        el.addEventListener('change', keep);
        return () => el.removeEventListener('change', keep);
    }, []);

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

            <div data-ink-strip="" style={S.strip}>
                {auto && (
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
                {colors.map(c => (
                    <button
                        key={c} type="button" aria-label={`Kleur ${c}`} aria-pressed={ringed === c}
                        onClick={() => setInkSetting(tool, { color: c })}
                        style={{ ...S.swatch, background: c, border: '1px solid transparent', outline: ringed === c ? RING : 'none' }}
                    />
                ))}
                <div style={S.pickerCol}>
                    <label title="Eigen kleur" style={{
                        ...S.swatch, overflow: 'hidden', position: 'relative', outline: pickerOn ? RING : 'none',
                        background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    }}>
                        <input ref={pickerRef} type="color" value={color} aria-label="Eigen kleur"
                            onChange={(e) => setInkSetting(tool, { color: e.target.value })}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    </label>
                    {custom.length > 0 && (
                        <div style={S.chips}>
                            {custom.map(c => (
                                <button key={c} type="button" aria-label={`Kleur ${c}`} aria-pressed={ringed === c} title="Eerder gekozen kleur"
                                    onClick={() => setInkSetting(tool, { color: c })}
                                    style={{ ...S.chip, background: c, outline: ringed === c ? '2px solid var(--accent)' : 'none' }} />
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <button type="button" className="ui-hover" data-ink-size="" aria-label="Dikte" title={`Dikte: ${width} px — tik om te kiezen`}
                        aria-expanded={sizeOpen} onClick={() => setSizeOpen(!sizeOpen)}
                        style={{ ...S.optBtn, borderRadius: '50%', ...(sizeOpen ? S.optOn : {}) }}>
                        <Dot size={width} color={color} max={30} />
                    </button>
                    {sizeOpen && (
                        <div data-size-slider="" style={S.sliderPop}>
                            <VerticalSlider label="Dikte instellen" value={width} {...INK_WIDTH_RANGE[tool]}
                                onChange={(w) => setInkSetting(tool, { width: clampInkWidth(tool, w) })}
                                preview={<Dot size={width} color={color} max={34} />} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// The gom's flyout: only its size, as the same vertical slider; the preview is the eraser's reach.
export function EraserFlyout() {
    const r = useBoardStore((s) => s.eraserSize);
    const setEraserSize = useBoardStore((s) => s.setEraserSize);
    return (
        <div data-eraser-flyout="" style={S.body}>
            <VerticalSlider label="Gomgrootte" value={r} min={ERASER_RANGE.min} max={ERASER_RANGE.max} onChange={setEraserSize}
                preview={<span aria-hidden="true" style={{ ...S.ring, width: 2 * r, height: 2 * r }} />} previewBox={2 * ERASER_RANGE.max} />
        </div>
    );
}

// A width dot in the ink colour, capped so the fattest marker still fits its button; the thin
// border keeps a white pen visible on the light surface.
function Dot({ size, color, max }: { size: number; color: string; max: number }) {
    const d = Math.min(size + 2, max);
    return <span aria-hidden="true" style={{ width: d, height: d, borderRadius: '50%', background: color, display: 'block', boxShadow: '0 0 0 1px var(--border-color)' }} />;
}

// Big at the top, small at the bottom: a vertical range with a live preview above it.
function VerticalSlider({ label, value, min, max, onChange, preview, previewBox = 36 }: {
    label: string; value: number; min: number; max: number; onChange: (v: number) => void;
    preview: React.ReactNode; previewBox?: number;
}) {
    return (
        <div style={S.slider}>
            <span style={{ ...S.previewBox, width: previewBox, height: previewBox }}>{preview}</span>
            {/* orient: Firefox's older spelling of an upright range; others read the writing-mode. */}
            <input type="range" min={min} max={max} step={1} value={value} aria-label={label}
                {...{ orient: 'vertical' }}
                onChange={(e) => onChange(Number(e.target.value))} style={S.range} />
            <span style={S.value}>{value} px</span>
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
    strip: { display: 'flex', gap: '8px', alignItems: 'flex-start' } as React.CSSProperties,
    pickerCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '40px' } as React.CSSProperties,
    chips: { display: 'grid', gridTemplateColumns: 'repeat(2, 18px)', gap: '4px' } as React.CSSProperties,
    chip: {
        width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', padding: 0, outlineOffset: '1px',
        boxSizing: 'border-box', border: '1px solid var(--border-color)',
    } as React.CSSProperties,
    // The "A" of Standaard sits in the other default colour, so it reads on either fill.
    autoSwatch: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-ui)',
    } as React.CSSProperties,
    swatch: {
        width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', padding: 0, outlineOffset: '2px',
        display: 'inline-block', flexShrink: 0, boxSizing: 'border-box',
    } as React.CSSProperties,
    sep: { height: '1px', background: 'var(--border-color)' } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2): soft fill + 1px accent ring.
    optOn: { background: 'var(--accent-soft)', boxShadow: 'inset 0 0 0 1px var(--accent)', borderColor: 'var(--accent)' } as React.CSSProperties,
    optBtn: {
        width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--border-color)', background: 'transparent',
    } as React.CSSProperties,
    // Opens to the right of the strip, over the board, so the strip itself never grows.
    sliderPop: {
        position: 'absolute', left: 'calc(100% + 18px)', top: '-10px', zIndex: 2, padding: '10px 8px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    slider: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } as React.CSSProperties,
    previewBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties,
    // vertical-lr + rtl stands the range upright with the maximum at the top.
    range: {
        writingMode: 'vertical-lr', direction: 'rtl', width: '40px', height: '170px', margin: 0,
        accentColor: 'var(--accent)', cursor: 'pointer',
    } as React.CSSProperties,
    value: { fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', whiteSpace: 'nowrap' } as React.CSSProperties,
    ring: { display: 'block', borderRadius: '50%', border: '2px dashed var(--text-main)', boxSizing: 'border-box' } as React.CSSProperties,
};
