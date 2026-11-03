import { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../useBoardStore';
import type { BoardTool, StrokeTool } from '../boardTypes';
import { DEFAULT_INK, ERASER_RANGE, INK_WIDTH_RANGE, clampInkWidth, inkColor } from '../boardTypes';
import { stripColors } from '../inkGeometry';

const SAVED_COLORS_KEY = 'rekenraak_board_colors_v1';
// The picker's own colours beside it: the last four the teacher picked (the list keeps eight).
const SHOWN_CUSTOM = 4;
const KEPT_CUSTOM = 8;

const STROKE_TOOLS: ReadonlyArray<BoardTool> = ['pen', 'marker', 'line', 'shape'];
const isStroke = (t: BoardTool): t is StrokeTool => STROKE_TOOLS.includes(t);

function loadSavedColors(): string[] {
    try { const v: unknown = JSON.parse(localStorage.getItem(SAVED_COLORS_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : []; }
    catch { return []; }
}

// The rail's ink section, always visible (owner: "the colour strip should live in the rail, same
// goes for the slider"): a 2×2 grid (A standaard or the tool's own default, blauw, rood, picker)
// over a vertical size slider with a live dot. It follows the active ink tool; the gom drives the
// slider only; any other tool shows the last ink tool's settings greyed out and read-only.
export default function InkRail() {
    const tool = useBoardStore((s) => s.tool);
    // The last ink tool seen, kept in render (not an effect) so the first paint is already right.
    const [last, setLast] = useState<StrokeTool>(isStroke(tool) ? tool : 'pen');
    if (isStroke(tool) && tool !== last) setLast(tool);
    const ink: StrokeTool = isStroke(tool) ? tool : last;
    const eraser = tool === 'eraser';
    const live = isStroke(tool);
    const idle = !live && !eraser;

    const cfg = useBoardStore((s) => s.inkSettings[ink]);
    const dark = useBoardStore((s) => s.pages[s.activePageIdx].background.dark);
    const eraserSize = useBoardStore((s) => s.eraserSize);
    const setInkSetting = useBoardStore((s) => s.setInkSetting);
    const setEraserSize = useBoardStore((s) => s.setEraserSize);
    const color = inkColor(cfg, ink, dark);
    const width = clampInkWidth(ink, cfg.width);

    const [saved, setSaved] = useState<string[]>(loadSavedColors);
    const [pickerOpen, setPickerOpen] = useState(false);
    const pickerRef = useRef<HTMLInputElement>(null);

    const { auto, colors } = stripColors(ink);
    // The ringed swatch: the picked colour; an untouched non-following default is its own swatch.
    const ringed = cfg.color ?? (auto ? null : color);
    const custom = saved.filter(c => !colors.includes(c)).slice(0, SHOWN_CUSTOM);
    const pickerOn = ringed !== null && !colors.includes(ringed);

    // The native picker fires input while dragging and change once on close: only a closed pick
    // becomes a saved colour, so the list is not flooded with every hue passed on the way.
    useEffect(() => {
        const el = pickerRef.current;
        if (!el) return;
        const keep = () => {
            const next = [el.value, ...loadSavedColors().filter(c => c !== el.value)].slice(0, KEPT_CUSTOM);
            try { localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(next)); } catch { /* quota: kept this session */ }
            setSaved(next);
            setPickerOpen(false);
        };
        el.addEventListener('change', keep);
        return () => el.removeEventListener('change', keep);
    }, []);

    // The chips beside the picker close like every rail popup: Escape or a press outside them.
    useEffect(() => {
        if (!pickerOpen) return;
        const close = () => setPickerOpen(false);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        const onDown = (e: PointerEvent) => { if (!(e.target instanceof Element && e.target.closest('[data-ink-picker]'))) close(); };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [pickerOpen]);

    const offTitle = 'Kies eerst pen, markeerstift, lijn of vorm';
    // Idle already dims the whole section to 50%; the gom greys only the swatches.
    const swatchOff = eraser ? S.off : idle ? { cursor: 'not-allowed' } : {};
    const pick = (c: string | null) => setInkSetting(ink, { color: c });

    return (
        <div data-ink-rail={ink} data-ink-state={live ? 'live' : eraser ? 'eraser' : 'idle'} role="group" aria-label="Inkt"
            style={{ ...S.section, ...(idle ? { opacity: 0.5 } : {}) }}>
            <div data-ink-swatches="" style={S.grid}>
                {auto && (
                    <button
                        type="button" data-ink-default aria-label="Standaardkleur (volgt het bord)" aria-pressed={cfg.color === null}
                        title={live ? 'Standaard: zwart op een licht bord, wit op een donker bord' : offTitle} disabled={!live}
                        onClick={() => pick(null)}
                        style={{
                            ...S.swatch, ...S.autoSwatch, background: DEFAULT_INK[ink][dark ? 'dark' : 'light'],
                            color: DEFAULT_INK[ink][dark ? 'light' : 'dark'],
                            border: dark ? '1px solid var(--border-color)' : '1px solid transparent',
                            outline: cfg.color === null ? RING : 'none', ...swatchOff,
                        }}
                    >A</button>
                )}
                {colors.map(c => (
                    <button
                        key={c} type="button" aria-label={`Kleur ${c}`} aria-pressed={ringed === c} disabled={!live}
                        title={live ? undefined : offTitle} onClick={() => pick(c)}
                        style={{ ...S.swatch, background: c, border: '1px solid transparent', outline: ringed === c ? RING : 'none', ...swatchOff }}
                    />
                ))}
                <div data-ink-picker="" style={{ position: 'relative' }}>
                    <label title={live ? 'Eigen kleur' : offTitle} style={{
                        ...S.swatch, display: 'block', overflow: 'hidden', position: 'relative', outline: pickerOn ? RING : 'none',
                        background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', ...swatchOff,
                    }}>
                        <input ref={pickerRef} type="color" value={color} aria-label="Eigen kleur" disabled={!live}
                            onClick={() => setPickerOpen(true)}
                            onChange={(e) => pick(e.target.value)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: live ? 'pointer' : 'not-allowed' }} />
                    </label>
                    {/* Only while the picker is open: the rail has no height to spare for a row of chips. */}
                    {pickerOpen && live && custom.length > 0 && (
                        <div data-ink-chips="" style={S.chips}>
                            {custom.map(c => (
                                <button key={c} type="button" aria-label={`Kleur ${c}`} aria-pressed={ringed === c} title="Eerder gekozen kleur"
                                    onClick={() => { pick(c); setPickerOpen(false); }}
                                    style={{ ...S.chip, background: c, outline: ringed === c ? '2px solid var(--accent)' : 'none' }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={S.sizeRow}>
                {/* orient: Firefox's older spelling of an upright range; others read the writing-mode. */}
                <input type="range" className="board-ink-range" step={1}
                    {...(eraser
                        ? { min: ERASER_RANGE.min, max: ERASER_RANGE.max, value: eraserSize, 'aria-label': 'Gomgrootte', title: `Gomgrootte: ${eraserSize} px` }
                        : { ...INK_WIDTH_RANGE[ink], value: width, 'aria-label': 'Dikte', title: idle ? offTitle : `Dikte: ${width} px` })}
                    {...{ orient: 'vertical' }}
                    disabled={idle}
                    onChange={(e) => {
                        const v = Number(e.target.value);
                        if (eraser) setEraserSize(v); else setInkSetting(ink, { width: clampInkWidth(ink, v) });
                    }}
                    style={S.range} />
                <div style={S.preview}>
                    <span style={S.dotBox}>
                        {eraser
                            // The gom's reach, scaled into the rail (40 → 34 px).
                            ? <span aria-hidden="true" data-ink-dot="" style={{ ...S.ring, width: Math.round(eraserSize * 0.85), height: Math.round(eraserSize * 0.85) }} />
                            : <Dot size={width} color={color} max={DOT_BOX} />}
                    </span>
                    <span style={S.value}>{eraser ? eraserSize : width}</span>
                </div>
            </div>
        </div>
    );
}

// A width dot in the ink colour, capped so the fattest marker still fits its box; the thin
// border keeps a white pen visible on the light surface.
function Dot({ size, color, max }: { size: number; color: string; max: number }) {
    const d = Math.min(size + 2, max);
    return <span aria-hidden="true" data-ink-dot="" style={{ width: d, height: d, borderRadius: '50%', background: color, display: 'block', boxShadow: '0 0 0 1px var(--border-color)' }} />;
}

// The swatch ring: 2px accent with a 1px gap, so a ringed swatch still fits inside the 72px rail.
const RING = '2px solid var(--accent)';
const SWATCH = 28;
const DOT_BOX = 34;

const S = {
    section: {
        alignSelf: 'stretch', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0,
    } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: `repeat(2, ${SWATCH}px)`, gap: '6px' } as React.CSSProperties,
    swatch: {
        width: `${SWATCH}px`, height: `${SWATCH}px`, borderRadius: '50%', cursor: 'pointer', padding: 0, outlineOffset: '1px',
        flexShrink: 0, boxSizing: 'border-box',
    } as React.CSSProperties,
    // The "A" of Standaard sits in the other default colour, so it reads on either fill.
    autoSwatch: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'var(--font-ui)',
    } as React.CSSProperties,
    off: { opacity: 0.4, cursor: 'not-allowed' } as React.CSSProperties,
    // Grows out of the rail beside the picker (its right edge sits 4px inside the 72px rail), over
    // the board, so the rail itself never grows.
    chips: {
        position: 'absolute', left: 'calc(100% + 4px)', top: '-8px', zIndex: 2, padding: '8px',
        display: 'grid', gridTemplateColumns: 'repeat(2, 24px)', gap: '6px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: 'none',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    chip: {
        width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', padding: 0, outlineOffset: '1px',
        boxSizing: 'border-box', border: '1px solid var(--border-color)',
    } as React.CSSProperties,
    sizeRow: { display: 'flex', alignItems: 'center', gap: '2px' } as React.CSSProperties,
    // vertical-lr + rtl stands the range upright with the maximum at the top; the thumb is sized
    // for a finger in index.css (.board-ink-range).
    range: { writingMode: 'vertical-lr', direction: 'rtl', width: '28px', height: '72px', margin: 0 } as React.CSSProperties,
    preview: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: `${DOT_BOX}px` } as React.CSSProperties,
    dotBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${DOT_BOX}px`, height: `${DOT_BOX}px` } as React.CSSProperties,
    value: { fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', whiteSpace: 'nowrap' } as React.CSSProperties,
    ring: { display: 'block', borderRadius: '50%', border: '2px solid var(--text-main)', boxSizing: 'border-box' } as React.CSSProperties,
};
